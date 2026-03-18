export async function onRequestGet() {
  return new Response("hello from functions", {
    headers: { "Content-Type": "text/plain" }
  });
}
