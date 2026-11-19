// == 用户配置区域开始 ==

// 版本号 (会显示在页面页脚)
const SCRIPT_VERSION = 'v1.0.1';

// 允许代理的域名列表
const ALLOWED_HOSTS = [
  'drive.google.com',
  'www.dropbox.com',
  'drive.usercontent.google.com',
  'dl.dropboxusercontent.com', // 包括 Dropbox 分配的下载子域名
];

// == 用户配置区域结束 ==

const UPSTREAM_HEADER_TIMEOUT_MS = 30_000;
const REQUEST_HEADERS = ['Range', 'If-Range', 'If-None-Match', 'If-Modified-Since'];
const DOWNLOAD_HEADERS = [
  'Accept-Ranges', 'Content-Disposition', 'Content-Encoding', 'Content-Length',
  'Content-Range', 'Content-Type', 'ETag', 'Last-Modified',
];
const RESPONSE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function parseShareUrl(value) {
  return new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : 'https://' + value);
}

function isAllowedTarget(url) {
  const host = url.hostname;
  return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
    (ALLOWED_HOSTS.includes(host) || (ALLOWED_HOSTS.includes('dl.dropboxusercontent.com') &&
      /^[a-z0-9-]+\.dl\.dropboxusercontent\.com$/.test(host)));
}

function proxyUrl(origin, target) {
  return `${origin}/${encodeURIComponent(target.href)}`;
}

const ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap"><path d="M4 14a1 1 0 0 1-.78-1.63l2.66-3.32 2.54-3.18A.5.5 0 0 1 9 5.5h6.5a.5.5 0 0 1 .3.9L11 12v4c0 .55-.45 1-1 1H4z"/><path d="m18.5 12.5-5 5c-.22.22-.58.22-.8 0l-1.95-1.95c-.22-.22-.22-.58 0-.8s.58-.22.8 0L12 15.45l4.7-4.7c.22-.22.58-.22.8 0s.22.58 0 .8z"/></svg>`;

