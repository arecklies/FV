import { z } from "zod";

/**
 * Notification-Types (ADR-018, PROJ-38)
 * Single Source of Truth fuer Benachrichtigungs-Interfaces.
 */

// -- Ampelwechsel (Input fuer NotificationService) --

/** Benachrichtigungsrelevante Ampelstatus: nur gelb und rot loesen E-Mails aus */
export const BenachrichtigungsAmpelSchema = z.enum(["gelb", "rot"]);
export type BenachrichtigungsAmpel = z.infer<typeof BenachrichtigungsAmpelSchema>;

/** Ein erkannter Ampelwechsel, der eine Benachrichtigung ausloesen kann */
export const AmpelWechselSchema = z.object({
  fristId: z.string().uuid(),
  vorgangId: z.string().uuid(),
  tenantId: z.string().uuid(),
  neuerStatus: BenachrichtigungsAmpelSchema,
  /** Aktenzeichen des Vorgangs (fuer E-Mail-Template) */
  aktenzeichen: z.string().nullable(),
  /** Fristtyp-Bezeichnung (fuer E-Mail-Template) */
  fristTyp: z.string().min(1),
  /** Menschenlesbare Restzeit (z.B. "3 Werktage") */
  restzeit: z.string().min(1),
  /** User-ID des zustaendigen Sachbearbeiters */
  zustaendigerUserId: z.string().uuid().nullable(),
  /** User-IDs der Referatsleiter (nur bei Rot relevant) */
  referatsleiterIds: z.array(z.string().uuid()).default([]),
});
export type AmpelWechsel = z.infer<typeof AmpelWechselSchema>;

// -- Ergebnis --

/** Ergebnis eines Benachrichtigungsdurchlaufs */
export const BenachrichtigungsErgebnisSchema = z.object({
  versendet: z.number().int().nonnegative(),
  uebersprungen: z.number().int().nonnegative(),
  fehler: z.number().int().nonnegative(),
});
export type BenachrichtigungsErgebnis = z.infer<typeof BenachrichtigungsErgebnisSchema>;

// -- Opt-out-Konfiguration (DB-Ergebnis) --

export const UserBenachrichtigungsConfigSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  user_id: z.string(),
  email_frist_gelb: z.boolean(),
  email_frist_rot: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type UserBenachrichtigungsConfig = z.infer<typeof UserBenachrichtigungsConfigSchema>;
