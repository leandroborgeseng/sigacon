import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { importarContratosXLSX } from "@/server/importers/contratos-importer";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      return NextResponse.json(
        { message: "Envie o arquivo .xlsx/.xls" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await importarContratosXLSX(buffer, session.id);
    return NextResponse.json(result);
  } catch (e) {
    console.error("Import contratos error:", e);
    return NextResponse.json(
      { message: "Erro ao importar contratos" },
      { status: 500 }
    );
  }
}

