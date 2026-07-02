import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

let currentMode = 'writer';
let currentArticle = null;
let imageStore = {};

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const downloadBtn = document.getElementById('btn-download');

const metaTitle = document.getElementById('meta-title');
const metaFilename = document.getElementById('meta-filename');
const metaDesc = document.getElementById('meta-desc');
const metaDate = document.getElementById('meta-date');
const metaTags = document.getElementById('meta-tags');
const metaCategories = document.getElementById('meta-categories');
const metaPinned = document.getElementById('meta-pinned-checkbox');

const toggleBtn = document.getElementById('toggle-meta-btn');
const metaContent = document.getElementById('meta-content');
const toggleIcon = document.getElementById('meta-toggle-icon');

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function unescapeHtml(s) {
  return s.replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
}

function applyTheme(theme) {
  if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  const cb = $('#theme-toggle-checkbox');
  if (cb) cb.checked = (theme === 'dark');
}

function initTheme() {
  const cb = $('#theme-toggle-checkbox');
  const stored = localStorage.getItem('hozokura-theme');
  let systemListenerRemover = null;

  const applySystemPreference = () => {
    if (window.matchMedia) {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mql.matches ? 'dark' : 'light');
      const onChange = (e) => {
        if (!localStorage.getItem('hozokura-theme')) applyTheme(e.matches ? 'dark' : 'light');
      };
      if (mql.addEventListener) mql.addEventListener('change', onChange);
      else if (mql.addListener) mql.addListener(onChange);
      systemListenerRemover = () => {
        if (mql.removeEventListener) mql.removeEventListener('change', onChange);
        else if (mql.removeListener) mql.removeListener(onChange);
      };
    } else {
      const hour = new Date().getHours();
      applyTheme((hour >= 19 || hour < 6) ? 'dark' : 'light');
    }
  };

  if (stored === 'dark' || stored === 'light') applyTheme(stored);
  else applySystemPreference();

  if (cb) {
    cb.addEventListener('change', (e) => {
      const next = e.target.checked ? 'dark' : 'light';
      applyTheme(next);
      localStorage.setItem('hozokura-theme', next);
      if (systemListenerRemover) systemListenerRemover();
    });
    cb.addEventListener('click', (e) => {
      if (e.shiftKey) {
        localStorage.removeItem('hozokura-theme');
        applySystemPreference();
      }
    });
  }
}

initTheme();

