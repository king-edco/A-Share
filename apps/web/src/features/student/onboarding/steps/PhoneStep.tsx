import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnboardingStore } from "../store";

const phoneSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, "Ton numéro de téléphone est requis")
    .regex(
      /^(\+?237|0)?[1678]\d{8}$/,
      "Numéro camerounais attendu (ex. 670000000 ou +237670000000)",
    ),
});

type PhoneValues = z.infer<typeof phoneSchema>;

function formatCameroonian(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  const local = digits.startsWith("237")
    ? digits.slice(3)
    : digits.startsWith("0")
      ? digits.slice(1)
      : digits;
  return `+237 ${local.slice(0, 3)} ${local.slice(3, 5)} ${local.slice(5, 7)} ${local.slice(7)}`;
}

export function PhoneStep({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { data, set } = useOnboardingStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [candidate, setCandidate] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<PhoneValues>({
    resolver: zodResolver(phoneSchema),
    mode: "onChange",
    defaultValues: { phoneNumber: data.phoneNumber },
  });

  function onSubmit() {
    setCandidate(getValues("phoneNumber").trim());
    setShowConfirm(true);
  }

  function confirm() {
    set({ phoneNumber: candidate });
    setShowConfirm(false);
    onNext();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Ton numéro de téléphone</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Il te servira à te connecter.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <Label htmlFor="phoneNumber">Numéro de téléphone</Label>
          <Input
            id="phoneNumber"
            inputMode="tel"
            placeholder="Ex. 670000000"
            autoComplete="tel"
            {...register("phoneNumber")}
          />
          {errors.phoneNumber && (
            <p className="mt-1 text-xs text-destructive">
              {errors.phoneNumber.message}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Format accepté : 670000000, 0670000000, ou +237670000000
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} type="button">
            Retour
          </Button>
          <Button type="submit" className="flex-1">
            Continuer
          </Button>
        </div>
      </form>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-xl"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Confirmer ton numéro</h3>
                  <p className="text-sm text-muted-foreground">
                    Ton numéro est-il correct ?
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-lg border bg-muted/30 px-4 py-3 text-center">
                <p className="text-lg font-semibold tracking-wide">
                  {formatCameroonian(candidate)}
                </p>
              </div>
              <div className="mt-6 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowConfirm(false)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
                <Button className="flex-1" onClick={confirm}>
                  Confirmer
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
