import { avatarHue, memberInitials } from "@/lib/member-display";

interface MemberAvatarProps {
  name: string;
  className?: string;
}

export function MemberAvatar({ name, className = "member-avatar" }: MemberAvatarProps) {
  return (
    <span
      className={className}
      style={{ "--avatar-hue": avatarHue(name) } as React.CSSProperties}
    >
      {memberInitials(name)}
    </span>
  );
}
