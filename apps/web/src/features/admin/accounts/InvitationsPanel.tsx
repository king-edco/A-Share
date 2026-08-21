import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvitationsQuery } from "../adminAccounts";

const STATUS_VARIANT = {
  pending: "default" as const,
  accepted: "secondary" as const,
  expired: "outline" as const,
};

export function InvitationsPanel() {
  const invitationsQuery = useInvitationsQuery();
  const invitations = invitationsQuery.data ?? [];

  if (invitationsQuery.isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }
  if (invitations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Invitations</h2>
        </CardTitle>
        <CardDescription>Pending and accepted admin invitations.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {invitations.map((inv) => (
            <li key={inv.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium">{inv.email}</p>
                <p className="text-xs text-muted-foreground">
                  {inv.role_code}
                  {inv.system_scope ? ` · ${inv.system_scope}` : ""}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[inv.status]}>
                {inv.status}
              </Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
