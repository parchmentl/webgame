/* 对战核心：角色状态机、判定、投技、回合流程 */

const TIER={LP:0,LK:1,HP:2,HK:3};

const Match={
  active:false,
  chars:[0,1],
  stage:STAGES[0],
  round:1,
  wins:[0,0],
  perfects:[0,0],
  timer:99*60,
  p1:null,
  p2:null,
  stats:[null,null],
  projectiles:[],
  walls:[],
  fx:[],
  carry:null,
  introT:0,
  koT:0,
  koWinner:-1,
  koType:'',
  draw:false,
  hitstop:0,
  freeze:0,
  cutin:0,
  shake:0,
  shakeMag:0,
  flash:0,
  finished:false
};

function newStats(){return {dmg:0,hits:0,blocks:0,maxCombo:0};}

function makeFighter(charIdx,pi,x,facing,stats){
  const c=CHARS[charIdx];
  return {
    ci:charIdx, char:c, pi, p:PLAYERS[pi],
    x, y:0, vx:0, vy:0, facing,
    hp:1000, hpGhost:1000, gauge:0, guard:0, stun:0,
    maxT:0, superGlow:0, slowT:0,
    state:'idle', st:0, mt:0, move:null, mvKey:'',
    hitDone:false, hitCount:0, lastHitMt:-99, connected:false,
    normTier:-1, armorHits:0, invulnT:0, crouching:false,
    comboHits:0, comboT:0, airAtkUsed:false, launched:false,
    jumpF:0, shortCut:false, jumped:false, techRoll:false, bounceReady:false,
    throwTarget:null, throwTech:false, throwDmgDone:false,
    stats, animSeed:Math.random()*10
  };
}

function resetInputRound(p){
  p.log=[];
  p.dir=5;
  p.dirHist=[{d:5,f:p.frame}];
  p.upHeld=p.heldDirKey(p.dirKeys.U);
  p.chargeT=0;
  p.chargeReadyF=-999;
  p.dashReq=null;
  p.lastF4=-999;
  p.lastF6=-999;
  p.upTapF=-999;
  p.btnPrev=new Set();
}

function startMatch(p1Idx,p2Idx,stageIdx){
  AudioSys.unlock();
  Match.chars=[p1Idx,p2Idx];
  Match.stage=STAGES[stageIdx]||STAGES[0];
  Match.wins=[0,0];
  Match.perfects=[0,0];
  Match.round=1;
  Match.stats=[newStats(),newStats()];
  Match.carry=null;
  Match.draw=false;
  Match.koWinner=-1;
  Match.perfectRound=false;
  startRound(false);
  if(typeof UI!=='undefined' && UI.hideAll) UI.hideAll();
}

function startRound(replay){
  const g1=Match.p1?Match.p1.gauge:0;
  const g2=Match.p2?Match.p2.gauge:0;
  Match.p1=makeFighter(Match.chars[0],0,240,1,Match.stats[0]);
  Match.p2=makeFighter(Match.chars[1],1,720,-1,Match.stats[1]);
  Match.p1.gauge=g1;
  Match.p2.gauge=g2;
  Match.projectiles=[];
  Match.walls=[];
  Match.fx=[];
  Match.timer=99*60;
  Match.introT=0;
  Match.koT=0;
  Match.koWinner=-1;
  Match.koType='';
  Match.hitstop=0;
  Match.freeze=0;
  Match.cutin=0;
  Match.shake=0;
  Match.flash=0;
  Match.finished=false;
  Match.perfectRound=false;
  G.slow=0;
  G.state='intro';
  resetInputRound(P1);
  resetInputRound(P2);
  P1.facing=1;
  P2.facing=-1;
  AudioSys.startBgm(Match.stage.id);
}

function enterResult(w){
  G.state='result';
  AudioSys.stopBgm();
  const data={
    winner:w,
    wins:Match.wins.slice(),
    perfects:Match.perfects.slice(),
    stats:[
      Object.assign({},Match.stats[0]),
      Object.assign({},Match.stats[1])
    ],
    chars:Match.chars.slice(),
    round:Match.round
  };
  if(typeof UI!=='undefined' && UI.showResult) UI.showResult(data);
}

/* ---------- 判定盒 ---------- */

function moveBox(f,def){
  const b=def.box;
  const left=f.facing>0? f.x+b.x : f.x-b.x-b.w;
  const bottom=GROUND-f.y-b.y;
  return {x:left,y:bottom-b.h,w:b.w,h:b.h};
}
function hurtbox(f){
  if(f.state==='knockdown'||f.state==='ko'){
    return {x:f.x-52,y:GROUND-f.y-40,w:104,h:40};
  }
  if(f.state==='thrown') return {x:f.x-40,y:GROUND-f.y-120,w:80,h:120};
  const crouch=(f.crouching&&f.y===0);
  const h=f.y>0?170:(crouch?140:210);
  const w=crouch?86:70;
  return {x:f.x-w/2,y:GROUND-f.y-h,w,h};
}
function isInvuln(f){
  if(f.invulnT>0) return true;
  if(f.state==='roll'&&f.mt<=20) return true;
  if(f.state==='backdash'&&f.mt<=8) return true;
  if(f.state==='attack'&&f.move&&f.move.inv&&f.mt>=f.move.inv.s&&f.mt<=f.move.inv.e) return true;
  return false;
}

