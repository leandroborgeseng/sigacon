import { PerfilUsuario } from "@prisma/client";

export type Perfil = PerfilUsuario;

const hierarchy: Record<Perfil, number> = {
  [PerfilUsuario.LEITOR]: 0,
  [PerfilUsuario.AVALIADOR]: 1,
  [PerfilUsuario.GESTOR]: 2,
  [PerfilUsuario.ADMIN]: 3,
};

export function hasPermission(userPerfil: Perfil, required: Perfil): boolean {
  return hierarchy[userPerfil] >= hierarchy[required];
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
