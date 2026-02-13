import { describe, it, expect } from "vitest";
import { TradeExecutor } from "../src/execution";
import type { StrategyDSL } from "../src/schemas";

const sampleStrategy: StrategyDSL = {
  pair: "ETH/USDC",
  conditions: [{ type: "price_below", value: 3000 }],
  actions: [{ type: "swap", amount_usdc: 100, direction: "buy" }],
  controls: {
    max_slippage_bps: 50,
    approval_mode: "auto",
    expires_in_minutes: 60,
  },
};

describe("Trade Executor", () => {
  it("executes a simulated trade successfully", async () => {
    const executor = new TradeExecutor({ simulate: true });
    const result = await executor.execute(sampleStrategy);

    expect(result.success).toBe(true);
    expect(result.tx_hash).toBeTruthy();
    expect(result.tx_hash!.startsWith("0x")).toBe(true);
  });

  it("produces unique tx hashes per execution", async () => {
    const executor = new TradeExecutor({ simulate: true });
    const r1 = await executor.execute(sampleStrategy);
    const r2 = await executor.execute(sampleStrategy);

    expect(r1.tx_hash).not.toBe(r2.tx_hash);
  });

  it("fails for strategy with no actions", async () => {
    const executor = new TradeExecutor({ simulate: true });
    const result = await executor.execute({
      ...sampleStrategy,
      actions: [],
    } as unknown as StrategyDSL);

    expect(result.success).toBe(false);
    expect(result.error).toContain("No actions");
  });

  it("defaults to simulation mode", async () => {
    const executor = new TradeExecutor();
    const result = await executor.execute(sampleStrategy);
    expect(result.success).toBe(true);
  });
});
