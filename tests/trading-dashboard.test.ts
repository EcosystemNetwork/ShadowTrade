import { describe, it, expect } from "vitest";
import { TradingDashboard } from "../src/dashboard/trading-dashboard";
import type { DashboardConfig } from "../src/dashboard/trading-dashboard";
import type { BotConfig } from "../src/dashboard/bot-manager";

describe("TradingDashboard", () => {
  const createTestConfig = (): DashboardConfig => ({
    parser_endpoint: "http://localhost:3000/parse",
    allowed_pairs: ["ETH/USDC"],
    max_spend_usdc_hard: 500,
    max_slippage_bps_hard: 75,
    budget_usdc: 1000,
  });

  it("should register a bot", () => {
    const dashboard = new TradingDashboard(createTestConfig());
    const botConfig: BotConfig = {
      name: "test-bot",
      endpoint: "http://example.com/parse",
      enabled: true,
    };

    dashboard.registerBot(botConfig);
    const bots = dashboard.listBots();

    expect(bots).toHaveLength(1);
    expect(bots[0]).toEqual(botConfig);
  });

  it("should throw error when submitting trade with non-existent bot", async () => {
    const dashboard = new TradingDashboard(createTestConfig());

    await expect(
      dashboard.submitTrade("Buy ETH", "non-existent-bot")
    ).rejects.toThrow('Bot "non-existent-bot" not found');
  });

  it("should throw error when submitting trade with disabled bot", async () => {
    const dashboard = new TradingDashboard(createTestConfig());
    const botConfig: BotConfig = {
      name: "disabled-bot",
      endpoint: "http://example.com/parse",
      enabled: false,
    };

    dashboard.registerBot(botConfig);

    await expect(
      dashboard.submitTrade("Buy ETH", "disabled-bot")
    ).rejects.toThrow('Bot "disabled-bot" is disabled');
  });

  it("should create trade request with correct status", async () => {
    const dashboard = new TradingDashboard(createTestConfig());
    const botConfig: BotConfig = {
      name: "test-bot",
      endpoint: "http://example.com/parse",
      enabled: true,
    };

    dashboard.registerBot(botConfig);
    const trade = await dashboard.submitTrade("Buy ETH at $2800", "test-bot");

    expect(trade.user_prompt).toBe("Buy ETH at $2800");
    expect(trade.bot_name).toBe("test-bot");
    expect(["pending", "monitoring"]).toContain(trade.status);
    expect(trade.id).toBeDefined();
  });

  it("should retrieve trade status", async () => {
    const dashboard = new TradingDashboard(createTestConfig());
    const botConfig: BotConfig = {
      name: "test-bot",
      endpoint: "http://example.com/parse",
      enabled: true,
    };

    dashboard.registerBot(botConfig);
    const trade = await dashboard.submitTrade("Buy ETH", "test-bot");

    const retrieved = dashboard.getTradeStatus(trade.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(trade.id);
  });

  it("should list all trades", async () => {
    const dashboard = new TradingDashboard(createTestConfig());
    const botConfig: BotConfig = {
      name: "test-bot",
      endpoint: "http://example.com/parse",
      enabled: true,
    };

    dashboard.registerBot(botConfig);
    await dashboard.submitTrade("Buy ETH", "test-bot");
    await dashboard.submitTrade("Buy BTC", "test-bot");

    const trades = dashboard.listTrades();
    expect(trades).toHaveLength(2);
  });

  it("should cancel a pending trade", async () => {
    const dashboard = new TradingDashboard(createTestConfig());
    const botConfig: BotConfig = {
      name: "test-bot",
      endpoint: "http://example.com/parse",
      enabled: true,
    };

    dashboard.registerBot(botConfig);
    const trade = await dashboard.submitTrade("Buy ETH", "test-bot");

    const cancelled = dashboard.cancelTrade(trade.id);
    expect(cancelled).toBe(true);

    const updated = dashboard.getTradeStatus(trade.id);
    expect(updated?.status).toBe("expired");
  });
});
