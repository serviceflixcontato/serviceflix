import { describe, expect, it } from "vitest";
import { customPlanTotal, solarAdesao, solarAnnualTotal, solarMonthlyTotal } from "./plans";

describe("plano personalizado", () => {
  it("diária R$ 500 × 5 dias = R$ 2.500", () => {
    expect(customPlanTotal(50000, 5)).toBe(250000);
  });
});

describe("Flix Solar", () => {
  it("R$ 50 por painel × 10 painéis × 4 limpezas = R$ 2.000 no ano", () => {
    expect(solarAnnualTotal(5000, 10, 4)).toBe(200000);
  });
  it("adesão (1ª mensalidade) = 10 painéis × R$ 50 = R$ 500", () => {
    expect(solarAdesao(5000)).toBe(50000);
  });
  it("saldo de R$ 1.500 dividido em 11 parcelas de R$ 136,36", () => {
    expect(solarMonthlyTotal(5000, 10, 4)).toBe(13636);
  });
});
