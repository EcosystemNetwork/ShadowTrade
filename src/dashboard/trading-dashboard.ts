import { AgentWorkflow } from "../workflow";
import type { ConditionChecker, WorkflowResult } from "../workflow";
import type { StrategyDSL } from "../schemas";
import type { WorkflowConfig } from "../types";
import { BotManager } from "./bot-manager";
import type { BotConfig } from "./bot-manager";

export interface TradeRequest {
  id: string;
  user_prompt: string;
  bot_name: string;
  submitted_at: string;
  status: "pending" | "monitoring" | "executed" | "failed" | "expired";
  result?: WorkflowResult;
}

export interface DashboardConfig extends WorkflowConfig {
  condition_check_interval_ms?: number;
  max_monitoring_duration_ms?: number;
}

/**
 * TradingDashboard orchestrates real trading workflows with plugged-in bots.
 */
export class TradingDashboard {
  private readonly config: DashboardConfig;
  private readonly botManager: BotManager;
  private readonly workflow: AgentWorkflow;
  private readonly trades: Map<string, TradeRequest> = new Map();
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: DashboardConfig, encryptionKey?: Buffer) {
    this.config = config;
    this.botManager = new BotManager();
    this.workflow = new AgentWorkflow(config, encryptionKey);
  }

  /**
   * Register a claw bot for use in trading.
   */
  registerBot(config: BotConfig): void {
    this.botManager.registerBot(config);
  }

  /**
   * Get list of all registered bots.
   */
  listBots(): BotConfig[] {
    return this.botManager.listBots();
  }

  /**
   * Check health of a specific bot.
   */
  async checkBotHealth(botName: string) {
    return this.botManager.checkBotHealth(botName);
  }

  /**
   * Submit a new trade request using a specific bot.
   */
  async submitTrade(
    userPrompt: string,
    botName: string
  ): Promise<TradeRequest> {
    const bot = this.botManager.getBot(botName);
    
    if (!bot) {
      throw new Error(`Bot "${botName}" not found`);
    }

    if (!bot.enabled) {
      throw new Error(`Bot "${botName}" is disabled`);
    }

    const tradeId = this.generateTradeId();
    const trade: TradeRequest = {
      id: tradeId,
      user_prompt: userPrompt,
      bot_name: botName,
      submitted_at: new Date().toISOString(),
      status: "pending",
    };

    this.trades.set(tradeId, trade);

    // Start monitoring in background
    this.startMonitoring(tradeId, userPrompt, bot.endpoint);

    return trade;
  }

  /**
   * Get status of a trade request.
   */
  getTradeStatus(tradeId: string): TradeRequest | undefined {
    return this.trades.get(tradeId);
  }

  /**
   * List all trades.
   */
  listTrades(): TradeRequest[] {
    return Array.from(this.trades.values());
  }

  /**
   * Cancel a pending/monitoring trade.
   */
  cancelTrade(tradeId: string): boolean {
    const trade = this.trades.get(tradeId);
    
    if (!trade) {
      return false;
    }

    if (trade.status === "pending" || trade.status === "monitoring") {
      this.stopMonitoring(tradeId);
      trade.status = "expired";
      return true;
    }

    return false;
  }

  /**
   * Start monitoring conditions for a trade.
   */
  private async startMonitoring(
    tradeId: string,
    userPrompt: string,
    botEndpoint: string
  ): Promise<void> {
    const trade = this.trades.get(tradeId);
    if (!trade) return;

    try {
      // Update workflow config with the specific bot endpoint
      const workflowConfig: WorkflowConfig = {
        ...this.config,
        parser_endpoint: botEndpoint,
      };

      const workflow = new AgentWorkflow(workflowConfig);

      // Create a condition checker that polls market data
      const conditionChecker: ConditionChecker = {
        checkConditions: async (strategy: StrategyDSL) => {
          // TODO: In production, implement real market data checking here
          // This placeholder returns random results for demonstration
          return this.simulateConditionCheck(strategy);
        },
      };

      trade.status = "monitoring";

      // Run the workflow
      const result = await workflow.run(userPrompt, conditionChecker);

      trade.result = result;

      if (result.receipt.status === "executed") {
        trade.status = "executed";
      } else if (result.receipt.status === "aborted") {
        trade.status = "failed";
      } else {
        trade.status = "expired";
      }

      this.stopMonitoring(tradeId);
    } catch (err: unknown) {
      trade.status = "failed";
      this.stopMonitoring(tradeId);
    }
  }

  /**
   * Stop monitoring a trade.
   */
  private stopMonitoring(tradeId: string): void {
    const interval = this.monitoringIntervals.get(tradeId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(tradeId);
    }
  }

  /**
   * Simulate condition checking (to be replaced with real market data).
   * 
   * WARNING: This is a placeholder that returns random results.
   * In production, this MUST be replaced with actual market data checks
   * to prevent trades from executing at incorrect prices.
   */
  private simulateConditionCheck(strategy: StrategyDSL): boolean {
    // TODO: Implement real market condition checking
    // This should check actual market prices, funding rates, or volatility
    // against the conditions specified in the strategy
    return Math.random() > 0.5;
  }

  /**
   * Generate unique trade ID.
   */
  private generateTradeId(): string {
    return `trade_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
