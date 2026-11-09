import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/loaders/GLTFLoader.js';
import {characterMotion} from './wall-character-state.mjs?v=climb-r1';
export const CHARACTER_BUILD='tinygirl-back-climb-20261105';
export const CHARACTER_URL=new URL('./assets/tinygirl-v2-red/tinygirl_v2_red_climb.glb?v=9a71871ce9a1',import.meta.url);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/** One small WebGL surface, composited into the established Canvas2D scene.
 * A physical 3D skeleton/mixer replaces only the player artwork. No second input
 * layer, no replacement collider, and no dependency on a CDN or import map.
 */
export function createCharacter3D(){
 const surface=document.createElement('canvas');
 const renderer=new THREE.WebGLRenderer({canvas:surface,alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
 renderer.setSize(256,320,false);renderer.setClearColor(0x000000,0);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1.02,1.02,2.35,-.20,.01,30);
 camera.position.set(0,0,8);camera.lookAt(0,0,0);
 scene.add(new THREE.HemisphereLight(0xfff9ed,0x808c79,2.2));
 const key=new THREE.DirectionalLight(0xffffff,2.6);key.position.set(-3,5,6);scene.add(key);
 const fill=new THREE.DirectionalLight(0xf4e7ce,.65);fill.position.set(3,2,-4);scene.add(fill);
 const pivot=new THREE.Group();scene.add(pivot);
 let model=null,mixer=null,mesh=null,clips=[],actions={},current=null,error=null,lastTime=null,heading=Math.PI+.18,transitions=[],drawnBounds=null;
 let sourceHeight=0,sourceMinY=0;
 const ready=new GLTFLoader().loadAsync(CHARACTER_URL.href).then(gltf=>{
  model=gltf.scene;clips=gltf.animations;
  const box=new THREE.Box3().setFromObject(model);sourceHeight=box.max.y-box.min.y;sourceMinY=box.min.y;
  model.position.set(-(box.min.x+box.max.x)/2,-box.min.y,-(box.min.z+box.max.z)/2);pivot.add(model);
  model.traverse(o=>{if(o.isSkinnedMesh){mesh=o;o.frustumCulled=false;}});
  if(!mesh)throw new Error('GLB is missing its skin');
  mixer=new THREE.AnimationMixer(model);
  for(const name of ['idle','walk','run','charge','takeoff','airborne','hang','pull_up','land_support','stand_up']){
   const clip=clips.find(c=>c.name===name);if(!clip)throw new Error('GLB is missing '+name);
   const action=mixer.clipAction(clip);if(!['idle','walk','run','airborne','hang'].includes(name)){action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;}
   actions[name]=action;
  }
  switchTo('idle',0);mixer.update(0);model.updateMatrixWorld(true);
  return true;
 }).catch(e=>{error=String(e.message||e);console.error('3D character load failed:',e);return false;});
 function switchTo(name,time){
  if(name===current)return;
  const previous=current;const action=actions[name];action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
  if(previous)action.crossFadeFrom(actions[previous],.045,false);
  current=name;transitions.push({from:previous,to:name,time});if(transitions.length>40)transitions.shift();
 }
 function advance(wall){
  if(!mixer)return;
  let dt=lastTime===null?0:clamp(wall.time-lastTime,0,.1);
  if(lastTime!==null&&wall.time<lastTime){mixer.stopAllAction();current=null;dt=0;}
  lastTime=wall.time;
  const motion=characterMotion(wall,current),name=motion.name;switchTo(name,wall.time);
  if(name==='walk'||name==='run')actions[name].setEffectiveTimeScale(clamp((wall.body.slipSpeed||Math.abs(wall.body.vx)||.05)/(name==='run'?.20:.065),.7,1.6));
  mixer.update(dt);
  if(motion.progress!==undefined){actions[name].time=clamp(motion.progress,0,1)*actions[name].getClip().duration;actions[name].paused=true;mixer.update(0);}
  const vx=wall.body.vx||0,target=Math.PI+clamp(vx*.15,-.28,.28)+.18;
  heading+=(target-heading)*(1-Math.exp(-dt*9));pivot.rotation.y=heading;
  pivot.rotation.z=name==='airborne'?clamp(-vx*.035,-.08,.08):0;
  model.updateMatrixWorld(true);
 }
 return{
  ready,
  get loaded(){return !!mixer&&!error;},
  draw(ctx,wall,foot,scale=1,project=null){
   if(!mixer||error)return false;
   advance(wall);renderer.render(scene,camera);
   // 72 CSS px at 390-wide: same neighbourhood as the previous visual rig,
   // with the supplied head/body ratio kept uniform in all three dimensions.
   const pixelsPerUnit=72*scale/sourceHeight,w=2.04*pixelsPerUnit,h=2.55*pixelsPerUnit;
   let x=foot.x-w/2,y=foot.y-2.35*pixelsPerUnit;
   // A loaded hang is anchored by the real handhold, not by imaginary soles.
   // Fixed bone lengths and uniform scale are retained throughout the transfer.
   if(project&&wall.grip&&wall.body.hands?.length===2){
    const hands=wall.body.hands.map(project),target={x:(hands[0].x+hands[1].x)/2,y:(hands[0].y+hands[1].y)/2};
    const a=model.getObjectByName('LHand').getWorldPosition(new THREE.Vector3()),b=model.getObjectByName('RHand').getWorldPosition(new THREE.Vector3()),center=a.add(b).multiplyScalar(.5);
    x+=target.x-(foot.x+center.x*pixelsPerUnit);y+=target.y-(foot.y-center.y*pixelsPerUnit);
   }
   drawnBounds={x,y,width:w,height:h,standingHeight:72*scale,view:'back',handAnchored:!!wall.grip&&wall.body.hands?.length===2,foot:{...foot}};
   ctx.save();ctx.fillStyle='rgba(28,36,22,.23)';ctx.beginPath();ctx.ellipse(foot.x,foot.y+1,7*scale,2*scale,0,0,Math.PI*2);ctx.fill();ctx.drawImage(surface,x,y,w,h);ctx.restore();return true;
  },
  get stats(){return {build:CHARACTER_BUILD,loaded:!!mixer&&!error,error,clip:current,clips:clips.map(c=>({name:c.name,duration:c.duration})),actionTimes:Object.fromEntries(Object.entries(actions).map(([n,a])=>[n,{time:a.time,weight:a.getEffectiveWeight(),running:a.isRunning()}])),jointCount:mesh?.skeleton.bones.length||0,sourceHeight,sourceMinY,bounds:drawnBounds,transitions:[...transitions]};},
  dispose(){renderer.dispose();model?.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose();m.dispose();}}});}
 };
}
