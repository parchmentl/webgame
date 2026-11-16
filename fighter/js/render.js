/* 渲染：程序化舞台、胶囊骨架角色、HUD、演出 */

function shade(hex,amt){
  const n=parseInt(hex.slice(1),16);
  const r=clamp(((n>>16)&255)+amt,0,255);
  const g=clamp(((n>>8)&255)+amt,0,255);
  const b=clamp((n&255)+amt,0,255);
  return 'rgb('+r+','+g+','+b+')';
}

function seeded(seed){
  let s=seed>>>0;
  return function(){
    s=(s*1664525+1013904223)>>>0;
    return s/4294967296;
  };
}

const DECO=(function(){
  const r1=seeded(11);
  const bldg=[];
  for(let i=0;i<20;i++){
    bldg.push({x:i*54-40,w:34+r1()*34,h:110+r1()*190,neon:r1(),tone:r1()});
  }
  const r2=seeded(29);
  const rain=[];
  for(let i=0;i<55;i++){
    rain.push({x:r2()*W,y:r2()*GROUND,sp:260+r2()*260,len:8+r2()*14});
  }
  const r3=seeded(53);
  const lanterns=[];
  for(let i=0;i<11;i++){
    lanterns.push({x:60+r3()*(W-120),y:80+r3()*240,ph:r3()*6.28,sp:0.3+r3()*0.5});
  }
  const r4=seeded(71);
  const sparks=[];
  for(let i=0;i<34;i++){
    sparks.push({x:r4()*W,y:200+r4()*300,sp:10+r4()*40,ph:r4()*6.28});
  }
  const stars=[];
  const r5=seeded(97);
  for(let i=0;i<70;i++) stars.push({x:r5()*W,y:r5()*250,r:r5()*1.4+0.4,ph:r5()*6.28});
  return {bldg,rain,lanterns,sparks,stars};
})();

/* ---------- 舞台 ---------- */

function drawStage(){
  const st=Match.stage||STAGES[0];
  if(st.id==='temple') drawTemple(st);
  else if(st.id==='factory') drawFactory(st);
  else drawStreet(st);
  drawFloor(st);
}

function drawSky(st){
  const g=ctx.createLinearGradient(0,0,0,GROUND);
  g.addColorStop(0,st.sky[0]);
  g.addColorStop(0.55,st.sky[1]);
  g.addColorStop(1,st.sky[2]);
  ctx.fillStyle=g;
  ctx.fillRect(0,0,W,GROUND);
}

