import { json, badRequest } from "../_lib/util.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return badRequest("code parametresi gerekli.");

  const stmt = env.DB.prepare(
    "SELECT cert_no, full_name, course, issued_at FROM certificates WHERE verify_code = ?"
  ).bind(code);
  const row = await stmt.first();

  if (!row) return json({ valid: false }, 404);
  return json({ valid: true, certificate: row });
}
