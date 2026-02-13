import { describe, it, expect } from "vitest";
import { validateStrategy } from "../src/validation";
import type { ValidationLimits } from "../src/validation";

const defaultLimits: ValidationLimits = {
  allowed_pairs: ["ETH/USDC", "BTC/USDC"],
  max_spend_usdc: 500,
  max_slippage_bps: 75,
};

const validDSL = {
  pair: "ETH/USDC",
  conditions: [{ type: "price_below" as const, value: 3000 }],
  actions: [{ type: "swap" as const, amount_usdc: 100, direction: "buy" as const }],
  controls: {
    max_slippage_bps: 50,
    approval_mode: "auto" as const,
    expires_in_minutes: 60,
  },
};

describe("Validation & Enforcement Layer", () => {
  it("accepts a valid strategy within limits", () => {
    const result = validateStrategy(validDSL, defaultLimits);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.strategy).toBeTruthy();
  });

  it("rejects a pair not in allowlist", () => {
    const result = validateStrategy(
      { ...validDSL, pair: "DOGE/USDC" },
      defaultLimits
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("DOGE/USDC"))).toBe(true);
  });

  it("rejects spend exceeding hard cap", () => {
    const result = validateStrategy(
      {
        ...validDSL,
        actions: [{ type: "swap", amount_usdc: 600, direction: "buy" }],
      },
      defaultLimits
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("600"))).toBe(true);
  });

  it("clamps slippage above hard max", () => {
    const result = validateStrategy(
      {
        ...validDSL,
        controls: { ...validDSL.controls, max_slippage_bps: 100 },
      },
      defaultLimits
    );
    expect(result.valid).toBe(true);
    expect(result.strategy!.controls.max_slippage_bps).toBe(75);
    expect(result.clamped.length).toBeGreaterThan(0);
  });

  it("rejects invalid schema input", () => {
    const result = validateStrategy({ garbage: true }, defaultLimits);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects null input", () => {
    const result = validateStrategy(null, defaultLimits);
    expect(result.valid).toBe(false);
  });
});
