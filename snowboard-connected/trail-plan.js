import {routesAt} from './resort-network.js';
export const TRAIL_ENABLED=!!globalThis.location;
export const TRAIL_END=10008,CHECKPOINTS=[];
export const rollerAt=()=>({height:0,dx:0,dz:0,dxx:0,dxz:0,dzz:0});
export const trailCenter=(id,z)=>{const rs=routesAt(z);return(rs.find(r=>r.id===(id==='advanced'?'crest':'forest'))||rs[0]).x;};
// Kept only as a read-only compatibility surface for the existing journey API; no finish transition.
export class TrailRun{reset(){this.done=false;return this;}constructor(){this.reset();}snapshot(){return{done:false,continuous:true};}}
