import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { recalcularMedicao, fecharMedicao, getOrCreateMedicao } from "@/server/services/medicao";
import { garantirConsumoDatacenterNaMedicao } from "@/server/services/medicao-datacenter";
import { patchConsumoDatacenterSchema } from "@/lib/validators";
import { PerfilUsuario, RecursoPermissao, StatusFechamentoMedicao } from "@prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const { prisma } = await import("@/lib/prisma");
  const medicao = await prisma.medicaoMensal.findUnique({
    where: { id },
    include: {
      contrato: {
        select: { id: true, nome: true, tipoContrato: true },
      },
      consumoDatacenterItens: { include: { itemPrevisto: true } },
      consumoDatacenterLicencas: { include: { licenca: true } },
    },
  });
  if (!medicao) return NextResponse.json({ message: "Medição não encontrada" }, { status: 404 });
  return NextResponse.json(medicao);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const podeEditar = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.MEDICOES,
    "editar"
  );
  try {
    const body = await request.json();
    if (body.recalcular) {
      if (!podeEditar) {
        return NextResponse.json({ message: "Sem permissão para recalcular medição" }, { status: 403 });
      }
      const medicao = await recalcularMedicao(id);
      return NextResponse.json(medicao);
    }
    if (body.statusFechamento !== undefined) {
      if (!podeEditar) {
        return NextResponse.json({ message: "Sem permissão para alterar fechamento" }, { status: 403 });
      }
      const status = body.statusFechamento as StatusFechamentoMedicao;
      const medicao = await fecharMedicao(id, session.id, status);
      return NextResponse.json(medicao);
    }
    if (
      typeof body === "object" &&
      body !== null &&
      "consumoDatacenter" in body &&
      body.consumoDatacenter != null
    ) {
      if (!podeEditar) {
        return NextResponse.json({ message: "Sem permissão para editar consumo datacenter" }, { status: 403 });
      }
      const parsed = patchConsumoDatacenterSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { message: "Consumo datacenter inválido", errors: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const { prisma } = await import("@/lib/prisma");
      const medAntes = await prisma.medicaoMensal.findUnique({ where: { id } });
      if (!medAntes) return NextResponse.json({ message: "Medição não encontrada" }, { status: 404 });
      if (medAntes.statusFechamento !== StatusFechamentoMedicao.ABERTA) {
        return NextResponse.json(
          { message: "Medição fechada: reabra a competência para alterar o consumo." },
          { status: 409 }
        );
      }
      await garantirConsumoDatacenterNaMedicao(id);
      const payload = parsed.data.consumoDatacenter;
      for (const it of payload.itens ?? []) {
        await prisma.medicaoDatacenterConsumoItem.update({
          where: {
            medicaoMensalId_itemPrevistoId: {
              medicaoMensalId: id,
              itemPrevistoId: it.itemPrevistoId,
            },
          },
          data: { quantidadeUsada: it.quantidadeUsada },
        });
      }
      for (const lic of payload.licencas ?? []) {
        await prisma.medicaoDatacenterConsumoLicenca.update({
          where: {
            medicaoMensalId_licencaId: { medicaoMensalId: id, licencaId: lic.licencaId },
          },
          data: { quantidadeUsada: lic.quantidadeUsada },
        });
      }
      const medicao = await getOrCreateMedicao(medAntes.contratoId, medAntes.ano, medAntes.mes);
      return NextResponse.json(medicao);
    }
    if (!podeEditar) {
      return NextResponse.json({ message: "Sem permissão para editar medição" }, { status: 403 });
    }
    const { prisma } = await import("@/lib/prisma");
    const medicao = await prisma.medicaoMensal.update({
      where: { id },
      data: { observacoes: body.observacoes },
    });
    return NextResponse.json(medicao);
  } catch (e) {
    console.error("Update medicao error:", e);
    return NextResponse.json(
      { message: "Erro ao atualizar medição" },
      { status: 500 }
    );
  }
}
