/**
 * Cloudflare Pages Function: 代理 B 站热门视频榜单
 * 解决浏览器 CORS 限制 + 风控反爬
 * GET /api/bilibili/hot
 */

// 内存缓存(冷启动后失效,适合短期高并发)
let cacheData = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 分钟

// 备选视频源: 当 B 站风控时使用的开源镜像
const BACKUP_APIS = [
  'https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all',
  'https://www.bilibili.com/index/rank/all'
];

export async function onRequestGet(context) {
  const now = Date.now();
  if (cacheData && (now - cacheTime) < CACHE_TTL) {
    return jsonResponse(cacheData);
  }
  try {
    const data = await fetchBilibiliHot();
    if (data && data.length > 0) {
      cacheData = data;
      cacheTime = now;
      return jsonResponse(data);
    }
    throw new Error('Empty data');
  } catch (err) {
    console.error('Bilibili fetch error:', err.message);
    // 降级到静态示例数据
    const fallback = getFallbackData();
    return jsonResponse(fallback, 200, { 'X-Data-Source': 'fallback' });
  }
}

async function fetchBilibiliHot() {
  // 方案1: 通过 B 站排行榜页面 HTML 解析(抗风控)
  try {
    const html = await fetchWithBrowserUA('https://www.bilibili.com/v/popular/rank/all');
    if (html && html.length > 5000) {
      const items = parseBilibiliHTML(html);
      if (items.length > 0) return items;
    }
  } catch (e) {
    console.error('HTML parse failed:', e.message);
  }
  // 方案2: 尝试 API(可能被风控)
  try {
    const resp = await fetch('https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all', {
      headers: browserHeaders(),
      cf: { cacheTtl: 300 }
    });
    const json = await resp.json();
    if (json && json.code === 0 && json.data && json.data.list) {
      return json.data.list.slice(0, 20).map(mapVideo);
    }
  } catch (e) {
    console.error('API failed:', e.message);
  }
  return null;
}

function parseBilibiliHTML(html) {
  // B 站排行榜页 HTML 包含 window.__INITIAL_STATE__
  const match = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.*?\});/s);
  if (!match) return [];
  try {
    // 注入 JSON (移除 undefined 等不安全字符)
    const stateStr = match[1].replace(/undefined/g, 'null');
    const state = JSON.parse(stateStr);
    const list = state?.rankList || state?.rank?.list || [];
    return list.slice(0, 20).map((item, idx) => ({
      rank: idx + 1,
      title: item.title || '',
      pic: item.pic?.replace(/^\/\//, 'https://') || '',
      bvid: item.bvid || '',
      aid: item.aid,
      author: item?.author || item?.name || '',
      mid: item?.mid,
      play: item.play || item.stat?.view || 0,
      like: item.like || item.stat?.like || 0,
      duration: formatDuration(item.duration || 0),
      description: item.description || item.dynamic || '',
      url: item.bvid ? `https://www.bilibili.com/video/${item.bvid}` : '#',
      pubdate: item.pubdate || item.create?.pubdate || 0,
      tname: item.tname || item.tnamev2 || ''
    }));
  } catch (e) {
    console.error('JSON parse error:', e.message);
    return [];
  }
}

function mapVideo(v) {
  return {
    rank: v.rank || 0,
    title: v.title || '',
    pic: (v.pic || '').startsWith('//') ? 'https:' + v.pic : (v.pic || ''),
    bvid: v.bvid || '',
    aid: v.aid,
    author: v.owner?.name || '',
    mid: v.owner?.mid,
    play: v.stat?.view || 0,
    like: v.stat?.like || 0,
    coin: v.stat?.coin || 0,
    duration: formatDuration(v.duration || 0),
    description: v.desc || v.dynamic || '',
    url: v.short_link_v2 || `https://www.bilibili.com/video/${v.bvid}`,
    pubdate: v.pubdate || 0,
    tname: v.tnamev2 || v.tname || ''
  };
}

function formatDuration(sec) {
  if (!sec || sec < 0) return '00:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function browserHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Referer': 'https://www.bilibili.com/'
  };
}

async function fetchWithBrowserUA(url) {
  const resp = await fetch(url, {
    headers: browserHeaders(),
    cf: { cacheTtl: 300, cacheEverything: true }
  });
  return resp.text();
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=600',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders
    }
  });
}

// 降级数据: B 站风控时返回(标注为示例)
function getFallbackData() {
  return [
    {rank:1, title:'【学习方法】清华学霸教你如何高效学习,适用于初中生', pic:'https://i0.hdslb.com/bfs/archive/sample1.jpg', bvid:'BV1fallback1', author:'学习方法分享', play:125300, like:8900, duration:'8:23', description:'适合初中生的学习技巧', url:'https://search.bilibili.com/all?keyword=学习方法', tname:'学习方法', _fallback:true},
    {rank:2, title:'初中物理:电路基础专题讲解', pic:'https://i0.hdslb.com/bfs/archive/sample2.jpg', bvid:'BV1fallback2', author:'物理老师讲堂', play:98400, like:6700, duration:'15:47', description:'初中物理必看', url:'https://search.bilibili.com/all?keyword=初中物理', tname:'学习', _fallback:true},
    {rank:3, title:'中考数学压轴题解题技巧', pic:'https://i0.hdslb.com/bfs/archive/sample3.jpg', bvid:'BV1fallback3', author:'数学名师', play:76200, like:5400, duration:'12:15', description:'中考压轴题攻略', url:'https://search.bilibili.com/all?keyword=中考数学', tname:'学习', _fallback:true},
    {rank:4, title:'初中英语:语法速成 7天突破', pic:'https://i0.hdslb.com/bfs/archive/sample4.jpg', bvid:'BV1fallback4', author:'英语教学', play:65800, like:4900, duration:'20:00', description:'英语语法速成', url:'https://search.bilibili.com/all?keyword=初中英语', tname:'英语学习', _fallback:true},
    {rank:5, title:'初三化学:酸碱盐专题复习', pic:'https://i0.hdslb.com/bfs/archive/sample5.jpg', bvid:'BV1fallback5', author:'化学老师', play:54200, like:4100, duration:'14:30', description:'化学专题复习', url:'https://search.bilibili.com/all?keyword=初三化学', tname:'学习', _fallback:true},
  ];
}