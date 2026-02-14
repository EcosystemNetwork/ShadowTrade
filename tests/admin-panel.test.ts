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

describe("DashboardServer Admin Panel", () => {
  let server: DashboardServer;
  const port = 18925;

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

  it("GET /api/admin/tests/results returns empty results initially", async () => {
    const res = await makeRequest(port, "GET", "/api/admin/tests/results");
    expect(res.status).toBe(200);
    const data = res.data as { testResults: unknown };
    expect(data.testResults).toBe(null);
  });

  it("POST /api/admin/tests/run executes test suite", async () => {
    const res = await makeRequest(port, "POST", "/api/admin/tests/run");
    expect(res.status).toBe(200);
    
    const data = res.data as {
      success: boolean;
      totalTests: number;
      passedTests: number;
      failedTests: number;
      duration: number;
      testResults: unknown[];
      timestamp: string;
    };
    
    expect(typeof data.success).toBe("boolean");
    expect(typeof data.totalTests).toBe("number");
    expect(typeof data.passedTests).toBe("number");
    expect(typeof data.failedTests).toBe("number");
    expect(typeof data.duration).toBe("number");
    expect(Array.isArray(data.testResults)).toBe(true);
    expect(typeof data.timestamp).toBe("string");
  }, 60000); // Longer timeout for running tests

  it("GET /api/admin/tests/results returns results after running tests", async () => {
    // First run tests
    await makeRequest(port, "POST", "/api/admin/tests/run");
    
    // Then get results
    const res = await makeRequest(port, "GET", "/api/admin/tests/results");
    expect(res.status).toBe(200);
    
    const data = res.data as {
      success: boolean;
      totalTests: number;
      testResults: unknown[];
    };
    
    expect(data.testResults).not.toBe(null);
    expect(typeof data.success).toBe("boolean");
    expect(typeof data.totalTests).toBe("number");
  }, 60000); // Longer timeout for running tests
});
