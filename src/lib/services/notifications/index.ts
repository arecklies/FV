import { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/services/audit";
import { resolveUserEmails } from "@/lib/services/user-resolver";
import { sendEmail } from "@/lib/services/email";
import { renderFristEskalation } from "@/lib/services/email/templates/frist-eskalation";
import type { AmpelWechsel, BenachrichtigungsErgebnis, UserBenachrichtigungsConfig } from "./types";
import { UserBenachrichtigungsConfigSchema } from "./types";

/**
 * NotificationService (ADR-018, PROJ-38)
 *
 * Verarbeitet Ampelwechsel und versendet E-Mail-Benachrichtigungen.
 * - Duplikat-Schutz via frist_benachrichtigungen ON CONFLICT DO NOTHING
 * - Opt-out via config_user_benachrichtigungen (Default: beide aktiviert)
 * - Referatsleiter-Rot: Opt-out wird ignoriert (AC-3)
 * - Rate-Limit: max 50 E-Mails pro Aufruf (NFR-3)
 *
 * Erhaelt Supabase-Client als Parameter (Service-Role, DI-Pattern, ADR-003).
 */

/** Max. E-Mails pro Cron-Lauf (NFR-3, ADR-018) */
const RATE_LIMIT_PRO_LAUF = 50;

/** App-Base-URL fuer Direktlinks */
function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://app.fachverfahren.de";
}

/**
 * Laedt Opt-out-Konfigurationen fuer eine Liste von User-IDs.
 * Kein Eintrag = Default (beide aktiviert).
 */
async function ladeOptOutConfig(
  serviceClient: SupabaseClient,
  tenantId: string,
  userIds: string[]
): Promise<Map<string, UserBenachrichtigungsConfig>> {
  const result = new Map<string, UserBenachrichtigungsConfig>();
  if (userIds.length === 0) return result;

  const uniqueIds = [...new Set(userIds)];

  const { data, error } = await serviceClient
    .from("config_user_benachrichtigungen")
    .select("id, tenant_id, user_id, email_frist_gelb, email_frist_rot, created_at, updated_at")
    .eq("tenant_id", tenantId)
    .in("user_id", uniqueIds)
    .limit(100);

  if (error || !data) return result;

  for (const row of data) {
    const parsed = UserBenachrichtigungsConfigSchema.parse(row);
    result.set(parsed.user_id, parsed);
  }

  return result;
}

/**
 * Prueft ob ein User fuer den gegebenen Ampelstatus benachrichtigt werden soll.
 * Default (kein Config-Eintrag): aktiviert.
 * Referatsleiter bei Rot: Opt-out wird ignoriert (AC-3).
 */
function sollBenachrichtigen(
  config: UserBenachrichtigungsConfig | undefined,
  ampelStatus: "gelb" | "rot",
  istReferatsleiter: boolean
): boolean {
  // Referatsleiter bei Rot: immer benachrichtigen (AC-3)
  if (istReferatsleiter && ampelStatus === "rot") return true;

  // Kein Config-Eintrag: Default = aktiviert
  if (!config) return true;

  if (ampelStatus === "gelb") return config.email_frist_gelb;
  if (ampelStatus === "rot") return config.email_frist_rot;

  return true;
}

/**
 * Versucht einen Duplikat-Schutz-Eintrag zu erstellen.
 * Returns true wenn Insert erfolgreich (= noch nicht benachrichtigt).
 * Returns false wenn Duplikat (ON CONFLICT DO NOTHING).
 */
async function registriereBenachrichtigung(
  serviceClient: SupabaseClient,
  tenantId: string,
  fristId: string,
  userId: string,
  ampelStatus: string
): Promise<boolean> {
  // INSERT ... ON CONFLICT (frist_id, user_id, ampel_status) DO NOTHING
  // Supabase-Client hat kein natives ON CONFLICT — wir verwenden .upsert mit ignoreDuplicates
  const { data, error } = await serviceClient
    .from("frist_benachrichtigungen")
    .upsert(
      {
        tenant_id: tenantId,
        frist_id: fristId,
        user_id: userId,
        ampel_status: ampelStatus,
      },
      {
        onConflict: "frist_id,user_id,ampel_status",
        ignoreDuplicates: true,
      }
    )
    .select("id");

  if (error) {
    console.error("[PROJ-38] Duplikat-Schutz-Insert fehlgeschlagen");
    return false;
  }

  // ignoreDuplicates: data ist leer bei Duplikat, hat Eintrag bei neuem Insert
  return (data ?? []).length > 0;
}

/** Einzelne Empfaenger-Benachrichtigung */
interface EmpfaengerInfo {
  userId: string;
  istReferatsleiter: boolean;
  wechsel: AmpelWechsel;
}

