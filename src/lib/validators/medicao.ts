import { z } from "zod";

export const patchConsumoDatacenterSchema = z.object({
  consumoDatacenter: z.object({
    itens: z
      .array(
        z.object({
          itemPrevistoId: z.string().min(1),
          quantidadeUsada: z.coerce.number().min(0),
        })
      )
      .optional(),
    licencas: z
      .array(
        z.object({
          licencaId: z.string().min(1),
          quantidadeUsada: z.coerce.number().min(0),
        })
      )
      .optional(),
  }),
});

export type PatchConsumoDatacenterInput = z.infer<typeof patchConsumoDatacenterSchema>;
