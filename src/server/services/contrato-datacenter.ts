import type { Prisma } from "@prisma/client";
import { TipoContrato, TipoRecursoDatacenter } from "@prisma/client";
import { normalizarTiposRecursoDatacenterParaPersistir } from "@/lib/datacenter-recursos";

export type DatacenterPayload = {
  vcpusContratados?: number | null;
  ramGb?: number | null;
  discoSsdGb?: number | null;
  discoBackupGb?: number | null;
  rackU?: number | null;
  observacoes?: string | null;
  /** Tipos de recurso marcados para medição / cálculo mensal (sem obrigar quantidade/valor). */
  tiposRecursoPrevistos?: TipoRecursoDatacenter[];
  links?: Array<{
    descricaoVelocidade: string;
    velocidadeMbps?: number | null;
    quantidade: number;
  }>;
};

function dcCreateUpdate(payload: DatacenterPayload) {
  return {
    vcpusContratados: payload.vcpusContratados ?? null,
    ramGb: payload.ramGb ?? null,
    discoSsdGb: payload.discoSsdGb ?? null,
    discoBackupGb: payload.discoBackupGb ?? null,
    rackU: payload.rackU ?? null,
    observacoes: payload.observacoes?.trim() ? payload.observacoes.trim() : null,
  };
}

/**
 * Ajusta registros de datacenter após criar/atualizar contrato.
 * `datacenterBody === undefined` em PATCH significa “não alterar capacidades/links”.
 */
export async function applyContratoDatacenter(
  tx: Prisma.TransactionClient,
  opts: {
    contratoId: string;
    tipoAnterior: TipoContrato;
    tipoNovo: TipoContrato;
    datacenterBody: DatacenterPayload | undefined;
  }
): Promise<void> {
  const { contratoId, tipoAnterior, tipoNovo, datacenterBody } = opts;

  if (tipoNovo === TipoContrato.SOFTWARE) {
    await tx.contratoDatacenterItemPrevisto.deleteMany({ where: { contratoId } });
    await tx.contratoLinkMetropolitano.deleteMany({ where: { contratoId } });
    await tx.contratoDatacenter.deleteMany({ where: { contratoId } });
    return;
  }

  if (datacenterBody === undefined) {
    if (tipoAnterior === TipoContrato.SOFTWARE && tipoNovo === TipoContrato.DATACENTER) {
      await tx.contratoDatacenter.upsert({
        where: { contratoId },
        create: { contratoId },
        update: {},
      });
    }
    return;
  }

  const fields = dcCreateUpdate(datacenterBody);
  await tx.contratoDatacenter.upsert({
    where: { contratoId },
    create: { contratoId, ...fields },
    update: fields,
  });

  await tx.contratoLinkMetropolitano.deleteMany({ where: { contratoId } });
  const links = (datacenterBody.links ?? []).filter((l) => l.descricaoVelocidade?.trim());
  if (links.length > 0) {
    await tx.contratoLinkMetropolitano.createMany({
      data: links.map((l, i) => ({
        contratoId,
        descricaoVelocidade: l.descricaoVelocidade.trim(),
        velocidadeMbps: l.velocidadeMbps ?? null,
        quantidade: Math.max(1, l.quantidade ?? 1),
        ordem: i,
      })),
    });
  }

  if (datacenterBody.tiposRecursoPrevistos !== undefined) {
    const existentes = await tx.contratoDatacenterItemPrevisto.findMany({
      where: { contratoId },
      select: { tipo: true, quantidadeContratada: true, valorUnitarioMensal: true },
    });
    const porTipo = new Map(
      existentes.map((e) => [
        e.tipo,
        { quantidadeContratada: e.quantidadeContratada, valorUnitarioMensal: e.valorUnitarioMensal },
      ])
    );
    await tx.contratoDatacenterItemPrevisto.deleteMany({ where: { contratoId } });
    const tipos = normalizarTiposRecursoDatacenterParaPersistir([
      ...new Set(datacenterBody.tiposRecursoPrevistos),
    ]);
    if (tipos.length > 0) {
      await tx.contratoDatacenterItemPrevisto.createMany({
        data: tipos.map((tipo) => {
          const prevDireto = porTipo.get(tipo);
          const prevFibraLegado =
            tipo === TipoRecursoDatacenter.CONECTIVIDADE_FIBRA_OPTICA
              ? porTipo.get(TipoRecursoDatacenter.LINK_METROPOLITANO)
              : undefined;
          const prev = prevDireto ?? prevFibraLegado;
          return {
            contratoId,
            tipo,
            quantidadeContratada: prev?.quantidadeContratada ?? null,
            valorUnitarioMensal: prev?.valorUnitarioMensal ?? null,
          };
        }),
      });
    }
  }
}
