import { describe, it, expect } from "vitest";
import { BotManager } from "../src/dashboard/bot-manager";
import type { BotConfig } from "../src/dashboard/bot-manager";

describe("BotManager", () => {
  it("should register and retrieve a bot", () => {
    const manager = new BotManager();
    const config: BotConfig = {
      name: "test-bot",
      endpoint: "http://example.com/parse",
      enabled: true,
    };

    manager.registerBot(config);
    const retrieved = manager.getBot("test-bot");

    expect(retrieved).toEqual(config);
  });

  it("should list all registered bots", () => {
    const manager = new BotManager();
    const config1: BotConfig = {
      name: "bot-1",
      endpoint: "http://example.com/parse1",
      enabled: true,
    };
    const config2: BotConfig = {
      name: "bot-2",
      endpoint: "http://example.com/parse2",
      enabled: false,
    };

    manager.registerBot(config1);
    manager.registerBot(config2);

    const bots = manager.listBots();
    expect(bots).toHaveLength(2);
    expect(bots).toContainEqual(config1);
    expect(bots).toContainEqual(config2);
  });

  it("should remove a bot", () => {
    const manager = new BotManager();
    const config: BotConfig = {
      name: "test-bot",
      endpoint: "http://example.com/parse",
      enabled: true,
    };

    manager.registerBot(config);
    expect(manager.getBot("test-bot")).toBeDefined();

    const removed = manager.removeBot("test-bot");
    expect(removed).toBe(true);
    expect(manager.getBot("test-bot")).toBeUndefined();
  });

  it("should return false when removing non-existent bot", () => {
    const manager = new BotManager();
    const removed = manager.removeBot("non-existent");
    expect(removed).toBe(false);
  });

  it("should return error status for non-existent bot health check", async () => {
    const manager = new BotManager();
    const health = await manager.checkBotHealth("non-existent");

    expect(health.status).toBe("error");
    expect(health.error_message).toBe("Bot not found");
  });
});
