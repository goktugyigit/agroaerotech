// Admin - Endüstriyel Çözümler Başvuruları API
export async function onRequestGet(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    try {
        if (id) {
            // Tek başvuru getir
            const result = await env.ETKINLIK_DB.prepare(
                'SELECT * FROM applications WHERE id = ? AND form_type = ?'
            ).bind(id, 'endustriyel').first();
            
            if (!result) {
                return new Response(JSON.stringify({ success: false, message: 'Başvuru bulunamadı' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            return new Response(JSON.stringify({ success: true, data: result }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Tüm başvuruları getir
        const results = await env.ETKINLIK_DB.prepare(
            'SELECT * FROM applications WHERE form_type = ? ORDER BY created_at DESC'
        ).bind('endustriyel').all();
        
        return new Response(JSON.stringify({ success: true, data: results.results }), {
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('Admin industrial solutions error:', error);
        return new Response(JSON.stringify({ success: false, message: 'Bir hata oluştu' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestPut(context) {
    const { env, request } = context;
    
    try {
        const data = await request.json();
        const { id, status, notes } = data;
        
        if (!id) {
            return new Response(JSON.stringify({ success: false, message: 'ID gerekli' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        await env.ETKINLIK_DB.prepare(
            'UPDATE applications SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND form_type = ?'
        ).bind(status || 'yeni', notes || '', id, 'endustriyel').run();
        
        return new Response(JSON.stringify({ success: true, message: 'Başvuru güncellendi' }), {
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('Admin industrial solutions update error:', error);
        return new Response(JSON.stringify({ success: false, message: 'Bir hata oluştu' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestDelete(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    try {
        if (!id) {
            return new Response(JSON.stringify({ success: false, message: 'ID gerekli' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        await env.ETKINLIK_DB.prepare(
            'DELETE FROM applications WHERE id = ? AND form_type = ?'
        ).bind(id, 'endustriyel').run();
        
        return new Response(JSON.stringify({ success: true, message: 'Başvuru silindi' }), {
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('Admin industrial solutions delete error:', error);
        return new Response(JSON.stringify({ success: false, message: 'Bir hata oluştu' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
