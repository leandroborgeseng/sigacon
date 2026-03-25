import type { GlpiConfig } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function envCredentials() {
  const base = process.env.GLPI_URL?.replace(/\/$/, "");
  return {
    baseUrl: base,
    appToken: process.env.GLPI_APP_TOKEN,
    userToken: process.env.GLPI_USER_TOKEN,
  };
}

export type GlpiConfigDraftBody = {
  baseUrl?: string;
  appToken?: string;
  userToken?: string;
  campoBuscaGrupoTecnico?: number;
  criteriosExtraJson?: string | null;
};

/**
 * Mescla rascunho do formulário + registro no banco + .env (mesma prioridade que em uso real).
 */
export function mergeGlpiConnectionParams(
  row: GlpiConfig | null,
  body: GlpiConfigDraftBody
): {
  baseUrl: string;
  appToken: string;
  userToken: string;
  campoBuscaGrupoTecnico: number;
  criteriosExtraJson: string | null;
} {
  const env = envCredentials();
  const baseUrl = (body.baseUrl?.trim() || row?.baseUrl?.trim() || env.baseUrl?.trim() || "").replace(/\/$/, "");
  let appToken = (row?.appToken?.trim() || env.appToken || "").trim();
  let userToken = (row?.userToken?.trim() || env.userToken || "").trim();
  if (body.appToken != null && body.appToken.trim() !== "" && !body.appToken.startsWith("••")) {
    appToken = body.appToken.trim();
  }
  if (body.userToken != null && body.userToken.trim() !== "" && !body.userToken.startsWith("••")) {
    userToken = body.userToken.trim();
  }
  const campo =
    body.campoBuscaGrupoTecnico != null && Number.isFinite(body.campoBuscaGrupoTecnico)
      ? Math.floor(body.campoBuscaGrupoTecnico)
      : row?.campoBuscaGrupoTecnico ?? 71;
  const criteriosExtraJson =
    body.criteriosExtraJson === undefined
      ? row?.criteriosExtraJson ?? null
      : body.criteriosExtraJson?.trim() || null;
  return { baseUrl, appToken, userToken, campoBuscaGrupoTecnico: campo, criteriosExtraJson };
}

/**
 * Credenciais efetivas: banco (glpi_config) com fallback para variáveis de ambiente.
 */
export async function getGlpiCredentialsResolved(): Promise<{
  baseUrl: string;
  appToken: string;
  userToken: string;
  campoBuscaGrupoTecnico: number;
} | null> {
  const row = await prisma.glpiConfig.findUnique({ where: { id: "default" } });
  const env = envCredentials();
  const baseUrl = (row?.baseUrl?.trim() || env.baseUrl)?.replace(/\/$/, "") ?? "";
  const appToken = row?.appToken?.trim() || env.appToken || "";
  const userToken = row?.userToken?.trim() || env.userToken || "";
  if (!baseUrl || !appToken || !userToken) return null;
  const rawCampo =
    row?.campoBuscaGrupoTecnico ??
    (process.env.GLPI_CAMPO_GRUPO_TECNICO
      ? parseInt(process.env.GLPI_CAMPO_GRUPO_TECNICO, 10)
      : 71);
  const campoBuscaGrupoTecnico = Number.isFinite(rawCampo) ? rawCampo : 71;
  return { baseUrl, appToken, userToken, campoBuscaGrupoTecnico };
}

export async function glpiEstaConfigurado(): Promise<boolean> {
  const c = await getGlpiCredentialsResolved();
  return c !== null;
}
