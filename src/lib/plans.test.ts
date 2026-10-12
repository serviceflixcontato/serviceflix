import { describe, expect, it } from "vitest";
import { customPlanTotal } from "./plans";
describe("plano personalizado", () => {
  it("diária R$ 500 × 5 dias = R$ 2.500", () => {
    expect(customPlanTotal(50000, 5)).toBe(250000);
  });
});
