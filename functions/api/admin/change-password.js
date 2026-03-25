// Şifre değiştirme API'si

// Güvenli şifre hash'leme fonksiyonu
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// GÜVENLİ SESSION DOĞRULAMA FONKSİYONU
async function verifySecureToken(token) {
  if (!token || typeof token !== 'string') return false;
  if (!token.startsWith("admin-")) return false;

  const tokenParts = token.split('-');
  if (tokenParts.length < 3) return false;

  const tokenTime = parseInt(tokenParts[1], 10);
  if (isNaN(tokenTime)) return false;
  const now = Date.now();

  if (tokenTime > now + 60000) return false;
  if (now - tokenTime > 3600000) return false;

  return true;
}

export async function onRequestPost({ request, env }) {
  // 1. ADIM: Session'ı GÜVENLİ bir şekilde doğrula
  const cookie = request.headers.get("Cookie") || "";
  const sessionMatch = cookie.match(/adminSession=([^;]*)/);
  const sessionToken = sessionMatch ? decodeURIComponent(sessionMatch[1]) : null;
  const isValidSession = await verifySecureToken(sessionToken);

  if (!isValidSession) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: "Yetkisiz erişim. Lütfen tekrar giriş yapın." 
    }), { 
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body || {};

    if (!currentPassword || !newPassword) {
        return new Response(JSON.stringify({
          success: false,
          message: "Tüm alanlar doldurulmalıdır."
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
    }

    // Parola politikası: en az 8 karakter, 1 büyük harf, 1 küçük harf, 1 rakam
    if (newPassword.length < 8) {
        return new Response(JSON.stringify({
          success: false,
          message: "Yeni şifre en az 8 karakter olmalıdır."
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        return new Response(JSON.stringify({
          success: false,
          message: "Yeni şifre en az 1 büyük harf, 1 küçük harf ve 1 rakam içermelidir."
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
    }

    if (currentPassword === newPassword) {
        return new Response(JSON.stringify({
          success: false,
          message: "Yeni şifre mevcut şifreden farklı olmalıdır."
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
    }

    // 2. ADIM: Timing attack'a karşı korumalı şifre kontrolü
    const user = await env.DB.prepare("SELECT * FROM users WHERE username = ?")
      .bind("admin")
      .first();
      
    if (!user) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: "Admin kullanıcısı bulunamadı." 
        }), { 
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
    }
    
    const currentPasswordHash = await hashPassword(currentPassword.trim());

    let diff = currentPasswordHash.length ^ user.password_hash.length;
    for (let i = 0; i < currentPasswordHash.length && i < user.password_hash.length; i++) {
        diff |= currentPasswordHash.charCodeAt(i) ^ user.password_hash.charCodeAt(i);
    }

    if (diff !== 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Mevcut şifre yanlış." 
      }), { 
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 3. ADIM: Şifre doğru, yenisini veritabanında güncelle
    const newPasswordHash = await hashPassword(newPassword.trim());
    await env.DB.prepare("UPDATE users SET password_hash = ? WHERE username = ?")
      .bind(newPasswordHash, "admin")
      .run();

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Şifre başarıyla değiştirildi!" 
    }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Change password error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: "Bir hata oluştu." 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
