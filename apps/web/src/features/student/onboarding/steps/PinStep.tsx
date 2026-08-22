import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnboardingStore } from "../store";

const pinSchema = z
  .object({
    pin: z.string().regex(/^\d{4,6}$/, "Le code PIN doit faire 4 à 6 chiffres"),
    pinConfirm: z.string(),
  })
  .refine((values) => values.pin === values.pinConfirm, {
    message: "Les deux PIN ne correspondent pas",
    path: ["pinConfirm"],
  });

type PinValues = z.infer<typeof pinSchema>;

export function PinStep({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { data, set } = useOnboardingStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<PinValues>({
    resolver: zodResolver(pinSchema),
    mode: "onChange",
    defaultValues: { pin: data.pin, pinConfirm: data.pin },
  });

  const pin = watch("pin") ?? "";
  const pinConfirm = watch("pinConfirm") ?? "";
  const canContinue = pin === pinConfirm && /^\d{4,6}$/.test(pin);

  function onSubmit(values: PinValues) {
    set({ pin: values.pin });
    onNext();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Crée ton PIN</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          4 à 6 chiffres, pour sécuriser ton compte.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pin">PIN</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              autoComplete="new-password"
              {...register("pin")}
            />
            {errors.pin && (
              <p className="mt-1 text-xs text-destructive">
                {errors.pin.message}
            </p>
          )}
          </div>
          <div>
            <Label htmlFor="pinConfirm">Confirme le PIN</Label>
            <Input
              id="pinConfirm"
              type="password"
              inputMode="numeric"
              maxLength={6}
              autoComplete="new-password"
              {...register("pinConfirm")}
            />
            {errors.pinConfirm && (
              <p className="mt-1 text-xs text-destructive">
                {errors.pinConfirm.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} type="button">
            Retour
          </Button>
          <Button type="submit" className="flex-1" disabled={!canContinue}>
            Continuer
          </Button>
        </div>
      </form>
    </div>
  );
}
