/* Local KaTeX: render explicitly delimited math; ordinary text and code stay literal. */
function typesetMath(root=document.getElementById('app')) {
 if(!root||typeof renderMathInElement!=='function')return;
 renderMathInElement(root,{
  delimiters:[{left:'$$',right:'$$',display:true},{left:'\\[',right:'\\]',display:true},{left:'\\(',right:'\\)',display:false}],
  ignoredTags:['script','noscript','style','textarea','pre','code','option'],
  ignoredClasses:['katex','usernote'],
  throwOnError:false,strict:'warn',trust:false,output:'htmlAndMathml',maxExpand:1000
 });
}
// Feedback and questions are also inserted dynamically, without a full route change.
const mathUpdates=new MutationObserver(mutations=>{
 const roots=new Set();
 for(const m of mutations){
  if(m.target.nodeType===1&&m.target.closest('.katex,.katex-display'))continue;
  for(const n of m.addedNodes){
   if(n.nodeType!==1||n.closest('.katex,.katex-display')||n.matches('input,textarea,option,pre,code'))continue;
   if(n.textContent.includes('\\(')||n.textContent.includes('\\[')||n.textContent.includes('$$'))roots.add(n);
  }
 }
 for(const root of roots)typesetMath(root);
});
mathUpdates.observe(document.getElementById('app'),{childList:true,subtree:true});
