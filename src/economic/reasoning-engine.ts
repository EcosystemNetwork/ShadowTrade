import type { ReasonCode } from "../types";

/**
 * Economic Reasoning Engine.
 *
 * Evaluates whether a paid tool call is worth the cost given
 * the remaining budget. Produces auditable reason codes.
 */
export class EconomicReasoningEngine {
  private budgetRemaining: number;
  private readonly reasonCodes: ReasonCode[] = [];

  constructor(initialBudget: number) {
    this.budgetRemaining = initialBudget;
  }

  /**
   * Decide whether to purchase data from a tool.
   *
   * @returns true if the purchase should proceed
   */
  shouldPurchase(toolName: string, costUsdc: number): boolean {
    const canAfford = this.budgetRemaining >= costUsdc;
    const decision = canAfford ? "proceed" : "skip";

    const reason = canAfford
      ? `${toolName} costs $${costUsdc.toFixed(2)}. Budget remaining $${this.budgetRemaining.toFixed(2)}. Proceeding.`
      : `${toolName} costs $${costUsdc.toFixed(2)}. Budget remaining $${this.budgetRemaining.toFixed(2)}. Skipping.`;

    this.reasonCodes.push({
      tool: toolName,
      cost_usdc: costUsdc,
      budget_remaining_usdc: this.budgetRemaining,
      decision,
      reason,
    });

    return canAfford;
  }

  /** Record a successful spend. */
  recordSpend(amount: number): void {
    this.budgetRemaining -= amount;
  }

  /** Get remaining budget. */
  getBudgetRemaining(): number {
    return this.budgetRemaining;
  }

  /** Get all reason codes. */
  getReasonCodes(): ReasonCode[] {
    return [...this.reasonCodes];
  }
}
