// Downward pull is a slingshot: pull right to launch left. Angle selects direction; displacement length selects power.
export function pullAim(dx, dy) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || dy <= 0 || Math.hypot(dx, dy) < 10) return 0;
  return Math.max(-1, Math.min(1, Math.atan2(-dx, dy) / (Math.PI / 3))) || 0;
}
export function cuePosition(x, y, width, height, avoid=null) {
  // The label sits above the finger, and stays readable at every viewport edge.
  const cue={x: Math.max(86, Math.min(width - 86, x)), y: Math.max(38, Math.min(height - 38, y - 72))};
  if(avoid&&Math.abs(cue.x-avoid.x)<110&&Math.abs(cue.y-avoid.y)<70)cue.y=Math.max(38,Math.min(height-38,avoid.y+(y>=avoid.y?100:-100)));
  return cue;
}

// Screen-space displacement, not accumulated path length. Retraction reduces force.
export function pullPower(dx, dy, height=750) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || dy <= 0) return 0;
  const fullPull=Math.max(90,Math.min(160,height*.22));
  return Math.max(0,Math.min(1,(Math.hypot(dx,dy)-10)/(fullPull-10)));
}

// All captions name launch direction; instructions explicitly name the inverse pull.
export function directionLabel(aim) {
  return Math.abs(aim)<.05?'↑ 直上跳':aim<0?'↖ 跳向左':'↗ 跳向右';
}
export function pullInstruction(aim) {
  return Math.abs(aim)<.05?'竖直向下拉':aim<0?'向右下拉':'向左下拉';
}
export function gestureVector(aim,power,height=750) {
  const angle=-Math.max(-1,Math.min(1,aim))*Math.PI/3;
  const fullPull=Math.max(90,Math.min(160,height*.22));
  const length=10+Math.max(0,Math.min(1,power))*(fullPull-10);
  return {dx:Math.sin(angle)*length,dy:Math.cos(angle)*length};
}
export function projectedArrow(origin,tip,length=70) {
  if(!origin||!tip||![origin.x,origin.y,tip.x,tip.y].every(Number.isFinite))return null;
  const dx=tip.x-origin.x,dy=tip.y-origin.y,n=Math.hypot(dx,dy);
  if(n<1e-8)return null;
  return {x1:origin.x,y1:origin.y,x2:origin.x+dx/n*length,y2:origin.y+dy/n*length};
}
