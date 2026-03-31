import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import * as XLSX from "xlsx";

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  if (/[",\n;]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const pode = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CUSTOMIZACAO,
    "visualizar"
  );
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const ano = Number(searchParams.get("ano") || "2026");
  const formato = (searchParams.get("formato") || "csv").toLowerCase();

  const metas = await prisma.metaPlanejamento.findMany({
    where: { ano },
    include: {
      desdobramentos: {
        include: {
          chamados: {
            include: {
              glpiChamado: {
                select: { glpiTicketId: true, titulo: true },
              },
            },
          },
        },
      },
    },
    orderBy: [{ criadoEm: "asc" }],
  });

  const rows: Array<Record<string, unknown>> = [];
  for (const m of metas) {
    if (m.desdobramentos.length === 0) {
      rows.push({
        ano: m.ano,
        meta_titulo: m.titulo,
        meta_status: m.status,
        meta_prazo: m.prazo ? m.prazo.toISOString().slice(0, 10) : "",
        desdobramento_titulo: "",
        desdobramento_status: "",
        desdobramento_percentual: "",
        desdobramento_responsavel: "",
        desdobramento_prazo_inicio: "",
        desdobramento_prazo_fim: "",
        chamados_glpi: "",
      });
      continue;
    }
    for (const d of m.desdobramentos) {
      rows.push({
        ano: m.ano,
        meta_titulo: m.titulo,
        meta_status: m.status,
        meta_prazo: m.prazo ? m.prazo.toISOString().slice(0, 10) : "",
        desdobramento_titulo: d.titulo,
        desdobramento_status: d.status,
        desdobramento_percentual: d.percentualConcluido,
        desdobramento_responsavel: d.responsavel ?? "",
        desdobramento_prazo_inicio: d.prazoInicio ? d.prazoInicio.toISOString().slice(0, 10) : "",
        desdobramento_prazo_fim: d.prazoFim ? d.prazoFim.toISOString().slice(0, 10) : "",
        chamados_glpi: d.chamados
          .map((c) => `#${c.glpiChamado.glpiTicketId} ${c.glpiChamado.titulo}`)
          .join(" | "),
      });
    }
  }

  if (formato === "ods") {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Metas");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "ods" });
    return new NextResponse(buf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.oasis.opendocument.spreadsheet",
        "Content-Disposition": `attachment; filename=metas-${ano}.ods`,
      },
    });
  }

  const headers = [
    "ano",
    "meta_titulo",
    "meta_status",
    "meta_prazo",
    "desdobramento_titulo",
    "desdobramento_status",
    "desdobramento_percentual",
    "desdobramento_responsavel",
    "desdobramento_prazo_inicio",
    "desdobramento_prazo_fim",
    "chamados_glpi",
  ];
  const lines = [headers.join(";")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(";"));
  }
  const csv = "\ufeff" + lines.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=metas-${ano}.csv`,
    },
  });
}
