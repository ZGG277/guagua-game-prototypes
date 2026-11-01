export const SCREEN={width:640,height:600};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function cameraFor(sim){const t=clamp(sim.time||0,0,1.96),fall=-850+300*t*t;return{x:340,y:Math.min(300,(fall+550)/2),zoom:clamp(600/(550-fall+180),.38,1.02)}}
export function worldToScreen(p,c){return{x:320+(p.x-c.x)*c.zoom,y:300+(p.y-c.y)*c.zoom}}
export function screenToWorld(p,c){return{x:c.x+(p.x-320)/c.zoom,y:c.y+(p.y-300)/c.zoom}}
export function pointerDelta(a,b,c){return{x:(b.x-a.x)/c.zoom,y:(b.y-a.y)/c.zoom}}
