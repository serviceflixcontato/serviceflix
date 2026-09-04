import { Link } from "@tanstack/react-router";
import { Mail, Phone } from "lucide-react";

import logo from "@/assets/serviceflix-logo-amarelo.png.asset.json";
import { CONTACT } from "@/lib/plans";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-ink text-ink-foreground">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <img src={logo.url} alt="Service Flix" className="h-10 w-auto object-contain" />
          </div>
          <p className="mt-3 text-sm text-ink-foreground/70">
            Serviços com flexibilidade. Manutenção predial por assinatura para residências e
            condomínios.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Navegação</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-foreground/75">
            <li>
              <Link to="/" className="hover:text-primary">
                Início
              </Link>
            </li>
            <li>
              <Link to="/planos" className="hover:text-primary">
                Planos
              </Link>
            </li>
            <li>
              <Link to="/contato" className="hover:text-primary">
                Solicitar contato
              </Link>
            </li>
            <li>
              <Link to="/auth" className="hover:text-primary">
                Área do cliente
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Serviços</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-foreground/75">
            <li>Manutenção preventiva</li>
            <li>Reparos hidráulicos e elétricos</li>
            <li>Reparos de pintura</li>
            <li>Reformas por contrato</li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Contato</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-foreground/75">
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" /> {CONTACT.whatsappLabel}
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" /> {CONTACT.email}
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-foreground/10 py-5 text-center text-xs text-ink-foreground/60">
        © {new Date().getFullYear()} Service Flix — Serviços com flexibilidade.
        <span className="mx-2 text-ink-foreground/30">|</span>
        <Link to="/admin" className="text-[10px] text-ink-foreground/40 hover:text-primary">
          Acesso administrativo
        </Link>
      </div>
    </footer>
  );
}
