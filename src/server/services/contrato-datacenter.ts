import type { Prisma } from "@prisma/client";
import { TipoContrato } from "@prisma/client";

export type DatacenterPayload = {
  vcpusContratados?: number | null;
  ramGb?: number | null;
  discoSsdGb?: number | null;
  discoBackupGb?: number | null;
  rackU?: number | null;
  observacoes?: string | null;
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
  if (links.length === 0) return;

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
