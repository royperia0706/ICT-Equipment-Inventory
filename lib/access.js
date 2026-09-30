export function inScope(user, record) {
  if (!user || !record) return false;
  if (user.role === "super-admin") return true;
  const unit = record.unit || record.office;
  if (unit !== user.unit) return false;
  if (user.role === "assistant-admin") return true;
  return record.municipality === user.station;
}

export function applyScope(user, input) {
  if (user.role === "super-admin") {
    return { ...input, region: input.region || user.region, unit: input.unit || input.office };
  }
  const next = { ...input, unit: user.unit, region: user.region };
  if (user.role === "encoder") {
    next.municipality = user.station;
    next.office = user.unit;
    next.province = user.province;
    return next;
  }
  if (user.role === "assistant-admin") {
    if (input.office && input.office !== user.unit) {
      const error = new Error("You can only encode equipment for your office.");
      error.status = 403;
      throw error;
    }
    next.office = user.unit;
    next.province = user.province;
    return next;
  }
  return next;
}

export function scopeLocations(user, locations) {
  if (user.role === "super-admin") return locations;
  return locations.filter((row) => {
    if (row.unit !== user.unit) return false;
    if (user.role === "assistant-admin") return true;
    return row.name === user.station;
  });
}
