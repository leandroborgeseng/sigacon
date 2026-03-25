import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { mergeGlpiConnectionParams } from "@/lib/glpi-config";
import { testarConexaoGlpi } from "@/lib/glpi-test-connection";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";

function maskToken(t: string | null | undefined): string | null {
  if (!t || t.length < 4) return t ? "••••" : null;
  return `••••${t.slice(-4)}`;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const pode = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CUSTOMIZACAO,
    "visualizar"
  );
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const row = await prisma.glpiConfig.findUnique({ where: { id: "default" } });
  return NextResponse.json({
    baseUrl: row?.baseUrl ?? "",
    appTokenMasked: maskToken(row?.appToken ?? null),
    userTokenMasked: maskToken(row?.userToken ?? null),
    appTokenPreenchido: Boolean(row?.appToken?.trim()),
    userTokenPreenchido: Boolean(row?.userToken?.trim()),
    campoBuscaGrupoTecnico: row?.campoBuscaGrupoTecnico ?? 71,
    criteriosExtraJson: row?.criteriosExtraJson ?? "",
  });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const pode = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CUSTOMIZACAO,
    "editar"
  );
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as {
    baseUrl?: string;
    appToken?: string;
    userToken?: string;
    campoBuscaGrupoTecnico?: number;
    criteriosExtraJson?: string | null;
    limparAppToken?: boolean;
  };

  const existing = await prisma.glpiConfig.findUnique({ where: { id: "default" } });

  const merged = mergeGlpiConnectionParams(existing, body);
  if (!merged.baseUrl) {
    return NextResponse.json(
      { message: "Informe a URL da API (apirest.php) ou configure GLPI_URL no ambiente.", ok: false, steps: [] },
      { status: 400 }
    );
  }
  if (!merged.userToken) {
    return NextResponse.json(
      {
        message: "Informe o User Token ou use o já salvo / variável GLPI_USER_TOKEN.",
        ok: false,
        steps: [],
      },
      { status: 400 }
    );
  }

  const teste = await testarConexaoGlpi({
    baseUrl: merged.baseUrl,
    appToken: merged.appToken,
    userToken: merged.userToken,
    campoBuscaGrupoTecnico: merged.campoBuscaGrupoTecnico,
    criteriosExtraJson: merged.criteriosExtraJson,
  });
  if (!teste.ok) {
    return NextResponse.json(
      {
        message: "Configuração não salva: o teste de integração com o GLPI falhou.",
        ok: false,
        steps: teste.steps,
      },
      { status: 422 }
    );
  }

  const baseUrl = body.baseUrl?.trim() || null;
  let appToken = existing?.appToken ?? null;
  let userToken = existing?.userToken ?? null;
  if (teste.persistirAppTokenVazio || body.limparAppToken === true) {
    appToken = null;
  } else if (body.appToken != null && body.appToken.trim() !== "" && !body.appToken.startsWith("••")) {
    appToken = body.appToken.trim();
  }
  if (body.userToken != null && body.userToken.trim() !== "" && !body.userToken.startsWith("••")) {
    userToken = body.userToken.trim();
  }

  const campo =
    body.campoBuscaGrupoTecnico != null && Number.isFinite(body.campoBuscaGrupoTecnico)
      ? Math.floor(body.campoBuscaGrupoTecnico)
      : (existing?.campoBuscaGrupoTecnico ?? 71);

  const criteriosExtraJson =
    body.criteriosExtraJson === undefined
      ? existing?.criteriosExtraJson ?? null
      : body.criteriosExtraJson?.trim() || null;

  const saved = await prisma.glpiConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      baseUrl,
      appToken,
      userToken,
      campoBuscaGrupoTecnico: campo,
      criteriosExtraJson,
    },
    update: {
      baseUrl,
      appToken,
      userToken,
      campoBuscaGrupoTecnico: campo,
      criteriosExtraJson,
    },
  });

  return NextResponse.json({
    ok: true,
    baseUrl: saved.baseUrl ?? "",
    appTokenMasked: maskToken(saved.appToken),
    userTokenMasked: maskToken(saved.userToken),
    campoBuscaGrupoTecnico: saved.campoBuscaGrupoTecnico,
    criteriosExtraJson: saved.criteriosExtraJson ?? "",
    steps: teste.steps,
    persistirAppTokenVazio: teste.persistirAppTokenVazio,
    message:
      teste.persistirAppTokenVazio || body.limparAppToken === true
        ? "Configuração salva. App Token removido da configuração."
        : "Configuração salva e teste de integração com o GLPI concluído com sucesso.",
  });
}
