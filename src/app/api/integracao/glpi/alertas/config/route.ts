import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";

async function checkPerm(acao: "visualizar" | "editar") {
  const session = await getSession();
  if (!session) return { ok: false as const, status: 401, message: "Não autorizado" };
  const pode = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CUSTOMIZACAO, acao);
  if (!pode) return { ok: false as const, status: 403, message: "Sem permissão" };
  return { ok: true as const };
}

export async function GET() {
  const p = await checkPerm("visualizar");
  if (!p.ok) return NextResponse.json({ message: p.message }, { status: p.status });

  const cfg =
    (await prisma.configAlertaGlpi.findUnique({ where: { id: "default" } })) ||
    (await prisma.configAlertaGlpi.create({ data: { id: "default" } }));

  return NextResponse.json(cfg);
}

export async function PATCH(request: Request) {
  const p = await checkPerm("editar");
  if (!p.ok) return NextResponse.json({ message: p.message }, { status: p.status });

  const body = (await request.json().catch(() => ({}))) as {
    ativo?: boolean;
    prazoSlaHorasPadrao?: number;
    somenteChamadosAbertos?: boolean;
    notificarPorEmail?: boolean;
  };

  const data: Record<string, unknown> = {};
  if (typeof body.ativo === "boolean") data.ativo = body.ativo;
  if (typeof body.somenteChamadosAbertos === "boolean") data.somenteChamadosAbertos = body.somenteChamadosAbertos;
  if (typeof body.notificarPorEmail === "boolean") data.notificarPorEmail = body.notificarPorEmail;
  if (typeof body.prazoSlaHorasPadrao === "number") {
    data.prazoSlaHorasPadrao = Math.max(1, Math.min(720, Math.trunc(body.prazoSlaHorasPadrao)));
  }

  const cfg = await prisma.configAlertaGlpi.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });

  return NextResponse.json(cfg);
}
