import { describe, it, expect } from "vitest";
import { ReceiptLogger } from "../src/receipt";
import type { ParserOutput } from "../src/parser";
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

const sampleParserOutput: ParserOutput = {
  strategy_dsl: sampleStrategy,
  explanation: "Buy ETH when price drops below $3000",
  risk_notes: ["Market volatility is high"],
  parser_metadata: { model: "claude-custom", confidence: 0.85 },
};

describe("Receipt Logger", () => {
  it("builds a complete execution receipt", () => {
    const logger = new ReceiptLogger();
    const receipt = logger.buildReceipt({
      intentId: "test-intent-1",
      rawPrompt: "Buy ETH if it dips below 3k",
      parserOutput: sampleParserOutput,
      validatedStrategy: sampleStrategy,
      encryptedIntentPayload: "abcdef1234567890",
      payments: [
        {
          tool: "https://api.data.com/price",
          cost_usdc: 0.5,
          tx_hash: "0xabc",
          timestamp: new Date().toISOString(),
          status: "success",
        },
      ],
      reasonCodes: [
        {
          tool: "price_feed",
          cost_usdc: 0.5,
          budget_remaining_usdc: 9.5,
          decision: "proceed",
          reason: "Budget sufficient",
        },
      ],
      conditionsMet: true,
      executionTxHash: "0xdef",
      totalSpendUsdc: 100.5,
      status: "executed",
    });

    expect(receipt.intent_id).toBe("test-intent-1");
    expect(receipt.raw_user_prompt).toBe("Buy ETH if it dips below 3k");
    expect(receipt.parser_output.explanation).toContain("Buy ETH");
    expect(receipt.validated_strategy.pair).toBe("ETH/USDC");
    expect(receipt.encrypted_intent_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.payments).toHaveLength(1);
    expect(receipt.reason_codes).toHaveLength(1);
    expect(receipt.conditions_met).toBe(true);
    expect(receipt.execution_tx_hash).toBe("0xdef");
    expect(receipt.total_spend_usdc).toBe(100.5);
    expect(receipt.status).toBe("executed");
    expect(receipt.timestamp).toBeTruthy();
  });

  it("builds an aborted receipt", () => {
    const logger = new ReceiptLogger();
    const receipt = logger.buildReceipt({
      intentId: "test-intent-2",
      rawPrompt: "test",
      parserOutput: sampleParserOutput,
      validatedStrategy: sampleStrategy,
      encryptedIntentPayload: "payload",
      payments: [],
      reasonCodes: [],
      conditionsMet: false,
      executionTxHash: null,
      totalSpendUsdc: 0,
      status: "aborted",
    });

    expect(receipt.status).toBe("aborted");
    expect(receipt.execution_tx_hash).toBeNull();
    expect(receipt.conditions_met).toBe(false);
  });
});
