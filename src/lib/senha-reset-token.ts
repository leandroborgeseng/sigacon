import { createHash, randomBytes } from "node:crypto";

export function gerarTokenResetSenha(): string {
  return randomBytes(32).toString("base64url");
}

export function hashTokenResetSenha(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
