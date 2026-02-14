import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { X402PaymentClient } from "../src/payment";

describe("X402PaymentClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns data directly when first request succeeds (non-402)", async () => {
    const mockData = { price: 3000 };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockData), { status: 200 })
    );

    const client = new X402PaymentClient();
    const result = await client.fetchWithPayment(
      "https://api.example.com/price",
      async () => "0xtx",
      0.5
    );

    expect(result).toEqual(mockData);
    expect(client.getPaymentRecords()).toHaveLength(0);
    expect(client.getTotalSpent()).toBe(0);
  });

  it("handles 402 pay-retry flow successfully", async () => {
    const mockData = { price: 3000 };

    // First request returns 402
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("Payment Required", { status: 402 })
    );
    // Retry after payment succeeds
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockData), { status: 200 })
    );

    const signPayment = vi.fn().mockResolvedValue("0xpayment123");

    const client = new X402PaymentClient();
    const result = await client.fetchWithPayment(
      "https://api.example.com/price",
      signPayment,
      0.5
    );

    expect(result).toEqual(mockData);
    expect(signPayment).toHaveBeenCalledWith(0.5);
    expect(client.getPaymentRecords()).toHaveLength(1);
    expect(client.getPaymentRecords()[0].status).toBe("success");
    expect(client.getPaymentRecords()[0].cost_usdc).toBe(0.5);
    expect(client.getPaymentRecords()[0].tx_hash).toBe("0xpayment123");
    expect(client.getTotalSpent()).toBe(0.5);
  });

  it("throws when 402 retry also fails", async () => {
    // First request returns 402
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("Payment Required", { status: 402 })
    );
    // Retry after payment also fails
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("Server Error", { status: 500 })
    );

    const signPayment = vi.fn().mockResolvedValue("0xpayment456");

    const client = new X402PaymentClient();
    await expect(
      client.fetchWithPayment(
        "https://api.example.com/price",
        signPayment,
        1.0
      )
    ).rejects.toThrow("Paid tool retry failed: HTTP 500");

    expect(client.getPaymentRecords()).toHaveLength(1);
    expect(client.getPaymentRecords()[0].status).toBe("failed");
  });

  it("throws when first request fails with non-402 error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("Server Error", { status: 500 })
    );

    const client = new X402PaymentClient();
    await expect(
      client.fetchWithPayment(
        "https://api.example.com/price",
        async () => "0xtx",
        0.5
      )
    ).rejects.toThrow("Tool request failed: HTTP 500");

    expect(client.getPaymentRecords()).toHaveLength(0);
  });

  it("tracks total spend across multiple payments", async () => {
    const client = new X402PaymentClient();

    // First payment
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("", { status: 402 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: 1 }), { status: 200 })
      );
    await client.fetchWithPayment("https://api.example.com/a", async () => "0x1", 0.5);

    // Second payment
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("", { status: 402 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: 2 }), { status: 200 })
      );
    await client.fetchWithPayment("https://api.example.com/b", async () => "0x2", 1.5);

    expect(client.getPaymentRecords()).toHaveLength(2);
    expect(client.getTotalSpent()).toBe(2.0);
  });

  it("only counts successful payments in total spend", async () => {
    const client = new X402PaymentClient();

    // Successful payment
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("", { status: 402 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: 1 }), { status: 200 })
      );
    await client.fetchWithPayment("https://api.example.com/a", async () => "0x1", 0.5);

    // Failed payment
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("", { status: 402 }))
      .mockResolvedValueOnce(new Response("Error", { status: 500 }));
    await client
      .fetchWithPayment("https://api.example.com/b", async () => "0x2", 1.5)
      .catch(() => {});

    expect(client.getPaymentRecords()).toHaveLength(2);
    expect(client.getTotalSpent()).toBe(0.5);
  });

  it("returns a copy of payment records (immutable)", () => {
    const client = new X402PaymentClient();
    const records = client.getPaymentRecords();
    records.push({
      tool: "fake",
      cost_usdc: 999,
      tx_hash: "0xfake",
      timestamp: new Date().toISOString(),
      status: "success",
    });

    expect(client.getPaymentRecords()).toHaveLength(0);
  });
});
