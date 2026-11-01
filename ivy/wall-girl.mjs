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
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();g.userData.rings=rows.length;g.userData.segments=segments;return g;
}
function attach(parent,g,m,name){const o=new THREE.Mesh(g,m);o.name=name;o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function shaped(parent,rows,m,name,options){return attach(parent,loft(rows,options),m,name);}
// A soft tapered section follows a curved path. This is also the mutable limb geometry.
function tubeGeometry(points,radii,segments=10,normals=true){
 const p=[],ix=[];points.forEach((point,j)=>{const tangent=V(points[Math.min(j+1,points.length-1)]).sub(V(points[Math.max(j-1,0)])).normalize();let u=new THREE.Vector3(0,0,1).cross(tangent);if(u.lengthSq()<.01)u.set(1,0,0);u.normalize();const v=tangent.clone().cross(u).normalize();for(let i=0;i<=segments;i++){const a=i/segments*2*Math.PI,r=radii[j];const q=V(point).addScaledVector(u,Math.cos(a)*r).addScaledVector(v,Math.sin(a)*r);p.push(q.x,q.y,q.z);}});
 for(let j=0;j<points.length-1;j++)for(let i=0;i<segments;i++){const k=j*(segments+1)+i;ix.push(k,k+segments+1,k+1,k+1,k+segments+1,k+segments+2);}for(let i=1;i<segments-1;i++){ix.push(0,i+1,i);const end=(points.length-1)*(segments+1);ix.push(end,end+i,end+i+1);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);if(normals)g.computeVertexNormals();g.userData.rings=points.length;g.userData.segments=segments;g.userData.caps=true;return g;
}
function updateTube(mesh,points,radii){const fresh=tubeGeometry(points,radii,10,!mesh.userData.software);mesh.geometry.attributes.position.array.set(fresh.attributes.position.array);mesh.geometry.attributes.position.needsUpdate=true;if(!mesh.userData.software)mesh.geometry.computeVertexNormals();fresh.dispose();}
function joint(a,b,l1,l2,bend){const start=V(a),end=V(b),d=end.clone().sub(start),len=Math.max(d.length(),.00001),n=d.clone().divideScalar(len);const distance=Math.min(len,l1+l2-.000001);const along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along));let pole=V(bend).addScaledVector(n,-V(bend).dot(n));if(pole.lengthSq()<1e-6)pole.set(0,0,1);pole.normalize();return start.addScaledVector(n,along).addScaledVector(pole,height).toArray();}
export function createGirl({lowDetail=false}={}){
 const girl=new THREE.Group();girl.name='red-dress-miniature';girl.userData.design={version:'ivy-study-v2-runtime',source:'ivy-art-study/v2/build.py',adaptation:'lightweight articulated mesh; not imported Blender scene',garment:'sleeveless long dress, trousers and boots',parcel:'four overlapping leaves with vine ties',pin:'short, back-secured'};
 const cloth=material('#963c32'),clothLight=material('#ac493c'),hemMat=material('#71352b'),skin=material('#dfb68c'),hair=material('#563323'),hairLight=material('#704632'),boot=material('#583c2b'),soleMat=material('#382d25'),ribbon=material('#d95039');
 const body=new THREE.Group();body.name='torso-rig';girl.add(body);
 // V2 study: bare upper chest, a low curved neckline and real open armholes.
 shaped(body,[[0,.53,-.01,.061,.038],[0,.57,-.012,.083,.041],[0,.60,-.012,.084,.039],[0,.619,-.012,.061,.030],[0,.625,-.01,.029,.024]],skin,'bare-upper-torso',{segments:20});
 shaped(body,[[0,.441,0,.072,.052],[0,.48,-.008,.063,.044],[0,.53,-.01,.077,.049],[0,.565,-.011,.083,.045],[0,.573,-.012,.082,.044]],cloth,'tailored-bodice',{segments:24,fold:.035});
 for(const side of [-1,1])attach(body,tubeGeometry([[side*.069,.555,-.052],[side*.078,.595,-.043],[side*.077,.618,-.009],[side*.074,.599,.029],[side*.065,.555,.041]],[.014,.015,.015,.015,.013],6),cloth,'dress-shoulder-strap');
 const skirtRows=[[0,.452,0,.071,.051],[0,.425,.005,.079,.057],[0,.385,.012,.095,.068],[0,.33,.018,.123,.084],[0,.275,.022,.151,.102],[0,.218,.026,.174,.117,.007],[0,.211,.026,.172,.116,.007]];
 const skirt=shaped(body,skirtRows,clothLight,'folded-skirt',{segments:32,fold:.065});const skirtBase=skirt.geometry.attributes.position.array.slice();
 const hem=shaped(body,[[0,.212,.026,.172,.117,.007],[0,.218,.026,.175,.118,.007]],hemMat,'stitched-hem',{segments:32,fold:.065});const hemBase=hem.geometry.attributes.position.array.slice();const clothRig=new THREE.Group();clothRig.position.y=.45;body.add(clothRig);clothRig.add(skirt,hem);skirt.position.y=hem.position.y=-.45;
 shaped(body,[[0,.443,0,.073,.054],[0,.453,0,.072,.052]],hemMat,'waist-seam',{segments:20});
 // A collar, nape and head profile with a cheek/jaw taper rather than a ball.
 shaped(body,[[0,.62,-.01,.026,.024],[0,.665,-.014,.027,.025]],skin,'neck');
 shaped(body,[[0,.646,-.019,.022,.027],[0,.67,-.023,.039,.041],[0,.71,-.02,.057,.049],[0,.765,-.016,.063,.055],[0,.807,-.009,.055,.047],[0,.826,-.005,.025,.026],[0,.831,-.004,.001,.001]],skin,'head');
 shaped(body,[[0,.672,.012,.044,.034],[-.003,.702,.017,.063,.047],[-.004,.75,.013,.068,.056],[-.002,.797,.005,.059,.053],[0,.831,.003,.035,.034],[0,.842,.003,.001,.001]],hair,'swept-hair-cap',{segments:22,fold:.045});
 // Combed side locks are individual tapered ribbons of mass, ending in points.
 for(const side of [-1,1])shaped(body,[[side*.046,.786,.037,.026,.023],[side*.06,.756,.044,.026,.024],[side*.058,.71,.051,.019,.019],[side*.039,.681,.05,.004,.006]],side===-1?hairLight:hair,'side-lock',{segments:10});
 const ponyGroup=new THREE.Group();body.add(ponyGroup);ponyGroup.position.set(-.025,.803,.060);
 const pony=shaped(ponyGroup,[[0,0,0,.023,.024],[-.012,-.020,.034,.032,.027],[-.026,-.066,.047,.035,.029],[-.041,-.115,.043,.029,.025],[-.057,-.159,.025,.017,.017],[-.076,-.177,.010,.002,.002]],hair,'flowing-ponytail',{segments:14,fold:.1});
 for(let k=0;k<3;k++)shaped(ponyGroup,[[ -.015-k*.013,-.005,.02,.007,.009],[-.020-k*.009,-.052,.069,.007,.007],[-.038-k*.009,-.112,.063,.005,.005],[-.065-k*.009,-.169,.033,.0008,.001]],hairLight,'pony-ridge',{segments:6});
 shaped(ponyGroup,[[-.009,-.016,0,.019,.027],[-.009,.009,0,.019,.026]],ribbon,'hair-tie',{segments:12});
 shaped(ponyGroup,[[0,-.008,.014,.032,.012],[0,.003,.016,.039,.013],[0,.014,.014,.028,.010]],ribbon,'hair-clip',{segments:12});
 const headRig=new THREE.Group();headRig.name='attentive-head';headRig.position.y=.65;body.add(headRig);
 for(const part of [...body.children])if(['neck','head','swept-hair-cap','side-lock'].includes(part.name)||part===ponyGroup){headRig.add(part);part.position.y-=.65;}
 const pants=material('#827657');
 const waistBridge=shaped(girl,[[0,.445,0,.068,.048],[0,.452,0,.071,.051]],cloth,'waist-fold',{segments:20});const legs=[],arms=[],footMeshes=[];
 for(const side of [-1,1]){
  const leg=attach(girl,tubeGeometry([[side*.055,.39,0],[side*.065,.22,-.015],[side*.066,.08,0]],[.034,.026,.019]),pants,'trouser-leg');legs.push(leg);
  const foot=new THREE.Group();girl.add(foot);footMeshes.push(foot);
  shaped(foot,[[0,.006,-.023,.033,.067],[0,.017,-.024,.035,.069],[0,.045,-.021,.034,.064],[0,.064,-.007,.026,.039],[0,.094,.004,.025,.026],[0,.106,.004,.026,.027]],boot,'soft-ankle-boot',{segments:14});
  shaped(foot,[[0,.001,-.023,.034,.068],[0,.011,-.023,.035,.069]],soleMat,'boot-sole',{segments:14});
  shaped(foot,[[0,.098,.004,.027,.029],[0,.108,.004,.027,.029]],boot,'boot-cuff',{segments:14});
  const upper=attach(girl,tubeGeometry([[side*.09,.59,-.008],[side*.13,.52,0],[side*.14,.485,.005]],[.036,.034,.027]),skin,'bare-upper-arm');
  const lower=attach(girl,tubeGeometry([[side*.14,.485,.005],[side*.155,.435,.0],[side*.16,.385,0]],[.02,.018,.014]),skin,'forearm');
  const hand=new THREE.Group();girl.add(hand);
  shaped(hand,[[0,-.024,0,.009,.009],[0,-.012,0,.017,.011],[0,.008,0,.018,.012],[0,.024,0,.013,.01]],skin,'palm',{segments:10});
  // Thumb profile keeps silhouette legible without oversized mitten hands.
  shaped(hand,[[side*.012,.014,-.002,.008,.007],[side*.024,.002,-.008,.006,.006],[side*.025,-.007,-.01,.001,.001]],skin,'thumb',{segments:8});arms.push({upper,lower,hand});
 }
 // Runtime adaptation of ivy-art-study/v2/build.py's overlapping leaf sheets.
 // Coordinates are authored for this live rig; no Blender scene or baked render is loaded.
 const leafGreen=material('#648438'),leafUnder=material('#85994b'),strapMat=material('#928345'),metal=material('#b7c9cf',.24),gold=material('#d8ae4c',.30);
 metal.metalness=.72;gold.metalness=.65;
 const bundle=new THREE.Group();bundle.name='leaf-parcel-rig';body.add(bundle);
 function panel(name,start,end,bulge,width,mat){
  const p=[],ix=[],S=8,T=6;
  for(let i=0;i<=S;i++){const t=i/S,w=width*(Math.pow(Math.sin(Math.PI*t),.65)+.012),wave=Math.sin(Math.PI*t);for(let j=0;j<=T;j++){const q=j/T*2-1;p.push(start[0]+(end[0]-start[0])*t+w*q,start[1]+(end[1]-start[1])*t+.006*Math.sin(q*3+t*4)*wave,start[2]+(end[2]-start[2])*t+bulge*wave-.018*q*q*wave);}}
  for(let i=0;i<S;i++)for(let j=0;j<T;j++){const a=i*(T+1)+j;ix.push(a,a+1,a+T+1,a+1,a+T+2,a+T+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();attach(bundle,g,mat,name);
  const mid=[];for(let i=0;i<7;i++){const t=i/6;mid.push([start[0]+(end[0]-start[0])*t,start[1]+(end[1]-start[1])*t,start[2]+(end[2]-start[2])*t+bulge*Math.sin(Math.PI*t)+.002]);}
  attach(bundle,tubeGeometry(mid,[.0008,.001,.0012,.0013,.0012,.001,.0005],4),leafUnder,'leaf-parcel-vein');
 }
 panel('leaf-wrap-rear',[0,.455,.062],[0,.631,.065],.070,.085,leafGreen);
 panel('leaf-wrap-left',[-.06,.465,.076],[.045,.627,.089],.062,.057,leafUnder);
 panel('leaf-wrap-right',[.065,.468,.081],[-.045,.620,.103],.065,.058,leafGreen);
 panel('leaf-wrap-top',[.006,.570,.123],[-.012,.655,.080],.048,.051,leafGreen);
 for(const side of [-1,1])attach(body,tubeGeometry([[side*.046,.465,.048],[side*.083,.53,.052],[side*.078,.603,.026],[side*.061,.615,-.028],[side*.053,.542,-.057],[side*.043,.462,-.047]],[.0035,.004,.004,.004,.0035,.003],6),strapMat,'vine-shoulder-strap');
 attach(bundle,tubeGeometry([[-.078,.521,.089],[-.058,.518,.146],[0,.520,.171],[.063,.523,.150],[.084,.528,.090]],[.003,.003,.003,.003,.003],6),strapMat,'parcel-vine-tie');
 for(const side of [-1,1])attach(bundle,tubeGeometry([[0,.521,.174],[side*.023,.538,.176],[side*.031,.521,.176],[0,.521,.174],[side*.016,.495,.168]],[.0025,.0025,.0025,.0025,.0015],4),strapMat,'parcel-vine-knot');
 const pin=new THREE.Group();pin.name='dressmaker-pin';body.add(pin);pin.position.set(.108,.55,.085);pin.rotation.z=-.09;
 shaped(pin,[[0,-.108,0,.0003,.0003],[0,-.095,0,.003,.003],[0,.103,0,.003,.003]],metal,'pin-needle',{segments:8});
 shaped(pin,[[0,.099,0,.001,.001],[0,.103,0,.011,.011],[0,.115,0,.016,.016],[0,.127,0,.011,.011],[0,.131,0,.001,.001]],gold,'pin-round-head',{segments:12});
 attach(pin,tubeGeometry([[0,-.107,0],[0,-.065,0],[0,-.026,0]],[.007,.008,.007],8),boot,'back-pin-sheath');
 for(const y of [-.072,-.032])attach(pin,tubeGeometry([[-.013,y,-.007],[-.010,y,.007],[0,y,.011],[.012,y,.006],[.019,y,-.008]],[.003,.003,.003,.003,.003],6),strapMat,'pin-securing-loop');
 bundle.position.y=.58;for(const o of bundle.children)o.position.y-=.58;
 let reachStartC=0,reachStartDirection=0,lastDirection=0,reachStartWorld=null,lastWorldHands=null,lastChargeC=0,chargeReleaseTime=-10,lastC=0,landingPoseTime=-10,landingStartC=0;
 // Secondary motion is a bounded damped rig, not cloth simulation. Repeated render
 // calls at the same simulation time never integrate it again.
 let previousTime=0, previousVertical=0, swing=0, swingVelocity=0,wasClimbing=false,releaseTime=-10,lastClimbHands=null,lastClimbAngle=0,lastClimbDrop=0,lastClimbTorsoOffset=new THREE.Vector3(),previousPhase="grounded",lastRenderedHands=null,balanceHands=null,balanceTime=-10,skirtOutside=1;
 girl.userData.pose=({compression=0,phase='grounded',time=0,lean=0,feet,hands,charge=0,velocity={x:0,y:0},impact=0,climbProgress=0,lookTarget,plannedFeet,surfaceAt,slipSpeed=0,slipX=0,slipZ=0,plannedHands,reachProgress=0,rootPosition={x:0,y:0,z:0}}={})=>{
  const reaching=phase==='reaching',root=Array.isArray(rootPosition)?rootPosition:[rootPosition.x,rootPosition.y,rootPosition.z];
  const airborne=['rising','falling','airborne','flying','slipping'].includes(phase);
  const climbing=['catching','catch','hanging','climbing','pulling','mantling'].includes(phase), cp=clamp(climbProgress,0,1), contactCount=hands?.filter(Boolean).length||0;
  const norm=p=>Array.isArray(p)?p:[p.x,p.y,p.z];
  const contactHeight=contactCount?hands.filter(Boolean).reduce((s,p)=>s+norm(p)[1],0)/contactCount:0;
  const vy=velocity.y??velocity.vy??0, vx=velocity.x??velocity.vx??0;
  // Once gripping, the hold—not the stale jump aim—sets the torso alignment.
  let direction=climbing||reaching?0:clamp(lean+vx*.08-slipX*.65,-1,1);const dt=clamp(time-previousTime,0,.05);
  if(time<previousTime){swing=0;swingVelocity=0;previousVertical=vy;wasClimbing=false;releaseTime=-10;lastClimbHands=null;lastClimbTorsoOffset.set(0,0,0);previousPhase=phase;lastRenderedHands=null;balanceHands=null;balanceTime=-10,skirtOutside=1;reachStartWorld=null;lastWorldHands=null;lastChargeC=0;chargeReleaseTime=-10;lastC=0;landingPoseTime=-10;landingStartC=0;}
  if(wasClimbing&&!climbing)releaseTime=time;
  if(phase==='landing'&&previousPhase!=='landing'){landingPoseTime=time;landingStartC=lastC;}
  if(previousPhase==='charging'&&phase!=='charging')chargeReleaseTime=time;
  if(phase==='charging')lastChargeC=Math.max(charge*.78,.32*clamp(charge/.05,0,1));
  if(phase!==previousPhase&&!climbing&&!reaching&&lastRenderedHands){balanceHands=lastRenderedHands.map(p=>p.slice());balanceTime=time;}
  if(reaching&&previousPhase!=='reaching'){reachStartWorld=lastWorldHands?.map(p=>p.slice());reachStartC=lastC;reachStartDirection=lastDirection;}
  const reachT=clamp(reachProgress,0,1),reachEase=reachT*reachT*(3-2*reachT);if(reaching)direction=reachStartDirection*(1-reachEase);lastDirection=direction;
  const balanceT=clamp((time-balanceTime)/.18,0,1),balanceBlend=balanceT*balanceT*(3-2*balanceT);
  const releaseT=clamp((time-releaseTime)/.32,0,1),releaseBlend=releaseT*releaseT*(3-2*releaseT),releasing=!climbing&&lastClimbHands&&releaseT<1;
  if(releasing)direction*=releaseBlend;
  if(dt>0){const kick=clamp((vy-previousVertical)*.07,-.6,.6);swingVelocity+=kick;swingVelocity+=(-24*swing-6*swingVelocity)*dt;swing=clamp(swing+swingVelocity*dt,-.5,.5);}
  previousTime=time;previousVertical=vy;
  const gaze=lookTarget?norm(lookTarget):null,avoidHolds=plannedHands?.length?plannedHands:hands,avoidSide=avoidHolds?.length?-Math.sign(avoidHolds.reduce((s,h)=>s+norm(h)[0],0))||skirtOutside:skirtOutside,avoidBlade=reaching?reachEase:climbing?1-cp:0;
  headRig.rotation.set(climbing||reaching?-.19+cp*.12:airborne?-.10:-.025,gaze?clamp(Math.atan2(gaze[0],Math.max(.3,Math.abs(gaze[2])))*.4,-.42,.42):direction*.22,-avoidSide*.50*avoidBlade+(climbing||reaching?0:Math.sin(time*2.6)*.015));
  const flightTuck=airborne?clamp((vy+2)/7,0,1):0;
  const breath=airborne||climbing?0:Math.sin(time*2.6)*.008;
  const preparation=clamp(charge,0,1)*.78;
  compression=Math.max(compression,preparation*.33,clamp(impact,0,1)*.24);

  // Hands stay pinned to simulation contacts while the torso rises beneath them.
  // A low handhold requires a deep mantle crouch, not a forced crouch while hanging.
  const mantle=climbing?clamp((.55-contactHeight)/.52,0,1):0;
  let c=Math.max(clamp(compression/.33,0,1),mantle*.97,reaching?reachStartC+(.32-reachStartC)*reachEase:climbing?.32*(1-cp):phase==='charging'?lastChargeC:airborne?lastChargeC*clamp(1-(time-chargeReleaseTime)/.14,0,1):0);if(!airborne&&!climbing&&!reaching&&time-landingPoseTime<.16){const t=clamp((time-landingPoseTime)/.16,0,1),e=t*t*(3-2*t);c=landingStartC+(c-landingStartC)*e;}lastC=c;let drop=c*(climbing?.22:.21);
  let angle=climbing?-.10-mantle*.75:-c*.85+(airborne?-.08*flightTuck:breath)-clamp(slipZ*.55,-.14,.18);
  if(releasing){angle=lastClimbAngle+(angle-lastClimbAngle)*releaseBlend;drop=lastClimbDrop+(drop-lastClimbDrop)*releaseBlend;}
  const weightShift=climbing?Math.sin(cp*Math.PI)*.025:0;
  body.rotation.set(angle,direction*.13+(climbing?Math.sin(cp*Math.PI)*.08:0),-direction*.10+(climbing?weightShift:slipSpeed>.025?Math.sin(time*11)*Math.min(.065,slipSpeed*.15):phase==='sliding'?Math.sin(time*11)*.055:0));
  body.position.set(direction*.025+weightShift,.4-drop-.4*Math.cos(angle)+breath,-.4*Math.sin(angle)+(climbing?mantle*.035:releasing?(1-releaseBlend)*.035:0));clothRig.rotation.x=-angle*.9;clothRig.rotation.z=skirtOutside*.40*(climbing?1:reaching?reachEase:releasing?1-releaseBlend:0);const clearanceOffset=new THREE.Vector3();if(climbing||reaching){const clear=(reaching?reachEase:1)*Math.sin((climbing?cp:0)*Math.PI*.5+.35);clearanceOffset.set(skirtOutside*.09*clear,.055*clear+(climbing?.10*Math.sin(Math.PI*cp):0),0);body.position.add(clearanceOffset);}body.updateMatrix();
  // Solve the torso beneath fixed holds rather than stretching either arm.
  // Alternating projections onto the two shoulder-reach balls preserves the
  // rigid chest and lets the pelvis counterbalance the edge mantle.
  const baseTorsoPosition=body.position.clone().sub(clearanceOffset);
  const projectionTargets=reaching?plannedHands?.map((h,i)=>{const end=norm(h),start=reachStartWorld?.[i]||end.map((v,k)=>v+root[k]);return end.map((v,k)=>start[k]+(v+root[k]-start[k])*reachEase-root[k]+(k===1?.025*Math.sin(Math.PI*reachT):k===0?skirtOutside*.12*Math.sin(Math.PI*reachT):0));}):hands;
  if((climbing&&contactCount)||(reaching&&projectionTargets?.length))for(let pass=0;pass<8;pass++)for(let i=0;i<2;i++){
   if(!projectionTargets?.[i])continue;const side=i===0?-1:1,shoulder=V([side*.098,.588+side*weightShift,-.008]).applyMatrix4(body.matrix),target=V(norm(projectionTargets[i]));target.y+=.015*(reaching?reachEase:1);const delta=target.sub(shoulder),distance=delta.length();if(distance>.312){body.position.addScaledVector(delta,1-.312/distance);body.updateMatrix();}
  }
  if(climbing)lastClimbTorsoOffset.copy(body.position).sub(baseTorsoPosition);else if(releasing){body.position.addScaledVector(lastClimbTorsoOffset,1-releaseBlend);body.updateMatrix();}
  const bodyPoint=p=>V(p).applyMatrix4(body.matrix).toArray();clothRig.updateMatrix();const bp=waistBridge.geometry.attributes.position;for(let i=0;i<=20;i++){const a=i/20*Math.PI*2,top=bodyPoint([Math.cos(a)*.068,.445,-.005+Math.sin(a)*.048]),bottom=V([Math.cos(a)*.071,.002,Math.sin(a)*.051]).applyMatrix4(clothRig.matrix).applyMatrix4(body.matrix);bp.setXYZ(i,...top);bp.setXYZ(21+i,bottom.x,bottom.y,bottom.z);}bp.needsUpdate=true;if(!lowDetail)waistBridge.geometry.computeVertexNormals();
  if(reaching&&plannedHands?.length)skirtOutside=-Math.sign(plannedHands.reduce((s,p)=>s+norm(p)[0],0))||1;
  if(climbing&&!wasClimbing&&contactCount)skirtOutside=-Math.sign(hands.filter(Boolean).reduce((s,p)=>s+norm(p)[0],0))||1;
  const bagTuck=climbing?1:reaching?reachEase:releasing?1-releaseBlend:0;bundle.rotation.z=skirtOutside*.35*bagTuck;bundle.position.x=skirtOutside*.08*bagTuck;bundle.position.y=.58-.03*bagTuck;bundle.updateMatrix();
  // Millimetric clearance for the sprung blade: lift only the lower strap anchor, not the parcel.
  let strapIndex=0;for(const mesh of body.children)if(mesh.name==='vine-shoulder-strap'){const side=strapIndex++===0?-1:1,bagPoint=p=>V([p[0],p[1]-.58,p[2]]).applyMatrix4(bundle.matrix).toArray(),a=bagPoint([side*.04,.49,.12]),b=bagPoint([side*.025,.575,.10]);a[1]+=.003*bagTuck;const fresh=tubeGeometry([a,b,[side*.078,.603,.026],[side*.061,.615,-.028],[side*.053,.542,-.057],[side*.043,.462,-.047]],[.0035,.004,.004,.004,.0035,.003],6,!lowDetail);mesh.geometry.attributes.position.array.set(fresh.attributes.position.array);mesh.geometry.attributes.position.needsUpdate=true;if(!lowDetail)mesh.geometry.computeVertexNormals();fresh.dispose();}
  const handDepth=contactCount?hands.filter(Boolean).reduce((s,p)=>s+norm(p)[2],0)/contactCount:0;
  // r9: a small outward free-foot arc clears the cuff before crossing the
  // leaf edge. It vanishes at takeoff/plant; supplied planted soles always win.
  const steppingFeet=[-.065,.065].map((x,i)=>{
   const t=clamp((cp-(i?.20:.08))/(i?.61:.52),0,1),across=clamp((t-.48)/.52,0,1),acrossEase=across*across*(3-2*across),lift=clamp(t/.48,0,1),liftEase=lift*lift*(3-2*lift),target=plannedFeet?.[i]?norm(plannedFeet[i]):[x,contactHeight,handDepth];
   const plannedNormal=plannedFeet?.[i]?.normal,n=plannedNormal?V(Array.isArray(plannedNormal)?plannedNormal:[plannedNormal.x,plannedNormal.y,plannedNormal.z]).normalize():Y;
   // An unplanted boot lifts around the narrower rear edge (25 mm Z arc),
   // then turns toward its upcoming sole plane. Planted contacts override
   // the entire 18 mm outward arc and remain exactly on the physical blade.
   const normal=Y.clone().lerp(n,acrossEase).normalize();
   return {x:x+(target[0]-x)*acrossEase+skirtOutside*.018*Math.sin(t*Math.PI)*(1-acrossEase),y:target[1]*liftEase+Math.sin(t*Math.PI)*.112,z:target[2]*acrossEase-Math.sin(t*Math.PI)*.025,normal};
  });
  const freeFeet=climbing?steppingFeet:airborne?[[-.074,.13*flightTuck,-.085*flightTuck],[.077,.23*flightTuck,.045*flightTuck]]:[[-.065,0,0],[.065,0,0]];
  const footTargets=freeFeet.map((p,i)=>feet?.[i]||p);
  const recordedFeet=[],recordedHands=[],recordedJoints=[];
  for(let i=0;i<2;i++){
   const side=i===0?-1:1,t=norm(footTargets[i]),rawNormal=footTargets[i]?.normal,nv=rawNormal?V(Array.isArray(rawNormal)?rawNormal:[rawNormal.x,rawNormal.y,rawNormal.z]).normalize():Y,hip=V([side*(.052-.017*c),-.06+.005*c,.045*c]).applyMatrix4(clothRig.matrix).applyMatrix4(body.matrix).toArray(),ankle=[t[0]+nv.x*.075,t[1]+nv.y*.075,t[2]+nv.z*.075+.004],knee=joint(hip,ankle,.18,.175,[climbing?skirtOutside*.3:side*.2,climbing?1:.1,climbing?-.1:-1]);
   // The hidden thigh root follows the same tiny swing lift; hips return unchanged once the sole plants.
   if(climbing&&!feet?.[i]){const enter=clamp(cp/.03,0,1),leave=clamp((cp-.10)/.10,0,1);hip[1]+=.002*Math.sin(Math.PI*clamp((cp-(i?.20:.08))/(i?.61:.52),0,1))+.001*enter*enter*(3-2*enter)*(1-leave*leave*(3-2*leave));}
   updateTube(legs[i],[hip,knee,ankle],[.033,.031,.025]);footMeshes[i].position.set(...t);const fn=footTargets[i]?.normal;if(fn){const nv=V(Array.isArray(fn)?fn:[fn.x,fn.y,fn.z]).normalize();footMeshes[i].quaternion.setFromUnitVectors(Y,nv);}else footMeshes[i].quaternion.identity();recordedFeet.push(t.slice());
   const shoulder=bodyPoint([side*.098,.588+side*weightShift,-.008]);
   // The leading hand reaches; the trailing elbow remains folded close to the ribs.
   // This removes the old outstretched airplane / running-in-air silhouette.
   const leading=direction===0?i===1:side===Math.sign(direction);
   let target=hands?.[i]?norm(hands[i]):climbing?[side*.12,.27,-.12]:airborne?[side*(leading?.13:.17)+direction*.03,leading?.72+.06*flightTuck:.52,-.13+side*direction*.025]:[side*(phase==='sliding'?.24:.14+c*.045)+direction*.025,.36-drop+(phase==='sliding'?.08+side*Math.sin(time*8)*.04:side*Math.sin(time*2.6)*.008),-.025-c*.08];
   if(reaching&&plannedHands?.[i]){const end=norm(plannedHands[i]),start=reachStartWorld?.[i]||end.map((v,k)=>v+root[k]);target=end.map((v,k)=>start[k]+(v+root[k]-start[k])*reachEase-root[k]+(k===1?.025*Math.sin(Math.PI*reachT):k===0?skirtOutside*.12*Math.sin(Math.PI*reachT):0));}
   if(!climbing&&!reaching&&!releasing&&balanceHands&&balanceT<1)target=target.map((v,k)=>balanceHands[i][k]+(v-balanceHands[i][k])*balanceBlend);
   if(releasing&&!hands?.[i])target=target.map((v,k)=>lastClimbHands[i][k]+(v-lastClimbHands[i][k])*releaseBlend);
   const contactTarget=target.slice();if(hands?.[i]||releasing||reaching)target=[target[0],target[1]+.015*(reaching?reachEase:releasing?1-releaseBlend:1),target[2]];if(!hands?.[i]&&!reaching){const d=V(target).sub(V(shoulder)),len=d.length();if(len>.312)target=V(shoulder).addScaledVector(d,.312/len).toArray();}
   const resting=!climbing&&!reaching&&!airborne&&phase!=='sliding'&&phase!=='charging',armLength=resting?.13:.16;const elbow=joint(shoulder,target,armLength,armLength,[(climbing||reaching)?skirtOutside*1.3:side*.22,climbing?-.2:0,(climbing||reaching)?-1:.25]);const cuff=elbow.map((v,k)=>v*.8+target[k]*.2);const foreMid=cuff.map((v,k)=>(v+target[k])*.5);if(climbing||reaching){const f=reaching?reachEase:1;foreMid[0]+=(target[0]+skirtOutside*.10-foreMid[0])*f;foreMid[1]+=(target[1]+.025-foreMid[1])*f;foreMid[2]+=(target[2]-.035-foreMid[2])*f;}
   updateTube(arms[i].upper,[[shoulder[0]-side*.009,shoulder[1]-.006,shoulder[2]],elbow,cuff],[.029,.026,.022]);updateTube(arms[i].lower,[cuff,foreMid,target],[.018,.015,.011]);arms[i].hand.position.set(...target);arms[i].hand.rotation.set(hands?.[i]?Math.PI/2:reaching?Math.PI/2*reachEase:releasing?Math.PI/2*(1-releaseBlend):0,0,hands?.[i]?0:side*(.12+c*.2));recordedHands.push(contactTarget);recordedJoints.push({shoulder,elbow,wrist:target,hip,knee,ankle,handContact:!!hands?.[i],footContact:!!feet?.[i]});
  }
  // The short pin stays in its back sheath in every phase. A bounded outboard
  // tuck follows the parcel around the leaf edge; neither hand carries a tool.
  pin.position.set(.108+skirtOutside*.06*bagTuck,.55-.02*bagTuck,.085);
  pin.rotation.z=-.09+skirtOutside*.25*bagTuck;
  body.updateMatrixWorld(true);pin.updateMatrixWorld(true);
  const pinPosition=V([0,0,0]).applyMatrix4(pin.matrix).applyMatrix4(body.matrix).toArray();
  const pinAxis=Y.clone().applyQuaternion(pin.quaternion).applyQuaternion(body.quaternion);
  girl.userData.accessories={pinMode:'back-secured',pinStow:1,pinPosition,pinAxis:pinAxis.toArray(),wrist:recordedJoints[1].wrist.slice(),bundleParent:bundle.parent.name,palmsFree:true};
  ponyGroup.rotation.z=skirtOutside*.9*avoidBlade+Math.sin(time*5)*.065+c*.20+direction*.12+swing*.5;ponyGroup.rotation.x=1.25*avoidBlade+Math.sin(time*4+.3)*.06-c*.18+swing+clamp(vy*.035,-.18,.2);ponyGroup.rotation.y=-direction*.2;
  const tuck=climbing?1:releasing?1-releaseBlend:0;
  for(const [mesh,base] of [[skirt,skirtBase],[hem,hemBase]]){const pos=mesh.geometry.attributes.position;for(let i=0;i<pos.count;i++){const x=base[i*3],y=base[i*3+1],z=base[i*3+2],f=clamp((.45-y)/.24,0,1);pos.setXYZ(i,x+f*(Math.sin(time*6+z*9)*.007-direction*.018+swing*.025),y+f*(c*.026+flightTuck*.03+Math.abs(swing)*.025),z+Math.min(0,z)*c*(3.2*Math.sin(f*Math.PI)+f)*(1-tuck)+f*(Math.sin(time*5+x*8)*.008+swing*.045));if(tuck){pos.setX(i,pos.getX(i)*(1-.25*f*tuck)+skirtOutside*f*.055*tuck);pos.setY(i,pos.getY(i)+f*.10*tuck*clamp((.06-z)/.18,.15,1));pos.setZ(i,pos.getZ(i)*(1-.20*f*tuck));}
   // During the mantle, the skirt gathers outboard and upward around the
   // raised knees, then eases down after release. Bounded rig, not cloth simulation.

  }if(lowDetail)for(let row=0;row<pos.count;row+=33)for(let k=1;k<32;k+=2){const i=row+k;pos.setXYZ(i,(pos.getX(i-1)+pos.getX(i+1))/2,(pos.getY(i-1)+pos.getY(i+1))/2,(pos.getZ(i-1)+pos.getZ(i+1))/2);}pos.needsUpdate=true;if(!lowDetail)mesh.geometry.computeVertexNormals();}
  if(climbing){lastClimbHands=recordedHands.map(p=>p.slice());lastClimbAngle=angle;lastClimbDrop=drop;}wasClimbing=climbing;previousPhase=phase;lastRenderedHands=recordedHands.map(p=>p.slice());lastWorldHands=recordedJoints.map(j=>j.wrist.map((v,k)=>v+root[k]));
  girl.userData.contacts={feet:recordedFeet,hands:recordedHands};girl.userData.motion={phase,preparation,flightTuck,swing,bodyAngle:angle,bodyDrop:drop,climbing,climbProgress:cp,mantle,joints:recordedJoints};
 };
 if(lowDetail)girl.traverse(o=>{if(!o.isMesh)return;o.userData.software=true;const g=o.geometry,{rings,segments,caps}=g.userData;if(!rings||!segments)return;const ix=[],at=(r,i)=>r*(segments+1)+i;for(let r=0;r<rings-1;r++)for(let i=0;i<segments;i+=2){const j=Math.min(i+2,segments),a=at(r,i),b=at(r,j),c=at(r+1,i),d=at(r+1,j);ix.push(a,b,c,b,d,c);}if(caps)for(let i=2;i<segments-2;i+=2){ix.push(0,i+2,i);const end=(rings-1)*(segments+1);ix.push(end,end+i,end+i+2);}g.setIndex(ix);});girl.userData.pose();girl.userData.height=.91;return girl;
}
