// helpers: JSON, cookies, JWT (HS256), CORS/origin kontrolü

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function b64urlEncode(bytes) {
  let str = btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function b64urlEncodeStr(str) {
  return b64urlEncode(textEncoder.encode(str));
}
function b64urlDecodeToBytes(b64) {
  b64 = b64.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? 4 - (b64.length % 4) : 0;
  b64 += "=".repeat(pad);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extra },
  });
}
function badRequest(msg = "İstek formatı hatalı.") {
  return json({ message: msg }, 400);
}
function unauthorized(msg = "Yetkisiz.") {
  return json({ message: msg }, 401);
}
function forbidden(msg = "Erişim reddedildi.") {
  return json({ message: msg }, 403);
}

export async function parseJSONSafe(request) {
  try { return await request.json(); } catch { return {}; }
}

async function importKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signToken(payload, secret, maxAgeSeconds = 60 * 60) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { iat: now, exp: now + maxAgeSeconds, ...payload };

  const headerB64 = b64urlEncodeStr(JSON.stringify(header));
  const payloadB64 = b64urlEncodeStr(JSON.stringify(body));
  const toSign = `${headerB64}.${payloadB64}`;

  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, textEncoder.encode(toSign));
  const sigB64 = b64urlEncode(new Uint8Array(sig));
  return `${toSign}.${sigB64}`;
}

export async function verifyToken(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("bad token");
  const [h, p, s] = parts;
  const key = await importKey(secret);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    b64urlDecodeToBytes(s),
    textEncoder.encode(`${h}.${p}`)
  );
  if (!valid) throw new Error("invalid signature");
  const payload = JSON.parse(textDecoder.decode(b64urlDecodeToBytes(p)));
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
    throw new Error("expired");
  }
  return payload;
}

export function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setSessionCookie(token) {
  // __Host- prefix kullanmıyoruz; domain belirtmiyoruz.
  const attrs = [
    `session=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=3600"
  ];
  return attrs.join("; ");
}

export function checkOriginOrSameHost(request, allowedOrigin) {
  // CORS için toleranslı kontrol: Origin yoksa veya aynı host ise izin ver.
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (!allowedOrigin) return true;
  if (!origin) return true;
  if (origin === allowedOrigin) return true;
  if (origin === `${url.protocol}//${url.host}`) return true;
  return false;
}

export { json, badRequest, unauthorized, forbidden };
