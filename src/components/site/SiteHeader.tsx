import { Link } from "@tanstack/react-router";
import { Mail, Menu, Phone, X } from "lucide-react";
import { useEffect, useState } from "react";

import logo from "@/assets/serviceflix-logo-amarelo.png.asset.json";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CONTACT, whatsappLink } from "@/lib/plans";

const NAV = [
  { to: "/", label: "Início" },
  { to: "/planos", label: "Planos" },
  { to: "/contato", label: "Contato" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="bg-ink text-ink-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <a href={whatsappLink("Olá! Gostaria de falar com a Service Flix.")} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-primary">
              <Phone className="h-3.5 w-3.5 text-primary" /> {CONTACT.whatsappLabel}
            </a>
            <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-1.5 hover:text-primary">
              <Mail className="h-3.5 w-3.5 text-primary" /> {CONTACT.email}
            </a>
          </div>
          <span className="uppercase tracking-[0.18em] text-ink-foreground/70">
            Serviços com flexibilidade
          </span>
        </div>
      </div>

      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo.url} alt="Service Flix" className="h-10 w-auto object-contain" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link to={signedIn ? "/painel" : "/auth"}>
              {signedIn ? "Meu painel" : "Entrar"}
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/contato">Quero um plano</Link>
          </Button>
        </div>

        <button
          type="button"
          aria-label="Abrir menu"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex w-full max-w-6xl flex-col p-4">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <Link
              to={signedIn ? "/painel" : "/auth"}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {signedIn ? "Meu painel" : "Entrar / Cadastrar"}
            </Link>
            <Button asChild className="mt-2">
              <Link to="/contato" onClick={() => setOpen(false)}>
                Quero um plano
              </Link>
            </Button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
