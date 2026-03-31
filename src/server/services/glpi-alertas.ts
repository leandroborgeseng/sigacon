import { StatusAlerta, TipoAlertaGlpi } from "@prisma/client";
import { APP_BRAND } from "@/lib/branding";
import { prisma } from "@/lib/prisma";
import { enviarEmailAlerta } from "@/server/services/email-alerts";

type ProcessarAlertasResumo = {
  processados: number;
  abertosCriados: number;
  resolvidos: number;
  emailsEnviados: number;
  erros: string[];
};

function horasEntre(a: Date, b: Date): number {
  return Math.max(0, (b.getTime() - a.getTime()) / (1000 * 60 * 60));
}

async function garantirAlertaAberto(input: {
  chamadoId: string;
  tipo: TipoAlertaGlpi;
  titulo: string;
  descricao?: string;
}) {
  const aberto = await prisma.alertaGlpiChamado.findFirst({
    where: { chamadoId: input.chamadoId, tipo: input.tipo, status: StatusAlerta.ABERTO },
    select: { id: true },
  });
  if (aberto) {
    await prisma.alertaGlpiChamado.update({
      where: { id: aberto.id },
      data: { ultimaDeteccaoEm: new Date(), descricao: input.descricao ?? null },
    });
    return false;
  }

  await prisma.alertaGlpiChamado.create({
    data: {
      chamadoId: input.chamadoId,
      tipo: input.tipo,
      status: StatusAlerta.ABERTO,
      titulo: input.titulo,
      descricao: input.descricao ?? null,
      primeiraDeteccaoEm: new Date(),
      ultimaDeteccaoEm: new Date(),
    },
  });
  return true;
}

async function resolverAlertasNaoAplicaveis(chamadoId: string, tiposParaManterAbertos: TipoAlertaGlpi[]) {
  const abertos = await prisma.alertaGlpiChamado.findMany({
    where: { chamadoId, status: StatusAlerta.ABERTO },
    select: { id: true, tipo: true },
  });
  const paraResolver = abertos.filter((a) => !tiposParaManterAbertos.includes(a.tipo));
  if (paraResolver.length === 0) return 0;
  await prisma.alertaGlpiChamado.updateMany({
    where: { id: { in: paraResolver.map((a) => a.id) } },
    data: { status: StatusAlerta.RESOLVIDO, resolvidoEm: new Date() },
  });
  return paraResolver.length;
}

async function notificarAlertasAbertosNovos(): Promise<{ enviados: number; erros: string[] }> {
  const cfg = await prisma.configAlertaGlpi.findUnique({ where: { id: "default" } });
  if (!cfg?.notificarPorEmail) return { enviados: 0, erros: [] };

  const destinatarios = await prisma.usuario.findMany({
    where: { ativo: true, perfil: { in: ["ADMIN", "GESTOR"] } },
    select: { email: true },
  });
  const emails = [...new Set(destinatarios.map((d) => d.email.trim().toLowerCase()).filter(Boolean))];
  if (emails.length === 0) return { enviados: 0, erros: ["Sem destinatários internos ativos para alertas"] };

  const pendentes = await prisma.alertaGlpiChamado.findMany({
    where: { status: StatusAlerta.ABERTO, emailEnviadoEm: null },
    include: {
      chamado: {
        select: {
          glpiTicketId: true,
          titulo: true,
          tecnicoResponsavelNome: true,
          tecnicoResponsavelIdGlpi: true,
        },
      },
    },
    take: 50,
    orderBy: { primeiraDeteccaoEm: "asc" },
  });

  let enviados = 0;
  const erros: string[] = [];
  for (const alerta of pendentes) {
    const emailsDinamicos = new Set<string>(emails);
    if (alerta.chamado.tecnicoResponsavelIdGlpi) {
      const tecnico = await prisma.glpiUsuarioCache.findUnique({
        where: { id: alerta.chamado.tecnicoResponsavelIdGlpi },
        select: { email: true },
      });
      if (tecnico?.email?.trim()) emailsDinamicos.add(tecnico.email.trim().toLowerCase());
    }

    const subject = `[${APP_BRAND.name}][ALERTA] Ticket #${alerta.chamado.glpiTicketId} - ${alerta.titulo}`;
    const text = [
      `Alerta: ${alerta.titulo}`,
      `Ticket GLPI: #${alerta.chamado.glpiTicketId}`,
      `Título do ticket: ${alerta.chamado.titulo}`,
      `Técnico atual: ${alerta.chamado.tecnicoResponsavelNome ?? "(sem atribuição)"}`,
      `Descrição do alerta: ${alerta.descricao ?? "-"}`,
    ].join("\n");

    const envio = await enviarEmailAlerta({ to: [...emailsDinamicos], subject, text });
    if (!envio.ok) {
      erros.push(`Alerta ${alerta.id}: ${envio.detail ?? "falha no envio"}`);
      continue;
    }

    await prisma.alertaGlpiChamado.update({
      where: { id: alerta.id },
      data: { emailEnviadoEm: new Date() },
    });
    enviados++;
  }

  return { enviados, erros };
}

