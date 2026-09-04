import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Loader2, LogOut, Settings, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import logo from "@/assets/serviceflix-logo-amarelo.png.asset.json";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_NAV = [
  { to: "/admin/painel", label: "Visão geral", icon: LayoutDashboard },
  { to: "/admin/pagamentos", label: "Config. pagamento", icon: Settings },
] as const;

/** Layout exclusivo do administrador do site (login separado do painel do cliente). */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"checking" | "ok">("checking");

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        if (active) void navigate({ to: "/admin", replace: true });
        return;
      }
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: userData.user.id,
        _role: "admin",
      });
      if (!active) return;
      if (!isAdmin) {
        void navigate({ to: "/admin", replace: true });
        return;
      }
      setStatus("ok");
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/admin", replace: true });
  }

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-40 border-b border-border bg-ink text-ink-foreground">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
          <Link to="/admin/painel" className="flex items-center gap-2">
            <img src={logo.url} alt="Service Flix" className="h-9 w-auto object-contain" />
            <span className="font-display text-base font-semibold">
              Service<span className="text-primary">Flix</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-xs uppercase tracking-wider text-ink-foreground/70 sm:flex">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Administrador
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-ink-foreground hover:bg-ink-foreground/10 hover:text-primary"
            >
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <nav className="mb-6 flex gap-2 overflow-x-auto rounded-xl border border-border bg-card p-2 shadow-card">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: "bg-accent text-accent-foreground" }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {children}
      </div>
    </div>
  );
}
