export interface MdStyledExtensionDef {
  name: string;
  description: string;
  css?: string;
  js?: string;
}

export interface ExtensionJsOptions {
  mermaidSrc?: string;
}

const COPY_CODE_CSS = `
.mdstyled-copy-btn {
  position: absolute; top: 8px; right: 8px;
  width: 24px; height: 24px;
  padding: 2px; border: 1px solid transparent;
  border-radius: 4px; background: transparent;
  cursor: pointer; opacity: 0;
  transition: opacity 0.2s, border-color 0.2s;
  color: inherit;
}
pre:hover .mdstyled-copy-btn { opacity: 0.7; }
pre:hover .mdstyled-copy-btn:hover { opacity: 1; border-color: currentColor; }
.mdstyled-copy-btn.copied { opacity: 1 !important; }
.mdstyled-copy-btn svg { width: 100%; height: 100%; display: block; }
`;

const COPY_CODE_JS = `
(function(){'use strict';
var CLIPBOARD_ICON='<svg viewBox="0 0 24 24"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>';
var CHECK_ICON='<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>';
document.querySelectorAll('pre').forEach(function(pre){
  var code=pre.querySelector('code');
  if(!code||pre.querySelector('.mdstyled-copy-btn'))return;
  var btn=document.createElement('button');
  btn.className='mdstyled-copy-btn';
  btn.innerHTML=CLIPBOARD_ICON;
  btn.addEventListener('click',function(){
    var text=code.textContent||'';
    navigator.clipboard.writeText(text).then(function(){
      btn.innerHTML=CHECK_ICON;
      btn.classList.add('copied');
      setTimeout(function(){btn.innerHTML=CLIPBOARD_ICON;btn.classList.remove('copied');},2000);
    });
  });
  pre.appendChild(btn);
});
})();
`;

const MERMAID_CSS = `
.mdstyled-mermaid {
  background: #f8f9fa; border-radius: 6px; padding: 16px;
  margin: 16px 0; overflow-x: auto; font-size: 13px; color: #666;
}

/* ── Gantt chart ── */
.mdstyled-mermaid .gantt .grid .gridTick { stroke: #d0d5dd; stroke-dasharray: 3 3; }
.mdstyled-mermaid .gantt .sectionTitle { font-size: 13px; font-weight: 700; fill: #1c1e21; }
.mdstyled-mermaid .gantt .sectionTitle rect { fill: #eef0f4; rx: 3; }
.mdstyled-mermaid .gantt .task rect { rx: 4; ry: 4; stroke-width: 1.5; }
.mdstyled-mermaid .gantt .task.done rect { fill: #1f883d; stroke: #146430; }
.mdstyled-mermaid .gantt .task.active rect { fill: #2d7ff9; stroke: #1a5cc7; }
.mdstyled-mermaid .gantt .task.crit.done rect { fill: #d93a3a; stroke: #b02828; }
.mdstyled-mermaid .gantt .task.crit.active rect { fill: #f85149; stroke: #d03533; }
.mdstyled-mermaid .gantt .task.task0 rect { fill: #1f883d; stroke: #146430; }
.mdstyled-mermaid .gantt .task.task1 rect { fill: #2d7ff9; stroke: #1a5cc7; }
.mdstyled-mermaid .gantt .task.task2 rect { fill: #9b59b6; stroke: #7d3c98; }
.mdstyled-mermaid .gantt .task.task3 rect { fill: #e8a838; stroke: #c48a24; }
.mdstyled-mermaid .gantt .task.task4 rect { fill: #1abc9c; stroke: #148f77; }
.mdstyled-mermaid .gantt .taskText { font-size: 11px; fill: #fff; font-weight: 600; }
.mdstyled-mermaid .gantt .taskTextOutsideRight,
.mdstyled-mermaid .gantt .taskTextOutsideLeft { font-size: 11px; fill: #444950; }
.mdstyled-mermaid .gantt .milestone rect { fill: #8250df; stroke: #6c3dcf; rx: 0; ry: 0; transform: rotate(45deg); }
.mdstyled-mermaid .gantt .today { stroke: #f85149; stroke-width: 2.5; }
.mdstyled-mermaid .gantt .todayText { fill: #f85149; font-size: 11px; font-weight: 700; }
.mdstyled-mermaid .gantt .titleText { font-size: 14px; font-weight: 700; fill: #1c1e21; }
.mdstyled-mermaid .gantt text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; }
.mdstyled-mermaid .gantt .grid .tick line { stroke: #e3e8ee; }
.mdstyled-mermaid .gantt .grid .tick text { fill: #606770; font-size: 10px; }
.mdstyled-mermaid .gantt .task .task-progress { rx: 4; ry: 4; }
`;

