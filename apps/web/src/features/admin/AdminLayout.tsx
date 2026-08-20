import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BookOpen,
  GitBranch,
  GraduationCap,
  LayoutDashboard,
  ListTree,
  LogOut,
  Moon,
  Sun,
  UserCog,
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { applyTheme, getInitialTheme, type Theme } from "@/lib/theme";
import { APP_VERSION } from "@/lib/version";
import { useAuth } from "../auth/auth-context";
import { roleKind } from "../auth/roles";

/**
 * Protected shell: role-adaptive shadcn Sidebar (only the items the role
 * grants are rendered), a top bar with a theme toggle and an avatar
 * DropdownMenu carrying the admin's identity, profile summary, and logout.
 */

const CATALOG_ITEMS = [
  { to: "/admin/exams", label: "Exams", icon: GraduationCap },
  { to: "/admin/series", label: "Series", icon: GitBranch },
  { to: "/admin/subjects", label: "Subjects", icon: BookOpen },
  { to: "/admin/chapters", label: "Chapters", icon: ListTree },
] as const;

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

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function scopeHint(admin: ReturnType<typeof useAuth>["admin"]): string {
  const kind = roleKind(admin);
  if (kind === "super_admin") return "Full platform access";
  if (kind === "contributor") {
    const n = admin?.subject_grants.length ?? 0;
    return `${n} subject${n === 1 ? "" : "s"} assigned`;
  }
  const scope = admin?.roles.find((r) => r.code === "content_manager")?.system_scope;
  if (scope === "BOTH") return "All exam systems";
  if (scope === "FR") return "Francophone exams only";
  if (scope === "EN") return "Anglophone exams only";
  return "Exam content access";
}

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const kind = roleKind(admin);
  const initial = admin?.email.slice(0, 1).toUpperCase() ?? "?";

  function handleLogout() {
    logout();
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
              <span className="text-xs text-muted-foreground">Admin console</span>
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

              {kind === "super_admin" && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Admin accounts">
                    <NavLink to="/admin/accounts">
                      <UserCog />
                      <span>Admin accounts</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {kind !== "contributor" &&
                CATALOG_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild tooltip={item.label}>
                      <NavLink to={item.to}>
                        <item.icon />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

              {kind === "contributor" && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="My subjects">
                    <NavLink to="/admin/dashboard">
                      <BookOpen />
                      <span>My subjects</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            <p>Exam-prep platform · Cameroon</p>
            <p className="mt-1">v{APP_VERSION}</p>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger />
          <BackendStatus />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
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
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{admin?.email}</p>
                      <p className="text-xs text-muted-foreground">{scopeHint(admin)}</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="pb-1 text-xs uppercase tracking-wide text-muted-foreground">
                  Roles
                </DropdownMenuLabel>
                <div className="px-2 pb-2">
                  {admin?.roles.map((role) => (
                    <div
                      key={role.code}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-xs">{role.label}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {role.code} · {role.system_scope}
                      </Badge>
                    </div>
                  ))}
                  {kind === "contributor" && (admin?.subject_grants.length ?? 0) > 0 && (
                    <>
                      <Separator className="my-2" />
                      <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                        Your subjects
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {admin?.subject_grants.map((g) => (
                          <Badge key={g.subject_id} variant="outline" className="text-[10px]">
                            {g.subject_name}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                </div>
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
