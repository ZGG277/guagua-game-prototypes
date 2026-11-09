import {createRanks,rankScore} from './wall-platform.mjs';
export function createRankView({scope=window,getScore,onOpen,onClose}){
 const ranks=createRanks(scope),$=id=>document.getElementById(id),entry=$('rank-button'),panel=$('rank-panel'),message=$('rank-message'),rows=$('rank-rows'),mine=$('my-rank'),submit=$('rank-submit');
 let request=0,busy=false,pageRows=[],shown=0;const sent=new Set(),uncertain=new Set();
 const board=()=>Number($('rank-board').value),period=()=>$('rank-period').value;
 const fingerprint=s=>[s.runSequence,s.highestLeaf,s.summitSeconds].join(':');
 const format=(score,b)=>b===1?`第 ${score} 片`:`${Math.abs(score).toFixed(2)} 秒`;
 function sync(){const s=getScore(),key=fingerprint(s);$('rank-current').textContent=`本局已确认：第 ${s.highestLeaf} 片`+(s.completed?` · 登顶 ${s.summitSeconds.toFixed(2)} 秒`:' · 尚未登顶');submit.disabled=busy||!s.started||rankScore(s,board())===null||sent.has(key)||uncertain.has(key);}
 function hide(){entry.hidden=true;panel.hidden=true;onClose();$('rank-availability').textContent='排行榜暂不可用，个人纪录仍保留在本机';}
 function myText(v,b){switch(v.status){case'EXACT':return`我的名次：${v.rank} · ${format(v.score,b)}`;case'OVER_LIMIT':return'我的名次：500+';case'NO_SCORE':return'本期还没有成绩';case'NOT_PARTICIPATING':return'尚未参与本榜';default:return'排名暂不可用';}}
 function more(){const fragment=document.createDocumentFragment(),end=Math.min(pageRows.length,shown+20),b=board();
  for(const row of pageRows.slice(shown,end)){if(!Number.isFinite(row.rank)||!Number.isFinite(row.score))continue;const li=document.createElement('li'),name=document.createElement('span'),score=document.createElement('b');name.textContent=`${row.rank}. ${typeof row.nickname==='string'&&row.nickname?row.nickname:'玩家'}`;score.textContent=format(row.score,b);li.append(name,score);fragment.append(li);}rows.append(fragment);shown=end;$('rank-more').hidden=shown>=pageRows.length;
 }
 $('rank-more').addEventListener('click',more);
 async function load(){
  const token=++request,b=board();message.textContent='正在读取榜单…';rows.textContent='';mine.textContent='';pageRows=[];shown=0;$('rank-more').hidden=true;sync();
  const result=await ranks.list(b,period());if(token!==request||panel.hidden)return;
  if(result.status==='unavailable'){hide();return;}
  if(result.status!=='ok'){message.textContent=result.status==='preparing'?'榜单还在准备，请稍后再试':'榜单暂时读取失败，请稍后再试';return;}
  message.textContent=result.data.length?'':'还没有人上榜';mine.textContent=myText(result.mine,b);
  pageRows=result.data;more();
 }
 entry.addEventListener('click',()=>{onOpen();panel.hidden=false;void load();});
 $('rank-close').addEventListener('click',()=>{request++;panel.hidden=true;onClose();});
 $('rank-board').addEventListener('change',()=>void load());$('rank-period').addEventListener('change',()=>void load());$('rank-refresh').addEventListener('click',()=>void load());
 submit.addEventListener('click',async()=>{
  const score=getScore(),key=fingerprint(score);if(busy||!score.started||sent.has(key)||uncertain.has(key))return;
  busy=true;sync();message.textContent='正在提交本局成绩…';
  const result=await ranks.submit(score);busy=false;
  if(result.status==='unavailable'){hide();return;}
  if(result.status==='ok'){sent.add(key);await load();message.textContent='本局成绩已提交';}
  else if(result.status==='unknown'){uncertain.add(key);message.textContent='提交结果待确认，请稍后查看榜单；本局不会重复提交';}
  else message.textContent='成绩提交未成功，个人纪录已在本机保留';sync();
 });
 ranks.ready.then(ok=>{entry.hidden=!ok;$('rank-availability').textContent=ok?'排行榜由小红书提供；点击后可查看或提交本局成绩':'个人纪录保存在本机 · 当前环境不支持平台排行榜';});
 return{ranks,close(){request++;panel.hidden=true;},sync};
}
