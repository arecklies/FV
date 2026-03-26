"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, FileText } from "lucide-react";

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
 * Login-Seite (PROJ-1 US-1).
 *
 * - E-Mail + Passwort Formular (shadcn Input + Button)
 * - "Passwort vergessen?"-Link zu /login/reset (US-5)
 * - Fehleranzeige bei falschen Credentials
 * - Loading-State auf Submit-Button
 * - Nach Erfolg: window.location.href (nicht router.push)
 * - WCAG 2.2 AA: ARIA-Labels, Target Size >= 24x24px, Tastaturnavigation
 */

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.fields) {
          setFieldErrors(data.fields);
        } else if (data.error) {
          setError(data.error);
        } else {
          setError("Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.");
        }
        setLoading(false);
        return;
      }

      // Erfolg: data.session pruefen ist hier implizit (server setzt Cookie)
      // window.location.href fuer Post-Login-Redirect (frontend.md Auth Best Practices)
      window.location.href = "/vorgaenge";
    } catch {
      setError("Verbindungsfehler. Bitte pruefen Sie Ihre Internetverbindung.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md bg-background shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground">
              <FileText className="h-6 w-6" aria-hidden="true" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Fachverfahren</CardTitle>
          <CardDescription>
            Digitale Baugenehmigung — Anmeldung
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit} noValidate>
          <CardContent className="space-y-4">
            {/* Allgemeiner Fehler */}
            {error && (
              <Alert variant="destructive" role="alert" aria-live="assertive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* E-Mail */}
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail-Adresse</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@behoerde.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                disabled={loading}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                aria-invalid={!!fieldErrors.email}
              />
              {fieldErrors.email && (
                <p id="email-error" className="text-sm text-destructive" role="alert">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Passwort */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Passwort</Label>
                <Link
                  href="/login/reset"
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                  tabIndex={0}
                >
                  Passwort vergessen?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
                aria-invalid={!!fieldErrors.password}
              />
              {fieldErrors.password && (
                <p id="password-error" className="text-sm text-destructive" role="alert">
                  {fieldErrors.password}
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              className="w-full min-h-[44px]"
              disabled={loading}
              aria-label="Anmelden"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Anmeldung..." : "Anmelden"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
