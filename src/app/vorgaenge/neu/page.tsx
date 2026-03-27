"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { WizardStepper } from "@/components/vorgaenge/wizard-stepper";
import { WizardNavigation } from "@/components/vorgaenge/wizard-navigation";

import type { Verfahrensart } from "@/lib/services/verfahren/types";
import {
  WIZARD_STEPS,
  validateStep,
  loadWizardState,
  saveWizardState,
  clearWizardState,
} from "@/lib/utils/vorgang-wizard-schemas";

/**
 * Vorgang anlegen (PROJ-3 US-1, PROJ-39 Wizard)
 *
 * Zwei Modi: Wizard (Schritt für Schritt) und Schnellanlage (alle Felder).
 * Modus-Präferenz in localStorage gespeichert.
 */

interface FormData {
  [key: string]: string;
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

const DEFAULT_FORM: FormData = {
  verfahrensart_id: "",
  bauherr_name: "",
  bauherr_anschrift: "",
  bauherr_telefon: "",
  bauherr_email: "",
  grundstueck_adresse: "",
  grundstueck_flurstueck: "",
  grundstueck_gemarkung: "",
  bezeichnung: "",
};

export default function VorgangNeuPage() {
  const router = useRouter();

  // Modus: wizard oder schnell
  const [modus, setModus] = React.useState<"wizard" | "schnell">("wizard");
  const [currentStep, setCurrentStep] = React.useState(1);

  // Verfahrensarten
  const [verfahrensarten, setVerfahrensarten] = React.useState<Verfahrensart[]>([]);
  const [verfahrensartenLoading, setVerfahrensartenLoading] = React.useState(true);

  // Form
  const {
    register,
    setValue,
    watch,
    getValues,
  } = useForm<FormData>({ defaultValues: DEFAULT_FORM });

  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = React.useState<"saved" | "unsaved">("unsaved");

  const verfahrensartId = watch("verfahrensart_id");
  const stepHeadingRef = React.useRef<HTMLHeadingElement>(null);

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
        // Fehler wird über leere Liste sichtbar
      } finally {
        setVerfahrensartenLoading(false);
      }
    }
    load();
  }, []);

  // Auto-Save: Restore bei Mount
  React.useEffect(() => {
    const saved = loadWizardState();
    if (saved) {
      setModus(saved.modus);
      setCurrentStep(saved.currentStep);
      Object.entries(saved.data).forEach(([key, value]) => {
        if (value && key in DEFAULT_FORM) setValue(key, value);
      });
      setSaveStatus("saved");
    }
  }, [setValue]);

  // Auto-Save: 500ms Debounce bei Änderung
  const formValues = watch();
  React.useEffect(() => {
    const timer = setTimeout(() => {
      saveWizardState({
        modus,
        currentStep,
        data: formValues as unknown as Record<string, string>,
        savedAt: new Date().toISOString(),
      });
      setSaveStatus("saved");
    }, 500);
    return () => {
      setSaveStatus("unsaved");
      clearTimeout(timer);
    };
  }, [formValues, modus, currentStep]);

  // Keyboard: Escape = zurück, Ctrl+Enter = zur Zusammenfassung
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (modus !== "wizard") return;
      if (e.key === "Escape" && currentStep > 1) {
        e.preventDefault();
        setCurrentStep(currentStep - 1);
      }
      if (e.ctrlKey && e.key === "Enter" && currentStep < WIZARD_STEPS.length) {
        e.preventDefault();
        handleGoToSummary();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modus, currentStep]);

  // Fokus auf Schritt-Heading bei Wechsel
  React.useEffect(() => {
    if (modus === "wizard" && stepHeadingRef.current) {
      stepHeadingRef.current.focus();
    }
  }, [currentStep, modus]);

  function handleGoToSummary() {
    const data = getValues();
    const step1Errors = validateStep(1, data);
    if (step1Errors) {
      setCurrentStep(1);
      setFieldErrors(step1Errors);
      return;
    }
    const step2Errors = validateStep(2, data);
    if (step2Errors) {
      setCurrentStep(2);
      setFieldErrors(step2Errors);
      return;
    }
    setFieldErrors({});
    setCurrentStep(WIZARD_STEPS.length);
  }

  function handleNext() {
    const data = getValues();
    const errors = validateStep(currentStep, data);
    if (errors) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setCurrentStep(currentStep + 1);
  }

  function handleBack() {
    setFieldErrors({});
    setCurrentStep(currentStep - 1);
  }

  function handleStepClick(step: number) {
    setFieldErrors({});
    setCurrentStep(step);
  }

  async function handleFormSubmit() {
    const data = getValues();
    setSubmitting(true);
    setSubmitError(null);
    setFieldErrors({});

    // Finale Validierung aller Schritte
    const step1Errors = validateStep(1, data);
    if (step1Errors) {
      setFieldErrors(step1Errors);
      if (modus === "wizard") setCurrentStep(1);
      setSubmitting(false);
      return;
    }
    const step2Errors = validateStep(2, data);
    if (step2Errors) {
      setFieldErrors(step2Errors);
      if (modus === "wizard") setCurrentStep(2);
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
          // Im Wizard zum fehlerhaften Schritt springen
          if (modus === "wizard") {
            if (errorData.fields.verfahrensart_id) setCurrentStep(1);
            else setCurrentStep(2);
          }
        } else {
          setSubmitError("Ungültige Eingaben. Bitte prüfen Sie die Felder.");
        }
        return;
      }

      if (!res.ok) {
        setSubmitError("Vorgang konnte nicht angelegt werden. Bitte versuchen Sie es erneut.");
        return;
      }

      clearWizardState();
      toast.success("Vorgang angelegt");
      router.push("/vorgaenge");
    } catch {
      setSubmitError("Verbindungsfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setSubmitting(false);
    }
  }

  // Verfahrensart-Label für Zusammenfassung
  const selectedVa = verfahrensarten.find((va) => va.id === verfahrensartId);

  // --- Shared Field Components ---

  function VerfahrensartField() {
    return (
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
              aria-invalid={!!fieldErrors.verfahrensart_id}
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
    );
  }

  function DetailsFields() {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bauherr</CardTitle>
            <CardDescription>Angaben zum Antragsteller.</CardDescription>
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
                aria-describedby={fieldErrors.bauherr_name ? "bauherr_name_error" : undefined}
              />
              {fieldErrors.bauherr_name && (
                <p id="bauherr_name_error" className="text-sm text-destructive" role="alert">
                  {fieldErrors.bauherr_name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bauherr_anschrift">Anschrift</Label>
              <Input id="bauherr_anschrift" {...register("bauherr_anschrift")} placeholder="Straße, PLZ Ort" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bauherr_telefon">Telefon</Label>
                <Input id="bauherr_telefon" type="tel" {...register("bauherr_telefon")} placeholder="+49..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bauherr_email">E-Mail</Label>
                <Input id="bauherr_email" type="email" {...register("bauherr_email")} placeholder="max@beispiel.de" />
                {fieldErrors.bauherr_email && (
                  <p className="text-sm text-destructive" role="alert">{fieldErrors.bauherr_email}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Grundstück und Vorhaben</CardTitle>
            <CardDescription>Mindestens Adresse oder Flurstück ist erforderlich.</CardDescription>
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
                aria-describedby={fieldErrors.grundstueck_adresse ? "grundstueck_adresse_error" : undefined}
              />
              {fieldErrors.grundstueck_adresse && (
                <p id="grundstueck_adresse_error" className="text-sm text-destructive" role="alert">
                  {fieldErrors.grundstueck_adresse}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grundstueck_flurstueck">Flurstück</Label>
                <Input id="grundstueck_flurstueck" {...register("grundstueck_flurstueck")} placeholder="z.B. 123/4" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grundstueck_gemarkung">Gemarkung</Label>
                <Input id="grundstueck_gemarkung" {...register("grundstueck_gemarkung")} placeholder="z.B. Musterstadt" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bezeichnung">Vorhaben-Bezeichnung</Label>
              <Input id="bezeichnung" {...register("bezeichnung")} placeholder="z.B. Neubau Einfamilienhaus mit Garage" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  function ZusammenfassungContent() {
    const data = getValues();
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Zusammenfassung</CardTitle>
          <CardDescription>Prüfen Sie Ihre Angaben vor dem Anlegen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Verfahrensart */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Verfahrensart</p>
              <p className="text-sm">{selectedVa?.bezeichnung ?? "Nicht gewählt"}</p>
              {selectedVa?.rechtsgrundlage && (
                <p className="text-xs text-muted-foreground">{selectedVa.rechtsgrundlage}</p>
              )}
            </div>
            {modus === "wizard" && (
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)} className="text-primary shrink-0">
                Ändern
              </Button>
            )}
          </div>
          <Separator />

          {/* Bauherr */}
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-muted-foreground">Bauherr</p>
              <p className="text-sm">{data.bauherr_name || "-"}</p>
              {data.bauherr_anschrift && <p className="text-sm text-muted-foreground">{data.bauherr_anschrift}</p>}
              {data.bauherr_telefon && <p className="text-sm text-muted-foreground">{data.bauherr_telefon}</p>}
              {data.bauherr_email && <p className="text-sm text-muted-foreground">{data.bauherr_email}</p>}
            </div>
            {modus === "wizard" && (
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)} className="text-primary shrink-0">
                Ändern
              </Button>
            )}
          </div>
          <Separator />

          {/* Grundstück */}
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-muted-foreground">Grundstück</p>
              <p className="text-sm">{data.grundstueck_adresse || data.grundstueck_flurstueck || "-"}</p>
              {data.grundstueck_gemarkung && <p className="text-sm text-muted-foreground">Gemarkung: {data.grundstueck_gemarkung}</p>}
              {data.bezeichnung && (
                <>
                  <p className="text-sm font-medium text-muted-foreground mt-2">Vorhaben</p>
                  <p className="text-sm">{data.bezeichnung}</p>
                </>
              )}
            </div>
            {modus === "wizard" && (
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)} className="text-primary shrink-0">
                Ändern
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/vorgaenge">Vorgänge</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Neuer Vorgang</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header mit Modus-Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Neuen Vorgang anlegen</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Erstellen Sie einen neuen Bauantrag oder ein anderes Verfahren.
          </p>
        </div>
        <Tabs
          value={modus}
          onValueChange={(v) => {
            setModus(v as "wizard" | "schnell");
            setFieldErrors({});
          }}
          className="w-auto"
        >
          <TabsList className="h-9">
            <TabsTrigger value="wizard" className="text-xs px-3">Schritt für Schritt</TabsTrigger>
            <TabsTrigger value="schnell" className="text-xs px-3">Alle Felder</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Error Banner */}
      {submitError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 mb-4" role="alert">
          <p className="text-sm text-destructive">{submitError}</p>
        </div>
      )}

      {/* === WIZARD MODUS === */}
      {modus === "wizard" && (
        <div>
          <WizardStepper
            steps={WIZARD_STEPS}
            currentStep={currentStep}
            onStepClick={handleStepClick}
          />

          {/* Schritt 1: Verfahrensart */}
          {currentStep === 1 && (
            <div role="group" aria-labelledby="step-1-heading">
              <h2 id="step-1-heading" ref={stepHeadingRef} tabIndex={-1} className="sr-only">
                {WIZARD_STEPS[0].label}
              </h2>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Verfahrensart wählen</CardTitle>
                  <CardDescription>Welche Art von Bauverfahren möchten Sie anlegen?</CardDescription>
                </CardHeader>
                <CardContent>
                  <VerfahrensartField />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Schritt 2: Details */}
          {currentStep === 2 && (
            <div role="group" aria-labelledby="step-2-heading">
              <h2 id="step-2-heading" ref={stepHeadingRef} tabIndex={-1} className="sr-only">
                {WIZARD_STEPS[1].label}
              </h2>
              <DetailsFields />
            </div>
          )}

          {/* Schritt 3: Zusammenfassung */}
          {currentStep === 3 && (
            <div role="group" aria-labelledby="step-3-heading">
              <h2 id="step-3-heading" ref={stepHeadingRef} tabIndex={-1} className="sr-only">
                {WIZARD_STEPS[2].label}
              </h2>
              <ZusammenfassungContent />
            </div>
          )}

          <WizardNavigation
            currentStep={currentStep}
            totalSteps={WIZARD_STEPS.length}
            submitting={submitting}
            onBack={handleBack}
            onNext={handleNext}
            onSubmit={handleFormSubmit}
          />

          {/* Auto-Save-Indikator */}
          <p className="text-xs text-muted-foreground text-center mt-2" aria-live="polite" aria-atomic="true">
            {saveStatus === "saved" ? "Entwurf gespeichert" : ""}
          </p>
        </div>
      )}

      {/* === SCHNELLANLAGE MODUS === */}
      {modus === "schnell" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleFormSubmit();
          }}
          noValidate
        >
          {/* Verfahrensart */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Verfahrensart</CardTitle>
              <CardDescription>Wählen Sie die Art des Bauverfahrens.</CardDescription>
            </CardHeader>
            <CardContent>
              <VerfahrensartField />
            </CardContent>
          </Card>

          {/* Bauherr + Grundstück + Bezeichnung */}
          <DetailsFields />

          {/* Submit */}
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end mt-8">
            <Button type="button" variant="outline" asChild>
              <Link href="/vorgaenge">Abbrechen</Link>
            </Button>
            <Button type="submit" disabled={submitting} className="min-h-[44px]">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {submitting ? "Wird angelegt..." : "Vorgang anlegen"}
            </Button>
          </div>

          {/* Auto-Save-Indikator */}
          <p className="text-xs text-muted-foreground text-center mt-2" aria-live="polite" aria-atomic="true">
            {saveStatus === "saved" ? "Entwurf gespeichert" : ""}
          </p>
        </form>
      )}
    </div>
  );
}
