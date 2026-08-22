import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  studentApiFetch,
  StudentApiError,
} from "../../api";
import { useStudentAuth } from "../../auth/student-auth";
import { useOnboardingStore } from "../store";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

function friendlyErrorMessage(err: unknown): string {
  if (err instanceof StudentApiError) {
    if (err.status === 409) {
      return "Ce numéro est déjà associé à un compte.";
    }
    if (err.status === 400) {
      return "Vérifie le nombre de matières sélectionnées.";
    }
    return "Impossible de créer ton compte pour le moment. Vérifie ta connexion et réessaie.";
  }
  return "Une erreur est survenue. Réessaie dans quelques instants.";
}

export function RecapStep({ onBack }: { onBack: () => void }) {
  const { data, reset } = useOnboardingStore();
  const { completeRegistration } = useStudentAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function onRegister() {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const tokens = await studentApiFetch<TokenResponse>(
        "/api/v1/students/register",
        {
          method: "POST",
          body: JSON.stringify({
            phone_number: data.phoneNumber,
            pin: data.pin,
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
      // The PIN lives only in wizard state; reset so it cannot linger.
      reset();
      navigate("/", { replace: true });
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Vérifie et confirme</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ta création de compte est prête.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Profil
          </p>
          <p className="mt-1 text-sm font-medium">{data.fullName}</p>
          {(data.school || data.city) && (
            <p className="text-sm text-muted-foreground">
              {[data.school, data.city].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <Separator />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Examen
          </p>
          <p className="mt-1 text-sm font-medium">{data.examName}</p>
        </div>
        <Separator />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Série
          </p>
          <p className="mt-1 text-sm font-medium">{data.seriesLabel}</p>
        </div>
        <Separator />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Matières
          </p>
          <p className="mt-1 text-sm font-medium">
            {data.subjectNames.join(", ") || "—"}
          </p>
        </div>
        <Separator />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Numéro
          </p>
          <p className="mt-1 text-sm font-medium">{data.phoneNumber}</p>
        </div>
      </div>

      <div className="flex items-start justify-between gap-4">
        <Button variant="outline" onClick={onBack} type="button">
          Modifier
        </Button>
        <Button onClick={onRegister} className="flex-1" disabled={submitting}>
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

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
