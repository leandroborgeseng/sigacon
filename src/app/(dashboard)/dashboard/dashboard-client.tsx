"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardUstModal } from "@/components/dashboard/dashboard-ust-modal";
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
  ComposedChart,
  Line,
} from "recharts";
import { ClipboardList } from "lucide-react";

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
  insights,
  alertas,
  porModulo,
  tarefasMes,
  serieTempo,
  glpiResumo,
}: {
  contratos: Array<{ id: string; nome: string }>;
  contratoId: string | undefined;
  insights: {
    competenciaLabel: string;
    semMedicaoNoMes: Array<{ id: string; nome: string }>;
    ustMes: { lancamentos: number; totalUst: number; valor: number };
    carteiraContratos: Array<{ status: string; label: string; count: number }>;
    modulosCriticos: Array<{
      id: string;
      nome: string;
      contratoNome: string;
      percentual: number;
      pendencias: number;
      totalItens: number;
    }>;
  } | null;
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
  tarefasMes: Array<{
    tipo: string;
    titulo: string;
    detalhe: string;
    href: string;
  }>;
  serieTempo: Array<{
    label: string;
    valorDevido: number;
    valorGlosado: number;
    percentualMedio: number;
    medicoesCount: number;
  }>;
  glpiResumo: {
    totalAbertos: number;
    porContrato: Array<{
      contratoId: string;
      contratoNome: string;
      totalChamados: number;
      porColuna: {
        BACKLOG: number;
        EM_ANDAMENTO: number;
        AGUARDANDO: number;
        RESOLVIDO: number;
        FECHADO: number;
      };
    }>;
    semInteracao: Array<{
      id: string;
      glpiTicketId: number;
      titulo: string;
      contratoId: string;
      contratoNome: string;
      dataUltimaInteracao: string;
      statusLabel: string | null;
      colunaKanban: string;
    }>;
  };
}) {
  const router = useRouter();
  const [ustModalId, setUstModalId] = useState<string | null>(null);

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
              {u.mensagem}{" "}
              <button
                type="button"
                className="text-xs text-primary underline ml-1"
                onClick={() => setUstModalId(u.id)}
              >
                Detalhar consumo
              </button>
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

  const painelTarefasESerie = (
    <>
      {tarefasMes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Tarefas sugeridas (mês atual)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {tarefasMes.map((t, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2"
              >
                <div>
                  <span className="font-medium">{t.titulo}</span>
                  <span className="text-muted-foreground text-xs ml-2">{t.detalhe}</span>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={t.href}>Abrir</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Evolução (últimos 12 meses)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Barras: valor devido (checklist) no mês • Linha: % médio de cumprimento nas medições
          </p>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={serieTempo} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 9 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} domain={[0, 100]} />
              <Tooltip
                formatter={(v: number, name: string) =>
                  name === "% médio" ? [`${v.toFixed(1)}%`, name] : [formatCurrency(v), name]
                }
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="valorDevido"
                name="Valor devido"
                fill="hsl(var(--primary))"
                radius={[2, 2, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="percentualMedio"
                name="% médio"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );

  const blocoInsights =
    insights &&
    (() => {
      const cartColors = ["#3b82f6", "#22c55e", "#eab308", "#f97316", "#a855f7"];
      return (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Insights operacionais</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Medição {insights.competenciaLabel}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {insights.semMedicaoNoMes.length === 0 ? (
                  <p className="text-muted-foreground">
                    Todos os contratos ativos{contratoId ? " (filtro)" : ""} têm medição registrada neste mês.
                  </p>
                ) : (
                  <>
                    <p className="text-amber-800 dark:text-amber-200 font-medium">
                      {insights.semMedicaoNoMes.length} contrato(s) sem medição no mês
                    </p>
                    <ul className="space-y-1 text-xs max-h-28 overflow-y-auto">
                      {insights.semMedicaoNoMes.map((c) => (
                        <li key={c.id}>
                          <Link href={`/medicoes?contratoId=${c.id}`} className="text-primary hover:underline">
                            {c.nome}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">UST no mês</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p>
                  <strong>{insights.ustMes.lancamentos}</strong> lançamentos
                </p>
                <p>
                  Total: <strong>{insights.ustMes.totalUst.toFixed(2)}</strong> UST
                </p>
                <p className="text-muted-foreground">
                  Valor:{" "}
                  {insights.ustMes.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
                <Button variant="link" className="h-auto p-0 text-xs" asChild>
                  <Link href="/execucao-tecnica">Abrir execução técnica</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="md:col-span-2 lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Carteira de contratos</CardTitle>
              </CardHeader>
              <CardContent>
                {insights.carteiraContratos.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart
                      layout="vertical"
                      data={insights.carteiraContratos}
                      margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={88}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip />
                      <Bar dataKey="count" name="Contratos" radius={[0, 4, 4, 0]}>
                        {insights.carteiraContratos.map((_, i) => (
                          <Cell key={i} fill={cartColors[i % cartColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem contratos cadastrados.</p>
                )}
              </CardContent>
            </Card>
          </div>
          {insights.modulosCriticos.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Módulos com menor atendimento</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Priorize ações onde o % de itens &quot;Atende&quot; está mais baixo (mín. 2 itens no módulo).
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y text-sm">
                  {insights.modulosCriticos.map((m) => (
                    <div
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-2"
                    >
                      <div>
                        <Link href={`/modulos/${m.id}`} className="font-medium text-primary hover:underline">
                          {m.nome}
                        </Link>
                        <span className="text-muted-foreground text-xs ml-1">· {m.contratoNome}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant={m.percentual < 50 ? "destructive" : "secondary"}>
                          {m.percentual}% atendidos
                        </Badge>
                        {m.pendencias > 0 && (
                          <span className="text-muted-foreground">{m.pendencias} pend.</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      );
    })();

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
        <div className="space-y-4">{painelTarefasESerie}</div>
        {blocoInsights}
        <div className="rounded-lg border bg-muted/50 p-8 text-center text-muted-foreground">
          Nenhum dado disponível. Cadastre contratos e itens para ver os indicadores.
        </div>
        <DashboardUstModal
          contratoId={ustModalId}
          open={!!ustModalId}
          onOpenChange={(o) => !o && setUstModalId(null)}
        />
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

      <div className="space-y-4">{painelTarefasESerie}</div>

      {blocoInsights}

      <Card>
        <CardHeader>
          <CardTitle>Chamados GLPI abertos</CardTitle>
          <p className="text-xs text-muted-foreground">
            Visão de chamados abertos por contrato e alerta de chamados sem interação há mais de 7 dias.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Total de chamados abertos</p>
            <p className="text-2xl font-semibold">{glpiResumo.totalAbertos}</p>
          </div>
          {glpiResumo.porContrato.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum chamado aberto vinculado a contratos no momento.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {glpiResumo.porContrato.map((g) => (
                <Link
                  key={g.contratoId}
                  href={`/integracao/glpi?contratoId=${encodeURIComponent(g.contratoId)}`}
                  className="rounded-md border p-3 block hover:bg-muted/40 transition-colors"
                >
                  <p className="text-xs text-muted-foreground">Contrato</p>
                  <p className="text-sm font-medium">{g.contratoNome}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Chamados abertos: <strong>{g.totalChamados}</strong>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Backlog {g.porColuna.BACKLOG} • Em andamento {g.porColuna.EM_ANDAMENTO} • Aguardando{" "}
                    {g.porColuna.AGUARDANDO} • Resolvido {g.porColuna.RESOLVIDO} • Fechado {g.porColuna.FECHADO}
                  </p>
                </Link>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Sem interação há mais de 7 dias ({glpiResumo.semInteracao.length})
            </p>
            {glpiResumo.semInteracao.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum chamado sem interação acima do limite.</p>
            ) : (
              <div className="rounded-md border divide-y">
                {glpiResumo.semInteracao.slice(0, 20).map((c) => (
                  <div key={c.id} className="px-3 py-2 text-sm">
                    <p className="font-medium">
                      #{c.glpiTicketId} - {c.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.contratoNome} • Última interação: {formatDate(c.dataUltimaInteracao)} •{" "}
                      {c.statusLabel ?? c.colunaKanban}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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

      <DashboardUstModal
        contratoId={ustModalId}
        open={!!ustModalId}
        onOpenChange={(o) => !o && setUstModalId(null)}
      />
    </div>
  );
}
