export const G=9.80665, SUPPORT_RADIUS=.0025, DT=1/1000;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const DEFAULT={mass:.02,length:.14,comOffset:0,inertia:.02*.14*.14/12,mu:.06,initialOmega:18};
export function validate(p){for(const [k,v]of Object.entries(p))if(!Number.isFinite(v))throw Error(k+' must be finite');if(p.mass<=0||p.length<=0||p.inertia<=0||p.mu<0||Math.abs(p.comOffset)>p.length/2||Math.abs(p.initialOmega)>200)throw Error('invalid physical parameter');return p;}
// Equal-area quadrature of an EFFECTIVE circular friction patch. It is not the
// literal thin pen/skin intersection. Normal pressure is assumed uniform.
const PATCH=Array.from({length:16},(_,i)=>{const ring=Math.floor(i/4),a=(i%4)*Math.PI/4,r=SUPPORT_RADIUS*Math.sqrt((ring+.5)/4),x=r*Math.cos(a),y=r*Math.sin(a);return[{x,y},{x:-x,y:-y}];}).flat();
export class PenModel{
 constructor(params={}){this.p=validate({...DEFAULT,...params});this.reset();}
 reset(){this.x=this.p.comOffset;this.y=0;this.vx=0;this.vy=0;this.theta=0;this.omega=0;this.time=0;this.acc=0;this.state='ready';this.reason='';this.frictionPower=0;this.normal=0;}
 start(){if(this.state!=='ready')return false;this.omega=this.p.initialOmega;this.state='running';return true;}
 stop(reason='已停止'){if(this.state==='running'){this.state='stopped';this.reason=reason;}}
 energy(){return .5*this.p.mass*(this.vx*this.vx+this.vy*this.vy)+.5*this.p.inertia*this.omega*this.omega;}
 advance(dt,input=()=>({x:0,y:0})){if(this.state!=='running'||!Number.isFinite(dt)||dt<0)return;if(dt>.25){this.stop('渲染中断 >250ms，停止而非补算');return;}this.acc+=dt;while(this.acc+1e-12>=DT&&this.state==='running'){this.acc-=DT;this.integrate(input(this.time),DT);}}
 integrate(q,h=DT){if(!Number.isFinite(q.x)||!Number.isFinite(q.y)){this.stop('无效输入');return;}const {mass:m,inertia:I,mu}=this.p;const mag=Math.hypot(q.x,q.y),scale=mag>.95?.95/mag:1,gx=q.x*scale,gy=q.y*scale;this.normal=m*G*Math.sqrt(Math.max(0,1-gx*gx-gy*gy));
 // Gravity acts at COM: no artificial yaw torque or centrifugal COM force.
 this.vx+=G*gx*h;this.vy+=G*gy*h;
 const before=this.energy(),budget=mu*this.normal*h/PATCH.length;
 // All contacts see the SAME pre-step velocity. Antipodal quadrature preserves
 // exact centered-spin symmetry. Aggregate impulse is energy-limited as a whole.
 let Jx=0,Jy=0,T=0;
 for(const point of PATCH){const rx=point.x-this.x,ry=point.y-this.y,ux=this.vx-this.omega*ry,uy=this.vy+this.omega*rx,speed=Math.hypot(ux,uy);if(speed<1e-12)continue;const jx=-budget*ux/speed,jy=-budget*uy/speed;Jx+=jx;Jy+=jy;T+=rx*jy-ry*jx;}
 const work=this.vx*Jx+this.vy*Jy+this.omega*T,curvature=(Jx*Jx+Jy*Jy)/m+T*T/I;
 const factor=curvature>0?Math.min(1,Math.max(0,-work/curvature)):0;
 this.vx+=factor*Jx/m;this.vy+=factor*Jy/m;this.omega+=factor*T/I;
 this.frictionPower=(this.energy()-before)/h;
 this.x+=this.vx*h;this.y+=this.vy*h;this.theta+=this.omega*h;this.time+=h;
 if(Math.hypot(this.x,this.y)>=SUPPORT_RADIUS){this.stop('COM越界：失去准静态支撑');}
 else if(Math.abs(this.omega)<.05&&Math.hypot(this.vx,this.vy)<.00001){this.omega=0;this.vx=0;this.vy=0;this.stop('摩擦耗散：停止');}
 }
}
// Reproducible EFFECTIVE gravity projections, not recorded phone measurements.
export function trajectory(name,t){const rad=Math.PI/180;if(name==='zero')return{x:0,y:0};if(name==='step')return{x:t>=.5?Math.sin(.6*rad):0,y:0};if(name==='sine')return{x:Math.sin(.3*rad)*Math.sin(2*Math.PI*.8*t),y:Math.sin(.15*rad)*Math.sin(2*Math.PI*.5*t)};throw Error('unknown trajectory');}
export function compare(params,name='sine',duration=4){const variants=[['基准',params],['2×质量，同几何I×2',{...params,mass:params.mass*2,inertia:params.inertia*2}],['同质量，I×2',{...params,inertia:params.inertia*2}]];return variants.map(([label,p])=>{const m=new PenModel(p);m.start();while(m.state==='running'&&m.time<duration-1e-9)m.advance(Math.min(.01,duration-m.time),t=>trajectory(name,t));return{label,t:m.time,x:m.x,y:m.y,omega:m.omega,energy:m.energy(),reason:m.reason||'观察窗口结束'};});}