const homepageHtml = (nonce) => `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>文件直链加速服务</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(ICON_SVG)}">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body, h1, p { margin: 0; }
    button, input { font: inherit; }
    button { cursor: pointer; }
    :focus-visible { outline: 3px solid #6366f1; outline-offset: 2px; }
    [hidden] { display: none !important; }
    .app {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      color: #1f2937;
    }
    .app.dark-mode { color: #d1d5db; }
    #theme-toggle {
      position: fixed;
      top: 1rem;
      right: 1rem;
      padding: .5rem;
      border-radius: 9999px;
      color: inherit;
    }
    #theme-toggle svg { display: block; width: 1.5rem; height: 1.5rem; }
    .panel { width: 100%; max-width: 56rem; padding: 2rem; border-radius: 1rem; }
    .panel > * + * { margin-top: 2rem; }
    .intro { text-align: center; font-size: 1.125rem; }
    .intro h1 { margin-bottom: 1rem; font-size: 3rem; line-height: 1; font-weight: 900; }
    .source-controls { display: flex; flex-direction: column; gap: 1rem; }
    #source-url, #result-text {
      padding: 1rem;
      border-radius: .5rem;
      background: rgb(255 255 255 / .5);
      color: #111827;
    }
    .dark-mode #source-url, .dark-mode #result-text { background: rgb(0 0 0 / .2); color: white; }
    #source-url { flex: 1; min-width: 0; border: 2px solid transparent; }
    #generate-btn { padding: 1rem 2rem; }
    #result-area { padding-top: 1.5rem; }
    #result-text { overflow-wrap: anywhere; }
    #action-buttons { display: grid; gap: 1rem; margin-top: 1rem; }
    #copy-btn { padding: .75rem 1rem; border: 0; border-radius: .5rem; background: #e5e7eb; color: inherit; font-weight: 600; }
    #copy-btn:hover { background: #d1d5db; }
    .dark-mode #copy-btn { background: #374151; }
    .dark-mode #copy-btn:hover { background: #4b5563; }
    #download-btn { padding: .75rem 0; text-align: center; }
    @media (min-width: 640px) {
      .source-controls { flex-direction: row; }
      #action-buttons { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (min-width: 768px) {
      .panel { padding: 3rem; }
      .intro h1 { font-size: 4.5rem; }
    }
    @keyframes gradient-animation {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    body {
      font-family: system-ui, sans-serif;
      line-height: 1.5;
      background-size: 200% 200% !important;
      animation: gradient-animation 15s ease infinite;
      transition: background-image 0.5s ease-in-out;
    }
    .light-mode {
      background: linear-gradient(-45deg, #e0c3fc, #8ec5fc, #f093fb, #f5576c);
    }
    .dark-mode {
      background: linear-gradient(-45deg, #0f2027, #203a43, #2c5364, #132730);
    }
    .glass-container {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: all 0.3s ease;
    }
    .dark-mode .glass-container {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .glow-shadow {
      box-shadow: 0 0 15px rgba(128, 90, 213, 0.4), 0 0 30px rgba(128, 90, 213, 0.3), 0 0 45px rgba(128, 90, 213, 0.2);
    }
    .title-gradient {
      background-image: linear-gradient(to right, #6366f1, #a855f7, #ec4899);
      background-clip: text;
      color: transparent;
    }
    .btn-gradient {
      background-image: linear-gradient(to right, #8b5cf6 0%, #ec4899 51%, #8b5cf6 100%);
      background-size: 200% auto;
      border: 0;
      border-radius: .5rem;
      color: white;
      font-weight: 700;
      letter-spacing: .05em;
      text-transform: uppercase;
      text-decoration: none;
      transition: 0.5s;
    }
    .btn-gradient:hover {
      background-position: right center;
      transform: scale(1.05);
    }
    .toast {
      position: fixed;
      bottom: 1.25rem;
      left: 50%;
      padding: .75rem 1.5rem;
      border-radius: .5rem;
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1);
      color: white;
      font-weight: 600;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s, transform 0.3s;
      transform: translate(-50%, 20px);
    }
    .toast.show {
      opacity: 1;
      transform: translateX(-50%);
    }
  </style>
</head>
<body class="app light-mode">
  <button id="theme-toggle" class="glass-container">
    <svg id="theme-icon-light" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m8.66-15.66l-.7.7M4.04 19.96l-.7.7M21 12h-1M4 12H3m15.66 8.66l-.7-.7M4.04 4.04l-.7-.7M12 8a4 4 0 100 8 4 4 0 000-8z"></path></svg>
    <svg id="theme-icon-dark" hidden fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
  </button>
  <div class="panel glass-container glow-shadow">
    <div class="intro">
      <h1 class="title-gradient">极速文件链接</h1>
      <p>粘贴 Google Drive 或 Dropbox 分享链接，生成代理下载地址。</p>
    </div>
    <div class="source-controls">
      <input id="source-url" type="text" placeholder="请在此处粘贴分享链接...">
      <button id="generate-btn" class="btn-gradient">生成链接</button>
    </div>
    <div id="result-area" hidden>
      <p id="result-text"></p>
      <div id="action-buttons">
        <button id="copy-btn">📋 复制链接</button>
        <a id="download-btn" target="_blank" rel="noopener noreferrer" class="btn-gradient">⚡ 立即下载</a>
      </div>
    </div>
  </div>
  <div id="toast" class="toast" role="status"></div>
  <script nonce="${nonce}">
    const ALLOWED_HOSTS = ${JSON.stringify(ALLOWED_HOSTS).replaceAll('<', '\\u003c')};
    ${parseShareUrl.toString()}
    ${isAllowedTarget.toString()}
    ${proxyUrl.toString()}
    const workerDomain = window.location.origin;
    const urlInput = document.getElementById('source-url');
    const resultArea = document.getElementById('result-area');
    const resultText = document.getElementById('result-text');
    const downloadBtn = document.getElementById('download-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const lightIcon = document.getElementById('theme-icon-light');
    const darkIcon = document.getElementById('theme-icon-dark');
    let generatedLink = '';
    let savedTheme;
    try { savedTheme = localStorage.getItem('theme'); } catch { /* Storage is optional. */ }
    
    function setTheme(isDark) {
      document.body.classList.toggle('dark-mode', isDark);
      document.body.classList.toggle('light-mode', !isDark);
      lightIcon.toggleAttribute('hidden', isDark);
      darkIcon.toggleAttribute('hidden', !isDark);
      try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch { /* Storage is optional. */ }
    }

    themeToggle.addEventListener('click', () => {
        setTheme(document.body.classList.contains('light-mode'));
    });

    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setTheme(true);
    } else {
        setTheme(false);
    }

    function showToast(message, isError = false) { 
      const toast = document.getElementById('toast'); 
      toast.textContent = message; 
      toast.style.backgroundColor = isError ? 'rgb(239 68 68)' : 'rgb(34 197 94)';
      toast.classList.add('show'); 
      setTimeout(() => toast.classList.remove('show'), 3000); 
    }
    function generateLink() {
      const sourceUrl = urlInput.value.trim();
      generatedLink = '';
      resultText.textContent = '';
      downloadBtn.removeAttribute('href');
      resultArea.hidden = true;
      if (!sourceUrl) { showToast('请输入链接', true); return; }
      let target;
      try { target = parseShareUrl(sourceUrl); } catch { showToast('请输入有效的链接', true); return; }
      if (!isAllowedTarget(target)) { showToast('请输入受支持的 HTTPS 分享链接', true); return; }
      target.hash = '';
      generatedLink = proxyUrl(workerDomain, target);
      resultText.textContent = generatedLink;
      downloadBtn.href = generatedLink;
      resultArea.hidden = false;
    }
    async function copyLink() {
      if (!generatedLink) return;
      try {
        await navigator.clipboard.writeText(generatedLink);
        showToast('链接已复制到剪贴板');
      } catch {
        showToast('复制失败', true);
      }
    }
    document.getElementById('generate-btn').addEventListener('click', generateLink);
    document.getElementById('copy-btn').addEventListener('click', copyLink);
    urlInput.addEventListener('keyup', (event) => { if (event.key === 'Enter') generateLink(); });
  </script>
</body>
</html>
`;

