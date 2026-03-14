import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { importarPlanilhaXLSX } from "@/server/importers/xlsx-importer";

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const url = formData.get("url") as string | null;
    const contratoId = formData.get("contratoId") as string | null;

    if (!contratoId) {
      return NextResponse.json(
        { message: "Selecione o contrato de destino" },
        { status: 400 }
      );
    }

    let buffer: Buffer;
    if (url && isValidUrl(url.trim())) {
      const res = await fetch(url.trim(), { cache: "no-store" });
      if (!res.ok) {
        return NextResponse.json(
          { message: `Falha ao baixar planilha: ${res.status}` },
          { status: 400 }
        );
      }
      const ab = await res.arrayBuffer();
      buffer = Buffer.from(ab);
    } else if (file && file.size > 0) {
      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      return NextResponse.json(
        { message: "Envie o arquivo .xlsx/.xls ou informe a URL da planilha" },
        { status: 400 }
      );
    }

    const result = await importarPlanilhaXLSX(buffer, contratoId, session.id);
    return NextResponse.json(result);
  } catch (e) {
    console.error("Import error:", e);
    return NextResponse.json(
      { message: "Erro ao importar planilha" },
      { status: 500 }
    );
  }
}
