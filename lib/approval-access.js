export function changesQueue(record) {
  if (!record?.pendingAction) return "";
  return "super-admin";
}

export function canDecideEditRequest(user, record) {
  return user?.role === "super-admin" && record?.editRequest === "pending";
}

export function canDecideChanges(user, record) {
  return user?.role === "super-admin" && Boolean(record?.pendingAction);
}

export function approverLabel(record) {
  return record?.pendingAction || record?.editRequest === "pending" ? "Super Admin" : "";
}
