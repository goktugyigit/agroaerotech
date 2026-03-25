export async function onRequestGet(context) {
  try {
    const { env } = context;
    
    // Stokları getir
    const { results } = await env.STOK_DB.prepare(`
      SELECT * FROM stocks ORDER BY created_at DESC
    `).all();
    
    return Response.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Stok getirme hatası:', error);
    return Response.json({
      success: false,
      error: 'Stoklar getirilemedi'
    }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const { env, request } = context;
    const data = await request.json();
    
    // Validasyon
    if (!data.stock_code || !data.stock_name) {
      return Response.json({
        success: false,
        error: 'Stok kodu ve adı zorunludur'
      }, { status: 400 });
    }
    
    // Stok kodu benzersizlik kontrolü
    const existing = await env.STOK_DB.prepare(`
      SELECT id FROM stocks WHERE stock_code = ?
    `).bind(data.stock_code).first();
    
    if (existing) {
      return Response.json({
        success: false,
        error: 'Bu stok kodu zaten kullanılıyor'
      }, { status: 400 });
    }
    
    // Yeni stok ekle
    const result = await env.STOK_DB.prepare(`
      INSERT INTO stocks (stock_code, stock_name, current_quantity, unit_price_usd, min_stock_level, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      data.stock_code,
      data.stock_name,
      data.current_quantity || 0,
      data.unit_price_usd || 0,
      data.min_stock_level || 10,
      data.description || ''
    ).run();
    
    // İlk stok hareketi kaydet
    if (data.current_quantity > 0) {
      await env.STOK_DB.prepare(`
        INSERT INTO stock_movements (stock_id, movement_type, quantity, previous_quantity, new_quantity, description)
        VALUES (?, 'initial', ?, 0, ?, 'İlk stok girişi')
      `).bind(
        result.meta.last_row_id,
        data.current_quantity,
        data.current_quantity
      ).run();
    }
    
    return Response.json({
      success: true,
      message: 'Stok başarıyla eklendi',
      data: { id: result.meta.last_row_id }
    });
  } catch (error) {
    console.error('Stok ekleme hatası:', error);
    return Response.json({
      success: false,
      error: 'Stok eklenemedi'
    }, { status: 500 });
  }
}
