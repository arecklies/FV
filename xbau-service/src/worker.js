/**
 * XBau-Service Worker (PROJ-7, ADR-015)
 *
 * Pollt background_jobs-Tabelle, verarbeitet XBau-Aufträge,
 * sendet Webhook an Fachverfahren nach Abschluss.
 *
 * Deployment: Docker-Container (Fly.io / Railway)
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WEBHOOK_SECRET, FACHVERFAHREN_URL
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { build0201 } from "./messages/build-0201.js";
import { build1100 } from "./messages/build-1100.js";
import { build1180 } from "./messages/build-1180.js";
import { validateSchematron, toRueckweisungParams } from "./schematron-validator.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const FACHVERFAHREN_URL = process.env.FACHVERFAHREN_URL;
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || "5000", 10);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY sind Pflicht");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** HMAC-SHA256 Signatur erzeugen */
function signPayload(payload) {
  if (!WEBHOOK_SECRET) return null;
  return crypto.createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex");
}

/** Webhook an Fachverfahren senden */
async function sendWebhook(jobId, status, output) {
  if (!FACHVERFAHREN_URL || !WEBHOOK_SECRET) {
    console.warn("[Worker] Webhook nicht konfiguriert, überspringe");
    return;
  }

  const payload = JSON.stringify({ job_id: jobId, status, output });
  const signature = signPayload(payload);

  try {
    const res = await fetch(`${FACHVERFAHREN_URL}/api/internal/xbau/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
      },
      body: payload,
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(`[Worker] Webhook fehlgeschlagen: HTTP ${res.status}`);
    }
  } catch (err) {
    console.error("[Worker] Webhook-Fehler:", err.message);
  }
}

/** Nächsten Job holen und verarbeiten */
async function pollAndProcess() {
  // Pending Jobs mit fälligem Retry holen
  const now = new Date().toISOString();
  const { data: job, error } = await supabase
    .from("background_jobs")
    .select("*")
    .eq("status", "pending")
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !job) return; // Kein Job verfügbar

  // Atomisch auf processing setzen
  const { error: claimError } = await supabase
    .from("background_jobs")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
      attempts: job.attempts + 1,
    })
    .eq("id", job.id)
    .eq("status", "pending");

  if (claimError) return; // Anderer Worker war schneller

  console.log(`[Worker] Job ${job.id} (${job.type}) gestartet, Versuch ${job.attempts + 1}/${job.max_attempts}`);

  try {
    const output = await processJob(job);

    // Erfolg
    await supabase
      .from("background_jobs")
      .update({
        status: "completed",
        output,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    console.log(`[Worker] Job ${job.id} abgeschlossen`);
    await sendWebhook(job.id, "completed", output);
  } catch (err) {
    console.error(`[Worker] Job ${job.id} fehlgeschlagen:`, err.message);

    const nextAttempt = job.attempts + 1;
    const RETRY_DELAYS = [30_000, 60_000, 120_000];

    if (nextAttempt < job.max_attempts) {
      // Retry
      const delay = RETRY_DELAYS[Math.min(nextAttempt, RETRY_DELAYS.length - 1)];
      await supabase
        .from("background_jobs")
        .update({
          status: "pending",
          next_retry_at: new Date(Date.now() + delay).toISOString(),
          output: { fehler: err.message },
        })
        .eq("id", job.id);

      console.log(`[Worker] Job ${job.id} retry in ${delay / 1000}s`);
    } else {
      // Dead Letter
      await supabase
        .from("background_jobs")
        .update({
          status: "dead_letter",
          output: { fehler: err.message },
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      console.log(`[Worker] Job ${job.id} → Dead Letter`);
      await sendWebhook(job.id, "failed", { fehler: err.message });
    }
  }
}

/** Job-Typ-spezifische Verarbeitung */
async function processJob(job) {
  switch (job.type) {
    case "xbau_generate":
      return await processGenerate(job);

    case "xbau_validate":
      return await processValidate(job);

    case "xbau_parse":
      // TODO: Eingehende Nachricht parsen (fast-xml-parser)
      throw new Error("xbau_parse noch nicht implementiert");

    default:
      throw new Error(`Unbekannter Job-Typ: ${job.type}`);
  }
}

/** XBau-Nachricht generieren */
async function processGenerate(job) {
  const { nachrichtentyp, vorgang_id, tenant_id, payload } = job.input;

  // Behörde-Daten laden (Platzhalter bis DVDV-Integration)
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("id", tenant_id)
    .single();

  const behoerde = {
    verzeichnisdienst: "DVDV",
    kennung: `tenant-${tenant_id}`,
    name: tenant?.name ?? `Mandant ${tenant_id}`,
  };

  let xml;
  switch (nachrichtentyp) {
    case "0201":
      xml = build0201({
        antragVollstaendig: payload.antrag_vollstaendig,
        befundliste: payload.befundliste,
        fristDatum: payload.frist_datum,
        spaetestesGenehmigungsdatum: payload.spaetestes_genehmigungsdatum,
        anschreiben: payload.anschreiben,
        bezugNachrichtenUuid: payload.bezug_nachrichten_uuid ?? "",
        bezugNachrichtentyp: payload.bezug_nachrichtentyp ?? "0200",
        bezugErstellungszeit: payload.bezug_erstellungszeit ?? new Date().toISOString(),
        aktenzeichen: payload.aktenzeichen,
        referenzUuid: payload.referenz_uuid,
        autor: behoerde,
        leser: payload.empfaenger ?? behoerde,
      });
      break;

    case "1100":
      xml = build1100({
        fehlerkennzahl: payload.fehlerkennzahl,
        fehlertext: payload.fehlertext,
        abgewieseneNachrichtBase64: payload.abgewiesene_nachricht_base64,
        abgewieseneNachrichtenUUID: payload.abgewiesene_nachrichten_uuid,
        abgewiesenerNachrichtentyp: payload.abgewiesener_nachrichtentyp,
        abgewieseneErstellungszeit: payload.abgewiesene_erstellungszeit,
        autor: behoerde,
        leser: payload.empfaenger ?? behoerde,
      });
      break;

    case "1180":
      xml = build1180({
        quittierteNachrichtenUUID: payload.quittierte_nachrichten_uuid,
        quittierterNachrichtentyp: payload.quittierter_nachrichtentyp,
        quittierteErstellungszeit: payload.quittierte_erstellungszeit,
        aktenzeichen: payload.aktenzeichen,
        referenzUuid: payload.referenz_uuid,
        autor: behoerde,
        leser: payload.empfaenger ?? behoerde,
      });
      break;

    default:
      throw new Error(`Nachrichtentyp ${nachrichtentyp} wird noch nicht unterstützt`);
  }

  // XML in xbau_nachrichten speichern
  const { data: nachricht, error: insertError } = await supabase
    .from("xbau_nachrichten")
    .insert({
      tenant_id,
      nachrichten_uuid: crypto.randomUUID(),
      nachrichtentyp,
      richtung: "ausgang",
      status: "generiert",
      vorgang_id: vorgang_id ?? null,
      roh_xml: xml,
      kerndaten: { nachrichtentyp, ...payload },
    })
    .select("id")
    .single();

  if (insertError) throw new Error(`Speichern fehlgeschlagen: ${insertError.message}`);

  console.log(`[Worker] Nachricht ${nachrichtentyp} generiert: ${nachricht.id}`);

  return {
    nachricht_id: nachricht.id,
    nachrichtentyp,
    vorgang_id,
  };
}

/** XBau-Nachricht validieren (XSD + Schematron) */
async function processValidate(job) {
  const { xml_string, nachrichtentyp, nachrichten_uuid, erstellungszeit, tenant_id } = job.input;

  if (!xml_string) {
    throw new Error("xml_string ist Pflicht fuer xbau_validate");
  }

  console.log(`[Worker] Validiere Nachricht ${nachrichtentyp || "unbekannt"} (Schematron)...`);

  // Schematron-Validierung
  const schematronResult = await validateSchematron(xml_string);

  console.log(
    `[Worker] Schematron: ${schematronResult.valid ? "GUELTIG" : `${schematronResult.errors.length} Fehler`} ` +
      `(${schematronResult.durationMs}ms, ${schematronResult.ruleCount} Regeln geprueft)`
  );

  if (!schematronResult.valid) {
    // Rueckweisung 1100 generieren
    const rueckweisungParams = toRueckweisungParams(schematronResult);

    // Behoerde-Daten laden
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, name")
      .eq("id", tenant_id)
      .single();

    const behoerde = {
      verzeichnisdienst: "DVDV",
      kennung: `tenant-${tenant_id}`,
      name: tenant?.name ?? `Mandant ${tenant_id}`,
    };

    const rueckweisungXml = build1100({
      fehlerkennzahl: rueckweisungParams.fehlerkennzahl,
      fehlertext: rueckweisungParams.fehlertext,
      abgewieseneNachrichtBase64: Buffer.from(xml_string, "utf-8").toString("base64"),
      abgewieseneNachrichtenUUID: nachrichten_uuid ?? "",
      abgewiesenerNachrichtentyp: nachrichtentyp ?? "unbekannt",
      abgewieseneErstellungszeit: erstellungszeit ?? new Date().toISOString(),
      autor: behoerde,
      leser: behoerde, // Wird vom Fachverfahren ueberschrieben
    });

    // Rueckweisung in xbau_nachrichten speichern
    const { data: nachricht, error: insertError } = await supabase
      .from("xbau_nachrichten")
      .insert({
        tenant_id,
        nachrichten_uuid: crypto.randomUUID(),
        nachrichtentyp: "1100",
        richtung: "ausgang",
        status: "generiert",
        roh_xml: rueckweisungXml,
        kerndaten: {
          nachrichtentyp: "1100",
          grund: "schematron_validierung",
          fehler: schematronResult.errors.map((e) => ({
            id: e.id,
            fehlerkennzahl: e.fehlerkennzahl,
            text: e.text,
          })),
        },
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[Worker] Rueckweisung speichern fehlgeschlagen:", insertError.message);
    }

    return {
      valid: false,
      schematron: {
        errors: schematronResult.errors.length,
        durationMs: schematronResult.durationMs,
        ruleCount: schematronResult.ruleCount,
        details: schematronResult.errors,
      },
      rueckweisung: {
        nachricht_id: nachricht?.id ?? null,
        fehlerkennzahl: rueckweisungParams.fehlerkennzahl,
      },
    };
  }

  // Validierung erfolgreich
  return {
    valid: true,
    schematron: {
      errors: 0,
      durationMs: schematronResult.durationMs,
      ruleCount: schematronResult.ruleCount,
    },
  };
}

// -- Main Loop --

console.log(`[XBau-Service] Worker gestartet, Poll-Intervall: ${POLL_INTERVAL_MS}ms`);

async function loop() {
  while (true) {
    try {
      await pollAndProcess();
    } catch (err) {
      console.error("[Worker] Unerwarteter Fehler:", err.message);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

loop();