function switchMode(mode) {
  currentMode = mode;
  $$('.mode-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));

  $$('.btn-writer-mode').forEach(el => {
    el.style.display = mode === 'writer' ? '' : 'none';
  });
  $$('.btn-wechat-mode').forEach(el => {
    el.style.display = mode === 'wechat' ? '' : 'none';
  });

  updatePreview();
  updateWechatMdPreview();
}

$$('.mode-tab').forEach(tab => {
  tab.addEventListener('click', () => switchMode(tab.dataset.mode));
});

if (toggleBtn && metaContent && toggleIcon) {
  if (metaContent.classList.contains('collapsed')) metaContent.style.display = 'none';
  toggleBtn.addEventListener('click', () => {
    const isCollapsed = metaContent.classList.contains('collapsed');
    if (!isCollapsed) {
      metaContent.classList.add('collapsed');
      toggleIcon.style.transform = 'rotate(180deg)';
      const onTrans = (ev) => {
        if (ev.propertyName && ev.propertyName.includes('max-height')) {
          metaContent.style.display = 'none';
          metaContent.removeEventListener('transitionend', onTrans);
        }
      };
      metaContent.addEventListener('transitionend', onTrans);
    } else {
      metaContent.style.display = '';
      void metaContent.offsetWidth;
      metaContent.classList.remove('collapsed');
      toggleIcon.style.transform = 'rotate(0deg)';
    }
  });
}

if (metaDate && metaDate.valueAsDate === null) metaDate.valueAsDate = new Date();

marked.setOptions({ gfm: true, breaks: true });

function parseShortcodeAttributes(attributeString = '') {
  const attributes = {};
  attributeString.replace(/([a-zA-Z0-9_-]+)\s*=\s*(?:"|&quot;|')([^"']*?)(?:"|&quot;|')/g, (_, key, value) => {
    attributes[key.toLowerCase()] = unescapeHtml(value);
    return '';
  });
  return attributes;
}

function getYouTubeEmbedUrl(url) {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0&modestbranding=1` : '';
}

function getBilibiliEmbedUrl(url) {
  const bvidMatch = url.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/i);
  if (bvidMatch) return `https://player.bilibili.com/player.html?bvid=${bvidMatch[1]}&page=1&high_quality=1&as_wide=1&autoplay=0`;
  const aidMatch = url.match(/bilibili\.com\/video\/av(\d+)/i);
  if (aidMatch) return `https://player.bilibili.com/player.html?aid=${aidMatch[1]}&page=1&high_quality=1&as_wide=1&autoplay=0`;
  const bvidInQuery = url.match(/[?&]bvid=(BV[a-zA-Z0-9]+)/i);
  if (bvidInQuery) return `https://player.bilibili.com/player.html?bvid=${bvidInQuery[1]}&page=1&high_quality=1&as_wide=1&autoplay=0`;
  return '';
}

function getSpotifyEmbedUrl(url) {
  const match = url.match(/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/i);
  return match ? `https://open.spotify.com/embed/${match[1]}/${match[2]}` : '';
}

function getNeteaseEmbedUrl(url) {
  const trackMatch = url.match(/[?&]id=(\d+)/i);
  if (trackMatch) return `https://music.163.com/outchain/player?type=2&id=${trackMatch[1]}&auto=0&height=66`;
  const playlistMatch = url.match(/[?&]playlistId=(\d+)/i);
  if (playlistMatch) return `https://music.163.com/outchain/player?type=0&id=${playlistMatch[1]}&auto=0&height=380`;
  return '';
}

function buildMusicEmbedHtml(url, title = '') {
  const embedUrl = getNeteaseEmbedUrl(url) || getSpotifyEmbedUrl(url);
  if (!embedUrl) {
    return `<a class="media-fallback-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(title || url)}</a>`;
  }
  const isSpotify = embedUrl.includes('open.spotify.com/embed');
  const platform = isSpotify ? 'Spotify' : '网易云音乐';
  const provider = isSpotify ? 'spotify' : 'netease';
  const displayTitle = title ? escapeHtml(title) : platform;
  return `
    <figure class="media-embed media-embed-music media-embed-${provider}">
      <figcaption class="media-embed-header">
        <div class="media-embed-meta">
          <span class="media-embed-platform">${platform}</span>
          ${title ? `<strong class="media-embed-title">${escapeHtml(title)}</strong>` : ''}
        </div>
        <a class="media-embed-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">源链接</a>
      </figcaption>
      <div class="media-embed-body">
        <iframe src="${escapeHtml(embedUrl)}" title="${displayTitle}" loading="lazy" frameborder="0" allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>
      </div>
    </figure>
  `;
}

function buildVideoEmbedHtml(url, title = '') {
  const embedUrl = getBilibiliEmbedUrl(url) || getYouTubeEmbedUrl(url);
  if (!embedUrl) {
    return `<a class="media-fallback-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(title || url)}</a>`;
  }
  const isYouTube = embedUrl.includes('youtube.com/embed');
  const platform = isYouTube ? 'YouTube' : 'Bilibili';
  const provider = isYouTube ? 'youtube' : 'bilibili';
  const displayTitle = title ? escapeHtml(title) : platform;
  return `
    <figure class="media-embed media-embed-video media-embed-${provider}">
      <figcaption class="media-embed-header">
        <div class="media-embed-meta">
          <span class="media-embed-platform">${platform}</span>
          ${title ? `<strong class="media-embed-title">${escapeHtml(title)}</strong>` : ''}
        </div>
        <a class="media-embed-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">源链接</a>
      </figcaption>
      <div class="media-embed-body">
        <iframe src="${escapeHtml(embedUrl)}" title="${displayTitle}" loading="lazy" frameborder="0" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
      </div>
    </figure>
  `;
}

function parseCustomShortcodes(html) {
  const shortcodes = [
    { regex: /\[warn\]([\s\S]*?)\[\/warn\]/g, replacement: '<div class="shortcode-block shortcode-warn"><span class="shortcode-icon">⚠️</span><div class="shortcode-content">$1</div></div>' },
    { regex: /\[wrong\]([\s\S]*?)\[\/wrong\]/g, replacement: '<div class="shortcode-block shortcode-wrong"><span class="shortcode-icon">❌</span><div class="shortcode-content">$1</div></div>' },
    { regex: /\[right\]([\s\S]*?)\[\/right\]/g, replacement: '<div class="shortcode-block shortcode-right"><span class="shortcode-icon">✅</span><div class="shortcode-content">$1</div></div>' },
    { regex: /\[hide\]([\s\S]*?)\[\/hide\]/g, replacement: '<span class="shortcode-hide" title="悬停显示">$1</span>' },
    { regex: /\[music(?:\s+([^\]]+))?\]([\s\S]*?)\[\/music\]/g, replacement: (_, attrString, url) => {
      const attrs = parseShortcodeAttributes(attrString || '');
      return buildMusicEmbedHtml(url.trim(), attrs.title || '');
    } },
    { regex: /\[video(?:\s+([^\]]+))?\]([\s\S]*?)\[\/video\]/g, replacement: (_, attrString, url) => {
      const attrs = parseShortcodeAttributes(attrString || '');
      return buildVideoEmbedHtml(url.trim(), attrs.title || '');
    } }
  ];
  return shortcodes.reduce((acc, { regex, replacement }) => acc.replace(regex, replacement), html);
}