function drawStreet(st){
  drawSky(st);
  const t=G.time;
  ctx.save();
  for(const s of DECO.stars){
    ctx.globalAlpha=0.25+0.35*Math.sin(t*1.5+s.ph);
    ctx.fillStyle='#cfe8ff';
    ctx.fillRect(s.x,s.y,s.r,s.r);
  }
  ctx.globalAlpha=1;

  const mx=780,my=96;
  ctx.fillStyle='rgba(255,236,210,0.9)';
  ctx.beginPath();ctx.arc(mx,my,34,0,6.28);ctx.fill();
  ctx.fillStyle='rgba(255,236,210,0.12)';
  ctx.beginPath();ctx.arc(mx,my,60,0,6.28);ctx.fill();

  for(const b of DECO.bldg){
    const h=b.h;
    ctx.fillStyle=b.tone>0.5?'#0d0a19':'#100c20';
    ctx.fillRect(b.x,GROUND-h,b.w,h);
    ctx.fillStyle='rgba(255,255,255,0.05)';
    ctx.fillRect(b.x,GROUND-h,b.w,3);
    if(b.neon>0.45){
      const col=b.neon>0.72?'#ff5fd2':'#57e6ff';
      ctx.fillStyle=col;
      ctx.globalAlpha=0.55+0.2*Math.sin(t*2+b.x);
      ctx.fillRect(b.x+b.w*0.2,GROUND-h+18,4,h*0.4);
      ctx.globalAlpha=1;
      ctx.strokeStyle=col;
      ctx.lineWidth=1.4;
      ctx.strokeRect(b.x+6,GROUND-h+30,b.w-12,26);
    }
  }

  ctx.save();
  ctx.globalAlpha=0.85;
  ctx.fillStyle='rgba(255,95,210,0.16)';
  ctx.fillRect(0,150,150,54);
  ctx.fillStyle='#ff8fdc';
  ctx.font='700 34px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign='left';
  ctx.fillText('霓虹',18,190);
  ctx.fillStyle='rgba(87,230,255,0.12)';
  ctx.fillRect(636,120,240,44);
  ctx.fillStyle='#7feaff';
  ctx.font='700 26px "PingFang SC",sans-serif';
  ctx.fillText('夜市 · NIGHT MARKET',652,152);
  ctx.restore();

  ctx.fillStyle='rgba(87,230,255,0.05)';
  for(let i=0;i<5;i++){
    ctx.fillRect(0,300+i*34,W,2);
  }

  ctx.strokeStyle='rgba(140,220,255,0.16)';
  ctx.lineWidth=1;
  for(const d of DECO.rain){
    const y=(d.y+t*d.sp)%GROUND;
    ctx.beginPath();
    ctx.moveTo(d.x,y);
    ctx.lineTo(d.x-4,y+d.len);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTemple(st){
  drawSky(st);
  const t=G.time;
  ctx.save();
  const mx=740,my=110;
  ctx.fillStyle='rgba(255,240,200,0.95)';
  ctx.beginPath();ctx.arc(mx,my,52,0,6.28);ctx.fill();
  ctx.fillStyle='rgba(255,240,200,0.08)';
  ctx.beginPath();ctx.arc(mx,my,90,0,6.28);ctx.fill();

  for(let i=0;i<4;i++){
    const cx=((i*280+t*8)%(W+320))-160;
    ctx.fillStyle='rgba(180,210,235,0.07)';
    ctx.beginPath();
    ctx.ellipse(cx,150+i*30,120,26,0,0,6.28);
    ctx.fill();
  }

  const px=620;
  ctx.fillStyle='#08131f';
  for(let i=0;i<4;i++){
    const w=200-i*34, hh=34;
    const y=GROUND-150-i*62;
    ctx.beginPath();
    ctx.moveTo(px-w/2,y);
    ctx.lineTo(px+w/2,y);
    ctx.lineTo(px+w/2-22,y+18);
    ctx.lineTo(px-w/2+22,y+18);
    ctx.closePath();ctx.fill();
    ctx.fillRect(px-w/2+34,y+18,w-68,44);
    ctx.fillStyle='rgba(255,232,168,0.16)';
    ctx.fillRect(px-w/2+44,y+26,10,20);
    ctx.fillRect(px+w/2-54,y+26,10,20);
    ctx.fillStyle='#08131f';
  }

  ctx.strokeStyle='#0a1624';
  ctx.lineWidth=13;
  ctx.fillStyle='#0a1624';
  ctx.fillRect(96,GROUND-210,14,210);
  ctx.fillRect(226,GROUND-210,14,210);
  ctx.fillRect(78,GROUND-230,180,15);
  ctx.fillRect(88,GROUND-196,160,10);

  for(const l of DECO.lanterns){
    const y=l.y+Math.sin(t*l.sp+l.ph)*12;
    const x=l.x+Math.sin(t*0.4+l.ph)*8;
    ctx.fillStyle='rgba(255,196,120,0.85)';
    ctx.beginPath();
    ctx.ellipse(x,y,7,10,0,0,6.28);
    ctx.fill();
    ctx.fillStyle='rgba(255,196,120,0.14)';
    ctx.beginPath();ctx.arc(x,y,22,0,6.28);ctx.fill();
  }

  ctx.fillStyle='rgba(180,220,255,0.5)';
  for(let i=0;i<18;i++){
    const x=(i*77+t*22)%W;
    const y=(i*53+t*16)%GROUND;
    ctx.globalAlpha=0.25+0.2*Math.sin(t+i);
    ctx.fillRect(x,y,2,2);
  }
  ctx.globalAlpha=1;
  ctx.restore();
}

function drawFactory(st){
  drawSky(st);
  const t=G.time;
  ctx.save();

  ctx.fillStyle='rgba(255,120,60,0.12)';
  ctx.beginPath();
  ctx.ellipse(480,GROUND,520,90,0,0,6.28);
  ctx.fill();

  for(let i=0;i<5;i++){
    const y=90+i*78;
    ctx.fillStyle='#120806';
    ctx.fillRect(0,y,W,26);
    ctx.fillStyle='rgba(255,122,60,0.16)';
    ctx.fillRect(0,y+4,W,3);
    ctx.fillStyle='#1c0d08';
    for(let x=30;x<W;x+=90){
      ctx.beginPath();
      ctx.arc(x,y+13,8,0,6.28);
      ctx.fill();
    }
  }

  for(let i=0;i<3;i++){
    const px=180+i*280;
    const off=Math.sin(t*(1.2+i*0.4))*34;
    ctx.fillStyle='#1a0c08';
    ctx.fillRect(px-12,120,24,170);
    ctx.fillStyle='#2a140c';
    ctx.fillRect(px-26,290+off,52,34);
    ctx.fillStyle='rgba(255,140,70,0.25)';
    ctx.fillRect(px-20,292+off,40,4);
    ctx.strokeStyle='rgba(255,150,80,0.18)';
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(px,120);ctx.lineTo(px,300+off);
    ctx.stroke();
  }

  for(let i=0;i<6;i++){
    const x=60+i*150;
    const h=60+((i*37)%80);
    const y=GROUND-h;
    ctx.fillStyle='#150a07';
    ctx.fillRect(x,y,80,h);
    ctx.fillStyle='rgba(255,140,60,0.2)';
    ctx.fillRect(x+8,y+10,20,6);
  }

  for(const s of DECO.sparks){
    const y=(s.y-t*s.sp+900)%GROUND;
    const x=s.x+Math.sin(t+s.ph)*10;
    ctx.fillStyle='rgba(255,180,90,'+(0.3+0.4*Math.abs(Math.sin(t+s.ph)))+')';
    ctx.fillRect(x,y,3,3);
  }

  const glow=ctx.createLinearGradient(0,GROUND-40,0,GROUND);
  glow.addColorStop(0,'rgba(255,110,50,0)');
  glow.addColorStop(1,'rgba(255,110,50,0.35)');
  ctx.fillStyle=glow;
  ctx.fillRect(0,GROUND-40,W,40);
  ctx.restore();
}

function drawFloor(st){
  const g=ctx.createLinearGradient(0,GROUND,0,H);
  if(st.id==='factory'){
    g.addColorStop(0,'#2a0f08');
    g.addColorStop(1,'#120604');
  }else if(st.id==='temple'){
    g.addColorStop(0,'#13293a');
    g.addColorStop(1,'#081521');
  }else{
    g.addColorStop(0,'#191133');
    g.addColorStop(1,'#0a0717');
  }
  ctx.fillStyle=g;
  ctx.fillRect(0,GROUND,W,H-GROUND);

  ctx.strokeStyle=st.id==='factory'?'rgba(255,140,70,0.25)':'rgba(140,200,255,0.18)';
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(0,GROUND);
  ctx.lineTo(W,GROUND);
  ctx.stroke();

  ctx.strokeStyle='rgba(255,255,255,0.05)';
  ctx.lineWidth=1;
  for(let i=0;i<8;i++){
    const x=(i*140+((G.time*30)%140));
    ctx.beginPath();
    ctx.moveTo(x,GROUND+4);
    ctx.lineTo(x-40,H);
    ctx.stroke();
  }
  ctx.strokeStyle=st.glow;
  ctx.globalAlpha=0.18;
  ctx.beginPath();
  ctx.moveTo(0,GROUND+16);
  ctx.lineTo(W,GROUND+16);
  ctx.stroke();
  ctx.globalAlpha=1;
}

/* ---------- 骨架姿态 ---------- */

function basePose(){
  return {
    torso:0.05,head:0.02,
    shF:0.24,elF:0.3,shB:-0.22,elB:0.42,
    hipF:0.06,kneeF:-0.06,hipB:-0.12,kneeB:0.06,
    hipOff:0,legFLen:1,legBLen:1,armFLen:1,armBLen:1
  };
}
function blendPose(a,b,k){
  const o={};
  for(const key in a) o[key]=a[key]+((b[key]!==undefined?b[key]:a[key])-a[key])*k;
  return o;
}

function buildPose(f){
  const t=G.time;
  const p=basePose();
  const st=f.state;
  if(st==='idle'){
    p.torso+=Math.sin(t*2.2+f.animSeed)*0.03;
    p.shF+=Math.sin(t*2.2+f.animSeed)*0.05;
    p.shB-=Math.sin(t*2.2+f.animSeed)*0.04;
  }else if(st==='walk'){
    const ph=Math.sin(t*9+f.animSeed);
    p.hipF=0.34*ph;
    p.hipB=-0.34*ph;
    p.kneeF=-0.12-Math.max(0,-ph)*0.5;
    p.kneeB=-0.12-Math.max(0,ph)*0.5;
    p.shF=-0.3*ph;
    p.shB=0.3*ph;
    p.torso=0.1;
  }else if(st==='crouch'){
    p.hipOff=36;
    p.torso=0.3;
    p.hipF=0.85;
    p.kneeF=-1.5;
    p.hipB=-0.7;
    p.kneeB=-1.55;
    p.shF=0.75;
    p.elF=1.1;
    p.shB=-0.5;
    p.elB=1.0;
  }else if(st==='air'){
    p.hipOff=-4;
    p.torso=0.12;
    p.hipF=-0.45;
    p.kneeF=-1.1;
    p.hipB=0.5;
    p.kneeB=-0.85;
    p.shF=0.5;
    p.elF=0.9;
    p.shB=-0.6;
    p.elB=1.1;
  }else if(st==='blockstun'){
    p.torso=-0.1;
    p.shF=1.1;
    p.elF=1.6;
    p.shB=0.8;
    p.elB=1.5;
    p.hipF=0.2;
    p.hipB=-0.2;
    p.kneeF=-0.2;
    p.kneeB=-0.2;
  }else if(st==='hitstun'){
    p.torso=-0.4+Math.sin(t*22)*0.03;
    p.head=-0.25;
    p.shF=-0.5;
    p.elF=0.6;
    p.shB=-0.8;
    p.elB=0.7;
    p.hipF=0.3;
    p.hipB=-0.35;
  }else if(st==='dizzy'){
    p.torso=Math.sin(t*4)*0.16;
    p.head=Math.sin(t*4+1)*0.2;
    p.shF=0.1+Math.sin(t*6)*0.1;
    p.shB=-0.1+Math.sin(t*6+2)*0.1;
    p.hipF=0.1;
    p.hipB=-0.1;
  }else if(st==='dash'){
    p.torso=0.34;
    p.shF=-0.5;
    p.shB=0.6;
    p.hipF=0.5;
    p.hipB=-0.6;
    p.legFLen=1.05;
  }else if(st==='backdash'){
    p.torso=-0.3;
    p.shF=0.5;
    p.elF=0.6;
    p.hipF=-0.4;
    p.hipB=0.45;
  }else if(st==='wake'){
    p.hipOff=26;
    p.torso=0.35;
    p.hipF=0.7;
    p.kneeF=-1.2;
    p.hipB=-0.6;
    p.kneeB=-1.2;
    p.shF=0.5;
    p.elF=0.9;
  }else if(st==='win'){
    p.torso=-0.08;
    p.shF=2.5+Math.sin(t*4)*0.15;
    p.elF=0.3;
    p.shB=-2.3;
    p.elB=0.3;
    p.head=-0.12;
    p.hipF=0.12;
    p.hipB=-0.12;
  }else if(st==='attack'){
    return attackPose(f,p);
  }
  return p;
}

function attackPose(f,p){
  const def=f.move;
  if(!def) return p;
  const key=f.mvKey||'';
  const kind=def.kind;
  const s=basePose();
  s.torso=0.1;

  if(kind==='stance'){
    s.shF=1.25;s.elF=1.9;s.shB=0.9;s.elB=1.8;s.torso=-0.05;
  }else if(kind==='proj'){
    s.shF=1.45;s.elF=0.25;s.shB=1.2;s.elB=0.35;s.torso=0.22;
    s.hipF=0.25;s.hipB=-0.35;
  }else if(kind==='super'){
    s.shF=1.5;s.elF=0.1;s.shB=1.3;s.elB=0.2;s.torso=0.25;
    s.hipF=0.4;s.hipB=-0.5;s.kneeF=-0.3;s.kneeB=-0.3;
  }else if(kind==='wall'){
    s.shF=1.9;s.elF=0.4;s.shB=1.7;s.elB=0.4;s.torso=0.5;
    s.hipOff=16;s.hipF=0.5;s.hipB=-0.5;
    s.kneeF=-0.8;s.kneeB=-0.8;
  }else if(kind==='shift'){
    s.hipOff=20;s.torso=0.4;s.hipF=0.7;s.hipB=-0.6;
    s.kneeF=-1.1;s.kneeB=-1.1;s.shF=0.7;s.elF=1.1;
  }else if(kind==='dive'){
    s.shF=-0.6;s.shB=-0.9;s.elF=0.4;s.elB=0.4;
    s.hipF=1.4;s.kneeF=-0.15;s.legFLen=1.3;
    s.hipB=-0.5;s.kneeB=-0.4;s.torso=0.3;
  }else if(kind==='cmdthrow'||key.indexOf('throw')>=0){
    s.shF=1.5;s.elF=0.5;s.shB=1.3;s.elB=0.6;s.torso=0.2;
  }else if(key==='blow'){
    s.shF=1.5;s.elF=0.05;s.shB=1.2;s.elB=0.15;s.torso=0.35;
    s.hipF=0.45;s.hipB=-0.55;s.armFLen=1.15;s.armBLen=1.1;
  }else if(key==='623P'||key==='623PP'||key==='623K'||key==='623KK'){
    s.shF=2.75;s.elF=0.2;s.shB=-0.4;s.elB=0.8;
    s.torso=-0.18;s.hipF=0.3;s.hipB=-0.4;
    s.kneeF=-0.7;s.kneeB=-0.5;s.armFLen=1.1;
  }else if(key==='46P'||key==='46PP'||key==='236K'||key==='236KK'){
    s.torso=0.55;
    s.shF=0.5;s.elF=1.2;s.shB=0.9;s.elB=1.3;
    s.hipF=0.9;s.kneeF=-0.5;s.hipB=-0.8;s.kneeB=0.1;
  }else if(key==='214K'||key==='214KK'||key==='air214K'||key==='air214KK'){
    s.hipF=1.65;s.kneeF=0.02;s.legFLen=1.28;
    s.hipB=-0.5;s.kneeB=-0.3;
    s.torso=-0.16;s.shF=-0.35;s.elF=0.6;s.shB=0.5;
  }else if(key==='2HK'||key==='c3hk'||key==='2LK'||key==='c4hk'){
    s.hipOff=24;s.torso=0.15;
    s.hipF=1.5;s.kneeF=-0.1;s.legFLen=1.2;
    s.hipB=-0.7;s.kneeB=-1.4;
    s.shF=0.5;s.elF=1.0;s.shB=0.2;
  }else if(/K$/.test(key)){
    s.hipF=1.55;s.kneeF=0.04;s.legFLen=1.24;
    s.hipB=-0.45;s.kneeB=-0.3;
    s.torso=-0.12;s.shF=-0.4;s.elF=0.7;s.shB=0.55;s.elB=0.6;
  }else{
    s.shF=1.5;s.elF=0.06;s.armFLen=1.14;
    s.shB=-0.35;s.elB=0.9;
    s.torso=0.26;s.hipF=0.35;s.hipB=-0.4;
    s.kneeF=-0.2;s.kneeB=-0.15;
  }

  const total=moveTotal(def);
  const actEnd=def.startup+def.active+(kind==='super'?(def.hits-1)*def.interval:0);
  let k;
  if(f.mt<def.startup) k=0.3+0.7*(f.mt/Math.max(1,def.startup));
  else if(f.mt<actEnd) k=1;
  else k=Math.max(0,1-(f.mt-actEnd)/Math.max(1,def.recovery));
  return blendPose(p,s,k);
}

function joint(x,y,ang,len){
  return {x:x+Math.sin(ang)*len,y:y+Math.cos(ang)*len};
}
function capsule(x1,y1,x2,y2,w,color){
  ctx.strokeStyle=color;
  ctx.lineWidth=w;
  ctx.lineCap='round';
  ctx.beginPath();
  ctx.moveTo(x1,y1);
  ctx.lineTo(x2,y2);
  ctx.stroke();
}

function drawArm(sh,ang,el,stretch,cloth,skin,w){
  const e=joint(sh.x,sh.y,ang,28*stretch);
  const h=joint(e.x,e.y,ang+el,26*stretch);
  capsule(sh.x,sh.y,e.x,e.y,w,cloth);
  capsule(e.x,e.y,h.x,h.y,w-1,skin);
  ctx.fillStyle=skin;
  ctx.beginPath();ctx.arc(h.x,h.y,(w-1)*0.72,0,6.28);ctx.fill();
}
function drawLeg(hip,ang,knee,stretch,color,w){
  const k=joint(hip.x,hip.y,ang,42*stretch);
  const foot=joint(k.x,k.y,ang+knee,40*stretch);
  capsule(hip.x,hip.y,k.x,k.y,w,color);
  capsule(k.x,k.y,foot.x,foot.y,w-2,color);
  ctx.fillStyle='#241a2e';
  ctx.beginPath();ctx.ellipse(foot.x,foot.y,10,6,ang+knee,0,6.28);ctx.fill();
}

function drawSkeleton(f,pose,pal){
  const hip={x:0,y:-(104+pose.hipOff)};
  const torso=pose.torso;
  const sh={x:hip.x+Math.sin(torso)*56,y:hip.y-Math.cos(torso)*56};
  const headAng=torso+pose.head;
  const head={x:sh.x+Math.sin(headAng)*32,y:sh.y-Math.cos(headAng)*32};

  const backPants=shade(pal.pants,-34);
  const backCloth=shade(pal.cloth,-38);
  const backSkin=shade(pal.skin,-30);

  drawLeg(hip,pose.hipB,pose.kneeB,pose.legBLen,backPants,13);
  drawArm(sh,pose.shB,pose.elB,pose.armBLen,backCloth,backSkin,8);

  capsule(hip.x,hip.y,sh.x,sh.y,27,pal.cloth);
  capsule(hip.x,hip.y,hip.x+Math.sin(torso)*18,hip.y-Math.cos(torso)*18,29,shade(pal.pants,10));
  ctx.strokeStyle=pal.accent;
  ctx.lineWidth=3;
  ctx.beginPath();
  ctx.moveTo(hip.x-10,hip.y-4);
  ctx.lineTo(hip.x+10,hip.y-8);
  ctx.stroke();

  capsule(sh.x,sh.y,head.x,head.y,12,pal.skin);

  ctx.fillStyle=pal.skin;
  ctx.beginPath();ctx.arc(head.x,head.y,15,0,6.28);ctx.fill();
  ctx.fillStyle=pal.hair;
  ctx.beginPath();
  ctx.arc(head.x,head.y-2,15,Math.PI*0.92,Math.PI*2.08);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(head.x-15,head.y-3);
  ctx.lineTo(head.x-6,head.y-16);
  ctx.lineTo(head.x+2,head.y-14);
  ctx.lineTo(head.x+6,head.y-8);
  ctx.lineTo(head.x+16,head.y-2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle=pal.accent;
  ctx.beginPath();ctx.arc(head.x+7,head.y-2,1.9,0,6.28);ctx.fill();

  drawLeg(hip,pose.hipF,pose.kneeF,pose.legFLen,pal.pants,15);
  drawArm(sh,pose.shF,pose.elF,pose.armFLen,pal.cloth,pal.skin,9);

  ctx.strokeStyle=pal.accent;
  ctx.globalAlpha=0.5;
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.arc(head.x,head.y,17,Math.PI*1.1,Math.PI*1.75);
  ctx.stroke();
  ctx.globalAlpha=1;
}

function drawLying(f){
  const pal=f.char.palette;
  ctx.save();
  ctx.translate(-30,0);
  capsule(-40,-14,34,-14,30,pal.cloth);
  capsule(-46,-10,-80,-6,16,pal.pants);
  capsule(30,-16,58,-20,13,pal.skin);
  ctx.fillStyle=pal.skin;
  ctx.beginPath();ctx.arc(48,-24,15,0,6.28);ctx.fill();
  ctx.fillStyle=pal.hair;
  ctx.beginPath();ctx.arc(48,-26,15,Math.PI*0.8,Math.PI*1.9);ctx.fill();
  ctx.strokeStyle=pal.accent;
  ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(-30,-24);ctx.lineTo(0,-24);ctx.stroke();
  ctx.restore();
}

function drawRoll(f){
  const pal=f.char.palette;
  ctx.save();
  ctx.translate(0,-46);
  ctx.rotate(f.mt*0.42);
  capsule(-16,0,16,0,30,shade(pal.cloth,-10));
  ctx.fillStyle=pal.skin;
  ctx.beginPath();ctx.arc(20,4,13,0,6.28);ctx.fill();
  capsule(-10,10,10,-10,12,pal.pants);
  ctx.restore();
}

function drawFighter(f){
  const pal=f.char.palette;
  const py=GROUND-f.y;

  ctx.save();
  ctx.globalAlpha=0.4;
  ctx.fillStyle='#000';
  ctx.beginPath();
  ctx.ellipse(f.x,GROUND+5,44,8,0,0,6.28);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(f.x,py);

  const rim=f.pi===0?'#57e6ff':'#ff5fd2';
  ctx.save();
  ctx.globalAlpha=0.28+0.12*Math.sin(G.time*4+f.animSeed);
  ctx.fillStyle=rim;
  ctx.beginPath();
  ctx.ellipse(0,0,46,7,0,0,6.28);
  ctx.fill();
  ctx.restore();

  ctx.scale(f.facing,1);

  if(f.state==='knockdown'||f.state==='ko'){
    drawLying(f);
    ctx.restore();
    if(f.state==='ko') drawDizzyStars(f);
    return;
  }
  if(f.state==='roll'){
    drawRoll(f);
    ctx.restore();
    return;
  }

  ctx.save();
  if(f.maxT>0){
    ctx.shadowColor=pal.aura;
    ctx.shadowBlur=18+8*Math.sin(G.time*8);
  }else{
    ctx.shadowColor=pal.aura;
    ctx.shadowBlur=6;
  }
  ctx.shadowColor='rgba(0,0,0,0.55)';
  ctx.shadowBlur=4;
  ctx.shadowOffsetY=2;
  const pose=buildPose(f);
  drawSkeleton(f,pose,pal);
  ctx.restore();

  if(f.state==='dizzy') drawDizzyStars(f);
  if(f.state==='win') drawDizzyStars(f,true);

  if(f.maxT>0){
    ctx.save();
    ctx.globalAlpha=0.28+0.1*Math.sin(G.time*10);
    ctx.strokeStyle=pal.aura;
    ctx.lineWidth=3;
    ctx.beginPath();
    ctx.ellipse(0,-100,44,104,0,0,6.28);
    ctx.stroke();
    ctx.restore();
  }

  if(f.superGlow>0){
    ctx.save();
    ctx.globalAlpha=Math.min(1,f.superGlow/30)*0.5;
    ctx.strokeStyle=pal.light;
    ctx.lineWidth=2;
    for(let i=0;i<3;i++){
      ctx.beginPath();
      ctx.ellipse(0,-100,50+i*10+Math.sin(G.time*10+i)*4,110+i*12,0,0,6.28);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

function drawDizzyStars(f,win){
  const t=G.time;
  const y=GROUND-f.y-230;
  ctx.save();
  ctx.translate(f.x,y);
  for(let i=0;i<3;i++){
    const a=t*3+i*2.1;
    ctx.fillStyle=i%2?'#ffd76a':'#fff2b0';
    ctx.beginPath();
    ctx.arc(Math.cos(a)*18,Math.sin(a)*6,3,0,6.28);
    ctx.fill();
  }
  ctx.restore();
}

/* ---------- 弹道 / 冰墙 / 特效 ---------- */

function drawProjectiles(){
  for(const p of Match.projectiles){
    if(p.charId==='shuang'){
      ctx.save();
      ctx.translate(p.x,p.y+p.h/2);
      ctx.rotate(G.time*8*Math.sign(p.vx));
      const g=ctx.createLinearGradient(-p.w/2,0,p.w/2,0);
      g.addColorStop(0,'rgba(159,230,255,0.1)');
      g.addColorStop(0.5,'#dff7ff');
      g.addColorStop(1,'rgba(159,230,255,0.1)');
      ctx.fillStyle=g;
      ctx.beginPath();
      ctx.moveTo(-p.w/2,0);
      ctx.lineTo(0,-p.h/2);
      ctx.lineTo(p.w/2,0);
      ctx.lineTo(0,p.h/2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle='rgba(143,224,255,0.2)';
      ctx.beginPath();ctx.arc(p.x,p.y+p.h/2,p.w,0,6.28);ctx.fill();
    }else{
      const g=ctx.createRadialGradient(p.x,p.y+p.h/2,4,p.x,p.y+p.h/2,p.w*0.9);
      g.addColorStop(0,'#fff3c9');
      g.addColorStop(0.45,'#ffb347');
      g.addColorStop(1,'rgba(255,90,40,0)');
      ctx.fillStyle=g;
      ctx.beginPath();ctx.arc(p.x,p.y+p.h/2,p.w*0.85,0,6.28);ctx.fill();
    }
  }
}

function drawWalls(){
  for(const w of Match.walls){
    ctx.save();
    const g=ctx.createLinearGradient(w.x-w.w/2,w.y,w.x+w.w/2,w.y);
    g.addColorStop(0,'rgba(159,230,255,0.08)');
    g.addColorStop(0.4,'rgba(200,245,255,0.55)');
    g.addColorStop(0.65,'rgba(159,230,255,0.4)');
    g.addColorStop(1,'rgba(120,200,240,0.1)');
    ctx.fillStyle=g;
    ctx.fillRect(w.x-w.w/2,w.y,w.w,w.h);
    ctx.strokeStyle='rgba(230,250,255,0.8)';
    ctx.lineWidth=2;
    ctx.strokeRect(w.x-w.w/2,w.y,w.w,w.h);
    ctx.globalAlpha=0.7;
    for(let i=0;i<4;i++){
      ctx.beginPath();
      ctx.moveTo(w.x-w.w/2+4,w.y+w.h*(i/4));
      ctx.lineTo(w.x,w.y+w.h*(i/4)+10);
      ctx.lineTo(w.x+w.w/2-4,w.y+w.h*(i/4)+2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawFx(){
  for(const e of Match.fx){
    const a=Math.max(0,e.t/e.life);
    if(e.kind==='spark'){
      ctx.save();
      ctx.globalAlpha=a;
      ctx.strokeStyle=e.color;
      ctx.lineWidth=3;
      for(let i=0;i<6;i++){
        const ang=i*1.047+e.x*0.01;
        const r=e.size*(1.4-a*0.6);
        ctx.beginPath();
        ctx.moveTo(e.x+Math.cos(ang)*r*0.3,e.y+Math.sin(ang)*r*0.3);
        ctx.lineTo(e.x+Math.cos(ang)*r,e.y+Math.sin(ang)*r);
        ctx.stroke();
      }
      ctx.fillStyle=e.color;
      ctx.globalAlpha=a*0.8;
      ctx.beginPath();ctx.arc(e.x,e.y,e.size*0.55,0,6.28);ctx.fill();
      ctx.restore();
    }else if(e.kind==='bit'){
      ctx.save();
      ctx.globalAlpha=a;
      ctx.fillStyle=e.color;
      ctx.fillRect(e.x,e.y,e.size,e.size);
      ctx.restore();
    }else if(e.kind==='dust'){
      ctx.save();
      ctx.globalAlpha=a*0.28;
      ctx.fillStyle='#c8c2d8';
      ctx.beginPath();ctx.arc(e.x,e.y,e.size*(1.6-a*0.6),0,6.28);ctx.fill();
      ctx.restore();
    }else if(e.kind==='ring'){
      ctx.save();
      ctx.globalAlpha=a*0.8;
      ctx.strokeStyle=e.color;
      ctx.lineWidth=3;
      ctx.beginPath();
      ctx.arc(e.x,e.y,e.size*(1.5-a),0,6.28);
      ctx.stroke();
      ctx.restore();
    }else if(e.kind==='text'){
      ctx.save();
      ctx.globalAlpha=Math.min(1,a*2);
      ctx.fillStyle=e.color;
      ctx.font='900 '+e.size+'px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.textAlign='center';
      ctx.strokeStyle='rgba(0,0,0,0.6)';
      ctx.lineWidth=4;
      ctx.strokeText(e.txt,e.x,e.y);
      ctx.fillText(e.txt,e.x,e.y);
      ctx.restore();
    }
  }
}

function drawSuperBeam(){
  for(const f of [Match.p1,Match.p2]){
    if(!f||f.state!=='attack'||!f.move||f.move.kind!=='super') continue;
    const def=f.move;
    if(f.mt<def.startup) continue;
    const end=f.mt<def.startup+def.active+(def.hits-1)*def.interval+4;
    if(!end) continue;
    const pal=f.char.palette;
    const x0=f.x+f.facing*60;
    const y0=GROUND-f.y-150;
    const len=420;
    ctx.save();
    ctx.translate(x0,y0);
    ctx.scale(f.facing,1);
    const g=ctx.createLinearGradient(0,0,len,0);
    g.addColorStop(0,pal.light);
    g.addColorStop(0.3,pal.aura);
    g.addColorStop(1,'rgba(255,255,255,0)');
    ctx.globalAlpha=0.55+0.2*Math.sin(G.time*30);
    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.moveTo(0,-30);
    ctx.quadraticCurveTo(len*0.5,-90,len,0);
    ctx.quadraticCurveTo(len*0.5,90,0,30);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha=0.9;
    ctx.strokeStyle=pal.light;
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(0,0);ctx.lineTo(len,0);
    ctx.stroke();
    ctx.restore();
  }
}

/* ---------- HUD ---------- */

function drawBar(x,y,w,h,ratio,ghost,flip,col1,col2){
  ctx.save();
  ctx.fillStyle='rgba(10,6,20,0.85)';
  ctx.fillRect(x-3,y-3,w+6,h+6);
  ctx.fillStyle='rgba(255,255,255,0.08)';
  ctx.fillRect(x,y,w,h);
  const gw=w*clamp(ghost,0,1);
  ctx.fillStyle='rgba(255,240,200,0.35)';
  if(flip) ctx.fillRect(x+w-gw,y,gw,h);
  else ctx.fillRect(x,y,gw,h);
  const fw=w*clamp(ratio,0,1);
  const g=ctx.createLinearGradient(x,y,x+w,y);
  g.addColorStop(0,col1);
  g.addColorStop(1,col2);
  ctx.fillStyle=g;
  if(flip) ctx.fillRect(x+w-fw,y,fw,h);
  else ctx.fillRect(x,y,fw,h);
  ctx.strokeStyle='rgba(255,255,255,0.25)';
  ctx.lineWidth=1;
  ctx.strokeRect(x,y,w,h);
  ctx.restore();
}

function drawHud(){
  const p1=Match.p1,p2=Match.p2;
  if(!p1||!p2) return;

  ctx.save();
  ctx.textAlign='left';
  ctx.font='800 15px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillStyle='#57e6ff';
  ctx.fillText('P1 · '+p1.char.name,40,20);
  ctx.textAlign='right';
  ctx.fillStyle='#ff5fd2';
  ctx.fillText(p2.char.name+' · P2',920,20);

  drawBar(40,26,400,22,p1.hp/1000,p1.hpGhost/1000,false,'#ffd76a','#ff5a3c');
  drawBar(520,26,400,22,p2.hp/1000,p2.hpGhost/1000,true,'#ffd76a','#ff5a3c');

  ctx.fillStyle='rgba(0,0,0,0.5)';
  ctx.fillRect(40,52,400,5);
  ctx.fillRect(520,52,400,5);
  ctx.fillStyle='#ffd76a';
  ctx.fillRect(40,52,400*clamp(p1.guard/100,0,1),5);
  ctx.fillRect(920-400*clamp(p2.guard/100,0,1),52,400*clamp(p2.guard/100,0,1),5);

  ctx.fillStyle='rgba(0,0,0,0.5)';
  ctx.fillRect(40,60,400,4);
  ctx.fillRect(520,60,400,4);
  ctx.fillStyle='#8fe0ff';
  ctx.fillRect(40,60,400*clamp(p1.stun/100,0,1),4);
  ctx.fillRect(920-400*clamp(p2.stun/100,0,1),60,400*clamp(p2.stun/100,0,1),4);

  const secs=Math.max(0,Math.ceil(Match.timer/60));
  ctx.fillStyle='rgba(10,6,20,0.8)';
  ctx.fillRect(444,18,72,52);
  ctx.strokeStyle='rgba(255,215,106,0.5)';
  ctx.lineWidth=2;
  ctx.strokeRect(444,18,72,52);
  ctx.fillStyle=secs<=10?'#ff6a5a':'#f2ecff';
  ctx.font='900 34px "PingFang SC",sans-serif';
  ctx.textAlign='center';
  ctx.fillText(String(secs).padStart(2,'0'),480,55);

  for(let i=0;i<2;i++){
    const cx=Match.wins[0]>i?464-i*18:464-i*18;
    ctx.fillStyle=Match.wins[0]>i?'#57e6ff':'rgba(255,255,255,0.15)';
    ctx.beginPath();ctx.arc(cx,82,5,0,6.28);ctx.fill();
    const cx2=Match.wins[1]>i?496+i*18:496+i*18;
    ctx.fillStyle=Match.wins[1]>i?'#ff5fd2':'rgba(255,255,255,0.15)';
    ctx.beginPath();ctx.arc(cx2,82,5,0,6.28);ctx.fill();
  }

  drawGauge(p1,40,false);
  drawGauge(p2,920-300,true);

  if(p1.comboT>0&&p1.comboHits>1) drawCombo(p1,150,false);
  if(p2.comboT>0&&p2.comboHits>1) drawCombo(p2,810,true);

  if(p1.maxT>0) drawMaxTag(40,false,p1);
  if(p2.maxT>0) drawMaxTag(920,true,p2);

  ctx.restore();
}

function drawGauge(f,x,flip){
  const y=506,w=300,h=13;
  ctx.save();
  ctx.fillStyle='rgba(10,6,20,0.85)';
  ctx.fillRect(x-3,y-3,w+6,h+6);
  const pal=f.char.palette;
  for(let i=0;i<3;i++){
    const segX=x+i*100;
    ctx.fillStyle='rgba(255,255,255,0.07)';
    ctx.fillRect(segX+2,y,96,h);
    const ratio=clamp((f.gauge-i*100)/100,0,1);
    if(ratio>0){
      const g=ctx.createLinearGradient(segX,y,segX+100,y);
      g.addColorStop(0,pal.aura);
      g.addColorStop(1,pal.light);
      ctx.fillStyle=g;
      ctx.fillRect(segX+2,y,96*ratio,h);
    }
    ctx.strokeStyle='rgba(255,255,255,0.22)';
    ctx.lineWidth=1;
    ctx.strokeRect(segX+2,y,96,h);
  }
  ctx.fillStyle='rgba(242,236,255,0.7)';
  ctx.font='700 11px "PingFang SC",sans-serif';
  ctx.textAlign=flip?'right':'left';
  ctx.fillText('POWER',flip?x+w:x,y-8);
  ctx.restore();
}

function drawMaxTag(x,flip,f){
  ctx.save();
  ctx.textAlign=flip?'right':'left';
  ctx.font='900 20px "PingFang SC",sans-serif';
  ctx.fillStyle='rgba(255,215,106,'+(0.6+0.4*Math.sin(G.time*10))+')';
  ctx.fillText('MAX',flip?x:x,497);
  const r=Math.max(0,f.maxT/600);
  ctx.strokeStyle='rgba(255,215,106,0.5)';
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.arc(flip?x-40:x+40,490,9,-Math.PI/2,-Math.PI/2+r*6.28);
  ctx.stroke();
  ctx.restore();
}

function drawCombo(f,x,flip){
  ctx.save();
  ctx.textAlign=flip?'right':'left';
  ctx.font='900 34px "PingFang SC",sans-serif';
  const g=ctx.createLinearGradient(x-40,0,x+60,0);
  g.addColorStop(0,'#ffd76a');
  g.addColorStop(1,'#ff8a5c');
  ctx.fillStyle=g;
  ctx.strokeStyle='rgba(0,0,0,0.6)';
  ctx.lineWidth=5;
  const txt=f.comboHits+' HITS';
  ctx.strokeText(txt,x,150);
  ctx.fillText(txt,x,150);
  ctx.font='700 15px "PingFang SC",sans-serif';
  ctx.fillStyle='rgba(255,255,255,0.75)';
  ctx.fillText('COMBO',x,172);
  ctx.restore();
}

/* ---------- 横幅 / 演出 ---------- */

function drawBannerText(txt,y,size,color,sub){
  ctx.save();
  ctx.textAlign='center';
  ctx.font='900 '+size+'px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.strokeStyle='rgba(0,0,0,0.75)';
  ctx.lineWidth=size*0.16;
  ctx.strokeText(txt,W/2,y);
  const g=ctx.createLinearGradient(0,y-size,0,y+size*0.4);
  g.addColorStop(0,'#fff6d8');
  g.addColorStop(0.5,color);
  g.addColorStop(1,shade(color,-40));
  ctx.fillStyle=g;
  ctx.fillText(txt,W/2,y);
  if(sub){
    ctx.font='700 17px "PingFang SC",sans-serif';
    ctx.fillStyle='rgba(255,255,255,0.8)';
    ctx.fillText(sub,W/2,y+34);
  }
  ctx.restore();
}

function drawBanners(){
  if(G.state==='intro'){
    if(Match.introT<60){
      const k=clamp(Match.introT/12,0,1);
      ctx.save();
      ctx.globalAlpha=k;
      drawBannerText('ROUND '+Match.round,270,74,'#ffd76a','FIGHT FOR YOUR HONOR');
      ctx.restore();
    }else{
      const k=clamp((Match.introT-60)/8,0,1);
      const size=92*(1+0.35*(1-k));
      ctx.save();
      ctx.globalAlpha=k;
      drawBannerText('FIGHT!',270,size,'#57e6ff');
      ctx.restore();
    }
  }
  if(G.state==='ko'){
    const t=Match.koT;
    const pop=t<10?1+0.5*(1-t/10):1;
    ctx.save();
    ctx.globalAlpha=1;
    drawBannerText(Match.koType,272,86*pop,Match.draw?'#8fe0ff':'#ff5f9e');
    ctx.restore();
    if(Match.perfectRound&&t>40){
      drawBannerText('PERFECT',340,36,'#ffd76a');
    }
    if(Match.koWinner>=0&&t>92){
      const wf=Match.koWinner===0?Match.p1:Match.p2;
      if(wf) drawBannerText(wf.char.name+' WINS',342,32,'#ffd76a');
    }
    if(Match.draw&&t>92) drawBannerText('DRAW · 重赛',342,30,'#8fe0ff');
  }
}

function drawCutin(){
  if(Match.cutin<=0) return;
  let owner=null;
  if(Match.p1&&Match.p1.superGlow>40) owner=Match.p1;
  if(Match.p2&&Match.p2.superGlow>40) owner=Match.p2;
  if(!owner) return;
  const k=1-Match.cutin/45;
  const pal=owner.char.palette;
  ctx.save();
  ctx.globalAlpha=k<0.15?k/0.15:(Match.cutin<10?Match.cutin/10:1);
  ctx.translate(W/2,H/2);
  ctx.rotate(-0.1);
  ctx.fillStyle='rgba(6,3,14,0.82)';
  ctx.fillRect(-W/2,-92,W,170);
  const g=ctx.createLinearGradient(-W/2,0,W/2,0);
  g.addColorStop(0,'rgba(255,255,255,0)');
  g.addColorStop(0.2,pal.aura);
  g.addColorStop(0.8,pal.accent);
  g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=g;
  ctx.globalAlpha*=0.35;
  ctx.fillRect(-W/2,-92,W,14);
  ctx.fillRect(-W/2,64,W,14);
  ctx.globalAlpha=k<0.15?k/0.15:1;
  ctx.textAlign='center';
  ctx.font='900 58px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillStyle='#fff6d8';
  ctx.strokeStyle='rgba(0,0,0,0.6)';
  ctx.lineWidth=7;
  ctx.strokeText(owner.char.name+' · 超必杀',0,8);
  ctx.fillText(owner.char.name+' · 超必杀',0,8);
  ctx.font='700 17px "PingFang SC",sans-serif';
  ctx.fillStyle=pal.light;
  ctx.fillText('SUPER ART',0,44);
  ctx.restore();
}

function drawOverlays(){
  if(Match.freeze>0){
    ctx.save();
    ctx.fillStyle='rgba(10,5,22,0.32)';
    ctx.fillRect(0,0,W,H);
    ctx.restore();
  }
  if(G.slow>0){
    ctx.save();
    const g=ctx.createRadialGradient(W/2,H/2,180,W/2,H/2,720);
    g.addColorStop(0,'rgba(0,0,0,0)');
    g.addColorStop(1,'rgba(5,2,10,0.55)');
    ctx.fillStyle=g;
    ctx.fillRect(0,0,W,H);
    ctx.restore();
  }
  if(Match.flash>0){
    ctx.save();
    ctx.globalAlpha=Match.flash*0.09;
    ctx.fillStyle='#fff';
    ctx.fillRect(0,0,W,H);
    ctx.restore();
  }
  ctx.save();
  const v=ctx.createRadialGradient(W/2,H/2,240,W/2,H/2,700);
  v.addColorStop(0,'rgba(0,0,0,0)');
  v.addColorStop(1,'rgba(0,0,0,0.35)');
  ctx.fillStyle=v;
  ctx.fillRect(0,0,W,H);
  ctx.restore();
}

/* ---------- 主渲染 ---------- */

function idleStep(){}

function renderWorld(){
  ctx.save();
  ctx.setTransform(G.dpr,0,0,G.dpr,0,0);
  ctx.clearRect(0,0,W,H);

  if(Match.shake>0&&!G.reduced){
    const m=Match.shakeMag;
    ctx.translate(rand(-m,m),rand(-m,m));
  }

  drawStage();

  const inGame=(G.state==='battle'||G.state==='intro'||G.state==='ko'||G.state==='pause'||G.state==='result');
  if(inGame&&Match.p1&&Match.p2){
    drawWalls();

    const first=Match.p1.y>=Match.p2.y?Match.p1:Match.p2;
    const second=first===Match.p1?Match.p2:Match.p1;
    drawFighter(first);
    drawFighter(second);

    drawProjectiles();
    drawSuperBeam();
    drawFx();
    drawHud();
    drawBanners();
  }else{
    ctx.save();
    ctx.globalAlpha=0.5;
    for(let i=0;i<2;i++){
      const x=i===0?300:660;
      const pal=CHARS[i*2].palette;
      ctx.fillStyle='rgba(10,6,20,0.6)';
      ctx.fillRect(x-70,GROUND-220,140,220);
      ctx.strokeStyle=i===0?'rgba(87,230,255,0.5)':'rgba(255,95,210,0.5)';
      ctx.lineWidth=2;
      ctx.strokeRect(x-70,GROUND-220,140,220);
      ctx.fillStyle=pal.aura;
      ctx.globalAlpha=0.25+0.1*Math.sin(G.time*2+i);
      ctx.beginPath();
      ctx.arc(x,GROUND-120,52,0,6.28);
      ctx.fill();
      ctx.globalAlpha=0.5;
    }
    ctx.restore();
  }

  ctx.restore();

  if(Match.cutin>0) drawCutin();
  if(Match.freeze>0||G.slow>0||Match.flash>0) drawOverlays();

  ctx.save();
  ctx.setTransform(G.dpr,0,0,G.dpr,0,0);
  const v=ctx.createRadialGradient(W/2,H/2,260,W/2,H/2,700);
  v.addColorStop(0,'rgba(0,0,0,0)');
  v.addColorStop(1,'rgba(0,0,0,0.28)');
  ctx.fillStyle=v;
  ctx.fillRect(0,0,W,H);
  ctx.restore();
}
