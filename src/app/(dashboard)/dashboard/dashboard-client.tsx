"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const STATUS_COLORS = {
  ATENDE: "#22c55e",
  PARCIAL: "#eab308",
  NAO_ATENDE: "#ef4444",
  INCONCLUSIVO: "#94a3b8",
  OUTROS: "#64748b",
};

export function DashboardClient({
  contratos,
  contratoId,
  indicators,
  alertas,
  porModulo,
}: {
  contratos: Array<{ id: string; nome: string }>;
  contratoId: string | undefined;
  alertas: {
    vencendo90Dias: Array<{
      id: string;
      nome: string;
      numeroContrato: string;
      vigenciaFim: string;
    }>;
    ustProximoTeto: Array<{
      id: string;
      nome: string;
      mensagem: string;
      severidade: "aviso" | "critico";
    }>;
  };
  indicators: {
    totalContratos: number;
    totalModulos: number;
    totalItensValidos: number;
    totalAtendidos: number;
    totalParciais: number;
    totalNaoAtendidos: number;
    pendenciasAbertas: number;
    valorAnualTotal: number;
    valorMensalRefTotal: number;
    valorDevidoMes: number;
    valorGlosadoMes: number;
    percentualGeral: number;
  } | null;
  porModulo: Array<{
    nome: string;
    contratoNome?: string;
    totalItens: number;
    atendidos: number;
    percentualAtendimento: number;
    pendenciasAbertas: number;
  }>;
}) {
  const router = useRouter();

  const handleContratoChange = (value: string) => {
    if (value === "__todos__") {
      router.push("/dashboard");
    } else {
      router.push(`/dashboard?contratoId=${encodeURIComponent(value)}`);
    }
  };

  const limparFiltros = () => router.push("/dashboard");
  const temFiltros = !!contratoId;
  const contratoSelecionado = contratoId
    ? contratos.find((c) => c.id === contratoId)?.nome ?? "—"
    : null;

  const temAlertas =
    alertas.vencendo90Dias.length > 0 || alertas.ustProximoTeto.length > 0;

  const blocoAlertas = temAlertas && (
    <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 dark:bg-amber-950/20">
      <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
        Atenção
      </p>
      {alertas.vencendo90Dias.length > 0 && (
        <ul className="space-y-1 text-sm">
          <li className="font-medium text-muted-foreground">
            Vigência nos próximos 90 dias
          </li>
          {alertas.vencendo90Dias.map((v) => (
            <li key={v.id}>
              <Link
                href={`/contratos/${v.id}`}
                className="text-primary underline-offset-2 hover:underline"
              >
                {v.nome}
              </Link>
              {" — "}
              fim {formatDate(v.vigenciaFim)} ({v.numeroContrato})
            </li>
          ))}
        </ul>
      )}
      {alertas.ustProximoTeto.length > 0 && (
        <ul className="space-y-2 text-sm">
          <li className="font-medium text-muted-foreground">
            Limite UST no ano (≥85% ou estourado)
          </li>
          {alertas.ustProximoTeto.map((u) => (
            <li
              key={u.id}
              className={
                u.severidade === "critico"
                  ? "text-destructive font-medium"
                  : ""
              }
            >
              <Link
                href={`/contratos/${u.id}`}
                className="text-primary underline-offset-2 hover:underline"
              >
                {u.nome}
              </Link>
              {": "}
              {u.mensagem}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const filtrosAplicadosBlock = temFiltros && (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3">
      <span className="text-sm font-medium text-muted-foreground">
        Filtros aplicados:
      </span>
      {contratoSelecionado && (
        <Badge
          variant="secondary"
          className="gap-1 pr-1 font-normal"
        >
          Contrato: {contratoSelecionado}
          <button
            type="button"
            onClick={limparFiltros}
            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
            aria-label="Remover filtro de contrato"
          >
            <span className="sr-only">Remover</span>
            <span aria-hidden>×</span>
          </button>
        </Badge>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-muted-foreground"
        onClick={limparFiltros}
      >
        Limpar filtros
      </Button>
    </div>
  );

  if (!indicators) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[200px]">
            <Label className="text-sm">Contrato</Label>
            <Select
              value={contratoId ?? "__todos__"}
              onValueChange={handleContratoChange}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Todos os contratos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__todos__">Todos os contratos</SelectItem>
                {contratos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {filtrosAplicadosBlock}
        {blocoAlertas}
        <div className="rounded-lg border bg-muted/50 p-8 text-center text-muted-foreground">
          Nenhum dado disponível. Cadastre contratos e itens para ver os indicadores.
        </div>
      </div>
    );
  }

  const pieData = [
    { name: "Atende", value: indicators.totalAtendidos, color: STATUS_COLORS.ATENDE },
    { name: "Parcial", value: indicators.totalParciais, color: STATUS_COLORS.PARCIAL },
    { name: "Não atende", value: indicators.totalNaoAtendidos, color: STATUS_COLORS.NAO_ATENDE },
    {
      name: "Outros",
      value:
        indicators.totalItensValidos -
        indicators.totalAtendidos -
        indicators.totalParciais -
        indicators.totalNaoAtendidos,
      color: STATUS_COLORS.OUTROS,
    },
  ].filter((d) => d.value > 0);

  const barData = porModulo.slice(0, 10).map((m) => {
    const label = m.contratoNome
      ? `${m.nome} (${m.contratoNome})`
      : m.nome;
    return {
      name: label.length > 20 ? label.slice(0, 20) + "…" : label,
      percentual: Math.round(m.percentualAtendimento * 100) / 100,
      pendencias: m.pendenciasAbertas,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[200px]">
          <Label className="text-sm">Contrato</Label>
          <Select
            value={contratoId ?? "__todos__"}
            onValueChange={handleContratoChange}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Todos os contratos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos__">Todos os contratos</SelectItem>
              {contratos.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtrosAplicadosBlock}

      {blocoAlertas}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratos ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{indicators.totalContratos}</div>
            <p className="text-xs text-muted-foreground">Módulos: {indicators.totalModulos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Itens válidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{indicators.totalItensValidos}</div>
            <p className="text-xs text-muted-foreground">
              Atendidos: {indicators.totalAtendidos} | Parciais: {indicators.totalParciais} | Não
              atendidos: {indicators.totalNaoAtendidos}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Percentual geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercent(indicators.percentualGeral)}
            </div>
            <p className="text-xs text-muted-foreground">Pendências abertas: {indicators.pendenciasAbertas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valores (mês atual)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(indicators.valorDevidoMes)}</div>
            <p className="text-xs text-muted-foreground">
              Referência: {formatCurrency(indicators.valorMensalRefTotal)} | Glosado:{" "}
              {formatCurrency(indicators.valorGlosadoMes)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por status</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, ""]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sem itens para exibir
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Atendimento por módulo</CardTitle>
          </CardHeader>
          <CardContent>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="percentual" fill="hsl(var(--primary))" name="% Atendimento" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sem módulos para exibir
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
