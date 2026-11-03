// Soft, loose winter clothing, skinned to the accepted anatomical rig.
// Garments have their own neutral-pose bind; no bone, contact or physics changes.
import * as T from './vendor/three.module.min.js';
export const CHARACTERS=Object.freeze({
 girl:{label:'女生 · 雪珊',shell:'#f37483',pants:'#ede9df',helmet:'#234e62',trim:'#fff4da',lens:'#ffcaa6',accent:'#f3b6bf'},
 boy:{label:'男生 · 松野',shell:'#4e8e81',pants:'#263c49',helmet:'#ece5d6',trim:'#d2e9cb',lens:'#efaf46',accent:'#eabb69'},
 child:{label:'孩子 · 小栗',shell:'#ffc54c',pants:'#72547c',helmet:'#e88867',trim:'#fff3d4',lens:'#aaecdf',accent:'#a8d9b5'}
});
// Skin tone is independent of clothing, hairstyle and age presentation.
export const SKIN_TONES=Object.freeze({
 light:{label:'浅肤色',color:'#efc3a6',lip:'#a36c60'},
 warm:{label:'暖肤色',color:'#d4a079',lip:'#8b5c48'},
 deep:{label:'深肤色',color:'#86553d',lip:'#623d32'}
});
export function storedSkinTone(){try{const v=globalThis.localStorage?.getItem('altay.skin-tone.v1');return Object.hasOwn(SKIN_TONES,v)?v:'warm';}catch{return'warm';}}
export function saveSkinTone(id){if(!Object.hasOwn(SKIN_TONES,id))return false;try{globalThis.localStorage?.setItem('altay.skin-tone.v1',id);return true;}catch{return false;}}
export function storedCharacter(){try{const v=globalThis.localStorage?.getItem('altay.character.v1');return Object.hasOwn(CHARACTERS,v)?v:'girl';}catch{return'girl';}}
export function saveCharacter(id){if(!Object.hasOwn(CHARACTERS,id))return false;try{globalThis.localStorage?.setItem('altay.character.v1',id);return true;}catch{return false;}}
export function createWardrobe(model,driver){
 const materials=new Map();let original;
 model.traverse(o=>{if(o.isMesh){o.material=o.material.clone();materials.set(o.material.name,o.material);if(o.isSkinnedMesh)original??=o;}});
 // R18 grouped soles/boot trim with pants/shell and the lower face with graphite.
 // Separate by anatomical skin weights and the authored lower-face ellipsoid,
 // retaining the original gloves, neck gaiter, helmet, goggle frame and vents.
 const faceMaterial=new T.MeshStandardMaterial({color:SKIN_TONES.warm.color,roughness:.82,metalness:0});faceMaterial.name='Natural lower-face skin';
 const faceMeshes=[];let importedHead;
 model.traverse(o=>{if(!o.isSkinnedMesh)return;const name=o.material.name,g=o.geometry,p=g.attributes.position,weights=g.attributes.skinWeight,indices=g.attributes.skinIndex,src=g.index?.array??Array.from({length:p.count},(_,i)=>i),keep=[],face=[];
  const weighted=(j,prefix)=>{for(let k=0;k<4;k++)if(weights.array[j*4+k]>.99&&o.skeleton.bones[indices.array[j*4+k]].name.startsWith(prefix))return true;return false;};
  const lowerFace=j=>weighted(j,'head')&&Math.abs((p.getX(j)/.18)**2+((p.getY(j)-1.955)/.12)**2+((p.getZ(j)-.258)/.085)**2-1)<.025;
  for(let i=0;i<src.length;i+=3){const tri=[src[i],src[i+1],src[i+2]];
   if(tri.every(j=>weighted(j,'foot')))continue;
   if(name.includes('Graphite')&&tri.every(lowerFace)){face.push(...tri);continue;}
   if(name.includes('shell')||name.includes('pants'))continue;
   if(name.includes('stitch')&&!tri.every(j=>weighted(j,'head')))continue;
   keep.push(...tri);
  }
  const geometry=g.clone();geometry.setIndex(keep);o.geometry=geometry;o.visible=keep.length>0;
  if(face.length){const skin=o.clone();skin.name='wardrobe-visible-face';skin.geometry=g.clone();skin.geometry.setIndex(face);skin.material=faceMaterial;skin.visible=true;faceMeshes.push(skin);importedHead=o;}
 });
 if(!importedHead)throw Error('Missing authored lower-face geometry');
 for(const skin of faceMeshes){original.parent.add(skin);skin.castShadow=true;skin.receiveShadow=true;}
 const neutral=driver.update({stance:1,edge:0,frontEdge:0,rearEdge:0,com:0,compression:0});model.updateMatrixWorld(true);
 const outfits={},garments=[],bootMeshes=[];
 const mat=color=>new T.MeshStandardMaterial({color,roughness:.88,metalness:0});
 const shell=mat('#f37483'),pants=mat('#ede9df'),seam=mat('#fff4da'),cuff=mat('#df7180'),gaiter=mat('#d6d2c9'),boot=mat('#34434c'),sole=mat('#202c34'),bootTrim=mat('#71848b'),lip=mat(SKIN_TONES.warm.lip);
 boot.name='Articulated snowboot upper';sole.name='Snowboot rubber outsole';bootTrim.name='Snowboot instep ridges';
 shell.vertexColors=true;pants.vertexColors=true;cuff.vertexColors=true;gaiter.vertexColors=true;
 shell.name='Loose woven snow jacket';pants.name='Loose insulated snow pants';
 const skeleton=new T.Skeleton(original.skeleton.bones,original.skeleton.bones.map(b=>b.matrixWorld.clone().invert()));
 const index={};skeleton.bones.forEach((b,i)=>index[b.name]=i);
 const bone=n=>index[driver.bones[n].name],V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
 const blend=(a,b,t)=>[[bone(a),1-t],[bone(b),t]];
 const bodyWeights=y=>y<1.42?blend('pelvis','spine',smooth(1.13,1.45,y)):blend('spine','chest',smooth(1.43,1.77,y));
 function builder(){return{p:[],si:[],sw:[],c:[],ix:[]};}
 function vertex(g,p,weights,tint=1){g.p.push(...p.toArray());const pairs=weights.filter(w=>w[1]>0);for(let i=0;i<4;i++){g.si.push(pairs[i]?.[0]??0);g.sw.push(pairs[i]?.[1]??0);}g.c.push(tint,tint,tint);return g.p.length/3-1;}
 // A smoothly swept cloth surface, with shared vertices and smooth normals.
 function sweep(g,rows,segments,sample){const base=g.p.length/3;for(let i=0;i<=rows;i++){const t=i/rows,q=sample(t),before=sample(Math.max(0,t-.001)).center,after=sample(Math.min(1,t+.001)).center,tangent=after.sub(before).normalize(),u=q.frame?.[0]??V(0,0,1).cross(tangent).normalize(),v=q.frame?.[1]??tangent.clone().cross(u).normalize();for(let j=0;j<=segments;j++){const a=j/segments*Math.PI*2,fold=q.fold?.(a)??0,p=q.center.clone().addScaledVector(u,Math.cos(a)*(q.rx+fold)).addScaledVector(v,Math.sin(a)*(q.rz+fold));vertex(g,p,q.weights,q.tint??1);if(i<rows&&j<segments){const n=base+i*(segments+1)+j;g.ix.push(n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1);}}}}
 function mesh(g,material,name){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(g.p,3));geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(g.si,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(g.sw,4));geo.setAttribute('color',new T.Float32BufferAttribute(g.c,3));geo.setIndex(g.ix);geo.computeVertexNormals();const o=new T.SkinnedMesh(geo,material);o.name=name;o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;model.add(o);o.bind(skeleton,model.matrixWorld);garments.push(o);return o;}
 const lerpProfile=(keys,t)=>{for(let i=1;i<keys.length;i++){if(t<=keys[i][0]){const a=keys[i-1],b=keys[i],s=smooth(a[0],b[0],t);return a[1]+(b[1]-a[1])*s;}}return keys.at(-1)[1];};
 // Bloused hem, generous belly/chest, dropped rounded shoulders, high collar.
 const jacket=builder(),trousers=builder(),bands=builder(),gaiters=builder(),details=builder(),bootUppers=builder(),bootSoles=builder(),bootDetails=builder();
 const bootTopology=[];
 const torsoProfile=[[0,.325],[.07,.354],[.2,.378],[.48,.375],[.68,.36],[.81,.345],[.9,.275],[1,.145]];
 const depthProfile=[[0,.25],[.09,.265],[.3,.279],[.56,.271],[.76,.244],[.9,.199],[1,.132]];
 function torso(t){const y=1.075+t*.805,rx=lerpProfile(torsoProfile,t),rz=lerpProfile(depthProfile,t);return{center:V(0,y,.012+.014*t),rx,rz,weights:bodyWeights(y),fold:a=>{const waist=Math.exp(-(((t-.14)/.19)**2)),shoulder=Math.exp(-(((t-.81)/.11)**2));return .009*Math.sin(5*a+1.6*t)+.011*waist*Math.sin(8*a+5*t)+.006*shoulder*Math.sin(6*a-4*t);},tint:.96+.035*Math.sin(t*4.6)};}
 sweep(jacket,30,32,torso);
 // The actual fabric sleeves have broad elbows and a gathered cuff. Skinning
 // blends across joints instead of gluing rigid capsules to individual bones.
 for(const [side,sign]of[['L',1],['R',-1]]){
  const shoulder=neutral.joints['shoulder.'+side],elbow=neutral.joints['elbow.'+side],wrist=neutral.joints['wrist.'+side];
  const sleevePath=new T.CatmullRomCurve3([shoulder.clone().add(V(-sign*.105,.002,0)),shoulder.clone().add(V(sign*.018,-.035,0)),shoulder.clone().lerp(elbow,.55),elbow.clone(),elbow.clone().lerp(wrist,.55),wrist.clone().lerp(elbow,.08)]);
  const sleeve=t=>({center:sleevePath.getPoint(t),rx:lerpProfile([[0,.083],[.18,.154],[.5,.147],[.71,.132],[.88,.116],[1,.092]],t),rz:lerpProfile([[0,.09],[.2,.158],[.52,.148],[.75,.128],[1,.094]],t),weights:blend('upper_arm.'+side,'forearm.'+side,smooth(.49,.72,t)),fold:a=>{const bunch=Math.exp(-(((t-.6)/.16)**2))+.65*Math.exp(-(((t-.87)/.08)**2));return .005*Math.sin(5*a+2*t+sign)+.008*bunch*Math.sin(3*a+t*27+sign);},tint:.96+.025*Math.cos(t*3)});
  sweep(jacket,26,22,sleeve);
  sweep(bands,3,22,t=>{const q=sleeve(.95+t*.055);q.rx+=.002;q.rz+=.002;q.fold=undefined;return q});
  const hip=neutral.joints['hip.'+side],knee=neutral.joints['knee.'+side],ankle=neutral.joints['ankle.'+side];
  const legPath=new T.CatmullRomCurve3([hip.clone().add(V(0,.09,-.005)),hip.clone().lerp(knee,.45),knee.clone(),knee.clone().lerp(ankle,.6),ankle.clone().lerp(knee,.045)]);
  const leg=t=>({center:legPath.getPoint(t),rx:lerpProfile([[0,.203],[.17,.214],[.35,.205],[.54,.179],[.69,.165],[.84,.172],[.95,.158],[1,.145]],t),rz:lerpProfile([[0,.21],[.22,.213],[.44,.197],[.58,.183],[.79,.171],[.93,.168],[1,.15]],t),weights:t<.18?blend('pelvis','thigh.'+side,smooth(0,.18,t)):blend('thigh.'+side,'shin.'+side,smooth(.42,.65,t)),fold:a=>{const kneeBunch=Math.exp(-(((t-.56)/.15)**2)),hemBunch=Math.exp(-(((t-.89)/.1)**2));return .006*Math.sin(5*a+sign+t*4)+.009*kneeBunch*Math.sin(3*a+24*t+sign)+.012*hemBunch*Math.sin(4*a-37*t+sign);},tint:.96+.028*Math.cos(t*5)});
  sweep(trousers,34,26,leg);
  // Fabric cuff overlaps a real articulated boot shaft, with shared shin motion.
  sweep(gaiters,3,26,t=>{const q=leg(.971+t*.029);q.rx+=.001;q.rz+=.001;q.fold=undefined;q.tint=.85;return q});
  // One indexed surface runs from inside the trouser hem through the ankle to
  // the instep/heel. It blends shin→foot over the ankle; its lower ring and the
  // outsole have exactly the foot bone's rigid binding transform in every pose.
  const shinDirection=knee.clone().sub(ankle).normalize(),shaftTop=ankle.clone().addScaledVector(shinDirection,.20),ankleTop=ankle.clone().addScaledVector(shinDirection,.045);
  const bootPath=new T.CatmullRomCurve3([shaftTop,ankleTop,ankle.clone().add(V(0,-.115,.038)),ankle.clone().add(V(0,-.185,.055))]);
  const bootSample=t=>({center:bootPath.getPoint(t),frame:[V(1,0,0),V(0,0,1)],rx:lerpProfile([[0,.124],[.34,.123],[.64,.137],[1,.142]],t),rz:lerpProfile([[0,.127],[.34,.135],[.65,.184],[1,.203]],t),weights:blend('shin.'+side,'foot.'+side,smooth(.22,.68,t)),tint:.95+.05*Math.sin(t*Math.PI)});
  const upperStart=bootUppers.p.length/3;sweep(bootUppers,18,24,bootSample);
  // A low rounded, closed outsole meeting the upper's last ring. End caps and
  // the heel/forefoot contour are actual geometry, not a camera-facing patch.
  const soleStart=bootSoles.p.length/3;
  sweep(bootSoles,5,24,t=>({center:ankle.clone().add(V(0,-.185-t*.035,.055)),rx:.142+(Math.sin(t*Math.PI)*.003),rz:.203+(Math.sin(t*Math.PI)*.003),weights:[[bone('foot.'+side),1]]}));
  const cap=vertex(bootSoles,ankle.clone().add(V(0,-.220,.055)),[[bone('foot.'+side),1]]);
  for(let j=0;j<24;j++)bootSoles.ix.push(cap,soleStart+5*25+j,soleStart+5*25+j+1);
  // Tongue/instep ridges follow the same deforming surface. Their silhouettes
  // help the boot read below the broad pant cuff at gameplay camera distance.
  for(const t0 of[.54,.66,.77])sweep(bootDetails,2,24,t=>{const q=bootSample(t0+t*.019);q.rx+=.004;q.rz+=.004;return q;});
  bootTopology.push({side,upperStart,upperRows:18,segments:24,soleStart,shaftTop:shaftTop.toArray(),ankle:ankle.toArray()});

 }
 // Soft seat/crotch bridge lives underneath the long jacket rather than leaving
 // two disconnected trouser tubes visible in wide or compressed stances.
 sweep(trousers,10,28,t=>({center:V(0,1.015+t*.285,-.015),rx:lerpProfile([[0,.235],[.4,.36],[1,.37]],t),rz:lerpProfile([[0,.135],[.5,.20],[1,.213]],t),weights:[[bone('pelvis'),1]],fold:a=>.006*Math.sin(6*a+t*4),tint:.96}));
 // Raised soft collar, with a real open neck, and a subtly cinched jacket hem.
 sweep(jacket,8,28,t=>({center:V(0,1.83+t*.145,.025),rx:.149+.026*Math.sin(t*Math.PI*.85),rz:.137+.022*Math.sin(t*Math.PI*.85),weights:[[bone('chest'),1]],fold:a=>.004*Math.sin(a*5+t*2),tint:.94}));
 sweep(bands,3,32,t=>{const q=torso(t*.041);q.rx+=.001;q.rz+=.001;q.fold=undefined;q.tint=.94;return q});
 function line(points,width){const path=new T.CatmullRomCurve3(points.map(p=>V(...p)));sweep(details,Math.max(8,points.length*5),6,t=>{const p=path.getPoint(t);return{center:p,rx:width,rz:width,weights:bodyWeights(p.y)}});}
 // Small construction details read as ski clothing without bulky armor panels.
 const front=y=>{const q=torso(clamp((y-1.075)/.805));return q.center.z+q.rz+.008;};
 line([1.15,1.32,1.53,1.72,1.85].map(y=>[0,y,front(y)]),.006);
 for(const sign of[-1,1])line([[sign*.20,1.27,front(1.27)-.044],[sign*.23,1.34,front(1.34)-.057],[sign*.24,1.42,front(1.42)-.064]],.006);
 mesh(jacket,shell,'wardrobe-soft-jacket');mesh(trousers,pants,'wardrobe-loose-snowpants');mesh(bands,cuff,'wardrobe-gathered-cuffs');mesh(gaiters,gaiter,'wardrobe-pant-gaiters');mesh(details,seam,'wardrobe-fabric-seams');
 bootMeshes.push(mesh(bootUppers,boot,'wardrobe-articulated-boots'),mesh(bootSoles,sole,'wardrobe-boot-outsoles'),mesh(bootDetails,bootTrim,'wardrobe-boot-instep-ridges'));
 // Tiny neutral features use the same original head bind as the exposed face.
 // No ethnicity-specific facial exaggeration: all presets share this anatomy.
 if(importedHead){
  const headIndex=importedHead.skeleton.bones.indexOf(driver.bones.head),restToNeutral=importedHead.bindMatrixInverse.clone().multiply(driver.bones.head.matrixWorld).multiply(importedHead.skeleton.boneInverses[headIndex]).multiply(importedHead.bindMatrix);
  const nose=builder(),mouth=builder(),noseGeo=new T.SphereGeometry(1,12,8),np=noseGeo.attributes.position;
  for(let i=0;i<np.count;i++){const p=V(np.getX(i)*.031,np.getY(i)*.047,np.getZ(i)*.031).add(V(0,2.009,.342)).applyMatrix4(restToNeutral);vertex(nose,p,[[bone('head'),1]]);}nose.ix.push(...noseGeo.index.array);
  const mouthPath=new T.CatmullRomCurve3([[-.050,1.940,.337],[0,1.936,.345],[.050,1.940,.337]].map(p=>V(...p).applyMatrix4(restToNeutral)));
  sweep(mouth,10,6,t=>({center:mouthPath.getPoint(t),rx:.0048,rz:.0048,weights:[[bone('head'),1]]}));
  faceMeshes.push(mesh(nose,faceMaterial,'wardrobe-face-nose'),mesh(mouth,lip,'wardrobe-face-mouth'));
 }
 let skinTone='warm';
 function setSkinTone(id){if(!Object.hasOwn(SKIN_TONES,id))return false;const tone=SKIN_TONES[id];skinTone=id;faceMaterial.color.set(tone.color);lip.color.set(tone.lip);return true;}
 setSkinTone(storedSkinTone());
 function add(id,boneName,geo,material,p,scale=[1,1,1],rotation=[0,0,0]){const o=new T.Mesh(geo,material);o.name='wardrobe-'+id;o.position.fromArray(p);o.scale.fromArray(scale);o.rotation.set(...rotation);o.updateMatrix();const matrix=driver.bones[boneName].matrixWorld.clone().invert().multiply(model.matrixWorld).multiply(o.matrix);matrix.decompose(o.position,o.quaternion,o.scale);o.castShadow=true;driver.bones[boneName].add(o);(outfits[id]??=[]).push(o);return o;}
 const sphere=new T.SphereGeometry(1,16,12);
 const coral=mat('#f37483'),cream=mat('#fff0d8'),hair=mat('#463840'),dark=mat('#284c5f'),forest=mat('#4e8e81'),stone=mat('#ece5d6'),mint=mat('#a8d9b5'),peach=mat('#e88867');
 // Three identities, with fabric-scale details and rounded daypacks.
 for(const sign of[-1,1]){for(let i=0;i<4;i++)add('girl','head',sphere,hair,[sign*(.21+i*.01),2.0-i*.075,-.11],[.048-i*.004,.054,.046]);add('girl','head',sphere,coral,[sign*.24,1.745,-.10],[.05,.028,.05]);}
 add('girl','chest',sphere,dark,[0,1.54,-.27],[.225,.265,.115]);add('girl','chest',sphere,coral,[0,1.48,-.363],[.17,.16,.035]);
 add('boy','chest',sphere,stone,[0,1.85,-.095],[.225,.14,.20]);add('boy','chest',sphere,forest,[0,1.79,-.20],[.24,.13,.13]);add('boy','chest',sphere,dark,[0,1.52,-.28],[.22,.26,.12]);
 for(const sign of[-1,1]){add('child','head',sphere,peach,[sign*.18,2.43,-.018],[.092,.11,.078]);add('child','head',sphere,cream,[sign*.18,2.44,.025],[.05,.065,.035]);}
 add('child','chest',sphere,mint,[0,1.52,-.28],[.22,.235,.12]);add('child','chest',sphere,cream,[0,1.46,-.39],[.10,.105,.021]);
 function apply(id){if(!Object.hasOwn(CHARACTERS,id))return false;const c=CHARACTERS[id];for(const [name,m]of materials){let color=name.includes('shell')?c.shell:name.includes('pants')?c.pants:name.includes('helmet')?c.helmet:name.includes('stitch')?c.trim:name.includes('lens')?c.lens:null;if(color)m.color.set(color);if(name.includes('lens')){m.metalness=.65;m.roughness=.12;}if(name.includes('shell')||name.includes('pants'))m.roughness=.88;}
  shell.color.set(c.shell);pants.color.set(c.pants);seam.color.set(c.trim);cuff.color.set(c.shell).multiplyScalar(.78);gaiter.color.set(c.pants).multiplyScalar(.84);
  for(const [key,objects]of Object.entries(outfits))for(const o of objects)o.visible=key===id;return true;
 }
 return{apply,setSkinTone,get skinTone(){return skinTone},materials,outfits,garments,faceMeshes,bootMeshes,bootTopology};
}
