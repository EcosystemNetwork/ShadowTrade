import { describe, it, expect } from "vitest";
import { EconomicReasoningEngine } from "../src/economic";

describe("Economic Reasoning Engine", () => {
  it("allows purchase when budget is sufficient", () => {
    const engine = new EconomicReasoningEngine(10);
    expect(engine.shouldPurchase("price_feed", 1.5)).toBe(true);
  });

  it("rejects purchase when budget is insufficient", () => {
    const engine = new EconomicReasoningEngine(1);
    expect(engine.shouldPurchase("price_feed", 1.5)).toBe(false);
  });

  it("tracks remaining budget after spending", () => {
    const engine = new EconomicReasoningEngine(10);
    engine.shouldPurchase("price_feed", 1.5);
    engine.recordSpend(1.5);
    expect(engine.getBudgetRemaining()).toBe(8.5);
  });

  it("generates reason codes for decisions", () => {
    const engine = new EconomicReasoningEngine(5);
    engine.shouldPurchase("price_feed", 1.5);
    engine.shouldPurchase("volatility_feed", 10);

    const codes = engine.getReasonCodes();
    expect(codes).toHaveLength(2);
    expect(codes[0].decision).toBe("proceed");
    expect(codes[1].decision).toBe("skip");
  });

  it("reason code includes descriptive reason string", () => {
    const engine = new EconomicReasoningEngine(2);
    engine.shouldPurchase("volatility_feed", 1.5);

    const codes = engine.getReasonCodes();
    expect(codes[0].reason).toContain("$1.50");
    expect(codes[0].reason).toContain("$2.00");
  });

  it("correctly declines after budget exhaustion", () => {
    const engine = new EconomicReasoningEngine(3);
    expect(engine.shouldPurchase("feed_a", 2)).toBe(true);
    engine.recordSpend(2);
    expect(engine.shouldPurchase("feed_b", 2)).toBe(false);
  });
});
