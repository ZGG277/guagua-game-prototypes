/** A fall to the root ends one round. Lower-leaf catches do not. */
export function createRoundBoundary(scores) {
 let seenFalls=0;
 return {
  reset(falls=0){seenFalls=falls;},
  observe(wall){
   let finished=null;
   if(wall.falls>seenFalls){finished=Object.freeze({...scores.snapshot(),highestLeaf:Math.max(1,scores.snapshot().highestLeaf)});scores.reset();}
   seenFalls=wall.falls;
   return {finished,current:scores.observe(wall)};
  }
 };
}
