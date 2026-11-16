const W = 480, H = 720;
const GROUND_Y = 660;
const BIRD_X = 130, BIRD_R = 13;
const GRAVITY = 1400, FLAP_V = -420, MAX_FALL = 700;
const PIPE_W = 78, STEP = 1/120;

const DIFFS = {
    easy:    {gap:215, gapMin:180, speed:145, speedMax:200, spacing:270},
    classic: {gap:190, gapMin:152, speed:165, speedMax:235, spacing:250},
    hard:    {gap:168, gapMin:136, speed:195, speedMax:265, spacing:235}
};

const PALETTES = [
    {top:[43,26,78],  mid:[122,42,110], low:[255,140,90], far:[58,32,92],  near:[36,20,64],  tree:[22,12,44], ground:[46,26,70],  grass:[122,52,128]},
    {top:[8,12,40],   mid:[24,38,88],   low:[64,92,158],  far:[20,26,64],  near:[12,16,46],  tree:[8,10,32],  ground:[18,22,56],  grass:[48,60,116]},
    {top:[36,58,104], mid:[201,93,138], low:[255,196,107],far:[70,52,110], near:[44,32,80],  tree:[28,18,54], ground:[58,36,88],  grass:[136,66,128]}
];

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const stage = document.getElementById('stage');
const readyOverlay = document.getElementById('readyOverlay');
const overOverlay = document.getElementById('overOverlay');
const pauseOverlay = document.getElementById('pauseOverlay');
const pauseBtn = document.getElementById('pauseBtn');
const soundBtn = document.getElementById('soundBtn');
const readyBestEl = document.getElementById('readyBest');
const overScoreEl = document.getElementById('overScore');
const overBestEl = document.getElementById('overBest');
const medalEl = document.getElementById('medal');
const recordTag = document.getElementById('recordTag');

let state = 'ready';
let diff = 'classic';
let bird = {y:300, vy:0, rot:0, wingPhase:0};
let pipes = [];
let particles = [];
let score = 0;
let best = loadBest();
let newRecord = false;
let animT = 0, worldX = 0, groundX = 0;
let shakeT = 0, flashA = 0, scorePop = 0;
let trailAcc = 0;
let overShownAt = 0;
let scale = 1;

const pal = JSON.parse(JSON.stringify(PALETTES[0]));

const stars = [];
for(let i=0;i<64;i++){
    stars.push({x:Math.random()*W, y:Math.random()*H*0.55, r:Math.random()*1.4+0.4, ph:Math.random()*6.28, sp:Math.random()*2+0.6});
}
const fireflies = [];
for(let i=0;i<14;i++){
    fireflies.push({
        x:Math.random()*W, y:120+Math.random()*440,
        ph:Math.random()*6.28, sp:Math.random()*0.5+0.25,
        amp:Math.random()*36+18, green:Math.random()<0.6
    });
}

function makeGlow(color){
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32,32,0,32,32,32);
    grad.addColorStop(0, color);
    grad.addColorStop(0.35, color.replace('1)', '0.5)'));
    grad.addColorStop(1, color.replace('1)', '0)'));
    g.fillStyle = grad;
    g.fillRect(0,0,64,64);
    return c;
}
const glowAmber = makeGlow('rgba(255,200,90,1)');
const glowCyan  = makeGlow('rgba(122,240,255,1)');
const glowGreen = makeGlow('rgba(184,255,94,1)');
const glowWhite = makeGlow('rgba(255,245,230,1)');

function loadBest(){
    return parseInt(localStorage.getItem('flappyBest_' + diff) || '0', 10) || 0;
}
function saveBest(){
    localStorage.setItem('flappyBest_' + diff, String(best));
}

function resize(){
    const rect = canvas.getBoundingClientRect();
    if(rect.width < 1 || rect.height < 1) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    scale = canvas.width / W;
}
window.addEventListener('resize', resize);
if(window.ResizeObserver) new ResizeObserver(resize).observe(stage);
resize();

let audioCtx = null, masterGain = null, noiseBuf = null;
let muted = localStorage.getItem('flappyMuted') === '1';

