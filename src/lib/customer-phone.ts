import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

export const phoneCountryOptions = getCountries()
  .map((country) => ({
    country,
    name: countryNames.of(country) ?? country,
    callingCode: getCountryCallingCode(country),
  }))
  .sort((a, b) => a.country === "IN" ? -1 : b.country === "IN" ? 1 : a.name.localeCompare(b.name));

export function parsePhoneForCountry(value: string, country: CountryCode) {
  const parsed = parsePhoneNumberFromString(value, country);
  return parsed?.isValid() ? parsed.number : null;
}

export function normalizeCustomerPhone(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw.startsWith("+")) return null;
  const parsed = parsePhoneNumberFromString(raw);
  return parsed?.isValid() ? parsed.number : null;
}

export function normalizeAdminCustomerPhone(value: unknown) {
  const raw = String(value ?? "").trim();
  const digits = raw.replace(/\D/g, "");
  if (/^\d{10}$/.test(digits)) return digits;
  return normalizeCustomerPhone(raw);
}

export function legacyIndianPhoneFromE164(value: string) {
  const parsed = parsePhoneNumberFromString(value);
  return parsed?.country === "IN" ? parsed.nationalNumber : null;
}

function parseStoredCustomerPhone(value: unknown) {
  const raw = String(value ?? "").trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return undefined;
  const candidate = raw.startsWith("+")
    ? raw
    : digits.length === 10
      ? `+91${digits}`
      : digits.length === 12 && digits.startsWith("91")
        ? `+${digits}`
        : `+${digits}`;
  return parsePhoneNumberFromString(candidate);
}

export function formatCustomerPhone(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return parseStoredCustomerPhone(raw)?.formatInternational() ?? raw;
}

export function phonePeIndianMobile(value: unknown) {
  const parsed = parseStoredCustomerPhone(value);
  return parsed?.country === "IN" ? parsed.nationalNumber : undefined;
}

export function customerPhoneAliases(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  const parsed = parseStoredCustomerPhone(raw);
  const legacyIndianPhone = parsed?.country === "IN" ? parsed.nationalNumber : undefined;
  return [...new Set([raw, parsed?.number, legacyIndianPhone].filter((phone): phone is string => Boolean(phone)))];
}
