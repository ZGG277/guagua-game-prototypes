// Run the exact release-now replay off the UI thread. No network, RNG, or writes.
import {Wall} from './wall-physics.mjs?v=20261101-cling-r11';
self.onmessage=({data})=>{
 try{
  const wall=Object.assign(Object.create(Wall.prototype),data.state);
  self.postMessage({token:data.token,preview:wall.previewRelease({power:data.power,aim:data.aim})});
 }catch(error){self.postMessage({token:data.token,error:String(error.message||error)});}
};
