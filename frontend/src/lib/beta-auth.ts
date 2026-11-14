// Utilities for Beta Mode Security Gate
export const BETA_COOKIE_NAME = "tochka_beta_access"

export function isBetaModeEnabled(): boolean {
  const mode = process.env.BETA_MODE
  // Beta mode is enabled by default unless explicitly set to "false" or "0"
  return mode !== "false" && mode !== "0"
}

export function getBetaCode(): string {
  return process.env.BETA_CODE || process.env.BETA_ACCESS_CODE || "tochka2026"
}

// Compute SHA-256 hash using Web Crypto API (supported in Node.js, Edge, and browser)
export async function computeBetaToken(code: string): Promise<string> {
  const salt = process.env.SECRET_KEY || "tochka_rosta_beta_salt_secure_2026"
  const encoder = new TextEncoder()
  const data = encoder.encode(`${code.trim()}:${salt}`)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}
