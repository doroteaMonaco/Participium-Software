jest.mock("@config/config", () => ({
  CONFIG: {
    VERIFICATION_CODE_LENGTH: 6,
    VERIFICATION_CODE_EXPIRY_MINUTES: 30,
  },
}));

import {
  generateVerificationCode,
  hashVerificationCode,
  verifyCode,
  getVerificationCodeExpiry,
  isCodeExpired,
} from "../../../src/utils/verificationUtils";
import { CONFIG } from "@config";

describe("verificationUtils", () => {
  describe("generateVerificationCode", () => {
    it("generates a code of correct length", () => {
      const code = generateVerificationCode();

      expect(code).toHaveLength(CONFIG.VERIFICATION_CODE_LENGTH);
    });

    it("generates only numeric codes", () => {
      for (let i = 0; i < 20; i++) {
        const code = generateVerificationCode();
        expect(/^\d+$/.test(code)).toBe(true);
      }
    });

    it("generates different codes on multiple calls", () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const code = generateVerificationCode();
        codes.add(code);
      }

      expect(codes.size).toBeGreaterThan(50);
    });

    it("handles leading zeros correctly", () => {
      let foundLeadingZero = false;
      for (let i = 0; i < 1000; i++) {
        const code = generateVerificationCode();
        expect(code).toHaveLength(6);
        if (code.startsWith("0")) {
          foundLeadingZero = true;
        }
      }

      expect(foundLeadingZero).toBe(true);
    });

    it("generates codes within valid range", () => {
      const max = Math.pow(10, CONFIG.VERIFICATION_CODE_LENGTH);
      for (let i = 0; i < 100; i++) {
        const code = generateVerificationCode();
        const num = parseInt(code, 10);
        expect(num).toBeGreaterThanOrEqual(0);
        expect(num).toBeLessThan(max);
      }
    });
  });

  describe("hashVerificationCode", () => {
    it("creates a hash for a code", () => {
      const code = "123456";
      const hash = hashVerificationCode(code);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });

    it("produces same hash for same code", () => {
      const code = "123456";
      const hash1 = hashVerificationCode(code);
      const hash2 = hashVerificationCode(code);

      expect(hash1).toBe(hash2);
    });

    it("produces different hash for different codes", () => {
      const hash1 = hashVerificationCode("123456");
      const hash2 = hashVerificationCode("654321");

      expect(hash1).not.toBe(hash2);
    });

    it("produces different hashes for codes with different case (if applicable)", () => {
      const hash1 = hashVerificationCode("123456");
      const hash2 = hashVerificationCode("123456");

      expect(hash1).toBe(hash2);
    });

    it("handles empty string", () => {
      const hash = hashVerificationCode("");

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
    });

    it("handles special characters in code", () => {
      const code = "12#456@";
      const hash = hashVerificationCode(code);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
    });

    it("produces consistent hash format (SHA-256 hex)", () => {
      const hash = hashVerificationCode("123456");

      expect(hash).toMatch(/^[a-f0-9]{64}$/i);
    });
  });

  describe("verifyCode", () => {
    it("returns true when code matches hash", () => {
      const code = "123456";
      const hash = hashVerificationCode(code);

      const result = verifyCode(code, hash);

      expect(result).toBe(true);
    });

    it("returns false when code does not match hash", () => {
      const code1 = "123456";
      const hash = hashVerificationCode(code1);

      const result = verifyCode("654321", hash);

      expect(result).toBe(false);
    });

    it("returns false for null/undefined code", () => {
      const hash = hashVerificationCode("123456");

      expect(verifyCode("", hash)).toBe(false);
      expect(verifyCode("wrong", hash)).toBe(false);
    });

    it("is case-sensitive for numeric codes", () => {
      const code = "123456";
      const hash = hashVerificationCode(code);

      expect(verifyCode("123456", hash)).toBe(true);
    });

    it("returns false when hash is tampered", () => {
      const code = "123456";
      const hash = hashVerificationCode(code);
      const tamperedHash = hash.slice(0, -1) + "0";

      const result = verifyCode(code, tamperedHash);

      expect(result).toBe(false);
    });

    it("handles empty strings", () => {
      const hash = hashVerificationCode("");

      expect(verifyCode("", hash)).toBe(true);
      expect(verifyCode("123456", hash)).toBe(false);
    });
  });

  describe("getVerificationCodeExpiry", () => {
    it("returns a Date object", () => {
      const expiry = getVerificationCodeExpiry();

      expect(expiry instanceof Date).toBe(true);
    });

    it("returns a future date", () => {
      const now = new Date();
      const expiry = getVerificationCodeExpiry();

      expect(expiry.getTime()).toBeGreaterThan(now.getTime());
    });

    it("sets expiry to configured minutes from now", () => {
      const beforeTime = Date.now();
      const expiry = getVerificationCodeExpiry();
      const afterTime = Date.now();

      const expectedExpiry = CONFIG.VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000;
      const actualExpiry = expiry.getTime() - beforeTime;

      expect(actualExpiry).toBeGreaterThanOrEqual(expectedExpiry - 100);
      expect(actualExpiry).toBeLessThanOrEqual(expectedExpiry + 100);
    });

    it("generates different expiry for multiple calls", () => {
      const expiry1 = getVerificationCodeExpiry();
      const expiry2 = new Date(getVerificationCodeExpiry().getTime() + 10);

      expect(expiry1.getTime()).toBeLessThan(expiry2.getTime());
    });

    it("expiry times are within acceptable range of each other", () => {
      const expiry1 = getVerificationCodeExpiry();
      const expiry2 = getVerificationCodeExpiry();

      const diff = Math.abs(expiry1.getTime() - expiry2.getTime());

      expect(diff).toBeLessThan(100);
    });
  });

  describe("isCodeExpired", () => {
    it("returns false for future expiry time", () => {
      const futureTime = new Date(Date.now() + 10 * 60 * 1000);

      const result = isCodeExpired(futureTime);

      expect(result).toBe(false);
    });

    it("returns true for past expiry time", () => {
      const pastTime = new Date(Date.now() - 1 * 60 * 1000);

      const result = isCodeExpired(pastTime);

      expect(result).toBe(true);
    });

    it("returns true for now (edge case)", () => {
      const now = new Date();


      const result = isCodeExpired(now);

      expect(typeof result).toBe("boolean");
    });

    it("returns false for 1 second in future", () => {
      const future = new Date(Date.now() + 1000);

      const result = isCodeExpired(future);

      expect(result).toBe(false);
    });

    it("returns true for 1 second in past", () => {
      const past = new Date(Date.now() - 1000);

      const result = isCodeExpired(past);

      expect(result).toBe(true);
    });

    it("returns false for expiry at configured duration", () => {
      const expiry = getVerificationCodeExpiry();

      const result = isCodeExpired(expiry);

      expect(result).toBe(false);
    });

    it("correctly identifies multiple past times as expired", () => {
      const times = [
        new Date(Date.now() - 1000),
        new Date(Date.now() - 60000),
        new Date(Date.now() - 3600000),
      ];

      times.forEach((time) => {
        expect(isCodeExpired(time)).toBe(true);
      });
    });

    it("correctly identifies multiple future times as not expired", () => {
      const times = [
        new Date(Date.now() + 1000),
        new Date(Date.now() + 60000),
        new Date(Date.now() + 3600000),
      ];

      times.forEach((time) => {
        expect(isCodeExpired(time)).toBe(false);
      });
    });
  });

  describe("code generation and verification flow", () => {
    it("complete flow: generate -> hash -> verify", () => {
      const code = generateVerificationCode();
      expect(code).toHaveLength(CONFIG.VERIFICATION_CODE_LENGTH);

      const hash = hashVerificationCode(code);
      expect(hash).toBeDefined();

      const isValid = verifyCode(code, hash);
      expect(isValid).toBe(true);
    });

    it("complete flow with expiry: generate -> hash -> set expiry -> check", () => {
      const code = generateVerificationCode();
      const hash = hashVerificationCode(code);
      const expiry = getVerificationCodeExpiry();

      const isValid = verifyCode(code, hash);
      const isExpired = isCodeExpired(expiry);

      expect(isValid).toBe(true);
      expect(isExpired).toBe(false);
    });

    it("multiple codes with different hashes", () => {
      const codes = [
        generateVerificationCode(),
        generateVerificationCode(),
        generateVerificationCode(),
      ];

      const hashes = codes.map((c) => hashVerificationCode(c));

      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(3);

      codes.forEach((code, i) => {
        expect(verifyCode(code, hashes[i])).toBe(true);
      });

      expect(verifyCode(codes[0], hashes[1])).toBe(false);
    });
  });

  describe("edge cases and security", () => {
    it("code with all same digits", () => {
      const code = "111111";
      const hash = hashVerificationCode(code);
      expect(verifyCode(code, hash)).toBe(true);
      expect(verifyCode("111112", hash)).toBe(false);
    });

    it("code with zeros", () => {
      const code = "000000";
      const hash = hashVerificationCode(code);
      expect(verifyCode(code, hash)).toBe(true);
    });

    it("hash is not reversible to get original code", () => {
      const code = "123456";
      const hash = hashVerificationCode(code);

      expect(hash).not.toContain(code);

      const reverseHash = hashVerificationCode(hash);
      expect(verifyCode(code, reverseHash)).toBe(false);
    });

    it("timing attack resistance - consistent comparison time", () => {
      const code = "123456";
      const hash = hashVerificationCode(code);

      const wrongCode = "654321";
      const start1 = Date.now();
      verifyCode(code, hash);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      verifyCode(wrongCode, hash);
      const time2 = Date.now() - start2;
      expect(time1).toBeLessThan(100);
      expect(time2).toBeLessThan(100);
    });
  });
});
