import { redirect } from "next/navigation";

/** Compatibilidade: rota antiga aponta para o novo módulo UST */
export default function CustomizacaoRedirectPage() {
  redirect("/execucao-tecnica");
}
