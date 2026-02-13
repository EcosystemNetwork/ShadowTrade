import { describe, it, expect } from "vitest";
import { StrategyDSLSchema, ConditionTypeEnum, ActionTypeEnum } from "../src/schemas";

describe("Strategy DSL Schema", () => {
  const validStrategy = {
    pair: "ETH/USDC",
    conditions: [{ type: "price_below", value: 3000 }],
    actions: [{ type: "swap", amount_usdc: 100, direction: "buy" }],
    controls: {
      max_slippage_bps: 50,
      approval_mode: "auto",
      expires_in_minutes: 60,
    },
  };

  it("accepts a valid strategy", () => {
    const result = StrategyDSLSchema.safeParse(validStrategy);
    expect(result.success).toBe(true);
  });

  it("rejects missing pair", () => {
    const { pair, ...rest } = validStrategy;
    const result = StrategyDSLSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects empty conditions", () => {
    const result = StrategyDSLSchema.safeParse({
      ...validStrategy,
      conditions: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty actions", () => {
    const result = StrategyDSLSchema.safeParse({
      ...validStrategy,
      actions: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid condition type", () => {
    const result = StrategyDSLSchema.safeParse({
      ...validStrategy,
      conditions: [{ type: "invalid_type", value: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid action type", () => {
    const result = StrategyDSLSchema.safeParse({
      ...validStrategy,
      actions: [{ type: "limit_order", amount_usdc: 100, direction: "buy" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative slippage", () => {
    const result = StrategyDSLSchema.safeParse({
      ...validStrategy,
      controls: { ...validStrategy.controls, max_slippage_bps: -1 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects slippage above 500 bps", () => {
    const result = StrategyDSLSchema.safeParse({
      ...validStrategy,
      controls: { ...validStrategy.controls, max_slippage_bps: 501 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero expiry", () => {
    const result = StrategyDSLSchema.safeParse({
      ...validStrategy,
      controls: { ...validStrategy.controls, expires_in_minutes: 0 },
    });
    expect(result.success).toBe(false);
  });

  it("supports all condition types", () => {
    const types = ConditionTypeEnum.options;
    expect(types).toContain("price_below");
    expect(types).toContain("price_above");
    expect(types).toContain("funding_below");
    expect(types).toContain("funding_above");
    expect(types).toContain("volatility_above");
  });

  it("supports only swap action", () => {
    expect(ActionTypeEnum.options).toEqual(["swap"]);
  });

  it("accepts multiple conditions and actions", () => {
    const result = StrategyDSLSchema.safeParse({
      ...validStrategy,
      conditions: [
        { type: "price_below", value: 3000 },
        { type: "volatility_above", value: 0.5 },
      ],
      actions: [
        { type: "swap", amount_usdc: 100, direction: "buy" },
        { type: "swap", amount_usdc: 50, direction: "sell" },
      ],
    });
    expect(result.success).toBe(true);
  });
});
