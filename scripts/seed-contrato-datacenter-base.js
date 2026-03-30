/**
 * Garante um contrato tipo DATACENTER com as 8 linhas de recurso previstas (sem quantidade/valor obrigatórios).
 *
 * Uso:
 *   - Atualizar um contrato existente (recomendado para “o contrato atual”):
 *       DATABASE_URL="..." SEED_CONTRATO_ID="clxxx..." node scripts/seed-contrato-datacenter-base.js
 *
 *   - Criar (ou atualizar) por número de contrato padrão:
 *       DATABASE_URL="..." node scripts/seed-contrato-datacenter-base.js
 *
 * Variáveis opcionais:
 *   SEED_DC_NUMERO      — número do contrato (default: DC-BASE-MEDICAO-001)
 *   SEED_DC_NOME        — nome ao criar/atualizar título
 *   SEED_DC_FORNECEDOR  — fornecedor ao criar
 *
 * Rode após `prisma migrate deploy` (enum e tabelas de datacenter precisam existir).
 */
const {
  PrismaClient,
  StatusContrato,
  TipoContrato,
  TipoRecursoDatacenter,
} = require("@prisma/client");

const prisma = new PrismaClient();

const ORDEM_TIPOS = [
  TipoRecursoDatacenter.COLOCATION_RACK_U,
  TipoRecursoDatacenter.LICENCA_WINDOWS_SERVER_CORE,
  TipoRecursoDatacenter.LOCACAO_PROCESSADOR_VPS,
  TipoRecursoDatacenter.VPS_VCPU_COM_SQL_SERVER,
  TipoRecursoDatacenter.MEMORIA_RAM_GB,
  TipoRecursoDatacenter.DISCO_SSD_RAPIDO_GB,
  TipoRecursoDatacenter.DISCO_BACKUP_GB,
  TipoRecursoDatacenter.CONECTIVIDADE_FIBRA_OPTICA,
];

async function main() {
  const contratoIdEnv = process.env.SEED_CONTRATO_ID?.trim();
  const numero = process.env.SEED_DC_NUMERO?.trim() || "DC-BASE-MEDICAO-001";
  const nomePadrao =
    process.env.SEED_DC_NOME?.trim() || "Infraestrutura datacenter — base para medição";
  const fornecedor = process.env.SEED_DC_FORNECEDOR?.trim() || "A definir";

  let contrato;

  if (contratoIdEnv) {
    contrato = await prisma.contrato.findUnique({ where: { id: contratoIdEnv } });
    if (!contrato) {
      console.error("[seed-dc-base] Contrato não encontrado:", contratoIdEnv);
      process.exit(1);
    }
    contrato = await prisma.contrato.update({
      where: { id: contrato.id },
      data: {
        tipoContrato: TipoContrato.DATACENTER,
        ...(process.env.SEED_DC_NOME?.trim()
          ? { nome: process.env.SEED_DC_NOME.trim() }
          : {}),
      },
    });
    console.log("[seed-dc-base] Contrato atualizado para DATACENTER:", contrato.id, contrato.nome);
  } else {
    contrato = await prisma.contrato.findFirst({
      where: { numeroContrato: numero },
    });
    const agora = new Date();
    const fim = new Date(agora);
    fim.setFullYear(fim.getFullYear() + 1);

    if (!contrato) {
      contrato = await prisma.contrato.create({
        data: {
          nome: nomePadrao,
          numeroContrato: numero,
          fornecedor,
          objeto:
            "Serviços de datacenter — objeto alinhado às linhas do edital (colocation, licenças, VPS, armazenamentos, fibra). Base para medição mensal.",
          vigenciaInicio: agora,
          vigenciaFim: fim,
          valorAnual: 1,
          valorMensalReferencia: null,
          status: StatusContrato.ATIVO,
          tipoContrato: TipoContrato.DATACENTER,
        },
      });
      console.log("[seed-dc-base] Contrato criado:", contrato.id, contrato.numeroContrato);
    } else {
      contrato = await prisma.contrato.update({
        where: { id: contrato.id },
        data: {
          tipoContrato: TipoContrato.DATACENTER,
          ...(process.env.SEED_DC_NOME?.trim()
            ? { nome: process.env.SEED_DC_NOME.trim() }
            : {}),
        },
      });
      console.log("[seed-dc-base] Contrato existente ajustado para DATACENTER:", contrato.id);
    }
  }

  await prisma.contratoDatacenter.upsert({
    where: { contratoId: contrato.id },
    create: { contratoId: contrato.id },
    update: {},
  });

  const existentes = await prisma.contratoDatacenterItemPrevisto.findMany({
    where: { contratoId: contrato.id },
    select: { tipo: true, quantidadeContratada: true, valorUnitarioMensal: true },
  });
  const porTipo = new Map(
    existentes.map((e) => [
      e.tipo,
      { quantidadeContratada: e.quantidadeContratada, valorUnitarioMensal: e.valorUnitarioMensal },
    ])
  );

  await prisma.contratoDatacenterItemPrevisto.deleteMany({ where: { contratoId: contrato.id } });
  await prisma.contratoDatacenterItemPrevisto.createMany({
    data: ORDEM_TIPOS.map((tipo) => {
      const prev = porTipo.get(tipo);
      return {
        contratoId: contrato.id,
        tipo,
        quantidadeContratada: prev?.quantidadeContratada ?? null,
        valorUnitarioMensal: prev?.valorUnitarioMensal ?? null,
      };
    }),
  });

  console.log(
    "[seed-dc-base] Itens previstos:",
    ORDEM_TIPOS.length,
    "(quantidades/valores preservados se já existiam)"
  );
  console.log("[seed-dc-base] OK — id:", contrato.id);
}

main()
  .catch((e) => {
    console.error("[seed-dc-base]", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
