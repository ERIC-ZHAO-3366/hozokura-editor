// (top duplicated block removed)

import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

// DOM Elements
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const downloadBtn = document.getElementById('btn-download');
const metaFilename = document.getElementById('meta-filename');

// Meta Fields
const metaTitle = document.getElementById('meta-title');
const metaDesc = document.getElementById('meta-desc');
const metaDate = document.getElementById('meta-date');
const metaTags = document.getElementById('meta-tags');
const metaCategories = document.getElementById('meta-categories');

// Top Panel Toggle Elements
const toggleBtn = document.getElementById('toggle-meta-btn');
const metaContent = document.getElementById('meta-content');
const toggleIcon = document.getElementById('meta-toggle-icon');

if (toggleBtn && metaContent && toggleIcon) {
  // ensure initial display aligns with collapsed state
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
      // show then remove collapsed to allow transition
      metaContent.style.display = '';
      void metaContent.offsetWidth; // force reflow
      metaContent.classList.remove('collapsed');
      toggleIcon.style.transform = 'rotate(0deg)';
    }
  });
}

// Init Date
if (metaDate && metaDate.valueAsDate === null) metaDate.valueAsDate = new Date();

// Note: publish toggle removed from UI; exports default to published

// Setup marked options
marked.setOptions({ gfm: true, breaks: true });

// THEME: support toggling light/dark and persist preference
function applyTheme(theme) {
  if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  
  const themeToggle = document.getElementById('theme-toggle-checkbox');
  if (themeToggle) {
    themeToggle.checked = (theme === 'dark');
  }
}

function initTheme() {
  const themeToggle = document.getElementById('theme-toggle-checkbox');
  const stored = localStorage.getItem('hozokura-theme');
  if (stored === 'dark' || stored === 'light') {
    applyTheme(stored);
  } else {
    // default to system preference
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }
  if (themeToggle) {
    themeToggle.addEventListener('change', (e) => {
      const isDark = e.target.checked;
      const next = isDark ? 'dark' : 'light';
      applyTheme(next);
      localStorage.setItem('hozokura-theme', next);
    });
  }
}

initTheme();

function parseCustomShortcodes(html) {
  const shortcodes = [
    { regex: /\[warn\]([\s\S]*?)\[\/warn\]/g, replacement: '<div class="shortcode-block shortcode-warn"><span class="shortcode-icon">⚠️</span><div class="shortcode-content">$1</div></div>' },
    { regex: /\[wrong\]([\s\S]*?)\[\/wrong\]/g, replacement: '<div class="shortcode-block shortcode-wrong"><span class="shortcode-icon">❌</span><div class="shortcode-content">$1</div></div>' },
    { regex: /\[right\]([\s\S]*?)\[\/right\]/g, replacement: '<div class="shortcode-block shortcode-right"><span class="shortcode-icon">✅</span><div class="shortcode-content">$1</div></div>' },
    { regex: /\[hide\]([\s\S]*?)\[\/hide\]/g, replacement: '<span class="shortcode-hide" title="悬停显示">$1</span>' }
  ];

  return shortcodes.reduce((acc, { regex, replacement }) => acc.replace(regex, replacement), html);
}

function generateFrontmatter() {
  const title = (metaTitle && metaTitle.value) ? metaTitle.value.trim() : '';
  const desc = (metaDesc && metaDesc.value) ? metaDesc.value.trim() : '';
  const date = (metaDate && metaDate.value) ? metaDate.value : '';
  const tagsArr = (metaTags && metaTags.value) ? metaTags.value.split(',').map(t => t.trim()).filter(Boolean) : [];
  const catArr = (metaCategories && metaCategories.value) ? metaCategories.value.split(',').map(c => c.trim()).filter(Boolean) : [];
  // Exports default to published
  const isPublish = true;

  let fm = '---\n';
  if (title) fm += `title: "${title}"\n`;
  if (desc) fm += `description: "${desc}"\n`;
  if (date) fm += `date: "${date}"\n`;
  fm += `published: ${isPublish}\n`;
  if (tagsArr.length > 0) fm += `tags:\n${tagsArr.map(t => `  - ${t}`).join('\n')}\n`;
  if (catArr.length > 0) fm += `categories:\n${catArr.map(c => `  - ${c}`).join('\n')}\n`;
  fm += '---\n\n';
  return fm;
}