/* ---------- 特效 ---------- */
function addFx(o){
  Match.fx.push(o);
  if(Match.fx.length>400) Match.fx.shift();
}
function spark(x,y,color,size){
  addFx({kind:'spark',x,y,t:14,life:14,color,size:size||10,vx:0,vy:0});
  for(let i=0;i<5;i++){
    addFx({kind:'bit',x,y,t:18,life:18,color,size:3,
      vx:rand(-4,4),vy:rand(-4,2),rot:rand(0,6.28)});
  }
}
function dust(x,y){
  for(let i=0;i<3;i++){
    addFx({kind:'dust',x:x+rand(-14,14),y,t:20,life:20,size:rand(4,9),vx:rand(-1.5,1.5),vy:rand(-1,-0.2)});
  }
}
function ring(x,y,color,size){
  addFx({kind:'ring',x,y,t:16,life:16,color,size:size||30});
}
function popText(txt,x,y,color,size){
  addFx({kind:'text',x,y,txt,t:40,life:40,color,size:size||22,vy:-1.2});
}
function updateFx(){
  for(let i=Match.fx.length-1;i>=0;i--){
    const e=Match.fx[i];
    e.t--;
    if(e.kind!=='text'&&e.kind!=='ring'&&e.kind!=='spark'){
      e.x+=e.vx||0;
      e.y+=e.vy||0;
      if(e.kind==='bit') e.vy=(e.vy||0)+0.25;
    }
    if(e.kind==='text') e.y+=e.vy||0;
    if(e.t<=0) Match.fx.splice(i,1);
  }
  if(Match.cutin>0) Match.cutin--;
  if(Match.flash>0) Match.flash--;
  if(Match.shake>0){
    Match.shake--;
    if(Match.shake===0) Match.shakeMag=0;
  }
}

/* ---------- 行动与出招 ---------- */

function costOf(f,def){
  if(def.sdm) return f.maxT>0?100:200;
  if(def.ex&&f.maxT>0) return 0;
  return def.cost||0;
}

function startMove(f,key,def){
  const cost=costOf(f,def);
  if(cost>f.gauge) return false;
  if(cost>0) f.gauge-=cost;
  f.state='attack';
  f.mvKey=key;
  f.move=def;
  f.mt=0;
  f.hitDone=false;
  f.hitCount=0;
  f.lastHitMt=-99;
  f.connected=false;
  f.invulnT=0;
  f.armorHits=def.armor||0;
  f.crouching=def.level==='low';
  f.normTier=-1;
  if(def.freeze){
    Match.freeze=def.freeze;
    Match.cutin=45;
    f.superGlow=80;
    Match.shake=16;
    Match.shakeMag=8;
    Match.flash=4;
    AudioSys.play('super');
  }else if(def.kind==='stance'){
    AudioSys.play('block');
  }else if(def.kind==='wall'){
    AudioSys.play('wall');
  }else{
    AudioSys.play(def.dmg>=70?'whooshH':'whooshL');
  }
  return true;
}

function tryNormals(f){
  const p=f.p;
  const air=f.y>0;
  const crouch=!air&&p.downHeld();
  const table=air?NORMALS.air:(crouch?NORMALS.crouch:NORMALS.stand);
  if(air&&f.airAtkUsed) return false;
  for(const b of ['LP','LK','HP','HK']){
    if(!p.consume(b,8)) continue;
    let def=table[b];
    if(crouch&&f.char.moves['2'+b]) def=f.char.moves['2'+b];
    startMove(f,b,def);
    f.normTier=TIER[b];
    if(air) f.airAtkUsed=true;
    return true;
  }
  return false;
}

function tryChainNormals(f){
  if(f.normTier<0) return false;
  const p=f.p;
  const table=f.y>0?NORMALS.air:(p.downHeld()?NORMALS.crouch:NORMALS.stand);
  for(const b of ['LP','LK','HP','HK']){
    if(TIER[b]<=f.normTier) continue;
    if(!p.fresh(b,6)) continue;
    p.consume(b,6);
    let def=table[b];
    if(f.y===0&&p.downHeld()&&f.char.moves['2'+b]) def=f.char.moves['2'+b];
    startMove(f,b,def);
    f.normTier=TIER[b];
    return true;
  }
  return false;
}

function cmdsFor(ch){
  if(ch._cmds) return ch._cmds;
  const list=[];
  for(const key of Object.keys(ch.moves)){
    if(/^c[346](LP|LK|HP|HK)$/i.test(key)){
      list.push({key,dir:+key[1],btn:key.slice(2).toUpperCase(),def:ch.moves[key]});
    }
  }
  ch._cmds=list;
  return list;
}

function tryCommandNormal(f){
  const list=cmdsFor(f.char);
  if(!list.length) return false;
  const d=f.p.dirRel();
  for(const c of list){
    if(d!==c.dir) continue;
    if(!f.p.fresh(c.btn,8)) continue;
    f.p.consume(c.btn,8);
    startMove(f,c.key,c.def);
    return true;
  }
  return false;
}

function specsFor(ch){
  if(ch._specs) return ch._specs;
  let list=[];
  if(ch.id==='yan'){
    list=[
      ['623P','623PP',[6,2,3],'P',false],
      ['214K','214KK',[2,1,4],'K',false],
      ['236P','236PP',[2,3,6],'P',false]
    ];
  }else if(ch.id==='lei'){
    list=[
      ['623K','623KK',[6,2,3],'K',false],
      ['214P','214PP',[2,1,4],'P',false],
      ['236K','236KK',[2,3,6],'K',false]
    ];
  }else if(ch.id==='rock'){
    list=[
      ['63214P','63214PP',[6,3,2,1,4],'P',false],
      ['46P','46PP',null,'P',true],
      ['214P','214PP',[2,1,4],'P',false]
    ];
  }else{
    list=[
      ['214K','214KK',[2,1,4],'K',false],
      ['214P','214PP',[2,1,4],'P',false],
      ['236P','236PP',[2,3,6],'P',false]
    ];
  }
  ch._specs=list;
  return list;
}

