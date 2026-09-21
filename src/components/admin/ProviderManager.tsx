import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Pencil, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { deleteProvider, listProviders, saveProvider } from "@/lib/providers.functions";
import {
  PROVIDER_ROLES,
  providerRoleLabel,
  signProviderPhotos,
  uploadProviderPhoto,
} from "@/lib/providers";

export type Provider = {
  id: string;
  full_name: string;
  role: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  cpf: string | null;
  document_notes: string | null;
  photo_url: string | null;
  active: boolean;
};

/** Cadastro de prestadores + links temporários das fotos. */
export function useProviders() {
  const list = useServerFn(listProviders);
  return useQuery({
    queryKey: ["admin-providers"],
    queryFn: async () => {
      const result = await list();
      const providers = (result.providers ?? []) as Provider[];
      const urls = await signProviderPhotos(
        providers.map((provider) => provider.photo_url ?? "").filter(Boolean),
      );
      return providers.map((provider) => ({
        ...provider,
        photoSignedUrl: provider.photo_url ? (urls.get(provider.photo_url) ?? null) : null,
      }));
    },
  });
}

const EMPTY = {
  id: undefined as string | undefined,
  full_name: "",
  role: "encanador",
  phone: "",
  email: "",
  address: "",
  cpf: "",
  document_notes: "",
  photo_url: "" as string,
  active: true,
};

export function ProviderManager() {
  const queryClient = useQueryClient();
  const providersQuery = useProviders();
  const saveFn = useServerFn(saveProvider);
  const deleteFn = useServerFn(deleteProvider);

  const [form, setForm] = useState({ ...EMPTY });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let photoPath = form.photo_url || null;
      if (file) {
        setUploading(true);
        photoPath = await uploadProviderPhoto(file);
      }
      return saveFn({
        data: {
          ...(form.id ? { id: form.id } : {}),
          full_name: form.full_name.trim(),
          role: form.role,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          cpf: form.cpf.trim() || null,
          document_notes: form.document_notes.trim() || null,
          photo_url: photoPath,
          active: form.active,
        } as never,
      });
    },
    onSuccess: () => {
      toast.success("Prestador salvo.");
      setForm({ ...EMPTY });
      setFile(null);
      refresh();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar."),
    onSettled: () => setUploading(false),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Prestador excluído.");
      refresh();
    },
    onError: () => toast.error("Não foi possível excluir."),
  });

  function handleSave() {
    if (form.full_name.trim().length < 2) {
      toast.error("Informe o nome do prestador.");
      return;
    }
    saveMutation.mutate();
  }

  const providers = providersQuery.data ?? [];
  const busy = saveMutation.isPending || uploading;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border p-4">
        <p className="text-sm font-semibold">
          {form.id ? "Editar prestador" : "Novo prestador de serviço"}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Nome completo</Label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              maxLength={120}
              placeholder="Ex.: João da Silva"
            />
          </div>
          <div>
            <Label className="text-xs">Função</Label>
            <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Telefone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              maxLength={40}
              placeholder="(11) 90000-0000"
            />
          </div>
          <div>
            <Label className="text-xs">E-mail</Label>
            <Input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              maxLength={120}
              placeholder="nome@email.com"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Endereço completo</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              maxLength={240}
              placeholder="Rua, número, bairro, cidade/UF"
            />
          </div>
          <div>
            <Label className="text-xs">CPF (só a equipe vê)</Label>
            <Input
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: e.target.value })}
              maxLength={30}
              placeholder="000.000.000-00"
            />
          </div>
          <div>
            <Label className="text-xs">Foto do prestador</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Documentos e observações internas (só a equipe vê)</Label>
            <Textarea
              value={form.document_notes}
              onChange={(e) => setForm({ ...form, document_notes: e.target.value })}
              rows={2}
              maxLength={1000}
              placeholder="RG, CNH, certificações, observações..."
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button type="button" onClick={handleSave} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {form.id ? "Salvar alterações" : "Cadastrar prestador"}
          </Button>
          {form.id ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setForm({ ...EMPTY });
                setFile(null);
              }}
            >
              Cancelar
            </Button>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          O cliente vê apenas a foto, o nome e a função. CPF, documentos e contatos ficam só aqui.
        </p>
      </div>

      {providersQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando prestadores...</p>
      ) : providers.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserRound className="h-4 w-4" /> Nenhum prestador cadastrado ainda.
        </p>
      ) : (
        <ul className="space-y-3">
          {providers.map((provider) => (
            <li
              key={provider.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border p-4"
            >
              <div className="flex gap-3">
                {provider.photoSignedUrl ? (
                  <img
                    src={provider.photoSignedUrl}
                    alt={provider.full_name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <UserRound className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-semibold">{provider.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {providerRoleLabel(provider.role)}
                    {provider.phone ? ` · ${provider.phone}` : ""}
                    {provider.email ? ` · ${provider.email}` : ""}
                  </p>
                  {provider.address ? (
                    <p className="text-xs text-muted-foreground">{provider.address}</p>
                  ) : null}
                  {provider.cpf ? (
                    <p className="text-xs text-muted-foreground">CPF: {provider.cpf}</p>
                  ) : null}
                  {provider.document_notes ? (
                    <p className="mt-1 text-xs text-muted-foreground">{provider.document_notes}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={provider.active ? "default" : "secondary"}>
                  {provider.active ? "Ativo" : "Inativo"}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setForm({
                      id: provider.id,
                      full_name: provider.full_name,
                      role: provider.role,
                      phone: provider.phone ?? "",
                      email: provider.email ?? "",
                      address: provider.address ?? "",
                      cpf: provider.cpf ?? "",
                      document_notes: provider.document_notes ?? "",
                      photo_url: provider.photo_url ?? "",
                      active: provider.active,
                    })
                  }
                >
                  <Pencil className="mr-1 h-3 w-3" /> Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (window.confirm(`Excluir ${provider.full_name}?`)) {
                      deleteMutation.mutate(provider.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
