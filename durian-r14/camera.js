import{CANOPY_TOP}from'./canopy.js?v=r14';
export const SCREEN={width:640,height:600};
export function cameraFor(sim){
 const width=sim.viewport?.width||SCREEN.width,height=sim.viewport?.height||SCREEN.height;
 const gravity=sim.fruitGravity||600,time=Math.max(0,sim.time||0);
 // Frame the full initial drop, then continuously approach the catching action.
 // The floor stays anchored instead of sliding through a tall phone screen.
 const fullTop=sim.selectedFruitId||sim.round===0?CANOPY_TOP:-850;
 const origin=sim.dropOriginY??-850,u=Math.min(1,time/.8),ease=u*u*(3-2*u);
 const followed=Math.min(500,fullTop+(origin-fullTop)*ease+.5*gravity*time*time);
 const r=Math.max(0,Math.min(1,sim.returnProgress||0)),returnEase=r*r*(3-2*r);
 const zoomFor=fall=>Math.min(1.28,width/500,(height-140)/(550-fall+100));
 const followZoom=zoomFor(followed),fullZoom=zoomFor(fullTop);
 // Blend the actual zoom after clamping: return motion begins immediately,
 // instead of waiting for an interpolated fall height to leave the zoom cap.
 const zoom=r===0?followZoom:r===1?fullZoom:Math.exp(Math.log(followZoom)*(1-returnEase)+Math.log(fullZoom)*returnEase);
 return{width,height,x:330,y:550-(height/2-70)/zoom,zoom};
}
export function worldToScreen(p,c){return{x:(c.width||640)/2+(p.x-c.x)*c.zoom,y:(c.height||600)/2+(p.y-c.y)*c.zoom}}
export function screenToWorld(p,c){return{x:c.x+(p.x-(c.width||640)/2)/c.zoom,y:c.y+(p.y-(c.height||600)/2)/c.zoom}}
export function pointerDelta(a,b,c){return{x:(b.x-a.x)/c.zoom,y:(b.y-a.y)/c.zoom}}
