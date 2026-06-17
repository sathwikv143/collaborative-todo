export type TaskExternalLink = {
  url: string;
  label: string | null;
};

type ExternalUrlValidation =
  | { ok: true; url: string }
  | { ok: false; error: string };

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
]);

function isBlockedIpv4(host: string): boolean {
  if (/^127\./.test(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  if (/^0\./.test(host)) return true;

  const match = host.match(/^172\.(\d+)\./);
  if (match) {
    const second = Number(match[1]);
    if (second >= 16 && second <= 31) return true;
  }

  return false;
}

function isBlockedIpv6(host: string): boolean {
  const normalized = host.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fe80:")) return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  return false;
}

function isInternalOrLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return true;
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (isBlockedIpv4(host)) return true;
  if (host.includes(":") && isBlockedIpv6(host)) return true;
  return false;
}

export function validateExternalUrl(raw: string): ExternalUrlValidation {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "URL is required" };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "Enter a valid URL" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Only http and https links are allowed" };
  }

  if (isInternalOrLocalHost(parsed.hostname)) {
    return { ok: false, error: "Internal or local links are not allowed" };
  }

  return { ok: true, url: parsed.href };
}

export function normalizeExternalLinks(
  links: { url: string; label?: string | null }[]
): TaskExternalLink[] {
  return links.map((link) => {
    const validated = validateExternalUrl(link.url);
    if (!validated.ok) {
      throw new Error(validated.error);
    }
    const label = link.label?.trim() || null;
    return { url: validated.url, label };
  });
}

export function getExternalLinkLabel(link: TaskExternalLink): string {
  if (link.label?.trim()) return link.label.trim();
  try {
    return new URL(link.url).hostname;
  } catch {
    return link.url;
  }
}

export const MAX_EXTERNAL_LINKS = 15;
