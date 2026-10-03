/**
 * Password policy constants shared by the server and the browser.
 *
 * This module must stay dependency-free: `src/lib/password.ts` (which pulls in
 * Node's `crypto`) imports the number from here, and client components import
 * it too, so the UI can never drift from what the server enforces.
 */

/** Minimum password length enforced server-side and mirrored in the UI copy. */
export const MIN_PASSWORD_LENGTH = 8;
