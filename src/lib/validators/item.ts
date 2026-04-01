import { z } from "zod";
import { StatusItem, Criticidade } from "@prisma/client";

export const itemContratualSchema = z.object({
  contratoId: z.string().cuid(),
  moduloId: z.string().cuid(),
  lote: z.string().default(""),
  numeroItem: z.coerce.number().int().positive(),
  descricao: z.string().min(1, "Descrição obrigatória"),
  statusAtual: z.nativeEnum(StatusItem),
  observacaoAtual: z.string().optional(),
  criticidade: z.nativeEnum(Criticidade).default(Criticidade.MEDIA),
  exigeEvidencia: z.boolean().default(false),
  requisitoLegal: z.boolean().default(false),
  impactaOperacao: z.boolean().default(false),
  cabecalhoLogico: z.boolean().default(false),
  considerarNaMedicao: z.boolean().default(true),
});

/** Payload para cadastro manual de item (API POST /api/itens). */
export const itemContratualCreateSchema = z.object({
  contratoId: z.string().min(1),
  moduloId: z.string().min(1),
  lote: z.string().optional().default(""),
  numeroItem: z.coerce.number().int().positive(),
  descricao: z.string().min(1, "Descrição obrigatória"),
  statusAtual: z.nativeEnum(StatusItem).optional().default(StatusItem.INCONCLUSIVO),
  observacaoAtual: z.string().optional().nullable(),
  criticidade: z.nativeEnum(Criticidade).optional().default(Criticidade.MEDIA),
  exigeEvidencia: z.boolean().optional().default(false),
  requisitoLegal: z.boolean().optional().default(false),
  impactaOperacao: z.boolean().optional().default(false),
  cabecalhoLogico: z.boolean().optional().default(false),
  considerarNaMedicao: z.boolean().optional().default(true),
});

export type ItemContratualCreateInput = z.infer<typeof itemContratualCreateSchema>;

export const avaliacaoItemSchema = z.object({
  itemId: z.string().cuid(),
  status: z.nativeEnum(StatusItem),
  observacao: z.string().optional(),
  competenciaAno: z.coerce.number().int().min(2020).max(2100),
  competenciaMes: z.coerce.number().int().min(1).max(12),
});

export type ItemContratualInput = z.infer<typeof itemContratualSchema>;
export type AvaliacaoItemInput = z.infer<typeof avaliacaoItemSchema>;
