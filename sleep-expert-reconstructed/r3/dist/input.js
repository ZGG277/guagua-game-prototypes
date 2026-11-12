/* Three input paths, one active gesture. Native click remains a real fallback. */
const BabyInput=(function(){
 const bindings=[];function cancelAll(){bindings.forEach(cancel=>cancel());}
 function bind(element,handlers,options){
  options=options||{};let active=null,lastPointer=-1e9,lastTouch=-1e9,lastDirect=-1e9;
  const now=()=>Date.now();
  function point(e){return {clientX:e.clientX,clientY:e.clientY,pointerId:e.pointerId};}
  function prevent(e){if(e&&e.cancelable&&options.preventDefault!==false)e.preventDefault();}
  function begin(family,id,p,e){if(active)return false;active={family:family,id:id,start:p,last:p,moved:false,maxDistance:0};lastDirect=now();prevent(e);if(handlers.start)handlers.start(p,e);return true;}
  function move(family,id,p,e){if(!active||active.family!==family||active.id!==id)return;active.last=p;active.maxDistance=Math.max(active.maxDistance,Math.hypot(p.clientX-active.start.clientX,p.clientY-active.start.clientY));if(Math.abs(p.clientX-active.start.clientX)+Math.abs(p.clientY-active.start.clientY)>12)active.moved=true;prevent(e);if(handlers.move)handlers.move(p,e);}
  function finish(family,id,p,e,cancelled){if(!active||active.family!==family||active.id!==id)return;const old=active;active=null;lastDirect=now();prevent(e);if(cancelled){if(handlers.cancel)handlers.cancel(e);}else if(handlers.end)handlers.end(p||old.last,e,old);}
  function cancel(notify){const had=!!active;active=null;if(had)lastDirect=now();if(had&&notify!==false&&handlers.cancel)handlers.cancel();}
  element.addEventListener('pointerdown',e=>{if(e.isPrimary===false){cancelAll();return;}if(e.button!==undefined&&e.button!==0)return;lastPointer=now();if(begin('pointer',e.pointerId,point(e),e)&&element.setPointerCapture)try{element.setPointerCapture(e.pointerId);}catch(error){};});
  window.addEventListener('pointermove',e=>{if(active&&active.family==='pointer')move('pointer',e.pointerId,point(e),e);},{passive:false});
  window.addEventListener('pointerup',e=>finish('pointer',e.pointerId,point(e),e,false),{passive:false});
  window.addEventListener('pointercancel',e=>finish('pointer',e.pointerId,point(e),e,true),{passive:false});
  element.addEventListener('lostpointercapture',e=>finish('pointer',e.pointerId,null,e,true));
  element.addEventListener('touchstart',e=>{lastTouch=now();if(e.touches&&e.touches.length>1){cancelAll();return;}if(now()-lastPointer<800||!e.changedTouches||!e.changedTouches.length)return;const t=e.changedTouches[0];begin('touch',t.identifier,point(t),e);},{passive:false});
  function touchEvent(e,kind){if(!active||active.family!=='touch')return;for(let i=0;i<e.changedTouches.length;i++){const t=e.changedTouches[i];if(t.identifier===active.id){if(kind==='move')move('touch',t.identifier,point(t),e);else finish('touch',t.identifier,point(t),e,kind==='cancel');break;}}}
  window.addEventListener('touchmove',e=>touchEvent(e,'move'),{passive:false});window.addEventListener('touchend',e=>touchEvent(e,'end'),{passive:false});window.addEventListener('touchcancel',e=>touchEvent(e,'cancel'),{passive:false});
  element.addEventListener('mousedown',e=>{if(e.button!==0||now()-lastPointer<800||now()-lastTouch<800)return;begin('mouse',0,point(e),e);});
  window.addEventListener('mousemove',e=>move('mouse',0,point(e),e));window.addEventListener('mouseup',e=>finish('mouse',0,point(e),e,false));
  element.addEventListener('click',e=>{if(active)return;if(e.detail!==0&&now()-lastDirect<800)return;prevent(e);if(handlers.click)handlers.click(point(e),e);});
  window.addEventListener('blur',()=>cancel());document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
  bindings.push(cancel);return {cancel:cancel};
 }
 function button(element,action){return bind(element,{end:(p,e,gesture)=>{if(gesture.moved||element.disabled)return;const r=element.getBoundingClientRect();if(p.clientX>=r.left&&p.clientX<=r.right&&p.clientY>=r.top&&p.clientY<=r.bottom)action(e);},click:(p,e)=>{if(!element.disabled)action(e);}}, {preventDefault:false});}
 return {bind:bind,button:button};
})();

export {BabyInput};
