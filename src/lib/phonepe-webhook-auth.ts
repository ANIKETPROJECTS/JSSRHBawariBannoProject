import { createHash, timingSafeEqual } from "node:crypto";

export function phonePeShaWebhookAuthorized(
  authorization: string | null,
  username: string,
  password: string,
) {
  if (!authorization || !username || !password) return false;
  const expected = createHash("sha256").update(`${username}:${password}`).digest("hex");
  const received = authorization.trim().replace(/^sha256[=: ]/i, "").toLowerCase();
  if (expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}