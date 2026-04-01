import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TipoContrato } from "@prisma/client";
import { importarPlanilhaXLSX } from "@/server/importers/xlsx-importer";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const contratoId = formData.get("contratoId") as string | null;

    if (!contratoId) {
      return NextResponse.json(
        { message: "Selecione o contrato de destino" },
        { status: 400 }
      );
    }

    const contratoDestino = await prisma.contrato.findUnique({
      where: { id: contratoId },
      select: { id: true, tipoContrato: true },
    });
    if (!contratoDestino) {
      return NextResponse.json({ message: "Contrato não encontrado" }, { status: 404 });
    }
    if (contratoDestino.tipoContrato === TipoContrato.DATACENTER) {
      return NextResponse.json(
        {
          message:
            "Importação por planilha não se aplica a contratos datacenter (sem módulos/itens deste tipo).",
        },
        { status: 400 }
      );
    }

    if (!file || file.size === 0) {
      return NextResponse.json(
        { message: "Envie o arquivo .xlsx/.xls" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

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