function trySpecials(f){
  const p=f.p;
  for(const spec of specsFor(f.char)){
    const [nk,ek,seq,fam,charge]=spec;
    const nd=f.char.moves[nk];
    if(!nd) continue;
    if(charge){
      const famBtns=fam==='P'?['LP','HP']:['LK','HK'];
      if(!famBtns.some(b=>p.fresh(b,6))) continue;
      if(!p.takeCharge()) continue;
    }else if(!p.motion(seq,seq.length>=5?10:12,46)){
      continue;
    }
    const ed=ek?f.char.moves[ek]:null;
    if(ed && f.gauge>=costOf(f,ed) && p.familyPresses(fam)){
      if(startMove(f,ek,ed)) return true;
    }
    if(f.gauge>=costOf(f,nd)){
      const ba=fam==='P'?'LP':'LK';
      const bb=fam==='P'?'HP':'HK';
      if(p.consume(ba,8)||p.consume(bb,8)){
        if(startMove(f,nk,nd)) return true;
      }
    }
  }
  return false;
}

function superKeys(ch){
  if(ch._superKeys) return ch._superKeys;
  const keys=Object.keys(ch.moves).filter(k=>k.indexOf('236236')===0);
  const normal=keys.find(k=>!ch.moves[k].sdm)||null;
  const sdm=keys.find(k=>ch.moves[k].sdm)||null;
  ch._superKeys={normal,sdm};
  return ch._superKeys;
}

function trySupers(f){
  if(f.y>0) return false;
  if(!f.p.motion([2,3,6,2,3,6],14,60)) return false;
  const sk=superKeys(f.char);
  const nd=sk.normal?f.char.moves[sk.normal]:null;
  const sd=sk.sdm?f.char.moves[sk.sdm]:null;
  const fam=sk.normal?sk.normal.slice(-1):'P';
  if(sd && f.gauge>=costOf(f,sd) && f.p.familyPresses(fam)){
    if(startMove(f,sk.sdm,sd)) return true;
  }
  if(nd && f.gauge>=costOf(f,nd)){
    const ba=fam==='P'?'LP':'LK';
    const bb=fam==='P'?'HP':'HK';
    if(f.p.consume(ba,8)||f.p.consume(bb,8)){
      if(startMove(f,sk.normal,nd)) return true;
    }
  }
  return false;
}

function tryAirSpecial(f){
  const def=f.char.moves['air214K'];
  if(!def) return false;
  const ed=f.char.moves['air214KK'];
  if(!f.p.motion([2,1,4],12,46)) return false;
  if(ed && f.gauge>=costOf(f,ed) && f.p.familyPresses('K')){
    if(startMove(f,'air214KK',ed)) return true;
  }
  if(f.gauge>=costOf(f,def) && (f.p.consume('LK',8)||f.p.consume('HK',8))){
    if(startMove(f,'air214K',def)) return true;
  }
  return false;
}

function jump(f){
  const p=f.p;
  const d=p.dirRel();
  f.state='air';
  f.vy=f.char.speed.jumpV;
  f.y=0.01;
  f.airAtkUsed=false;
  f.jumpF=0;
  f.shortCut=false;
  f.jumped=true;
  const fwd=d===6||d===9;
  const back=d===4||d===7;
  f.vx=fwd?f.char.speed.jumpX*f.facing:(back?-f.char.speed.jumpX*f.facing:0);
  AudioSys.play('jump');
  dust(f.x,GROUND);
}

function superJump(f){
  f.state='air';
  f.vy=f.char.speed.jumpV*1.25;
  f.y=0.01;
  f.airAtkUsed=false;
  f.jumpF=0;
  f.shortCut=true;
  f.jumped=true;
  f.vx=f.facing*f.char.speed.jumpX*1.35;
  AudioSys.play('jump');
  ring(f.x,GROUND-20,'#ffd76a',28);
  dust(f.x,GROUND);
}

