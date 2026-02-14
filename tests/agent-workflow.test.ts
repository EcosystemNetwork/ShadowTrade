import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AgentWorkflow } from "../src/workflow";
import type { ConditionChecker } from "../src/workflow";
import type { WorkflowConfig } from "../src/types";
import type { StrategyDSL } from "../src/schemas";
import type { ParserOutput } from "../src/parser";

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

const defaultConfig: WorkflowConfig = {
  parser_endpoint: "http://localhost:3000/parse",
  parser_timeout_ms: 5000,
  allowed_pairs: ["ETH/USDC"],
  max_spend_usdc_hard: 500,
  max_slippage_bps_hard: 100,
  budget_usdc: 1000,
};

describe("AgentWorkflow", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("completes a full successful workflow", async () => {
    // Mock parser endpoint
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(sampleParserOutput), { status: 200 })
    );

    const conditionChecker: ConditionChecker = {
      checkConditions: vi.fn().mockResolvedValue(true),
    };

    const workflow = new AgentWorkflow(defaultConfig);
    const result = await workflow.run("Buy ETH if it dips below 3k", conditionChecker);

    expect(result.receipt).toBeDefined();
    expect(result.receipt.status).toBe("executed");
    expect(result.receipt.conditions_met).toBe(true);
    expect(result.receipt.execution_tx_hash).toBeTruthy();
    expect(result.receipt.total_spend_usdc).toBe(100);
    expect(result.encryptedIntent).toBeDefined();
    expect(result.encryptedIntent.intent_id).toBeTruthy();
  });

  it("aborts when validation fails (disallowed pair)", async () => {
    const badStrategy: StrategyDSL = {
      ...sampleStrategy,
      pair: "DOGE/USDC", // Not in allowed_pairs
    };
    const badParserOutput: ParserOutput = {
      ...sampleParserOutput,
      strategy_dsl: badStrategy,
    };

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(badParserOutput), { status: 200 })
    );

    const conditionChecker: ConditionChecker = {
      checkConditions: vi.fn().mockResolvedValue(true),
    };

    const workflow = new AgentWorkflow(defaultConfig);
    const result = await workflow.run("Buy DOGE", conditionChecker);

    expect(result.receipt.status).toBe("aborted");
    expect(conditionChecker.checkConditions).not.toHaveBeenCalled();
  });

  it("expires when conditions are not met", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(sampleParserOutput), { status: 200 })
    );

    const conditionChecker: ConditionChecker = {
      checkConditions: vi.fn().mockResolvedValue(false),
    };

    const workflow = new AgentWorkflow(defaultConfig);
    const result = await workflow.run("Buy ETH if it dips below 3k", conditionChecker);

    expect(result.receipt.status).toBe("expired");
    expect(result.receipt.conditions_met).toBe(false);
    expect(result.receipt.execution_tx_hash).toBeNull();
    expect(result.encryptedIntent).toBeDefined();
  });

  it("aborts when validation rejects excessive slippage (clamped but spend exceeds cap)", async () => {
    // Strategy where the spend exceeds the hard cap - validation should reject
    const overSpendStrategy: StrategyDSL = {
      pair: "ETH/USDC",
      conditions: [{ type: "price_below", value: 3000 }],
      actions: [{ type: "swap", amount_usdc: 9999, direction: "buy" }],
      controls: {
        max_slippage_bps: 50,
        approval_mode: "auto",
        expires_in_minutes: 60,
      },
    };

    const parserOutput: ParserOutput = {
      ...sampleParserOutput,
      strategy_dsl: overSpendStrategy,
    };

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(parserOutput), { status: 200 })
    );

    const conditionChecker: ConditionChecker = {
      checkConditions: vi.fn().mockResolvedValue(true),
    };

    const workflow = new AgentWorkflow(defaultConfig);
    const result = await workflow.run("Buy a lot of ETH", conditionChecker);

    // Spend 9999 USDC exceeds hard cap of 500 USDC
    expect(result.receipt.status).toBe("aborted");
    expect(conditionChecker.checkConditions).not.toHaveBeenCalled();
  });

  it("encrypts and decrypts the strategy during workflow", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(sampleParserOutput), { status: 200 })
    );

    const conditionChecker: ConditionChecker = {
      checkConditions: vi.fn().mockResolvedValue(true),
    };

    const workflow = new AgentWorkflow(defaultConfig);
    const result = await workflow.run("Buy ETH if it dips below 3k", conditionChecker);

    expect(result.encryptedIntent.encrypted_payload).toBeTruthy();
    expect(result.encryptedIntent.iv).toBeTruthy();
    expect(result.encryptedIntent.auth_tag).toBeTruthy();
    // The encrypted payload shouldn't contain plaintext
    expect(result.encryptedIntent.encrypted_payload).not.toContain("ETH/USDC");
  });

  it("propagates parser errors", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Connection refused"));

    const conditionChecker: ConditionChecker = {
      checkConditions: vi.fn(),
    };

    const workflow = new AgentWorkflow(defaultConfig);

    await expect(
      workflow.run("Buy ETH", conditionChecker)
    ).rejects.toThrow("Connection refused");
  });

  it("calculates total spend from all actions", async () => {
    const multiActionStrategy: StrategyDSL = {
      pair: "ETH/USDC",
      conditions: [{ type: "price_below", value: 3000 }],
      actions: [
        { type: "swap", amount_usdc: 100, direction: "buy" },
        { type: "swap", amount_usdc: 50, direction: "buy" },
      ],
      controls: {
        max_slippage_bps: 50,
        approval_mode: "auto",
        expires_in_minutes: 60,
      },
    };

    const parserOutput: ParserOutput = {
      ...sampleParserOutput,
      strategy_dsl: multiActionStrategy,
    };

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(parserOutput), { status: 200 })
    );

    const conditionChecker: ConditionChecker = {
      checkConditions: vi.fn().mockResolvedValue(true),
    };

    const workflow = new AgentWorkflow(defaultConfig);
    const result = await workflow.run("Buy ETH", conditionChecker);

    expect(result.receipt.total_spend_usdc).toBe(150);
  });
});
