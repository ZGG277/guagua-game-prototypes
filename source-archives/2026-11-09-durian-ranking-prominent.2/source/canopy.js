export const CANOPY_TOP=-1850;
const POSITIONS=[[394,-1330],[408,-1250],[422,-1170],[398,-1450],[412,-1380],[402,-1560],[418,-1510],[408,-1660],[380,-1280],[436,-1200],[388,-1440],[430,-1510],[378,-1600],[438,-1660],[352,-1320],[464,-1220],[338,-1180],[478,-1300],[348,-1530],[470,-1580]];
export const CANOPY_SLOTS=Object.freeze(POSITIONS.map(([x,y],i)=>Object.freeze({id:'fruit-'+(i+1),x,y,z:0,r:19})));
export class Canopy{
 constructor(){this.reset()}
 reset(){this.slots=CANOPY_SLOTS.map(p=>({...p,state:'hanging',generation:0}));this.renewals=[];this.selections=[];}
 eligible(radius=70){const remaining=this.slots.filter(p=>p.state==='hanging'),near=remaining.filter(p=>Math.abs(p.x-408)<=radius+1e-9);if(near.length)return near;if(!remaining.length)return[];const nearest=Math.min(...remaining.map(p=>Math.abs(p.x-408)));return remaining.filter(p=>Math.abs(p.x-408)<=nearest+1e-9);}
 select(value,radius=70){const choices=this.eligible(radius);if(!choices.length)throw Error('All 20 fruit are harvested');const p=choices[Math.min(choices.length-1,Math.floor(Math.max(0,value)*choices.length))];p.state='released';this.selections.push({id:p.id,generation:0});return p;}
 prepareNext(){return false;}
}
