import { prisma } from "@/lib/prisma";

export async function registerAudit(params: {
  entidade: string;
  entidadeId: string;
  acao: string;
  valorAnterior?: unknown;
  valorNovo?: unknown;
  usuarioId?: string | null;
}) {
  await prisma.historicoAuditoria.create({
    data: {
      entidade: params.entidade,
      entidadeId: params.entidadeId,
      acao: params.acao,
      valorAnterior: params.valorAnterior ? JSON.parse(JSON.stringify(params.valorAnterior)) : undefined,
      valorNovo: params.valorNovo ? JSON.parse(JSON.stringify(params.valorNovo)) : undefined,
      usuarioId: params.usuarioId ?? undefined,
    },
  });
}
