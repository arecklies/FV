"use client";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WizardStep } from "@/lib/utils/vorgang-wizard-schemas";

/**
 * PROJ-39: Wizard-Stepper
 *
 * Desktop: Horizontal mit klickbaren Schritten (nur bereits besuchte).
 * Mobile: Progress-Bar mit Text-Label.
 */

interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

export function WizardStepper({ steps, currentStep, onStepClick }: WizardStepperProps) {
  const totalSteps = steps.length;
  const progressPercent = (currentStep / totalSteps) * 100;

  return (
    <>
      {/* Desktop Stepper */}
      <nav
        role="navigation"
        aria-label="Fortschritt Vorgangsanlage"
        className="hidden md:flex items-center justify-center gap-0 mb-8"
      >
        {steps.map((step, i) => {
          const stepNum = i + 1;
          const isCurrent = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;
          const isFuture = stepNum > currentStep;

          return (
            <div key={step.id} className="flex items-center">
              {i > 0 && (
                <div
                  className={cn(
                    "h-0.5 w-12 lg:w-20",
                    isCompleted || isCurrent ? "bg-primary" : "bg-muted"
                  )}
                  aria-hidden="true"
                />
              )}
              <button
                type="button"
                onClick={() => isCompleted && onStepClick(stepNum)}
                disabled={isFuture}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[36px]",
                  isCurrent && "bg-primary text-primary-foreground",
                  isCompleted && "bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer",
                  isFuture && "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <Badge
                  variant="outline"
                  className={cn(
                    "h-6 w-6 p-0 flex items-center justify-center text-xs border-0",
                    isCurrent && "bg-primary-foreground text-primary",
                    isCompleted && "bg-primary text-primary-foreground",
                    isFuture && "bg-muted-foreground/20 text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    stepNum
                  )}
                </Badge>
                <span className="hidden lg:inline">{step.shortLabel}</span>
              </button>
            </div>
          );
        })}
      </nav>

      {/* Mobile Progress */}
      <div className="md:hidden mb-6 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Schritt {currentStep} von {totalSteps}
          </span>
          <span className="text-muted-foreground">
            {steps[currentStep - 1]?.shortLabel}
          </span>
        </div>
        <Progress
          value={progressPercent}
          className="h-2"
          aria-label={`Schritt ${currentStep} von ${totalSteps}`}
        />
      </div>
    </>
  );
}
