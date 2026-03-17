import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { gerarTemplateItensXLSX } from "@/server/importers/xlsx-importer";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const buf = gerarTemplateItensXLSX();
  const body = new Uint8Array(buf);
  return new NextResponse(body, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=\"template-itens-avaliacao.xlsx\"",
      "Cache-Control": "no-store",
    },
  });
}

