import { Decimal } from "@prisma/client/runtime/library";

export interface MedicaoParams {
  totalItensValidos: number;
  totalItensAtendidos: number;
  totalItensParciais: number;
  totalItensNaoAtendidos: number;
  valorAnualContrato: number;
}

export function calcularValorMensalReferencia(valorAnual: number): number {
  return valorAnual / 12;
}

export function calcularPercentualCumprido(
  atendidos: number,
  parciais: number,
  totalValidos: number
): number {
  if (totalValidos === 0) return 0;
  return (atendidos + parciais * 0.5) / totalValidos;
}

export function calcularPercentualCumpridoSimples(atendidos: number, totalValidos: number): number {
  if (totalValidos === 0) return 0;
  return atendidos / totalValidos;
}

export function calcularValorDevidoMes(
  valorMensalReferencia: number,
  percentualCumprido: number
): number {
  return valorMensalReferencia * (percentualCumprido / 100);
}

export function calcularValorGlosadoMes(
  valorMensalReferencia: number,
  valorDevidoMes: number
): number {
  return Math.max(0, valorMensalReferencia - valorDevidoMes);
}

export function calcularPesoPercentualPorItem(totalItensValidos: number): number {
  if (totalItensValidos === 0) return 0;
  return 100 / totalItensValidos;
}

export function calcularMedicaoMensal(params: MedicaoParams): {
  percentualCumprido: number;
  percentualNaoCumprido: number;
  valorMensalReferencia: number;
  valorDevidoMes: number;
  valorGlosadoMes: number;
} {
  const valorMensalRef = calcularValorMensalReferencia(params.valorAnualContrato);
  const percentualCumprido = calcularPercentualCumpridoSimples(
    params.totalItensAtendidos,
    params.totalItensValidos
  );
  const percentualPct = percentualCumprido * 100;
  const percentualNaoCumprido = Math.max(0, 100 - percentualPct);
  const valorDevido = calcularValorDevidoMes(valorMensalRef, percentualPct);
  const valorGlosado = calcularValorGlosadoMes(valorMensalRef, valorDevido);

  return {
    percentualCumprido: Math.round(percentualPct * 10000) / 10000,
    percentualNaoCumprido: Math.round(percentualNaoCumprido * 10000) / 10000,
    valorMensalReferencia: Math.round(valorMensalRef * 100) / 100,
    valorDevidoMes: Math.round(valorDevido * 100) / 100,
    valorGlosadoMes: Math.round(valorGlosado * 100) / 100,
  };
}

export function toDecimal(value: number): Decimal {
  return new Decimal(value);
}
