"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/utils";
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
  indicators,
  porModulo,
}: {
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
    totalItens: number;
    atendidos: number;
    percentualAtendimento: number;
    pendenciasAbertas: number;
  }>;
}) {
  if (!indicators) {
    return (
      <div className="rounded-lg border bg-muted/50 p-8 text-center text-muted-foreground">
        Nenhum dado disponível. Cadastre contratos e itens para ver os indicadores.
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

  const barData = porModulo.slice(0, 10).map((m) => ({
    name: m.nome.length > 15 ? m.nome.slice(0, 15) + "…" : m.nome,
    percentual: Math.round(m.percentualAtendimento * 100) / 100,
    pendencias: m.pendenciasAbertas,
  }));

  return (
    <div className="space-y-6">
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
