import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ParserAdapter } from "../src/parser";
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

describe("ParserAdapter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses input and returns validated output", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(sampleParserOutput), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const adapter = new ParserAdapter({
      endpoint: "http://localhost:3000/parse",
    });

    const result = await adapter.parse({
      user_prompt: "Buy ETH when it dips below 3k",
      context: {
        allowed_pairs: ["ETH/USDC"],
        max_spend_usdc_hard: 500,
        max_slippage_bps_hard: 75,
      },
    });

    expect(result).toEqual(sampleParserOutput);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/parse",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("throws on non-OK HTTP response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("Internal Server Error", {
        status: 500,
        statusText: "Internal Server Error",
      })
    );

    const adapter = new ParserAdapter({
      endpoint: "http://localhost:3000/parse",
    });

    await expect(
      adapter.parse({
        user_prompt: "Buy ETH",
        context: {
          allowed_pairs: ["ETH/USDC"],
          max_spend_usdc_hard: 500,
          max_slippage_bps_hard: 75,
        },
      })
    ).rejects.toThrow("Parser returned HTTP 500");
  });

  it("throws on invalid DSL in parser response", async () => {
    const invalidOutput = {
      strategy_dsl: {
        pair: "ETH/USDC",
        // Missing required fields: conditions, actions, controls
      },
      explanation: "test",
      risk_notes: [],
      parser_metadata: { model: "test", confidence: 0.5 },
    };

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(invalidOutput), { status: 200 })
    );

    const adapter = new ParserAdapter({
      endpoint: "http://localhost:3000/parse",
    });

    await expect(
      adapter.parse({
        user_prompt: "Buy ETH",
        context: {
          allowed_pairs: ["ETH/USDC"],
          max_spend_usdc_hard: 500,
          max_slippage_bps_hard: 75,
        },
      })
    ).rejects.toThrow();
  });

  it("throws timeout error when request exceeds timeout", async () => {
    vi.mocked(fetch).mockImplementationOnce(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          const signal = (options as RequestInit)?.signal;
          if (signal) {
            signal.addEventListener("abort", () => {
              const err = new DOMException("The operation was aborted.", "AbortError");
              reject(err);
            });
          }
        })
    );

    const adapter = new ParserAdapter({
      endpoint: "http://localhost:3000/parse",
      timeout_ms: 50,
    });

    await expect(
      adapter.parse({
        user_prompt: "Buy ETH",
        context: {
          allowed_pairs: ["ETH/USDC"],
          max_spend_usdc_hard: 500,
          max_slippage_bps_hard: 75,
        },
      })
    ).rejects.toThrow("Parser timed out after 50ms");
  });

  it("uses default timeout when not specified", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(sampleParserOutput), { status: 200 })
    );

    const adapter = new ParserAdapter({
      endpoint: "http://localhost:3000/parse",
    });

    const result = await adapter.parse({
      user_prompt: "Buy ETH",
      context: {
        allowed_pairs: ["ETH/USDC"],
        max_spend_usdc_hard: 500,
        max_slippage_bps_hard: 75,
      },
    });

    expect(result).toEqual(sampleParserOutput);
  });

  it("re-throws network errors", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network failure"));

    const adapter = new ParserAdapter({
      endpoint: "http://localhost:3000/parse",
    });

    await expect(
      adapter.parse({
        user_prompt: "Buy ETH",
        context: {
          allowed_pairs: ["ETH/USDC"],
          max_spend_usdc_hard: 500,
          max_slippage_bps_hard: 75,
        },
      })
    ).rejects.toThrow("Network failure");
  });
});
