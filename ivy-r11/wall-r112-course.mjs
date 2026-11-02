/** R11.2 deterministic 100-support course revision. No new platforms, catches,
 * collision margins, forces or checkpoints. Input consists of fresh R11 leaves. */
export function reviseCourse(leaves){
 if(leaves.length!==100)throw new Error('R11.2 requires exactly100 numbered leaves');
 const at=(l,x)=>{l.x=x-Math.tan(l.rotation)*(1-l.z);delete l._positions;delete l._pendingGeometry;};
 for(const[id,x]of [[0,0],[1,0],[2,-.65],[3,.20]])at(leaves[id],x);
 for(let id=19;id<100;id++){
  const l=leaves[id],phase=(id-19)%4,late=Math.max(0,(id-49)/50),anchor=phase===0;
  const xs=[.4,-.83,-.4,.83],center=xs[phase]+.08*Math.sin(id*.47);
  l.scale=anchor?.67-.16*late:.60-.15*late+.018*Math.sin(id*1.71);
  // Keep the travel lane at the same local blade depth: shrinking the blade
  // must shrink the actual landing band, not move it onto a wider lobe.
  l.z=1-l.scale*1.6;at(l,center);
  // Occasional small outer blade after50: longer lateral move, not a timed trap.
  if(id>=53&&id%12===6){l.scale=.49-.065*late;l.z=1-l.scale*1.6;at(l,1.20);l.r112Challenge=true;}
  l.r112RecoveryLane=anchor;
 }
 return leaves;
}
