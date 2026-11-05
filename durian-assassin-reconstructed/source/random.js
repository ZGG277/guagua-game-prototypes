export const LANDING={min:338,max:478,center:408};
export function nextRandom(state){state=(Math.imul(state,1664525)+1013904223)>>>0;return{state,value:state/4294967296}}
export function freshSeed(){const a=new Uint32Array(1);if(window.crypto?.getRandomValues){crypto.getRandomValues(a);return a[0]}return(Date.now()^Math.floor(Math.random()*4294967296))>>>0}
