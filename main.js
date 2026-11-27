/* morz-ribbon v0.1.3 — 把 Morz 单行格式工具栏重排为分组 Ribbon
 * 功能范围与原生 .toolbar-top 的 25 个按钮一一对应，不新增、不删减。
 * 依赖公开 SDK：ctx.editor.runCommand / ctx.active / ctx.editor.view / ctx.vault.writeBlob
 */
'use strict';

/* ---------------- 图标（24×24 stroke） ---------------- */
var ICONS = {
  undo: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  redo: 'm15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3',
  eraser: 'M7 21h10M4 16l7-7 6 6-4 4H7z',
  bold: 'M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z',
  italic: 'M15.5 5H10.5M13.5 19H8.5M14 5l-4 14',
  underline: 'M7 4v7a5 5 0 0 0 10 0V4M5 20h14',
  highlight: 'M9 12l5-5 4 4-5 5H9zM6 20h13',
  comment: 'M21 15a2 2 0 0 1-2 2H9l-5 4V6a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z',
  type: 'M4 7V5h16v2M12 5v14M9 19h6',
  bullet: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  ordered: 'M10 6h11M10 12h11M10 18h11M4 5h1.5v4M4 13h2l-2 3h2',
  task: 'M10 6h11M10 12h11M10 18h11M3 6l1.5 1.5L7 5M3 17l1.5 1.5L7 16',
  quote: 'M9 7H5v5h4V9c0 3-1 5-3 6M19 7h-4v5h4V9c0 3-1 5-3 6',
  callout: 'M12 8v5M12 16h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  table: 'M3 5h18v14H3zM3 10h18M9 10v9M15 10v9',
  image: 'M3 5h18v14H3zM8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 16l-5-5-6 6',
  toc: 'M4 6h16M7 12h13M7 18h13',
  yaml: 'M8 4c-2 0-3 1-3 3v3c0 2-1 2-2 2 1 0 2 0 2 2v3c0 2 1 3 3 3M16 4c2 0 3 1 3 3v3c0 2 1 2 2 2-1 0-2 0-2 2v3c0 2-1 3-3 3',
  emoji: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 14s1 2 3.5 2 3.5-2 3.5-2M9 9h.01M15 9h.01',
  code: 'M9 18l-6-6 6-6M15 6l6 6-6 6',
  focus: 'M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  fullscreen: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  chevron: 'M6 9l6 6 6-6',
  caret: 'M6 10l4 4 4-4',
  more: 'M6 5l5 7-5 7M13 5l5 7-5 7'
};

/* ---------------- 功能清单：与原生 25 项逐一对齐 ----------------
 * p = 按钮保留优先级（组内实在要收时用）。
 * foldP = 整组折叠优先级，越小越先被压成「组名 ▾」。编辑组 99 表示永不折叠（撤销/重做不能藏）。 */
var GROUPS = [
  { name: '编辑', foldP: 99, items: [
    { id: 'undo',    icon: 'undo',   label: '撤销',     p: 100, act: { t: 'key', key: 'z' } },
    { id: 'redo',    icon: 'redo',   label: '重做',     p: 100, act: { t: 'key', key: 'y' } },
    { id: 'clear',   icon: 'eraser', label: '清除格式', p: 10,  act: { t: 'cmd', name: 'clearFormat' } }
  ]},
  { name: '标题', foldP: 40, items: [
    { id: 'h2',   txt: 'H2', label: '标题 2', p: 85, act: { t: 'cmd', name: 'setHeading', args: [2] } },
    { id: 'h3',   txt: 'H3', label: '标题 3', p: 70, act: { t: 'cmd', name: 'setHeading', args: [3] } },
    { id: 'head', txt: 'H', caret: true, label: '标题级别', p: 100, act: { t: 'menu', menu: 'heading' } },
    { id: 'para', txt: '正文', cjk: true, label: '正文（降为段落）', p: 55, act: { t: 'heading', level: 0 } }
  ]},
  { name: '字符', foldP: 50, items: [
    { id: 'strong',    icon: 'bold',      label: '加粗',   p: 95, act: { t: 'cmd', name: 'toggleFormat', args: ['strong'] } },
    { id: 'emphasis',  icon: 'italic',    label: '斜体',   p: 80, act: { t: 'cmd', name: 'toggleFormat', args: ['emphasis'] } },
    { id: 'underline', icon: 'underline', label: '下划线', p: 62, act: { t: 'cmd', name: 'toggleFormat', args: ['underline'] } },
    { id: 'highlight', icon: 'highlight', label: '高亮',   p: 25, act: { t: 'cmd', name: 'applyHighlight' } },
    { id: 'comment',   icon: 'comment',   label: '注释',   p: 12, act: { t: 'cmd', name: 'toggleFormat', args: ['comment'] } },
    { id: 'fmt',       icon: 'type', caret: true, label: '更多字符格式', p: 100, act: { t: 'menu', menu: 'format' } }
  ]},
  { name: '段落', foldP: 30, items: [
    { id: 'bullet',  icon: 'bullet',  label: '无序列表', p: 92, act: { t: 'cmd', name: 'toggleList', args: ['bullet'] } },
    { id: 'ordered', icon: 'ordered', label: '有序列表', p: 75, act: { t: 'cmd', name: 'toggleList', args: ['ordered'] } },
    { id: 'task',    icon: 'task',    label: '任务列表', p: 45, act: { t: 'cmd', name: 'toggleList', args: ['task'] } },
    { id: 'quote',   icon: 'quote',   label: '引用',     p: 30, act: { t: 'cmd', name: 'toggleQuote' } },
    { id: 'callout', icon: 'callout', label: 'Callout',  p: 15, act: { t: 'cmd', name: 'insertCallout', args: ['note'] } }
  ]},
  { name: '插入', foldP: 20, items: [
    { id: 'table', icon: 'table', label: '表格',        p: 35, act: { t: 'cmd', name: 'insertTable', args: [3, 3] } },
    { id: 'image', icon: 'image', label: '本地图片',    p: 50, act: { t: 'image' } },
    { id: 'toc',   icon: 'toc',   label: '目录',        p: 6,  act: { t: 'cmd', name: 'insertToc' } },
    { id: 'yaml',  icon: 'yaml',  label: 'YAML 元信息', p: 3,  act: { t: 'cmd', name: 'insertFrontMatter' } },
    { id: 'emoji', icon: 'emoji', label: '表情',        p: 20, act: { t: 'emoji' } },
    { id: 'code',  icon: 'code',  label: '代码块',      p: 40, act: { t: 'cmd', name: 'insertCodeFence' } }
  ]},
  { name: '视图', foldP: 10, items: [
    { id: 'focus',  icon: 'focus',      label: '专注模式', p: 4,  act: { t: 'notice', msg: '专注模式由宿主控制，插件暂无法调用' } },
    { id: 'full',   icon: 'fullscreen', label: '全屏',     p: 8,  act: { t: 'fullscreen' } },
    { id: 'read',   icon: 'eye',        label: '阅读模式', p: 2,  act: { t: 'notice', msg: '阅读模式由宿主控制，插件暂无法调用' } }
  ]}
];

