// Basit test fonksiyonu
export async function onRequestGet() {
  return new Response(JSON.stringify({
    success: true,
    message: "Test başarılı",
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}