/**
 * Hauptfunktion: Verarbeitet eine Liste von Ampelwechseln und versendet E-Mails.
 *
 * Ablauf pro Wechsel:
 * 1. Empfaenger bestimmen (Sachbearbeiter, ggf. Referatsleiter bei Rot)
 * 2. Duplikat-Schutz pruefen (frist_benachrichtigungen)
 * 3. Opt-out pruefen (config_user_benachrichtigungen)
 * 4. E-Mail rendern und versenden
 * 5. Rate-Limit: max 50 pro Aufruf
 */
export async function verarbeiteAmpelWechsel(
  serviceClient: SupabaseClient,
  tenantId: string,
  wechsel: AmpelWechsel[]
): Promise<BenachrichtigungsErgebnis> {
  const ergebnis: BenachrichtigungsErgebnis = {
    versendet: 0,
    uebersprungen: 0,
    fehler: 0,
  };

  if (wechsel.length === 0) return ergebnis;

  // Alle beteiligten User-IDs sammeln fuer Batch-Aufloesung
  const alleUserIds: string[] = [];
  const empfaengerListe: EmpfaengerInfo[] = [];

  for (const w of wechsel) {
    // Sachbearbeiter (immer, wenn vorhanden)
    if (w.zustaendigerUserId) {
      alleUserIds.push(w.zustaendigerUserId);
      empfaengerListe.push({
        userId: w.zustaendigerUserId,
        istReferatsleiter: false,
        wechsel: w,
      });
    }

    // Referatsleiter nur bei Rot (FA-2)
    if (w.neuerStatus === "rot") {
      for (const rlId of w.referatsleiterIds) {
        alleUserIds.push(rlId);
        empfaengerListe.push({
          userId: rlId,
          istReferatsleiter: true,
          wechsel: w,
        });
      }
    }
  }

  if (empfaengerListe.length === 0) return ergebnis;

  // Batch: E-Mail-Adressen und Opt-out-Config laden
  const [emailMap, optOutConfig] = await Promise.all([
    resolveUserEmails(serviceClient, alleUserIds),
    ladeOptOutConfig(serviceClient, tenantId, alleUserIds),
  ]);

  // Pro Empfaenger verarbeiten (mit Rate-Limit)
  for (const empfaenger of empfaengerListe) {
    // Rate-Limit pruefen (NFR-3)
    if (ergebnis.versendet >= RATE_LIMIT_PRO_LAUF) {
      ergebnis.uebersprungen++;
      continue;
    }

    const { userId, istReferatsleiter, wechsel: w } = empfaenger;

    // E-Mail-Adresse vorhanden?
    const email = emailMap.get(userId);
    if (!email) {
      ergebnis.uebersprungen++;
      continue;
    }

    // Opt-out pruefen
    const config = optOutConfig.get(userId);
    if (!sollBenachrichtigen(config, w.neuerStatus, istReferatsleiter)) {
      ergebnis.uebersprungen++;
      continue;
    }

    // Duplikat-Schutz: INSERT ON CONFLICT DO NOTHING
    const istNeu = await registriereBenachrichtigung(
      serviceClient,
      tenantId,
      w.fristId,
      userId,
      w.neuerStatus
    );

    if (!istNeu) {
      ergebnis.uebersprungen++;
      continue;
    }

    // Template rendern
    const direktLink = `${getBaseUrl()}/vorgaenge/${w.vorgangId}`;
    const rendered = renderFristEskalation({
      aktenzeichen: w.aktenzeichen,
      fristTyp: w.fristTyp,
      restzeit: w.restzeit,
      ampelStatus: w.neuerStatus,
      direktLink,
    });

    // E-Mail versenden
    const result = await sendEmail({
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    if (result.success) {
      ergebnis.versendet++;
    } else {
      ergebnis.fehler++;
      // Bei Versandfehler: Benachrichtigungs-Eintrag loeschen, damit Retry moeglich ist
      await serviceClient
        .from("frist_benachrichtigungen")
        .delete()
        .eq("frist_id", w.fristId)
        .eq("user_id", userId)
        .eq("ampel_status", w.neuerStatus);
    }
  }

  // Audit-Log fuer den Gesamtdurchlauf (kein PII)
  if (ergebnis.versendet > 0 || ergebnis.fehler > 0) {
    await writeAuditLog({
      tenantId,
      userId: null,
      action: "benachrichtigung.batch_versendet",
      resourceType: "frist_benachrichtigung",
      payload: {
        versendet: ergebnis.versendet,
        uebersprungen: ergebnis.uebersprungen,
        fehler: ergebnis.fehler,
        anzahl_wechsel: wechsel.length,
      },
    });
  }

  return ergebnis;
}
