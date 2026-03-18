import { Contrato, ServicoCatalogo, UnidadeMedicaoCatalogo } from "@prisma/client";

/** Valor monetário auditável do lançamento (número; persistir com toDecimal na API) */
export function valorMonetarioLancamentoUst(params: {
  quantidade: number;
  totalUst: number;
  contrato: Pick<Contrato, "valorUnitarioUst">;
  servico: Pick<ServicoCatalogo, "unidadeMedicao" | "valorUnitario"> | null;
}): number {
  const { quantidade, totalUst, contrato, servico } = params;
  const vuContrato = contrato.valorUnitarioUst != null ? Number(contrato.valorUnitarioUst) : 0;
  const vuServ = servico != null ? Number(servico.valorUnitario) : 0;

  if (servico) {
    switch (servico.unidadeMedicao) {
      case UnidadeMedicaoCatalogo.UST:
        return totalUst * vuServ;
      case UnidadeMedicaoCatalogo.FORNECIMENTO:
        return quantidade * vuServ;
      case UnidadeMedicaoCatalogo.HORA:
      case UnidadeMedicaoCatalogo.UNIDADE:
        return quantidade * vuServ;
      default:
        return totalUst * vuServ;
    }
  }
  return totalUst * vuContrato;
}
