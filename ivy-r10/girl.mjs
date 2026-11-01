import * as THREE from './vendor/three.module.js';
// Original articulated miniature. Her back faces the fixed rear camera (+Z).
export function createGirl(){
 const girl=new THREE.Group(),rig=new THREE.Group();girl.add(rig);
 const mat=(color,roughness=.86)=>new THREE.MeshStandardMaterial({color,roughness});
 const red=mat('#b5352f'),redLight=mat('#d64a37'),redDark=mat('#872c2b'),skin=mat('#efd5a3'),hair=mat('#844226'),hairLight=mat('#a4552a'),boots=mat('#645138'),ribbon=mat('#d9654a');
 const sphere=(parent,x,y,z,sx,sy,sz,m)=>{const o=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o;};
 const limb=(parent,a,b,r,m)=>{const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av);const o=new THREE.Mesh(new THREE.CylinderGeometry(r*.83,r,d.length(),10),m);o.position.copy(av.add(bv).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());o.castShadow=true;parent.add(o);sphere(parent,...b,r*.87,r*.87,r*.87,m);return o;};
 const pelvis=new THREE.Group();pelvis.position.y=18;rig.add(pelvis);
 // A soft narrow waist, shoulder seam and curved sleeves; no facial mask on the rear.
 sphere(pelvis,0,8,0,5.1,8,3.7,red);sphere(pelvis,0,13,-.2,6.1,3.2,3.8,redLight);
 const head=new THREE.Group();head.position.set(0,20,-.2);pelvis.add(head);
 sphere(head,0,1,-.9,5.0,6.0,4.4,skin);
 sphere(head,0,2,1,5.6,6.1,4.1,hair);
 sphere(head,-3.2,.1,2.5,2.4,4.8,2.4,hairLight);
 sphere(head,3.2,.8,2.8,2.3,4.6,2.3,hair);
 sphere(head,0,-4.4,.1,2.7,2.2,2,skin);
 const pony=new THREE.Group();pony.position.set(-2.8,3,3.8);head.add(pony);
 const locks=[[-2,-1,1,3,3.7,2],[-4.8,-3.4,1.1,3.2,4.6,2],[-7.1,-6.9,1,2.8,4.8,1.8],[-9.3,-9.5,.8,1.8,3,1.2]];
 locks.forEach((a,i)=>{const o=sphere(pony,...a,i%2?hair:hairLight);o.rotation.z=-.45;});
 sphere(pony,-.3,.1,0,1.1,2.6,1.3,ribbon);
 const bow1=sphere(pony,-1.5,1,1,2.3,1.2,.8,ribbon);bow1.rotation.z=.6;
 const bow2=sphere(pony,1,1,1,2.2,1.2,.8,redLight);bow2.rotation.z=-.6;
 // Thin double-sided dress surface, with irregular radial folds rather than a solid cone.
 const N=40,R=8,positions=[],indices=[];
 for(let j=0;j<=R;j++){const t=j/R;for(let i=0;i<=N;i++){const a=i/N*Math.PI*2,r=4.3+t*7.9+Math.sin(a*8+.4)*t*.9;positions.push(Math.cos(a)*r,6-t*12+Math.sin(a*3+.3)*t*1.25,Math.sin(a)*r*.62);}}
 for(let j=0;j<R;j++)for(let i=0;i<N;i++){const k=j*(N+1)+i;indices.push(k,k+N+1,k+1,k+1,k+N+1,k+N+2);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
 const skirtMat=redLight.clone();skirtMat.side=THREE.DoubleSide;const skirt=new THREE.Mesh(geo,skirtMat);skirt.castShadow=true;pelvis.add(skirt);
 const waist=new THREE.Mesh(new THREE.TorusGeometry(4.35,.43,6,30),redDark);waist.rotation.x=Math.PI/2;waist.scale.z=.72;waist.position.y=6;pelvis.add(waist);
 const arms=[];for(const side of [-1,1]){const a=new THREE.Group();a.position.set(side*5.2,12.5,0);pelvis.add(a);limb(a,[0,0,0],[side*2,-5,0],2.05,red);limb(a,[side*2,-5,0],[side*2.7,-11,-.5],1.25,skin);sphere(a,side*2.7,-11.6,-.5,1.6,1.8,1.2,skin);arms.push(a);}
 const legs=[];for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*3,1,0);pelvis.add(leg);limb(leg,[0,0,0],[side*.4,-8,0],1.65,skin);limb(leg,[side*.4,-8,0],[side*.7,-15,-.3],1.25,skin);sphere(leg,side*.7,-16.5,0,2.1,3.0,2.15,boots);sphere(leg,side*.7,-17.1,-1.4,2.15,1.7,3.1,boots);legs.push(leg);}
 const initial=positions.slice();
 girl.userData.animate=(game,time)=>{
  const charge=game.charge||0,fly=game.status==='flying',climb=game.status==='climbing',slip=game.status==='sliding',wave=Math.sin(time*3);
  pelvis.position.y=18-charge*3+(climb?2:0);
  pelvis.rotation.x=charge*.16+(fly?-.1:0);pelvis.rotation.z=slip?Math.sin(time*4)*.1:fly?-(game.body?.vx||0)*.0007:0;
  arms[0].rotation.z=climb?-2.5:fly?-2.1:-.12-charge*.18;
  arms[1].rotation.z=climb?2.55:fly?2.25:.12+charge*.18;
  arms[0].rotation.x=arms[1].rotation.x=climb?-.45:fly?-.2:0;
  legs[0].rotation.x=climb?-1.05:fly?-.45:charge*.28;
  legs[1].rotation.x=climb?.35:fly?.55:charge*.28;
  legs[0].rotation.z=fly?-.15:0;legs[1].rotation.z=fly?.2:0;
  head.rotation.z=wave*.035;pony.rotation.z=wave*.12+(fly?-.35:0);pony.rotation.x=fly?-.35:wave*.06;
  const p=geo.attributes.position;for(let j=0;j<=R;j++)for(let i=0;i<=N;i++){const k=j*(N+1)+i,t=j/R,a=i/N*Math.PI*2;p.setY(k,initial[k*3+1]+Math.sin(a*3+time*3)*t*.65+(fly?Math.cos(a)*t*1.5:0));}p.needsUpdate=true;geo.computeVertexNormals();
 };
 return girl;
}
