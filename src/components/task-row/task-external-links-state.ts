import type { TaskExternalLink } from "@/lib/external-links";
import { validateExternalUrl } from "@/lib/external-links";

export type DraftExternalLink = {
  url: string;
  label: string;
};

export const EMPTY_DRAFT_LINK: DraftExternalLink = { url: "", label: "" };

export function buildExternalLinkFromDraft(draft: DraftExternalLink): TaskExternalLink {
  const trimmedUrl = draft.url.trim();
  if (!trimmedUrl) {
    throw new Error("URL is required");
  }

  const result = validateExternalUrl(trimmedUrl);
  if (!result.ok) {
    throw new Error(result.error);
  }

  return {
    url: result.url,
    label: draft.label.trim() || null,
  };
}
