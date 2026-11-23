/**
 * Cloudflare Pages Function: 代理教育新闻 RSS
 * 数据源:中国新闻网教育频道 https://www.chinanews.com.cn/rss/edu.xml
 * GET /api/news/edu
 */

let cacheData = null;
let cacheTime = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 分钟

export async function onRequestGet(context) {
  const now = Date.now();
  if (cacheData && (now - cacheTime) < CACHE_TTL) {
    return jsonResponse(cacheData);
  }
  try {
    const data = await fetchEduNews();
    if (data && data.length > 0) {
      cacheData = data;
      cacheTime = now;
      return jsonResponse(data);
    }
    throw new Error('Empty data');
  } catch (err) {
    console.error('News fetch error:', err.message);
    const fallback = getFallbackNews();
    return jsonResponse(fallback, 200, { 'X-Data-Source': 'fallback' });
  }
}

async function fetchEduNews() {
  // 尝试多个数据源
  const sources = [
    'https://www.chinanews.com.cn/rss/edu.xml',
    'https://www.chinanews.com/rss/edu.xml'
  ];
  for (const url of sources) {
    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CF-Pages-Function/1.0)',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        },
        cf: { cacheTtl: 600, cacheEverything: true }
      });
      if (resp.ok) {
        const xml = await resp.text();
        const items = parseRSS(xml);
        if (items.length > 0) return items;
      }
    } catch (e) {
      console.error('Source failed:', url, e.message);
    }
  }
  return null;
}

function parseRSS(xml) {
  const items = [];
  // 简单 XML 解析(无需 DOM)
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  let idx = 0;
  for (const m of itemMatches) {
    if (idx >= 20) break;
    const block = m[1];
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const desc = extractTag(block, 'description');
    const pubDate = extractTag(block, 'pubDate');
    const author = extractTag(block, 'author') || extractTag(block, 'dc:creator');
    if (!title || !link) continue;
    items.push({
      id: `n${idx}`,
      title: cleanText(title),
      link: cleanText(link),
      description: cleanHTML(desc || '').slice(0, 200),
      pubDate: formatDate(pubDate),
      pubDateRaw: pubDate,
      author: cleanText(author) || '中国新闻网',
      source: '中国新闻网',
      category: '教育'
    });
    idx++;
  }
  return items;
}

function extractTag(text, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

function cleanText(s) {
  return s.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
}

function cleanHTML(s) {
  return s.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
}

function formatDate(s) {
  if (!s) return '';
  try {
    const d = new Date(s.trim());
    if (isNaN(d.getTime())) return s;
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    if (diffMin < 60) return `${diffMin}分钟前`;
    if (diffH < 24) return `${diffH}小时前`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}天前`;
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  } catch {
    return s;
  }
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=900',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders
    }
  });
}

// 降级数据
function getFallbackNews() {
  return [
    {id:'f1', title:'教育部:深化基础教育课程教学改革,推进育人方式变革', link:'https://www.chinanews.com.cn/', description:'教育部近日印发指导意见,全面推进育人方式变革...', pubDate:'1小时前', author:'中国新闻网', source:'中国新闻网', category:'政策'},
    {id:'f2', title:'2025年全国高考报名人数预计突破1300万', link:'https://www.chinanews.com.cn/', description:'据教育部统计,2025年高考报名人数将再创新高...', pubDate:'3小时前', author:'中国新闻网', source:'中国新闻网', category:'高考'},
    {id:'f3', title:'新学期中小学心理健康教育将进一步加强', link:'https://www.chinanews.com.cn/', description:'教育部要求各校配齐心理健康教师,建立学生心理档案...', pubDate:'5小时前', author:'中国新闻网', source:'中国新闻网', category:'心理'},
    {id:'f4', title:'义务教育阶段学校课后服务覆盖率已达100%', link:'https://www.chinanews.com.cn/', description:'教育部最新数据显示,义务教育课后服务全面覆盖...', pubDate:'昨天', author:'中国新闻网', source:'中国新闻网', category:'教育'},
    {id:'f5', title:'中考改革:多地推行综合素质评价录取新机制', link:'https://www.chinanews.com.cn/', description:'部分省市中考将引入综合素质评价作为录取参考...', pubDate:'2天前', author:'中国新闻网', source:'中国新闻网', category:'中考'},
  ];
}