var MENUS = {
  heading: {
    title: '标题级别',
    items: [
      { label: '标题 1', key: 'Ctrl+1', act: { t: 'cmd', name: 'setHeading', args: [1] } },
      { label: '标题 2', key: 'Ctrl+2', act: { t: 'cmd', name: 'setHeading', args: [2] } },
      { label: '标题 3', key: 'Ctrl+3', act: { t: 'cmd', name: 'setHeading', args: [3] } },
      { label: '标题 4', key: 'Ctrl+4', act: { t: 'cmd', name: 'setHeading', args: [4] } },
      { label: '标题 5', key: 'Ctrl+5', act: { t: 'cmd', name: 'setHeading', args: [5] } },
      { label: '标题 6', key: 'Ctrl+6', act: { t: 'cmd', name: 'setHeading', args: [6] } },
      { label: '正文',   key: 'Ctrl+0', act: { t: 'heading', level: 0 } }
    ]
  },
  format: {
    title: '更多字符格式',
    items: [
      { label: '下划线',   key: 'Ctrl+U',       act: { t: 'cmd', name: 'toggleFormat', args: ['underline'] } },
      { label: '上标',     key: '',             act: { t: 'cmd', name: 'toggleFormat', args: ['superscript'] } },
      { label: '下标',     key: '',             act: { t: 'cmd', name: 'toggleFormat', args: ['subscript'] } },
      { label: '行内公式', key: '',             act: { t: 'cmd', name: 'toggleFormat', args: ['inlineMath'] } },
      { label: '链接',     key: 'Ctrl+K',       act: { t: 'cmd', name: 'insertLink' } },
      { sep: true },
      { label: '分隔线',   key: 'Ctrl+Alt+-',   act: { t: 'cmd', name: 'insertHorizontalRule' } },
      { label: '脚注',     key: 'Ctrl+Alt+R',   act: { t: 'cmd', name: 'insertFootnote' } },
      { label: '公式块',   key: '',             act: { t: 'cmd', name: 'insertMathBlock' } },
      { label: '清除格式', key: 'Ctrl+\\',      act: { t: 'cmd', name: 'clearFormat' } }
    ]
  }
};

var EMOJIS = ['😀','😄','😊','🙂','😉','😍','🤔','😅','😮','😢','😡','👍','👎','👏','🙏','💪','🔥','✨','⭐','🎉','✅','❌','⚠️','💡','📌','📎','🔗','📝','📊','📈','🗓','⏰','🚀','🎯','🧩','🔍','⚙️','🛠','📦','🌱','🍀','🌙','☀️','🌊','🍎','☕'];

/* ---------------- 运行期状态 ---------------- */
var ctx = null;
var cfg = { collapsed: false, hideNative: false, density: 'comfortable' };
var root = null;
var pop = null;
var popOwner = null;
var mo = null;
var rafId = 0;
var grpEls = [];          /* 每组 DOM 引用，供显示/隐藏时改列数 */
var foldList = [];        /* 当前展开的折叠组条目 */

/* ---------------- 工具 ---------------- */
function el(tag, cls, html) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

function svg(name, size) {
  var d = ICONS[name] || '';
  return '<svg viewBox="0 0 24 24" width="' + (size || 16) + '" height="' + (size || 16) +
    '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>';
}

function view() {
  try { return ctx.editor.view(); } catch (e) { return null; }
}

/* ---------------- 作用域：只在 Markdown 文档视图生效 ----------------
 * 三道判据，任一不满足就隐藏：
 *  1) ctx.views.active() 的 kind 必须是 editor（其余为 blank / attachment / plugin）。
 *     插件视图的 id 带「插件id:」前缀，也一并排除。
 *  2) CodeMirror 视图必须真的还在页面上：插件视图会把它摘掉或 display:none，
 *     这条是硬信号——0.1.2 只查了 views.active，少了 views 权限时它取不到，
 *     退化成只看路径，而路径在插件视图下仍是上一个 .md，于是工具栏盖到日历上。
 *  3) 当前路径必须是 .md / .markdown / .mdx。 */
var MD_RE = /\.(md|markdown|mdx)$/i;
var scopeState = null;

function editorLive() {
  var v = view();
  if (!v || !v.dom) return null;          /* 编辑器尚未就绪：交给 1)、3) 判断 */
  if (!v.dom.isConnected) return false;   /* 已被摘出 DOM */
  /* 用布局尺寸而非 offsetParent：position:fixed 的容器 offsetParent 恒为 null，
     会误判成「隐藏」。display:none 的祖先让 rect 归零，同样能识别出来。 */
  var r = v.dom.getBoundingClientRect();
  return r.width > 2 && r.height > 2;
}

