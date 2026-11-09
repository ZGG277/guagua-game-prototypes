/** Chrome 61 fallback for the simulation's structured data (including typed meshes).
 * Functions/DOM are not state. Preserve cycles and aliasing just as structuredClone does. */
export function cloneState(value){
 if(typeof structuredClone==='function')return structuredClone(value);
 const seen=new Map();
 function copy(v){
  if(v===null||typeof v!=='object')return v;
  if(seen.has(v))return seen.get(v);
  let out;
  if(v instanceof ArrayBuffer)out=v.slice(0);
  else if(ArrayBuffer.isView(v)){const buffer=copy(v.buffer);out=v instanceof DataView?new DataView(buffer,v.byteOffset,v.byteLength):new v.constructor(buffer,v.byteOffset,v.length);}
  else if(v instanceof Date)out=new Date(v.getTime());
  else if(v instanceof Map){out=new Map();seen.set(v,out);v.forEach((x,k)=>out.set(copy(k),copy(x)));return out;}
  else if(v instanceof Set){out=new Set();seen.set(v,out);v.forEach(x=>out.add(copy(x)));return out;}
  else{out=Array.isArray(v)?[]:{};seen.set(v,out);Object.keys(v).forEach(k=>{out[k]=copy(v[k]);});return out;}
  seen.set(v,out);return out;
 }
 return copy(value);
}
