// Tüm Stokları Sil API
export async function onRequestDelete(context) {
  try {
    const { env, request } = context;
    
    // Session kontrolü
    const cookies = request.headers.get('Cookie') || '';
    const sessionMatch = cookies.match(/adminSession=([^;]+)/);
    
    if (!sessionMatch) {
      return Response.json({ success: false, message: 'Oturum bulunamadı' }, { status: 401 });
    }

    const db = env.STOK_DB;

    // Önce sayıları al
    const stockCount = await db.prepare(`
      SELECT COUNT(*) as count FROM stocks
    `).first();

    const movementCount = await db.prepare(`
      SELECT COUNT(*) as count FROM stock_movements
    `).first();

    // Tüm hareketleri sil
    await db.prepare(`DELETE FROM stock_movements`).run();

    // Tüm stokları sil
    await db.prepare(`DELETE FROM stocks`).run();

    return Response.json({
      success: true,
      message: 'Tüm stoklar ve hareketler silindi',
      data: {
        deleted_stocks: stockCount.count,
        deleted_movements: movementCount.count
      }
    });

  } catch (error) {
    console.error('Toplu silme hatası:', error);
    return Response.json({
      success: false,
      error: error.message || 'Toplu silme başarısız'
    }, { status: 500 });
  }
}
