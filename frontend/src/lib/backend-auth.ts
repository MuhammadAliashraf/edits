import crypto from "crypto";

export function buildBackendAuthHeaders(userId: string): Record<string, string> {
  const secret = process.env.BACKEND_AUTH_SECRET;

  if (!secret) {
    return { "x-igedits-user-id": userId };
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = `${userId}:${timestamp}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  return {
    "x-igedits-user-id": userId,
    "x-igedits-ts": timestamp,
    "x-igedits-signature": signature,
  };
}
