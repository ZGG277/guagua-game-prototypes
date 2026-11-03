// Small deterministic tangent-space normal texture; no network textures or full-screen passes.
import * as T from './vendor/three.module.min.js';
export function applySnowLook(material){
 const n=64,data=new Uint8Array(n*n*4);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*4,r=Math.sin(x*1.71+y*2.37)*Math.sin(y*.83-x*.61);data[i]=128+Math.round(r*19);data[i+1]=128+Math.round(Math.cos(x*2.17+y*1.37)*16);data[i+2]=253;data[i+3]=255;}
 const texture=new T.DataTexture(data,n,n,T.RGBAFormat);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(550,320);texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
 material.normalMap=texture;material.normalScale.set(.14,.14);material.roughness=.68;material.metalness=.025;return texture;
}
