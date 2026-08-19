import { BookOpen, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "../auth/auth-context";

const SCOPE_HINTS: Record<string, string> = {
  FR: "Francophone exams (Bac, Probatoire, TVE)",
  EN: "Anglophone exams (GCE A Level, GCE O Level)",
  BOTH: "All exam systems",
};

export default function DashboardPage() {
  const { admin } = useAuth();
  if (!admin) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>Welcome back</h1>
          </CardTitle>
          <CardDescription>
            Signed in as <span className="font-medium">{admin.email}</span>
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            <h2>Your roles</h2>
          </CardTitle>
          <CardDescription>
            Granted permissions and their exam-system scope
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-0">
            {admin.roles.map((role) => (
              <li key={role.code}>
                <div className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{role.label}</p>
                    <p className="text-xs text-muted-foreground">{role.code}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">
                      <ShieldCheck className="mr-1 h-3 w-3" />
                      {role.system_scope}
                    </Badge>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {SCOPE_HINTS[role.system_scope] ?? "Exam system scope"}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">
            <h2>Content management is on its way</h2>
          </CardTitle>
          <CardDescription className="flex items-start gap-2">
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0" />
            Exam, series, subject, and chapter management screens will appear
            in the sidebar soon. They are visible there today as disabled
            previews.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
