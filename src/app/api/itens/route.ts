import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Prisma, StatusItem } from "@prisma/client";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const contratoId = searchParams.get("contratoId");
  const moduloId = searchParams.get("moduloId");
  const status = searchParams.get("status");
  const comPendencia = searchParams.get("comPendencia");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(50, Math.max(10, parseInt(searchParams.get("pageSize") ?? "20", 10)));
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
