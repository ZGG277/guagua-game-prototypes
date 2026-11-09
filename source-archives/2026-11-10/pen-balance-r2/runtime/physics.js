export const H=1/240;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Relative gravity projection in screen coordinates; beta/gamma are intrinsic
// device rotations, not screen rotations. Calibration subtracts vectors, not Euler angles.
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
export class Balance {
 constructor(){this.reset();}
 reset(){this.x=0;this.y=0;this.vx=.012;this.vy=-.006;this.theta=0;this.omega=0;this.time=0;this.acc=0;this.state='ready';this.reason='';this.energy=0;}
 flick(strength=1){if(this.state!=='ready')return false;this.omega=18*clamp(strength,.7,1.3);this.state='spinning';return true;}
 collect(reason='收笔'){if(this.state==='spinning'){this.state='ended';this.reason=reason;this.omega=0;}}
 step(dt,tilt={x:0,y:0}){if(this.state!=='spinning'||!Number.isFinite(dt))return;this.acc+=Math.max(0,dt);while(this.acc>=H&&this.state==='spinning'){this.acc-=H;this.integrate(tilt);}}
 integrate(tilt){const rho=Math.hypot(this.x/.055,this.y/.037);const tx=clamp(tilt.x,-.5,.5),ty=clamp(tilt.y,-.5,.5);
 // Reduced rigid-body contact: gravity projected onto the support plane;
 // dissipative translation, small eccentric rotating mass, edge-dependent friction.
 const eccentric=.000035*this.omega*this.omega;
 this.vx+=(9.81*.23*tx-.17*this.vx+eccentric*Math.cos(this.theta))*H;
 this.vy+=(9.81*.23*ty-.17*this.vy+eccentric*Math.sin(this.theta))*H;
 this.x+=this.vx*H;this.y+=this.vy*H;
 this.omega*=Math.exp(-(.075+.25*rho*rho+.12*Math.hypot(tx,ty))*H);
 this.theta+=this.omega*H;this.time+=H;this.energy=.5*this.omega*this.omega;
 if(Math.hypot(this.x/.055,this.y/.037)>=1){this.state='ended';this.reason='越过支撑边缘 · 掉笔';}
 else if(this.omega<1.5){this.state='ended';this.reason='角动量耗尽 · 停转';}
 }
}
export async function sensorPermission(env){if(!env.secure)return {ok:false,message:'需要 HTTPS 安全连接；可使用触控模拟。'};if(!env.Sensor)return {ok:false,message:'浏览器不支持姿态传感器；可使用触控模拟。'};try{if(typeof env.Sensor.requestPermission==='function'&&await env.Sensor.requestPermission()!=='granted')return {ok:false,message:'未获传感器权限；可使用触控模拟。'};return {ok:true,message:'等待姿态数据…'};}catch{return {ok:false,message:'传感器请求失败；可使用触控模拟。'};}}
