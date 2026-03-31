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
import { TipoContrato } from "@prisma/client";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const contratos = await prisma.contrato.findMany({
    orderBy: { nome: "asc" },
    include: { _count: { select: { modulos: true, itens: true } } },
  });
  return NextResponse.json(contratos);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { glpiGruposTecnicos: glpiRaw, datacenter: datacenterRaw, ...rest } = body;
    const parsed = contratoSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    let glpiGrupos: { glpiGroupId: number; nome?: string | null }[] | undefined;
    if (glpiRaw !== undefined) {
      const g = glpiGruposTecnicosSchema.safeParse(glpiRaw);
      if (!g.success) {
        return NextResponse.json(
          { message: "Grupos GLPI inválidos", errors: g.error.flatten() },
          { status: 400 }
        );
      }
      glpiGrupos = g.data;
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

    const valorMensal =
      parsed.data.valorMensalReferencia ??
      calcularValorMensalReferencia(parsed.data.valorAnual);

    const tipoNovo = parsed.data.tipoContrato ?? TipoContrato.SOFTWARE;

    const contrato = await prisma.$transaction(async (tx) => {
      const c = await tx.contrato.create({
        data: {
          nome: parsed.data.nome,
          numeroContrato: parsed.data.numeroContrato,
          fornecedor: parsed.data.fornecedor,
          ativo: true,
          objeto: parsed.data.objeto ?? null,
          vigenciaInicio: parsed.data.vigenciaInicio,
          vigenciaFim: parsed.data.vigenciaFim,
          valorAnual: parsed.data.valorAnual,
          valorMensalReferencia: valorMensal,
          status: parsed.data.status,
          gestorContrato: parsed.data.gestorContrato ?? null,
          observacoesGerais: parsed.data.observacoesGerais ?? null,
          formaCalculoMedicao: parsed.data.formaCalculoMedicao,
          leiLicitacao: parsed.data.leiLicitacao,
          dataAssinatura: parsed.data.dataAssinatura ?? null,
          numeroRenovacoes: parsed.data.numeroRenovacoes ?? 0,
          valorUnitarioUst: parsed.data.valorUnitarioUst ?? null,
          limiteUstAno: parsed.data.limiteUstAno ?? null,
          limiteValorUstAno: parsed.data.limiteValorUstAno ?? null,
          tipoContrato: tipoNovo,
        },
      });

      if (glpiGrupos?.length) {
        await tx.contratoGlpiGrupoTecnico.createMany({
          data: glpiGrupos.map((g) => ({
            contratoId: c.id,
            glpiGroupId: g.glpiGroupId,
            nome: g.nome ?? null,
          })),
        });
      }

      await applyContratoDatacenter(tx, {
        contratoId: c.id,
        tipoAnterior: TipoContrato.SOFTWARE,
        tipoNovo: c.tipoContrato,
        datacenterBody: datacenterParsed,
      });

      return c;
    });

    const full = await prisma.contrato.findUnique({
      where: { id: contrato.id },
      include: {
        glpiGruposTecnicos: true,
        datacenter: true,
        linksMetropolitanos: { orderBy: { ordem: "asc" } },
        datacenterItensPrevistos: { orderBy: { tipo: "asc" } },
        datacenterLicencasSoftware: { orderBy: { ordem: "asc" } },
      },
    });

    await registerAudit({
      entidade: "Contrato",
      entidadeId: contrato.id,
      acao: "CRIACAO",
      valorNovo: contrato,
      usuarioId: session.id,
    });

    return NextResponse.json(full ?? contrato);
  } catch (e) {
    console.error("Create contrato error:", e);
    return NextResponse.json(
      { message: "Erro ao criar contrato" },
      { status: 500 }
    );
  }
}
