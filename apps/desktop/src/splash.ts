/** Immediate desktop loading document shown while the Host process starts. */

const escapeHtml = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')

/**
 * Build a self-contained data URL with desktop window controls and a loading indicator.
 * @param productName - User-visible window title.
 * @param logoSvg - Trusted product SVG loaded from the desktop application tree.
 * @returns a data URL suitable for `BrowserWindow.loadURL`.
 */
export function createDesktopSplashUrl(productName: string, logoSvg: string): string {
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{color-scheme:dark;font-family:"Segoe UI",sans-serif}*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#171717;color:#f2f2f2}body{display:flex;flex-direction:column}.titlebar{display:flex;flex:0 0 40px;align-items:center;justify-content:space-between;border-bottom:1px solid #292929;-webkit-app-region:drag}.brand{display:flex;align-items:center;gap:9px;padding-left:14px;font-size:13px;font-weight:500}.brand svg{width:22px;height:22px}.controls{display:flex;align-self:stretch;-webkit-app-region:no-drag}.controls button{width:46px;padding:0;border:0;background:transparent;color:#d8d8d8;font:400 16px/1 "Segoe UI Symbol",sans-serif}.controls button:hover{background:#303030}.controls [data-action=close]:hover{background:#c42b1c;color:#fff}.loading{display:grid;flex:1;place-items:center}.loading-inner{display:flex;align-items:center;gap:12px;color:#a9a9a9;font-size:13px}.spinner{width:16px;height:16px;border:2px solid #363636;border-top-color:#4d6bfe;border-radius:50%;animation:spin .75s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}</style>
</head>
<body>
<header class="titlebar"><div class="brand">${logoSvg}<span>${escapeHtml(productName)}</span></div><div class="controls" aria-label="窗口控制"><button type="button" data-action="minimize" aria-label="最小化">&#x2212;</button><button type="button" data-action="maximize" aria-label="最大化">&#x25A1;</button><button type="button" data-action="close" aria-label="关闭">&#x00D7;</button></div></header>
<main class="loading"><div class="loading-inner" role="status" aria-live="polite"><span class="spinner"></span><span>正在启动工作区…</span></div></main>
<script>document.querySelector('.controls').addEventListener('click',event=>{const action=event.target.closest('button')?.dataset.action;const chrome=window.__DSH_DESKTOP_CHROME__;if(action==='minimize')chrome.minimize();if(action==='maximize')chrome.toggleMaximize();if(action==='close')chrome.close()})</script>
</body>
</html>`
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
}
