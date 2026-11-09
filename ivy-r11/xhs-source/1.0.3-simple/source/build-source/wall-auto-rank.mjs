import {rankScore} from './wall-platform.mjs';
export function createAutoRankSync(ranks,{read=()=>null,write=()=>{},now=()=>Date.now(),setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id),gap=30000,onChange=()=>{}}={}){
 const session=now().toString(36)+'-'+Math.random().toString(36).slice(2),jobs=new Map(),queue=new Map();let timer=null,running=false,lastSent=-Infinity;
 const date=stamp=>new Date(stamp+8*3600000).toISOString().slice(0,10);
 const key=(score,board)=>[session,score.runSequence,board].join(':');
 let journal=[];try{const v=JSON.parse(read()||'[]');if(Array.isArray(v))journal=v.slice(-20).map(j=>({...j,status:j.status==='sending'?'unknown':j.status}));}catch{}
 async function save(){try{return await write(JSON.stringify(journal.slice(-20)));}catch{return false;}}
 function notify(job){try{onChange({...job});}catch{}}
 function state(job,status){job.status=status;const i=journal.findIndex(j=>j.key===job.key);const receipt={key:job.key,board:job.board,score:job.value,day:job.day,status};if(i<0)journal.push(receipt);else journal[i]=receipt;const saved=save();notify(job);return saved;}
 function schedule(){if(timer!==null||running||!queue.size)return;timer=setTimer(()=>{timer=null;void drain();},Math.max(0,gap-(now()-lastSent)));}
 async function drain(){
  if(running)return;running=true;
  while(queue.size){
   if(now()-lastSent<gap){running=false;schedule();return;}
   const [board,job]=queue.entries().next().value;queue.delete(board);
   if(job.day!==date(now())){state(job,'expired');continue;}
   lastSent=now();const durable=await state(job,'sending');if(durable===false){state(job,'local_error');continue;}
   let result;try{result=await ranks.submit(job.score,{board});}catch{result={status:'unknown'};}state(job,result.status==='ok'?'synced':result.status);
  }
  running=false;
 }
 function submitRound(score){
  if(!score||!score.started)return;
  for(const board of [1,2]){
   const value=rankScore(score,board);if(value===null)continue;const identity=key(score,board);if(jobs.has(identity))continue;
   const job={key:identity,runSequence:score.runSequence,board,value,score:Object.freeze({...score}),day:date(now()),status:'queued'};jobs.set(identity,job);
   let previous=queue.get(board);if(previous&&previous.day!==job.day){state(previous,'expired');queue.delete(board);previous=null;}
   if(previous){if(previous.value>=value){state(job,'covered');continue;}state(previous,'covered');}
   queue.set(board,job);state(job,'queued');
  }
  schedule();
 }
 save();
 return{submitRound,status(score,board=1){return jobs.get(key(score,board))?.status||'not_finished';},dispose(){if(timer!==null)clearTimer(timer);timer=null;},session};
}