function normalizeDownloadTarget(target) {
  if (target.hostname === 'www.dropbox.com') {
    target.searchParams.set('dl', '1');
  } else if (target.hostname === 'drive.google.com') {
    const file = /^\/file\/d\/([\w-]+)(?:\/(?:view|preview|edit))?\/?$/.exec(target.pathname);
    if (file) {
      target.pathname = '/uc';
      target.searchParams.set('id', file[1]);
      target.searchParams.set('export', 'download');
    }
  }
  target.hash = '';
}

function isDriveDownloadEndpoint(target) {
  return (target.hostname === 'drive.google.com' && target.pathname === '/uc') ||
    (target.hostname === 'drive.usercontent.google.com' && target.pathname === '/download');
}

function rewriteConfirmation(response, target, workerOrigin) {
  function resolveLink(value) {
    try {
      const url = new URL(value.replaceAll('&amp;', '&'), target);
      return isAllowedTarget(url) ? url : null;
    } catch {
      return null;
    }
  }

  const removeElement = { element: (element) => element.remove() };
  const rewriteLink = {
    element(element) {
      const link = resolveLink(element.getAttribute('href'));
      if (link) {
        element.setAttribute('href', proxyUrl(workerOrigin, link));
      } else {
        element.removeAttribute('href');
      }
    },
  };

  return new HTMLRewriter()
    .on('*', {
      element(element) {
        for (const attribute of ['target', 'ping', 'attributionsrc', 'formaction', 'formmethod', 'formtarget']) {
          element.removeAttribute(attribute);
        }
      },
    })
    .on('base', removeElement)
    .on('meta', removeElement)
    .on('link', removeElement)
    .on('script', removeElement)
    .on('noscript', removeElement)
    .on('svg', removeElement)
    .on('math', removeElement)
    .on('iframe', removeElement)
    .on('object', removeElement)
    .on('embed', removeElement)
    .on('textarea', removeElement)
    .on('select', removeElement)
    .on('input', {
      element(element) {
        const type = element.getAttribute('type')?.toLowerCase();
        if (type !== 'hidden' && type !== 'submit') element.remove();
      },
    })
    .on('a[href]', rewriteLink)
    .on('area[href]', rewriteLink)
    .on('form', {
      element(element) {
        const action = resolveLink(element.getAttribute('action') ?? '');
        if (!action || !isDriveDownloadEndpoint(action)) {
          element.remove();
          return;
        }
        // The browser supplies the confirmation fields in the proxy request's query.
        action.search = '';
        action.hash = '';
        element.setAttribute('action', proxyUrl(workerOrigin, action));
        element.setAttribute('method', 'get');
      },
    })
    .transform(response);
}

