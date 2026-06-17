import type { Member } from "@/lib/api-client";
import { MemberAvatar } from "./MemberAvatar";

export function MemberChips({ members }: { members: Member[] }) {
  return (
    <div className="member-chips">
      {members.map((m) => (
        <span
          key={m.id}
          className="member-chip"
          title={`${m.name} · ${m.role}${m.isGuest ? " (guest)" : ""}`}
        >
          <MemberAvatar name={m.name} />
          <span className="member-name">{m.name}</span>
          {m.isGuest && <span className="member-guest-tag">guest</span>}
        </span>
      ))}
    </div>
  );
}