function isMdView() {
  var kind = null, id = null;
  try {
    if (ctx.views && typeof ctx.views.active === 'function') {
      var v = ctx.views.active();
      if (v) { kind = v.kind; id = v.id; }
    }
  } catch (e) { /* 无 views 权限或旧 SDK，交给后面的判断 */ }
  if (kind && kind !== 'editor') return false;
  if (id && String(id).indexOf(':') >= 0) return false;

  var live = editorLive();
  if (live === false) return false;
  if (live === null) {
    /* SDK 拿不到视图本体时，退到 DOM 层再看一眼：插件视图会卸载编辑器或把它藏起来 */
    var el = document.querySelector('.cm-editor');
    if (!el) return false;
    var rr = el.getBoundingClientRect();
    if (!(rr.width > 2 && rr.height > 2)) return false;
  }

  var p = null;
  try { p = ctx.active.path(); } catch (e) { p = null; }
  return !!p && MD_RE.test(p);
}

/* 按当前视图切换 Ribbon 与原生栏的显示状态 */
function applyScope() {
  if (!root) return;
  var md = isMdView();
  scopeState = md;
  root.classList.toggle('is-off', !md);
  if (!md) {
    closePop();
    document.body.classList.remove('mzr-hide-native');
    return;
  }
  document.body.classList.toggle('mzr-hide-native', !!cfg.hideNative);
  /* 兜底：若 Ribbon 恰好被挂进被隐藏的容器，撤销隐藏，避免把自己藏掉 */
  if (!root.getClientRects().length) document.body.classList.remove('mzr-hide-native');
  lastW = -1;
  fit(true);
}

/* 视图切换时 SDK 未必每次都派发事件（插件视图与文档 tab 的路径相同），
   用低频心跳比对判定结果兜底：只在结果变化或宿主搬家时才动 DOM。 */
function startScopeWatch() {
  var tick = function () {
    if (!root) return;
    if (isMdView() !== scopeState) {
      reanchor();
      applyScope();
      scheduleSync();
      return;
    }
    if (!root.classList.contains('is-off')) {
      var host = pickHost();
      if (host && root.parentNode !== host) reanchor();
    }
  };
  try {
    if (ctx.timers && typeof ctx.timers.setInterval === 'function') {
      ctx.timers.setInterval(tick, 400);
      return;
    }
  } catch (e) { /* 旧 SDK 无 timers */ }
  var id = setInterval(tick, 400);
  ctx.onDispose(function () { clearInterval(id); });
}

function safe(fn) {
  try { return fn(); } catch (e) {
    if (ctx) ctx.ui.notice('操作失败：' + (e && e.message ? e.message : e), { kind: 'error' });
    return undefined;
  }
}

