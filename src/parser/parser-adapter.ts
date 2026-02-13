import type { ParserConfig, ParserInput, ParserOutput } from "./parser-types";
import { StrategyDSLSchema } from "../schemas";

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * BYO-Claude Parser Adapter.
 *
 * Calls a user-provided HTTP endpoint to translate a natural-language
 * strategy prompt into a Strategy DSL. The parser output is treated as
 * **untrusted input** and validated against the Strategy DSL schema.
 */
export class ParserAdapter {
  private readonly endpoint: string;
  private readonly timeoutMs: number;

  constructor(config: ParserConfig) {
    this.endpoint = config.endpoint;
    this.timeoutMs = config.timeout_ms ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Send a strategy prompt to the parser and return a validated output.
   * Throws on timeout, network error, or invalid DSL.
   */
  async parse(input: ParserInput): Promise<ParserOutput> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Parser returned HTTP ${response.status}: ${response.statusText}`
        );
      }

      const body = (await response.json()) as ParserOutput;

      // Validate the DSL portion — parser is untrusted
      StrategyDSLSchema.parse(body.strategy_dsl);

      return body;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error(`Parser timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
