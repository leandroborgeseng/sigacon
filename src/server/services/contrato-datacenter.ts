import type { Prisma } from "@prisma/client";
import { TipoContrato, TipoRecursoDatacenter } from "@prisma/client";
import { normalizarTiposRecursoDatacenterParaPersistir } from "@/lib/datacenter-recursos";
import type { ContratoDatacenterBodyInput } from "@/lib/validators/contrato";

export type DatacenterPayload = ContratoDatacenterBodyInput;

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
    await tx.contratoDatacenterLicencaSoftware.deleteMany({ where: { contratoId } });
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

  if (datacenterBody.links !== undefined) {
    await tx.contratoLinkMetropolitano.deleteMany({ where: { contratoId } });
    const links = datacenterBody.links.filter((l) => l.descricaoVelocidade?.trim());
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
  }

  const detalhe = datacenterBody.itensPrevistosDetalhe;
  /** Detalhe enviado pelo formulário: uma entrada por tipo marcado; vazio limpa linhas se não houver fallback por tipos. */
  if (detalhe !== undefined && detalhe.length > 0) {
    const tipos = normalizarTiposRecursoDatacenterParaPersistir([
      ...new Set(detalhe.map((d) => d.tipo)),
    ]);
    const porTipo = new Map(
      detalhe.map((d) => [
        d.tipo,
        { quantidadeMaxima: d.quantidadeMaxima, valorUnitarioMensal: d.valorUnitarioMensal },
      ])
    );
    await tx.contratoDatacenterItemPrevisto.deleteMany({ where: { contratoId } });
    if (tipos.length > 0) {
      await tx.contratoDatacenterItemPrevisto.createMany({
        data: tipos.map((tipo) => {
          const det = porTipo.get(tipo);
          return {
            contratoId,
            tipo,
            quantidadeContratada: det?.quantidadeMaxima ?? null,
            valorUnitarioMensal: det?.valorUnitarioMensal ?? null,
          };
        }),
      });
    }
  } else if (datacenterBody.tiposRecursoPrevistos !== undefined) {
    const existentes = await tx.contratoDatacenterItemPrevisto.findMany({
      where: { contratoId },
      select: { tipo: true, quantidadeContratada: true, valorUnitarioMensal: true },
    });
    const porTipoDb = new Map(
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
          const prevDireto = porTipoDb.get(tipo);
          const prevFibraLegado =
            tipo === TipoRecursoDatacenter.CONECTIVIDADE_FIBRA_OPTICA
              ? porTipoDb.get(TipoRecursoDatacenter.LINK_METROPOLITANO)
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

  if (datacenterBody.licencasSoftware !== undefined) {
    const incoming = datacenterBody.licencasSoftware;
    const finalIds: string[] = [];
    for (let i = 0; i < incoming.length; i++) {
      const row = incoming[i];
      const nome = row.nome.trim();
      if (!nome) continue;
      const q = row.quantidadeMaxima;
      const v = row.valorUnitarioMensal;
      if (row.id) {
        const exists = await tx.contratoDatacenterLicencaSoftware.findFirst({
          where: { id: row.id, contratoId },
        });
        if (exists) {
          await tx.contratoDatacenterLicencaSoftware.update({
            where: { id: row.id },
            data: {
              nome,
              quantidadeMaxima: q ?? null,
              valorUnitarioMensal: v ?? null,
              ordem: i,
            },
          });
          finalIds.push(row.id);
        } else {
          const created = await tx.contratoDatacenterLicencaSoftware.create({
            data: {
              contratoId,
              nome,
              quantidadeMaxima: q ?? null,
              valorUnitarioMensal: v ?? null,
              ordem: i,
            },
          });
          finalIds.push(created.id);
        }
      } else {
        const created = await tx.contratoDatacenterLicencaSoftware.create({
          data: {
            contratoId,
            nome,
            quantidadeMaxima: q ?? null,
            valorUnitarioMensal: v ?? null,
            ordem: i,
          },
        });
        finalIds.push(created.id);
      }
    }
    if (finalIds.length === 0) {
      await tx.contratoDatacenterLicencaSoftware.deleteMany({ where: { contratoId } });
    } else {
      await tx.contratoDatacenterLicencaSoftware.deleteMany({
        where: { contratoId, id: { notIn: finalIds } },
      });
    }
  }
}
