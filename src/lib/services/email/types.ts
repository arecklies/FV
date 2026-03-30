import { z } from "zod";

/**
 * Email-Types (ADR-018, PROJ-38)
 * Single Source of Truth fuer E-Mail-Versand-Interfaces.
 */

/** E-Mail-Payload fuer den EmailProviderService */
export const EmailPayloadSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().min(1),
  text: z.string().min(1),
});
export type EmailPayload = z.infer<typeof EmailPayloadSchema>;

/** Ergebnis eines E-Mail-Versands */
export const EmailResultSchema = z.object({
  success: z.boolean(),
  messageId: z.string().optional(),
});
export type EmailResult = z.infer<typeof EmailResultSchema>;
