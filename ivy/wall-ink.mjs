/** r9 procedural ink/watercolour art. No remote images, asset service or photo filter.
 * The backdrop is a flat painting; interactive blades retain their original meshes.
 */
export const INK_STYLE = Object.freeze({version:'r9-ink',paper:'#e8e7d8',ink:'#344b40',wash:'#819782',accent:'#a76345'});
function random(seed){let value=seed>>>0;return()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};}
const leaf='M0 0 C-20 -4 -37 -22 -32 -36 C-19 -35 -17 -49 -17 -65 C-5 -55 0 -57 0 -83 C8 -63 12 -57 25 -62 C23 -43 26 -36 40 -37 C39 -17 20 -8 0 0Z';
/** Deterministic SVG means the same painted wall survives fallback/GPU switches.
 * Tall tile has quiet boundaries, while translucent blooms build irregular pigment.
 */
export function watercolorSVG(seed=9173){
 const rng=random(seed),marks=[],vines=[];
 for(let side=0;side<2;side++)for(let stem=0;stem<4;stem++){
  const x=side?650+rng()*230:20+rng()*230,y=80+rng()*250;
  vines.push(`<path d="M${x.toFixed(1)} 1770 C${(x-75).toFixed(1)} 1390 ${(x+85).toFixed(1)} 1160 ${x.toFixed(1)} 900 S${(x-130).toFixed(1)} 420 ${(x+30).toFixed(1)} ${y.toFixed(1)}" fill="none" stroke="#647766" stroke-width="${(1+rng()*2).toFixed(2)}" opacity=".17"/>`);
 }
 for(let i=0;i<64;i++){
  const side=i%2,x=side?550+rng()*410:-60+rng()*410,y=100+rng()*1590,scale=.6+rng()*2.1,rotate=-65+rng()*130,alpha=.11+rng()*.16;
  // Pigment blooms sit beyond blade silhouettes; not extra 3D/collision leaves.
  marks.push(`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotate.toFixed(1)}) scale(${scale.toFixed(2)})"><path d="${leaf}" fill="${i%3?'#718b77':'#667b74'}" opacity="${alpha.toFixed(2)}"/><path d="${leaf}" transform="translate(-2 1) scale(1.06)" fill="none" stroke="#829680" stroke-width="2.2" opacity=".08"/><path d="M0 0Q-3 -35 0 -76M-1 -33L-24 -36M-1 -38L27 -41" stroke="#526b59" stroke-width=".65" fill="none" opacity=".13"/></g>`);
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1800" viewBox="0 0 900 1800"><defs><filter id="wash" x="-12%" y="-8%" width="124%" height="116%"><feTurbulence type="fractalNoise" baseFrequency=".025" numOctaves="3" seed="19" result="grain"/><feDisplacementMap in="SourceGraphic" in2="grain" scale="9" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation=".6"/></filter><filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".68" numOctaves="3" stitchTiles="stitch" seed="7"/><feColorMatrix type="saturate" values="0"/></filter><radialGradient id="halo"><stop stop-color="#ede1b4" stop-opacity=".13"/><stop offset=".48" stop-color="#c6c9a8" stop-opacity=".3"/><stop offset=".64" stop-color="#d2d6bb" stop-opacity=".2"/><stop offset="1" stop-color="#e8e7d8" stop-opacity="0"/></radialGradient><linearGradient id="quiet" x1="0" x2="1"><stop stop-color="#e8e7d8" stop-opacity="0"/><stop offset=".43" stop-color="#f3f0e2" stop-opacity=".72"/><stop offset=".57" stop-color="#f3f0e2" stop-opacity=".72"/><stop offset="1" stop-color="#e8e7d8" stop-opacity="0"/></linearGradient></defs><rect width="900" height="1800" fill="${INK_STYLE.paper}"/><ellipse cx="390" cy="460" rx="530" ry="470" fill="url(#halo)"/><ellipse cx="500" cy="1310" rx="520" ry="470" fill="url(#halo)"/><g filter="url(#wash)">${vines.join('')}${marks.join('')}</g><rect width="900" height="1800" fill="url(#quiet)"/><rect width="900" height="1800" filter="url(#paper)" opacity=".065" style="mix-blend-mode:multiply"/></svg>`;
}
export function watercolorDataURL(seed){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(watercolorSVG(seed));}
/** Retains existing vein variation and dark chlorophyll, but mutes saturation and
 * adds stable fine pigment granulation. Shared by GPU and software albedo. */
export function inkLeafPixel(rgb,u=0,v=0,under=false){
 const gray=rgb[0]*.24+rgb[1]*.6+rgb[2]*.16;
 const granulation=Math.sin(u*283+Math.sin(v*67))*Math.cos(v*317)*2.1;
 return rgb.map((c,i)=>Math.max(0,Math.min(255,Math.round(c*.6+gray*.4+(under?9:5)+(i===2?4:0)+granulation))));
}
