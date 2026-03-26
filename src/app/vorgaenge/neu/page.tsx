"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { ArrowLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { Verfahrensart } from "@/lib/services/verfahren/types";

/**
 * Vorgang anlegen (PROJ-3 US-1)
 *
 * Formular mit Verfahrensart, Bauherr, Grundstück.
 * Client-seitige Validierung vor Submit.
 */

interface FormData {
  verfahrensart_id: string;
  bauherr_name: string;
  bauherr_anschrift: string;
  bauherr_telefon: string;
  bauherr_email: string;
  grundstueck_adresse: string;
  grundstueck_flurstueck: string;
  grundstueck_gemarkung: string;
  bezeichnung: string;
}

export default function VorgangNeuPage() {
  const router = useRouter();

  // Verfahrensarten
  const [verfahrensarten, setVerfahrensarten] = React.useState<Verfahrensart[]>([]);
  const [verfahrensartenLoading, setVerfahrensartenLoading] = React.useState(true);

  // Form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      verfahrensart_id: "",
      bauherr_name: "",
      bauherr_anschrift: "",
      bauherr_telefon: "",
      bauherr_email: "",
      grundstueck_adresse: "",
      grundstueck_flurstueck: "",
      grundstueck_gemarkung: "",
      bezeichnung: "",
    },
  });

  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const verfahrensartId = watch("verfahrensart_id");

  // Verfahrensarten laden
  React.useEffect(() => {
    async function load() {
      setVerfahrensartenLoading(true);
      try {
        const res = await fetch("/api/verfahrensarten", {
          credentials: "include",
        });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setVerfahrensarten(data.verfahrensarten ?? []);
        }
      } catch {
        // Fehler wird ueber leere Liste sichtbar
      } finally {
        setVerfahrensartenLoading(false);
      }
    }
    load();
  }, []);

  // Auto-Save (localStorage)
  const STORAGE_KEY = "vorgang_neu_autosave";

  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved) as Partial<FormData>;
        Object.entries(data).forEach(([key, value]) => {
          if (value) {
            setValue(key as keyof FormData, value as string);
          }
        });
      } catch {
        // Ungueltige Daten ignorieren
      }
    }
  }, [setValue]);

  // Formular-Aenderungen speichern
  const formValues = watch();
  React.useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formValues));
    }, 500);
    return () => clearTimeout(timer);
  }, [formValues]);

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    setSubmitError(null);
    setFieldErrors({});

    // Client-seitige Validierung
    const clientErrors: Record<string, string> = {};
    if (!data.verfahrensart_id) {
      clientErrors.verfahrensart_id = "Verfahrensart ist Pflichtfeld";
    }
    if (!data.bauherr_name.trim()) {
      clientErrors.bauherr_name = "Bauherr (Name) ist Pflichtfeld";
    }
    if (!data.grundstueck_adresse.trim() && !data.grundstueck_flurstueck.trim()) {
      clientErrors.grundstueck_adresse = "Mindestens Adresse oder Flurstück ist Pflicht";
    }
    if (data.bauherr_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.bauherr_email)) {
      clientErrors.bauherr_email = "Ungültige E-Mail-Adresse";
    }

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setSubmitting(false);
      return;
    }

    try {
      const body: Record<string, unknown> = {
        verfahrensart_id: data.verfahrensart_id,
        bauherr_name: data.bauherr_name.trim(),
      };
      if (data.bauherr_anschrift.trim()) body.bauherr_anschrift = data.bauherr_anschrift.trim();
      if (data.bauherr_telefon.trim()) body.bauherr_telefon = data.bauherr_telefon.trim();
      if (data.bauherr_email.trim()) body.bauherr_email = data.bauherr_email.trim();
      if (data.grundstueck_adresse.trim()) body.grundstueck_adresse = data.grundstueck_adresse.trim();
      if (data.grundstueck_flurstueck.trim()) body.grundstueck_flurstueck = data.grundstueck_flurstueck.trim();
      if (data.grundstueck_gemarkung.trim()) body.grundstueck_gemarkung = data.grundstueck_gemarkung.trim();
      if (data.bezeichnung.trim()) body.bezeichnung = data.bezeichnung.trim();

      const res = await fetch("/api/vorgaenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (res.status === 400) {
        const errorData = await res.json();
        if (errorData.fields) {
          setFieldErrors(errorData.fields);
        } else {
          setSubmitError("Ungültige Eingaben. Bitte prüfen Sie die Felder.");
        }
        return;
      }

      if (!res.ok) {
        setSubmitError("Vorgang konnte nicht angelegt werden. Bitte versuchen Sie es erneut.");
        return;
      }

      // Erfolg: Auto-Save loeschen, zur Liste navigieren
      localStorage.removeItem(STORAGE_KEY);
      router.push("/vorgaenge");
    } catch {
      setSubmitError("Verbindungsfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/vorgaenge">
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
            Zurück zur Liste
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          Neuen Vorgang anlegen
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Erstellen Sie einen neuen Bauantrag oder ein anderes Verfahren.
        </p>
      </div>

      {/* Error Banner */}
      {submitError && (
        <div
          className="rounded-md border border-destructive/50 bg-destructive/10 p-4 mb-4"
          role="alert"
        >
          <p className="text-sm text-destructive">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Verfahrensart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Verfahrensart</CardTitle>
            <CardDescription>
              Wählen Sie die Art des Bauverfahrens.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="verfahrensart_id">
                Verfahrensart <span className="text-destructive">*</span>
              </Label>
              {verfahrensartenLoading ? (
                <div className="h-10 rounded-md bg-muted animate-pulse" />
              ) : (
                <Select
                  value={verfahrensartId}
                  onValueChange={(v) => setValue("verfahrensart_id", v)}
                >
                  <SelectTrigger
                    id="verfahrensart_id"
                    aria-label="Verfahrensart auswählen"
                    aria-invalid={!!fieldErrors.verfahrensart_id || !!errors.verfahrensart_id}
                  >
                    <SelectValue placeholder="Bitte wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {verfahrensarten.map((va) => (
                      <SelectItem key={va.id} value={va.id}>
                        {va.bezeichnung}
                        {va.rechtsgrundlage && (
                          <span className="text-muted-foreground ml-1">
                            ({va.rechtsgrundlage})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {fieldErrors.verfahrensart_id && (
                <p className="text-sm text-destructive" role="alert">
                  {fieldErrors.verfahrensart_id}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bauherr */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Bauherr</CardTitle>
            <CardDescription>
              Angaben zum Bauherrn / Antragsteller.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bauherr_name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bauherr_name"
                {...register("bauherr_name")}
                placeholder="Vor- und Nachname oder Firma"
                aria-invalid={!!fieldErrors.bauherr_name}
                aria-describedby={
                  fieldErrors.bauherr_name ? "bauherr_name_error" : undefined
                }
              />
              {fieldErrors.bauherr_name && (
                <p
                  id="bauherr_name_error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {fieldErrors.bauherr_name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bauherr_anschrift">Anschrift</Label>
              <Input
                id="bauherr_anschrift"
                {...register("bauherr_anschrift")}
                placeholder="Straße, PLZ Ort"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bauherr_telefon">Telefon</Label>
                <Input
                  id="bauherr_telefon"
                  type="tel"
                  {...register("bauherr_telefon")}
                  placeholder="+49..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bauherr_email">E-Mail</Label>
                <Input
                  id="bauherr_email"
                  type="email"
                  {...register("bauherr_email")}
                  placeholder="max@beispiel.de"
                />
                {fieldErrors.bauherr_email && (
                  <p className="text-sm text-destructive" role="alert">
                    {fieldErrors.bauherr_email}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grundstück */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Grundstück</CardTitle>
            <CardDescription>
              Mindestens Adresse oder Flurstück ist erforderlich.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="grundstueck_adresse">
                Adresse <span className="text-destructive">*</span>
              </Label>
              <Input
                id="grundstueck_adresse"
                {...register("grundstueck_adresse")}
                placeholder="Straße, Hausnummer, PLZ Ort"
                aria-invalid={!!fieldErrors.grundstueck_adresse}
                aria-describedby={
                  fieldErrors.grundstueck_adresse
                    ? "grundstueck_adresse_error"
                    : undefined
                }
              />
              {fieldErrors.grundstueck_adresse && (
                <p
                  id="grundstueck_adresse_error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {fieldErrors.grundstueck_adresse}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grundstueck_flurstueck">Flurstück</Label>
                <Input
                  id="grundstueck_flurstueck"
                  {...register("grundstueck_flurstueck")}
                  placeholder="z.B. 123/4"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grundstueck_gemarkung">Gemarkung</Label>
                <Input
                  id="grundstueck_gemarkung"
                  {...register("grundstueck_gemarkung")}
                  placeholder="z.B. Musterstadt"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bezeichnung */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Bezeichnung</CardTitle>
            <CardDescription>
              Optionale Kurzbeschreibung des Vorhabens.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="bezeichnung">Vorhaben-Bezeichnung</Label>
              <Input
                id="bezeichnung"
                {...register("bezeichnung")}
                placeholder="z.B. Neubau Einfamilienhaus mit Garage"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button type="button" variant="outline" asChild>
            <Link href="/vorgaenge">Abbrechen</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && (
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            )}
            {submitting ? "Wird angelegt..." : "Vorgang anlegen"}
          </Button>
        </div>
      </form>
    </div>
  );
}