function errorResponse(message, status, method, extraHeaders = {}) {
  return new Response(method === 'HEAD' ? null : message, {
    status,
    headers: { ...RESPONSE_HEADERS, ...extraHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

async function proxyDownload(target, request, workerOrigin) {
  normalizeDownloadTarget(target);
  const upstreamHeaders = new Headers();
  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) upstreamHeaders.set(name, value);
  }
  if (target.hostname === 'drive.google.com' || target.hostname === 'drive.usercontent.google.com') {
    upstreamHeaders.set('Referer', 'https://drive.google.com/');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_HEADER_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(target.href, {
      method: request.method,
      headers: upstreamHeaders,
      redirect: 'manual',
      cf: { cacheTtl: 0 },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const headers = new Headers(RESPONSE_HEADERS);
  if (REDIRECT_STATUSES.has(response.status)) {
    await response.body?.cancel();
    const location = response.headers.get('Location');
    let redirect;
    try {
      if (location?.trim()) redirect = new URL(location, target);
    } catch { /* Invalid upstream Location. */ }
    if (redirect?.hostname === 'accounts.google.com') {
      return errorResponse('目标文件需要登录。请使用可公开下载的分享链接。', 403, request.method);
    }
    if (!redirect || !isAllowedTarget(redirect)) {
      return errorResponse('目标服务返回了不受支持的重定向。', 502, request.method);
    }
    redirect.hash = '';
    if (redirect.href === target.href) {
      return errorResponse('目标服务返回了循环重定向。', 502, request.method);
    }
    headers.set('Location', proxyUrl(workerOrigin, redirect));
    return new Response(null, { status: response.status, headers });
  }

  const contentType = response.headers.get('Content-Type') || '';
  const isConfirmation = response.status === 200 && isDriveDownloadEndpoint(target) &&
    contentType.split(';', 1)[0].trim().toLowerCase() === 'text/html' &&
    !response.headers.has('Content-Disposition');
  if (isConfirmation) {
    headers.set('Content-Type', contentType);
    headers.set('Content-Security-Policy',
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; " +
      'form-action ' + workerOrigin + '; sandbox allow-forms allow-downloads');
    const body = request.method === 'HEAD' ? null : rewriteConfirmation(response, target, workerOrigin).body;
    return new Response(body, { status: response.status, headers });
  }

  for (const name of DOWNLOAD_HEADERS) {
    const value = response.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  const disposition = headers.get('Content-Disposition') || '';
  if (response.status !== 304) {
    headers.set('Content-Disposition', disposition.replace(/^[^;]*/, 'attachment'));
  }
  if (!headers.has('Content-Type') && response.status !== 304) {
    headers.set('Content-Type', 'application/octet-stream');
  }
  headers.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; sandbox");
  const body = request.method === 'HEAD' ? null : response.body;
  return new Response(body, { status: response.status, headers });
}

export default {
  async fetch(request) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return errorResponse('仅支持 GET 和 HEAD 请求。', 405, request.method, { Allow: 'GET, HEAD' });
    }

    const url = new URL(request.url);
    if (url.pathname === '/') {
      const nonce = crypto.randomUUID();
      return new Response(request.method === 'HEAD' ? null : homepageHtml(nonce), {
        headers: {
          ...RESPONSE_HEADERS,
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; " +
            "form-action 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'nonce-" + nonce + "'",
        },
      });
    }

    let target;
    try {
      const path = url.pathname.slice(1);
      // Keep existing unencoded routes and preserve escapes within provider paths.
      const source = /^https?%3a%2f%2f/i.test(path) ? decodeURIComponent(path) : path;
      target = parseShareUrl(source + url.search);
    } catch {
      return errorResponse('无效的目标链接格式。', 400, request.method);
    }
    if (!isAllowedTarget(target)) {
      return errorResponse('仅支持允许列表中的 HTTPS 下载地址。', 403, request.method);
    }

    try {
      return await proxyDownload(target, request, url.origin);
    } catch {
      return errorResponse('无法从目标服务获取文件。', 502, request.method);
    }
  },
};
