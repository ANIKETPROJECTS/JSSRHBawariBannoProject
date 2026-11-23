import { describe, expect, test } from "bun:test";
import {
  customerPhoneAliases,
  formatCustomerPhone,
  legacyIndianPhoneFromE164,
  normalizeAdminCustomerPhone,
  normalizeCustomerPhone,
  parsePhoneForCountry,
  phonePeIndianMobile,
} from "../src/lib/customer-phone";

describe("customer phone helpers", () => {
  test("parses selected-country numbers into E.164 form", () => {
    expect(parsePhoneForCountry("9167599635", "IN")).toBe("+919167599635");
    expect(parsePhoneForCountry("2133734253", "US")).toBe("+12133734253");
    expect(parsePhoneForCountry("1234", "US")).toBeNull();
  });

  test("normalizes OTP API input and keeps legacy Indian customer matching", () => {
    expect(normalizeCustomerPhone("+44 20 7031 3000")).toBe("+442070313000");
    expect(normalizeCustomerPhone("9167599635")).toBeNull();
    expect(legacyIndianPhoneFromE164("+919167599635")).toBe("9167599635");
    expect(legacyIndianPhoneFromE164("+442070313000")).toBeNull();
  });

  test("formats old Indian records and phone values with country codes", () => {
    expect(formatCustomerPhone("9167599635")).toBe("+91 91675 99635");
    expect(formatCustomerPhone("+442070313000")).toBe("+44 20 7031 3000");
    expect(normalizeAdminCustomerPhone("9167599635")).toBe("9167599635");
    expect(normalizeAdminCustomerPhone("+442070313000")).toBe("+442070313000");
  });

  test("matches old Indian orders and only forwards Indian numbers to PhonePe", () => {
    expect(customerPhoneAliases("+919167599635")).toEqual(["+919167599635", "9167599635"]);
    expect(phonePeIndianMobile("+919167599635")).toBe("9167599635");
    expect(phonePeIndianMobile("+442070313000")).toBeUndefined();
  });
});
