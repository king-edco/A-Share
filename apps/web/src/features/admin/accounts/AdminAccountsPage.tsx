import { useState } from "react";
import { Plus, Users } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminsQuery, useToggleAdmin } from "../adminAccounts";
import { InviteDialog } from "./InviteDialog";
import { InvitationsPanel } from "./InvitationsPanel";

export default function AdminAccountsPage() {
  const adminsQuery = useAdminsQuery();
  const toggleAdmin = useToggleAdmin();
  const [inviteOpen, setInviteOpen] = useState(false);

  const admins = adminsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Admin accounts</h1>
          <p className="text-sm text-muted-foreground">
            Invite admins and manage their access.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Invite admin
        </Button>
      </div>

      {adminsQuery.isLoading && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Subjects</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableSkeleton columns={5} />
            </TableBody>
          </Table>
        </div>
      )}

      {adminsQuery.isError && (
        <ErrorState
          message="Admin accounts could not be loaded."
          onRetry={() => void adminsQuery.refetch()}
        />
      )}

      {adminsQuery.isSuccess && admins.length === 0 && (
        <EmptyState
          icon={Users}
          title="No admins yet"
          description="Invite the first admin account."
          action={{ label: "Invite an admin", onClick: () => setInviteOpen(true) }}
        />
      )}

      {adminsQuery.isSuccess && admins.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Subjects</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">{admin.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {admin.roles.map((r) => (
                        <Badge key={r.role_code} variant="secondary" className="text-[10px]">
                          {r.role_code} · {r.system_scope}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {admin.subject_grants.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {admin.subject_grants.map((g) => (
                          <Badge key={g.subject_id} variant="outline" className="text-[10px]">
                            {g.subject_name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={admin.is_active ? "default" : "secondary"}>
                      {admin.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toggleAdmin.mutate({
                          id: admin.id,
                          is_active: !admin.is_active,
                        })
                      }
                      disabled={toggleAdmin.isPending}
                    >
                      {admin.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <InvitationsPanel />

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
