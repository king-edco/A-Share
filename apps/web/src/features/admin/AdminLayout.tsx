import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BookOpen,
  GitBranch,
  GraduationCap,
  LayoutDashboard,
  ListTree,
  LogOut,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "../auth/auth-context";

/**
 * Protected shell: shadcn Sidebar (icon-collapsible, cookie-persisted) plus
 * a top bar whose right side is an Avatar DropdownMenu carrying the admin's
 * identity and the logout action.
 */

const PLACEHOLDER_ITEMS = [
  { to: "/admin/exams", label: "Exams", icon: GraduationCap },
  { to: "/admin/series", label: "Series", icon: GitBranch },
  { to: "/admin/subjects", label: "Subjects", icon: BookOpen },
  { to: "/admin/chapters", label: "Chapters", icon: ListTree },
] as const;

// The sidebar persists its state in the "sidebar_state" cookie on toggle,
// but only reads it back server-side. In this pure SPA, seed defaultOpen
// from that same cookie so the collapse state survives reloads.
function initialSidebarOpen(): boolean {
  return !document.cookie.includes("sidebar_state=false");
}

function BackendStatus() {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const apiUrl: string = import.meta.env.VITE_API_URL ?? "";
    fetch(`${apiUrl}/health`)
      .then(async (res) => {
        if (cancelled) return;
        const body: unknown = await res.json().catch(() => null);
        setOk(
          res.ok &&
            typeof body === "object" &&
            body !== null &&
            (body as { status?: unknown }).status === "ok",
        );
      })
      .catch(() => {
        if (!cancelled) setOk(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (ok === null) return null;
  return (
    <Badge
      variant="secondary"
      className="hidden items-center gap-1.5 sm:inline-flex"
      title={ok ? "Backend: ok" : "Backend: unreachable"}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500"}`}
      />
      {ok ? "API" : "API down"}
    </Badge>
  );
}

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const initial = admin?.email.slice(0, 1).toUpperCase() ?? "?";

  function handleLogout() {
    logout();
    // logout() already navigates; this is a defensive fallback.
    navigate("/login", { replace: true });
  }

  return (
    <SidebarProvider defaultOpen={initialSidebarOpen()}>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2.5 px-1 py-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/15">
              <span className="text-sm font-bold text-sky-500">A</span>
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold">A-Share</span>
              <span className="text-xs text-muted-foreground">
                Admin console
              </span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Dashboard">
                  <NavLink to="/admin/dashboard">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {PLACEHOLDER_ITEMS.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild tooltip={item.label}>
                    <NavLink to={item.to}>
                      <item.icon />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>
                    <Badge
                      variant="outline"
                      className="bg-amber-500/10 text-[10px] uppercase tracking-wide text-amber-600"
                    >
                      Soon
                    </Badge>
                  </SidebarMenuBadge>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <p className="px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            Exam-prep platform · Cameroon
          </p>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger />
          <BackendStatus />
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="User menu"
                  className="rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium">{admin?.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {admin?.roles.map((role) => (
                      <span
                        key={role.code}
                        className="inline-flex items-center gap-1.5"
                      >
                        <Badge variant="secondary" className="text-[10px]">
                          {role.code}
                        </Badge>
                        <Badge className="text-[10px] uppercase">
                          {role.system_scope}
                        </Badge>
                      </span>
                    ))}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
