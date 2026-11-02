import {clamp} from './model.js';
export function gravity(beta,gamma,screenAngle=0){const b=beta*Math.PI/180,g=gamma*Math.PI/180,a=screenAngle*Math.PI/180;const x=Math.cos(b)*Math.sin(g),y=Math.sin(b);return {x:x*Math.cos(a)+y*Math.sin(a),y:y*Math.cos(a)-x*Math.sin(a),z:Math.cos(b)*Math.cos(g)};}
// Tangent-plane calibration preserves forward/back control while held upright.
export function relativeTilt(current,reference){
 const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
 const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
 const norm=a=>{let n=Math.hypot(a.x,a.y,a.z);return {x:a.x/n,y:a.y/n,z:a.z/n};};
 const n=norm(reference);let ex,ey;
 if(Math.abs(n.x)<.95){ex=norm({x:1-n.x*n.x,y:-n.x*n.y,z:-n.x*n.z});ey=cross(n,ex);}
 else{ey=norm({x:-n.y*n.x,y:1-n.y*n.y,z:-n.y*n.z});ex=cross(ey,n);}
 return {x:dot(current,ex),y:dot(current,ey)};
}
export async function sensorPermission(env){if(!env.secure)return {ok:false,message:'需要 HTTPS 安全连接；可使用触控模拟。'};if(!env.Sensor)return {ok:false,message:'浏览器不支持姿态传感器；可使用触控模拟。'};try{if(typeof env.Sensor.requestPermission==='function'&&await env.Sensor.requestPermission()!=='granted')return {ok:false,message:'未获传感器权限；可使用触控模拟。'};return {ok:true,message:'等待姿态数据…'};}catch{return {ok:false,message:'传感器请求失败；可使用触控模拟。'};}}
export const INPUT_DEFAULT={tau:.035,deadzoneDeg:.15,gain:.25,maxTiltDeg:12};
export class InputPipeline{
 constructor(config={}){this.config={...INPUT_DEFAULT,...config};this.reset();}
 reset(){this.reference=null;this.lastSource=null;this.lastReceived=null;this.lastGravity=null;this.raw={x:0,y:0};this.filtered={x:0,y:0};this.output={x:0,y:0};this.interval=null;this.deliveryAge=null;this.fault='';this.samples=0;this.queue=[];}
 calibrate(g){this.reset();this.reference={...g};}
 push(g,sourceTime,receivedTime){if(!this.reference)return false;if(![g.x,g.y,g.z,sourceTime,receivedTime].every(Number.isFinite)){this.fault='无效姿态';return false;}if(this.fault)return false;if(sourceTime>receivedTime+.05||receivedTime-sourceTime>.5){this.fault='事件时间异常或过期';return false;}if(this.lastSource!==null&&sourceTime<=this.lastSource)return false;
 if(this.lastGravity){const dot=clamp(g.x*this.lastGravity.x+g.y*this.lastGravity.y+g.z*this.lastGravity.z,-1,1),jump=Math.acos(dot);if(jump>35*Math.PI/180){this.fault='姿态突跳 >35°，请重新校准';return false;}}
 const dt=this.lastSource===null?0:sourceTime-this.lastSource;this.interval=dt;this.deliveryAge=receivedTime-sourceTime;this.lastSource=sourceTime;this.lastReceived=receivedTime;this.lastGravity={...g};this.samples++;
 const raw=relativeTilt(g,this.reference);this.raw=raw;const a=this.config.tau<=0?1:-Math.expm1(-dt/this.config.tau);this.filtered={x:this.filtered.x+a*(raw.x-this.filtered.x),y:this.filtered.y+a*(raw.y-this.filtered.y)};
 const n=Math.hypot(this.filtered.x,this.filtered.y),angle=Math.asin(Math.min(n,1)),dz=this.config.deadzoneDeg*Math.PI/180,eff=Math.min(this.config.maxTiltDeg*Math.PI/180,Math.max(0,angle-dz)*this.config.gain),s=n>1e-12?Math.sin(eff)/n:0;this.output={x:this.filtered.x*s,y:this.filtered.y*s};this.queue.push({receivedTime,value:{...this.output}});if(this.queue.length>2048)this.queue.shift();return true;}
 at(time){let value={x:0,y:0};for(let i=this.queue.length-1;i>=0;i--)if(this.queue[i].receivedTime<=time+1e-9){value=this.queue[i].value;break;}return value;}
 stale(now){return this.lastReceived===null||now-this.lastReceived>.5;}
}
