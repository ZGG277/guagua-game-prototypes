/** Software draw samples the same deformed high-resolution vertices.
 * Collision retains every triangle; 26 angular samples × four radial rings
 * bound fallback draw cost without flattening the cupped blade. */
export function softwareLeafIndices(){const out=[],n=130,at=(ring,i)=>1+(ring-1)*n+(i%n);for(let i=0;i<n;i+=5)out.push(0,at(2,i+5),at(2,i));for(let r=2;r<8;r+=2)for(let i=0;i<n;i+=5){const a=at(r,i),b=at(r,i+5),c=at(r+2,i),d=at(r+2,i+5);out.push(a,b,c,b,d,c);}return new Uint16Array(out);}