function updatePreview() {
  if (!editor || !preview) return;
  const rawMarkdown = editor.value || '';
  let html = marked.parse(rawMarkdown);
  html = parseCustomShortcodes(html);

  const titleHtml = metaTitle && metaTitle.value ? metaTitle.value : 'Untitled';
  const descHtml = metaDesc && metaDesc.value ? metaDesc.value : '';

  let previewHtml = `<div class="preview-meta"><h1>${escapeHtml(titleHtml)}</h1>`;
  if (descHtml) previewHtml += `<p class="sys-text-secondary" style="margin-bottom:16px;"><i>${escapeHtml(descHtml)}</i></p>`;
  previewHtml += `</div>`;

  preview.innerHTML = previewHtml + html;
}

function escapeHtml(s) {
  return s.replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Toolbar actions (initialized after DOM ready)
function initToolbar() {
  if (!editor) return;

  // Track last known selection so clicks on toolbar still insert at intended caret
  const lastSel = { start: 0, end: 0 };
  function updateLastSelection() {
    try {
      lastSel.start = editor.selectionStart;
      lastSel.end = editor.selectionEnd;
    } catch (err) {
      // ignore if unavailable
    }
  }

  ['keyup', 'mouseup', 'click', 'input', 'select', 'keydown', 'focus'].forEach(evt => {
    editor.addEventListener(evt, updateLastSelection);
  });

  document.querySelectorAll('.tb-btn').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault(); // keep textarea selection
    });
    // also support keyboard activation
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const action = e.currentTarget.getAttribute('data-action');
      // Use current selection if available, otherwise fallback to last known
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
    'sc-hide': { before: '[hide]', after: '[/hide]' }
  };

  if (actions[action]) {
    const a = actions[action];
    const placeholder = (action.startsWith('sc-') || action === 'code') ? '内容' : 'text';
    const insertedContent = selectedText || placeholder;
    const newText = a.before + insertedContent + a.after;

    editor.value = currentText.substring(0, start) + newText + currentText.substring(end);
    editor.focus();
    editor.selectionStart = start + a.before.length;
    editor.selectionEnd = editor.selectionStart + insertedContent.length;
    updatePreview();
  }
}

// Event Listeners for Live Update and shortcuts
if (editor) {
  editor.addEventListener('input', updatePreview);
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
      if (action) {
        e.preventDefault();
        insertMarkdownAtCursor(action);
      }
    }
  });
}

if (metaTitle) metaTitle.addEventListener('input', updatePreview);
if (metaDesc) metaDesc.addEventListener('input', updatePreview);

// Download logic
if (downloadBtn) {
  downloadBtn.addEventListener('click', () => {
    const frontmatter = generateFrontmatter();
    const content = editor ? editor.value : '';
    const fullDocument = frontmatter + content;

    // Prefer explicit filename input; fallback to title-based slug; sanitize to safe filename
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

// Auto-fill filename from title when user hasn't provided one
if (metaTitle && metaFilename) {
  metaTitle.addEventListener('input', () => {
    try {
      if (!metaFilename.value || !metaFilename.value.trim()) {
        metaFilename.value = metaTitle.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
    } catch (e) { /* ignore */ }
  });
}

// Initial Render
if (editor) {
  editor.value = `欢迎使用 Hozokura 编辑器 — 支持 Frontmatter 可视化、短代码和实时预览。\n\n---\n\n示例短代码：\n\n[warn]这是一个警告提示[/warn]\n\n[right]这是成功提示[/right]\n\n[wrong]这是错误提示[/wrong]\n\n[hide]这段文本默认隐藏，悬停可见[/hide]\n`;
  updatePreview();
}
