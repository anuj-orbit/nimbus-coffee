const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/** Returns the normalized email, or null when the input is invalid. */
export function normalizeEmail(input) {
  if (typeof input !== "string") return null;
  const email = input.trim().toLowerCase();
  if (email.length === 0 || email.length > 254) return null;
  return EMAIL_RE.test(email) ? email : null;
}
