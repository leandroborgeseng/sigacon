import { z } from "zod";
import { UnidadeMedicaoCatalogo } from "@prisma/client";

export const servicoCatalogoSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional().nullable(),
  unidadeMedicao: z.nativeEnum(UnidadeMedicaoCatalogo),
  valorUnitario: z.coerce.number().min(0),
  slaTexto: z.string().max(500).optional().nullable(),
  formaComprovacao: z.string().optional().nullable(),
  ustReferencia: z.coerce.number().min(0).optional().nullable(),
  ativo: z.boolean().optional(),
  ordem: z.coerce.number().int().optional(),
});

const complexidadeUst = z.enum(["Baixa", "Média", "Alta"]);

export const tipoAtividadeUstSchema = z.object({
  nome: z.string().min(1),
  categoria: z.string().min(1).max(160),
  complexidade: complexidadeUst.optional().nullable(),
  ustFixo: z.coerce.number().positive(),
  ativo: z.boolean().optional(),
  ordem: z.coerce.number().int().optional(),
});

export const lancamentoUstCreateSchema = z.object({
  tipoAtividadeUstId: z.string().cuid(),
  servicoCatalogoId: z.string().cuid().optional().nullable(),
  competenciaAno: z.coerce.number().int().min(2000).max(2100),
  competenciaMes: z.coerce.number().int().min(1).max(12),
  quantidade: z.coerce.number().int().min(1).default(1),
  evidenciaGlpiTicketId: z.string().max(80).optional().nullable(),
  evidenciaUrl: z
    .string()
    .max(2000)
    .optional()
    .nullable()
    .refine((s) => !s || s.length === 0 || /^https?:\/\//i.test(s), { message: "URL inválida" }),
  evidenciaDescricao: z.string().optional().nullable(),
  medicaoMensalId: z.string().cuid().optional().nullable(),
});

export const lancamentoUstUpdateSchema = lancamentoUstCreateSchema.partial().extend({
  quantidade: z.coerce.number().int().min(1).optional(),
  servicoCatalogoId: z.string().cuid().nullable().optional(),
});
