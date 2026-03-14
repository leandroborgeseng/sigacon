import { z } from "zod";

export const ataReuniaoSchema = z.object({
  contratoId: z.string().cuid(),
  medicaoMensalId: z.string().cuid().optional().nullable(),
  titulo: z.string().min(1, "Título obrigatório"),
  dataReuniao: z.coerce.date(),
  local: z.string().optional(),
  participantes: z.string().optional(),
  resumo: z.string().optional(),
  deliberacoes: z.string().optional(),
});

export type AtaReuniaoInput = z.infer<typeof ataReuniaoSchema>;
