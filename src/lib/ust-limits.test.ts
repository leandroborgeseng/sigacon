import { describe, it, expect } from "vitest";
import { validarLimitesUst } from "./ust-limits";

describe("validarLimitesUst", () => {
  it("permite quando sem limites", () => {
    expect(
      validarLimitesUst({
        limiteUstAno: null,
        limiteValorUstAno: null,
        ustAtualAno: 100,
        valorAtualAno: 5000,
        ustAdicionar: 50,
        valorAdicionar: 2000,
      })
    ).toEqual({ ok: true });
  });

  it("bloqueia UST acima do teto", () => {
    const r = validarLimitesUst({
      limiteUstAno: 100,
      limiteValorUstAno: null,
      ustAtualAno: 90,
      valorAtualAno: 0,
      ustAdicionar: 20,
      valorAdicionar: 0,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("UST");
  });

  it("ignora limite UST zero ou inválido", () => {
    expect(
      validarLimitesUst({
        limiteUstAno: 0,
        limiteValorUstAno: null,
        ustAtualAno: 0,
        valorAtualAno: 0,
        ustAdicionar: 9999,
        valorAdicionar: 0,
      })
    ).toEqual({ ok: true });
  });

  it("bloqueia valor R$ acima do teto", () => {
    const r = validarLimitesUst({
      limiteUstAno: null,
      limiteValorUstAno: 10000,
      ustAtualAno: 0,
      valorAtualAno: 9500,
      ustAdicionar: 0,
      valorAdicionar: 600,
    });
    expect(r.ok).toBe(false);
  });
});
