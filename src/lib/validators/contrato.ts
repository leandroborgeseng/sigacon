import { z } from "zod";
import { StatusContrato, FormaCalculoMedicao } from "@prisma/client";

export const contratoSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  numeroContrato: z.string().min(1, "Número do contrato obrigatório"),
  fornecedor: z.string().min(1, "Fornecedor obrigatório"),
  objeto: z.string().optional(),
  vigenciaInicio: z.coerce.date(),
  vigenciaFim: z.coerce.date(),
  valorAnual: z.coerce.number().positive("Valor anual deve ser positivo"),
  valorMensalReferencia: z.coerce.number().optional(),
  status: z.nativeEnum(StatusContrato),
  gestorContrato: z.string().optional(),
  observacoesGerais: z.string().optional(),
  formaCalculoMedicao: z.nativeEnum(FormaCalculoMedicao).default(FormaCalculoMedicao.PESO_IGUAL_POR_ITEM),
});

export type ContratoInput = z.infer<typeof contratoSchema>;
