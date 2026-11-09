/** Once-per-rules-version teaching, independent of pointer events and scoring.
 * A cancelled/failed pull never advances it. No platform/network dependency. */
export const TUTORIAL_KEY='ivy-tutorial-r11.2';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function createTutorial({read=()=>null,write=()=>{}}={}){
 let completed=0,pending=null;
 try{const value=JSON.parse(read(TUTORIAL_KEY));if(value?.version===2&&Number.isInteger(value.completed))completed=clamp(value.completed,0,3);}catch{}
 function snapshot(){return{version:2,completed,done:completed>=3,pending:pending?{...pending}:null};}
 function launch(wall){if(completed>=3||wall.body.grounded||wall.feedback?.type!=='jump')return;pending={time:wall.flightTime,source:wall.lastLeaf};}
 function observe(wall){
  if(!pending||completed>=3)return snapshot();
  if(wall.falls>0&&wall.feedback?.type==='base'){pending=null;return snapshot();}
  if(wall.body.grounded&&!wall.grip&&wall.body.feet?.filter(Boolean).length===2){
   if(wall.standId<=pending.source){pending=null;return snapshot();}
   if(wall.time-wall.landTime<.12&&!wall.completed)return snapshot();
   completed=Math.min(3,completed+1);pending=null;
   try{write(TUTORIAL_KEY,JSON.stringify({version:2,completed}));}catch{}
  }
  return snapshot();
 }
 function cancelPending(){pending=null;}
 return Object.freeze({snapshot,launch,observe,cancelPending});
}
export function lessonCue(completed,guidance){
 if(completed>=3||!guidance)return null;
 // First teaches length only. Later arrows are derived from the next real leaf,
 // including a player who retries, skips a support, or returns to a lower leaf.
 const sign=Math.abs(guidance.aim)<.07?0:Math.sign(guidance.aim);
 if(completed===0)return{step:1,pull:{x:0,y:1},launch:null,text:'下拉蓄力'};
 return{step:completed+1,pull:{x:-sign*.62,y:1},launch:{x:sign*.62,y:-1},text:sign<0?'右下拉，向左上跳':sign>0?'左下拉，向右上跳':'向下拉，向上跳'};
}
