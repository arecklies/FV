/**
 * Frist-Eskalation E-Mail-Template (ADR-018, PROJ-38)
 *
 * Reine TypeScript-Funktion — kein Handlebars, keine externe Dependency.
 * Enthaelt KEINE PII (keine Antragsteller-Namen, security.md NFR-2).
 */

export interface FristEskalationData {
  /** Aktenzeichen des Vorgangs (kann null sein) */
  aktenzeichen: string | null;
  /** Fristtyp-Bezeichnung (z.B. "Gesamtfrist", "Beteiligungsfrist") */
  fristTyp: string;
  /** Menschenlesbare Restzeit (z.B. "3 Werktage") */
  restzeit: string;
  /** Ampelstatus: gelb oder rot */
  ampelStatus: "gelb" | "rot";
  /** Direktlink zum Vorgang im System */
  direktLink: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const AMPEL_LABELS: Record<string, string> = {
  gelb: "Warnung",
  rot: "Kritisch",
};

const AMPEL_COLORS: Record<string, string> = {
  gelb: "#f59e0b",
  rot: "#ef4444",
};

/**
 * Rendert eine Frist-Eskalations-E-Mail als HTML und Plain-Text.
 * Keine PII im Output — nur Aktenzeichen, Fristtyp, Restzeit und Direktlink.
 */
export function renderFristEskalation(data: FristEskalationData): RenderedEmail {
  const label = AMPEL_LABELS[data.ampelStatus] ?? data.ampelStatus;
  const color = AMPEL_COLORS[data.ampelStatus] ?? "#6b7280";
  const aktenzeichenText = data.aktenzeichen ?? "Ohne Aktenzeichen";

  const subject = `[${label}] Fristeskalation: ${data.fristTyp} — ${aktenzeichenText}`;

  const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 16px;">
  <div style="border-left: 4px solid ${color}; padding: 12px 16px; margin-bottom: 24px; background-color: #f9fafb;">
    <h2 style="margin: 0 0 8px 0; font-size: 18px; color: ${color};">
      Fristeskalation: ${label}
    </h2>
    <p style="margin: 0; font-size: 14px; color: #6b7280;">
      Eine Frist erfordert Ihre Aufmerksamkeit.
    </p>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <tr>
      <td style="padding: 8px 0; font-weight: bold; width: 140px;">Aktenzeichen:</td>
      <td style="padding: 8px 0;">${aktenzeichenText}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; font-weight: bold;">Fristtyp:</td>
      <td style="padding: 8px 0;">${data.fristTyp}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; font-weight: bold;">Restzeit:</td>
      <td style="padding: 8px 0;">${data.restzeit}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; font-weight: bold;">Status:</td>
      <td style="padding: 8px 0;">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: ${color}; color: white; font-size: 12px; font-weight: bold;">
          ${label}
        </span>
      </td>
    </tr>
  </table>

  <a href="${data.direktLink}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
    Vorgang öffnen
  </a>

  <p style="margin-top: 32px; font-size: 12px; color: #9ca3af;">
    Diese E-Mail wurde automatisch vom Fachverfahren gesendet.
    Sie können Benachrichtigungen in Ihren persönlichen Einstellungen konfigurieren.
  </p>
</body>
</html>`;

  const text = `Fristeskalation: ${label}

Aktenzeichen: ${aktenzeichenText}
Fristtyp: ${data.fristTyp}
Restzeit: ${data.restzeit}
Status: ${label}

Vorgang öffnen: ${data.direktLink}

---
Diese E-Mail wurde automatisch vom Fachverfahren gesendet.
Sie können Benachrichtigungen in Ihren persönlichen Einstellungen konfigurieren.`;

  return { subject, html, text };
}
