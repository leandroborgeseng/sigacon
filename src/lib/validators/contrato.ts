import { z } from "zod";
import { StatusContrato, FormaCalculoMedicao, LeiLicitacao } from "@prisma/client";

/** Grupos técnicos GLPI vinculados ao contrato (filtro de chamados). */
export const glpiGruposTecnicosSchema = z.array(
  z.object({
    glpiGroupId: z.number().int().positive(),
    nome: z.string().max(500).optional().nullable(),
  })
);

export const contratoSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  numeroContrato: z.string().min(1, "Número do contrato obrigatório"),
  fornecedor: z.string().min(1, "Fornecedor obrigatório"),
  ativo: z.boolean().optional(),
  objeto: z.string().optional(),
  vigenciaInicio: z.coerce.date(),
  vigenciaFim: z.coerce.date(),
  valorAnual: z.coerce.number().positive("Valor anual deve ser positivo"),
  valorMensalReferencia: z.coerce.number().optional(),
  status: z.nativeEnum(StatusContrato),
  gestorContrato: z.string().optional(),
  observacoesGerais: z.string().optional(),
  formaCalculoMedicao: z.nativeEnum(FormaCalculoMedicao).default(FormaCalculoMedicao.PESO_IGUAL_POR_ITEM),
  leiLicitacao: z.nativeEnum(LeiLicitacao).default(LeiLicitacao.LEI_8666),
  dataAssinatura: z.coerce.date().optional().nullable(),
  numeroRenovacoes: z.coerce.number().int().min(0).default(0),
  /** R$ por UST (quando não há preço no catálogo por serviço) */
  valorUnitarioUst: z.coerce.number().min(0).optional().nullable(),
  limiteUstAno: z.coerce.number().min(0).optional().nullable(),
  limiteValorUstAno: z.coerce.number().min(0).optional().nullable(),
});

export const reajusteContratoSchema = z.object({
  dataReajuste: z.coerce.date(),
  valorAnterior: z.coerce.number().min(0),
  valorNovo: z.coerce.number().min(0),
  percentualAplicado: z.coerce.number(),
  indiceReferencia: z.string().max(50).optional().nullable(),
  observacao: z.string().optional().nullable(),
});

export type ContratoInput = z.infer<typeof contratoSchema>;
export type GlpiGruposTecnicosInput = z.infer<typeof glpiGruposTecnicosSchema>;
export type ReajusteContratoInput = z.infer<typeof reajusteContratoSchema>;