function generateFrontmatter() {
  const title = (metaTitle && metaTitle.value) ? metaTitle.value.trim() : '';
  const desc = (metaDesc && metaDesc.value) ? metaDesc.value.trim() : '';
  const date = (metaDate && metaDate.value) ? metaDate.value : '';
  const tagsArr = (metaTags && metaTags.value) ? metaTags.value.split(',').map(t => t.trim()).filter(Boolean) : [];
  const catArr = (metaCategories && metaCategories.value) ? metaCategories.value.split(',').map(c => c.trim()).filter(Boolean) : [];
  const isPinned = (metaPinned && metaPinned.checked) ? true : false;
  const isPublish = true;

  let fm = '---\n';
  if (title) fm += `title: "${title}"\n`;
  if (desc) fm += `description: "${desc}"\n`;
  if (isPinned) fm += `pinned: true\n`;
  if (date) fm += `date: ${date}\n`;
  fm += `published: ${isPublish}\n`;
  if (tagsArr.length > 0) fm += `tags:\n${tagsArr.map(t => `  - ${t}`).join('\n')}\n`;
  if (catArr.length > 0) fm += `categories:\n${catArr.map(c => `  - ${c}`).join('\n')}\n`;
  fm += '---\n\n';
  return fm;
}

function replaceImgSrcWithBase64(container) {
  container.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src') || '';
    if (!src.startsWith('http')) return;
    if (!src.includes('mmbiz.qpic.cn') && !src.includes('mmbiz.qlogo.cn')) return;
    if (imageStore[src]) { img.src = imageStore[src].dataUri; return; }
    const decoded = src.replace(/&amp;/g, '&');
    if (imageStore[decoded]) { img.src = imageStore[decoded].dataUri; return; }
    for (const [origUrl, info] of Object.entries(imageStore)) {
      if (src === origUrl || decoded === origUrl || src.startsWith(origUrl.split('?')[0]) || decoded.startsWith(origUrl.split('?')[0])) {
        img.src = info.dataUri;
        return;
      }
    }
  });
}

function updatePreview() {
  if (!editor || !preview) return;
  let rawMarkdown = editor.value || '';

  if (Object.keys(imageStore).length > 0) {
    for (const [origUrl, info] of Object.entries(imageStore)) {
      rawMarkdown = rawMarkdown.split(origUrl).join(info.dataUri);
    }
  }

  let html = marked.parse(rawMarkdown);
  html = parseCustomShortcodes(html);

  let previewHtml = '';
  if (currentMode === 'writer') {
    const titleHtml = metaTitle && metaTitle.value ? metaTitle.value : 'Untitled';
    const descHtml = metaDesc && metaDesc.value ? metaDesc.value : '';
    previewHtml = `<div class="preview-meta"><h1>${escapeHtml(titleHtml)}</h1>`;
    if (descHtml) previewHtml += `<p class="sys-text-secondary" style="margin-bottom:16px;"><i>${escapeHtml(descHtml)}</i></p>`;
    previewHtml += `</div>`;
  } else if (currentArticle) {
    previewHtml = `<div style="margin-bottom:16px;"><h1 style="font-size:22px;font-weight:700;">${escapeHtml(currentArticle.title)}</h1></div>`;
  }

  preview.innerHTML = previewHtml + html;

  if (Object.keys(imageStore).length > 0) {
    replaceImgSrcWithBase64(preview);
  }
}

