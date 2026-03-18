// Etkinlik Hizmetleri Form API
export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        const data = await request.json();
        
        // Honeypot kontrolü
        if (data.website) {
            return new Response(JSON.stringify({ success: false, message: 'Bot detected' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Turnstile doğrulama
        const turnstileToken = data['cf-turnstile-response'];
        if (turnstileToken && env.TURNSTILE_SECRET_KEY) {
            const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `secret=${env.TURNSTILE_SECRET_KEY}&response=${turnstileToken}`
            });
            const turnstileResult = await turnstileResponse.json();
            if (!turnstileResult.success) {
                return new Response(JSON.stringify({ success: false, message: 'Güvenlik doğrulaması başarısız' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
        
        // Veritabanına kaydet
        const result = await env.ETKINLIK_DB.prepare(`
            INSERT INTO applications (form_type, service_type, name, phone, email, company, event_date, event_type, location, message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            'etkinlik',
            data.service_type || '',
            data.name || '',
            data.phone || '',
            data.email || '',
            data.company || '',
            data.event_date || '',
            data.event_type || '',
            data.location || '',
            data.message || ''
        ).run();
        
        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Başvurunuz başarıyla alındı. En kısa sürede sizinle iletişime geçeceğiz.' 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('Event services form error:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            message: 'Bir hata oluştu. Lütfen tekrar deneyin.' 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
