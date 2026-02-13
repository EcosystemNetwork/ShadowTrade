import * as crypto from "node:crypto";
import type { ExecutionReceipt } from "../types";
import type { ParserOutput } from "../parser";
import type { StrategyDSL } from "../schemas";
import type { PaymentRecord, ReasonCode } from "../types";

/**
 * Receipt Logger.
 *
 * Produces an immutable, auditable receipt for every workflow run.
 */
export class ReceiptLogger {
  /**
   * Build a full execution receipt.
   */
  buildReceipt(params: {
    intentId: string;
    rawPrompt: string;
    parserOutput: ParserOutput;
    validatedStrategy: StrategyDSL;
    encryptedIntentPayload: string;
    payments: PaymentRecord[];
    reasonCodes: ReasonCode[];
    conditionsMet: boolean;
    executionTxHash: string | null;
    totalSpendUsdc: number;
    status: "executed" | "aborted" | "expired";
  }): ExecutionReceipt {
    return {
      intent_id: params.intentId,
      raw_user_prompt: params.rawPrompt,
      parser_output: {
        explanation: params.parserOutput.explanation,
        risk_notes: params.parserOutput.risk_notes,
        parser_metadata: params.parserOutput.parser_metadata,
      },
      validated_strategy: params.validatedStrategy,
      encrypted_intent_hash: crypto
        .createHash("sha256")
        .update(params.encryptedIntentPayload)
        .digest("hex"),
      payments: params.payments,
      reason_codes: params.reasonCodes,
      conditions_met: params.conditionsMet,
      execution_tx_hash: params.executionTxHash,
      total_spend_usdc: params.totalSpendUsdc,
      status: params.status,
      timestamp: new Date().toISOString(),
    };
  }
}
