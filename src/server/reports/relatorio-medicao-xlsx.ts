import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getOrCreateMedicao } from "@/server/services/medicao";

export async function gerarRelatorioMedicaoXlsx(contratoId: string, ano: number, mes: number): Promise<Buffer> {
  const contrato = await prisma.contrato.findUnique({
    where: { id: contratoId },
    select: {
      nome: true,
      numeroContrato: true,
      fornecedor: true,
      valorUnitarioUst: true,
      limiteUstAno: true,
      limiteValorUstAno: true,
    },
  });
  if (!contrato) throw new Error("Contrato não encontrado");

  const medicao = await getOrCreateMedicao(contratoId, ano, mes);
  const lancamentos = await prisma.lancamentoUst.findMany({
    where: { contratoId, competenciaAno: ano, competenciaMes: mes },
    orderBy: { criadoEm: "asc" },
    include: {
      tipoAtividade: { select: { nome: true, categoria: true, complexidade: true, ustFixo: true } },
      servicoCatalogo: { select: { nome: true } },
    },
  });

  const totaisAno = await prisma.lancamentoUst.aggregate({
    where: { contratoId, competenciaAno: ano },
    _sum: { totalUst: true, valorMonetario: true },
  });

  const wb = XLSX.utils.book_new();

  const resumo = [
    ["Relatório de medição mensal — LeX"],
    [],
    ["Contrato", contrato.nome],
    ["Nº contrato", contrato.numeroContrato],
    ["Fornecedor", contrato.fornecedor],
    ["Competência", `${mes.toString().padStart(2, "0")}/${ano}`],
    [],
    ["CHECKLIST (itens contratuais)"],
    ["Itens válidos na medição", medicao.totalItensValidos],
    ["Itens atendidos", medicao.totalItensAtendidos],
    ["Itens parciais", medicao.totalItensParciais],
    ["Itens não atendidos", medicao.totalItensNaoAtendidos],
    ["% cumprido", Number(medicao.percentualCumprido)],
    ["Valor devido (checklist) R$", Number(medicao.valorDevidoMes)],
    ["Valor glosado R$", Number(medicao.valorGlosadoMes)],
    [],
    ["UST — competência"],
    ["Total UST mês", Number(medicao.totalUstMes)],
    ["Valor medição UST R$", Number(medicao.valorMedicaoUstMes)],
    [],
    ["CONSOLIDADO MÊS R$", Number(medicao.valorTotalConsolidadoMes ?? 0)],
    [],
    ["UST — acumulado no ano", ano],
    ["Total UST ano", Number(totaisAno._sum.totalUst ?? 0)],
    ["Total R$ UST ano", Number(totaisAno._sum.valorMonetario ?? 0)],
    ["Limite UST ano (contrato)", contrato.limiteUstAno != null ? Number(contrato.limiteUstAno) : "—"],
    ["Limite R$ UST ano (contrato)", contrato.limiteValorUstAno != null ? Number(contrato.limiteValorUstAno) : "—"],
    ["Status fechamento medição", medicao.statusFechamento],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumo), "Resumo");

  const headUst = [
    "Tipo atividade",
    "Categoria",
    "Complexidade",
    "UST/unidade",
    "Qtd",
    "Total UST",
    "R$",
    "Serviço catálogo",
    "GLPI",
    "URL evidência",
  ];
  const rowsUst = lancamentos.map((l) => [
    l.tipoAtividade.nome,
    l.tipoAtividade.categoria,
    l.tipoAtividade.complexidade ?? "",
    Number(l.tipoAtividade.ustFixo),
    l.quantidade,
    Number(l.totalUst),
    Number(l.valorMonetario),
    l.servicoCatalogo?.nome ?? "",
    l.evidenciaGlpiTicketId ?? "",
    l.evidenciaUrl ?? "",
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headUst, ...rowsUst]), "Lançamentos UST");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
