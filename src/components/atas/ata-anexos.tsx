"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Paperclip, Upload } from "lucide-react";

type Anexo = {
  id: string;
  nomeOriginal: string;
  nomeArquivo: string;
  mimeType: string;
  tamanhoBytes: number;
  urlArquivo: string | null;
  tipoAnexo: string;
};

export function AtaAnexos({
  ataId,
  anexosIniciais,
}: {
  ataId: string;
  anexosIniciais: Anexo[];
}) {
  const router = useRouter();
  const [anexos, setAnexos] = useState<Anexo[]>(anexosIniciais);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input?.files?.length) {
      setError("Selecione um arquivo.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", input.files[0]);
      const res = await fetch(`/api/atas/${ataId}/anexos`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setAnexos((prev) => [...prev, data]);
        input.value = "";
        router.refresh();
      } else {
        setError(data.message ?? "Erro ao enviar anexo.");
      }
    } finally {
      setUploading(false);
    }
  }

  function formatBytes(n: number) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Anexos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleUpload} className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="ata-file">Novo arquivo</Label>
            <Input id="ata-file" type="file" className="max-w-xs" disabled={uploading} />
          </div>
          <Button type="submit" disabled={uploading}>
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Enviando…" : "Enviar"}
          </Button>
        </form>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {anexos.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum anexo. Envie arquivos usando o formulário acima.
          </p>
        ) : (
          <ul className="space-y-2">
            {anexos.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded border p-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{a.nomeOriginal}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatBytes(a.tamanhoBytes)} • {a.tipoAnexo}
                  </span>
                </div>
                {a.urlArquivo && (
                  <a
                    href={a.urlArquivo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-sm hover:underline shrink-0"
                  >
                    Baixar
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
