export async function onRequestGet(context) {
  try {
    const { env } = context;
    
    const analytics = await fetchCloudflareAnalytics(env);
    return Response.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Analytics hatası:', error);
    return Response.json({
      success: false,
      error: error.message || 'Analytics verileri alınamadı'
    }, { status: 500 });
  }
}

// Cloudflare Analytics API'den veri çek
async function fetchCloudflareAnalytics(env) {
  const zoneId = env.CLOUDFLARE_ZONE_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  if (!zoneId || !apiToken) throw new Error('CLOUDFLARE_ZONE_ID ve CLOUDFLARE_API_TOKEN env değişkenleri gerekli');

  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Cloudflare GraphQL Analytics API - Detaylı veriler
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/graphql`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `{
          viewer {
            zones(filter: {zoneTag: "${zoneId}"}) {
              daily: httpRequests1dGroups(limit: 1, filter: {date: "${yesterday}"}) {
                sum {
                  requests
                  pageViews
                }
                uniq {
                  uniques
                }
              }
              monthly: httpRequests1dGroups(limit: 31, filter: {date_geq: "${thirtyDaysAgo}"}) {
                dimensions {
                  date
                }
                sum {
                  requests
                  pageViews
                }
                uniq {
                  uniques
                }
              }

            }
          }
        }`
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudflare API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (data.errors && data.errors.length > 0) {
    throw new Error(`Cloudflare API error: ${data.errors[0].message}`);
  }

  const zoneData = data.data?.viewer?.zones?.[0];
  
  // Günlük veriler (dün)
  const dailyData = zoneData?.daily?.[0];
  const dailyRequests = dailyData?.sum?.requests || 0;
  const dailyUniques = dailyData?.uniq?.uniques || 0;
  const dailyPageviews = dailyData?.sum?.pageViews || 0;

  // Aylık veriler (son 30 gün toplamı)
  const monthlyData = zoneData?.monthly || [];
  const monthlyRequests = monthlyData.reduce((sum, day) => sum + (day?.sum?.requests || 0), 0);
  const monthlyPageviews = monthlyData.reduce((sum, day) => sum + (day?.sum?.pageViews || 0), 0);
  const monthlyUniques = monthlyData.reduce((sum, day) => sum + (day?.uniq?.uniques || 0), 0);

  return {
    daily: {
      visitors: dailyRequests,
      pageviews: dailyPageviews,
      unique_visitors: dailyUniques
    },
    monthly: {
      visitors: monthlyRequests,
      pageviews: monthlyPageviews,
      unique_visitors: monthlyUniques
    }
  };
}

