/* 画布、缩放、固定步长主循环 */

const W=960, H=540, GROUND=480, STEP=1/60;

const G={
  state:'title',
  frame:0,
  slow:0,
  dpr:1,
  scale:1,
  time:0,
  reduced:false
};

const stageEl=document.getElementById('stage');
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');

let acc=0, lastTs=0;
let loopStarted=false;

function clamp(v,a,b){return v<a?a:(v>b?b:v);}
function lerp(a,b,t){return a+(b-a)*t;}
function rand(a,b){return a+Math.random()*(b-a);}
function chance(p){return Math.random()<p;}
function overlap(a,b){
  return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;
}
function nowMs(){return performance.now();}

function layout(){
  const vw=window.innerWidth, vh=window.innerHeight;
  const s=Math.min(vw/W, vh/H);
  G.scale=s;
  const ox=Math.round((vw-W*s)/2), oy=Math.round((vh-H*s)/2);
  stageEl.style.transform=`translate(${ox}px,${oy}px) scale(${s})`;

  const raw=Math.min(window.devicePixelRatio||1, 2);
  G.dpr=raw;
  canvas.width=Math.round(W*raw);
  canvas.height=Math.round(H*raw);
  canvas.style.width=W+'px';
  canvas.style.height=H+'px';
  ctx.setTransform(raw,0,0,raw,0,0);
  ctx.imageSmoothingEnabled=true;
}

function requestStep(){
  if(typeof worldStep==='function') worldStep(STEP);
}

function loop(ts){
  if(!lastTs) lastTs=ts;
  let dt=(ts-lastTs)/1000;
  lastTs=ts;
  if(dt>0.05) dt=0.05;
  if(dt<0) dt=0;

  if(G.state==='battle' || G.state==='intro' || G.state==='ko'){
    acc+=dt/(G.slow>0?3:1);
    let guard=0;
    while(acc>=STEP && guard<6){
      requestStep();
      acc-=STEP;
      guard++;
    }
    if(guard>=6) acc=0;
  }else{
    acc=0;
    if(typeof idleStep==='function') idleStep(dt);
  }

  G.frame++;
  G.time+=dt;
  if(typeof renderWorld==='function') renderWorld();
  requestAnimationFrame(loop);
}

function startLoop(){
  if(loopStarted) return;
  loopStarted=true;
  requestAnimationFrame(loop);
}

window.addEventListener('resize',layout);

(async function initCore(){
  layout();
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    G.reduced=true;
  }
  try{ await document.fonts.ready; }catch(e){}
})();
