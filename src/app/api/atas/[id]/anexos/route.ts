import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/server/storage";
import { randomUUID } from "crypto";
import { TipoAnexo } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id: ataId } = await params;
  const ata = await prisma.ataReuniao.findUnique({
    where: { id: ataId },
    select: { id: true, contratoId: true },
  });
  if (!ata) return NextResponse.json({ message: "Ata não encontrada" }, { status: 404 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { message: "Envie um arquivo (campo 'file')" },
        { status: 400 }
      );
    }

    const key = randomUUID();
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";
    const nomeOriginal = file.name || "arquivo";

    const storage = getStorage();
    const { url } = await storage.save(key, buffer, {
      mimeType,
      nomeOriginal,
    });

    const tipoAnexo = (formData.get("tipoAnexo") as TipoAnexo) || TipoAnexo.DOCUMENTO_COMPLEMENTAR;
    const descricao = (formData.get("descricao") as string) || null;

    const anexo = await prisma.anexo.create({
      data: {
        contratoId: ata.contratoId,
        ataReuniaoId: ataId,
        nomeArquivo: key,
        nomeOriginal,
        mimeType,
        tamanhoBytes: file.size,
        urlArquivo: url,
        tipoAnexo,
        descricao,
        enviadoPorUsuarioId: session.id,
      },
    });
    return NextResponse.json(anexo);
  } catch (e) {
    console.error("Upload anexo ata error:", e);
    return NextResponse.json(
      { message: "Erro ao enviar anexo" },
      { status: 500 }
    );
  }
}