/* ---------------- 样式 ---------------- */
function buildCSS() {
  return [
    '.mzr-ribbon{box-sizing:border-box;position:sticky;top:0;z-index:30;display:flex;align-items:stretch;',
    '--bw:30px;--bh:28px;--rh:28px;--isz:16px;--fs:12px;--lfs:10px;',
    /* 非 Markdown 视图：整体移出布局，不占高度、不碰原生栏 */
    '.mzr-ribbon.is-off{display:none!important}',
    'padding:5px 32px 0 8px;background:var(--ui-bg,var(--bg-color,#fff));',
    'border-bottom:1px solid var(--ui-border,rgba(128,128,128,.16));',
    /* 三道保险：宽度严格等于父容器、不参与 flex 撑宽、溢出直接裁掉。
       右侧面板展开时父容器收窄，Ribbon 必须同步收窄，绝不能画到面板上。 */
    'width:100%;max-width:100%;min-width:0;overflow:hidden;',
    'font-family:var(--ui-font,system-ui,sans-serif);user-select:none;-webkit-user-select:none;flex:0 0 auto}',
    '.mzr-ribbon.compact{padding:3px 32px 0 4px}',
    /* 内层不换行：宽度一律由 JS 通过「收按钮」解决，绝不让组掉行导致高度变化 */
    '.mzr-scroll{display:flex;flex-wrap:nowrap;align-items:flex-start;justify-content:flex-start;flex:1 1 auto;min-width:0;overflow:hidden}',
    '.mzr-ribbon.mzr-tight-scroll .mzr-scroll{overflow-x:auto;overflow-y:hidden}',
    '.mzr-ribbon.mzr-tight-scroll .mzr-scroll::-webkit-scrollbar{height:0;width:0}',

    /* 尺寸档：宽度够就放大按钮与图标，由 JS 按可用宽度择优 */
    '.mzr-ribbon.sz-xl{--bw:38px;--bh:36px;--rh:36px;--isz:20px;--fs:13.5px;--lfs:11px}',
    '.mzr-ribbon.sz-lg{--bw:34px;--bh:32px;--rh:32px;--isz:18px;--fs:13px;--lfs:10.5px}',
    '.mzr-ribbon.sz-md{--bw:30px;--bh:28px;--rh:28px;--isz:16px;--fs:12px;--lfs:10px}',
    '.mzr-ribbon.sz-sm{--bw:26px;--bh:24px;--rh:24px;--isz:14px;--fs:11px;--lfs:9.5px}',

    '.mzr-grp{position:relative;display:flex;flex-direction:column;align-items:center;padding:0 8px;flex:none}',
    '.mzr-grp+.mzr-grp::before{content:"";position:absolute;left:0;top:6px;bottom:16px;width:1px;',
    'background:var(--ui-border,rgba(128,128,128,.16));opacity:.75}',
    '.mzr-items{display:grid;grid-auto-flow:row;gap:1px;',
    'grid-template-columns:repeat(var(--cols,2),var(--bw));grid-template-rows:repeat(2,var(--rh))}',
    '.mzr-label{font-size:var(--lfs);line-height:1;letter-spacing:.04em;padding:4px 0 3px;',
    'color:var(--ui-text,var(--text-color,#333));opacity:.5}',
    '.mzr-ribbon.compact .mzr-label{padding:2px 0 3px}',

    '.mzr-btn{box-sizing:border-box;position:relative;display:flex;align-items:center;justify-content:center;',
    'width:var(--bw);height:var(--bh);padding:0;border:0;border-radius:5px;background:transparent;',
    'color:var(--ui-text,var(--text-color,#333));cursor:pointer;font:600 var(--fs)/1 var(--ui-font,system-ui,sans-serif);',
    'opacity:.86;transition:background .12s,opacity .12s}',
    '.mzr-btn>svg{width:var(--isz);height:var(--isz);flex:none}',
    '.mzr-btn:hover{background:var(--ui-hover,var(--item-hover-bg-color,rgba(128,128,128,.12)));opacity:1}',
    '.mzr-btn:active{background:var(--ui-active,var(--active-file-bg-color,rgba(128,128,128,.18)))}',
    '.mzr-btn.on{background:var(--ui-active,var(--active-file-bg-color,rgba(128,128,128,.16)));',
    'color:var(--primary-color,#4183c4);opacity:1}',
    '.mzr-btn .car{position:absolute;right:0;bottom:1px;opacity:.55}',
    '.mzr-btn .car svg{width:8px;height:8px}',
    '.mzr-btn.has-car{padding-right:6px}',
    '.mzr-btn.cjk{font-size:10px;letter-spacing:0;font-weight:600}',
    '.mzr-btn.mzr-off{display:none}',
    '.mzr-grp.mzr-empty{display:none}',

    /* 整组折叠：宽度不够时，该组压成一个「组名 ▾」的窄按钮，
       点开即列出本组全部功能。省下整组宽度，同时保留分类入口。 */
    '.mzr-fold{display:none;box-sizing:border-box;align-items:center;justify-content:center;gap:2px;',
    'width:var(--foldw,34px);height:var(--rh);margin:auto 0;padding:0 2px;border:0;border-radius:6px;',
    /* 用底色让「这是一个可点的入口」一眼可辨，而不是一排灰字 */
    'background:var(--ui-hover,rgba(128,128,128,.09));color:var(--ui-text,var(--text-color,#333));cursor:pointer;',
    'font:600 var(--lfs)/1 var(--ui-font,system-ui,sans-serif);opacity:.78;',
    'transition:background .12s,opacity .12s}',
    '.mzr-fold:hover{background:var(--ui-active,rgba(128,128,128,.18));opacity:1}',
    '.mzr-fold svg{width:8px;height:8px;flex:none;opacity:.75}',
    /* 极窄兜底：连折叠后的宽度都不够时，chip 再收一档 */
    '.mzr-ribbon.mzr-tight .mzr-fold{--foldw:28px;gap:0;font-size:9px}',
    '.mzr-ribbon.mzr-tight .mzr-fold svg{width:7px;height:7px}',
    '.mzr-grp.mzr-folded .mzr-items{display:none}',
    '.mzr-grp.mzr-folded .mzr-fold{display:flex}',
    '.mzr-grp.mzr-folded .mzr-label{display:none}',
    '.mzr-ribbon.collapsed .mzr-fold{height:var(--rh);margin:0}',

    '.mzr-ribbon.collapsed{height:41px;padding:7px 32px 6px 8px}',
    '.mzr-ribbon.collapsed .mzr-scroll{overflow-x:auto;overflow-y:hidden}',
    '.mzr-ribbon.collapsed .mzr-scroll::-webkit-scrollbar{height:0;width:0}',
    '.mzr-ribbon.collapsed .mzr-label{display:none}',
    '.mzr-ribbon.collapsed .mzr-items{display:flex;gap:1px}',
    '.mzr-ribbon.collapsed .mzr-grp{padding:0 5px}',
    '.mzr-ribbon.collapsed .mzr-grp+.mzr-grp::before{top:0;bottom:0}',
    '.mzr-ribbon.collapsed .mzr-btn.mzr-off{display:none}',

    '.mzr-toggle{position:absolute;right:6px;bottom:2px;width:20px;height:14px;border:0;',
    'background:transparent;color:var(--ui-text,#333);opacity:.4;cursor:pointer;border-radius:3px}',
    '.mzr-toggle:hover{opacity:.9;background:var(--ui-hover,rgba(128,128,128,.12))}',
    '.mzr-ribbon.collapsed .mzr-toggle svg{transform:rotate(180deg)}',

    /* 窄窗口不再换行/压扁：多余的按钮收进「更多」，高度保持不变 */

    '.mzr-pop{position:fixed;z-index:9999;min-width:190px;padding:5px;border-radius:9px;',
    'background:var(--ui-panel,var(--ui-bg,#fff));border:1px solid var(--ui-border,rgba(128,128,128,.2));',
    'box-shadow:0 10px 30px rgba(0,0,0,.16);font-family:var(--ui-font,system-ui,sans-serif);display:none}',
    '.mzr-pop.show{display:block}',
    '.mzr-pop-item{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;',
    'font-size:12.5px;color:var(--ui-text,var(--text-color,#222));cursor:pointer}',
    '.mzr-pop-item:hover{background:var(--ui-hover,rgba(128,128,128,.12))}',
    '.mzr-pop-item .gi{width:16px;display:flex;justify-content:center;flex:none;opacity:.8}',
    '.mzr-pop-item .k{margin-left:auto;font-size:11px;opacity:.45;font-variant-numeric:tabular-nums}',
    '.mzr-pop-sec{font-size:10.5px;letter-spacing:.05em;opacity:.42;padding:5px 8px 2px}',
    '.mzr-pop-sep{height:1px;margin:4px 6px;background:var(--ui-border,rgba(128,128,128,.18))}',
    '.mzr-emoji{display:grid;grid-template-columns:repeat(8,1fr);gap:2px;width:248px}',
    '.mzr-emoji button{width:28px;height:28px;border:0;border-radius:5px;background:transparent;',
    'font-size:15px;line-height:1;cursor:pointer}',
    '.mzr-emoji button:hover{background:var(--ui-hover,rgba(128,128,128,.14))}',

    /* 隐藏原生格式栏：.toolbar-top-slot 固定 41px，必须整槽隐藏才不留空白 */
    'body.mzr-hide-native .toolbar-top-slot{display:none!important}',
    'body.mzr-hide-native .toolbar-top-host{display:none!important}',
    'body.mzr-hide-native .toolbar-top{display:none!important}'
  ].join('');
}

