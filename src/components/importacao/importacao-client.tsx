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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    itensCriados: number;
    itensAtualizados: number;
    avaliacoesCriadas: number;
    linhasIgnoradas: number;
    erros: string[];
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !contratoId) return;
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("contratoId", contratoId);
      const res = await fetch("/api/importacao", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setFile(null);
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
          Estrutura esperada: colunas Módulo, Lote, Item, Descrição, Atende?, colunas
          Consolidado (ex.: Consolidado 22/05), Observação. Itens com mesmo
          contrato + módulo + número serão atualizados.
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
            <Label>Arquivo .xlsx</Label>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full max-w-md text-sm"
            />
          </div>
          <Button type="submit" disabled={!contratoId || !file || loading}>
            <Upload className="mr-2 h-4 w-4" />
            {loading ? "Importando..." : "Importar"}
          </Button>
        </form>

        {result && (
          <div className="rounded-lg border p-4 space-y-2">
            <p className="font-medium">Resumo da importação</p>
            <ul className="text-sm text-muted-foreground">
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
