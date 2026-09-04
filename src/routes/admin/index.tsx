import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import logo from "@/assets/serviceflix-logo-amarelo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { adminSignIn } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Acesso administrativo — Service Flix" },
      {
        name: "description",
        content:
          "Área restrita da equipe Service Flix para gestão de clientes, assinaturas, ordens de serviço e indicações.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Acesso administrativo — Service Flix" },
      {
        property: "og:description",
        content: "Área restrita da equipe Service Flix.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const signIn = useServerFn(adminSignIn);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!username || !password) {
      toast.error("Informe usuário e senha.");
      return;
    }
    setLoading(true);
    try {
      const result = await signIn({ data: { username, password } });
      if (!result.ok) {
        toast.error("Usuário ou senha incorretos.");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: result.email,
        password: result.authPassword,
      });
      if (error) {
        toast.error("Não foi possível entrar. Tente novamente.");
        return;
      }
      void navigate({ to: "/admin/painel", replace: true });
    } catch {
      toast.error("Falha ao acessar o painel administrativo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink text-ink-foreground">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
        <Link to="/" className="mx-auto flex items-center gap-2">
          <img src={logo.url} alt="Service Flix" className="h-11 w-auto object-contain" />
        </Link>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-elevated">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Área restrita
          </span>
          <h1 className="mt-4 text-2xl font-bold">Acesso administrativo</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre com o usuário e a senha da equipe Service Flix.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-user">Usuário</Label>
              <Input id="admin-user" name="username" required autoComplete="username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-pass">Senha</Label>
              <Input
                id="admin-pass"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Entrar no painel
            </Button>
          </form>
        </div>

        <Link to="/" className="mt-6 text-center text-sm text-ink-foreground/70 hover:text-primary">
          Voltar ao site
        </Link>
      </div>
    </div>
  );
}