function ensureAudio(){
    if(audioCtx){
        if(audioCtx.state === 'suspended') audioCtx.resume();
        return;
    }
    try{
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = muted ? 0 : 1;
        masterGain.connect(audioCtx.destination);
        noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.3, audioCtx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for(let i=0;i<data.length;i++) data[i] = Math.random()*2-1;
    }catch(e){
        audioCtx = null;
    }
}
function tone(freq, dur, type, vol, slideTo, delay){
    if(!audioCtx || muted) return;
    const t0 = audioCtx.currentTime + (delay || 0);
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if(slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
}
function noise(dur, vol, filterFreq, delay){
    if(!audioCtx || muted) return;
    const t0 = audioCtx.currentTime + (delay || 0);
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuf;
    const f = audioCtx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f).connect(g).connect(masterGain);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
}
const sfx = {
    flap(){ tone(480, 0.09, 'triangle', 0.22, 740); },
    score(){ tone(880, 0.08, 'sine', 0.28); tone(1318, 0.12, 'sine', 0.28, null, 0.07); },
    hit(){ noise(0.16, 0.5, 420); tone(110, 0.22, 'sawtooth', 0.4, 55); },
    die(){ tone(420, 0.5, 'sawtooth', 0.18, 70, 0.12); },
    thud(){ noise(0.1, 0.3, 260); },
    medal(){ [523,659,784,1046].forEach((f,i)=>tone(f, 0.14, 'sine', 0.24, null, i*0.09)); }
};
function syncSoundBtn(){
    soundBtn.textContent = muted ? '🔇' : '🔊';
    soundBtn.setAttribute('aria-pressed', String(!muted));
}
function toggleMute(){
    muted = !muted;
    localStorage.setItem('flappyMuted', muted ? '1' : '0');
    if(masterGain) masterGain.gain.value = muted ? 0 : 1;
    syncSoundBtn();
}
syncSoundBtn();

function spawnParticle(x, y, vx, vy, life, size, sprite, grav){
    if(particles.length >= 300) particles.shift();
    particles.push({x, y, vx, vy, life, maxLife:life, size, sprite, grav:grav||0});
}
function flapBurst(){
    for(let i=0;i<6;i++){
        spawnParticle(BIRD_X-6, bird.y+8,
            -40-Math.random()*70, 60+Math.random()*90,
            0.4+Math.random()*0.2, 7+Math.random()*6, glowAmber, 0);
    }
}
function scoreBurst(x, y){
    for(let i=0;i<12;i++){
        const a = Math.random()*6.28, sp = 60+Math.random()*140;
        spawnParticle(x, y, Math.cos(a)*sp, Math.sin(a)*sp,
            0.5+Math.random()*0.3, 6+Math.random()*7,
            Math.random()<0.5 ? glowCyan : glowWhite, 120);
    }
}
function deathBurst(){
    for(let i=0;i<26;i++){
        const a = Math.random()*6.28, sp = 80+Math.random()*240;
        spawnParticle(BIRD_X, bird.y, Math.cos(a)*sp, Math.sin(a)*sp-60,
            0.6+Math.random()*0.5, 6+Math.random()*10,
            Math.random()<0.6 ? glowAmber : glowWhite, 320);
    }
}

