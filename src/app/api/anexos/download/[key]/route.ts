import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getStorage } from "@/server/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { key } = await params;
  const storage = getStorage();
  const entry = await storage.get(key);
  if (!entry) return NextResponse.json({ message: "Arquivo não encontrado" }, { status: 404 });

  return new NextResponse(entry.buffer, {
    headers: {
      "Content-Type": entry.mimeType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
