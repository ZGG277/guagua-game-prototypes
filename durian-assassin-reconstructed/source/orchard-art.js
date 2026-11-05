// Hand-cut plates in world coordinates. Pure renderers: simulation stays untouched.
const C={ink:'#173e3a',teal:'#216356',sage:'#76906c',paper:'#f1dfb5',amber:'#d8a033',rust:'#cb472a',bark:'#9a6335'};
const TAU=Math.PI*2;
// Stable real fruit sockets. Old render fixtures without canopy retain one socket.
function fruitSlots(sim){return sim.canopy?.slots||[{id:'legacy',x:Number.isFinite(sim.landingX)?sim.landingX:408,y:-850,z:0,state:'released'}]}
function stemTip(p){const a=(p.x-408)*.017;return{x:p.x+2*Math.cos(a)+27*Math.sin(a),y:p.y+2*Math.sin(a)-27*Math.cos(a)}}
function path(c,pts,color,width=1){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke()}
function shape(c,pts,color){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fillStyle=color;c.fill()}
function oval(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=color;c.fill()}
function branch(c,pts,width){path(c,pts,C.ink,width+4);path(c,pts,C.bark,width);path(c,pts.map(([x,y])=>[x-3,y-2]),C.amber,1.8);}
function leaf(c,x,y,l,w,a,color=C.teal){c.save();c.translate(x,y);c.rotate(a);c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-w*.9,-l*.19,-w*.9,-l*.64,0,-l);c.bezierCurveTo(w*.72,-l*.72,w,-l*.3,0,0);c.fillStyle=color;c.fill();c.strokeStyle=C.ink;c.lineWidth=2;c.stroke();c.save();c.clip();path(c,[[0,-3],[-1,-l*.52],[0,-l+6]],C.paper,1.1);for(let j=1;j<8;j++){const t=j/9,ww=w*Math.sin(t*Math.PI)*.7;path(c,[[0,-l*t],[-ww,-l*t-l*.12]],C.paper,.7);path(c,[[0,-l*t],[ww*.85,-l*t-l*.16]],C.paper,.7);if(j%2)path(c,[[-ww*.5,-l*t],[1,-l*t-l*.11]],C.sage,.65)}c.restore();c.restore()}
/** Paint back before actors and front after actors; foreground is explicitly
 * clipped above -650 so it can never cover a hand, cloth contact or ground. */
