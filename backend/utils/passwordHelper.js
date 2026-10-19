const crypto = require("crypto");

/**
 * Generates an unambiguous, 100% copy-friendly temporary password.
 * - 10 characters length
 * - Mix of uppercase, lowercase, and numbers
 * - Completely excludes confusing characters: 0 (zero), O (uppercase o), 1 (one), I (uppercase i), l (lowercase L)
 * - Completely excludes HTML-breaking & delimiter characters (&, <, >, ", ', %, *, #) so double-clicking
 *   in ANY email client (Gmail, Outlook, iOS, Android) selects the exact password without word-boundary cutoffs.
 */
function generateTemporaryPassword(length = 10) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // 24 chars (no I, O)
  const lower = "abcdefghjkmnpqrstuvwxyz";  // 23 chars (no l, o)
  const digits = "23456789";                // 8 chars (no 0, 1)

  const all = upper + lower + digits;

  const chars = [
    upper[crypto.randomInt(0, upper.length)],
    lower[crypto.randomInt(0, lower.length)],
    digits[crypto.randomInt(0, digits.length)],
  ];

  for (let i = 3; i < length; i++) {
    chars.push(all[crypto.randomInt(0, all.length)]);
  }

  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

module.exports = { generateTemporaryPassword };
