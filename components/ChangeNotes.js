import { changedFields } from "@/lib/changed-fields";

export default function ChangeNotes({ record }) {
  const changes = changedFields(record);
  if (!changes.length) return null;
  return (
    <div className="change-list">
      {changes.map((change) => (
        <p key={change.key} className="change-highlight">
          <strong>{change.label}</strong>
          <span>{String(change.before)}</span>
          <span>→</span>
          <span>{String(change.after)}</span>
        </p>
      ))}
    </div>
  );
}