function tryActions(f,opp){
  const p=f.p;
  if(f.state==='dizzy'){
    if(f.st>60 && p.consumeAny(4)) f.st=Math.max(60,f.st-3);
    return;
  }
  if(f.state==='blockstun'){
    if(f.gauge>=100&&(p.consume('BLOW',6)||p.consume('ROLL',6))){
      f.gauge-=100;
      f.state='roll';
      f.mt=0;
      f.vx=f.facing*5;
      f.st=0;
      ring(f.x,GROUND-90,'#57e6ff',40);
      AudioSys.play('gc');
    }
    return;
  }
  if(f.state==='attack'){
    const def=f.move;
    if(!def||!f.connected) return;
    if(def.kind==='super'||def.kind==='stance'||f.mvKey==='_throw') return;
    if(f.mt<def.startup) return;
    if(trySupers(f)) return;
    if(trySpecials(f)) return;
    if(tryCommandNormal(f)) return;
    if(tryChainNormals(f)) return;
    return;
  }
  if(f.state==='dash'){
    if(f.mt<6) return;
    if(p.upTap(6)){ superJump(f); return; }
    if(trySupers(f)) return;
    if(trySpecials(f)) return;
    if(tryCommandNormal(f)) return;
    if(tryNormals(f)) return;
    return;
  }
  if(f.state==='hitstun'&&f.y>0&&f.p.takeThrow()) f.techRoll=true;
  if(f.state!=='idle'&&f.state!=='walk'&&f.state!=='crouch'&&f.state!=='air') return;

  if(f.y>0){
    if(trySupers(f)) return;
    if(tryAirSpecial(f)) return;
    if(tryNormals(f)) return;
    return;
  }

  if(f.gauge>=100&&f.maxT<=0&&p.takeMax()){
    f.gauge-=100;
    f.maxT=600;
    f.superGlow=40;
    Match.flash=3;
    Match.shake=8;
    Match.shakeMag=4;
    AudioSys.play('max');
    popText('MAX',f.x,GROUND-260,'#ffd76a',26);
    return;
  }
  if(trySupers(f)) return;
  if(trySpecials(f)) return;
  if(Math.abs(opp.x-f.x)<=70&&opp.y===0&&!isInvuln(opp)&&p.takeThrow()){
    beginThrow(f,opp,f.char.moves.throwMove,true);
    return;
  }
  if(tryCommandNormal(f)) return;
  if(tryNormals(f)) return;
  if(p.fresh('BLOW',8)){
    p.consume('BLOW',8);
    startMove(f,'blow',COMMON.blow);
    return;
  }
  if(p.consume('ROLL',8)){
    f.state='roll';
    f.mt=0;
    const rd=p.dirRel();
    f.vx=(rd===4||rd===7||rd===1?-1:1)*f.facing*5.2;
    f.st=0;
    AudioSys.play('roll');
    return;
  }
  const dash=p.takeDash();
  if(dash==='f'){
    f.state='dash';
    f.mt=0;
    f.vx=f.facing*f.char.speed.dash;
    AudioSys.play('dash');
    return;
  }
  if(dash==='b'){
    f.state='backdash';
    f.mt=0;
    f.vx=-f.facing*f.char.speed.dash*0.9;
    f.invulnT=8;
    AudioSys.play('dash');
    return;
  }
  if(p.upTap(6)) jump(f);
}

/* ---------- 投技 ---------- */

function beginThrow(f,vic,def,techable){
  f.state='attack';
  f.move=def;
  f.mvKey='_throw';
  f.mt=0;
  f.hitDone=true;
  f.connected=true;
  f.throwTarget=vic;
  f.throwTech=techable;
  f.throwDmgDone=false;
  f.vx=0;
  vic.state='thrown';
  vic.st=999;
  vic.vx=0;
  vic.vy=0;
  vic.y=0;
  vic.move=null;
  vic.launched=false;
  vic.x=f.x+f.facing*48;
  Match.hitstop=6;
  AudioSys.play('throw');
}

function endThrow(f){
  f.state='idle';
  f.move=null;
  f.mvKey='';
  f.mt=0;
  f.throwTarget=null;
}

function stepThrow(f,vic){
  const def=f.move;
  f.mt++;
  vic.x=f.x+f.facing*48;
  vic.y=0;
  vic.facing=-f.facing;
  if(f.mt<=10&&f.throwTech&&vic.p.takeThrow()){
    endThrow(f);
    vic.state='idle';
    vic.st=0;
    vic.vx=-f.facing*4.5;
    f.vx=-f.facing*3;
    popText('TECH',vic.x,GROUND-220,'#7af2ff',24);
    AudioSys.play('tech');
    return;
  }
  if(f.mt===12&&!f.throwDmgDone){
    f.throwDmgDone=true;
    applyThrowDamage(f,vic,def);
  }
  if(f.mt>=30){
    if(vic.state==='thrown'){vic.state='idle';vic.st=0;}
    endThrow(f);
  }
}

function applyThrowDamage(f,vic,def){
  const dmg=def.dmg;
  vic.hp=Math.max(0,vic.hp-dmg);
  f.stats.dmg+=dmg;
  f.stats.hits++;
  f.gauge=Math.min(300,f.gauge+dmg*0.35);
  vic.gauge=Math.min(300,vic.gauge+dmg*0.25);
  vic.stun=Math.min(100,vic.stun+dmg*0.12);
  Match.hitstop=Math.max(Match.hitstop,def.hitstop);
  Match.shake=12;
  Match.shakeMag=8;
  Match.flash=2;
  vic.state='knockdown';
  vic.st=48;
  vic.vx=f.facing*7;
  vic.crouching=false;
  vic.comboHits=0;
  vic.comboT=0;
  spark(vic.x,GROUND-120,'#ffd76a',16);
  popText(String(dmg),vic.x,GROUND-230,'#ffd76a',24);
  AudioSys.play('hitH');
  if(vic.hp<=0){
    vic.state='ko';
    vic.vx=f.facing*5;
    AudioSys.play('ko');
  }
}

/* ---------- 受击 ---------- */

function canBlock(vic,def){
  if(vic.y>0) return false;
  if(vic.state!=='idle'&&vic.state!=='walk'&&vic.state!=='crouch'&&vic.state!=='blockstun') return false;
  if(isInvuln(vic)) return false;
  const d=vic.p.dirRel();
  const back=(d===4||d===1||d===7);
  if(!back) return false;
  if(def.level==='low'&&d!==1) return false;
  if(def.level==='overhead'&&d!==4&&d!==7) return false;
  return true;
}