const MERMAID_JS = `
(function(){'use strict';
var mermaidBlocks=null;
function showError(container,msg){
  container.textContent='';container.style.color='#f85149';
  container.style.fontSize='0.85rem';container.style.fontFamily='monospace';
  container.textContent=msg||'Failed to load mermaid library.';
}
function renderBlock(code){
  var pre=code.parentElement;
  var source=code.textContent.trim();
  var container=document.createElement('div');
  container.className='mdstyled-mermaid';
  container.textContent='Rendering diagram...';
  pre.parentNode.replaceChild(container,pre);
  var id='mermaid-'+Math.random().toString(36).slice(2,9);
  Promise.resolve().then(function(){
    return mermaid.render(id,source);
  }).then(function(res){
    container.innerHTML=res.svg;
  }).catch(function(err){
    showError(container,'Syntax error: '+(err && err.message?err.message:err));
  });
}
function renderBlocks(){
  mermaid.initialize({startOnLoad:false,suppressErrorRendering:true});
  mermaidBlocks.forEach(function(code){renderBlock(code);});
}
function loadMermaid(){
  mermaidBlocks=document.querySelectorAll('code.language-mermaid');
  if(!mermaidBlocks.length)return;
  var script=document.createElement('script');
  script.src='__MERMAID_SRC__';
  script.onload=renderBlocks;
  script.onerror=function(){
    mermaidBlocks.forEach(function(code){
      var pre=code.parentElement;
      var container=document.createElement('div');
      container.className='mdstyled-mermaid';
      pre.parentNode.replaceChild(container,pre);
      showError(container,'Failed to load mermaid library.');
    });
  };
  document.head.appendChild(script);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadMermaid);
else loadMermaid();
})();
`;

const HIGHLIGHT_CSS = `
pre { position: relative; }
code { font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace; }

.hljs-keyword,
.hljs-selector-tag,
.hljs-tag,
.hljs-name {
  color: #d73a49;
}

.hljs-string,
.hljs-regexp,
.hljs-addition,
.hljs-attribute {
  color: #2ea043;
}

.hljs-number,
.hljs-literal,
.hljs-bullet,
.hljs-code {
  color: #9a6700;
}

.hljs-function,
.hljs-class,
.hljs-title,
.hljs-variable,
.hljs-template-variable {
  color: #218bff;
}

.hljs-comment,
.hljs-quote,
.hljs-meta {
  color: #6e7781;
}

.hljs-built_in,
.hljs-type {
  color: #8250df;
}

.hljs-operator,
.hljs-symbol,
.hljs-link {
  color: #cf222e;
}

.hljs-emphasis {
  font-style: italic;
}

.hljs-strong {
  font-weight: 700;
}

.hljs-deletion {
  color: #d73a49;
  text-decoration: line-through;
}
`;

export const BUILTIN_EXTENSIONS: Record<string, MdStyledExtensionDef> = {
  'copy-code': {
    name: 'copy-code',
    description: 'Adds copy buttons to code blocks',
    css: COPY_CODE_CSS,
    js: COPY_CODE_JS
  },
  'mermaid': {
    name: 'mermaid',
    description: 'Renders Mermaid diagram blocks',
    css: MERMAID_CSS,
    js: MERMAID_JS
  },
  'highlight': {
    name: 'highlight',
    description: 'Syntax highlighting for code blocks',
    css: HIGHLIGHT_CSS
  }
};

export function getExtensionCss(enabledExtensions: string[]): string {
  return enabledExtensions
    .filter(name => BUILTIN_EXTENSIONS[name] && BUILTIN_EXTENSIONS[name].css)
    .map(name => BUILTIN_EXTENSIONS[name].css)
    .join('\n\n');
}

export function getExtensionJs(enabledExtensions: string[], options?: ExtensionJsOptions): string {
  return enabledExtensions
    .filter(name => {
      const ext = BUILTIN_EXTENSIONS[name];
      return ext && ext.js;
    })
    .map(name => {
      const ext = BUILTIN_EXTENSIONS[name];
      let js = ext.js!;
      if (name === 'mermaid') {
        const src = options?.mermaidSrc || 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
        js = js.replace('__MERMAID_SRC__', src);
      }
      return js;
    })
    .join('\n\n');
}
