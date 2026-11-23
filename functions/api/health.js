/**
 * API 健康检查
 * GET /api/health
 */
export async function onRequestGet() {
  return new Response(JSON.stringify({
    status: 'ok',
    service: '班主任管理工作台 API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      bilibili: '/api/bilibili/hot',
      news: '/api/news/edu'
    }
  }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    }
  });
}