function updateWechatMdPreview() {
  const el = $('#wechat-md-preview');
  if (!el || currentMode !== 'wechat' || !editor) return;
  let rawMarkdown = editor.value || '';

  if (Object.keys(imageStore).length > 0) {
    for (const [origUrl, info] of Object.entries(imageStore)) {
      rawMarkdown = rawMarkdown.split(origUrl).join(info.dataUri);
    }
  }

  let html = marked.parse(rawMarkdown);
  html = parseCustomShortcodes(html);

  if (currentArticle) {
    html = `<div style="margin-bottom:16px;"><h1 style="font-size:22px;font-weight:700;">${escapeHtml(currentArticle.title)}</h1></div>` + html;
  }

  el.innerHTML = html;
  if (Object.keys(imageStore).length > 0) {
    replaceImgSrcWithBase64(el);
  }
}

function initToolbar() {
  if (!editor) return;
  const lastSel = { start: 0, end: 0 };
  function updateLastSelection() {
    try { lastSel.start = editor.selectionStart; lastSel.end = editor.selectionEnd; } catch (err) {}
  }
  ['keyup', 'mouseup', 'click', 'input', 'select', 'keydown', 'focus'].forEach(evt => {
    editor.addEventListener(evt, updateLastSelection);
  });
  $$('.tb-btn').forEach(btn => {
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const action = e.currentTarget.getAttribute('data-action');
      if (editor.selectionStart == null) {
        editor.selectionStart = lastSel.start;
        editor.selectionEnd = lastSel.end;
      }
      insertMarkdownAtCursor(action);
    });
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initToolbar);
else initToolbar();

function insertMarkdownAtCursor(action) {
  if (!editor) return;
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const currentText = editor.value || '';
  const selectedText = currentText.substring(start, end);

  const actions = {
    bold: { before: '**', after: '**' },
    italic: { before: '_', after: '_' },
    strikethrough: { before: '~~', after: '~~' },
    h2: { before: '\n## ', after: '' },
    h3: { before: '\n### ', after: '' },
    quote: { before: '\n> ', after: '' },
    code: { before: '\n```\n', after: '\n```\n' },
    link: { before: '[', after: '](https://)' },
    image: { before: '![Alt text](', after: ')' },
    table: { before: '\n| Header | Header |\n| -- | -- |\n| Cell | Cell |\n', after: '' },
    'sc-warn': { before: '\n[warn]\n', after: '\n[/warn]\n' },
    'sc-wrong': { before: '\n[wrong]\n', after: '\n[/wrong]\n' },
    'sc-right': { before: '\n[right]\n', after: '\n[/right]\n' },
    'sc-hide': { before: '[hide]', after: '[/hide]' },
    'sc-video': { before: '\n[video title="我的视频"]', after: '[/video]\n', placeholder: 'https://www.bilibili.com/video/BV1xx411c7mD' },
    'sc-music': { before: '\n[music title="夜间循环播放"]', after: '[/music]\n', placeholder: 'https://music.163.com/#/song?id=29764561' }
  };

  if (actions[action]) {
    const a = actions[action];
    const placeholder = a.placeholder || ((action.startsWith('sc-') || action === 'code') ? '内容' : 'text');
    const insertedContent = selectedText || placeholder;
    const newText = a.before + insertedContent + a.after;
    editor.value = currentText.substring(0, start) + newText + currentText.substring(end);
    editor.focus();
    editor.selectionStart = start + a.before.length;
    editor.selectionEnd = editor.selectionStart + insertedContent.length;
    updatePreview();
  }
}

if (editor) {
  editor.addEventListener('input', () => { updatePreview(); updateWechatMdPreview(); });
  editor.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      let action = null;
      if (e.shiftKey) {
        if (e.key.toLowerCase() === 'w') action = 'sc-warn';
        else if (e.key.toLowerCase() === 'e') action = 'sc-wrong';
        else if (e.key.toLowerCase() === 'r') action = 'sc-right';
        else if (e.key.toLowerCase() === 'h') action = 'sc-hide';
      } else {
        if (e.key.toLowerCase() === 'b') action = 'bold';
        else if (e.key.toLowerCase() === 'i') action = 'italic';
      }
      if (action) { e.preventDefault(); insertMarkdownAtCursor(action); }
    }
  });
}

