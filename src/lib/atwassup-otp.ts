import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";

const atWassupTemplateEndpoint = "https://app.atwassup.com/api/integrations/v1/whatsapp/messages/template";

type AtWassupOtpInput = {
  apiKey: string;
  phoneNumberId: string;
  phone: string;
  otp: string;
  fetchImpl?: typeof fetch;
};

export function normalizeIndianPhone(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return null;
}

export function generateCustomerOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashCustomerOtp(phone: string, otp: string, sessionSecret: string) {
  return createHmac("sha256", sessionSecret).update(`${phone}:${otp}`).digest("hex");
}

export function customerOtpMatches(phone: string, otp: string, expectedHash: string, sessionSecret: string) {
  const actual = Buffer.from(hashCustomerOtp(phone, otp, sessionSecret), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function sendAtWassupOtp({
  apiKey,
  phoneNumberId,
  phone,
  otp,
  fetchImpl = fetch,
}: AtWassupOtpInput) {
  const response = await fetchImpl(atWassupTemplateEndpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      phoneNumberId,
      to: `+91${phone}`,
      templateName: "website_otp",
      languageCode: "en_US",
      clientMessageId: randomUUID(),
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: otp }],
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: otp }],
        },
      ],
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const result = await response.json().catch(() => ({})) as { ok?: unknown };
  if (response.ok && result.ok !== false) return;

  if (response.status === 401) {
    throw new Error("AtWassup rejected the API key or phone number configuration.");
  }
  if (response.status === 402) {
    throw new Error("AtWassup reports insufficient credits for sending this OTP.");
  }
  if (response.status === 404) {
    throw new Error("AtWassup could not find the approved website_otp template in en_US.");
  }
  throw new Error("AtWassup could not send the OTP. Please try again.");
}
