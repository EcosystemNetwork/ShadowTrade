import { describe, it, expect } from "vitest";
import { checkRisk } from "../src/risk";
import type { RiskConfig } from "../src/risk";
import type { StrategyDSL } from "../src/schemas";

const defaultConfig: RiskConfig = {
  max_spend_usdc: 500,
  max_slippage_bps: 75,
  allowed_pairs: ["ETH/USDC", "BTC/USDC"],
  max_expires_minutes: 1440,
};

const validStrategy: StrategyDSL = {
  pair: "ETH/USDC",
  conditions: [{ type: "price_below", value: 3000 }],
  actions: [{ type: "swap", amount_usdc: 100, direction: "buy" }],
  controls: {
    max_slippage_bps: 50,
    approval_mode: "auto",
    expires_in_minutes: 60,
  },
};

describe("Risk Controls", () => {
  it("passes for a valid strategy", () => {
    const result = checkRisk(validStrategy, defaultConfig);
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("fails for disallowed pair", () => {
    const result = checkRisk(
      { ...validStrategy, pair: "SHIB/USDC" },
      defaultConfig
    );
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.includes("SHIB/USDC"))).toBe(true);
  });

  it("fails when total spend exceeds cap", () => {
    const result = checkRisk(
      {
        ...validStrategy,
        actions: [
          { type: "swap", amount_usdc: 300, direction: "buy" },
          { type: "swap", amount_usdc: 300, direction: "buy" },
        ],
      },
      defaultConfig
    );
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.includes("600"))).toBe(true);
  });

  it("fails when slippage exceeds max", () => {
    const result = checkRisk(
      {
        ...validStrategy,
        controls: { ...validStrategy.controls, max_slippage_bps: 100 },
      },
      defaultConfig
    );
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.includes("100"))).toBe(true);
  });

  it("fails when expiry exceeds max", () => {
    const result = checkRisk(
      {
        ...validStrategy,
        controls: { ...validStrategy.controls, expires_in_minutes: 2880 },
      },
      defaultConfig
    );
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.includes("2880"))).toBe(true);
  });

  it("collects multiple violations", () => {
    const result = checkRisk(
      {
        pair: "SHIB/USDC",
        conditions: [{ type: "price_below", value: 1 }],
        actions: [{ type: "swap", amount_usdc: 600, direction: "buy" }],
        controls: {
          max_slippage_bps: 100,
          approval_mode: "auto",
          expires_in_minutes: 2880,
        },
      },
      defaultConfig
    );
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(3);
  });
});
