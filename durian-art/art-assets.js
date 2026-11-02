// Generated-art images are visual only. No image bounds enter gameplay physics.
export const art={environment:null,tree:null,fruit:null};
const names={environment:'environment.webp',tree:'tree.png',fruit:'fruit.png'};
export const artReady=Promise.all(Object.entries(names).map(([key,name])=>new Promise(resolve=>{if(typeof Image==='undefined'){resolve(false);return;}const img=new Image();img.onload=()=>{art[key]=img;resolve(true)};img.onerror=()=>resolve(false);img.src=new URL('./assets/'+name,import.meta.url).href;})));
export function drawOrchard(ctx){if(!art.environment||!art.tree)return false;ctx.fillStyle='#f1dfb5';ctx.fillRect(-1800,-1800,4000,4000);ctx.drawImage(art.environment,-900,-650,2400,1600);const scale=1650/1523;ctx.drawImage(art.tree,610-488*scale,510-1512*scale,985*scale,1523*scale);return true;}
// Production crop is pivoted on fruit body mass, not the stem-inclusive image center.
export function drawFruitSprite(ctx,obj,small=1){if(!art.fruit)return false;const x=obj.x+(obj.z||0)*.48,y=obj.y-(obj.z||0)*.24;ctx.save();ctx.translate(x,y);ctx.rotate((obj.x-408)*.017);ctx.scale(small,small);const scale=25/227.167;ctx.drawImage(art.fruit,-235.468*scale,-290.075*scale,467*scale,512*scale);ctx.restore();return true;}
