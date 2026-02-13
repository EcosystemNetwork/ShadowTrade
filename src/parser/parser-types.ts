import type { StrategyDSL } from "../schemas";

/** Context provided to the parser alongside the user prompt. */
export interface ParserContext {
  allowed_pairs: string[];
  max_spend_usdc_hard: number;
  max_slippage_bps_hard: number;
}

/** Input sent to the BYO-Claude parser endpoint. */
export interface ParserInput {
  user_prompt: string;
  context: ParserContext;
}

/** Metadata returned by the parser about the model used. */
export interface ParserMetadata {
  model: string;
  confidence: number;
}

/** Output returned from the BYO-Claude parser endpoint. */
export interface ParserOutput {
  strategy_dsl: StrategyDSL;
  explanation: string;
  risk_notes: string[];
  parser_metadata: ParserMetadata;
}

/** Configuration for the parser adapter. */
export interface ParserConfig {
  endpoint: string;
  timeout_ms?: number;
}
