/** Persistent world-space fruit. Selection never moves the tree or its fruit. */
export const CANOPY_TOP=-1850;
export const CANOPY_SLOTS=Object.freeze([
 ['center-left',394,-1330],['center',408,-1250],['center-right',422,-1170],
 ['inner-left',380,-1280],['inner-right',436,-1200],['outer-left',352,-1320],
 ['outer-right',464,-1220],['edge-left',338,-1180],['edge-right',478,-1300],
].map(([id,x,y])=>Object.freeze({id,x,y,z:0,r:19})));
export class Canopy {
 constructor(){this.reset()}
 reset(){this.slots=CANOPY_SLOTS.map(p=>({...p,state:'hanging',generation:0}));this.renewals=[];this.selections=[];}
 eligible(radius=70){return this.slots.filter(p=>p.state==='hanging'&&Math.abs(p.x-408)<=radius+1e-9)}
 select(value,radius=70){const choices=this.eligible(radius);if(!choices.length)throw Error('No reachable hanging fruit; renew only after the previous harvest settles.');const p=choices[Math.min(choices.length-1,Math.floor(Math.max(0,value)*choices.length))];p.state='released';this.selections.push({id:p.id,generation:p.generation});return p;}
 prepareNext(radius=70){if(this.eligible(radius).length)return false;const renewed=this.slots.filter(p=>p.state==='released'&&Math.abs(p.x-408)<=radius+1e-9);for(const p of renewed){p.state='hanging';p.generation++;}this.renewals.push({ids:renewed.map(p=>p.id),generations:renewed.map(p=>p.generation),reason:'reachable crop exhausted after settlement'});return !!renewed.length;}
}
