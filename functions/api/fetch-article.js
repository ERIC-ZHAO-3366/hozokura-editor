const ALLOWED_ORIGINS = [
  'https://editor.ericzhao3366.work',
  'http://localhost:8788',
  'http://127.0.0.1:8788',
];

function checkOrigin(request) {
  const origin = request.headers.get('Origin') || '';
  if (!origin) return null;
  if (ALLOWED_ORIGINS.some(allowed => origin === allowed || origin.startsWith(allowed + '/'))) {
    return origin;
  }
  return false;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

function extractImageUrls(html) {
  const urls = [];
  const regex = /(?:data-src|src)\s*=\s*["']([^"']*(?:mmbiz\.qpic\.cn|mmbiz\.qlogo\.cn)[^"']*)/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    let url = match[1];
    if (url.startsWith('//')) url = 'https:' + url;
    if (url.startsWith('http') && !urls.includes(url)) urls.push(url);
  }
  return urls;
}

function getImageExtension(url, contentType) {
  if (contentType) {
    if (contentType.includes('svg')) return 'svg';
    if (contentType.includes('gif')) return 'gif';
    if (contentType.includes('png')) return 'png';
    if (contentType.includes('webp')) return 'webp';
  }
  const extMatch = url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)/i);
  return extMatch ? extMatch[1].toLowerCase() : 'jpg';
}

export async function onRequestPost(context) {
  try {
    const allowedOrigin = checkOrigin(context.request);
    if (allowedOrigin === false) {
      return new Response(JSON.stringify({ error: '域名未授权' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin || '' },
      });
    }
    const corsOrigin = allowedOrigin || '';

    const { url } = await context.request.json();

    if (!url || !url.includes('mp.weixin.qq.com')) {
      return new Response(JSON.stringify({ error: '请提供有效的微信公众号文章链接' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': corsOrigin },
      });
    }

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `请求失败: HTTP ${resp.status}` }), {
        status: resp.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': corsOrigin },
      });
    }

    const html = await resp.text();

    if (!html.includes('js_content') && !html.includes('rich_media_content')) {
      return new Response(JSON.stringify({ error: '获取到的页面不是有效的微信公众号文章，可能需要验证或链接已失效' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': corsOrigin },
      });
    }

    const imageUrls = extractImageUrls(html);

    const images = {};
    const total = imageUrls.length;

    for (let i = 0; i < total; i++) {
      const imgUrl = imageUrls[i];
      try {
        const imgResp = await fetch(imgUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': url,
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          },
        });

        if (imgResp.ok) {
          const contentType = imgResp.headers.get('Content-Type') || '';
          const ext = getImageExtension(imgUrl, contentType);
          const buffer = await imgResp.arrayBuffer();
          const base64 = arrayBufferToBase64(buffer);
          const dataUri = `data:${contentType || 'image/jpeg'};base64,${base64}`;
          const filename = `img_${String(i + 1).padStart(3, '0')}.${ext}`;
          images[imgUrl] = { filename, dataUri, base64, ext, contentType };
        }
      } catch (imgErr) {
        // skip failed images
      }
    }

    return new Response(JSON.stringify({ html, images, imageCount: Object.keys(images).length }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': corsOrigin },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: `服务器错误: ${e.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': corsOrigin },
    });
  }
}

export async function onRequestOptions(context) {
  const allowedOrigin = checkOrigin(context.request);
  const corsOrigin = allowedOrigin || '';
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
