"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Passwort-Reset-Seite (PROJ-1 US-5).
 *
 * - E-Mail-Eingabe + Submit
 * - Erfolgsmeldung: "Falls ein Konto existiert, erhalten Sie eine E-Mail"
 *   (verhindert User-Enumeration)
 * - Zurueck-Link zur Login-Seite
 */

export default function ResetPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Supabase resetPasswordForEmail ueber den Client
      // Fuer Phase 0: Direkte Supabase-Client-Nutzung (kein eigener API-Endpunkt noetig)
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
      );

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (resetError) {
        // Kein User-Enumeration: Immer Erfolgsmeldung zeigen
        console.error("[PROJ-1] Password reset error:", resetError.message);
      }

      // Unabhaengig vom Ergebnis: Erfolgsmeldung zeigen
      setSubmitted(true);
    } catch {
      setError("Verbindungsfehler. Bitte versuchen Sie es spaeter erneut.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Passwort zuruecksetzen</CardTitle>
          <CardDescription>
            Geben Sie Ihre E-Mail-Adresse ein, um einen Link zum Zuruecksetzen Ihres Passworts
            zu erhalten.
          </CardDescription>
        </CardHeader>

        {submitted ? (
          /* Erfolgszustand */
          <CardContent className="space-y-4">
            <Alert role="status" aria-live="polite">
              <Mail className="h-4 w-4" />
              <AlertDescription>
                Falls ein Konto mit dieser E-Mail-Adresse existiert, erhalten Sie in Kuerze
                eine E-Mail mit einem Link zum Zuruecksetzen Ihres Passworts.
              </AlertDescription>
            </Alert>
            <div className="text-center">
              <Link href="/login">
                <Button variant="ghost" className="gap-2 min-h-[44px]" aria-label="Zurueck zur Anmeldung">
                  <ArrowLeft className="h-4 w-4" />
                  Zurueck zur Anmeldung
                </Button>
              </Link>
            </div>
          </CardContent>
        ) : (
          /* Formular */
          <form onSubmit={handleSubmit} noValidate>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive" role="alert" aria-live="assertive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="reset-email">E-Mail-Adresse</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="name@behoerde.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                  disabled={loading}
                  aria-label="E-Mail-Adresse fuer Passwort-Reset"
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3">
              <Button
                type="submit"
                className="w-full min-h-[44px]"
                disabled={loading || !email.trim()}
                aria-label="Link zum Zuruecksetzen anfordern"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Wird gesendet..." : "Link anfordern"}
              </Button>
              <Link href="/login" className="w-full">
                <Button
                  variant="ghost"
                  className="w-full gap-2 min-h-[44px]"
                  type="button"
                  aria-label="Zurueck zur Anmeldung"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Zurueck zur Anmeldung
                </Button>
              </Link>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
