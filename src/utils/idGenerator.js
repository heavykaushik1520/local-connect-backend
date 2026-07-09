function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function initialsFromName(name) {
  return String(name || "NA")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function uniqueId(prefix, randomPart = Date.now()) {
  return `${prefix}-${randomPart}`;
}

module.exports = { slugify, initialsFromName, uniqueId };
