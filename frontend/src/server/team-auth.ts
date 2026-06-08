import { createHmac, timingSafeEqual } from "node:crypto";

export const TEAM_COOKIE = "omni_team_session";

function signingSecret() {
  const secret = process.env.SESSION_SECRET ?? process.env.TEAM_ACCESS_CODE;
  if (!secret) {
    throw new Error("SESSION_SECRET or TEAM_ACCESS_CODE is required for team auth");
  }
  return secret;
}

export function createTeamSessionToken() {
  const issuedAt = Date.now().toString();
  const sig = createHmac("sha256", signingSecret()).update(issuedAt).digest("base64url");
  return `${issuedAt}.${sig}`;
}

export function verifyTeamSessionToken(token: string | null | undefined) {
  if (!token) return false;
  const [issuedAt, sig] = token.split(".");
  if (!issuedAt || !sig) return false;
  const expected = createHmac("sha256", signingSecret()).update(issuedAt).digest("base64url");
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function isTeamAccessCodeValid(code: string) {
  const expected = process.env.TEAM_ACCESS_CODE;
  if (!expected) return false;
  try {
    return timingSafeEqual(Buffer.from(code), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function readTeamCookie(request: Request) {
  const header = request.headers.get("cookie") ?? "";
  const match = header.match(new RegExp(`(?:^|; )${TEAM_COOKIE}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function teamSessionCookie(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${TEAM_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`;
}

export function requireTeamSession(request: Request) {
  return verifyTeamSessionToken(readTeamCookie(request));
}