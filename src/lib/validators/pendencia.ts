import { z } from "zod";
import { StatusPendencia, OrigemPendencia, TipoPendencia } from "@prisma/client";

export const pendenciaSchema = z.object({
  itemId: z.string().cuid(),
  descricao: z.string().min(1, "Descrição obrigatória"),
  responsavel: z.string().optional(),
  prazo: z.coerce.date().optional(),
  status: z.nativeEnum(StatusPendencia).default(StatusPendencia.ABERTA),
  origem: z.nativeEnum(OrigemPendencia).optional(),
  tipo: z.nativeEnum(TipoPendencia).optional(),
});

export type PendenciaInput = z.infer<typeof pendenciaSchema>;
