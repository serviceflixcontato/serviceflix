import { describe, expect, it } from "vitest";
import { customPlanTotal } from "./plans";
describe("plano personalizado", () => {
  it("diária R$ 500 × 5 dias = R$ 2.500", () => {
    expect(customPlanTotal(50000, 5)).toBe(250000);
  });
});
import { solarAnnualTotal, solarMonthlyTotal } from "./plans";
describe("Flix Solar", () => {
  it("R$ 30 por painel × 10 painéis × 4 limpezas = R$ 1.200 no ano", () => {
    expect(solarAnnualTotal(3000, 10, 4)).toBe(120000);
  });
  it("mensalidade = total anual ÷ 12 (R$ 100)", () => {
    expect(solarMonthlyTotal(3000, 10, 4)).toBe(10000);
  });
});
