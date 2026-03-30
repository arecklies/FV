/**
 * EmailProviderService (ADR-018, PROJ-38)
 *
 * Provider-Abstraktion fuer E-Mail-Versand via Resend.
 * Verwendet fetch() statt Resend SDK (SDK wird spaeter installiert).
 *
 * Security:
 * - API-Key nur ueber RESEND_API_KEY Env-Variable
 * - Keine PII im Log (security.md)
 * - Fehlender API-Key: Warnung + graceful degradation (kein Crash)
 */

import type { EmailPayload, EmailResult } from "./types";

const RESEND_API_URL = "https://api.resend.com/emails";

/**
 * Prüft ob der Resend API-Key konfiguriert ist.
 */
export function isEmailConfigured(): boolean {
  return typeof process.env.RESEND_API_KEY === "string" && process.env.RESEND_API_KEY.length > 0;
}

/**
 * Versendet eine E-Mail via Resend API.
 *
 * Bei fehlendem RESEND_API_KEY: loggt Warnung, gibt { success: false } zurueck.
 * Bei Fehler: loggt serverseitig, gibt { success: false } zurueck.
 * Keine PII (E-Mail-Adresse, Inhalte) im Log.
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  if (!isEmailConfigured()) {
    console.warn("[PROJ-38] RESEND_API_KEY nicht konfiguriert — E-Mail-Versand deaktiviert");
    return { success: false };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_ADDRESS ?? "Fachverfahren <noreply@fachverfahren.de>",
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!response.ok) {
      // Keine Details aus externer API an Client weiterleiten (security.md)
      console.error("[PROJ-38] E-Mail-Versand fehlgeschlagen", {
        status: response.status,
        // Kein response.text() — koennte PII enthalten
      });
      return { success: false };
    }

    const data = (await response.json()) as { id?: string };
    return {
      success: true,
      messageId: data.id,
    };
  } catch (err) {
    // Netzwerkfehler, Timeout etc. — kein PII loggen
    console.error("[PROJ-38] E-Mail-Versand Netzwerkfehler");
    return { success: false };
  }
}
