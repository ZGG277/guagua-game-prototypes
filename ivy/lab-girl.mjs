import * as THREE from './vendor/three.module.js';
/** Original hand-shaped miniature; rear camera is +Z. All pose targets are local.
 * compression uses simulation range 0..0.33. Optional feet normals rotate soles.
 * Feet target the sole (not ankle). Hands target the palm contact plane when provided. No primitive spheres
 * or cylinders: silhouette, tailoring, hair and shoes are profile-loft meshes.
 */
const V=(p)=>new THREE.Vector3(...p), Y=new THREE.Vector3(0,1,0);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function material(color,roughness=.78){return new THREE.MeshStandardMaterial({color,roughness,side:THREE.DoubleSide});}
function loft(rows,{segments=16,fold=0,phase=0}={}){
 const p=[],ix=[];
 rows.forEach((r,j)=>{for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;const f=1+fold*Math.sin(a*7+phase)*(j/(rows.length-1));p.push(r[0]+Math.cos(a)*r[3]*f,r[1]+(r[5]||0)*Math.sin(a*3+.7),r[2]+Math.sin(a)*r[4]*f);}});
 for(let j=0;j<rows.length-1;j++)for(let i=0;i<segments;i++){const k=j*(segments+1)+i;ix.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return g;
}
function attach(parent,g,m,name){const o=new THREE.Mesh(g,m);o.name=name;o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function shaped(parent,rows,m,name,options){return attach(parent,loft(rows,options),m,name);}
// A soft tapered section follows a curved path. This is also the mutable limb geometry.
function tubeGeometry(points,radii,segments=10){
 const p=[],ix=[];points.forEach((point,j)=>{const tangent=V(points[Math.min(j+1,points.length-1)]).sub(V(points[Math.max(j-1,0)])).normalize();let u=new THREE.Vector3(0,0,1).cross(tangent);if(u.lengthSq()<.01)u.set(1,0,0);u.normalize();const v=tangent.clone().cross(u).normalize();for(let i=0;i<=segments;i++){const a=i/segments*2*Math.PI,r=radii[j];const q=V(point).addScaledVector(u,Math.cos(a)*r).addScaledVector(v,Math.sin(a)*r);p.push(q.x,q.y,q.z);}});
 for(let j=0;j<points.length-1;j++)for(let i=0;i<segments;i++){const k=j*(segments+1)+i;ix.push(k,k+segments+1,k+1,k+1,k+segments+1,k+segments+2);}for(let i=1;i<segments-1;i++){ix.push(0,i+1,i);const end=(points.length-1)*(segments+1);ix.push(end,end+i,end+i+1);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return g;
}
function updateTube(mesh,points,radii){const fresh=tubeGeometry(points,radii,10);mesh.geometry.attributes.position.array.set(fresh.attributes.position.array);mesh.geometry.attributes.position.needsUpdate=true;mesh.geometry.computeVertexNormals();fresh.dispose();}
function joint(a,b,l1,l2,bend){const start=V(a),end=V(b),d=end.clone().sub(start),len=Math.max(d.length(),.00001),n=d.clone().divideScalar(len);const distance=Math.min(len,l1+l2-.000001);const along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along));let pole=V(bend).addScaledVector(n,-V(bend).dot(n));if(pole.lengthSq()<1e-6)pole.set(0,0,1);pole.normalize();return start.addScaledVector(n,along).addScaledVector(pole,height).toArray();}
export function createGirl(){
 const girl=new THREE.Group();girl.name='red-dress-miniature';
 const cloth=material('#ab252d'),clothLight=material('#ca3b35'),hemMat=material('#72292a'),skin=material('#edc598'),hair=material('#743a20'),hairLight=material('#92502b'),boot=material('#64452e'),soleMat=material('#382d25'),ribbon=material('#d95039');
 const body=new THREE.Group();girl.add(body);
 shaped(body,[[0,.441,0,.072,.052],[0,.445,-.005,.068,.048],[0,.48,-.008,.069,.05],[0,.53,-.01,.086,.056],[0,.59,-.011,.105,.05],[0,.615,-.012,.085,.041],[0,.63,-.01,.035,.027]],cloth,'tailored-bodice',{segments:20,fold:.025});
 const skirtRows=[[0,.452,0,.071,.051],[0,.425,.005,.085,.063],[0,.385,.014,.119,.083],[0,.33,.022,.158,.105],[0,.285,.03,.188,.128,.012],[0,.279,.03,.186,.127,.012]];
 const skirt=shaped(body,skirtRows,clothLight,'folded-skirt',{segments:28,fold:.075});const skirtBase=skirt.geometry.attributes.position.array.slice();
 const hem=shaped(body,[[0,.281,.03,.184,.125,.012],[0,.286,.03,.187,.128,.012]],hemMat,'stitched-hem',{segments:28,fold:.075});const hemBase=hem.geometry.attributes.position.array.slice();const clothRig=new THREE.Group();clothRig.position.y=.45;body.add(clothRig);clothRig.add(skirt,hem);skirt.position.y=hem.position.y=-.45;
 shaped(body,[[0,.443,0,.073,.054],[0,.453,0,.072,.052]],hemMat,'waist-seam',{segments:20});
 // A collar, nape and head profile with a cheek/jaw taper rather than a ball.
 shaped(body,[[0,.62,-.01,.026,.024],[0,.665,-.014,.027,.025]],skin,'neck');
 shaped(body,[[0,.646,-.019,.022,.027],[0,.67,-.023,.045,.043],[0,.71,-.02,.063,.052],[0,.765,-.016,.069,.058],[0,.807,-.009,.055,.047],[0,.826,-.005,.025,.026],[0,.831,-.004,.001,.001]],skin,'head');
 shaped(body,[[0,.672,.012,.044,.034],[-.003,.702,.017,.063,.047],[-.004,.75,.013,.074,.06],[-.002,.797,.005,.063,.056],[0,.831,.003,.035,.034],[0,.842,.003,.001,.001]],hair,'swept-hair-cap',{segments:22,fold:.045});
 // Combed side locks are individual tapered ribbons of mass, ending in points.
 for(const side of [-1,1])shaped(body,[[side*.046,.786,.037,.026,.023],[side*.06,.756,.044,.026,.024],[side*.058,.71,.051,.019,.019],[side*.039,.681,.05,.004,.006]],side===-1?hairLight:hair,'side-lock',{segments:10});
 const ponyGroup=new THREE.Group();body.add(ponyGroup);ponyGroup.position.set(-.035,.785,.067);
 const pony=shaped(ponyGroup,[[0,0,0,.023,.024],[-.045,-.013,.022,.041,.029],[-.079,-.047,.03,.045,.028],[-.098,-.092,.032,.038,.026],[-.137,-.126,.036,.026,.019],[-.177,-.128,.03,.002,.002]],hair,'flowing-ponytail',{segments:14,fold:.1});
 for(let k=0;k<3;k++)shaped(ponyGroup,[[ -.015-k*.013,-.005,.02,.007,.009],[-.069-k*.012,-.043,.053,.008,.008],[-.11-k*.011,-.093,.052,.006,.006],[-.158-k*.009,-.128,.038,.0008,.001]],hairLight,'pony-ridge',{segments:6});
 shaped(ponyGroup,[[-.009,-.016,0,.019,.027],[-.009,.009,0,.019,.026]],ribbon,'hair-tie',{segments:12});
 for(const side of [-1,1])shaped(ponyGroup,[[side*.006,.006,.017,.008,.009],[side*.027,.031,.02,.018,.009],[side*.037,.055,.018,.01,.008],[side*.031,.066,.016,.001,.001]],ribbon,'bow-loop',{segments:10});
 const waistBridge=shaped(girl,[[0,.445,0,.068,.048],[0,.452,0,.071,.051]],cloth,'waist-fold',{segments:20});const legs=[],arms=[],footMeshes=[];
 for(const side of [-1,1]){
  const leg=attach(girl,tubeGeometry([[side*.055,.39,0],[side*.065,.22,-.015],[side*.066,.08,0]],[.034,.026,.019]),skin,'leg');legs.push(leg);
  const foot=new THREE.Group();girl.add(foot);footMeshes.push(foot);
  shaped(foot,[[0,.006,-.023,.033,.067],[0,.017,-.024,.035,.069],[0,.045,-.021,.034,.064],[0,.064,-.007,.026,.039],[0,.094,.004,.025,.026],[0,.106,.004,.026,.027]],boot,'soft-ankle-boot',{segments:14});
  shaped(foot,[[0,.001,-.023,.034,.068],[0,.011,-.023,.035,.069]],soleMat,'boot-sole',{segments:14});
  shaped(foot,[[0,.098,.004,.027,.029],[0,.108,.004,.027,.029]],boot,'boot-cuff',{segments:14});
  const upper=attach(girl,tubeGeometry([[side*.09,.59,-.008],[side*.13,.52,0],[side*.14,.485,.005]],[.036,.034,.027]),cloth,'sleeve');
  const lower=attach(girl,tubeGeometry([[side*.14,.485,.005],[side*.155,.435,.0],[side*.16,.385,0]],[.02,.018,.014]),skin,'forearm');
  const hand=new THREE.Group();girl.add(hand);
  shaped(hand,[[0,-.024,0,.009,.009],[0,-.012,0,.017,.011],[0,.008,0,.018,.012],[0,.024,0,.013,.01]],skin,'palm',{segments:10});
  // Thumb profile keeps silhouette legible without oversized mitten hands.
  shaped(hand,[[side*.012,.014,-.002,.008,.007],[side*.024,.002,-.008,.006,.006],[side*.025,-.007,-.01,.001,.001]],skin,'thumb',{segments:8});arms.push({upper,lower,hand});
 }
 girl.userData.pose=({compression=0,phase='grounded',time=0,lean=0,feet,hands}={})=>{
  const c=hands?.length===2?Math.max(.96,clamp(compression/.33,0,1)):clamp(compression/.33,0,1),drop=c*.24,angle=-c*1.1;body.rotation.set(angle,0,-lean*.12);body.position.set(lean*.045,.4-drop-.4*Math.cos(angle),-.4*Math.sin(angle));clothRig.rotation.x=-angle*.9;body.updateMatrix();const bodyPoint=p=>V(p).applyMatrix4(body.matrix).toArray();clothRig.updateMatrix();const bp=waistBridge.geometry.attributes.position;for(let i=0;i<=20;i++){const a=i/20*Math.PI*2,top=bodyPoint([Math.cos(a)*.068,.445,-.005+Math.sin(a)*.048]),bottom=V([Math.cos(a)*.071,.002,Math.sin(a)*.051]).applyMatrix4(clothRig.matrix).applyMatrix4(body.matrix);bp.setXYZ(i,...top);bp.setXYZ(21+i,bottom.x,bottom.y,bottom.z);}bp.needsUpdate=true;waistBridge.geometry.computeVertexNormals();
  const footTargets=feet?.length===2?feet:[[-.065,0,0],[.065,0,0]];const norm=p=>Array.isArray(p)?p:[p.x,p.y,p.z];
  const recordedFeet=[],recordedHands=[];
  for(let i=0;i<2;i++){
   const side=i===0?-1:1,t=norm(footTargets[i]),rawNormal=footTargets[i]?.normal,nv=rawNormal?V(Array.isArray(rawNormal)?rawNormal:[rawNormal.x,rawNormal.y,rawNormal.z]).normalize():Y,hip=V([side*(.052-.017*c),-.06+.005*c,.045*c]).applyMatrix4(clothRig.matrix).applyMatrix4(body.matrix).toArray(),ankle=[t[0]+nv.x*.075,t[1]+nv.y*.075,t[2]+nv.z*.075+.004],knee=joint(hip,ankle,.18,.175,[0,.1,-1]);
   updateTube(legs[i],[hip,knee,ankle],[.034,.026,.018]);footMeshes[i].position.set(...t);const fn=footTargets[i]?.normal;if(fn){const nv=V(Array.isArray(fn)?fn:[fn.x,fn.y,fn.z]).normalize();footMeshes[i].quaternion.setFromUnitVectors(Y,nv);}else footMeshes[i].quaternion.identity();recordedFeet.push(t.slice());
   const shoulder=bodyPoint([side*.098,.588,-.008]);let target=hands?.[i]?norm(hands[i]):[side*(.16+c*.07),.37-drop+(phase==='falling'?.14:0),-.025-c*.1];
   const contactTarget=target.slice();if(hands?.length===2)target=[target[0],target[1]+.013,target[2]];const elbow=joint(shoulder,target,.16,.16,[side*.6,0,1]);const cuff=elbow.map((v,k)=>v*.8+target[k]*.2);
   updateTube(arms[i].upper,[shoulder,elbow,cuff],[.035,.031,.025]);updateTube(arms[i].lower,[cuff,cuff.map((v,k)=>(v+target[k])*.5),target],[.021,.017,.012]);arms[i].hand.position.set(...target);arms[i].hand.rotation.set(hands?.length===2?Math.PI/2:0,0,hands?.length===2?0:side*(.12+c*.2));recordedHands.push(contactTarget);
  }
  ponyGroup.rotation.z=Math.sin(time*5)*.06+c*.38+lean*.2;ponyGroup.rotation.x=Math.sin(time*4+.3)*.07-c*.18;
  for(const [mesh,base] of [[skirt,skirtBase],[hem,hemBase]]){const pos=mesh.geometry.attributes.position;for(let i=0;i<pos.count;i++){const x=base[i*3],y=base[i*3+1],z=base[i*3+2],f=clamp((.45-y)/.17,0,1);pos.setXYZ(i,x+f*Math.sin(time*6+z*9)*.004,z*0+y+f*c*.026,z+Math.min(0,z)*c*(4.3*Math.sin(f*Math.PI)+f)+f*Math.sin(time*5+x*8)*.005);}pos.needsUpdate=true;mesh.geometry.computeVertexNormals();}
  girl.userData.contacts={feet:recordedFeet,hands:recordedHands};
 };
 girl.userData.pose();girl.userData.height=.91;return girl;
}
