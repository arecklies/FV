"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * PROJ-39: Wizard-Navigationsleiste
 *
 * Zurück / Weiter / Vorgang anlegen — responsive gestapelt auf Mobile.
 */

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  submitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function WizardNavigation({
  currentStep,
  totalSteps,
  submitting,
  onBack,
  onNext,
  onSubmit,
}: WizardNavigationProps) {
  return (
    <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 mt-8">
      {currentStep > 1 ? (
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="min-h-[44px]"
          aria-label="Zurück zum vorherigen Schritt"
        >
          Zurück
        </Button>
      ) : (
        <div />
      )}

      {currentStep < totalSteps ? (
        <Button
          type="button"
          onClick={onNext}
          className="min-h-[44px]"
          aria-label="Weiter zum nächsten Schritt"
        >
          Weiter
        </Button>
      ) : (
        <Button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="min-h-[44px]"
        >
          {submitting && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          {submitting ? "Wird angelegt..." : "Vorgang anlegen"}
        </Button>
      )}
    </div>
  );
}
