export async function onRequestPut(context) {
  try {
    const { env, request, params } = context;
    const data = await request.json();
    const stockId = params.id;
    
    // Stok güncelle
    await env.STOK_DB.prepare(`
      UPDATE stocks 
      SET stock_name = ?, 
          unit_price_usd = ?, 
          min_stock_level = ?, 
          description = ?, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      data.stock_name,
      data.unit_price_usd || 0,
      data.min_stock_level || 10,
      data.description || '',
      stockId
    ).run();
    
    return Response.json({
      success: true,
      message: 'Stok başarıyla güncellendi'
    });
  } catch (error) {
    console.error('Stok güncelleme hatası:', error);
    return Response.json({
      success: false,
      error: 'Stok güncellenemedi'
    }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  try {
    const { env, params } = context;
    const stockId = params.id;
    
    // Stok ve hareketlerini sil
    await env.STOK_DB.prepare(`
      DELETE FROM stock_movements WHERE stock_id = ?
    `).bind(stockId).run();
    
    await env.STOK_DB.prepare(`
      DELETE FROM stocks WHERE id = ?
    `).bind(stockId).run();
    
    return Response.json({
      success: true,
      message: 'Stok başarıyla silindi'
    });
  } catch (error) {
    console.error('Stok silme hatası:', error);
    return Response.json({
      success: false,
      error: 'Stok silinemedi'
    }, { status: 500 });
  }
}
