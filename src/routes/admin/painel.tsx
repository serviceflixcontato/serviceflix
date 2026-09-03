import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/admin/AdminShell";
import { AdminOverview } from "@/components/admin/AdminOverview";

export const Route = createFileRoute("/admin/painel")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel do administrador — Service Flix" },
      {
        name: "description",
        content:
          "Gestão interna Service Flix: clientes, assinaturas, pagamentos, ordens de serviço e indicações.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Painel do administrador — Service Flix" },
      { property: "og:description", content: "Área restrita da equipe Service Flix." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminShell>
      <AdminOverview />
    </AdminShell>
  ),
});
