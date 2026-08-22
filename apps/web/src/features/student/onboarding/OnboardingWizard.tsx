import { useState } from "react";
import { Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import { useStudentAuth } from "../auth/student-auth";
import { WelcomeStep } from "./steps/WelcomeStep";
import { ProfileStep } from "./steps/ProfileStep";
import { ExamStep } from "./steps/ExamStep";
import { SeriesStep } from "./steps/SeriesStep";
import { SubjectsStep } from "./steps/SubjectsStep";
import { PhoneStep } from "./steps/PhoneStep";
import { PinStep } from "./steps/PinStep";
import { RecapStep } from "./steps/RecapStep";

const STEP_COUNT = 8;

export default function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const { student, status } = useStudentAuth();

  // An authenticated student goes straight to the app shell, not onboarding.
  if (status === "authenticated" && student) {
    return <Navigate to="/" replace />;
  }

  function next() {
    setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }
  function skipToProfile() {
    setStep(1);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-8">
      <header className="mx-auto w-full max-w-lg">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 ring-1 ring-sky-400/40">
              <span className="text-base font-bold text-sky-500">A</span>
            </div>
            <span className="text-sm font-semibold">A-Share</span>
          </div>
          {step > 0 && (
            <span className="text-xs font-medium text-muted-foreground">
              Étape {step + 1} sur {STEP_COUNT}
            </span>
          )}
        </div>
        {step > 0 && (
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(step / (STEP_COUNT - 1)) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 items-center py-8">
        <AnimatePresence mode="sync">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full"
          >
            {step === 0 && (
              <WelcomeStep onNext={next} onSkip={skipToProfile} />
            )}
            {step === 1 && <ProfileStep onNext={next} />}
            {step === 2 && <ExamStep onNext={next} onBack={back} />}
            {step === 3 && <SeriesStep onNext={next} onBack={back} />}
            {step === 4 && <SubjectsStep onNext={next} onBack={back} />}
            {step === 5 && <PhoneStep onNext={next} onBack={back} />}
            {step === 6 && <PinStep onNext={next} onBack={back} />}
            {step === 7 && <RecapStep onBack={back} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
