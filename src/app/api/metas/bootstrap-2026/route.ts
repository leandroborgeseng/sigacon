import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";

const METAS_2026 = [
  "Melhorar o PDTIC e contemplar a Alocação de Recursos Orçamentários (PCA)",
  "Implantar Termo de Responsabilidade/Compromisso para os usuários assinarem em relação ao uso da Assinatura Eletrônica",
  "Identificação e tratativas dos riscos de TIC de acordo com as normas da família ISO/IEC 27000, referente a Segurança da Informação",
  "Identificação e tratativas dos riscos de TIC de acordo com as normas da ABNT NBR ISO/IEC 31000, referente à Gestão de Riscos Corporativos",
  "Elaborar Plano de Continuidade dos Serviços de Tecnologia da Informação e Comunicação (TIC)",
  "Verificar se precisa regulamentar especificamente a Lei de Eficiência Pública (Governo Digital), Lei Federal nº 14.129/2021, considerando o Decreto Municipal nº 11.922/2024",
  "Possibilitar download de dados em formatos abertos e não proprietários (JSON, XML, CSV, ODS, RDF etc.) - incluir na licitação",
  "Possibilitar acessibilidade de conteúdo para pessoas com deficiência - incluir na licitação",
  "Realizar o mapeamento de dados (data mapping) em atendimento à LGPD",
];

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const pode = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CUSTOMIZACAO, "editar");
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const ano = 2026;
  const existentes = await prisma.metaPlanejamento.findMany({ where: { ano }, select: { titulo: true } });
  const set = new Set(existentes.map((m) => m.titulo.trim().toLowerCase()));

  let criadas = 0;
  for (const titulo of METAS_2026) {
    if (set.has(titulo.trim().toLowerCase())) continue;
    await prisma.metaPlanejamento.create({
      data: {
        ano,
        titulo,
        contextoOrigem:
          "Questionário IEGM/iGOV-TI para o exercício de 2026 (preenchimento até 31/03/2027).",
      },
    });
    criadas += 1;
  }

  return NextResponse.json({ ok: true, criadas, totalFonte: METAS_2026.length });
}
