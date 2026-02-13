import { describe, it, expect } from "vitest";
import { BiteIntentHandler } from "../src/encryption";
import type { StrategyDSL } from "../src/schemas";

const sampleStrategy: StrategyDSL = {
  pair: "ETH/USDC",
  conditions: [{ type: "price_below", value: 3000 }],
  actions: [{ type: "swap", amount_usdc: 100, direction: "buy" }],
  controls: {
    max_slippage_bps: 50,
    approval_mode: "auto",
    expires_in_minutes: 60,
  },
};

describe("BITE v2 Encrypted Intent Handler", () => {
  it("encrypts a strategy and returns an EncryptedIntent", () => {
    const handler = new BiteIntentHandler();
    const intent = handler.encrypt(sampleStrategy);

    expect(intent.intent_id).toBeTruthy();
    expect(intent.encrypted_payload).toBeTruthy();
    expect(intent.iv).toBeTruthy();
    expect(intent.auth_tag).toBeTruthy();
    expect(intent.public_metadata.pair).toBe("ETH/USDC");
    expect(intent.public_metadata.budget_cap_usdc).toBe(100);
    expect(intent.public_metadata.expires_at).toBeTruthy();
    expect(intent.public_metadata.authorization_hash).toBeTruthy();
    expect(intent.created_at).toBeTruthy();
  });

  it("decrypts back to the original strategy", () => {
    const handler = new BiteIntentHandler();
    const intent = handler.encrypt(sampleStrategy);
    const decrypted = handler.decrypt(intent);

    expect(decrypted).toEqual(sampleStrategy);
  });

  it("fails to decrypt with a different key", () => {
    const handler1 = new BiteIntentHandler();
    const handler2 = new BiteIntentHandler();
    const intent = handler1.encrypt(sampleStrategy);

    expect(() => handler2.decrypt(intent)).toThrow();
  });

  it("encrypted payload does not contain plaintext strategy", () => {
    const handler = new BiteIntentHandler();
    const intent = handler.encrypt(sampleStrategy);

    // The encrypted payload should not contain the raw pair name
    expect(intent.encrypted_payload).not.toContain("ETH/USDC");
  });

  it("produces unique intent IDs", () => {
    const handler = new BiteIntentHandler();
    const intent1 = handler.encrypt(sampleStrategy);
    const intent2 = handler.encrypt(sampleStrategy);

    expect(intent1.intent_id).not.toBe(intent2.intent_id);
  });

  it("computes authorization hash correctly", () => {
    const handler = new BiteIntentHandler();
    const intent = handler.encrypt(sampleStrategy);

    expect(intent.public_metadata.authorization_hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
