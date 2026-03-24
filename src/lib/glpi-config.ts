import { prisma } from "@/lib/prisma";

function envCredentials() {
  const base = process.env.GLPI_URL?.replace(/\/$/, "");
  return {
    baseUrl: base,
    appToken: process.env.GLPI_APP_TOKEN,
    userToken: process.env.GLPI_USER_TOKEN,
  };
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
