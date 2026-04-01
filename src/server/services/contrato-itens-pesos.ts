import { prisma } from "@/lib/prisma";
import { calcularPesoPercentualPorItem } from "@/lib/finance/medicao";

/** Atualiza pesos iguais por item e totalItensVerificacao do contrato (itens com medição, sem cabeçalho lógico). */
export async function recalcularPesosEMedicaoContrato(contratoId: string): Promise<void> {
  const totalValidos = await prisma.itemContratual.count({
    where: { contratoId, considerarNaMedicao: true, cabecalhoLogico: false },
  });
  const peso = calcularPesoPercentualPorItem(totalValidos);
  if (peso > 0) {
    await prisma.itemContratual.updateMany({
      where: { contratoId, considerarNaMedicao: true, cabecalhoLogico: false },
      data: { pesoPercentual: peso },
    });
  }
  await prisma.contrato.update({
    where: { id: contratoId },
    data: { totalItensVerificacao: totalValidos },
  });
}
