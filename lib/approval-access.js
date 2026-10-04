export function changesQueue(record) {
  if (!record?.pendingAction) return "";
  if (record.pendingStage === "assistant") return "assistant-admin";
  return "super-admin";
}

export function canDecideEditRequest(user, record) {
  return user?.role === "super-admin" && record?.editRequest === "pending";
}

export function canDecideChanges(user, record) {
  const queue = changesQueue(record);
  if (!user || !queue) return false;
  if (user.role === "super-admin") return true;
  if (user.role !== "assistant-admin" || queue !== "assistant-admin") return false;
  return (record.unit || record.office) === user.unit;
}

export function approverLabel(record) {
  return changesQueue(record) === "assistant-admin" ? "Assistant Admin" : "Super Admin";
}