function applyHit(att,vic,def,src,ctx){
  if(vic.hp<=0||vic.state==='ko'||vic.state==='thrown') return;
  if(isInvuln(vic)) return;

  if(vic.armorHits>0&&vic.state==='attack'&&!def.kd){
    vic.armorHits--;
    const dmg=Math.round(def.dmg*0.5);
    vic.hp=Math.max(0,vic.hp-dmg);
    att.stats.dmg+=dmg;
    Match.hitstop=Math.max(Match.hitstop,6);
    spark(moveCenter(att,def).x,moveCenter(att,def).y,'#e0b070',12);
    AudioSys.play('block');
    if(vic.hp<=0) vic.state='ko';
    return;
  }

  const blocked=canBlock(vic,def);
  if(src==='melee'){
    att.hitDone=true;
    att.hitCount++;
    att.lastHitMt=att.mt;
    att.connected=true;
  }

  const center=moveCenter(att,def);

  if(blocked){
    vic.state='blockstun';
    vic.st=def.blockstun;
    vic.blocking=true;
    vic.crouching=vic.p.dirRel()===1;
    vic.vx=att.facing*2.4;
    vic.guard=Math.min(100,vic.guard+def.dmg*0.10);
    vic.gauge=Math.min(300,vic.gauge+def.dmg*0.15);
    att.gauge=Math.min(300,att.gauge+def.dmg*0.08);
    vic.stats.blocks++;
    Match.hitstop=Math.max(Match.hitstop,4);
    spark(center.x,center.y,'#8fe0ff',9);
    AudioSys.play('block');
    if(vic.guard>=100){
      vic.guard=0;
      vic.state='hitstun';
      vic.st=40;
      vic.stun=0;
      popText('GUARD CRUSH',vic.x,GROUND-250,'#7af2ff',20);
      AudioSys.play('crush');
      Match.shake=10;
      Match.shakeMag=7;
    }
    return;
  }

  const counter=ctx?ctx.counter:(vic.state==='attack'&&vic.move&&vic.mt<vic.move.startup);
  const scale=Math.max(0.3,1-0.1*(ctx?ctx.combo:vic.comboHits));
  let dmg=Math.round(def.dmg*scale*(counter?1.2:1));
  dmg=Math.max(1,dmg);

  vic.hp=Math.max(0,vic.hp-dmg);
  att.stats.dmg+=dmg;
  att.stats.hits++;
  att.gauge=Math.min(300,att.gauge+dmg*0.35);
  vic.gauge=Math.min(300,vic.gauge+dmg*0.25);
  vic.stun=Math.min(100,vic.stun+dmg*0.12);

  vic.state='hitstun';
  vic.st=def.hitstun+(counter?2:0);
  vic.move=null;
  vic.mvKey='';
  vic.normTier=-1;
  const kdNow=def.kd&&(def.kind!=='super'||att.hitCount>=def.hits);
  vic.launched=!!kdNow;
  vic.vx=att.facing*(3+def.dmg*0.05)*(kdNow?1.5:1);
  if(kdNow){
    if(vic.y>0){vic.vy=6.5;}
    else if(def.launch){
      vic.state='hitstun';
      vic.launched=true;
      vic.vy=6.6;
      vic.vx=att.facing*6.2;
      const wallNear=(att.facing>0&&vic.x>W-220)||(att.facing<0&&vic.x<220);
      if(counter&&wallNear) vic.bounceReady=true;
    }
    else{
      vic.state='knockdown';
      vic.st=48;
      vic.vx=att.facing*5.2;
    }
  }
  if(def.slow) vic.slowT=def.slow;

  vic.comboHits++;
  att.comboHits++;
  att.comboT=90;
  vic.comboT=90;
  att.stats.maxCombo=Math.max(att.stats.maxCombo,att.comboHits);

  const hs=def.hitstop+(counter?2:0)+(def.kind==='super'?2:0);
  Match.hitstop=Math.max(Match.hitstop,hs);
  Match.shake=Math.max(Match.shake,def.dmg>=70?8:5);
  Match.shakeMag=def.dmg>=90?10:(def.dmg>=70?7:4);
  if(def.dmg>=90) Match.flash=2;

  const col=counter?'#ffd76a':(def.level==='low'?'#8fe0ff':'#ff9a5c');
  spark(center.x,center.y,col,def.dmg>=70?16:10);
  popText(String(dmg),vic.x,GROUND-vic.y-230,counter?'#ffd76a':'#ffffff',def.dmg>=70?24:19);
  if(counter) popText('COUNTER',vic.x,GROUND-vic.y-270,'#ffd76a',18);

  AudioSys.play(def.kind==='super'?'superHit':(def.dmg>=90?'hitS':(def.dmg>=70?'hitH':'hitL')));

  if(vic.stun>=100&&vic.state==='hitstun'){
    vic.stun=0;
    vic.state='dizzy';
    vic.st=120;
    vic.vx=0.5*att.facing;
    popText('DIZZY',vic.x,GROUND-vic.y-250,'#ffd76a',22);
    AudioSys.play('dizzy');
  }
  if(vic.hp<=0){
    vic.state='ko';
    vic.st=0;
    vic.vx=att.facing*5;
    if(vic.y>0) vic.vy=3;
    vic.launched=false;
    AudioSys.play('ko');
    Match.shake=20;
    Match.shakeMag=11;
    Match.flash=4;
  }
}

function moveCenter(att,def){
  if(!def.box) return {x:att.x,y:GROUND-att.y-130};
  const b=moveBox(att,def);
  return {x:b.x+b.w/2,y:b.y+b.h/2};
}

function triggerStance(rock,att){
  const dmg=rock.move.counter||90;
  rock.move=null;
  rock.state='idle';
  rock.mt=0;
  att.hp=Math.max(0,att.hp-dmg);
  rock.stats.dmg+=dmg;
  rock.stats.hits++;
  rock.gauge=Math.min(300,rock.gauge+dmg*0.4);
  att.state='knockdown';
  att.st=48;
  att.vx=rock.facing*7;
  att.move=null;
  att.mvKey='';
  att.comboHits=0;
  Match.hitstop=12;
  Match.shake=14;
  Match.shakeMag=9;
  Match.flash=3;
  spark(rock.x+rock.facing*50,GROUND-130,'#ffcf7a',18);
  popText('当身',rock.x,GROUND-250,'#ffcf7a',22);
  AudioSys.play('crush');
  if(att.hp<=0){att.state='ko';AudioSys.play('ko');}
}

