// Quaternius Ultimate Modular Men / Casual_Hoodie, CC0. Imported geometry only.
// Visual retargeting is deliberately separate from the unchanged collision/physics rig.
import * as T from './vendor/three.module.min.js';
import {CHARACTERS,SKIN_TONES} from './rider-wardrobe.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createQuaterniusRider(source){
 const model=new T.Group();model.name='quaternius-snowboard-rider';model.add(source);source.scale.setScalar(1.22);
 source.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.pose();if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});model.updateMatrixWorld(true);
 const native={},rest={},scale=1.22,V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
 source.traverse(o=>{if(o.isBone){native[o.name]=o;rest[o.name]={p:o.getWorldPosition(V()),q:o.getWorldQuaternion(new T.Quaternion())};}});
 const required=['Root','Body','Hips','Abdomen','Torso','Chest','Neck','Head'];
 for(const s of ['L','R'])required.push('Shoulder'+s,'UpperArm'+s,'LowerArm'+s,'Wrist'+s,'UpperLeg'+s,'LowerLeg'+s,'Foot'+s);
 for(const n of required)if(!native[n])throw Error('Quaternius missing bone '+n);
 // Calibrate the lowest imported outsole vertex onto the existing binding plane (y=.10).
 let soleOffset=Infinity;source.traverse(o=>{if(o.isSkinnedMesh&&o.parent.name==='Casual_Feet'){o.skeleton.update();for(let i=0;i<o.geometry.attributes.position.count;i++){const p=o.getVertexPosition(i,V()).applyMatrix4(o.matrixWorld),side=p.x>0?'L':'R';soleOffset=Math.min(soleOffset,p.y-rest['Foot'+side].p.y);}}});
 if(!Number.isFinite(soleOffset))throw Error('Quaternius footwear missing');const footHeight=.10-soleOffset;
 const bones={chest:native.Chest};for(const side of ['L','R']){const anchor=new T.Group();anchor.name='anatomical-ankle-'+side;anchor.position.copy(V(0,.32-footHeight,0).applyQuaternion(rest['Foot'+side].q.clone().invert()).divideScalar(scale));native['Foot'+side].add(anchor);bones['foot.'+side]=anchor;}
 const legs={};for(const s of ['L','R'])legs[s]={upper:rest['UpperLeg'+s].p.distanceTo(rest['LowerLeg'+s].p),lower:rest['LowerLeg'+s].p.distanceTo(rest['Foot'+s].p)};
 let filtered={edge:0,compression:0,speed:0,steer:0,fall:0},lastLanding=0,landing=0;
 function solve(input={}){
  const stance=input.stance===-1?-1:1,dt=clamp(input.dt??1/60,0,.05),blend=input.snap?1:1-Math.exp(-dt*10),speed=clamp(input.speed||0,0,35);
  if((input.landingCount||0)<lastLanding)landing=0;if((input.landingCount||0)>lastLanding)landing=1;lastLanding=input.landingCount||0;landing*=Math.exp(-dt*8);
  const wish={edge:clamp(input.edge||0,-1,1)*stance,compression:clamp((input.compression||0)+(input.airborne?.45:0)+landing*.65,0,1),speed,steer:clamp(input.steer||0,-1,1),fall:input.caught?1:0};
  for(const k in filtered)filtered[k]+=(wish[k]-filtered[k])*blend;
  const f=filtered,turn=new T.Quaternion().setFromAxisAngle(V(0,1,0),stance===-1?Math.PI:0),points={},targets={},matrices={};
  const ankles={},feet={};for(const [side,sign]of [['L',1],['R',-1]]){const edge=clamp((sign*stance>0?input.frontEdge:input.rearEdge)??input.edge??0,-1,1)*stance;ankles[side]=V(sign*.58,.32,0).applyAxisAngle(V(1,0,0),edge*.49);feet[side]=V(sign*.58,footHeight,0).applyAxisAngle(V(1,0,0),edge*.49);}
  let hipY=1.08-.20*f.compression-.035*Math.min(1,f.speed/15)-.50*f.fall,com=clamp(input.com||0,-.34,.34)*stance,lean=.25*f.edge;
  // Two-bone IK uses the imported limb lengths, leaving a reachable bend at both knees.
  for(const [side,sign]of [['L',1],['R',-1]]){const foot=feet[side],l=legs[side],dX=foot.x-(com+sign*.147),dZ=foot.z-(.01+lean);hipY=Math.min(hipY,foot.y+Math.sqrt(Math.max(.02,(l.upper+l.lower-.045)**2-dX*dX-dZ*dZ)));}
  const hip=V(com,hipY,.01+lean),body=hip.clone().add(V(0,-.12,-.022));points.Body=body;points.Hips=body.clone().add(V(0,.035,.04));
  const bend=(f.fall*.55+f.compression*.12),spineRise=rest.Chest.p.y-rest.Body.p.y;
  for(const n of ['Abdomen','Torso','Chest','Neck','Head']){const offset=rest[n].p.clone().sub(rest.Body.p);offset.applyAxisAngle(V(0,0,1),-.95*f.fall);offset.z+=bend*(offset.y/spineRise)+.11*f.edge*(offset.y/spineRise);offset.x+=.045*f.steer*(offset.y/spineRise);points[n]=body.clone().add(offset);}
  points.Root=V();
  for(const [side,sign]of [['L',1],['R',-1]]){
   const h=hip.clone().add(V(sign*.147,0,0)),a=feet[side],l=legs[side],axis=a.clone().sub(h),d=axis.length(),along=(l.upper*l.upper-l.lower*l.lower+d*d)/(2*d),height=Math.sqrt(Math.max(0,l.upper*l.upper-along*along)),pole=V(sign*.12,0,1);axis.normalize();pole.addScaledVector(axis,-pole.dot(axis)).normalize();const knee=h.clone().addScaledVector(axis,along).addScaledVector(pole,height);
   points['UpperLeg'+side]=h;points['LowerLeg'+side]=knee;points['Foot'+side]=a;
   const shoulder=points.Chest.clone().add(rest['Shoulder'+side].p.clone().sub(rest.Chest.p)),upper=points.Chest.clone().add(rest['UpperArm'+side].p.clone().sub(rest.Chest.p)),armLen=rest['UpperArm'+side].p.distanceTo(rest['LowerArm'+side].p),foreLen=rest['LowerArm'+side].p.distanceTo(rest['Wrist'+side].p),lead=sign*stance>0?1:0;
   const elbow=upper.clone().add(V(sign*(.18+.15*Math.abs(f.edge)+.1*f.fall),-.22+.18*f.fall,.07+.08*f.compression+.11*lead*f.steer).normalize().multiplyScalar(armLen)),wrist=elbow.clone().add(V(sign*(.20+.15*Math.abs(f.edge)),-.13+.27*f.fall,.14+.08*f.compression).normalize().multiplyScalar(foreLen));
   points['Shoulder'+side]=shoulder;points['UpperArm'+side]=upper;points['LowerArm'+side]=elbow;points['Wrist'+side]=wrist;
   const ankle=ankles[side].clone().applyQuaternion(turn);targets['foot.'+side]=[ankle,ankle.clone().add(V(sign*.035,-.10,.23).applyQuaternion(turn))];
  }
  for(const p of Object.values(points))p.applyQuaternion(turn);
  const next={Root:'Body',Body:'Chest',Hips:'Abdomen',Abdomen:'Torso',Torso:'Chest',Chest:'Neck',Neck:'Head'};
  for(const side of ['L','R'])Object.assign(next,{['Shoulder'+side]:'UpperArm'+side,['UpperArm'+side]:'LowerArm'+side,['LowerArm'+side]:'Wrist'+side,['UpperLeg'+side]:'LowerLeg'+side,['LowerLeg'+side]:'Foot'+side});
  for(const n of required){let q=turn.clone().multiply(rest[n].q);if(next[n]&&n!=='Root'){const from=rest[next[n]].p.clone().sub(rest[n].p).normalize().applyQuaternion(turn),to=points[next[n]].clone().sub(points[n]).normalize();q.premultiply(new T.Quaternion().setFromUnitVectors(from,to));}if(n==='Head')q.premultiply(new T.Quaternion().setFromAxisAngle(V(0,1,0),.65*stance*clamp(input.lookAlong??1,-1,1)));if(n.startsWith('Foot')){const side=n.slice(-1),sign=side==='L'?1:-1,e=((sign*stance>0?input.frontEdge:input.rearEdge)??input.edge??0)*stance;q=turn.clone().multiply(new T.Quaternion().setFromAxisAngle(V(1,0,0),e*.49)).multiply(rest[n].q);}
   matrices[n]=new T.Matrix4().compose(points[n],q,V(scale,scale,scale));
  }
  return{targets,matrices,stance,phase:input.caught?'fall':input.airborne?'air':landing>.1?'landing':'ride'};
 }
 function update(input={}){const pose=solve(input);model.updateWorldMatrix(true,true);for(const n of required){const b=native[n],world=model.matrixWorld.clone().multiply(pose.matrices[n]),local=b.parent.matrixWorld.clone().invert().multiply(world);local.decompose(b.position,b.quaternion,b.scale);b.updateWorldMatrix(false,true);}model.updateWorldMatrix(true,true);return pose;}
 const mats=[];source.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.userData.part=o.parent.name;mats.push(o.material);}});
 let skinTone="warm";const wardrobe={get skinTone(){return skinTone;},apply(id){if(!Object.hasOwn(CHARACTERS,id))return false;const c=CHARACTERS[id];for(const m of mats){if(m.name==='Purple')m.color.set(m.userData.part==='Casual_Feet'?'#34434c':c.shell);if(m.name==='LightBlue'||(m.name==='Skin'&&m.userData.part==='Casual_Legs'))m.color.set(c.pants);if(m.name==='White')m.color.set(c.trim);m.roughness=.83;}return true;},setSkinTone(id){if(!Object.hasOwn(SKIN_TONES,id))return false;skinTone=id;for(const m of mats)if(m.name==='Skin'&&m.userData.part!=='Casual_Legs')m.color.set(SKIN_TONES[id].color);return true;}};
 return{model,driver:{bones,update,solve,native},wardrobe};
}
