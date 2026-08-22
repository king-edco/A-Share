import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnboardingStore } from "../store";

const profileSchema = z.object({
  fullName: z.string().min(1, "Ton nom complet est requis"),
  school: z.string().optional(),
  city: z.string().optional(),
});

type ProfileValues = z.infer<typeof profileSchema>;

export function ProfileStep({ onNext }: { onNext: () => void }) {
  const { data, set } = useOnboardingStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
    defaultValues: {
      fullName: data.fullName,
      school: data.school,
      city: data.city,
    },
  });

  const fullName = watch("fullName") ?? "";

  function onSubmit(values: ProfileValues) {
    set({
      fullName: values.fullName.trim(),
      school: values.school?.trim() ?? "",
      city: values.city?.trim() ?? "",
    });
    onNext();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Parle-moi de toi</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Juste ce qu'il faut pour personnaliser ton expérience.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <Label htmlFor="fullName">Nom complet</Label>
          <Input
            id="fullName"
            placeholder="Ex. Ngo Moua Aïcha"
            autoComplete="name"
            {...register("fullName")}
          />
          {errors.fullName && (
            <p className="mt-1 text-xs text-destructive">
              {errors.fullName.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="school">École (facultatif)</Label>
          <Input
            id="school"
            placeholder="Ex. Lycée de Yaoundé"
            {...register("school")}
          />
        </div>
        <div>
          <Label htmlFor="city">Ville (facultatif)</Label>
          <Input
            id="city"
            placeholder="Ex. Yaoundé"
            {...register("city")}
          />
        </div>
        <Button type="submit" className="w-full" disabled={!fullName.trim()}>
          Continuer
        </Button>
      </form>
    </div>
  );
}
