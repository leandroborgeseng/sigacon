import { StatusProjeto } from "@prisma/client";
import { z } from "zod";

export const projetoSchema = z.object({
  nome: z.string().min(3).max(300),
  descricao: z.string().max(8000).optional().nullable(),
  status: z.nativeEnum(StatusProjeto).optional(),
  inicioPrevisto: z.coerce.date().optional().nullable(),
  fimPrevisto: z.coerce.date().optional().nullable(),
});

export const projetoTarefaSchema = z.object({
  projetoId: z.string().min(1),
  titulo: z.string().min(3).max(300),
  descricao: z.string().max(8000).optional().nullable(),
  status: z.nativeEnum(StatusProjeto).optional(),
  responsavel: z.string().max(200).optional().nullable(),
  prazo: z.coerce.date().optional().nullable(),
  glpiChamadoId: z.string().optional().nullable(),
});
