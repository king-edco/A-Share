import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { studentApiFetch } from "../../api";
import { useStudentAuth } from "../../auth/student-auth";
import { useOnboardingStore } from "../store";
import { StudentApiError } from "../../api";

const accountSchema = z
  .object({
    phoneNumber: z
      .string()
      .min(1, "Ton numéro de téléphone est requis")
      .regex(
        /^(\+?237|0)?[1678]\d{8}$/,
        "Numéro camerounais attendu (ex. 670000000 ou +237670000000)",
      ),
    pin: z
      .string()
      .regex(/^\d{4,6}$/, "Le code PIN doit faire 4 à 6 chiffres"),
    pinConfirm: z.string(),
  })
  .refine((values) => values.pin === values.pinConfirm, {
    message: "Les deux PIN ne correspondent pas",
    path: ["pinConfirm"],
  });

type AccountValues = z.infer<typeof accountSchema>;

interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

export function AccountStep({ onBack }: { onBack: () => void }) {
  const { data } = useOnboardingStore();
  const { completeRegistration } = useStudentAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    mode: "onChange",
    defaultValues: {
      phoneNumber: data.phoneNumber,
      pin: data.pin,
      pinConfirm: "",
    },
  });

  const pin = watch("pin");
  const pinConfirm = watch("pinConfirm");

  async function onSubmit(values: AccountValues) {
    setError(null);
    setSubmitting(true);
    try {
      const tokens = await studentApiFetch<TokenResponse>(
        "/api/v1/students/register",
        {
          method: "POST",
          body: JSON.stringify({
            phone_number: values.phoneNumber,
            pin: values.pin,
            full_name: data.fullName,
            school: data.school || null,
            city: data.city || null,
            exam_id: data.examId,
            series_id: data.seriesId,
            subject_ids: data.subjectIds,
          }),
        },
      );
      await completeRegistration(tokens.access_token, tokens.refresh_token);
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err instanceof StudentApiError
          ? err.message
          : "Une erreur est survenue. Réessaie dans un instant.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Crée ton compte</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ton numéro + un PIN, c'est tout.
        </p>
      </div>

      <div className="rounded-xl border bg-muted/30 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Récapitulatif
        </p>
        <dl className="mt-2 space-y-1.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Examen</dt>
            <dd className="font-medium">{data.examName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Série</dt>
            <dd className="font-medium">{data.seriesLabel}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Matières</dt>
            <dd className="text-right font-medium">
              {data.subjectIds.length} sélectionnée{data.subjectIds.length > 1 ? "s" : ""}
            </dd>
          </div>
        </dl>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pin">PIN (4-6 chiffres)</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              autoComplete="new-password"
              {...register("pin")}
            />
            {errors.pin && (
              <p className="mt-1 text-xs text-destructive">{errors.pin.message}</p>
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
          <Button
            type="submit"
            className="flex-1"
            disabled={submitting || !pin || !pinConfirm}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création…
              </>
            ) : (
              "Créer mon compte"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
