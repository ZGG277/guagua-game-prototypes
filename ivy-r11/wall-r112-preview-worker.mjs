// Exact isolated new-rules preview, including bounded edge-rescue states.
import{WallR112}from'./wall-r112-physics.mjs?v=20261102-edge-r11-2';
self.onmessage=({data})=>{try{const wall=Object.assign(Object.create(WallR112.prototype),data.state);self.postMessage({token:data.token,preview:wall.previewRelease({power:data.power,aim:data.aim})});}catch(error){self.postMessage({token:data.token,error:String(error.message||error)});}};
