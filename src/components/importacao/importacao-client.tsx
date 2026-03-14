"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload } from "lucide-react";

type Contrato = { id: string; nome: string };

export function ImportacaoClient({ contratos }: { contratos: Contrato[] }) {
  const router = useRouter();
  const [contratoId, setContratoId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    itensCriados: number;
    itensAtualizados: number;
    avaliacoesCriadas: number;
    linhasIgnoradas: number;
    linhasLidas?: number;
    abasProcessadas?: number;
    erros: string[];
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canSubmit = contratoId && (file || (url && url.trim().length > 0));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.set("contratoId", contratoId);
      if (file) formData.set("file", file);
      if (url && url.trim()) formData.set("url", url.trim());
      const res = await fetch("/api/importacao", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setFile(null);
        setUrl("");
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      } else {
        setResult({
          itensCriados: 0,
          itensAtualizados: 0,
          avaliacoesCriadas: 0,
          linhasIgnoradas: 0,
          erros: [data.message ?? "Erro ao importar"],
        });
      }
    } catch {
      setResult({
        itensCriados: 0,
        itensAtualizados: 0,
        avaliacoesCriadas: 0,
        linhasIgnoradas: 0,
        erros: ["Falha na requisição"],
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enviar planilha</CardTitle>
        <p className="text-sm text-muted-foreground">
          Envie um arquivo .xlsx/.xls ou informe a URL da planilha. Colunas: ID ou Item, Descrição (obrigatório),
          Observação; opcional: <strong>Atende?</strong> (Sim/Não, Atendido/Não atendido, 1/0) — define se o item foi
          atendido e grava no banco; Módulo, Lote, Conforme Contrato EddyData, Cabeçalho. Cada linha vira um item.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Contrato de destino</Label>
            <Select value={contratoId} onValueChange={setContratoId}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Selecione o contrato" />
              </SelectTrigger>
              <SelectContent>
                {contratos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>URL da planilha (opcional)</Label>
            <input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex h-9 w-full max-w-md rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
            />
          </div>
          <div className="space-y-2">
            <Label>Ou arquivo .xlsx / .xls</Label>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full max-w-md text-sm"
            />
          </div>
          <Button type="submit" disabled={!canSubmit || loading}>
            <Upload className="mr-2 h-4 w-4" />
            {loading ? "Importando..." : "Importar"}
          </Button>
        </form>

        {result && (
          <div className="rounded-lg border p-4 space-y-2">
            <p className="font-medium">Resumo da importação</p>
            <ul className="text-sm text-muted-foreground">
              {result.linhasLidas != null && (
                <li>Linhas lidas da planilha: {result.linhasLidas} {result.abasProcessadas != null && result.abasProcessadas > 1 ? `(${result.abasProcessadas} abas)` : ""}</li>
              )}
              <li>Itens criados: {result.itensCriados}</li>
              <li>Itens atualizados: {result.itensAtualizados}</li>
              <li>Avaliações criadas: {result.avaliacoesCriadas}</li>
              <li>Linhas ignoradas: {result.linhasIgnoradas}</li>
            </ul>
            {result.erros.length > 0 && (
              <ul className="text-sm text-destructive">
                {result.erros.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
