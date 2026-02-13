/**
 * BotManager handles configuration and health monitoring of plugged-in claw bots.
 */

export interface BotConfig {
  name: string;
  endpoint: string;
  apiKey?: string;
  timeout_ms?: number;
  enabled: boolean;
}

export interface BotHealthStatus {
  bot_name: string;
  endpoint: string;
  status: "connected" | "disconnected" | "error";
  last_check: string;
  response_time_ms?: number;
  error_message?: string;
}

/**
 * Manages bot configurations and health checks.
 */
export class BotManager {
  private bots: Map<string, BotConfig> = new Map();

  /**
   * Register a new bot configuration.
   */
  registerBot(config: BotConfig): void {
    this.bots.set(config.name, config);
  }

  /**
   * Remove a bot configuration.
   */
  removeBot(name: string): boolean {
    return this.bots.delete(name);
  }

  /**
   * Get a bot configuration by name.
   */
  getBot(name: string): BotConfig | undefined {
    return this.bots.get(name);
  }

  /**
   * List all registered bots.
   */
  listBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Check if a bot is responsive.
   */
  async checkBotHealth(name: string): Promise<BotHealthStatus> {
    const bot = this.bots.get(name);
    
    if (!bot) {
      return {
        bot_name: name,
        endpoint: "",
        status: "error",
        last_check: new Date().toISOString(),
        error_message: "Bot not found",
      };
    }

    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        bot.timeout_ms ?? 5000
      );

      const response = await fetch(bot.endpoint, {
        method: "GET",
        headers: bot.apiKey ? { "Authorization": `Bearer ${bot.apiKey}` } : {},
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          bot_name: name,
          endpoint: bot.endpoint,
          status: "connected",
          last_check: new Date().toISOString(),
          response_time_ms: responseTime,
        };
      } else {
        return {
          bot_name: name,
          endpoint: bot.endpoint,
          status: "error",
          last_check: new Date().toISOString(),
          response_time_ms: responseTime,
          error_message: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (err: unknown) {
      const responseTime = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      return {
        bot_name: name,
        endpoint: bot.endpoint,
        status: "disconnected",
        last_check: new Date().toISOString(),
        response_time_ms: responseTime,
        error_message: errorMessage,
      };
    }
  }

  /**
   * Check health of all registered bots.
   */
  async checkAllBotsHealth(): Promise<BotHealthStatus[]> {
    const healthChecks = this.listBots().map((bot) =>
      this.checkBotHealth(bot.name)
    );
    return Promise.all(healthChecks);
  }
}