/* ---------------- 构建 DOM ---------------- */
function buildItem(it) {
  var html = it.txt ? it.txt : svg(it.icon, 15);
  if (it.caret) html += '<span class="car">' + svg('caret', 8) + '</span>';
  var cls = 'mzr-btn' + (it.txt ? ' txt' : '') + (it.cjk ? ' cjk' : '') + (it.caret ? ' has-car' : '');
  return '<button type="button" class="' + cls + '" data-id="' + it.id + '" title="' + it.label + '" aria-label="' + it.label + '">' + html + '</button>';
}

function buildHTML() {
  var out = ['<div class="mzr-scroll">'];
  for (var g = 0; g < GROUPS.length; g++) {
    var grp = GROUPS[g];
    /* 行优先：每行 2 个，列数 = ceil(n/2)。这样同组内的相邻两项（如撤销/重做）保持并排 */
    var cols = Math.ceil(grp.items.length / 2);
    out.push('<div class="mzr-grp" data-group="' + grp.name + '">');
    out.push('<div class="mzr-items" style="--cols:' + cols + '">');
    for (var i = 0; i < grp.items.length; i++) out.push(buildItem(grp.items[i]));
    out.push('</div>');
    /* 折叠入口：本组放不下时只留这一个按钮，弹出该组全部功能 */
    out.push('<button type="button" class="mzr-fold" data-fold="' + grp.name + '" title="' + grp.name + '（本组已收起，点击展开）">' +
      grp.name + svg('caret', 8) + '</button>');
    out.push('<div class="mzr-label">' + grp.name + '</div>');
    out.push('</div>');
  }
  out.push('</div>');
  out.push('<button type="button" class="mzr-toggle" data-toggle="collapse" title="折叠 / 展开工具栏">' + svg(cfg.collapsed ? 'chevron' : 'chevron', 10) + '</button>');
  return out.join('');
}

function cacheRefs() {
  grpEls = [];
  if (!root) return;
  var wraps = root.querySelectorAll('.mzr-scroll > .mzr-grp');
  for (var i = 0; i < GROUPS.length; i++) {
    var wrap = wraps[i];
    if (!wrap) continue;
    grpEls.push({
      wrap: wrap,
      items: wrap.querySelector('.mzr-items'),
      fold: wrap.querySelector('.mzr-fold'),
      itemEls: Array.prototype.slice.call(wrap.querySelectorAll('.mzr-btn'))
    });
  }
}

function activateRibbon() {
  /* 幂等挂载：插件热重载或重复 activate 时，先清掉旧实例。
     否则旧节点留在 DOM、root 指向新节点，两层按不同尺寸档叠画在一起。 */
  var stale = document.querySelectorAll('.mzr-ribbon');
  for (var s = 0; s < stale.length; s++) stale[s].remove();

  var host = pickHost();
  if (!host) return false;

  root = el('div', 'mzr-ribbon' + (cfg.collapsed ? ' collapsed' : '') + (cfg.density === 'compact' ? ' compact' : ''));
  root.setAttribute('role', 'toolbar');
  root.setAttribute('aria-label', 'Ribbon 工具栏');
  root.innerHTML = buildHTML();
  host.insertBefore(root, host.firstChild);
  cacheRefs();
  return true;
}

function pickHost() {
  var host = null;
  try { host = ctx.ui.floatingHost; } catch (e) { host = null; }
  if (!host) host = document.querySelector('.editor-pane') || document.querySelector('.editor-column');
  return host;
}

/* 切换文档时若宿主把浮层移到别的面板，跟着搬过去 */
function reanchor() {
  if (!root) return;
  var host = pickHost();
  if (host && root.parentNode !== host) host.insertBefore(root, host.firstChild);
}

/* ---------------- 交互 ---------------- */
/* 不让按钮抢走编辑器焦点，否则插入类命令会丢光标 */
function onRootDown(e) {
  var t = e.target.closest ? e.target.closest('.mzr-btn,.mzr-toggle,.mzr-fold') : null;
  if (t) e.preventDefault();
}

function onRootClick(e) {
  var t = e.target.closest ? e.target.closest('[data-id],[data-toggle],[data-fold]') : null;
  if (!t || !root.contains(t)) return;
  e.preventDefault();
  e.stopPropagation();

  if (t.dataset.toggle === 'collapse') {
    cfg.collapsed = !cfg.collapsed;
    root.classList.toggle('collapsed', cfg.collapsed);
    ctx.settings.set({ collapsed: cfg.collapsed });
    fit(true);
    return;
  }

  if (t.dataset.fold) { openFold(t.dataset.fold, t); return; }

  var id = t.dataset.id;
  for (var g = 0; g < GROUPS.length; g++) {
    for (var i = 0; i < GROUPS[g].items.length; i++) {
      if (GROUPS[g].items[i].id === id) return run(GROUPS[g].items[i], t);
    }
  }
}

function run(item, btn) {
  var a = item.act;
  if (a.t === 'cmd') {
    safe(function () { ctx.editor.runCommand.apply(null, [a.name].concat(a.args || [])); });
  }
  else if (a.t === 'key') { syncKey(a.key); }
  else if (a.t === 'heading') { toParagraph(); }
  else if (a.t === 'menu') { openMenu(a.menu, btn); return; }
  else if (a.t === 'emoji') { openEmoji(btn); return; }
  else if (a.t === 'image') { insertImage(); }
  else if (a.t === 'fullscreen') {
    safe(function () {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
    });
  }
  else if (a.t === 'notice') { ctx.ui.notice(a.msg, { kind: 'error' }); }
  closePop();
  syncState();
}

/* 撤销 / 重做：SDK 未暴露 history，退化为把快捷键派发给编辑器 */
function syncKey(key) {
  var v = view();
  if (!v) return;
  var mac = /Mac|iPhone|iPad/.test(navigator.platform || '');
  var ev = new KeyboardEvent('keydown', {
    key: key, code: 'Key' + key.toUpperCase(), bubbles: true, cancelable: true,
    ctrlKey: !mac, metaKey: mac
  });
  v.contentDOM.dispatchEvent(ev);
}