/* ---------- 弹道与冰墙 ---------- */

function spawnProjectile(f,def){
  const pr=def.proj;
  Match.projectiles.push({
    owner:f.pi,
    ownerF:f,
    charId:f.char.id,
    x:f.x+f.facing*48,
    y:GROUND-pr.y-pr.h,
    w:pr.w,h:pr.h,
    vx:f.facing*pr.speed,
    dmg:pr.dmg,hitstun:pr.hitstun,blockstun:pr.blockstun,
    hitstop:pr.hitstop,slow:pr.slow||0,
    life:220
  });
  AudioSys.play(f.char.id==='yan'?'proj':(f.char.id==='shuang'?'ice':'proj'));
}

function spawnWall(f,def){
  const w=def.wall;
  Match.walls.push({
    x:f.x+f.facing*100,
    y:GROUND-w.h,
    w:w.w,h:w.h,
    life:w.life,
    owner:f.pi,
    ex:!!def.ex
  });
}

function projDef(p){
  return {
    dmg:p.dmg,hitstun:p.hitstun,blockstun:p.blockstun,
    level:'mid',kd:false,hitstop:p.hitstop,slow:p.slow||0,
    box:{x:0,y:100,w:p.w,h:p.h},kind:'proj'
  };
}

function updateProjectiles(){
  const ps=Match.projectiles;
  for(let i=ps.length-1;i>=0;i--){
    const p=ps[i];
    p.x+=p.vx;
    p.life--;
    let dead=false;
    for(const w of Match.walls){
      if(overlap({x:p.x-p.w/2,y:p.y,w:p.w,h:p.h},w)){
        dead=true;
        spark(w.x,GROUND-90,'#8fe0ff',10);
        break;
      }
    }
    if(!dead){
      const vic=p.owner===0?Match.p2:Match.p1;
      if(vic&&!isInvuln(vic)&&vic.state!=='thrown'&&vic.state!=='ko'){
        const box=p.charId==='yan'
          ? {x:p.x-p.w/2,y:p.y,w:p.w,h:p.h}
          : {x:p.x-p.w/2,y:p.y,w:p.w,h:p.h};
        if(overlap(box,hurtbox(vic))){
          applyHit(p.ownerF,vic,projDef(p),'proj');
          dead=true;
          spark(p.x,p.y+p.h/2,p.charId==='shuang'?'#9fe6ff':'#ffb347',12);
        }
      }
    }
    for(let j=ps.length-1;j>i;j--){
      const q=ps[j];
      if(q.owner!==p.owner&&overlap(
        {x:p.x-p.w/2,y:p.y,w:p.w,h:p.h},
        {x:q.x-q.w/2,y:q.y,w:q.w,h:q.h})){
        dead=true;
        ps.splice(j,1);
        spark((p.x+q.x)/2,p.y+p.h/2,'#ffffff',14);
        AudioSys.play('block');
        break;
      }
    }
    if(dead||p.life<=0||p.x<-80||p.x>W+80) ps.splice(i,1);
  }
}

function updateWalls(){
  for(let i=Match.walls.length-1;i>=0;i--){
    const w=Match.walls[i];
    w.life--;
    if(w.life<=0) Match.walls.splice(i,1);
  }
}

/* ---------- 攻防判定 ---------- */

function resolveAttacks(){
  const list=[Match.p1,Match.p2];
  const hits=[];
  for(const att of list){
    if(att.state!=='attack'||!att.move) continue;
    if(att.mvKey==='_throw') continue;
    const def=att.move;
    if(def.kind==='stance'||def.kind==='shift'||def.kind==='wall'||def.kind==='proj'||def.kind==='cmdthrow') continue;
    if(def.kind==='throw') continue;
    if(att.mt<def.startup) continue;
    const actEnd=def.startup+def.active+(def.kind==='super'?(def.hits-1)*def.interval:0);
    if(att.mt>=actEnd) continue;
    if(att.hitCount>=def.hits) continue;
    if(att.hitDone&&(def.hits<=1||att.mt-att.lastHitMt<def.interval)) continue;

    const vic=att===Match.p1?Match.p2:Match.p1;
    if(!vic) continue;

    if(vic.state==='attack'&&vic.move&&vic.move.kind==='stance'){
      if(overlap(moveBox(att,def),hurtbox(vic))){
        triggerStance(vic,att);
        continue;
      }
    }
    if(overlap(moveBox(att,def),hurtbox(vic))){
      hits.push({
        att,vic,def,
        counter:vic.state==='attack'&&vic.move&&vic.mt<vic.move.startup,
        combo:vic.comboHits
      });
    }
  }
  for(const h of hits){
    applyHit(h.att,h.vic,h.def,'melee',{counter:h.counter,combo:h.combo});
  }
}

/* ---------- 每帧战斗 ---------- */

