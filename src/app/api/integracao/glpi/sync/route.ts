import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { glpiEstaConfigurado } from "@/lib/glpi-config";
import { sincronizarChamadosGlpi, sincronizarChamadosGlpiAutomatico } from "@/server/services/glpi-sync";
import { sincronizarUsuariosGlpiCache } from "@/server/services/glpi-users-sync";
import { processarAlertasGlpiChamados } from "@/server/services/glpi-alertas";

/**
 * POST: busca tickets no GLPI e atualiza o cache local.
 * Com contrato: grupos técnicos vinculados (OR); senão grupos, fornecedor no título.
 * Sem contrato: termoTitulo no título.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    contratoId?: string;
    termoTitulo?: string;
    automatico?: boolean;
    maxRetries?: number;
    incremental?: boolean;
    sincronizarUsuarios?: boolean;
    processarAlertas?: boolean;
  };
  const autoHeader = request.headers.get("x-glpi-sync-secret")?.trim();
  const autoSecret = process.env.GLPI_SYNC_SECRET?.trim();
  const isAuto = body.automatico === true || (autoSecret && autoHeader === autoSecret);

  if (!isAuto) {
    const session = await getSession();
    if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    const pode = await canRecurso(
      session.perfil as PerfilUsuario,
      RecursoPermissao.CUSTOMIZACAO,
      "visualizar"
    );
    if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });
  } else if (!autoSecret || autoHeader !== autoSecret) {
    return NextResponse.json({ message: "Sync automático não autorizado (segredo inválido)." }, { status: 401 });
  }

  if (!(await glpiEstaConfigurado())) {
    return NextResponse.json(
      { message: "Configure o GLPI em Configuração GLPI ou GLPI_URL, GLPI_APP_TOKEN e GLPI_USER_TOKEN" },
      { status: 503 }
    );
  }

  try {
    const inicio = new Date();
    const resultChamados = isAuto
      ? await sincronizarChamadosGlpiAutomatico({
          contratoId: body.contratoId,
          maxRetries: body.maxRetries,
          incremental: body.incremental ?? true,
        })
      : await sincronizarChamadosGlpi({
          contratoId: body.contratoId,
          termoTitulo: body.termoTitulo,
        });
    const deveSyncUsuarios = body.sincronizarUsuarios ?? isAuto;
    const resultUsuarios = deveSyncUsuarios
      ? await sincronizarUsuariosGlpiCache({ forcar: Boolean(isAuto) })
      : null;
    const deveProcessarAlertas = body.processarAlertas ?? isAuto;
    const resultAlertas = deveProcessarAlertas ? await processarAlertasGlpiChamados() : null;
    const fim = new Date();
    await prisma.glpiSyncStatus.upsert({
      where: { chave: "chamados_glpi" },
      create: {
        chave: "chamados_glpi",
        ultimoInicioEm: inicio,
        ultimoFimEm: fim,
        ultimoSucessoEm: resultChamados.erros.length === 0 ? fim : null,
        ultimoErro: resultChamados.erros.length ? resultChamados.erros.slice(0, 5).join(" | ") : null,
        ultimoProcessados: resultChamados.processados,
        ultimoErrosContagem: resultChamados.erros.length,
        ultimaDuracaoMs: Math.max(0, fim.getTime() - inicio.getTime()),
      },
      update: {
        ultimoInicioEm: inicio,
        ultimoFimEm: fim,
        ...(resultChamados.erros.length === 0 ? { ultimoSucessoEm: fim } : {}),
        ultimoErro: resultChamados.erros.length ? resultChamados.erros.slice(0, 5).join(" | ") : null,
        ultimoProcessados: resultChamados.processados,
        ultimoErrosContagem: resultChamados.erros.length,
        ultimaDuracaoMs: Math.max(0, fim.getTime() - inicio.getTime()),
      },
    });
    return NextResponse.json({
      ...resultChamados,
      usuarios: resultUsuarios,
      alertas: resultAlertas,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Erro na sincronização" },
      { status: 500 }
    );
  }
}