function currentGap(){
    const d = DIFFS[diff];
    return Math.max(d.gapMin, d.gap - score*1.1);
}
function currentSpeed(){
    const d = DIFFS[diff];
    return Math.min(d.speedMax, d.speed + score*2.2);
}
function spawnPipe(x){
    const gap = currentGap();
    const minC = 90 + gap/2;
    const maxC = GROUND_Y - 90 - gap/2;
    let center = minC + Math.random()*(maxC-minC);
    const last = pipes[pipes.length-1];
    if(last){
        const prevC = last.gapY;
        center = Math.max(prevC-180, Math.min(prevC+180, center));
        center = Math.max(minC, Math.min(maxC, center));
    }
    pipes.push({x, gapY:center, gap, passed:false});
}
function resetRun(){
    pipes = [];
    particles = [];
    score = 0;
    newRecord = false;
    bird.y = 300; bird.vy = 0; bird.rot = 0;
    shakeT = 0; flashA = 0; scorePop = 0; trailAcc = 0;
    spawnPipe(W + 160);
}
function showOverlay(which){
    readyOverlay.classList.toggle('hidden', which !== 'ready');
    overOverlay.classList.toggle('hidden', which !== 'over');
    pauseOverlay.classList.toggle('hidden', which !== 'pause');
    pauseBtn.classList.toggle('hidden', state !== 'play');
}
function toReady(){
    state = 'ready';
    resetRun();
    pipes = [];
    best = loadBest();
    readyBestEl.textContent = best;
    showOverlay('ready');
}
function startGame(){
    ensureAudio();
    resetRun();
    state = 'play';
    showOverlay(null);
    flap();
}
function flap(){
    bird.vy = FLAP_V;
    bird.wingPhase = -Math.PI/2;
    flapBurst();
    sfx.flap();
}
function die(){
    state = 'dying';
    bird.vy = -260;
    shakeT = 0.5;
    flashA = 0.85;
    deathBurst();
    sfx.hit();
    sfx.die();
    pauseBtn.classList.add('hidden');
}
function finishRun(){
    state = 'over';
    overShownAt = performance.now();
    if(score > best){
        best = score;
        newRecord = score > 0;
        saveBest();
    }
    overScoreEl.textContent = score;
    overBestEl.textContent = best;
    recordTag.classList.toggle('hidden', !newRecord);
    let tier, label;
    if(score >= 40){ tier='plat'; label='铂'; }
    else if(score >= 30){ tier='gold'; label='金'; }
    else if(score >= 20){ tier='silver'; label='银'; }
    else if(score >= 10){ tier='bronze'; label='铜'; }
    else { tier='none'; label='未达标'; }
    medalEl.className = 'medal ' + tier;
    medalEl.textContent = label;
    if(tier !== 'none') sfx.medal();
    showOverlay('over');
}
function pauseGame(){
    if(state !== 'play') return;
    state = 'pause';
    showOverlay('pause');
}
function resumeGame(){
    if(state !== 'pause') return;
    state = 'play';
    showOverlay(null);
}

function circleHitsRect(cx, cy, r, rx, ry, rw, rh){
    const nx = Math.max(rx, Math.min(cx, rx+rw));
    const ny = Math.max(ry, Math.min(cy, ry+rh));
    const dx = cx-nx, dy = cy-ny;
    return dx*dx + dy*dy < r*r;
}

function stepPlay(dt){
    const speed = currentSpeed();
    worldX += speed*dt;
    groundX += speed*dt;

    bird.vy = Math.min(bird.vy + GRAVITY*dt, MAX_FALL);
    bird.y += bird.vy*dt;
    bird.wingPhase += dt*18;
    if(bird.y < BIRD_R){ bird.y = BIRD_R; bird.vy = 0; }
    const targetRot = Math.max(-0.45, Math.min(1.3, bird.vy/620));
    bird.rot += (targetRot - bird.rot)*Math.min(1, dt*10);

    trailAcc += dt;
    if(trailAcc > 0.035){
        trailAcc = 0;
        spawnParticle(BIRD_X-12, bird.y+4, -speed*0.4, 20+Math.random()*30,
            0.35, 6+Math.random()*4, glowAmber, 0);
    }

    for(const p of pipes) p.x -= speed*dt;
    while(pipes.length && pipes[0].x < -PIPE_W-20) pipes.shift();
    const last = pipes[pipes.length-1];
    if(!last || last.x < W - DIFFS[diff].spacing) spawnPipe(last ? last.x + DIFFS[diff].spacing : W+40);

    const r = BIRD_R - 2;
    for(const p of pipes){
        const topH = p.gapY - p.gap/2;
        const botY = p.gapY + p.gap/2;
        if(circleHitsRect(BIRD_X, bird.y, r, p.x, -50, PIPE_W, topH+50) ||
           circleHitsRect(BIRD_X, bird.y, r, p.x, botY, PIPE_W, GROUND_Y-botY)){
            die();
            return;
        }
        if(!p.passed && p.x + PIPE_W < BIRD_X){
            p.passed = true;
            score++;
            scorePop = 1;
            scoreBurst(p.x + PIPE_W/2, p.gapY);
            sfx.score();
        }
    }
    if(bird.y + BIRD_R >= GROUND_Y){
        bird.y = GROUND_Y - BIRD_R;
        die();
    }
}
function stepDying(dt){
    bird.vy = Math.min(bird.vy + GRAVITY*dt, MAX_FALL);
    bird.y += bird.vy*dt;
    bird.rot = Math.min(bird.rot + dt*5, Math.PI/2);
    if(bird.y >= GROUND_Y - BIRD_R){
        bird.y = GROUND_Y - BIRD_R;
        shakeT = Math.max(shakeT, 0.25);
        sfx.thud();
        finishRun();
    }
}
function step(dt){
    animT += dt;
    if(state === 'ready'){
        worldX += 45*dt;
        groundX += 45*dt;
        bird.y = 300 + Math.sin(animT*2.4)*10;
        bird.rot = Math.sin(animT*2.4)*0.08;
        bird.wingPhase += dt*7;
    }else if(state === 'play'){
        stepPlay(dt);
    }else if(state === 'dying'){
        stepDying(dt);
    }else if(state === 'over'){
        worldX += 18*dt;
        groundX += 18*dt;
    }

    const targetIdx = score >= 25 ? 2 : score >= 10 ? 1 : 0;
    const target = PALETTES[targetIdx];
    const k = 1 - Math.exp(-dt*1.4);
    for(const key in pal){
        for(let i=0;i<3;i++) pal[key][i] += (target[key][i]-pal[key][i])*k;
    }

    for(let i=particles.length-1;i>=0;i--){
        const p = particles[i];
        p.life -= dt;
        if(p.life <= 0){ particles.splice(i,1); continue; }
        p.vy += p.grav*dt;
        p.x += p.vx*dt;
        p.y += p.vy*dt;
    }
    shakeT = Math.max(0, shakeT - dt);
    flashA = Math.max(0, flashA - dt*2.6);
    scorePop = Math.max(0, scorePop - dt*3);
}