function stepAttack(f,opp){
  const def=f.move;
  if(!def){f.state='idle';return;}
  if(f.mvKey==='_throw'){stepThrow(f,opp);return;}
  f.mt++;
  if(def.kind==='cmdthrow'&&f.mt===def.startup){
    if(Math.abs(opp.x-f.x)<=104&&opp.y===0&&!isInvuln(opp)&&opp.state!=='ko'&&opp.state!=='thrown'){
      beginThrow(f,opp,def,false);
      return;
    }
  }
  if(def.vx&&f.mt<=def.startup+def.vxF){
    f.vx=def.vx*f.facing;
  }
  if(f.mt===def.startup){
    if(def.kind==='proj') spawnProjectile(f,def);
    else if(def.kind==='wall') spawnWall(f,def);
    else if(def.kind==='shift'){
      f.x=clamp(f.x+f.facing*130,60,900);
      f.invulnT=Math.max(f.invulnT,def.inv?def.inv.e:14);
      ring(f.x,GROUND-100,'#7af2ff',36);
      AudioSys.play('dash');
    }
    if(def.kind==='super'||def.kind==='dive') Match.shake=Math.max(Match.shake,8);
  }
  if(def.kind==='dive'&&f.mt>=def.startup&&f.mt<def.startup+def.active){
    f.vy=Math.min(f.vy,-def.vy*0.55);
    f.vx=f.facing*3;
  }
  const total=moveTotal(def);
  if(f.mt>=total){
    if(f.y>0){f.state='air';f.move=null;f.mvKey='';f.mt=0;}
    else{f.state='idle';f.move=null;f.mvKey='';f.mt=0;f.vx=0;}
  }
}

function moveTotal(def){
  if(def.kind==='super') return def.startup+def.active+(def.hits-1)*def.interval+def.recovery;
  return def.startup+def.active+def.recovery;
}

function onLand(f){
  AudioSys.play('land');
  dust(f.x,GROUND);
  f.jumped=false;
  if(f.state==='ko') return;
  if(f.techRoll){
    f.techRoll=false;
    f.launched=false;
    f.state='roll';
    f.mt=0;
    f.st=0;
    const d=f.p.dirRel();
    f.vx=(d===4||d===7||d===1?-1:1)*f.facing*5.2;
    ring(f.x,GROUND-80,'#7af2ff',30);
    AudioSys.play('roll');
    return;
  }
  if(f.launched){
    f.launched=false;
    f.state='knockdown';
    f.st=40;
    f.vx*=0.5;
    return;
  }
  if(f.state==='hitstun'){
    f.state='knockdown';
    f.st=36;
    return;
  }
  if(f.state==='thrown') return;
  if(f.state==='attack'){
    f.state='idle';
    f.move=null;
    f.mvKey='';
    f.mt=0;
  }
  if(f.state==='air') f.state='idle';
  f.airAtkUsed=false;
  f.vx=0;
  f.vy=0;
}

function advanceTimers(f){
  if(f.invulnT>0) f.invulnT--;
  if(f.maxT>0) f.maxT--;
  if(f.superGlow>0) f.superGlow--;
  if(f.slowT>0) f.slowT--;
  if(f.comboT>0){
    f.comboT--;
    if(f.comboT===0) f.comboHits=0;
  }
  if(f.guard>0&&f.state!=='blockstun') f.guard=Math.max(0,f.guard-0.12);
  if(f.stun>0&&f.state!=='dizzy') f.stun=Math.max(0,f.stun-0.06);
  if(f.hpGhost>f.hp) f.hpGhost=Math.max(f.hp,f.hpGhost-4);
  else f.hpGhost=f.hp;
}

function integrate(f){
  if(f.y>0&&f.jumped&&f.jumpF<=7){
    f.jumpF++;
    if(f.jumpF<=6&&!f.shortCut&&f.vy>0&&!f.p.upHeld){
      f.vy*=0.78;
      f.shortCut=true;
    }
  }
  if(f.y>0||f.vy!==0){
    f.y+=f.vy;
    f.vy-=0.9;
    if(f.y<=0){
      f.y=0;
      f.vy=0;
      onLand(f);
    }
  }
  f.x+=f.vx*(f.slowT>0?0.85:1);
  if(f.state!=='dash'&&f.state!=='backdash'&&f.state!=='roll'&&f.state!=='attack'&&f.state!=='thrown'&&f.state!=='air'&&!f.launched){
    f.vx*=0.82;
    if(Math.abs(f.vx)<0.05) f.vx=0;
  }
  f.x=clamp(f.x,60,900);
  if(f.bounceReady&&f.launched&&(f.x<=61||f.x>=899)){
    f.bounceReady=false;
    f.state='hitstun';
    f.vx=(f.x<=61?1:-1)*3.4;
    f.vy=5.5;
    spark(f.x,GROUND-f.y-120,'#ffd76a',18);
    popText('WALL BOUNCE',f.x,GROUND-f.y-250,'#ffd76a',20);
    AudioSys.play('crush');
    Match.shake=12;
    Match.shakeMag=8;
  }
}

function stepFighter(f,opp){
  advanceTimers(f);
  tryActions(f,opp);

  switch(f.state){
    case 'attack': stepAttack(f,opp); break;
    case 'blockstun':
      f.blocking=true;
      f.st--;
      if(f.st<=0){f.state='idle';f.blocking=false;}
      break;
    case 'hitstun':
      f.st--;
      if(f.st<=0&&f.y===0) f.state='idle';
      break;
    case 'dizzy':
      f.st--;
      if(f.st%30===1) AudioSys.play('dizzy');
      if(f.st<=0){f.state='idle';f.stun=0;}
      break;
    case 'roll':
      f.mt++;
      if(f.mt%5===0) dust(f.x,GROUND-10);
      if(f.mt>=COMMON.rollFrames){f.state='idle';f.mt=0;f.vx=0;}
      break;
    case 'dash':
      f.mt++;
      f.vx=f.facing*f.char.speed.dash;
      if(f.mt>=24){f.state='idle';f.mt=0;f.vx=0;}
      break;
    case 'backdash':
      f.mt++;
      if(f.mt<=10) f.vx=-f.facing*f.char.speed.dash*0.9;
      if(f.mt>=22){f.state='idle';f.mt=0;f.vx=0;}
      break;
    case 'knockdown':
      f.st--;
      if(f.st>15&&f.p.downHeld()) f.st=15;
      if(f.st<=0){f.state='wake';f.st=16;f.invulnT=16;}
      break;
    case 'wake':
      f.st--;
      if(f.st<=0) f.state='idle';
      break;
    case 'thrown':
      break;
    case 'ko':
    case 'win':
      break;
    case 'idle':
    case 'walk':
    case 'crouch':
      if(f.y===0){
        if(opp.x!==f.x) f.facing=opp.x>f.x?1:-1;
        f.crouching=f.p.downHeld();
        if(f.crouching){
          f.state='crouch';
          f.vx=0;
        }else{
          const d=f.p.dirRel();
          if(d===6){f.state='walk';f.vx=f.char.speed.walk*f.facing;}
          else if(d===4){f.state='walk';f.vx=-f.char.speed.back*f.facing;}
          else{f.state='idle';f.vx=0;}
        }
      }
      break;
    case 'air':
      if(f.y===0) f.state='idle';
      break;
  }

  integrate(f);
}

