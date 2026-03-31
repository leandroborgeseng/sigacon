import { prisma } from "@/lib/prisma";
import { TipoContrato } from "@prisma/client";

/** Garante uma linha de consumo por item previsto e por licença nesta competência. */
export async function garantirConsumoDatacenterNaMedicao(medicaoMensalId: string): Promise<void> {
  const med = await prisma.medicaoMensal.findUnique({
    where: { id: medicaoMensalId },
    include: {
      contrato: {
        include: {
          datacenterItensPrevistos: { select: { id: true } },
          datacenterLicencasSoftware: { select: { id: true } },
        },
      },
    },
  });
  if (!med || med.contrato.tipoContrato !== TipoContrato.DATACENTER) return;

  for (const ip of med.contrato.datacenterItensPrevistos) {
    await prisma.medicaoDatacenterConsumoItem.upsert({
      where: {
        medicaoMensalId_itemPrevistoId: {
          medicaoMensalId,
          itemPrevistoId: ip.id,
        },
      },
      create: { medicaoMensalId, itemPrevistoId: ip.id, quantidadeUsada: 0 },
      update: {},
    });
  }
  for (const lic of med.contrato.datacenterLicencasSoftware) {
    await prisma.medicaoDatacenterConsumoLicenca.upsert({
      where: {
        medicaoMensalId_licencaId: { medicaoMensalId, licencaId: lic.id },
      },
      create: { medicaoMensalId, licencaId: lic.id, quantidadeUsada: 0 },
      update: {},
    });
  }
}

/** Soma (quantidade usada × valor unitário mensal) para itens e licenças com preço cadastrado. */
export async function valorFaturamentoDatacenterMedicao(medicaoMensalId: string): Promise<number> {
  const rows = await prisma.medicaoMensal.findUnique({
    where: { id: medicaoMensalId },
    include: {
      consumoDatacenterItens: { include: { itemPrevisto: true } },
      consumoDatacenterLicencas: { include: { licenca: true } },
    },
  });
  if (!rows) return 0;
  let sum = 0;
  for (const c of rows.consumoDatacenterItens) {
    const vu = c.itemPrevisto.valorUnitarioMensal;
    if (vu == null) continue;
    sum += Number(c.quantidadeUsada) * Number(vu);
  }
  for (const c of rows.consumoDatacenterLicencas) {
    const vu = c.licenca.valorUnitarioMensal;
    if (vu == null) continue;
    sum += Number(c.quantidadeUsada) * Number(vu);
  }
  return Math.round(sum * 100) / 100;
}