if (metaTitle) metaTitle.addEventListener('input', updatePreview);
if (metaDesc) metaDesc.addEventListener('input', updatePreview);
if (metaPinned) metaPinned.addEventListener('change', updatePreview);

if (downloadBtn) {
  downloadBtn.addEventListener('click', () => {
    const frontmatter = generateFrontmatter();
    const content = editor ? editor.value : '';
    const fullDocument = frontmatter + content;
    let filenameSource = '';
    if (metaFilename && metaFilename.value && metaFilename.value.trim()) filenameSource = metaFilename.value.trim();
    else if (metaTitle && metaTitle.value) filenameSource = metaTitle.value.trim();
    let filename = filenameSource.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!filename) filename = 'untitled';
    const blob = new Blob([fullDocument], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename + '.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

if (metaTitle && metaFilename) {
  metaTitle.addEventListener('input', () => {
    try {
      if (!metaFilename.value || !metaFilename.value.trim()) {
        metaFilename.value = metaTitle.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
    } catch (e) {}
  });
}

// ==================== WeChat Saver Logic ====================

function initFetchPaneToggle() {
  const btn = $('#toggle-fetch-btn');
  const content = $('#fetch-content');
  const icon = $('#fetch-toggle-icon');
  if (!btn || !content || !icon) return;
  btn.addEventListener('click', () => {
    const collapsed = content.classList.contains('collapsed');
    if (!collapsed) {
      content.classList.add('collapsed');
      icon.style.transform = 'rotate(180deg)';
      const onEnd = (ev) => {
        if (ev.propertyName?.includes('max-height')) {
          content.style.display = 'none';
          content.removeEventListener('transitionend', onEnd);
        }
      };
      content.addEventListener('transitionend', onEnd);
    } else {
      content.style.display = '';
      void content.offsetWidth;
      content.classList.remove('collapsed');
      icon.style.transform = 'rotate(0deg)';
    }
  });
}

function initEditButton() {
  const btn = $('#btn-edit-in-writer');
  if (!btn) return;
  btn.addEventListener('click', () => switchMode('writer'));
}

function initExportMenu() {
  const btn = $('#btn-export');
  if (!btn) return;
  btn.addEventListener('click', () => exportZip());
}

function initLightbox() {
  const overlay = $('#lightbox');
  const img = $('#lightbox-img');
  const close = $('#lightbox-close');
  if (!overlay || !img || !close) return;
  document.addEventListener('click', (e) => {
    if (e.target.tagName === 'IMG' && e.target.closest('.wechat-article-view, .preview-content')) {
      const src = e.target.src;
      if (!src) return;
      img.src = src;
      overlay.classList.add('show');
    }
  });
  close.addEventListener('click', () => overlay.classList.remove('show'));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('show'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') overlay.classList.remove('show'); });
}

function setStatus(msg, type = 'loading') {
  const el = $('#fetch-status');
  if (!el) return;
  el.innerHTML = `<span class="status-badge ${type}">${type === 'loading' ? '<span class="spinner"></span>' : ''}${escapeHtml(msg)}</span>`;
}

function setProgress(pct) {
  const bar = $('#fetch-progress');
  const fill = $('#fetch-progress-fill');
  if (!bar || !fill) return;
  bar.classList.add('active');
  fill.style.width = pct + '%';
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function parseWechatArticle(html, images) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const titleEl = doc.querySelector('#activity-name') || doc.querySelector('.rich_media_title');
  const title = titleEl?.textContent?.trim() || '未命名文章';
  const authorEl = doc.querySelector('#js_name') || doc.querySelector('a#js_name');
  const account = authorEl?.textContent?.trim() || '未知';
  const authorMeta = doc.querySelector('.rich_media_meta_text');
  const author = authorMeta?.textContent?.trim() || account;

  let contentEl = doc.querySelector('#js_content') || doc.querySelector('.rich_media_content');
  if (!contentEl) {
    for (const div of doc.querySelectorAll('div')) {
      if (div.dataset.contentid) { contentEl = div; break; }
    }
  }

  const imageMap = {};
  if (contentEl) {
    contentEl.querySelectorAll('img').forEach(img => {
      const src = img.dataset.src || img.getAttribute('src') || '';
      if (!src) return;
      const fullSrc = src.startsWith('//') ? 'https:' + src : src;
      if (!fullSrc.startsWith('http')) return;
      img.src = fullSrc;
      img.removeAttribute('data-src');
      if (img.classList.contains('img_loading')) img.classList.remove('img_loading');
      if (images[fullSrc]) imageMap[fullSrc] = images[fullSrc].filename;
      else imageMap[fullSrc] = null;
    });
    contentEl.querySelectorAll('script, style, iframe').forEach(el => el.remove());
    contentEl.querySelectorAll('mpvoice, mpvideosn').forEach(el => el.remove());
    contentEl.querySelectorAll('a').forEach(a => {
      if ((a.href || '').includes('mp.weixin.qq.com/mp/readtemplate')) a.remove();
    });
  }

  return { title, author, account, contentHtml: contentEl ? contentEl.innerHTML : '', imageMap };
}

function htmlToMarkdown(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  let md = '';
  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) { md += node.textContent; return; }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'p' || tag === 'div') { if (tag === 'p') md += '\n\n'; node.childNodes.forEach(walk); if (tag === 'p') md += '\n\n'; return; }
    if (tag === 'br') { md += '\n'; return; }
    if (tag === 'strong' || tag === 'b') { md += '**'; node.childNodes.forEach(walk); md += '**'; return; }
    if (tag === 'em' || tag === 'i') { md += '*'; node.childNodes.forEach(walk); md += '*'; return; }
    if (tag === 's' || tag === 'del') { md += '~~'; node.childNodes.forEach(walk); md += '~~'; return; }
    if (tag === 'h1') { md += '\n\n# '; node.childNodes.forEach(walk); md += '\n\n'; return; }
    if (tag === 'h2') { md += '\n\n## '; node.childNodes.forEach(walk); md += '\n\n'; return; }
    if (tag === 'h3') { md += '\n\n### '; node.childNodes.forEach(walk); md += '\n\n'; return; }
    if (tag === 'h4') { md += '\n\n#### '; node.childNodes.forEach(walk); md += '\n\n'; return; }
    if (tag === 'blockquote') { md += '\n\n> '; node.childNodes.forEach(walk); md += '\n\n'; return; }
    if (tag === 'code') { md += '`'; node.childNodes.forEach(walk); md += '`'; return; }
    if (tag === 'pre') { md += '\n\n```\n'; node.childNodes.forEach(walk); md += '\n```\n\n'; return; }
    if (tag === 'a') { const href = node.getAttribute('href') || ''; md += '['; node.childNodes.forEach(walk); md += `](${href})`; return; }
    if (tag === 'img') { const src = node.getAttribute('src') || ''; const alt = node.getAttribute('alt') || ''; md += `\n\n![${alt}](${src})\n\n`; return; }
    if (tag === 'ul' || tag === 'ol') { md += '\n\n'; node.childNodes.forEach(walk); md += '\n\n'; return; }
    if (tag === 'li') { md += '- '; node.childNodes.forEach(walk); md += '\n'; return; }
    if (tag === 'table') { md += '\n\n'; node.childNodes.forEach(walk); md += '\n\n'; return; }
    if (tag === 'tr') { node.childNodes.forEach(walk); md += '|\n'; return; }
    if (tag === 'th' || tag === 'td') { md += '| '; node.childNodes.forEach(walk); md += ' '; return; }
    if (tag === 'thead' || tag === 'tbody') { node.childNodes.forEach(walk); return; }
    if (tag === 'script' || tag === 'style' || tag === 'iframe') return;
    node.childNodes.forEach(walk);
  }
  walk(doc.body);
  return md.replace(/\n{3,}/g, '\n\n').trim();
}

async function fetchArticle() {
  const urlInput = $('#article-url');
  const url = urlInput?.value?.trim();
  if (!url) { setStatus('请输入文章链接', 'error'); return; }
  if (!url.includes('mp.weixin.qq.com')) { setStatus('请输入有效的微信公众号文章链接', 'error'); return; }

  const fetchBtn = $('#btn-fetch');
  const exportBtn = $('#btn-export');
  fetchBtn.disabled = true;
  exportBtn.disabled = true;
  setStatus('正在获取文章和图片...', 'loading');
  setProgress(10);

  try {
    const resp = await fetch('/api/fetch-article', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await resp.json();
    if (data.error) { setStatus(data.error, 'error'); return; }

    setProgress(60);
    setStatus('正在解析文章内容...', 'loading');
    imageStore = data.images || {};
    currentArticle = parseWechatArticle(data.html, imageStore);

    setProgress(80);
    setStatus('正在渲染预览...', 'loading');

    const mdContent = htmlToMarkdown(currentArticle.contentHtml);
    if (editor) editor.value = mdContent;
    updatePreview();
    updateWechatMdPreview();

    setProgress(100);
    const imgCount = Object.keys(imageStore).length;
    const metaBar = $('#article-meta');
    if (metaBar) {
      metaBar.style.display = 'flex';
      $('#wc-meta-title').textContent = `📄 ${currentArticle.title}`;
      $('#wc-meta-author').textContent = `✍️ ${currentArticle.author}`;
      $('#wc-meta-account').textContent = `📢 ${currentArticle.account}`;
    }
    setStatus(`获取成功！共 ${imgCount} 张图片（导出时下载到本地）`, 'success');
    exportBtn.disabled = false;
    setTimeout(() => { const bar = $('#fetch-progress'); if (bar) bar.classList.remove('active'); }, 1000);
  } catch (e) {
    setStatus(`获取失败: ${e.message}`, 'error');
  } finally {
    fetchBtn.disabled = false;
  }
}

function replaceWechatUrlsWithLocal(text) {
  for (const [origUrl, info] of Object.entries(imageStore)) {
    text = text.split(origUrl).join(`images/${info.filename}`);
  }
  text = text.replace(/!\[([^\]]*)\]\((https?:\/\/mmbiz\.qpic\.cn\/[^\)]+)\)/g, (match, alt, url) => {
    for (const [origUrl, info] of Object.entries(imageStore)) {
      if (url === origUrl || url.startsWith(origUrl.split('?')[0])) {
        return `![${alt}](images/${info.filename})`;
      }
    }
    return `![${alt}](images/download_failed.png)`;
  });
  return text;
}

async function exportZip() {
  if (!currentArticle) return;
  setStatus('正在打包文件...', 'loading');
  setProgress(10);
  try {
    const zip = new JSZip();
    const folderName = currentArticle.title.replace(/[\\/:*?"<>|]/g, '_');
    const articleFolder = zip.folder(folderName);
    const imagesFolder = articleFolder.folder('images');
    for (const [origUrl, info] of Object.entries(imageStore)) {
      const bytes = base64ToUint8Array(info.base64);
      imagesFolder.file(info.filename, bytes);
    }
    setProgress(40);
    let mdContent = replaceWechatUrlsWithLocal(editor?.value || '');
    articleFolder.file('article.md', mdContent);
    setProgress(55);
    let fmMd = '---\n';
    fmMd += `title: "${currentArticle.title.replace(/"/g, '\\"')}"\n`;
    fmMd += `description: "来自微信公众号：${currentArticle.account}"\n`;
    fmMd += `date: ${new Date().toISOString().split('T')[0]}\n`;
    fmMd += `published: true\n`;
    fmMd += `tags:\n  - 微信公众号\n`;
    fmMd += `categories:\n  - 转载\n`;
    fmMd += '---\n\n';
    fmMd += mdContent;
    articleFolder.file('hozokura-article.md', fmMd);
    setProgress(85);
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    setProgress(95);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${folderName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    setProgress(100);
    const imgCount = Object.keys(imageStore).length;
    setStatus(`导出完成！${folderName}.zip（${imgCount} 张图片 + MD）`, 'success');
    setTimeout(() => { const bar = $('#fetch-progress'); if (bar) bar.classList.remove('active'); }, 1000);
  } catch (e) {
    setStatus(`导出失败: ${e.message}`, 'error');
  }
}

function initFetch() {
  const btn = $('#btn-fetch');
  const input = $('#article-url');
  if (btn) btn.addEventListener('click', fetchArticle);
  if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') fetchArticle(); });
}

initFetchPaneToggle();
initEditButton();
initExportMenu();
initLightbox();
initFetch();

if (editor) {
  editor.value = `欢迎使用 Hozokura 编辑器 — 支持 Frontmatter 可视化、短代码和实时预览。\n\n---\n\n示例短代码：\n\n[warn]这是一个警告提示[/warn]\n\n[right]这是成功提示[/right]\n\n[wrong]这是错误提示[/wrong]\n\n[hide]这段文本默认隐藏，悬停可见[/hide]\n\n[video title="我的视频"]https://www.bilibili.com/video/BV1xx411c7mD[/video]\n\n[music title="夜间循环播放"]https://music.163.com/#/song?id=29764561[/music]\n`;
  updatePreview();
}
