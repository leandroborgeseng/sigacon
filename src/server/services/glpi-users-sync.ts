import { prisma } from "@/lib/prisma";
import { glpiListUsersPage, glpiWithSession } from "@/lib/glpi-client";

type SyncUsuariosResumo = {
  processados: number;
  erros: string[];
  pulado: boolean;
  motivoPulo?: string;
  duracaoMs: number;
};

const SYNC_CHAVE = "usuarios_glpi";

function normalizarBusca(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

async function registrarStatus(input: {
  inicio: Date;
  fim: Date;
  processados: number;
  erros: string[];
}) {
  await prisma.glpiSyncStatus.upsert({
    where: { chave: SYNC_CHAVE },
    create: {
      chave: SYNC_CHAVE,
      ultimoInicioEm: input.inicio,
      ultimoFimEm: input.fim,
      ultimoSucessoEm: input.erros.length === 0 ? input.fim : null,
      ultimoErro: input.erros.length ? input.erros.slice(0, 5).join(" | ") : null,
      ultimoProcessados: input.processados,
      ultimoErrosContagem: input.erros.length,
      ultimaDuracaoMs: Math.max(0, input.fim.getTime() - input.inicio.getTime()),
    },
    update: {
      ultimoInicioEm: input.inicio,
      ultimoFimEm: input.fim,
      ...(input.erros.length === 0 ? { ultimoSucessoEm: input.fim } : {}),
      ultimoErro: input.erros.length ? input.erros.slice(0, 5).join(" | ") : null,
      ultimoProcessados: input.processados,
      ultimoErrosContagem: input.erros.length,
      ultimaDuracaoMs: Math.max(0, input.fim.getTime() - input.inicio.getTime()),
    },
  });
}

export async function obterStatusSyncUsuariosGlpi() {
  return prisma.glpiSyncStatus.findUnique({ where: { chave: SYNC_CHAVE } });
}

export async function sincronizarUsuariosGlpiCache(input?: {
  forcar?: boolean;
  intervaloMinimoHoras?: number;
}): Promise<SyncUsuariosResumo> {
  const inicio = new Date();
  const erros: string[] = [];

  const intervalo = Math.max(1, input?.intervaloMinimoHoras ?? 24);
  const statusAtual = await prisma.glpiSyncStatus.findUnique({ where: { chave: SYNC_CHAVE } });
  if (!input?.forcar && statusAtual?.ultimoSucessoEm) {
    const horas = (Date.now() - statusAtual.ultimoSucessoEm.getTime()) / (1000 * 60 * 60);
    if (horas < intervalo) {
      return {
        processados: 0,
        erros: [],
        pulado: true,
        motivoPulo: `Sincronização recente (${horas.toFixed(1)}h atrás).`,
        duracaoMs: 0,
      };
    }
  }

  const vistos = new Set<number>();
  let processados = 0;

  try {
    await glpiWithSession(async (ctx) => {
      const pageSize = 200;
      for (let offset = 0; offset < 100000; offset += pageSize) {
        const page = await glpiListUsersPage(ctx, { offset, limit: pageSize });
        for (const u of page) {
          vistos.add(u.id);
          await prisma.glpiUsuarioCache.upsert({
            where: { id: u.id },
            create: {
              id: u.id,
              nome: u.name,
              nomeCompleto: u.fullName ?? null,
              login: u.login ?? null,
              email: u.email ?? null,
              nomeBusca: normalizarBusca(u.name),
              ativo: true,
              sincronizadoEm: new Date(),
            },
            update: {
              nome: u.name,
              nomeCompleto: u.fullName ?? null,
              login: u.login ?? null,
              email: u.email ?? null,
              nomeBusca: normalizarBusca(u.name),
              ativo: true,
              sincronizadoEm: new Date(),
            },
          });
          processados++;
        }
        if (page.length < pageSize) break;
      }
    });

    if (vistos.size > 0) {
      await prisma.glpiUsuarioCache.updateMany({
        where: { id: { notIn: [...vistos] } },
        data: { ativo: false, sincronizadoEm: new Date() },
      });
    }
  } catch (e) {
    erros.push(e instanceof Error ? e.message : String(e));
  }

  const fim = new Date();
  await registrarStatus({ inicio, fim, processados, erros });

  return {
    processados,
    erros,
    pulado: false,
    duracaoMs: Math.max(0, fim.getTime() - inicio.getTime()),
  };
}
