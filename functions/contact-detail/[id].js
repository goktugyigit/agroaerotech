// GÜVENLIK: Bu sayfa hiç yokmuş gibi davran
export async function onRequest({ request, params }) {
  // ID'li erişimler de engellensin - sayfa hiç yok
  return new Response(null, {
    status: 404,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache, no-store, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}