"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Download } from "lucide-react";

type Result = {
  contratosCriados: number;
  contratosAtualizados: number;
  linhasIgnoradas: number;
  linhasLidas: number;
  erros: string[];
};

export function ImportacaoContratosClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canSubmit = Boolean(file);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      if (file) formData.set("file", file);
      const res = await fetch("/api/importacao/contratos", {
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
          contratosCriados: 0,
          contratosAtualizados: 0,
          linhasIgnoradas: 0,
          linhasLidas: 0,
          erros: [data.message ?? "Erro ao importar"],
        });
      }
    } catch {
      setResult({
        contratosCriados: 0,
        contratosAtualizados: 0,
        linhasIgnoradas: 0,
        linhasLidas: 0,
        erros: ["Falha na requisição"],
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar contratos (formato padrão)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Baixe o template e preencha a aba <strong>CONTRATOS</strong>. A chave para atualização é o
          campo <strong>numero_contrato</strong> (se já existir, atualiza; se não existir, cria).
        </p>
        <div className="pt-2">
          <Button variant="outline" asChild>
            <a href="/api/importacao/contratos/template">
              <Download className="mr-2 h-4 w-4" />
              Baixar template XLSX
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Arquivo .xlsx / .xls</Label>
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
            {loading ? "Importando..." : "Importar contratos"}
          </Button>
        </form>

        {result && (
          <div className="rounded-lg border p-4 space-y-2">
            <p className="font-medium">Resumo da importação</p>
            <ul className="text-sm text-muted-foreground">
              <li>Linhas lidas: {result.linhasLidas}</li>
              <li>Contratos criados: {result.contratosCriados}</li>
              <li>Contratos atualizados: {result.contratosAtualizados}</li>
              <li>Linhas ignoradas: {result.linhasIgnoradas}</li>
            </ul>
            {result.erros.length > 0 && (
              <ul className="text-sm text-destructive">
                {result.erros.slice(0, 50).map((err, i) => (
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

