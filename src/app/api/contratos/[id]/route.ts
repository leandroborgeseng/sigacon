import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  contratoSchema,
  contratoDatacenterBodySchema,
  type ContratoDatacenterBodyInput,
  glpiGruposTecnicosSchema,
} from "@/lib/validators";
import { registerAudit } from "@/server/services/audit";
import { calcularValorMensalReferencia } from "@/lib/finance";
import { applyContratoDatacenter } from "@/server/services/contrato-datacenter";
import { canRecurso } from "@/lib/permissions";
import { RecursoPermissao, PerfilUsuario } from "@prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const contrato = await prisma.contrato.findUnique({
    where: { id },
    include: {
      modulos: true,
      _count: { select: { itens: true } },
      medicoes: { orderBy: [{ ano: "desc" }, { mes: "desc" }], take: 12 },
      atas: { orderBy: { dataReuniao: "desc" }, take: 10 },
      reajustes: { orderBy: { dataReajuste: "desc" } },
      datacenter: true,
      linksMetropolitanos: { orderBy: { ordem: "asc" } },
      datacenterItensPrevistos: { orderBy: { tipo: "asc" } },
      datacenterLicencasSoftware: { orderBy: { ordem: "asc" } },
    },
  });
  if (!contrato) return NextResponse.json({ message: "Contrato não encontrado" }, { status: 404 });
  return NextResponse.json(contrato);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const podeEditar = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CONTRATOS, "editar");
  if (!podeEditar) return NextResponse.json({ message: "Sem permissão para editar contratos" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.contrato.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ message: "Contrato não encontrado" }, { status: 404 });
  if (existing.ativo === false && session.perfil !== PerfilUsuario.ADMIN) {
    return NextResponse.json(
      { message: "Contrato inativo: somente administradores podem alterar" },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { glpiGruposTecnicos: glpiRaw, datacenter: datacenterRaw, ...rest } = body;
    const parsed = contratoSchema.partial().safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    let glpiData: { glpiGroupId: number; nome?: string | null }[] | undefined;
    if (glpiRaw !== undefined) {
      const g = glpiGruposTecnicosSchema.safeParse(glpiRaw);
      if (!g.success) {
        return NextResponse.json(
          { message: "Grupos GLPI inválidos", errors: g.error.flatten() },
          { status: 400 }
        );
      }
      glpiData = g.data;
    }

    let datacenterParsed: ContratoDatacenterBodyInput | undefined;
    if (datacenterRaw !== undefined) {
      const d = contratoDatacenterBodySchema.safeParse(datacenterRaw);
      if (!d.success) {
        return NextResponse.json(
          { message: "Dados de datacenter inválidos", errors: d.error.flatten() },
          { status: 400 }
        );
      }
      datacenterParsed = d.data;
    }

    const valorAnual = parsed.data.valorAnual ?? Number(existing.valorAnual);
    const valorMensal =
      parsed.data.valorMensalReferencia ??
      (Number(existing.valorMensalReferencia) || calcularValorMensalReferencia(valorAnual));

    const tipoNovo =
      parsed.data.tipoContrato !== undefined ? parsed.data.tipoContrato : existing.tipoContrato;

    const contrato = await prisma.$transaction(async (tx) => {
      if (glpiData !== undefined) {
        await tx.contratoGlpiGrupoTecnico.deleteMany({ where: { contratoId: id } });
        if (glpiData.length > 0) {
          await tx.contratoGlpiGrupoTecnico.createMany({
            data: glpiData.map((row) => ({
              contratoId: id,
              glpiGroupId: row.glpiGroupId,
              nome: row.nome ?? null,
            })),
          });
        }
      }
      const updated = await tx.contrato.update({
        where: { id },
        data: {
          ...(parsed.data.nome != null && { nome: parsed.data.nome }),
          ...(parsed.data.numeroContrato != null && { numeroContrato: parsed.data.numeroContrato }),
          ...(parsed.data.fornecedor != null && { fornecedor: parsed.data.fornecedor }),
          ...(typeof (parsed.data as { ativo?: unknown }).ativo === "boolean" && { ativo: (parsed.data as { ativo: boolean }).ativo }),
          ...(parsed.data.objeto !== undefined && { objeto: parsed.data.objeto }),
          ...(parsed.data.vigenciaInicio != null && { vigenciaInicio: parsed.data.vigenciaInicio }),
          ...(parsed.data.vigenciaFim != null && { vigenciaFim: parsed.data.vigenciaFim }),
          ...(parsed.data.valorAnual != null && { valorAnual: parsed.data.valorAnual }),
          valorMensalReferencia: valorMensal,
          ...(parsed.data.status != null && { status: parsed.data.status }),
          ...(parsed.data.gestorContrato !== undefined && { gestorContrato: parsed.data.gestorContrato }),
          ...(parsed.data.observacoesGerais !== undefined && { observacoesGerais: parsed.data.observacoesGerais }),
          ...(parsed.data.formaCalculoMedicao != null && { formaCalculoMedicao: parsed.data.formaCalculoMedicao }),
          ...(parsed.data.leiLicitacao != null && { leiLicitacao: parsed.data.leiLicitacao }),
          ...(parsed.data.dataAssinatura !== undefined && { dataAssinatura: parsed.data.dataAssinatura }),
          ...(parsed.data.numeroRenovacoes !== undefined && { numeroRenovacoes: parsed.data.numeroRenovacoes }),
          ...(parsed.data.valorUnitarioUst !== undefined && {
            valorUnitarioUst: parsed.data.valorUnitarioUst,
          }),
          ...(parsed.data.limiteUstAno !== undefined && { limiteUstAno: parsed.data.limiteUstAno }),
          ...(parsed.data.limiteValorUstAno !== undefined && {
            limiteValorUstAno: parsed.data.limiteValorUstAno,
          }),
          ...(parsed.data.tipoContrato !== undefined && { tipoContrato: parsed.data.tipoContrato }),
        },
      });

      await applyContratoDatacenter(tx, {
        contratoId: id,
        tipoAnterior: existing.tipoContrato,
        tipoNovo: updated.tipoContrato,
        datacenterBody: datacenterParsed,
      });

      return updated;
    });

    await registerAudit({
      entidade: "Contrato",
      entidadeId: id,
      acao: "ATUALIZACAO",
      valorAnterior: existing,
      valorNovo: contrato,
      usuarioId: session.id,
    });

    const comGlpi = await prisma.contrato.findUnique({
      where: { id },
      include: {
        glpiGruposTecnicos: true,
        datacenter: true,
        linksMetropolitanos: { orderBy: { ordem: "asc" } },
        datacenterItensPrevistos: { orderBy: { tipo: "asc" } },
        datacenterLicencasSoftware: { orderBy: { ordem: "asc" } },
      },
    });
    return NextResponse.json(comGlpi ?? contrato);
  } catch (e) {
    console.error("Update contrato error:", e);
    return NextResponse.json(
      { message: "Erro ao atualizar contrato" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  if (session.perfil !== PerfilUsuario.ADMIN) {
    return NextResponse.json({ message: "Somente administradores podem excluir contratos" }, { status: 403 });
  }

  const { id } = await params;
  const contrato = await prisma.contrato.findUnique({ where: { id } });
  if (!contrato) return NextResponse.json({ message: "Contrato não encontrado" }, { status: 404 });

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const confirmNome = typeof (body as { confirmNome?: unknown }).confirmNome === "string"
    ? (body as { confirmNome: string }).confirmNome
    : "";
  if (confirmNome.trim() !== contrato.nome) {
    return NextResponse.json(
      { message: "Confirmação inválida. Digite exatamente o nome do contrato para excluir." },
      { status: 400 }
    );
  }

  await prisma.contrato.delete({ where: { id } });

  await registerAudit({
    entidade: "Contrato",
    entidadeId: id,
    acao: "EXCLUSAO",
    valorAnterior: contrato,
    usuarioId: session.id,
  });

  return NextResponse.json({ ok: true });
}
