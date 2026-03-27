/**
 * compile-schematron.js (PROJ-59)
 *
 * Pre-Kompilierung: .sch -> XSLT -> .sef.json
 *
 * Ablauf:
 *   1. ISO Schematron XSLT-Skeleton herunterladen (einmalig)
 *   2. .sch -> intermediate XSLT (3-Stufen ISO-Pipeline via xslt3)
 *   3. intermediate XSLT -> .sef.json (xslt3 -compile)
 *
 * Aufruf: npm run prebuild:schematron
 * Output: xbau-service/compiled/xbau-schematron.sef.json
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import https from "node:https";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "..");
const INPUT_SCH = path.resolve(PROJECT_ROOT, "..", "Input", "sch", "xbau-schematron.sch");
const COMPILED_DIR = path.resolve(PROJECT_ROOT, "compiled");
const ISO_DIR = path.resolve(PROJECT_ROOT, "lib", "iso-schematron");
const TEMP_DIR = path.resolve(PROJECT_ROOT, "compiled", ".tmp");

// ISO Schematron XSLT-Skeleton URLs (SchXslt2 -- modernes MIT-lizenziertes Schematron fuer XSLT2/3)
// SchXslt2 ist ein einzelnes Stylesheet (kein 3-Stufen-Prozess noetig)
const SCHXSLT2_URL =
  "https://raw.githubusercontent.com/schxslt/schxslt/main/src/main/resources/xslt/2.0/compile-for-svrl.xsl";

// Fallback: Klassische ISO Schematron Pipeline (3 Stufen)
const ISO_SKELETON_URLS = {
  "iso_dsdl_include.xsl":
    "https://raw.githubusercontent.com/Schematron/schematron/master/trunk/schematron/code/iso_dsdl_include.xsl",
  "iso_abstract_expand.xsl":
    "https://raw.githubusercontent.com/Schematron/schematron/master/trunk/schematron/code/iso_abstract_expand.xsl",
  "iso_svrl_for_xslt2.xsl":
    "https://raw.githubusercontent.com/Schematron/schematron/master/trunk/schematron/code/iso_svrl_for_xslt2.xsl",
};

/** HTTPS-Download mit Redirect-Handling */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = (requestUrl) => {
      https
        .get(requestUrl, (response) => {
          // Handle redirects
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            file.close();
            request(response.headers.location);
            return;
          }
          if (response.statusCode !== 200) {
            file.close();
            fs.unlinkSync(dest);
            reject(new Error(`HTTP ${response.statusCode} beim Download von ${requestUrl}`));
            return;
          }
          response.pipe(file);
          file.on("finish", () => {
            file.close();
            resolve();
          });
        })
        .on("error", (err) => {
          file.close();
          if (fs.existsSync(dest)) fs.unlinkSync(dest);
          reject(err);
        });
    };
    request(url);
  });
}

/** ISO Schematron XSLT-Dateien herunterladen (einmalig) */
async function ensureIsoSkeletonFiles() {
  const files = Object.keys(ISO_SKELETON_URLS);
  const allExist = files.every((f) => fs.existsSync(path.join(ISO_DIR, f)));

  if (allExist) {
    console.log("[Compile] ISO Schematron XSLT-Dateien bereits vorhanden");
    return;
  }

  console.log("[Compile] Lade ISO Schematron XSLT-Skeleton-Dateien herunter...");
  fs.mkdirSync(ISO_DIR, { recursive: true });

  for (const [filename, url] of Object.entries(ISO_SKELETON_URLS)) {
    const dest = path.join(ISO_DIR, filename);
    if (fs.existsSync(dest)) continue;
    console.log(`  -> ${filename}`);
    try {
      await downloadFile(url, dest);
    } catch (err) {
      console.error(`  FEHLER beim Download von ${filename}: ${err.message}`);
      console.error("  Bitte manuell herunterladen oder Internetverbindung pruefen.");
      process.exit(1);
    }
  }

  console.log("[Compile] ISO Schematron XSLT-Dateien heruntergeladen");
}

/** xslt3-Befehl ausfuehren */
function runXslt3(args) {
  const cmd = `npx xslt3 ${args}`;
  console.log(`  $ ${cmd}`);
  try {
    execSync(cmd, {
      cwd: PROJECT_ROOT,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 120_000,
    });
  } catch (err) {
    const stderr = err.stderr?.toString() || "";
    const stdout = err.stdout?.toString() || "";
    console.error(`  FEHLER: ${stderr || stdout || err.message}`);
    throw new Error(`xslt3 fehlgeschlagen: ${stderr || err.message}`);
  }
}

/** Hauptkompilierung: .sch -> XSLT -> .sef.json */
async function compile() {
  console.log("[Compile] Starte Schematron-Kompilierung...");
  console.log(`  Input:  ${INPUT_SCH}`);
  console.log(`  Output: ${COMPILED_DIR}/xbau-schematron.sef.json`);

  // Pruefen ob .sch-Datei existiert
  if (!fs.existsSync(INPUT_SCH)) {
    console.error(`[Compile] FEHLER: Schematron-Datei nicht gefunden: ${INPUT_SCH}`);
    process.exit(1);
  }

  // Verzeichnisse erstellen
  fs.mkdirSync(COMPILED_DIR, { recursive: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  // ISO Skeleton herunterladen
  await ensureIsoSkeletonFiles();

  const step1Output = path.join(TEMP_DIR, "step1-included.sch");
  const step2Output = path.join(TEMP_DIR, "step2-expanded.sch");
  const step3Output = path.join(TEMP_DIR, "step3-svrl.xsl");
  const sefOutput = path.join(COMPILED_DIR, "xbau-schematron.sef.json");

  // Stufe 1: DSDL Include Resolution
  console.log("\n[Compile] Stufe 1/4: DSDL Include Resolution...");
  runXslt3(
    `-xsl:"${path.join(ISO_DIR, "iso_dsdl_include.xsl")}" -s:"${INPUT_SCH}" -o:"${step1Output}"`
  );

  // Stufe 2: Abstract Pattern Expansion
  console.log("[Compile] Stufe 2/4: Abstract Pattern Expansion...");
  runXslt3(
    `-xsl:"${path.join(ISO_DIR, "iso_abstract_expand.xsl")}" -s:"${step1Output}" -o:"${step2Output}"`
  );

  // Stufe 3: SVRL XSLT Generation (Schematron -> XSLT2)
  console.log("[Compile] Stufe 3/4: SVRL XSLT Generation...");
  runXslt3(
    `-xsl:"${path.join(ISO_DIR, "iso_svrl_for_xslt2.xsl")}" -s:"${step2Output}" -o:"${step3Output}"`
  );

  // Stufe 4: XSLT -> SEF Kompilierung
  console.log("[Compile] Stufe 4/4: XSLT -> SEF Kompilierung...");
  runXslt3(`-xsl:"${step3Output}" -export:"${sefOutput}" -nogo`);

  // Temp-Dateien aufraeumen
  console.log("\n[Compile] Raeume temporaere Dateien auf...");
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });

  // Ergebnis pruefen
  if (!fs.existsSync(sefOutput)) {
    console.error("[Compile] FEHLER: SEF-Datei wurde nicht erstellt");
    process.exit(1);
  }

  const stats = fs.statSync(sefOutput);
  console.log(`[Compile] Erfolgreich! SEF-Datei: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`  -> ${sefOutput}`);
}

compile().catch((err) => {
  console.error("[Compile] Fataler Fehler:", err.message);
  process.exit(1);
});
