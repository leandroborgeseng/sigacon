import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { mergeGlpiConnectionParams } from "@/lib/glpi-config";
import { testarConexaoGlpi } from "@/lib/glpi-test-connection";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const pode = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CUSTOMIZACAO,
    "editar"
  );
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as Parameters<typeof mergeGlpiConnectionParams>[1];
  const row = await prisma.glpiConfig.findUnique({ where: { id: "default" } });
  const merged = mergeGlpiConnectionParams(row, body);

  if (!merged.baseUrl) {
    return NextResponse.json(
      { message: "Informe a URL da API GLPI ou configure GLPI_URL no ambiente.", ok: false, steps: [] },
      { status: 400 }
    );
  }
  if (!merged.userToken) {
    return NextResponse.json(
      {
        message: "Informe o User Token (chave de acesso remoto) ou use o valor já salvo / GLPI_USER_TOKEN.",
        ok: false,
        steps: [],
      },
      { status: 400 }
    );
  }

  const resultado = await testarConexaoGlpi({
    baseUrl: merged.baseUrl,
    appToken: merged.appToken,
    userToken: merged.userToken,
    campoBuscaGrupoTecnico: merged.campoBuscaGrupoTecnico,
    criteriosExtraJson: merged.criteriosExtraJson,
  });

  return NextResponse.json({
    ok: resultado.ok,
    steps: resultado.steps,
    persistirAppTokenVazio: resultado.persistirAppTokenVazio,
    message: resultado.ok
      ? resultado.persistirAppTokenVazio
        ? "Conexão OK. O GLPI não exige App Token — ao salvar, remova o App Token salvo ou marque limpar."
        : "Conexão com o GLPI validada."
      : "Teste de conexão falhou; veja os passos abaixo.",
  });
}
