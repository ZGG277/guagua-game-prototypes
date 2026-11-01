/** Blade shell only: the original top is the sole collision surface.
 * Thickness goes vertically below it, never enlarging the support footprint. */
import {mesh} from './lab-physics.mjs';
export const BLADE_THICKNESS=.010;
export function bladeShell(top,scale=1,stride=1){
 const bottom=top.slice(),rim=new Float32Array(mesh.boundary.length/stride*18);
 for(let i=1;i<bottom.length;i+=3)bottom[i]-=BLADE_THICKNESS*scale;
 let out=0;
 for(let k=0;k<mesh.boundary.length;k+=stride){
  const a=mesh.boundary[k]*3,b=mesh.boundary[(k+stride)%mesh.boundary.length]*3;
  for(const [p,id] of [[top,a],[bottom,a],[top,b],[top,b],[bottom,a],[bottom,b]])for(let d=0;d<3;d++)rim[out++]=p[id+d];
 }
 return {bottom,rim};
}
export function leafRoughness(u,v){return .64+.17*(.5+.5*Math.sin(u*19+v*7)*Math.sin(v*23-u*4));}
/** Software is an explicit low-amplitude wax approximation, not a PBR render. */
export function waxSheen(normalDotHalf,u,v){return .13*Math.pow(Math.max(0,normalDotHalf),7)*(1-(leafRoughness(u,v)-.64)*2.3);}
export function leafPixel(r,g,b,underside=false){
 const luminance=.25*r+.62*g+.13*b;
 // Compressed contrast embeds the bright veins rather than raising yellow ribs.
 const detail=(luminance-105)*.22;
 return underside?[58+detail*.5,79+detail*.65,43+detail*.5]:[29+detail*.75,66+detail,36+detail*.55];
}
export function petiolePoints(l){
 const deflection=(l.state.bend-.26)*.065;
 return [[l.x-.22,l.y-.18,-.36],[l.x-.13,l.y-.085-deflection,-.10],[l.x-.045,l.y-.018-deflection*.65,l.z-.07],[l.x,l.y,l.z]];
}
