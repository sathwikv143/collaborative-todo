import type { ReactNode } from "react";

interface TaskPropertyProps {
  label: string;
  canEdit: boolean;
  readValue: ReactNode;
  children: ReactNode;
}

export function TaskProperty({ label, canEdit, readValue, children }: TaskPropertyProps) {
  return (
    <div className="task-property">
      <dt>{label}</dt>
      <dd>
        {canEdit ? children : <span className="task-property-field">{readValue}</span>}
      </dd>
    </div>
  );
}