/* 正文：把当前标题降为段落（SDK 未文档化 0 级，失败时提示） */
function toParagraph() {
  var ok = false;
  try { ctx.editor.runCommand('setHeading', 0); ok = true; } catch (e) { ok = false; }
  if (!ok) {
    try { ctx.editor.runCommand('setHeading', '0'); ok = true; } catch (e2) { ok = false; }
  }
  if (!ok) ctx.ui.notice('「正文」需要降标题，当前 SDK 未提供对应命令', { kind: 'error' });
}

function insertImage() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.style.display = 'none';
  input.onchange = function () {
    var f = input.files && input.files[0];
    if (!f) return;
    var path = 'assets/' + Date.now() + '-' + (f.name || 'image.png').replace(/[^\w.\-]+/g, '_');
    f.arrayBuffer().then(function (buf) {
      return ctx.vault.writeBlob(path, new Blob([buf], { type: f.type || 'image/png' }));
    }).then(function () {
      ctx.active.insert('![](' + encodeURI(path) + ')');
      ctx.ui.notice('已插入 ' + path);
    }).catch(function (e) {
      ctx.ui.notice('图片插入失败：' + (e && e.message ? e.message : e), { kind: 'error' });
    }).then(function () { input.remove(); });
  };
  document.body.appendChild(input);
  input.click();
}

/* ---------------- 弹出层 ---------------- */
function ensurePop() {
  if (pop) return pop;
  pop = el('div', 'mzr-pop');
  pop.addEventListener('click', function (e) {
    var it = e.target.closest ? e.target.closest('[data-i]') : null;
    if (!it) return;
    e.preventDefault();
    e.stopPropagation();
    var idx = +it.dataset.i;
    if (popOwner === 'fold') {
      var fi = foldList[idx];
      if (fi) { closePop(); run(fi, null); }
      return;
    }
    if (popOwner === 'emoji') {
      safe(function () { ctx.active.insert(EMOJIS[idx]); });
      closePop();
      return;
    }
    var m = MENUS[popOwner];
    var act = m && m.items[idx] && m.items[idx].act;
    if (act) { closePop(); run({ act: act }, null); }
  });
  document.body.appendChild(pop);
  return pop;
}

function closePop() {
  if (pop) pop.classList.remove('show');
  popOwner = null;
}

function openMenu(key, btn) {
  var m = MENUS[key];
  if (!m) return;
  ensurePop();
  if (popOwner === key && pop.classList.contains('show')) { closePop(); return; }
  var html = [];
  for (var i = 0; i < m.items.length; i++) {
    var it = m.items[i];
    if (it.sep) { html.push('<div class="mzr-pop-sep"></div>'); continue; }
    html.push('<div class="mzr-pop-item" data-i="' + i + '"><span>' + it.label + '</span>' +
      (it.key ? '<span class="k">' + it.key + '</span>' : '') + '</div>');
  }
  pop.innerHTML = html.join('');
  pop.className = 'mzr-pop show';
  popOwner = key;
  place(btn);
}

/* 整组折叠入口：点「组名 ▾」弹出本组全部功能。
   宽度让出来了，功能一个不少，位置也还在原来的分类上。 */
function openFold(name, btn) {
  ensurePop();
  if (popOwner === 'fold' && pop.classList.contains('show')) { closePop(); return; }

  var grp = null;
  for (var g = 0; g < GROUPS.length; g++) if (GROUPS[g].name === name) grp = GROUPS[g];
  if (!grp) return;

  foldList = grp.items.slice();
  var html = ['<div class="mzr-pop-sec">' + name + '</div>'];
  for (var i = 0; i < grp.items.length; i++) {
    var it = grp.items[i];
    var ic = it.icon
      ? '<span class="gi">' + svg(it.icon, 14) + '</span>'
      : '<span class="gi" style="font:600 11px/1 inherit;opacity:.7">' + (it.txt || '') + '</span>';
    html.push('<div class="mzr-pop-item" data-i="' + i + '">' + ic + '<span>' + it.label + '</span></div>');
  }
  pop.innerHTML = html.join('');
  pop.className = 'mzr-pop show';
  popOwner = 'fold';
  place(btn);
}

function openEmoji(btn) {
  ensurePop();
  if (popOwner === 'emoji' && pop.classList.contains('show')) { closePop(); return; }
  var html = ['<div class="mzr-emoji">'];
  for (var i = 0; i < EMOJIS.length; i++) html.push('<button type="button" data-i="' + i + '">' + EMOJIS[i] + '</button>');
  html.push('</div>');
  pop.innerHTML = html.join('');
  pop.className = 'mzr-pop show';
  popOwner = 'emoji';
  place(btn);
}

function place(btn) {
  if (!btn) return;
  var r = btn.getBoundingClientRect();
  var pw = pop.offsetWidth, ph = pop.offsetHeight;
  var left = Math.min(r.left, window.innerWidth - pw - 8);
  var top = r.bottom + 6;
  if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 6);
  pop.style.left = Math.max(8, left) + 'px';
  pop.style.top = top + 'px';
}

/* ---------------- 状态同步 ---------------- */
function mapBtn(id) {
  return root ? root.querySelector('[data-id="' + id + '"]') : null;
}

function setOn(id, on) {
  var b = mapBtn(id);
  if (b) b.classList.toggle('on', !!on);
}

