/** AltayRider v0.2. Inputs are R7 PHYSICAL signed edge values; NEVER pre-mirror.
 * Parent asset under slope-normal rider base, NOT old roll/tilt/body groups.
 * Pass physics com in metres along +X nose. Pose rendering has no physics writes.
 */
export function createRiderDriver(THREE, model, contract) {
 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z), Q=()=>new THREE.Quaternion();
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const rx=(v,a)=>v.clone().applyAxisAngle(V(1,0,0),a);
 const bones={}; model.traverse(o=>{if(o.isBone)bones[o.name]=o});
 // Names loaded from GLTFLoader may sanitize dots: support both exact authored and sanitized names.
 for(const n of Object.keys(contract.bones)){if(!bones[n])bones[n]=bones[n.replaceAll('.','')];if(!bones[n])throw Error('Missing bone '+n)}
 const rests={};for(const [n,r] of Object.entries(contract.bones)){const [w,x,y,z]=r.quaternion;rests[n]=new THREE.Quaternion(x,y,z,w)}
 function solve(input={}) {
  const stance=input.stance===-1?-1:1;
  const edge=clamp(input.edge||0,-1,1)*stance;
  const front=clamp(input.frontEdge??input.edge??0,-1,1)*stance, rear=clamp(input.rearEdge??input.edge??0,-1,1)*stance;
  const com=clamp(input.com||0,-.34,.34), compression=clamp(input.compression||0,0,1), steer=clamp(input.steer||0,-1,1);
  // Both ankles move with independent foot roll. Solve hip height against each
  // actual 3D ankle rather than the mean edge, preserving a little knee flexion.
  const pelvisZ=-.04+.28*edge;let h=1.215-.18*compression-.008*Math.abs(edge);
  for(const sign of[1,-1]){const e=sign*stance>0?front:rear,ankle=rx(V(sign*.58,.32,0),e*.49),dx=ankle.x-(com*stance+sign*.235),dz=ankle.z-pelvisZ;h=Math.min(h,ankle.y+Math.sqrt(Math.max(.04,.970**2-dx*dx-dz*dz)));}

  const pelvis=V(com*stance,h,-.04+.28*edge),waist=pelvis.clone().add(V(0,.20,.03)),chest=pelvis.clone().add(V(.035*steer*stance,.51,.075-.045*edge)),neck=chest.clone().add(V(.018*steer*stance,.20,.018)),head=neck.clone().add(V(.03*steer*stance,.15,.015));
  const targets={root:[V(),V(0,.15,0)],pelvis:[pelvis,waist],spine:[waist,chest],chest:[chest,neck],head:[neck,head.clone().add(V(0,.24,0))]};
  const joints={pelvis,waist,chest,neck,head},anchors={};
  for(const [side,sign] of [['L',1],['R',-1]]){
   const role=sign*stance>0?'front':'rear',e=role==='front'?front:rear;
   const ankle=rx(V(sign*.58,.32,0),e*.49),hip=pelvis.clone().add(V(sign*.235,0,0));
   const axis=ankle.clone().sub(hip),d=axis.length();axis.normalize();
   if(d>=.98)throw Error('Unreachable leg '+d);
   const along=(.5**2-.48**2+d*d)/(2*d),height=Math.sqrt(Math.max(0,.5**2-along**2));
   const pole=V(sign*.12,0,1);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
   const knee=hip.clone().addScaledVector(axis,along).addScaledVector(pole,height);
   const shoulder=chest.clone().add(V(sign*.30,.035,0));
   // Front means the actual anatomical side selected by stance; +X is board nose.
   const reach=clamp(com/.30,0,1)*(1-.55*Math.abs(edge)),lead=role==='front'?reach:0,trail=role==='rear'?reach:0;
   const elbow=shoulder.clone().add(V(sign*(.095+.18*lead+.05*trail),-.345+.15*lead,.055-.055*trail).normalize().multiplyScalar(contract.bones['upper_arm.'+side].length));
   const wrist=elbow.clone().add(V(sign*(.04+.20*lead+.045*trail),-.245+.095*lead,.055-.055*trail).normalize().multiplyScalar(contract.bones['forearm.'+side].length));
   Object.assign(targets,{['thigh.'+side]:[hip,knee],['shin.'+side]:[knee,ankle],['foot.'+side]:[ankle,ankle.clone().add(rx(V(sign*.035,-.10,.23),e*.49))],['upper_arm.'+side]:[shoulder,elbow],['forearm.'+side]:[elbow,wrist],['hand.'+side]:[wrist,wrist.clone().add(V(sign*.055,-.035,.09))]});
   for(const [n,v] of Object.entries({hip,knee,ankle,shoulder,elbow,wrist}))joints[n+'.'+side]=v;
   anchors[role]=ankle;
  }
  // Proper anatomical rotation, determinant +1, never negative scale.
  if(stance===-1){const unique=new Set(Object.values(targets).flat());for(const p of Object.values(joints))unique.add(p);for(const p of unique){p.x=-p.x;p.z=-p.z}}
  const matrices={};const turn=Q().setFromAxisAngle(V(0,1,0),stance===-1?Math.PI:0);
  for(const [n,[a,b]] of Object.entries(targets)){
   const base=turn.clone().multiply(rests[n]),dir=V(0,1,0).applyQuaternion(base),dest=b.clone().sub(a).normalize();
   let q=Q().setFromUnitVectors(dir,dest).multiply(base);
   if(n.startsWith('foot.')){const sign=n.endsWith('.L')?1:-1,e=sign*stance>0?front:rear;q=turn.clone().multiply(Q().setFromAxisAngle(V(1,0,0),e*.49)).multiply(rests[n]);}
   if(n==='head')q.premultiply(Q().setFromAxisAngle(dest,.85*stance*clamp(input.lookAlong??1,-1,1)+.24*steer));
   matrices[n]=new THREE.Matrix4().compose(a,q,V(1,1,1));
  }
  return {targets,joints,anchors,matrices,stance};
 }
 function update(input) {
  const p=solve(input);model.updateWorldMatrix(true,true);
  // All target matrices are model-local; convert to parent local in hierarchy order.
  const order=['root','pelvis','spine','chest','head','thigh.L','shin.L','foot.L','thigh.R','shin.R','foot.R','upper_arm.L','forearm.L','hand.L','upper_arm.R','forearm.R','hand.R'];
  for(const n of order){
   const b=bones[n],r=contract.bones[n];
   const local=r.parent?p.matrices[r.parent].clone().invert().multiply(p.matrices[n]):p.matrices[n];
   local.decompose(b.position,b.quaternion,b.scale);b.updateMatrix();
  }
  model.updateWorldMatrix(true,true);return p;
 }
 return {update,solve,bones};
}
