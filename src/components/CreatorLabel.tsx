import type { Member } from "@/lib/api-client";
import { getMemberName } from "@/lib/member-display";
import { MemberAvatar } from "./MemberAvatar";

interface CreatorLabelProps {
  members?: Member[];
  memberId?: string | null;
  name?: string | null;
  currentMemberId?: string;
  displayAsYou?: boolean;
  className?: string;
}

export function CreatorLabel({
  members = [],
  memberId,
  name,
  currentMemberId,
  displayAsYou = false,
  className,
}: CreatorLabelProps) {
  const resolved =
    name ?? (memberId ? getMemberName(members, memberId) : null);
  if (!resolved) return null;

  const showYou =
    displayAsYou ||
    (!!memberId && !!currentMemberId && memberId === currentMemberId);
  const display = showYou ? "you" : resolved;
  const titleName = resolved;

  return (
    <span
      className={`creator-label${className ? ` ${className}` : ""}`}
      title={`Created by ${titleName}`}
    >
      <MemberAvatar name={resolved} className="creator-avatar" />
      <span className="creator-text">
        Created by <strong>{display}</strong>
      </span>
    </span>
  );
}
