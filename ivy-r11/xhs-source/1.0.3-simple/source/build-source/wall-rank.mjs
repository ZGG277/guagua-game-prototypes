import {createAutoRankSync} from './wall-auto-rank.mjs';
import {createRanks} from './wall-platform.mjs';
export const rankStatusText={
 unsupported:'排行榜暂不可用',unauthorized:'排行榜暂不可用',not_open:'排行榜暂不可用',
 preparing:'排行榜暂不可用',auth_service:'排行榜暂不可用',rate_limited:'排行榜暂不可用',error:'排行榜暂不可用'
};
export function myRankText(value,board){
 const score=n=>board===1?`第 ${n} 片`:`${Math.abs(n).toFixed(2)} 秒`;
 switch(value.status){
  case 'EXACT':return `我的名次 · 第 ${value.rank} 名 · ${score(value.score)}`;
  case 'OVER_LIMIT':return '我的名次 · 500 名以外';
  case 'NO_SCORE':case 'NOT_PARTICIPATING':return '我的名次 · 暂未上榜';
  default:return '我的名次 · —';
 }
}
export function createRankView({scope=window,getScore,onOpen,onClose,ranks:create=createRanks(scope),journal={}}){
 const ranks=create,$=id=>scope.document.getElementById(id),entry=$('rank-button'),coverEntry=$('cover-rank'),panel=$('rank-panel'),message=$('rank-message'),rows=$('rank-rows'),mine=$('my-rank');
 let request=0,pageRows=[],shown=0,selected=null,resultMode=false,unavailable=null,lastReadAt=-Infinity;
 const board=()=>Number($('rank-board').value),period=()=>$('rank-period').value;
 const format=(score,b)=>b===1?`第 ${score} 片`:`${Math.abs(score).toFixed(2)} 秒`;
 const auto=createAutoRankSync(ranks,{...journal,onChange(job){
  if(!selected||selected.runSequence!==job.runSequence||panel.hidden)return;
  if(job.status==='synced')void load({force:true});
  if(['unsupported','unauthorized','not_open'].includes(job.status))showUnavailable(job.status);
 }});
 function sync(){
  const score=selected||getScore();
  $('round-best').textContent=String(Math.max(1,score.highestLeaf));
  $('rank-close').textContent=resultMode?'再攀一次 ↗':'返回游戏';
 }
 function showUnavailable(status){
  request++;unavailable=status;lastReadAt=Date.now();
  rows.textContent='';pageRows=[];shown=0;$('rank-more').hidden=true;
  mine.textContent='我的名次 · —';message.textContent=rankStatusText[status]||rankStatusText.error;
 }
 function more(){
  const fragment=scope.document.createDocumentFragment(),end=Math.min(pageRows.length,shown+20),b=board();
  for(const row of pageRows.slice(shown,end)){
   if(!Number.isInteger(row.rank)||row.rank<1||!Number.isFinite(row.score))continue;
   const li=scope.document.createElement('li'),name=scope.document.createElement('span'),score=scope.document.createElement('b');
   name.textContent=`${row.rank}. ${typeof row.nickname==='string'&&row.nickname?row.nickname:'玩家'}`;score.textContent=format(row.score,b);li.append(name,score);fragment.append(li);
  }
  rows.append(fragment);shown=end;$('rank-more').hidden=shown>=pageRows.length;
 }
 async function load({force=false,recover=false}={}){
  const token=++request,b=board(),p=period();
  message.textContent='加载中…';mine.textContent='我的名次 · —';rows.textContent='';pageRows=[];shown=0;$('rank-more').hidden=true;sync();
  if(recover&&unavailable&&typeof ranks.retry==='function'){
   await ranks.retry();if(token!==request||panel.hidden)return;
  }
  let result;try{result=await ranks.list(b,p,{force});}catch{result={status:'error'};}
  if(token!==request||panel.hidden)return;
  lastReadAt=Date.now();
  if(result.status!=='ok'){showUnavailable(result.status);return;}
  unavailable=null;message.textContent=result.data.length?'':'暂无成绩';mine.textContent=myRankText(result.mine,b);
  pageRows=result.data;more();sync();
 }
 function open(score=null,ended=false){
  selected=Object.freeze({... (score||getScore())});resultMode=ended;onOpen();panel.hidden=false;panel.scrollTop=0;
  if(ended){$('rank-board').value='1';$('rank-period').value='all';}
  sync();
  if(unavailable&&Date.now()-lastReadAt<1200)showUnavailable(unavailable);
  else void load({recover:!!unavailable,force:!!unavailable});
 }
 function close(){request++;panel.hidden=true;onClose();}
 [entry,coverEntry].forEach(button=>button.addEventListener('click',()=>open()));
 $('rank-close').addEventListener('click',close);
 $('rank-more').addEventListener('click',more);
 $('rank-board').addEventListener('change',()=>void load());$('rank-period').addEventListener('change',()=>void load());
 return{ranks,showResult:score=>{open(score,true);auto.submitRound(score);},finishRound:score=>auto.submitRound(score),auto,open,close,sync};
}