export async function processarAlertasGlpiChamados(): Promise<ProcessarAlertasResumo> {
  const cfg =
    (await prisma.configAlertaGlpi.findUnique({ where: { id: "default" } })) ||
    (await prisma.configAlertaGlpi.create({ data: { id: "default" } }));

  if (!cfg.ativo) {
    return { processados: 0, abertosCriados: 0, resolvidos: 0, emailsEnviados: 0, erros: [] };
  }

  const whereChamados = cfg.somenteChamadosAbertos
    ? { statusGlpi: { in: [1, 2, 3, 4] as number[] } }
    : {};

  const chamados = await prisma.glpiChamado.findMany({
    where: whereChamados,
    select: {
      id: true,
      glpiTicketId: true,
      titulo: true,
      tecnicoResponsavelIdGlpi: true,
      dataAbertura: true,
      statusGlpi: true,
    },
    take: 5000,
  });

  let processados = 0;
  let abertosCriados = 0;
  let resolvidos = 0;
  const erros: string[] = [];
  const agora = new Date();

  for (const c of chamados) {
    processados++;
    const tiposAtivos: TipoAlertaGlpi[] = [];

    if (!c.tecnicoResponsavelIdGlpi) {
      const created = await garantirAlertaAberto({
        chamadoId: c.id,
        tipo: TipoAlertaGlpi.SEM_ATRIBUICAO,
        titulo: "Chamado sem atribuição",
        descricao: `Ticket #${c.glpiTicketId} está sem técnico responsável definido.`,
      });
      if (created) abertosCriados++;
      tiposAtivos.push(TipoAlertaGlpi.SEM_ATRIBUICAO);
    }

    if (c.dataAbertura && [1, 2, 3, 4].includes(c.statusGlpi)) {
      const h = horasEntre(c.dataAbertura, agora);
      if (h > cfg.prazoSlaHorasPadrao) {
        const created = await garantirAlertaAberto({
          chamadoId: c.id,
          tipo: TipoAlertaGlpi.SLA_ESTOURADO,
          titulo: "Chamado com SLA estourado",
          descricao: `Ticket #${c.glpiTicketId} com ${h.toFixed(1)}h desde abertura (limite ${cfg.prazoSlaHorasPadrao}h).`,
        });
        if (created) abertosCriados++;
        tiposAtivos.push(TipoAlertaGlpi.SLA_ESTOURADO);
      }
    }

    resolvidos += await resolverAlertasNaoAplicaveis(c.id, tiposAtivos);
  }

  const emailRes = await notificarAlertasAbertosNovos();
  erros.push(...emailRes.erros);

  await prisma.glpiSyncStatus.upsert({
    where: { chave: "alertas_glpi" },
    create: {
      chave: "alertas_glpi",
      ultimoInicioEm: agora,
      ultimoFimEm: new Date(),
      ultimoSucessoEm: erros.length === 0 ? new Date() : null,
      ultimoErro: erros.length ? erros.slice(0, 5).join(" | ") : null,
      ultimoProcessados: processados,
      ultimoErrosContagem: erros.length,
      ultimaDuracaoMs: 0,
    },
    update: {
      ultimoInicioEm: agora,
      ultimoFimEm: new Date(),
      ...(erros.length === 0 ? { ultimoSucessoEm: new Date() } : {}),
      ultimoErro: erros.length ? erros.slice(0, 5).join(" | ") : null,
      ultimoProcessados: processados,
      ultimoErrosContagem: erros.length,
      ultimaDuracaoMs: 0,
    },
  });

  return { processados, abertosCriados, resolvidos, emailsEnviados: emailRes.enviados, erros };
}
