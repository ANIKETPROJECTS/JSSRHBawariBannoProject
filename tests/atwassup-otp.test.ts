import { describe, expect, test } from "bun:test";
import {
  customerOtpMatches,
  generateCustomerOtp,
  hashCustomerOtp,
  normalizeIndianPhone,
  sendAtWassupOtp,
} from "../src/lib/atwassup-otp";

describe("AtWassup OTP helpers", () => {
  test("normalizes Indian phone numbers and rejects invalid lengths", () => {
    expect(normalizeIndianPhone("9167599635")).toBe("9167599635");
    expect(normalizeIndianPhone("+91 91675 99635")).toBe("9167599635");
    expect(normalizeIndianPhone("12345")).toBeNull();
  });

  test("generates six digits and verifies only the matching phone and code", () => {
    const otp = generateCustomerOtp();
    expect(otp).toMatch(/^\d{6}$/);

    const hash = hashCustomerOtp("9167599635", otp, "test-secret");
    expect(customerOtpMatches("9167599635", otp, hash, "test-secret")).toBe(true);
    expect(customerOtpMatches("9000000000", otp, hash, "test-secret")).toBe(false);
    expect(customerOtpMatches("9167599635", "000000", hash, "test-secret")).toBe(otp === "000000");
  });

  test("sends the approved template with the OTP in body and button", async () => {
    let requestedUrl = "";
    let requestedInit: RequestInit | undefined;

    await sendAtWassupOtp({
      apiKey: "test-api-key",
      phoneNumberId: "phone-id-123",
      phone: "9167599635",
      otp: "123456",
      fetchImpl: async (input, init) => {
        requestedUrl = String(input);
        requestedInit = init;
        return Response.json({ ok: true, status: "SENT" });
      },
    });

    expect(requestedUrl).toBe("https://app.atwassup.com/api/integrations/v1/whatsapp/messages/template");
    expect(requestedInit?.method).toBe("POST");
    expect((requestedInit?.headers as Record<string, string>).authorization).toBe("Bearer test-api-key");
    const payload = JSON.parse(String(requestedInit?.body));
    expect(payload.phoneNumberId).toBe("phone-id-123");
    expect(payload.to).toBe("+919167599635");
    expect(payload.templateName).toBe("website_otp");
    expect(payload.languageCode).toBe("en_US");
    expect(payload.components[0].parameters[0].text).toBe("123456");
    expect(payload.components[1].parameters[0].text).toBe("123456");
    expect(payload).not.toHaveProperty("apiKey");
  });

  test("reports provider credit errors without leaking provider response data", async () => {
    await expect(sendAtWassupOtp({
      apiKey: "test-api-key",
      phoneNumberId: "phone-id-123",
      phone: "9167599635",
      otp: "123456",
      fetchImpl: async () => Response.json({ error: "private provider details" }, { status: 402 }),
    })).rejects.toThrow("AtWassup reports insufficient credits");
  });
});
