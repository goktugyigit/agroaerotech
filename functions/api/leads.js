async function ensureSchema(env) {
  await env.DB.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT, email TEXT, phone TEXT, message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function validateInput(data) {
  const { name, email, phone, message } = data;
  
  // En az bir alan dolu olmalı
  if (!name && !email && !phone && !message) {
    return { valid: false, error: "En az bir alan doldurulmalı." };
  }
  
  // Email formatı kontrolü
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, error: "Geçersiz email formatı." };
  }
  
  // Telefon formatı kontrolü (basit)
  if (phone && !/^[\d\s\-\+\(\)]{10,15}$/.test(phone)) {
    return { valid: false, error: "Geçersiz telefon formatı." };
  }
  
  // Uzunluk kontrolleri
  if (name && name.length > 100) return { valid: false, error: "İsim çok uzun." };
  if (email && email.length > 100) return { valid: false, error: "Email çok uzun." };
  if (phone && phone.length > 20) return { valid: false, error: "Telefon çok uzun." };
  if (message && message.length > 1000) return { valid: false, error: "Mesaj çok uzun." };
  
  return { valid: true };
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) {
      return new Response(JSON.stringify({ success: false, message: "Database bağlantısı yok." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ success: false, message: "Geçersiz JSON formatı." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { name = "", email = "", phone = "", message = "" } = body || {};
    
    // Input validation
    const validation = validateInput({ name, email, phone, message });
    if (!validation.valid) {
      return new Response(JSON.stringify({ success: false, message: validation.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    await ensureSchema(env);
    
    // SQL Injection koruması için prepared statement kullanıyoruz
    await env.DB
      .prepare("INSERT INTO leads (name, email, phone, message) VALUES (?, ?, ?, ?)")
      .bind(
        name.trim().substring(0, 100), 
        email.trim().substring(0, 100), 
        phone.trim().substring(0, 20), 
        message.trim().substring(0, 1000)
      )
      .run();

    return new Response(JSON.stringify({ success: true, message: "Talebiniz başarıyla kaydedildi." }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: "Sunucu hatası oluştu." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
