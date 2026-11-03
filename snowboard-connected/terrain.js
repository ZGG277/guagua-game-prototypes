import {routesAt,centerAt,forkAt,NETWORK} from './resort-network.js';
import {TRAIL_ENABLED,rollerAt,trailCenter} from './trail-plan.js';
// One absolute-coordinate analytic surface drives rendering, gravity and contacts.
// R17 keeps the R16 launch pitch through 65m, then opens into connected mountain relief.
const smooth=t=>t*t*t*(10+t*(-15+6*t)),integral=t=>t**4*(2.5+t*(-3+t));
export const CHUNK_LENGTH=256;
export const GENERATOR_VERSION=17;
export function seedFromSearch(search=''){const value=new URLSearchParams(search).get('seed'),n=Number(value);return value!==null&&value.trim()!==''&&Number.isInteger(n)&&n>=0&&n<=4294967295?n:1125;}
export const courseSeed=seedFromSearch(globalThis.location?.search??'');

// Independent, stateless chunk streams: changing scenery never moves a reward.
function hash(v){v=Math.imul(v^(v>>>16),0x21f0aaad);v=Math.imul(v^(v>>>15),0x735a2d97);return(v^(v>>>15))>>>0;}
function stream(seed,index,salt){let n=hash((seed>>>0)^hash(index>>>0)^hash(Math.floor(index/4294967296))^salt^GENERATOR_VERSION);return()=>{n=(n+0x6d2b79f5)>>>0;let t=Math.imul(n^(n>>>15),n|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
export function createCourse(seed=1125){
 let n=seed>>>0;const rand=()=>((n=(1664525*n+1013904223)>>>0)/4294967296),nodes=[];let z=-160,y=0;
 const legacyPlan=[[-160,.52,34],[-15,.52,34],[65,.52,34],[120,.15,19],[175,.15,19],[230,.55,29],[310,.55,29],[370,.16,16],[430,.16,16],[495,.58,34],[585,.58,34],[650,.14,18],[715,.14,18],[775,.53,30],[865,.53,30],[925,.17,18],[990,.17,18],[1055,.56,34],[1190,.56,34],[1260,.15,20],[1450,.15,20]];
 const plan=TRAIL_ENABLED?[[-160,.24,70],[1808,.24,70],[2508,.29,140],[4408,.29,140],[5108,.34,95],[7408,.30,100],[8208,.12,130],[9008,0,150],[11008,0,150]]:[[-160,.52,55],[-15,.52,55],[65,.52,55],[230,.34,150],[2950,.34,150]];
 for(let base=1450;base<2950;base+=500)legacyPlan.push([base+80,.48,31],[base+180,.48,36],[base+270,.16,29],[base+360,.16,33],[base+500,.52,38]);
 const high=.94+rand()*.12,low=.9+rand()*.2,wide=.92+rand()*.16;
 for(const[z0,g,w]of plan){const grade=g*(g>.3?high:low),width=w*wide*2.1;z=z0;nodes.push({z,height:y,grade,width});if(nodes.length>1){const a=nodes.at(-2),L=z-a.z;y=a.height-L*(a.grade+(grade-a.grade)*.5);nodes.at(-1).height=y;}}
 const course={seed:seed>>>0,nodes,trees:[],mountains:[],start:8,end:Infinity,halfSpan:Infinity};
 const offset=profileAt(0,course).height;for(const node of nodes)node.height-=offset;
 const r=stream(seed,0,0x71a331);course.extension={a:0,b:0,k:2*Math.PI/(590+r()*180),q:2*Math.PI/(340+r()*120),wa:10+r()*3,wb:3+r()*2};
 return course;
}
export function profileAt(z,course){
 const ns=course.nodes,last=ns.at(-1);
 if(z>last.z&&course.extension){
  const s=z-last.z,{a,b,k,q,wa,wb}=course.extension,sk=k*s,sq=q*s,ck=Math.cos(sk),cq=Math.cos(sq);
  // Integrating grade analytically avoids caches or accumulated seam error. Both
  // first grade derivative vanishes at the join. Height and width are C2 continuous.
  return{height:last.height-(last.grade-a-b)*s-a*Math.sin(sk)/k-b*Math.sin(sq)/q,grade:last.grade-a*(1-ck)-b*(1-cq),dgrade:-a*k*Math.sin(sk)-b*q*Math.sin(sq),width:last.width-wa*.5*(1-ck)**2-wb*.5*(1-cq)**2};
 }
 let i=0;while(i<ns.length-2&&z>ns[i+1].z)i++;const a=ns[i],b=ns[i+1],L=b.z-a.z;
 if(z<a.z)return{height:a.height-a.grade*(z-a.z),grade:a.grade,dgrade:0,width:a.width};
 if(z>b.z)return{height:b.height-b.grade*(z-b.z),grade:b.grade,dgrade:0,width:b.width};
 const t=(z-a.z)/L,w=smooth(t),dg=b.grade-a.grade;
 return{height:a.height-L*(a.grade*t+dg*integral(t)),grade:a.grade+dg*w,dgrade:dg*30*t*t*(1-t)*(1-t)/L,width:a.width+(b.width-a.width)*w};
}
export const COURSE=createCourse(courseSeed);
// Compatibility list is updated in place by the bounded rendered chunk ring.
export const COLLIDERS=[];
export const TERRAIN=Object.freeze({slope:.22,waveGrade:.045,waveLength:180,procedural:true});
// A smooth continuous mountain, including skiable off-piste connecting saddles.
// New terms have a C2 fade after the approved R16 starting pitch.
const fade2=(z,a,b)=>{const t=Math.max(0,Math.min(1,(z-a)/(b-a))),L=b-a;return [smooth(t),t>0&&t<1?30*t*t*(1-t)*(1-t)/L:0,t>0&&t<1?60*t*(1-t)*(1-2*t)/(L*L):0];};
export const ROUTES=Object.freeze([{id:'extreme',label:'极限',side:-1,color:'#ef637c',width:11},{id:'easy',label:'轻松',side:0,color:'#6ef3b7',width:22},{id:'advanced',label:'进阶',side:1,color:'#ffc468',width:15}]);
export function routeAt(id,z){if(TRAIL_ENABLED){const rs=routesAt(z),r=rs.find(q=>q.id===(id==='extreme'?'forest':id==='advanced'?'crest':id))||rs[0];return {...r,label:r.name};}const r=ROUTES.find(r=>r.id===id)||ROUTES[1],f=fade2(z,25,360)[0];return {...r,x:r.side*(165+18*Math.sin((z-300)/280))*f+(r.side===0?8*Math.sin(z/190)*f:0)};}
function resortRelief(x,z){
 const out={height:0,dx:0,dz:0,dxx:0,dxz:0,dzz:0};
 const add=(cx,w,h,hz,hzz)=>{const q=(x-cx)/w,g=Math.exp(-q*q/2),gx=-q*g/w,gxx=(q*q-1)*g/(w*w);out.height+=g*h;out.dx+=gx*h;out.dz+=g*hz;out.dxx+=gxx*h;out.dxz+=gx*hz;out.dzz+=g*hzz;};
 const [e,ez,ezz]=fade2(z,60,700);
 for(const[cx,w,A,k,phase]of[[-310,70,105,.0018,.4],[310,70,122,.0013,1.6],[0,150,1.4,.018,0]]){const t=k*z+phase,v=A*(.65+.35*Math.sin(t)),vz=A*.35*k*Math.cos(t),vzz=-A*.35*k*k*Math.sin(t);add(cx,w,e*v,ez*v+e*vz,ezz*v+2*ez*vz+e*vzz);}
 const a=fade2(z,2008,2608),b0=fade2(z,4208,4808),b=[1-b0[0],-b0[1],-b0[2]],v=a[0]*b[0],vz=a[1]*b[0]+a[0]*b[1],vzz=a[2]*b[0]+2*a[1]*b[1]+a[0]*b[2];add(0,26,12*v,12*vz,12*vzz);
 return out;
}
export function surfaceAt(x,z,config=TERRAIN){
 let height,dx=0,dz,dxx=0,dxz=0,dzz;
 if(config.procedural!==false){
  const a=profileAt(z,config.course||COURSE);height=a.height;dz=-a.grade;dzz=-a.dgrade;
  const [e,ez,ezz]=fade2(z,65,390),terms=[[-165,68,.69,.0047,0],[165,76,.45,.0042,1.1],[0,115,.025,.0045,.4],[-300,105,.12,.0038,1.9],[300,105,.09,.0035,.7]];
  for(const [cx,w,A,k,phase] of (TRAIL_ENABLED?[]:terms)){const q=(x-cx)/w,g=Math.exp(-.5*q*q),gx=-q*g/w,gxx=(q*q-1)*g/(w*w),t=k*(z-65)+phase,st=Math.sin(t),ct=Math.cos(t),v=A/k*(.25*Math.sin(2*t)-.03125*Math.sin(4*t)),vz=A*(.375-st**4),vzz=-4*A*k*st**3*ct,h=e*v,hz=ez*v+e*vz,hzz=ezz*v+2*ez*vz+e*vzz;
   height+=g*h;dx+=gx*h;dz+=g*hz;dxx+=gxx*h;dxz+=gx*hz;dzz+=g*hzz;
  }
 }else{const grade=config.slope??.22,a=config.waveGrade??.045,k=2*Math.PI/(config.waveLength??180);height=-grade*z+a/k*(Math.cos(k*z)-1);dz=-grade-a*Math.sin(k*z);dzz=-a*k*Math.cos(k*z);}
 if(TRAIL_ENABLED&&config.procedural!==false){const r=resortRelief(x,z);height+=r.height;dx+=r.dx;dz+=r.dz;dxx+=r.dxx;dxz+=r.dxz;dzz+=r.dzz;}
 const metric=Math.sqrt(1+dz*dz),normalMetric=Math.sqrt(1+dx*dx+dz*dz);
 return {height,dx,dz,dxx,dxz,dzz,metric,normalMetric,curvature:dzz/metric**3,normalX:-dx/normalMetric,normalY:1/normalMetric,normalZ:-dz/normalMetric,
  xx:metric/normalMetric,xy:dx/(metric*normalMetric),xz:-dx*dz/(metric*normalMetric),zy:dz/metric,zz:1/metric};
}
export function tangentVector(s,x,z){return{x:s.xx*x,y:s.xy*x+s.zy*z,z:s.xz*x+s.zz*z};}
export function tangentComponents(s,v){return{x:v.x*s.xx+v.y*s.xy+v.z*s.xz,z:v.y*s.zy+v.z*s.zz};}
export function chartVelocity(s,x,z){return{x:s.xx*x,z:s.xz*x+s.zz*z};}
// Minimal rotation is parallel transport between nearby snow tangent planes.
// It preserves velocity magnitude; no target heading or driving force is added.
export function transportTangent(a,b,x,z){if(a.dx===0&&b.dx===0)return{x,z,angle:0};const v=tangentVector(a,x,z),nx=a.normalY*b.normalZ-a.normalZ*b.normalY,ny=a.normalZ*b.normalX-a.normalX*b.normalZ,nz=a.normalX*b.normalY-a.normalY*b.normalX,c=a.normalX*b.normalX+a.normalY*b.normalY+a.normalZ*b.normalZ,k=1/(1+c),cross={x:ny*v.z-nz*v.y,y:nz*v.x-nx*v.z,z:nx*v.y-ny*v.x},dot=nx*v.x+ny*v.y+nz*v.z,rot={x:v.x*c+cross.x+nx*dot*k,y:v.y*c+cross.y+ny*dot*k,z:v.z*c+cross.z+nz*dot*k};return tangentComponents(b,rot);}

export const ground=(x,z)=>surfaceAt(x,z).height;
export const pisteWidth=z=>profileAt(z,COURSE).width;

function maxWidth(course,z,radius){let width=0;for(let q=z-radius;q<=z+radius;q+=2)width=Math.max(width,profileAt(q,course).width);return Math.max(width,profileAt(z+radius,course).width)+1;}
export function createChunk(index,seed=courseSeed){
 if(!Number.isSafeInteger(index)||Math.abs(index)>Math.floor(Number.MAX_SAFE_INTEGER/CHUNK_LENGTH)-1)throw new RangeError('Chunk index must have an exactly representable route coordinate');
 seed>>>=0;if(TRAIL_ENABLED)return createConnectedChunk(index,seed);const course=seed===courseSeed?COURSE:createCourse(seed),start=index*CHUNK_LENGTH,end=start+CHUNK_LENGTH;
 const trees=[],mountains=[],gates=[],jumps=[],gems=[],routeMarkers=[];
 const tr=stream(seed,index,0x74726565),gr=stream(seed,index,0x67617465),jr=stream(seed,index,0x6a756d70);
 for(let i=0;i<8;i++){
  const z=start+(i+.2+tr()*.6)*CHUNK_LENGTH/8,side=i%2?1:-1,height=5+tr()*8,radius=height*.22;
  const x=TRAIL_ENABLED&&z>=0&&z<=600?side*(52+tr()*18):side*(maxWidth(course,z,radius+2)+radius+5+tr()*45),baseY=surfaceAt(x,z,{course}).height;
  trees.push({id:`r14:${seed}:${index}:tree:${i}`,type:'tree',x,z,radius,height,baseY,capsule:{bottomY:baseY,topY:baseY+height*1.03,radius}});
 }
 // Colored flags describe routes; they are flexible visual guides, never fences.
 for(const route of ROUTES)for(let i=0;i<8;i++){const z=start+16+i*32,r=routeAt(route.id,z);for(const side of[-1,1])routeMarkers.push({route:route.id,x:r.x+side*r.width,z,color:r.color});}
 // Three short, locally coherent strings per chunk. 24 fits one Uint32 reward word.
 if(index>=0)for(let r=0;r<ROUTES.length;r++){
  const route=ROUTES[r],count=TRAIL_ENABLED&&index<3?(r===2?8:r===0?6:5):((index+r)%2?7:8),base=TRAIL_ENABLED&&index===0?(r===1?65:154):start+65+gr()*15;
  for(let i=0;i<count;i++){const z=base+i*12,q=routeAt(route.id,z),x=q.x+Math.sin(i*.48+index)*Math.min(2.2,q.width*.15);gems.push({id:`r17:${seed}:${index}:gem:${r*8+i}`,type:'gem',route:route.id,stringId:`${index}:${route.id}`,stringIndex:i,stringLength:count,chunkIndex:index,rewardIndex:r*8+i,x,z,y:surfaceAt(x,z,{course}).height+2.2,radius:.66});}
 }

 // R19: one clearly readable optional obstacle per route per 256 m. Independent
 // stream preserves the accepted gem strings and scenery/reset determinism.
 const obstacles=[];
 if(index>=0){const rand=stream(seed,index,0x6f627374);for(let r=0;r<ROUTES.length;r++){
  const route=ROUTES[r],z=start+178+r*21+rand()*7,q=routeAt(route.id,z),type=(index+r)%3===1?'rock':'log';
  const x=q.x+(rand()<.5?-1:1)*q.width*(r===1?.20:.14),height=type==='log'?(r===1?.40:.50):r===1?.48:.62;
  obstacles.push({id:`r19:${seed}:${index}:obstacle:${r}`,type,route:route.id,x,z,width:type==='log'?(r===1?4.6:5.8):2.5,depth:type==='log'?height:1.9,height,angle:(rand()-.5)*.25,approach:28});
 }}

 if(TRAIL_ENABLED&&index>=0&&index<=2){obstacles.length=0;if(index===1)obstacles.push({id:'trial-log',type:'log',route:'advanced',x:25,z:370,width:4.6,depth:.4,height:.4,angle:.1,approach:28});}
 return{index,seed,start,end,trees:trees.filter(t=>!mountains.some(m=>((t.x-m.x)/(m.rx+t.radius))**2+((t.z-m.z)/(m.rz+t.radius))**2<1)),mountains,gates,jumps,gems,routeMarkers,obstacles};
}

function createConnectedChunk(index,seed){
 const course=seed===courseSeed?COURSE:createCourse(seed),start=index*CHUNK_LENGTH,end=start+CHUNK_LENGTH;
 const trees=[],mountains=[],gates=[],jumps=[],gems=[],routeMarkers=[];
 const tr=stream(seed,index,0x74726565),gr=stream(seed,index,0x67617465);
 if(TRAIL_ENABLED){
  for(let i=0;i<28;i++){
   const z=start+20+Math.floor(i/4)*32+(i%2)*8,rs=routesAt(z),r=rs[Math.floor(i/4)%rs.length],side=i%4<2?-1:1;
   const x=r.x+side*(r.width+13+tr()*24),height=6+tr()*10,radius=height*.20;
   // Snow-piste corridors and recovery anchors always remain open, including the fork sightline.
   if(rs.some(q=>Math.abs(x-q.x)<q.width+radius+6)||z<60||z>9800)continue;
   const baseY=surfaceAt(x,z,{course}).height;trees.push({id:`resort:${seed}:${index}:tree:${i}`,type:'tree',x,z,height,radius,baseY});
  }
  for(let i=0;i<8;i++){const z=start+16+i*32;for(const r of routesAt(z))for(const side of [-1,1])routeMarkers.push({route:r.id,x:r.x+side*r.width,z,color:r.color});}
  for(let r=0;r<2;r++)for(let i=0;i<10;i++){const z=start+68+i*14,rs=routesAt(z);if(r>=rs.length||z>9700)continue;const route=rs[r],x=route.x+Math.sin(i*.48+index)*2;gems.push({id:`resort:${seed}:${index}:gem:${r*12+i}`,type:'gem',route:route.id,stringId:`${index}:${route.id}`,stringIndex:i,stringLength:10,chunkIndex:index,rewardIndex:r*12+i,x,z,y:surfaceAt(x,z,{course}).height+2.2,radius:.66});}
 }else{
  for(let i=0;i<8;i++){const z=start+(i+.2+tr()*.6)*CHUNK_LENGTH/8,height=5+tr()*8,radius=height*.22,x=(i%2?1:-1)*(maxWidth(course,z,radius+2)+radius+5+tr()*45),baseY=surfaceAt(x,z,{course}).height;trees.push({id:`r14:${seed}:${index}:tree:${i}`,type:'tree',x,z,radius,height,baseY});}
  for(const r of ROUTES)for(let i=0;i<8;i++){const z=start+16+i*32,q=routeAt(r.id,z);for(const side of[-1,1])routeMarkers.push({route:r.id,x:q.x+side*q.width,z,color:q.color});}
  if(index>=0)for(let r=0;r<3;r++)for(let i=0;i<8;i++){const z=start+65+i*12,q=routeAt(ROUTES[r].id,z),x=q.x;gems.push({id:`resort-free:${seed}:${index}:gem:${r*8+i}`,type:'gem',stringId:`${index}:${r}`,chunkIndex:index,rewardIndex:r*8+i,x,z,y:surfaceAt(x,z,{course}).height+2.2,radius:.66});}
 }
 const obstacles=[];

 return {index,seed,start,end,trees,mountains,gates,jumps,gems,routeMarkers,obstacles};
}
