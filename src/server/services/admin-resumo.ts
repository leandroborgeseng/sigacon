import { prisma } from "@/lib/prisma";
import { PerfilUsuario, StatusContrato } from "@prisma/client";

const STATUS_CONTRATO_LABEL: Record<StatusContrato, string> = {
  ATIVO: "Ativo",
  ENCERRADO: "Encerrado",
  SUSPENSO: "Suspenso",
  EM_IMPLANTACAO: "Em implantação",
  EM_AVALIACAO: "Em avaliação",
};

export async function getAdminResumo() {
  const now = new Date();
  const ano = now.getFullYear();
  const mes = now.getMonth() + 1;

  const [
    usuariosAtivos,
    usuariosInativos,
    porPerfil,
    contratosPorStatus,
    lancamentosUstMes,
    ultimasAuditorias,
  ] = await Promise.all([
    prisma.usuario.count({ where: { ativo: true } }),
    prisma.usuario.count({ where: { ativo: false } }),
    prisma.usuario.groupBy({
      by: ["perfil"],
      _count: true,
      where: { ativo: true },
    }),
    prisma.contrato.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.lancamentoUst.count({
      where: { competenciaAno: ano, competenciaMes: mes },
    }),
    prisma.historicoAuditoria.findMany({
      orderBy: { criadoEm: "desc" },
      take: 30,
      include: { usuario: { select: { nome: true, email: true } } },
    }),
  ]);

  const perfilRows = Object.values(PerfilUsuario).map((p) => ({
    perfil: p,
    count: porPerfil.find((x) => x.perfil === p)?._count ?? 0,
  }));

  return {
    usuariosAtivos,
    usuariosInativos,
    perfilRows,
    contratosPorStatus: contratosPorStatus.map((r) => ({
      status: r.status,
      label: STATUS_CONTRATO_LABEL[r.status],
      count: r._count,
    })),
    lancamentosUstMes,
    competenciaUst: `${mes}/${ano}`,
    ultimasAuditorias: ultimasAuditorias.map((a) => ({
      id: a.id,
      entidade: a.entidade,
      acao: a.acao,
      usuario: a.usuario?.nome ?? a.usuario?.email ?? "Sistema",
      criadoEm: a.criadoEm.toISOString(),
    })),
  };
}