export function drawOrchard(c,sim,layer='back'){
 c.save();
 if(layer==='front'){
  c.beginPath();c.rect(-1800,-2000,4000,1350);c.clip();
  // Every socket keeps its own leaves, even after its fruit is released.
  // The leaves never follow the active selection or the falling physical body.
  for(const p of fruitSlots(sim)){
   c.save();c.beginPath();c.rect(p.x-27,p.y-29,54,32);c.clip();
   leaf(c,p.x+9,p.y+5,40,20,-.56,C.teal);c.restore();
  }
  c.restore();return;
 }
 c.fillStyle=C.paper;c.fillRect(-1800,-2200,4000,4400);
 oval(c,-120,-935,143,143,C.rust);c.save();c.beginPath();c.arc(-120,-935,143,0,TAU);c.clip();for(let i=0;i<20;i++)path(c,[[-280,-1070+i*15],[50,-1082+i*15]],C.paper,.9);c.restore();
 // Quiet distant trunks: no decorative marks in the catching corridor.
 for(let i=0;i<5;i++){let x=-740+i*480;path(c,[[x,525],[x-23,-420-(i%3)*70]],'rgba(118,144,108,0.3333333333333333)',11);for(let j=0;j<3;j++)leaf(c,x,-170-j*90,210,49,(j-1)*.65,'rgba(118,144,108,0.3333333333333333)')}
 shape(c,[[-1800,523],[-400,492],[160,500],[700,478],[1800,501],[1800,1800],[-1800,1800]],C.amber);
 for(let i=0;i<33;i++){let x=(i*179)%2300-800,y=564+(i*31)%210;path(c,[[x-5,y],[x+8,y-2]],C.bark,.8)}
 // Scale only the tree plate about its roots, never actors, ground or fruit.
 c.save();c.translate(0,550);c.scale(1,1.4);c.translate(0,-550);
 branch(c,[[595,558],[567,230],[581,-180],[551,-590],[566,-1040]],61);
 for(let i=0;i<8;i++){const x=545+i*5;path(c,[[x+34,535],[x+9,190],[x+20,-180],[x-5,-590],[x+7,-1030]],i%3?C.ink:C.amber,i%3?1:2.1)}
 // Short gouges turn with the trunk instead of a smooth vector gradient.
 for(let i=0;i<28;i++){let y=480-i*53,x=573+Math.sin(i*.65)*9;path(c,[[x+5,y],[x,y-17],[x+3,y-26]],C.paper,.9)}
 shape(c,[[569,490],[536,547],[486,565],[570,550],[625,568],[656,560],[609,537],[597,490]],C.ink);
 branch(c,[[554,-543],[405,-704],[240,-784],[152,-949]],29);
 branch(c,[[562,-805],[486,-922],[340,-929]],18);
 branch(c,[[572,-370],[714,-522],[866,-597]],24);
 branch(c,[[565,-959],[742,-1030],[901,-1042]],22);

 // Attached fans replace scattered foliage: every leaf grows from a branch.
 for(const [k,root] of [[152,-949],[240,-784],[340,-929],[566,-1030],[742,-1030],[901,-1042],[866,-597]].entries()){
  for(let j=0;j<5;j++){const angle=(j-2)*.57+(k%2?.15:-.13),length=(k>2&&k<6?80:120)+(j%3)*15;
   leaf(c,root[0],root[1]+8, length,27+(j%2)*7,angle,(j+k)%5===0?C.sage:C.teal);
  }
 }
 c.restore();
 // Natural secondary branches occupy the real socket coordinates. Twig endpoint
 // is the actual rotated fruit stem tip, not the unrotated body top.
 for(const [i,p] of fruitSlots(sim).entries()){
  const t=stemTip(p),forkX=555-(i%3)*8;
  branch(c,[[forkX,p.y-95],[p.x+39,p.y-65],[t.x,t.y]],i%3===0?4:3);
  leaf(c,p.x+40,p.y-65,68,16,.9,C.teal);
 }
 for(const p of fruitSlots(sim))if(p.state==='hanging')drawFruit(c,{x:p.x+(p.z||0)*.48,y:p.y-(p.z||0)*.24},1);
 // Frame the ground at its outer edges; hands and collection basket stay clear.
 for(const side of[-1,1]){const x=side<0?-34:805;for(let i=0;i<4;i++)leaf(c,x,559,95+i*22,17+i*3,side*(.22+i*.27),i%2?C.ink:C.teal)}
 oval(c,290,552,106,6,'rgba(23,62,58,0.09411764705882353)');const f=sim.fruit;if(f){const proximity=Math.max(0,1-(550-f.y)/450);oval(c,f.x+(f.z||0)*.48,553,22+Math.max(0,550-f.y)*.025,4+proximity*2,`rgba(23,62,58,${proximity*.22})`)}
 c.restore();
}
/** p is ALREADY projected. No z transform or collider / position adjustment. */
export function drawFruit(c,p,size=1){
 if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
 c.save();c.translate(p.x,p.y);c.scale(size,size);c.rotate((p.x-408)*.017);
 // The asymmetric knife-cut outline stays inside the existing 27 px art radius.
 const ring=[];for(let i=0;i<44;i++){const a=i*TAU/44,r=i%2?20.4:24.7+(i%6)*.12;ring.push([Math.cos(a)*r,Math.sin(a)*r*1.04])}shape(c,ring,C.ink);
 oval(c,0,0,19.4,21.6,C.amber);c.save();c.beginPath();c.ellipse(0,0,19.4,21.6,0,0,TAU);c.clip();
 shape(c,[[3,-23],[23,-15],[23,24],[-3,24],[6,8]],C.teal);
 for(let i=0;i<28;i++){const a=i*2.399,r=Math.sqrt((i+.5)/28)*19,x=Math.cos(a)*r,y=Math.sin(a)*r*1.08;shape(c,[[x-2.7,y+1.8],[x+.2,y-3.4],[x+2.7,y+1.6]],x>4?C.amber:C.ink);path(c,[[x-.8,y+1],[x+.3,y-1.7]],C.paper,.65)}
 path(c,[[-7,-19],[-10,-7],[-7,7],[-3,19]],C.paper,.8);c.restore();path(c,[[0,-21],[2,-27]],C.ink,3);path(c,[[0,-22],[1,-26]],C.bark,1);c.restore();
}
