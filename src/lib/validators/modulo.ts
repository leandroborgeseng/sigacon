import { z } from "zod";

export const moduloSchema = z.object({
  contratoId: z.string().cuid(),
  nome: z.string().min(1, "Nome obrigatório"),
  descricao: z.string().optional(),
  implantado: z.boolean().default(false),
  ativo: z.boolean().default(true),
});

export type ModuloInput = z.infer<typeof moduloSchema>;
