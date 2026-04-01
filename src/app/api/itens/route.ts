import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  Prisma,
  StatusItem,
  PerfilUsuario,
  RecursoPermissao,
  OrigemAvaliacao,
  TipoContrato,
} from "@prisma/client";
import { canRecurso } from "@/lib/permissions";
import { itemContratualCreateSchema } from "@/lib/validators/item";
import { registerAudit } from "@/server/services/audit";
import { recalcularPesosEMedicaoContrato } from "@/server/services/contrato-itens-pesos";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const contratoId = searchParams.get("contratoId");
  const moduloId = searchParams.get("moduloId");
  const status = searchParams.get("status");
  const comPendencia = searchParams.get("comPendencia");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSizeCap = contratoId ? 500 : 50;
  const pageSize = Math.min(
    pageSizeCap,
    Math.max(10, parseInt(searchParams.get("pageSize") ?? (contratoId ? "200" : "20"), 10))
  );
  const search = searchParams.get("search")?.trim();

  const where: Prisma.ItemContratualWhereInput = {};
  if (contratoId) where.contratoId = contratoId;
  if (moduloId) where.moduloId = moduloId;
  if (status) where.statusAtual = status as StatusItem;
  if (search) {
    const num = parseInt(search, 10);
    if (!isNaN(num)) {
      where.OR = [
        { descricao: { contains: search, mode: "insensitive" } },
        { numeroItem: num },
      ];
    } else {
      where.descricao = { contains: search, mode: "insensitive" };
    }
  }
  if (comPendencia === "true") {
    where.pendencias = {
      some: { status: "ABERTA" },
    };
  }

  const [itens, total] = await Promise.all([
    prisma.itemContratual.findMany({
      where,
      orderBy: [{ modulo: { nome: "asc" } }, { numeroItem: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        modulo: { select: { nome: true, contratoId: true } },
        contrato: { select: { nome: true } },
        _count: { select: { pendencias: true } },
      },
    }),
    prisma.itemContratual.count({ where }),
  ]);

  const withPendencias = await Promise.all(
    itens.map(async (item) => {
      const count = await prisma.pendencia.count({
        where: { itemId: item.id, status: "ABERTA" },
      });
      return { ...item, pendenciasAbertas: count };
    })
  );

  return NextResponse.json({
    itens: withPendencias,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const podeEditar = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CONTRATOS,
    "editar"
  );
  if (!podeEditar) {
    return NextResponse.json({ message: "Sem permissão para cadastrar itens" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = itemContratualCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const contrato = await prisma.contrato.findUnique({
      where: { id: data.contratoId },
      select: { id: true, ativo: true, tipoContrato: true },
    });
    if (!contrato) {
      return NextResponse.json({ message: "Contrato não encontrado" }, { status: 404 });
    }
    if (contrato.tipoContrato === TipoContrato.DATACENTER) {
      return NextResponse.json(
        {
          message:
            "Contratos datacenter não utilizam itens contratuais por módulo; use itens previstos e licenças no cadastro do contrato.",
        },
        { status: 400 }
      );
    }
    if (!contrato.ativo) {
      return NextResponse.json(
        { message: "Contrato inativo: não é possível cadastrar itens" },
        { status: 403 }
      );
    }

    const modulo = await prisma.modulo.findUnique({
      where: { id: data.moduloId },
      select: { id: true, contratoId: true },
    });
    if (!modulo || modulo.contratoId !== data.contratoId) {
      return NextResponse.json(
        { message: "Módulo inválido ou não pertence ao contrato informado" },
        { status: 400 }
      );
    }

    const duplicado = await prisma.itemContratual.findUnique({
      where: {
        contratoId_moduloId_numeroItem: {
          contratoId: data.contratoId,
          moduloId: data.moduloId,
          numeroItem: data.numeroItem,
        },
      },
      select: { id: true },
    });
    if (duplicado) {
      return NextResponse.json(
        { message: `Já existe item número ${data.numeroItem} neste módulo` },
        { status: 409 }
      );
    }

    const item = await prisma.itemContratual.create({
      data: {
        contratoId: data.contratoId,
        moduloId: data.moduloId,
        lote: data.lote ?? "",
        numeroItem: data.numeroItem,
        descricao: data.descricao,
        statusAtual: data.statusAtual,
        observacaoAtual: data.observacaoAtual ?? null,
        criticidade: data.criticidade,
        exigeEvidencia: data.exigeEvidencia,
        requisitoLegal: data.requisitoLegal,
        impactaOperacao: data.impactaOperacao,
        cabecalhoLogico: data.cabecalhoLogico,
        considerarNaMedicao: data.considerarNaMedicao,
      },
      include: {
        modulo: { select: { nome: true } },
        contrato: { select: { nome: true } },
      },
    });

    const now = new Date();
    await prisma.avaliacaoItem.create({
      data: {
        itemId: item.id,
        dataAvaliacao: now,
        competenciaAno: now.getFullYear(),
        competenciaMes: now.getMonth() + 1,
        status: data.statusAtual,
        observacao: data.observacaoAtual ?? null,
        usuarioId: session.id,
        origem: OrigemAvaliacao.MANUAL,
      },
    });

    await recalcularPesosEMedicaoContrato(data.contratoId);

    await registerAudit({
      entidade: "ItemContratual",
      entidadeId: item.id,
      acao: "CRIACAO",
      valorNovo: {
        contratoId: item.contratoId,
        moduloId: item.moduloId,
        numeroItem: item.numeroItem,
        descricao: item.descricao,
      },
      usuarioId: session.id,
    });

    return NextResponse.json(item);
  } catch (e) {
    console.error("Create item error:", e);
    return NextResponse.json({ message: "Erro ao criar item" }, { status: 500 });
  }
}