function physicsOnly(f){
  advanceTimers(f);
  integrate(f);
}

function separate(){
  const a=Match.p1,b=Match.p2;
  if(!a||!b) return;
  if(a.state==='ko'||b.state==='ko'||a.state==='thrown'||b.state==='thrown') return;
  if(Math.abs(a.y-b.y)>90) return;
  const min=70;
  const dx=b.x-a.x;
  if(Math.abs(dx)<min){
    const push=(min-Math.abs(dx))/2*(dx>=0?1:-1);
    a.x-=push;
    b.x+=push;
  }
  for(const w of Match.walls){
    for(const f of [a,b]){
      if(Math.abs(f.x-w.x)<w.w/2+35){
        const dir=f.x<w.x?-1:1;
        f.x=w.x+dir*(w.w/2+35);
      }
    }
  }
  a.x=clamp(a.x,60,900);
  b.x=clamp(b.x,60,900);
}

function triggerKO(){
  if(Match.finished) return;
  Match.finished=true;
  G.state='ko';
  Match.koT=0;
  G.slow=60;
  Match.freeze=0;
  const p1=Match.p1,p2=Match.p2;
  const d1=p1.hp<=0,d2=p2.hp<=0;
  Match.draw=d1&&d2;
  Match.koWinner=d1&&d2?-1:(d1?1:(d2?0:-1));
  Match.koType='K.O.';
  if(Match.koWinner>=0){
    const w=Match.koWinner;
    const wf=w===0?p1:p2;
    const lf=w===0?p2:p1;
    wf.state=wf.state==='ko'?'win':'idle';
    lf.state='ko';
    if(wf.hp>=1000){
      Match.perfects[w]++;
      Match.perfectRound=true;
    }
  }
  Match.shake=22;
  Match.shakeMag=12;
  Match.flash=5;
  AudioSys.play('ko');
}

function timeOver(){
  if(Match.finished) return;
  Match.finished=true;
  G.state='ko';
  Match.koT=0;
  G.slow=30;
  const p1=Match.p1,p2=Match.p2;
  const h1=p1.hp,h2=p2.hp;
  Match.koType='TIME OVER';
  if(h1===h2){
    Match.draw=true;
    Match.koWinner=-1;
  }else{
    Match.draw=false;
    Match.koWinner=h1>h2?0:1;
    const wf=Match.koWinner===0?p1:p2;
    const lf=Match.koWinner===0?p2:p1;
    wf.state='win';
    lf.state='ko';
    if(wf.hp>=1000){
      Match.perfects[Match.koWinner]++;
      Match.perfectRound=true;
    }
  }
  AudioSys.play('timeover');
}

function finishRound(){
  const w=Match.koWinner;
  if(Match.draw||w<0){
    Match.draw=false;
    startRound(true);
    return;
  }
  Match.wins[w]++;
  if(Match.wins[w]>=2){
    enterResult(w);
  }else{
    Match.round++;
    startRound(false);
  }
}

function introStep(){
  Match.introT++;
  if(Match.introT===1) AudioSys.play('round');
  if(Match.introT===60) AudioSys.play('fight');
  if(Match.introT>=100){
    G.state='battle';
    resetInputRound(P1);
    resetInputRound(P2);
  }
}

function koStep(){
  Match.koT++;
  updateFx();
  if(Match.hitstop>0){Match.hitstop--;return;}
  if(Match.p1) physicsOnly(Match.p1);
  if(Match.p2) physicsOnly(Match.p2);
  if(Match.koWinner>=0){
    const wf=Match.koWinner===0?Match.p1:Match.p2;
    if(wf&&Match.koT===70&&wf.state!=='ko') wf.state='win';
  }
  if(Match.koT===150) finishRound();
}

function worldStep(){
  if(G.slow>0) G.slow--;
  updateFx();
  if(Match.hitstop>0){Match.hitstop--;return;}
  if(Match.freeze>0){Match.freeze--;return;}

  if(G.state==='intro'){introStep();return;}
  if(G.state==='ko'){koStep();return;}
  if(G.state!=='battle') return;

  P1.facing=Match.p1?Match.p1.facing:1;
  P2.facing=Match.p2?Match.p2.facing:-1;
  P1.poll();
  P2.poll();

  const {p1,p2}=Match;
  if(!p1||!p2) return;

  stepFighter(p1,p2);
  stepFighter(p2,p1);
  resolveAttacks();
  updateProjectiles();
  updateWalls();
  separate();

  Match.timer--;
  if(Match.timer<=0){timeOver();return;}
  if(p1.hp<=0||p2.hp<=0) triggerKO();
}
