import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRecurso } from "@/lib/permissions";
import { Prisma } from "@prisma/client";
import { PerfilUsuario, RecursoPermissao, TipoAnexo } from "@prisma/client";
import { getStorage } from "@/server/storage";
import { randomUUID } from "crypto";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; lid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const ok = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CUSTOMIZACAO, "editar");
  if (!ok) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });
  const { id: contratoId, lid } = await params;
  const l = await prisma.lancamentoUst.findFirst({
    where: { id: lid, contratoId },
    include: { anexoEvidencia: true },
  });
  if (!l) return NextResponse.json({ message: "Lançamento não encontrado" }, { status: 404 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json({ message: "Envie um arquivo (campo 'file')" }, { status: 400 });
    }

    if (l.anexoEvidencia) {
      await prisma.anexo.delete({ where: { id: l.anexoEvidencia.id } });
    }

    const key = randomUUID();
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";
    const nomeOriginal = file.name || "arquivo";
    const storage = getStorage();
    const { url } = await storage.save(key, buffer, { mimeType, nomeOriginal });

    const anexo = await prisma.anexo.create({
      data: {
        contratoId,
        lancamentoUstId: lid,
        nomeArquivo: key,
        nomeOriginal,
        mimeType,
        tamanhoBytes: file.size,
        urlArquivo: url,
        tipoAnexo: TipoAnexo.EVIDENCIA_UST,
        descricao: `Evidência UST — ${nomeOriginal}`,
        enviadoPorUsuarioId: session.id,
      },
    });
    return NextResponse.json(anexo);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        {
          message:
            "Conflito: já existe registro vinculado a este lançamento. Atualize a página e tente novamente.",
        },
        { status: 409 }
      );
    }
    console.error(e);
    return NextResponse.json({ message: "Erro no upload" }, { status: 500 });
  }
}
