import { Link, Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  CreditCard,
  FileSignature,
  FileText,
  Gift,
  Headset,
  LayoutDashboard,
  LogOut,
  UserCog,
} from "lucide-react";

import logo from "@/assets/serviceflix-logo-amarelo.png.asset.json";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSubscriptions } from "@/hooks/use-panel-data";

export const Route = createFileRoute("/_authenticated/painel")({
  component: PainelLayout,
});

const NAV = [
  { to: "/painel", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/painel/cadastro", label: "Meus dados", icon: UserCog, exact: false },
  { to: "/painel/solicitacoes", label: "Solicitações", icon: ClipboardList, exact: false },
  { to: "/painel/contrato", label: "Contrato", icon: FileText, exact: false },
  { to: "/painel/contratar", label: "Contratar plano", icon: FileSignature, exact: false },
  { to: "/painel/pagamentos", label: "Pagamentos", icon: CreditCard, exact: false },
  { to: "/painel/indicacoes", label: "Indique e ganhe", icon: Gift, exact: false },
  { to: "/painel/contato", label: "Contato", icon: Headset, exact: false },
] as const;

const ACTIVE_ONLY = ["/painel/solicitacoes"];

function PainelLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { data: subscriptions = [] } = useSubscriptions();
  const hasActive = subscriptions.some((subscription) => subscription.status === "ativa");
  const navItems = NAV.filter((item) => hasActive || !ACTIVE_ONLY.includes(item.to));

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }


  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo.url} alt="Service Flix" className="h-9 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[180px] truncate text-sm text-muted-foreground sm:block">
              {profile?.full_name ?? profile?.email ?? "Minha conta"}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <nav className="mb-6 flex gap-2 overflow-x-auto rounded-xl border border-border bg-card p-2 shadow-card">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: "bg-accent text-accent-foreground" }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <Outlet />
      </div>
    </div>
  );
}
