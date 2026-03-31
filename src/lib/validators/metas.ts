import { StatusMeta } from "@prisma/client";
import { z } from "zod";

export const metaSchema = z.object({
  ano: z.coerce.number().int().min(2000).max(2100),
  titulo: z.string().min(3).max(400),
  descricao: z.string().max(8000).optional().nullable(),
  contextoOrigem: z.string().max(12000).optional().nullable(),
  status: z.nativeEnum(StatusMeta).optional(),
  prazo: z.coerce.date().optional().nullable(),
});

export const desdobramentoSchema = z.object({
  metaId: z.string().min(1),
  titulo: z.string().min(3).max(400),
  descricao: z.string().max(8000).optional().nullable(),
  responsavel: z.string().max(200).optional().nullable(),
  status: z.nativeEnum(StatusMeta).optional(),
  percentualConcluido: z.coerce.number().int().min(0).max(100).optional(),
  prazoInicio: z.coerce.date().optional().nullable(),
  prazoFim: z.coerce.date().optional().nullable(),
  glpiChamadoIds: z.array(z.string().min(1)).optional().default([]),
});

export type MetaInput = z.infer<typeof metaSchema>;
export type DesdobramentoInput = z.infer<typeof desdobramentoSchema>;
