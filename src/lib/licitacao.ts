import { LeiLicitacao } from "@prisma/client";

/** Limite de prorrogações/renovações conforme a lei (número máximo permitido). */
export function limiteRenovacoes(lei: LeiLicitacao): number {
  switch (lei) {
    case LeiLicitacao.LEI_8666:
      return 4; // Art. 57, §5º - até 4 prorrogações de 12 meses
    case LeiLicitacao.LEI_14133:
      return 2; // Art. 149 - até 2 prorrogações, cada uma até 12 meses
    default:
      return 0;
  }
}

/** Indica se o contrato ainda pode ser renovado com base no número de renovações já realizadas. */
export function podeRenovar(lei: LeiLicitacao, numeroRenovacoes: number): boolean {
  return numeroRenovacoes < limiteRenovacoes(lei);
}

/** Label amigável da lei. */
export function labelLeiLicitacao(lei: LeiLicitacao): string {
  switch (lei) {
    case LeiLicitacao.LEI_8666:
      return "Lei 8.666/93 (antiga)";
    case LeiLicitacao.LEI_14133:
      return "Lei 14.133/2021 (nova)";
    default:
      return String(lei);
  }
}

/** Reajuste acumulado nos últimos 12 meses (a partir de cada dataReajuste). Limite usual: 25% ao ano. */
export function reajusteAcumuladoUltimos12Meses(
  reajustes: { dataReajuste: Date; percentualAplicado: number | { toString(): string } }[]
): number {
  const hoje = new Date();
  const dozeMesesAtras = new Date(hoje);
  dozeMesesAtras.setFullYear(hoje.getFullYear() - 1);
  return reajustes
    .filter((r) => {
      const d = new Date(r.dataReajuste);
      return d >= dozeMesesAtras && d <= hoje;
    })
    .reduce((acc, r) => acc + Number(r.percentualAplicado), 0);
}
