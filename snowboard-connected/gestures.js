// Touch-time recognizer. Releases always pause the simulation; this never starts it.
export function createGestures(){
 const held={},tap={},pending={};let recent=null,twist=null,cooldown=-Infinity,press=null,neutralSince=null,ready=false;
 const reset=()=>{for(const o of[held,tap,pending])for(const k of Object.keys(o))delete o[k];recent=null;twist=null;cooldown=-Infinity;press=null;neutralSince=null;ready=false;};
 return {reset,
 down(role,id,x,y,t){const old=tap[role];held[role]={id,x,y,t,moved:false};if(old&&t-old.t>=35&&t-old.t<=290&&Math.hypot(x-old.x,y-old.y)<=22){pending[role]=t;held[role].double=true;delete tap[role];}else delete pending[role];},
 move(role,x,y){const p=held[role];if(p&&Math.hypot(x-p.x,y-p.y)>12)p.moved=true;},
 up(role,t,cancel=false){const p=held[role];delete held[role];delete pending[role];twist=null;press=null;neutralSince=null;ready=false;if(cancel){reset();return;}if(p&&!p.double&&!p.moved&&t-p.t<=190){tap[role]={t,x:p.x,y:p.y};}else delete tap[role];},
 poll(t,paired,input,grounded=true,canLoad=true){for(const r of['front','rear'])if(t-pending[r]>360)delete pending[r];if(!paired){twist=null;press=null;neutralSince=null;ready=false;return null;}
  if(!grounded){twist=null;press=null;neutralSince=null;ready=false;recent=null;for(const o of[tap,pending])for(const k of Object.keys(o))delete o[k];return null;}
  if(recent&&t-recent.t<=110){const other=recent.role==='front'?'rear':'front';if(pending[other]!==undefined&&Math.abs(pending[other]-recent.t)<=110){delete pending[other];recent=null;cooldown=t+650;press=null;ready=false;neutralSince=null;return 'jump';}}if(t<cooldown)return null;
  let action=null;const f=pending.front,r=pending.rear;
  if(f!==undefined&&r!==undefined&&Math.abs(f-r)<=110)action='jump';
  else if(f!==undefined)action='front';else if(r!==undefined)action='rear';
  if(action){recent=action==='front'||action==='rear'?{role:action,t:pending[action]}:null;delete pending.front;delete pending.rear;twist=null;cooldown=t+650;press=null;ready=false;neutralSince=null;return action;}
  if(!canLoad){twist=null;press=null;neutralSince=null;ready=false;return null;}
  // Continuous-contact jump: neutral -> brisk synchronized downward stroke,
  // short compression -> fast return to neutral. Screen-down is negative Y.
  // Long braking holds, slow edge sweeps, one-foot moves and airborne motions
  // cannot arm it. Timings are milliseconds; this is an abstract game gesture.
  const fy=input.frontY||0,ry=input.rearY||0,centerX=Math.abs(input.frontX||0)<.25&&Math.abs(input.rearX||0)<.25;
  const neutral=centerX&&Math.abs(fy)<.18&&Math.abs(ry)<.18;
  if(!grounded){press=null;neutralSince=null;ready=false;}
  else {
   if(neutral&&!press){neutralSince??=t;if(t-neutralSince>=80)ready=true;}
   if(!neutral&&!press){if(ready&&centerX&&(fy<-.25||ry<-.25)){press={start:t,front:null,rear:null,bottom:null,depart:null};ready=false;}neutralSince=null;}
   if(press){
    if(!centerX||fy>.25||ry>.25||t-press.start>600){press=null;ready=false;}
    else {
     if(fy<-.72&&press.front===null)press.front=t;
     if(ry<-.72&&press.rear===null)press.rear=t;
     if(press.bottom===null){
      if(t-press.start>160||(press.front!==null&&press.rear!==null&&Math.abs(press.front-press.rear)>85)){press=null;}
      else if(press.front!==null&&press.rear!==null&&fy<-.72&&ry<-.72)press.bottom=t;
     }else{
      const held=t-press.bottom;
      if(held>300&&press.depart===null)press=null;
      else if(fy>-.72||ry>-.72){if(press.depart===null){if(held<160)press=null;else press.depart=t;}}
      if(press&&press.depart!==null){
       if(t-press.depart>180)press=null;
       else if(neutral){press=null;neutralSince=null;ready=false;twist=null;cooldown=t+850;return 'jump';}
      }
     }
    }
   }
  }
  // Deliberate common left displacement, held briefly, followed by a quick
  // common right reversal. Opposing-foot twists and slow carving never qualify.
  const x1=input.frontX,x2=input.rearX,same=Math.abs(x1-x2)<.30;
  if(same&&x1<-.60&&x2<-.60){if(!twist)twist={start:t,armed:false};if(t-twist.start>=65&&!twist.expired)twist.armed=true;}
  if(twist&&t-twist.start>520){twist.armed=false;twist.expired=true;}if(twist?.expired&&x1>-.3&&x2>-.3)twist=null;
  if(twist?.armed&&x1>-.5&&x2>-.5&&twist.depart===undefined)twist.depart=t;
  if(twist?.armed&&twist.depart!==undefined&&t-twist.depart>180){twist.armed=false;twist.expired=true;}
  if(twist?.armed&&same&&x1>.60&&x2>.60&&t-twist.start<=520){twist=null;cooldown=t+850;return 'ollie';}
  return null;
 },read:()=>({held:Object.keys(held),pending:{...pending},twist:twist?{...twist}:null,press:press?{...press}:null,compression:press&&press.bottom!==null?.55:0})};
}
