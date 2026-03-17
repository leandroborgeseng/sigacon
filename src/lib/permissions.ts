import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type Perfil = PerfilUsuario;
export type Recurso = RecursoPermissao;

const hierarchy: Record<Perfil, number> = {
  [PerfilUsuario.LEITOR]: 0,
  [PerfilUsuario.AVALIADOR]: 1,
  [PerfilUsuario.GESTOR]: 2,
  [PerfilUsuario.ADMIN]: 3,
};

export function hasPermission(userPerfil: Perfil, required: Perfil): boolean {
  return hierarchy[userPerfil] >= hierarchy[required];
}

/** Retorna a matriz de permissões do perfil (visualizar/editar por recurso) a partir do banco. */
export async function getPermissoesPerfil(
  perfil: Perfil
): Promise<Record<RecursoPermissao, { podeVisualizar: boolean; podeEditar: boolean }>> {
  const rows = await prisma.permissaoPerfil.findMany({
    where: { perfil },
  });
  const out = {} as Record<RecursoPermissao, { podeVisualizar: boolean; podeEditar: boolean }>;
  for (const r of Object.values(RecursoPermissao)) {
    const row = rows.find((x) => x.recurso === r);
    out[r] = row
      ? { podeVisualizar: row.podeVisualizar, podeEditar: row.podeEditar }
      : { podeVisualizar: true, podeEditar: perfil === PerfilUsuario.ADMIN };
  }
  return out;
}

/** Verifica se o perfil pode visualizar ou editar o recurso (consulta o banco). */
export async function canRecurso(
  perfil: Perfil,
  recurso: RecursoPermissao,
  acao: "visualizar" | "editar"
): Promise<boolean> {
  const perm = await getPermissoesPerfil(perfil);
  const p = perm[recurso];
  if (!p) return false;
  if (acao === "visualizar") return p.podeVisualizar;
  return p.podeVisualizar && p.podeEditar;
}

export function canEditContract(userPerfil: Perfil): boolean {
  return hasPermission(userPerfil, PerfilUsuario.GESTOR);
}

export function canEditItems(userPerfil: Perfil): boolean {
  return hasPermission(userPerfil, PerfilUsuario.AVALIADOR);
}

export function canManageUsers(userPerfil: Perfil): boolean {
  return hasPermission(userPerfil, PerfilUsuario.ADMIN);
}

export function canCloseMedicao(userPerfil: Perfil): boolean {
  return hasPermission(userPerfil, PerfilUsuario.GESTOR);
}

export function canViewAudit(userPerfil: Perfil): boolean {
  return hasPermission(userPerfil, PerfilUsuario.AVALIADOR);
}

export function isAdmin(userPerfil: Perfil): boolean {
  return userPerfil === PerfilUsuario.ADMIN;
}

/** Labels para exibição dos recursos. */
export const RECURSO_LABELS: Record<RecursoPermissao, string> = {
  [RecursoPermissao.DASHBOARD]: "Dashboard",
  [RecursoPermissao.CONTRATOS]: "Contratos",
  [RecursoPermissao.MODULOS]: "Módulos",
  [RecursoPermissao.ITENS]: "Itens Contratuais",
  [RecursoPermissao.MEDICOES]: "Medição Mensal",
  [RecursoPermissao.ATAS]: "Atas de Reunião",
  [RecursoPermissao.PENDENCIAS]: "Pendências",
  [RecursoPermissao.USUARIOS]: "Usuários",
  [RecursoPermissao.IMPORTACAO]: "Importação XLSX",
};

export const PERFIL_LABELS: Record<PerfilUsuario, string> = {
  [PerfilUsuario.ADMIN]: "Administrador",
  [PerfilUsuario.GESTOR]: "Gestor",
  [PerfilUsuario.AVALIADOR]: "Avaliador",
  [PerfilUsuario.LEITOR]: "Leitor",
};
