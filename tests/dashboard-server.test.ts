import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as http from "http";
import { DashboardServer } from "../src/dashboard/server";
import type { DashboardConfig } from "../src/dashboard/trading-dashboard";

const dashboardConfig: DashboardConfig = {
  parser_endpoint: "http://localhost:9999/parse",
  allowed_pairs: ["ETH/USDC"],
  max_spend_usdc_hard: 500,
  max_slippage_bps_hard: 75,
  budget_usdc: 1000,
};

function makeRequest(
  port: number,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; data: unknown; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const options: http.RequestOptions = {
      hostname: "127.0.0.1",
      port,
      path,
      method,
      headers: { "Content-Type": "application/json" },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode ?? 0, data: parsed, headers: res.headers });
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

describe("DashboardServer", () => {
  let server: DashboardServer;
  const port = 18923;

  beforeAll(async () => {
    server = new DashboardServer(dashboardConfig, {
      port,
      host: "127.0.0.1",
    });
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it("responds to requests", async () => {
    const res = await makeRequest(port, "GET", "/api/bots");
    expect(res.status).toBe(200);
  });

  it("sets CORS headers", async () => {
    const res = await makeRequest(port, "GET", "/api/bots");
    expect(res.headers["access-control-allow-origin"]).toBe("*");
  });

  it("handles OPTIONS preflight requests", async () => {
    const res = await makeRequest(port, "OPTIONS", "/api/bots");
    expect(res.status).toBe(200);
  });

  it("GET /api/bots returns list of bots", async () => {
    const res = await makeRequest(port, "GET", "/api/bots");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("POST /api/bots registers a bot and GET /api/bots lists it", async () => {
    const res = await makeRequest(port, "POST", "/api/bots", {
      name: "test-bot",
      endpoint: "http://example.com/parse",
      enabled: true,
    });

    expect(res.status).toBe(201);

    const listRes = await makeRequest(port, "GET", "/api/bots");
    expect(listRes.status).toBe(200);
    const bots = listRes.data as Array<{ name: string }>;
    expect(bots.some((b) => b.name === "test-bot")).toBe(true);
  });

  it("GET /api/trades returns list of trades", async () => {
    const res = await makeRequest(port, "GET", "/api/trades");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("GET /api/trades/:id returns 404 for non-existent trade", async () => {
    const res = await makeRequest(port, "GET", "/api/trades/non-existent");
    expect(res.status).toBe(404);
  });

  it("DELETE /api/trades/:id returns 404 for non-existent trade", async () => {
    const res = await makeRequest(port, "DELETE", "/api/trades/non-existent");
    expect(res.status).toBe(404);
  });

  it("returns 404 for unknown API endpoints", async () => {
    const res = await makeRequest(port, "GET", "/api/unknown");
    expect(res.status).toBe(404);
  });

  it("returns 404 for unknown routes", async () => {
    const res = await makeRequest(port, "GET", "/unknown-page");
    expect(res.status).toBe(404);
  });

  it("GET /api/bots/:name/health returns health status", async () => {
    // Register a bot first
    await makeRequest(port, "POST", "/api/bots", {
      name: "health-bot",
      endpoint: "http://localhost:99999/parse",
      enabled: true,
    });

    const res = await makeRequest(port, "GET", "/api/bots/health-bot/health");
    expect(res.status).toBe(200);
    const data = res.data as { bot_name: string; status: string };
    expect(data.bot_name).toBe("health-bot");
    expect(["disconnected", "error"]).toContain(data.status);
  });
});

describe("DashboardServer stop without start", () => {
  it("stop resolves when server was never started", async () => {
    const srv = new DashboardServer(dashboardConfig, {
      port: 18924,
      host: "127.0.0.1",
    });
    await srv.stop();
  });
});
