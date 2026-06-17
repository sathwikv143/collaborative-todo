import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "./api-helpers";

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, Bucket>;

const globalKey = Symbol.for("collaborative-todo.rate-limit");

function getStore(): RateLimitStore {
  const g = globalThis as typeof globalThis & { [globalKey]?: RateLimitStore };
  if (!g[globalKey]) {
    g[globalKey] = new Map();
  }
  return g[globalKey];
}

export type RateLimitConfig = {
  limit: number;
  windowMs: number;
};

export function getClientIp(request: NextRequest): string {
  if (process.env.TRUST_PROXY === "true") {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0]?.trim() || "unknown";
    }
    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp.trim();
  }

  return "unknown";
}

export function checkRateLimit(
  key: string,
  { limit, windowMs }: RateLimitConfig
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  const store = getStore();
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return { allowed: false, retryAfterSec };
  }

  bucket.count += 1;
  store.set(key, bucket);
  return { allowed: true };
}

export function rateLimitResponse(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    }
  );
}

export function enforceRateLimit(
  request: NextRequest,
  scope: string,
  config: RateLimitConfig
): NextResponse | null {
  const ip = getClientIp(request);
  const result = checkRateLimit(`${scope}:${ip}`, config);
  if (!result.allowed) {
    return rateLimitResponse(result.retryAfterSec);
  }
  return null;
}

export function enforceAccountRateLimit(
  accountId: string,
  scope: string,
  config: RateLimitConfig
): NextResponse | null {
  const result = checkRateLimit(`${scope}:account:${accountId}`, config);
  if (!result.allowed) {
    return jsonError("Too many attempts for this account. Try again later.", 429);
  }
  return null;
}

/** Shared limits for auth endpoints (single-instance in-memory store). */
export const AUTH_RATE_LIMITS = {
  passkeyLogin: { limit: 30, windowMs: 15 * 60 * 1000 },
  passkeyLoginPerAccount: { limit: 10, windowMs: 15 * 60 * 1000 },
  passkeyRegister: { limit: 10, windowMs: 60 * 60 * 1000 },
  recover: { limit: 15, windowMs: 15 * 60 * 1000 },
  recoverPerAccount: { limit: 5, windowMs: 15 * 60 * 1000 },
} as const;
