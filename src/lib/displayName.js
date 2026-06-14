/**
 * Display Name Formatter
 *
 * Single source of truth for how user names appear in Stones UI.
 * Honors the user's display_format privacy preference.
 *
 * Used by: Wall, Profile, Circle Detail Wall, Stone Detail, anywhere
 * a user is shown by name.
 *
 * Formats:
 *   'full'          → "Cliff McAuley"      (full name)
 *   'first_initial' → "Cliff M."           (first name + last initial — default for new users)
 *   'first_only'    → "Cliff"              (first name only — most private)
 *
 * Backward compat: if user only has the legacy `display_name` field
 * (no first/last), use display_name as-is.
 *
 * Graceful fallback: returns 'Friend' when no name data exists —
 * never an empty string or '?' — keeps the app warm.
 */

const FALLBACK = 'Friend';

export function formatDisplayName(user) {
  // Safety — handle missing or invalid input
  if (!user || typeof user !== 'object') return FALLBACK;

  const firstName = (user.first_name || '').trim();
  const lastName = (user.last_name || '').trim();
  const format = user.display_format || 'full';

  // Legacy fallback — user has display_name but no first/last (shouldn't happen
  // after backfill, but defensive coding for edge cases or new auth providers)
  if (!firstName && !lastName) {
    const legacy = (user.display_name || '').trim();
    return legacy || FALLBACK;
  }

  // Single-word name (e.g., "Madonna") — all formats render the same
  if (firstName && !lastName) {
    return firstName;
  }

  // We have both first AND last
  switch (format) {
    case 'first_only':
      return firstName;

    case 'first_initial': {
      // Take the LAST word of last_name as the surname for the initial
      // ("Mary Anne Smith" → "Mary S.", not "Mary A.")
      const surnameWord = lastName.split(/\s+/).pop();
      const initial = surnameWord.charAt(0).toUpperCase();
      return initial ? `${firstName} ${initial}.` : firstName;
    }

    case 'full':
    default:
      return `${firstName} ${lastName}`;
  }
}

/**
 * Compute the display_name string to STORE in the users table.
 * Called whenever first_name, last_name, or display_format changes,
 * so the legacy display_name field stays in sync with the new fields.
 *
 * Stone Wall queries that read display_name continue working unchanged.
 */
export function computeDisplayNameForStorage(user) {
  return formatDisplayName(user);
}

/**
 * Preview function for the Profile Setup UI.
 * Returns all three format options computed from given names.
 * Used to show the user what their name will look like in each format.
 */
export function previewAllFormats({ first_name, last_name }) {
  const sample = { first_name, last_name };
  return {
    full: formatDisplayName({ ...sample, display_format: 'full' }),
    first_initial: formatDisplayName({ ...sample, display_format: 'first_initial' }),
    first_only: formatDisplayName({ ...sample, display_format: 'first_only' }),
  };
}