import {CHECKPOINTS,trailCenter} from './trail-plan.js';
// Original layered spruce, one shared geometry/draw per existing tree slot.
export function pineGeometry(T){
 const positions=[],normals=[],colors=[];
 const parts=[{g:new T.CylinderGeometry(.14,.21,.38,7),y:-.31,trunk:true},
  {g:new T.ConeGeometry(1,.62,9),y:-.04},{g:new T.ConeGeometry(.76,.49,9),y:.19},{g:new T.ConeGeometry(.46,.3,9),y:.35}];
 for(const {g,y,trunk} of parts){const n=g.toNonIndexed(),p=n.attributes.position,ns=n.attributes.normal;
  for(let i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i)+y,p.getZ(i));normals.push(ns.getX(i),ns.getY(i),ns.getZ(i));
   const c=new T.Color(trunk?'#68554e':p.getY(i)>.03?'#dce8e6':'#315c60');colors.push(c.r,c.g,c.b);}
  n.dispose();g.dispose();
 }
 const out=new T.BufferGeometry();out.setAttribute('position',new T.Float32BufferAttribute(positions,3));out.setAttribute('normal',new T.Float32BufferAttribute(normals,3));out.setAttribute('color',new T.Float32BufferAttribute(colors,3));return out;
}
export function createTrailLandmarks(T,root,ground){
 const group=new T.Group();group.name='connected-resort-signs';root.add(group);
 for(const[text,x,z]of[['云杉缓坡',0,55],['← 松林缓线   雪脊线 →',0,1930],['林间双线',0,2238],['雪脊谷地',0,4840],['谷底缓冲区',0,8228]]){
  const c=document.createElement('canvas');c.width=768;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#254e58';ctx.fillRect(0,0,768,96);ctx.fillStyle='#e8f3e8';ctx.font='40px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,49);const texture=new T.CanvasTexture(c),material=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide});const sign=new T.Mesh(new T.PlaneGeometry(18,2.25),material);sign.position.set(x,ground(x,z)+7,z);sign.rotation.y=Math.PI;sign.userData.nonCollidableReason='Flexible banner above rider height';group.add(sign);
 }
 return group;
}
