import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { gerarRelatorioMedicaoXlsx } from "@/server/reports/relatorio-medicao-xlsx";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const ok = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CUSTOMIZACAO, "visualizar");
  if (!ok) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const { id: contratoId } = await params;
  const { searchParams } = new URL(request.url);
  const ano = parseInt(searchParams.get("ano") ?? "", 10);
  const mes = parseInt(searchParams.get("mes") ?? "", 10);
  if (!ano || !mes) {
    return NextResponse.json({ message: "Informe ano e mes" }, { status: 400 });
  }

  const c = await prisma.contrato.findUnique({ where: { id: contratoId }, select: { id: true } });
  if (!c) return NextResponse.json({ message: "Contrato não encontrado" }, { status: 404 });

  try {
    const buf = await gerarRelatorioMedicaoXlsx(contratoId, ano, mes);
    const nome = `relatorio-medicao-${contratoId.slice(0, 8)}-${ano}-${mes}.xlsx`;
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${nome}"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Erro ao gerar planilha" }, { status: 500 });
  }
}
