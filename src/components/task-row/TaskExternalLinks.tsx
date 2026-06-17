"use client";

import type { Task } from "@/lib/api-client";
import {
  MAX_EXTERNAL_LINKS,
  getExternalLinkLabel,
} from "@/lib/external-links";
import type { DraftExternalLink } from "./task-external-links-state";

interface TaskExternalLinksProps {
  task: Task;
  canEdit: boolean;
  isAddingLink: boolean;
  draftLink: DraftExternalLink;
  linkError: string | null;
  onStartAddLink: () => void;
  onCancelAddLink: () => void;
  onDraftLinkChange: (patch: Partial<DraftExternalLink>) => void;
  onSaveNewLink: () => void;
  onRemoveSavedLink: (index: number) => void;
}

export function TaskExternalLinks({
  task,
  canEdit,
  isAddingLink,
  draftLink,
  linkError,
  onStartAddLink,
  onCancelAddLink,
  onDraftLinkChange,
  onSaveNewLink,
  onRemoveSavedLink,
}: TaskExternalLinksProps) {
  const savedLinks = task.externalLinks ?? [];
  if (!canEdit && savedLinks.length === 0) return null;

  const atLinkLimit = savedLinks.length >= MAX_EXTERNAL_LINKS;

  return (
    <div className="task-links">
      <div className="task-links-header">
        <h4 className="task-links-title">Links</h4>
        {canEdit && !isAddingLink && !atLinkLimit && (
          <button type="button" className="btn btn-sm task-link-add-btn" onClick={onStartAddLink}>
            Add link
          </button>
        )}
      </div>

      {savedLinks.length > 0 ? (
        <ul className="task-link-list">
          {savedLinks.map((link, index) => (
            <li key={`${link.url}-${index}`} className="task-link-list-item">
              <a
                href={link.url}
                className="task-link-item"
                target="_blank"
                rel="noopener noreferrer"
              >
                {getExternalLinkLabel(link)}
              </a>
              {canEdit && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost task-link-remove"
                  onClick={() => onRemoveSavedLink(index)}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        canEdit && !isAddingLink && (
          <p className="task-link-empty">No links yet.</p>
        )
      )}

      {canEdit && isAddingLink && (
        <div className="task-link-composer">
          <div className="task-link-row">
            <div className="task-link-field">
              <label className="task-link-input-label" htmlFor={`task-link-url-${task.id}`}>
                URL
              </label>
              <input
                id={`task-link-url-${task.id}`}
                className="task-property-field task-property-control"
                type="url"
                inputMode="url"
                placeholder="https://example.com"
                value={draftLink.url}
                onChange={(e) => onDraftLinkChange({ url: e.target.value })}
                autoFocus
              />
            </div>
            <div className="task-link-field">
              <label className="task-link-input-label" htmlFor={`task-link-label-${task.id}`}>
                Label (optional)
              </label>
              <input
                id={`task-link-label-${task.id}`}
                className="task-property-field"
                type="text"
                placeholder="Docs, design, ticket…"
                value={draftLink.label}
                onChange={(e) => onDraftLinkChange({ label: e.target.value })}
              />
            </div>
          </div>
          {linkError && <p className="task-link-error">{linkError}</p>}
          <div className="task-link-composer-actions">
            <button type="button" className="btn btn-sm" onClick={onSaveNewLink}>
              Save link
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={onCancelAddLink}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {canEdit && !isAddingLink && (
        <p className="task-link-hint">Only public http or https links. Local and internal URLs are blocked.</p>
      )}
    </div>
  );
}
