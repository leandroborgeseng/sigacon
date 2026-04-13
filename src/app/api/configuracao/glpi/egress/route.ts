import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";

/**
 * IPv4 público de saída do app (útil para liberar no firewall do GLPI).
 * Não expõe segredos; requer sessão com permissão de customização.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const pode = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CUSTOMIZACAO,
    "visualizar"
  );
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  try {
    const ac = AbortSignal.timeout(8000);
    const r = await fetch("https://api.ipify.org?format=json", { signal: ac });
    if (!r.ok) {
      return NextResponse.json({ ip: null, message: `Serviço de IP retornou HTTP ${r.status}.` }, { status: 502 });
    }
    const j = (await r.json()) as { ip?: string };
    const ip = typeof j.ip === "string" && j.ip.trim() ? j.ip.trim() : null;
    return NextResponse.json({
      ip,
      message:
        ip != null
          ? "Peça à TI do GLPI para liberar este IPv4 no firewall/WAF como origem permitida (tráfego sai do provedor do app, ex.: Railway)."
          : "Não foi possível obter o IP.",
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ip: null, message: m.slice(0, 200) }, { status: 502 });
  }
}