function syncState() {
  if (!root) return;
  var v = view();
  if (!v) return;
  safe(function () {
    var st = v.state;
    var sel = st.selection.main;
    var line = st.doc.lineAt(sel.from);
    var text = line.text;

    setOn('h2', /^##\s/.test(text));
    setOn('h3', /^###\s/.test(text));
    setOn('para', !/^#{1,6}\s/.test(text));
    setOn('task', /^\s*[-*+]\s\[[ xX]\]\s/.test(text));
    setOn('ordered', /^\s*\d+\.\s/.test(text));
    setOn('bullet', /^\s*[-*+]\s(?!\[)/.test(text));
    setOn('quote', /^\s*>\s/.test(text));
    setOn('code', /^\s*```/.test(text));

    var from = sel.from, to = sel.to;
    var near = st.sliceDoc(Math.max(0, from - 3), Math.min(st.doc.length, to + 3));
    var before = st.sliceDoc(Math.max(0, from - 2), from);
    var after = st.sliceDoc(to, Math.min(st.doc.length, to + 2));
    setOn('strong', before.slice(-2) === '**' || after.slice(0, 2) === '**' || /\*\*[^*]+\*\*/.test(near));
    setOn('emphasis', /(^|[^*])\*[^*]+\*(?!\*)/.test(near));
    setOn('underline', /<u>/.test(near));
    setOn('highlight', near.indexOf('==') >= 0);
    setOn('comment', /%%/.test(near));
  });
}

function scheduleSync() {
  if (rafId) return;
  rafId = requestAnimationFrame(function () { rafId = 0; syncState(); });
}

/* ---------------- 自适应宽度 ----------------
 * 三档尺寸（宽就给大图标）之外，宽度不足时不再换布局形态，
 * 而是按 p 值把次要按钮逐项收进「更多」，高度保持两行 + 组名不变。
 * 宽度计算为纯算术（按钮固定宽度），不触发逐项 reflow。 */
var TIERS = ['xl', 'lg', 'md', 'sm'];
var TIER_BW = { xl: 38, lg: 34, md: 30, sm: 26 };
var PAD_L = 8, PAD_R = 32, GRP_PAD = 16, GRP_GAP = 1;
var lastW = -1;

function setTier(name) {
  root.classList.remove('sz-xl', 'sz-lg', 'sz-md', 'sz-sm');
  if (name) root.classList.add('sz-' + name);
}

function colsOf(n) { return Math.max(1, Math.ceil(n / 2)); }

function groupW(n, bw) {
  if (n <= 0) return 0;
  var c = colsOf(n);
  return c * bw + (c - 1) * GRP_GAP + GRP_PAD;
}

function totalW(counts, bw) {
  var t = 0;
  for (var i = 0; i < counts.length; i++) t += groupW(counts[i], bw);
  return t;
}

function fullCounts() {
  var a = [];
  for (var i = 0; i < GROUPS.length; i++) a.push(GROUPS[i].items.length);
  return a;
}

/* 折叠后整组的宽度：chip 34px + 组左右内边距 16px */
var FOLD_W = 34 + GRP_PAD;
var FOLD_W_TIGHT = 28 + GRP_PAD;

/* 组折叠优先级：foldP 越小越先被压成 chip；>=99 的组（编辑）永不折叠 */
function foldOrder() {
  var a = [];
  for (var i = 0; i < GROUPS.length; i++) if ((GROUPS[i].foldP || 0) < 99) a.push(i);
  a.sort(function (x, y) { return (GROUPS[x].foldP - GROUPS[y].foldP); });
  return a;
}

/* 给定「哪些组已折叠」与按钮宽，算出这一行的总宽 */
function widthWith(folded, bw, fw) {
  var t = 0;
  var w0 = fw || FOLD_W;
  for (var i = 0; i < GROUPS.length; i++) {
    t += folded[GROUPS[i].name] ? w0 : groupW(GROUPS[i].items.length, bw);
  }
  return t;
}

function applyFold(folded) {
  folded = folded || {};
  for (var g = 0; g < GROUPS.length; g++) {
    var box = grpEls[g];
    if (!box) continue;
    var on = !!folded[GROUPS[g].name];
    box.wrap.classList.toggle('mzr-folded', on);
    if (!on) box.items.style.setProperty('--cols', colsOf(GROUPS[g].items.length));
  }
}

function fit(force) {
  if (!root || root.classList.contains('is-off')) return;
  /* 关键修正：量父容器的可用宽度，不量自己。
     ribbon 若量自身 clientWidth，一旦溢出，量到的就是溢出后的宽度，
     于是 fit 认为「够宽」不再收敛 —— 这正是工具栏画到右侧面板上的原因。 */
  var host = root.parentNode;
  var hostW = host && host.clientWidth ? host.clientWidth : 0;
  var w = hostW || root.clientWidth;
  if (!force && w === lastW) return;
  lastW = w;
  if (!w) return;

  root.classList.remove('mzr-tight', 'mzr-tight-scroll');

  /* 折叠态：固定单行、中等尺寸，超出的横向滚动（用户显式选择的紧凑态） */
  if (cfg.collapsed) {
    setTier('md');
    applyFold({});
    return;
  }

  var avail = w - PAD_L - PAD_R - 2;

  /* 1) 全展开：取放得下的最大档，图标尽量大 */
  for (var i = 0; i < TIERS.length; i++) {
    if (totalW(fullCounts(), TIER_BW[TIERS[i]]) <= avail) {
      setTier(TIERS[i]);
      applyFold({});
      return;
    }
  }

  /* 2) 最小档也放不下：整组折叠成「组名 ▾」。
     比逐个收按钮更省、更好找：组名还在原位，点一下就能拿到本组全部功能，
     而高度始终是两行 + 组名，不因宽度变化而跳。 */
  var bw = TIER_BW.sm;
  setTier('sm');
  var folded = {};
  var order = foldOrder();
  for (var k = 0; k < order.length; k++) {
    if (widthWith(folded, bw) <= avail) break;
    folded[GROUPS[order[k]].name] = 1;
  }
  applyFold(folded);

  /* 3) 极窄兜底：先把 chip 收窄一档，再不行才横向滚动 */
  if (widthWith(folded, bw) > avail) {
    root.classList.add('mzr-tight');
    if (widthWith(folded, bw, FOLD_W_TIGHT) > avail) root.classList.add('mzr-tight-scroll');
  }
}

function onResize() {
  lastW = -1;
  fit(true);
}

function onDocDown(e) {
  if (pop && pop.classList.contains('show') && !pop.contains(e.target)) {
    var onBtn = e.target.closest && e.target.closest('[data-id]');
    if (!onBtn) closePop();
  }
}

/* ---------------- 生命周期 ---------------- */
module.exports = {
  async activate(c) {
    ctx = c;
    var saved = {};
    try { saved = (await ctx.settings.get()) || {}; } catch (e) { saved = {}; }
    cfg.collapsed = !!saved.collapsed;
    /* 默认隐藏原生格式栏，由本 Ribbon 接管；用户显式关掉才保留双栏。
       v0.1 存过 hideNative:false，靠 mv 标记做一次迁移，升级后重新回到自动隐藏。 */
    var MV = 2;
    if (saved.mv === MV) {
      cfg.hideNative = typeof saved.hideNative === 'boolean' ? saved.hideNative : true;
    } else {
      cfg.hideNative = true;
      try { ctx.settings.set({ mv: MV, hideNative: true }); } catch (e) { /* ignore */ }
    }
    cfg.density = saved.density === 'compact' ? 'compact' : 'comfortable';

    try {
      ctx.settings.defineSchema([
        { key: 'collapsed', label: '默认折叠（单行）', type: 'boolean' },
        { key: 'hideNative', label: '隐藏原生格式栏（默认开启）', type: 'boolean' },
        { key: 'density', label: '密度', type: 'select', options: [['comfortable', '标准'], ['compact', '紧凑']] }
      ]);
    } catch (e) { /* 旧版本 SDK 无 defineSchema */ }

    /* 同样做幂等：热重载时清掉上一次注入的样式（含无标记的旧版本），避免规则叠加 */
    var olds = document.querySelectorAll('style');
    for (var os = 0; os < olds.length; os++) {
      var txt = olds[os].textContent || '';
      if (olds[os].hasAttribute('data-mzr') || txt.indexOf('.mzr-ribbon{') >= 0) olds[os].remove();
    }

    var style = el('style');
    style.setAttribute('data-mzr', '1');
    style.textContent = buildCSS();
    document.head.appendChild(style);
    ctx.onDispose(function () { style.remove(); });

    if (!activateRibbon()) {
      ctx.ui.notice('Ribbon 工具栏：找不到编辑器容器，未挂载', { kind: 'error' });
      return;
    }

    root.addEventListener('click', onRootClick);
    root.addEventListener('mousedown', onRootDown);
    applyScope();
    syncState();

    try {
      ctx.settings.onChange(function () {
        ctx.settings.get().then(function (s) {
          cfg.density = s && s.density === 'compact' ? 'compact' : 'comfortable';
          if (root) root.classList.toggle('compact', cfg.density === 'compact');
          if (s && typeof s.hideNative === 'boolean') cfg.hideNative = s.hideNative;
          applyScope();
        });
      });
    } catch (e) { /* ignore */ }

    try {
      ctx.ui.command({
        id: 'toggle-collapse',
        name: 'Ribbon：折叠 / 展开工具栏',
        run: function () {
          cfg.collapsed = !cfg.collapsed;
          if (root) root.classList.toggle('collapsed', cfg.collapsed);
          ctx.settings.set({ collapsed: cfg.collapsed });
          fit(true);
        }
      });
      ctx.ui.command({
        id: 'toggle-native',
        name: 'Ribbon：显示 / 隐藏原生格式栏',
        run: function () {
          cfg.hideNative = !cfg.hideNative;
          applyScope();
          ctx.settings.set({ hideNative: cfg.hideNative });
          ctx.ui.notice(cfg.hideNative ? '已隐藏原生格式栏' : '已恢复原生格式栏');
        }
      });
    } catch (e) { /* ignore */ }

    try {
      ctx.active.onChange(scheduleSync);
      ctx.active.onPathChange(function () { reanchor(); applyScope(); scheduleSync(); });
    } catch (e) { /* ignore */ }

    /* 主区域视图切换：Markdown 文档 / 空白页 / 附件 / 插件视图，决定 Ribbon 与原生栏是否显示 */
    try {
      if (ctx.views && ctx.views.onChange) {
        ctx.views.onChange(function () { reanchor(); applyScope(); scheduleSync(); });
      }
    } catch (e) { /* ignore */ }

    document.addEventListener('mousedown', onDocDown);
    ctx.onDispose(function () {
      closePop();
      document.removeEventListener('mousedown', onDocDown);
    });

    try {
      /* 同时观察自身与父容器：右侧面板开合改变的是父容器宽度，
         只盯自己会漏掉。用 fit(false) 而非 onResize，靠可用宽度去重，
         避免「改布局 → 触发 RO → 再改布局」的循环。 */
      mo = new ResizeObserver(function () { fit(false); });
      mo.observe(root);
      if (root.parentNode) mo.observe(root.parentNode);
      fit(true);
      ctx.onDispose(function () { mo && mo.disconnect(); });
    } catch (e) { fit(true); }

    window.addEventListener('resize', onResize);
    ctx.onDispose(function () { window.removeEventListener('resize', onResize); });

    /* 卸载必须把节点一起带走。安全模式 / 崩溃恢复会直接停掉插件而不保证走 deactivate，
       留下的 DOM 就会浮在所有视图上（0.1.2 出现的「日历视图顶上还挂着 Ribbon」）。 */
    ctx.onDispose(cleanup);

    startScopeWatch();
  },

  deactivate() {
    cleanup();
  }
};

/* 幂等清理：DOM、样式、弹层、原生栏还原，全部恢复到挂载前 */
function cleanup() {
  if (mo) { try { mo.disconnect(); } catch (e) { /* ignore */ } mo = null; }
  lastW = -1;
  scopeState = null;
  if (root) {
    try {
      root.removeEventListener('click', onRootClick);
      root.removeEventListener('mousedown', onRootDown);
    } catch (e) { /* ignore */ }
  }
  /* 兜底：连同历史遗留的重复实例一起清掉 */
  var all = document.querySelectorAll('.mzr-ribbon');
  for (var i = 0; i < all.length; i++) all[i].remove();
  root = null;
  grpEls = [];
  foldList = [];
  if (pop) { pop.remove(); pop = null; }
  popOwner = null;
  document.body.classList.remove('mzr-hide-native');
  var st = document.querySelectorAll('style[data-mzr]');
  for (var j = 0; j < st.length; j++) st[j].remove();
}
