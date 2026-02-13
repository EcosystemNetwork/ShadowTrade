import { ParserAdapter } from "../parser";
import type { ParserOutput } from "../parser";
import { validateStrategy } from "../validation";
import { BiteIntentHandler } from "../encryption";
import { checkRisk } from "../risk";
import { TradeExecutor } from "../execution";
import { ReceiptLogger } from "../receipt";
import type { StrategyDSL } from "../schemas";
import type { EncryptedIntent, ExecutionReceipt, WorkflowConfig } from "../types";

export interface ConditionChecker {
  /** Returns true when all conditions in the strategy are satisfied. */
  checkConditions(strategy: StrategyDSL): Promise<boolean>;
}

export interface WorkflowResult {
  receipt: ExecutionReceipt;
  encryptedIntent: EncryptedIntent;
}

/**
 * Agent Workflow Orchestrator.
 *
 * Implements the end-to-end flow:
 *   prompt → parse → validate → encrypt → poll → decrypt → execute → receipt
 */
export class AgentWorkflow {
  private readonly config: WorkflowConfig;
  private readonly parser: ParserAdapter;
  private readonly bite: BiteIntentHandler;
  private readonly executor: TradeExecutor;
  private readonly receiptLogger: ReceiptLogger;

  constructor(config: WorkflowConfig, encryptionKey?: Buffer) {
    this.config = config;
    this.parser = new ParserAdapter({
      endpoint: config.parser_endpoint,
      timeout_ms: config.parser_timeout_ms,
    });
    this.bite = new BiteIntentHandler(encryptionKey);
    this.executor = new TradeExecutor({ simulate: true });
    this.receiptLogger = new ReceiptLogger();
  }

  /**
   * Run the full workflow for a user prompt.
   */
  async run(
    userPrompt: string,
    conditionChecker: ConditionChecker
  ): Promise<WorkflowResult> {
    // 1. Parse strategy via BYO-Claude endpoint
    const parserOutput: ParserOutput = await this.parser.parse({
      user_prompt: userPrompt,
      context: {
        allowed_pairs: this.config.allowed_pairs,
        max_spend_usdc_hard: this.config.max_spend_usdc_hard,
        max_slippage_bps_hard: this.config.max_slippage_bps_hard,
      },
    });

    // 2. Validate & enforce hard limits
    const validation = validateStrategy(parserOutput.strategy_dsl, {
      allowed_pairs: this.config.allowed_pairs,
      max_spend_usdc: this.config.max_spend_usdc_hard,
      max_slippage_bps: this.config.max_slippage_bps_hard,
    });

    if (!validation.valid || !validation.strategy) {
      const receipt = this.receiptLogger.buildReceipt({
        intentId: "none",
        rawPrompt: userPrompt,
        parserOutput,
        validatedStrategy: parserOutput.strategy_dsl,
        encryptedIntentPayload: "",
        payments: [],
        reasonCodes: [],
        conditionsMet: false,
        executionTxHash: null,
        totalSpendUsdc: 0,
        status: "aborted",
      });
      return {
        receipt,
        encryptedIntent: null as unknown as EncryptedIntent,
      };
    }

    const strategy = validation.strategy;

    // 3. Encrypt strategy (BITE v2)
    const encryptedIntent = this.bite.encrypt(strategy);

    // 4. Poll conditions
    const conditionsMet = await conditionChecker.checkConditions(strategy);

    if (!conditionsMet) {
      const receipt = this.receiptLogger.buildReceipt({
        intentId: encryptedIntent.intent_id,
        rawPrompt: userPrompt,
        parserOutput,
        validatedStrategy: strategy,
        encryptedIntentPayload: encryptedIntent.encrypted_payload,
        payments: [],
        reasonCodes: [],
        conditionsMet: false,
        executionTxHash: null,
        totalSpendUsdc: 0,
        status: "expired",
      });
      return { receipt, encryptedIntent };
    }

    // 5. Decrypt intent
    const decrypted = this.bite.decrypt(encryptedIntent);

    // 6. Re-validate risk at execution time
    const riskCheck = checkRisk(decrypted, {
      max_spend_usdc: this.config.max_spend_usdc_hard,
      max_slippage_bps: this.config.max_slippage_bps_hard,
      allowed_pairs: this.config.allowed_pairs,
      max_expires_minutes: decrypted.controls.expires_in_minutes,
    });

    if (!riskCheck.passed) {
      const receipt = this.receiptLogger.buildReceipt({
        intentId: encryptedIntent.intent_id,
        rawPrompt: userPrompt,
        parserOutput,
        validatedStrategy: strategy,
        encryptedIntentPayload: encryptedIntent.encrypted_payload,
        payments: [],
        reasonCodes: [],
        conditionsMet: true,
        executionTxHash: null,
        totalSpendUsdc: 0,
        status: "aborted",
      });
      return { receipt, encryptedIntent };
    }

    // 7. Execute trade
    const executionResult = await this.executor.execute(decrypted);

    const totalSpend = decrypted.actions.reduce(
      (sum, a) => sum + a.amount_usdc,
      0
    );

    // 8. Build receipt
    const receipt = this.receiptLogger.buildReceipt({
      intentId: encryptedIntent.intent_id,
      rawPrompt: userPrompt,
      parserOutput,
      validatedStrategy: strategy,
      encryptedIntentPayload: encryptedIntent.encrypted_payload,
      payments: [],
      reasonCodes: [],
      conditionsMet: true,
      executionTxHash: executionResult.tx_hash,
      totalSpendUsdc: totalSpend,
      status: executionResult.success ? "executed" : "aborted",
    });

    return { receipt, encryptedIntent };
  }
}
