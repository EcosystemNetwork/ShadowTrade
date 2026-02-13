import type { StrategyDSL } from "../schemas";

/** Encrypted intent wrapping a validated strategy. */
export interface EncryptedIntent {
  intent_id: string;
  encrypted_payload: string;
  iv: string;
  auth_tag: string;
  public_metadata: {
    intent_id: string;
    budget_cap_usdc: number;
    pair: string;
    expires_at: string;
    authorization_hash: string;
  };
  created_at: string;
}

/** x402 payment record. */
export interface PaymentRecord {
  tool: string;
  cost_usdc: number;
  tx_hash: string;
  timestamp: string;
  status: "success" | "failed";
}

/** Reason code emitted by the economic reasoning engine. */
export interface ReasonCode {
  tool: string;
  cost_usdc: number;
  budget_remaining_usdc: number;
  decision: "proceed" | "skip";
  reason: string;
}

/** Full execution receipt. */
export interface ExecutionReceipt {
  intent_id: string;
  raw_user_prompt: string;
  parser_output: {
    explanation: string;
    risk_notes: string[];
    parser_metadata: { model: string; confidence: number };
  };
  validated_strategy: StrategyDSL;
  encrypted_intent_hash: string;
  payments: PaymentRecord[];
  reason_codes: ReasonCode[];
  conditions_met: boolean;
  execution_tx_hash: string | null;
  total_spend_usdc: number;
  status: "executed" | "aborted" | "expired";
  timestamp: string;
}

/** Workflow configuration. */
export interface WorkflowConfig {
  parser_endpoint: string;
  parser_timeout_ms?: number;
  allowed_pairs: string[];
  max_spend_usdc_hard: number;
  max_slippage_bps_hard: number;
  budget_usdc: number;
  polling_interval_ms?: number;
  polling_timeout_ms?: number;
}