function rgb(c){ return 'rgb(' + (c[0]|0) + ',' + (c[1]|0) + ',' + (c[2]|0) + ')'; }
function rr(x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
}
function drawGlow(sprite, x, y, size, alpha){
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite, x-size/2, y-size/2, size, size);
    ctx.globalAlpha = 1;
}
function ridge(offset, base, a1, f1, a2, f2, color){
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for(let x=0;x<=W;x+=8){
        const wx = x + offset;
        const y = base + Math.sin(wx*f1)*a1 + Math.sin(wx*f2+1.7)*a2;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
}
function drawCrystalColumn(x, y, h, capAtBottom){
    if(h <= 0) return;
    const grad = ctx.createLinearGradient(x, 0, x+PIPE_W, 0);
    grad.addColorStop(0, '#0b4f5e');
    grad.addColorStop(0.2, '#17c9b8');
    grad.addColorStop(0.5, '#0e8fa0');
    grad.addColorStop(0.82, '#0a5f78');
    grad.addColorStop(1, '#063a52');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, PIPE_W, h);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(x+PIPE_W*0.28, y, 3, h);
    ctx.fillStyle = 'rgba(6,30,50,0.35)';
    ctx.fillRect(x+PIPE_W*0.62, y, 5, h);

    const capH = 26, capX = x-5, capW = PIPE_W+10;
    const capY = capAtBottom ? y : y+h-capH;
    ctx.fillStyle = grad;
    rr(capX, capY, capW, capH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(174,247,255,0.5)';
    ctx.lineWidth = 1.5;
    rr(capX, capY, capW, capH, 8);
    ctx.stroke();

    const edgeY = capAtBottom ? capY+2 : capY+capH-2;
    ctx.save();
    ctx.shadowColor = '#7af0ff';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = '#aef7ff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(capX+6, edgeY);
    ctx.lineTo(capX+capW-6, edgeY);
    ctx.stroke();
    ctx.restore();
}
function drawBird(){
    ctx.save();
    ctx.translate(BIRD_X, bird.y);
    ctx.rotate(bird.rot);
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(glowAmber, 0, 0, 74, 0.5);
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = '#ff8a3c';
    ctx.beginPath();
    ctx.moveTo(-13, -2);
    ctx.lineTo(-22, -7);
    ctx.lineTo(-20, 3);
    ctx.closePath();
    ctx.fill();

    const bodyGrad = ctx.createRadialGradient(-4, -5, 2, 0, 0, 17);
    bodyGrad.addColorStop(0, '#ffe9a0');
    bodyGrad.addColorStop(0.55, '#ffd76a');
    bodyGrad.addColorStop(1, '#ff9d3c');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 13, 0, 0, 6.29);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,50,10,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#fff3d6';
    ctx.beginPath();
    ctx.ellipse(2, 6, 8, 5.5, 0, 0, 6.29);
    ctx.fill();

    const wingA = Math.sin(bird.wingPhase)*0.85;
    ctx.save();
    ctx.translate(-3, -1);
    ctx.rotate(wingA);
    ctx.fillStyle = '#ff7a3c';
    ctx.beginPath();
    ctx.ellipse(-4, 0, 9, 5.5, -0.3, 0, 6.29);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,50,10,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(7, -5, 4.6, 0, 6.29);
    ctx.fill();
    ctx.fillStyle = '#241436';
    ctx.beginPath();
    ctx.arc(8.4, -5, 2.3, 0, 6.29);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(9.2, -5.9, 0.9, 0, 6.29);
    ctx.fill();

    ctx.fillStyle = '#ff5e3a';
    ctx.beginPath();
    ctx.moveTo(13, -1);
    ctx.lineTo(22, 1.5);
    ctx.lineTo(13, 4.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}
function render(){
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if(shakeT > 0){
        const m = shakeT*14;
        ctx.translate((Math.random()-0.5)*2*m, (Math.random()-0.5)*2*m);
    }

    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, rgb(pal.top));
    sky.addColorStop(0.55, rgb(pal.mid));
    sky.addColorStop(1, rgb(pal.low));
    ctx.fillStyle = sky;
    ctx.fillRect(-20, -20, W+40, H+40);

    const starA = Math.max(0.25, Math.min(1, 1.3 - (pal.top[0]+pal.top[1]+pal.top[2])/220));
    ctx.fillStyle = '#fff';
    for(const s of stars){
        ctx.globalAlpha = starA*(0.35 + 0.65*Math.abs(Math.sin(animT*s.sp + s.ph)));
        ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(glowWhite, W-88, 96, 150, 0.55);
    ctx.restore();
    ctx.fillStyle = '#fdf3d8';
    ctx.beginPath();
    ctx.arc(W-88, 96, 26, 0, 6.29);
    ctx.fill();
    ctx.fillStyle = 'rgba(190,170,140,0.35)';
    ctx.beginPath(); ctx.arc(W-96, 90, 5, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.arc(W-80, 104, 3.5, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.arc(W-84, 88, 2.5, 0, 6.29); ctx.fill();

    ridge(worldX*0.15, 430, 46, 0.008, 22, 0.021, rgb(pal.far));
    ridge(worldX*0.3, 510, 38, 0.012, 18, 0.03, rgb(pal.near));

    ctx.fillStyle = rgb(pal.tree);
    const treeOff = (worldX*0.5) % 90;
    for(let x=-treeOff-90; x<W+90; x+=90){
        const h = 60 + ((Math.abs(Math.sin(x*13.7))*40)|0);
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y);
        ctx.lineTo(x+22, GROUND_Y-h);
        ctx.lineTo(x+44, GROUND_Y);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x+34, GROUND_Y);
        ctx.lineTo(x+52, GROUND_Y-h*0.66);
        ctx.lineTo(x+70, GROUND_Y);
        ctx.closePath();
        ctx.fill();
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for(const f of fireflies){
        const fx = f.x + Math.sin(animT*f.sp + f.ph)*f.amp;
        const fy = f.y + Math.cos(animT*f.sp*0.8 + f.ph)*f.amp*0.6;
        const a = 0.25 + 0.55*Math.pow(Math.sin(animT*1.6 + f.ph), 2);
        drawGlow(f.green ? glowGreen : glowAmber, fx, fy, 16, a);
    }
    ctx.restore();

    for(const p of pipes){
        const topH = p.gapY - p.gap/2;
        const botY = p.gapY + p.gap/2;
        drawCrystalColumn(p.x, 0, topH, false);
        drawCrystalColumn(p.x, botY, GROUND_Y-botY, true);
    }

    ctx.fillStyle = rgb(pal.ground);
    ctx.fillRect(-20, GROUND_Y, W+40, H-GROUND_Y+20);
    const grassGrad = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y+14);
    grassGrad.addColorStop(0, rgb(pal.grass));
    grassGrad.addColorStop(1, rgb(pal.ground));
    ctx.fillStyle = grassGrad;
    ctx.fillRect(-20, GROUND_Y, W+40, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    const gOff = groundX % 36;
    for(let x=-gOff-36; x<W+36; x+=36){
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y+14);
        ctx.lineTo(x+14, GROUND_Y);
        ctx.lineTo(x+22, GROUND_Y);
        ctx.lineTo(x+8, GROUND_Y+14);
        ctx.closePath();
        ctx.fill();
    }
    ctx.fillStyle = 'rgba(122,240,255,0.25)';
    ctx.fillRect(-20, GROUND_Y-1, W+40, 2);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for(const p of particles){
        const a = p.life/p.maxLife;
        drawGlow(p.sprite, p.x, p.y, p.size*(0.5+a), a*0.9);
    }
    ctx.restore();

    drawBird();

    if(state === 'play' || state === 'dying' || state === 'pause'){
        const s = 1 + scorePop*0.35;
        ctx.save();
        ctx.translate(W/2, 108);
        ctx.scale(s, s);
        ctx.font = '900 62px "Arial Black",Arial,sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 8;
        ctx.strokeStyle = 'rgba(13,8,32,0.75)';
        ctx.strokeText(score, 0, 0);
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(255,215,106,0.8)';
        ctx.shadowBlur = 18;
        ctx.fillText(score, 0, 0);
        ctx.restore();
    }

    if(flashA > 0){
        ctx.fillStyle = 'rgba(255,240,225,' + flashA.toFixed(3) + ')';
        ctx.fillRect(-20, -20, W+40, H+40);
    }

    const vig = ctx.createRadialGradient(W/2, H/2, H*0.36, W/2, H/2, H*0.78);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(8,4,20,0.42)');
    ctx.fillStyle = vig;
    ctx.fillRect(-20, -20, W+40, H+40);
}

let last = performance.now(), acc = 0;
function frame(now){
    requestAnimationFrame(frame);
    let dt = (now - last)/1000;
    last = now;
    if(dt > 0.05) dt = 0.05;
    if(state !== 'pause'){
        acc += dt;
        while(acc >= STEP){
            step(STEP);
            acc -= STEP;
        }
    }
    render();
}
requestAnimationFrame(frame);

function primaryAction(){
    ensureAudio();
    if(state === 'ready') startGame();
    else if(state === 'play') flap();
    else if(state === 'pause') resumeGame();
    else if(state === 'over' && performance.now() - overShownAt > 600) startGame();
}
stage.addEventListener('pointerdown', e=>{
    if(e.target.closest('button')) return;
    primaryAction();
});
document.addEventListener('keydown', e=>{
    if(e.repeat) return;
    if(e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW'){
        e.preventDefault();
        primaryAction();
    }else if(e.code === 'KeyP'){
        if(state === 'play') pauseGame();
        else if(state === 'pause') resumeGame();
    }else if(e.code === 'KeyM'){
        toggleMute();
    }else if(e.code === 'Enter' && state === 'over'){
        e.preventDefault();
        if(performance.now() - overShownAt > 600) startGame();
    }
});
document.addEventListener('visibilitychange', ()=>{
    if(document.hidden && state === 'play') pauseGame();
});
window.addEventListener('blur', ()=>{
    if(state === 'play') pauseGame();
});

pauseBtn.addEventListener('click', pauseGame);
soundBtn.addEventListener('click', toggleMute);
document.getElementById('retryBtn').addEventListener('click', startGame);
document.getElementById('overMenuBtn').addEventListener('click', toReady);
document.getElementById('resumeBtn').addEventListener('click', resumeGame);
document.getElementById('pauseRestartBtn').addEventListener('click', startGame);
document.getElementById('pauseMenuBtn').addEventListener('click', toReady);
document.getElementById('diffChips').addEventListener('click', e=>{
    const chip = e.target.closest('.chip');
    if(!chip) return;
    diff = chip.dataset.diff;
    document.querySelectorAll('.chip').forEach(c=>c.classList.toggle('on', c === chip));
    best = loadBest();
    readyBestEl.textContent = best;
});

toReady();