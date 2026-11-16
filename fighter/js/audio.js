/* 程序化音频：全部由振荡器与噪声合成 */

function midiToFreq(m){return 440*Math.pow(2,(m-69)/12);}

const AudioSys={
  ctx:null,
  master:null,
  muted:false,
  bgmTimer:null,
  bgmStage:null,
  bgmStep:0,
  nextNote:0,
  noiseBuf:null,

  init(){
    if(this.ctx) return;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC) return;
    this.ctx=new AC();
    this.master=this.ctx.createGain();
    this.master.gain.value=0.85;
    this.master.connect(this.ctx.destination);
    this.muted=localStorage.getItem('nfMuted')==='1';
    this.applyMute();
    const len=this.ctx.sampleRate*1;
    const buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
    this.noiseBuf=buf;
  },
  unlock(){
    this.init();
    if(this.ctx && this.ctx.state==='suspended') this.ctx.resume();
  },
  applyMute(){
    if(this.master) this.master.gain.value=this.muted?0:0.85;
  },
  toggleMute(){
    this.muted=!this.muted;
    localStorage.setItem('nfMuted',this.muted?'1':'0');
    this.applyMute();
    return this.muted;
  },
  setMute(v){
    this.muted=!!v;
    localStorage.setItem('nfMuted',this.muted?'1':'0');
    this.applyMute();
  },

  env(gain,t,a,d,peak){
    gain.gain.setValueAtTime(0.0001,t);
    gain.gain.linearRampToValueAtTime(peak,t+a);
    gain.gain.exponentialRampToValueAtTime(0.0001,t+a+d);
  },
  tone(freq,dur,opt){
    if(!this.ctx) return;
    opt=opt||{};
    const t=this.ctx.currentTime+(opt.delay||0);
    const o=this.ctx.createOscillator();
    const g=this.ctx.createGain();
    o.type=opt.type||'sine';
    o.frequency.setValueAtTime(freq,t);
    if(opt.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20,freq+opt.slide),t+dur);
    this.env(g,t,opt.attack||0.005,dur,opt.gain||0.18);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t+dur+0.08);
  },
  noise(dur,opt){
    if(!this.ctx||!this.noiseBuf) return;
    opt=opt||{};
    const t=this.ctx.currentTime+(opt.delay||0);
    const src=this.ctx.createBufferSource();
    src.buffer=this.noiseBuf;
    const g=this.ctx.createGain();
    const f=this.ctx.createBiquadFilter();
    f.type=opt.filter||'bandpass';
    f.frequency.setValueAtTime(opt.freq||900,t);
    f.Q.value=opt.q||1;
    this.env(g,t,0.004,dur,opt.gain||0.15);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t+dur+0.08);
  },

  play(name){
    if(!this.ctx||this.muted) return;
    switch(name){
      case 'select':
        this.tone(660,0.06,{type:'square',gain:0.10});
        this.tone(990,0.05,{type:'square',gain:0.06,delay:0.03});
        break;
      case 'ok':
        this.tone(520,0.08,{type:'triangle',gain:0.14});
        this.tone(780,0.12,{type:'triangle',gain:0.12,delay:0.06});
        break;
      case 'deny':
        this.tone(180,0.14,{type:'square',gain:0.12,slide:-60});
        break;
      case 'menuMove':
        this.tone(440,0.04,{type:'square',gain:0.06});
        break;
      case 'whooshL':
        this.noise(0.10,{gain:0.08,freq:1800,q:1.6});
        break;
      case 'whooshH':
        this.noise(0.16,{gain:0.12,freq:1100,q:1.2});
        this.tone(140,0.12,{type:'sawtooth',gain:0.05,slide:-40});
        break;
      case 'hitL':
        this.noise(0.07,{gain:0.16,freq:1500,q:0.8});
        this.tone(190,0.07,{type:'square',gain:0.13,slide:-70});
        break;
      case 'hitH':
        this.noise(0.12,{gain:0.22,freq:800,q:0.7});
        this.tone(110,0.13,{type:'sawtooth',gain:0.16,slide:-60});
        break;
      case 'hitS':
        this.noise(0.18,{gain:0.26,freq:500,q:0.6});
        this.tone(80,0.20,{type:'sawtooth',gain:0.2,slide:-40});
        break;
      case 'block':
        this.tone(1300,0.05,{type:'triangle',gain:0.12});
        this.noise(0.05,{gain:0.09,freq:2600,q:2});
        break;
      case 'gc':
        this.tone(900,0.1,{type:'sawtooth',gain:0.14,slide:400});
        break;
      case 'jump':
        this.tone(300,0.12,{type:'sine',gain:0.10,slide:260});
        break;
      case 'land':
        this.noise(0.06,{gain:0.10,freq:400,filter:'lowpass'});
        break;
      case 'dash':
        this.noise(0.14,{gain:0.12,freq:1500,q:0.8});
        break;
      case 'roll':
        this.noise(0.18,{gain:0.11,freq:700,q:0.5,filter:'lowpass'});
        break;
      case 'throw':
        this.noise(0.12,{gain:0.15,freq:600,q:0.6});
        this.tone(220,0.16,{type:'square',gain:0.12,slide:-90});
        break;
      case 'tech':
        this.tone(880,0.09,{type:'triangle',gain:0.12});
        this.tone(1320,0.09,{type:'triangle',gain:0.09,delay:0.06});
        break;
      case 'proj':
        this.tone(420,0.18,{type:'sawtooth',gain:0.10,slide:220});
        break;
      case 'ice':
        this.tone(1600,0.12,{type:'sine',gain:0.08,slide:500});
        this.noise(0.1,{gain:0.07,freq:3200,q:2});
        break;
      case 'wall':
        this.tone(300,0.2,{type:'triangle',gain:0.13,slide:-120});
        this.noise(0.2,{gain:0.10,freq:1200,q:0.8});
        break;
      case 'dive':
        this.tone(700,0.25,{type:'sawtooth',gain:0.10,slide:-420});
        break;
      case 'super':
        this.tone(180,0.5,{type:'sawtooth',gain:0.16,slide:900});
        this.noise(0.4,{gain:0.12,freq:600,q:0.6});
        this.tone(1200,0.4,{type:'sine',gain:0.07,slide:-500,delay:0.1});
        break;
      case 'superHit':
        for(let i=0;i<4;i++){
          this.tone(160+i*40,0.10,{type:'square',gain:0.12,slide:-40,delay:i*0.06});
          this.noise(0.08,{gain:0.12,freq:700+i*300,q:0.7,delay:i*0.06});
        }
        break;
      case 'max':
        this.tone(220,0.3,{type:'sawtooth',gain:0.14,slide:440});
        this.tone(330,0.35,{type:'triangle',gain:0.1,slide:520,delay:0.05});
        this.noise(0.3,{gain:0.08,freq:2200,q:1});
        break;
      case 'crush':
        this.tone(140,0.3,{type:'sawtooth',gain:0.2,slide:-80});
        this.noise(0.25,{gain:0.2,freq:500,q:0.6});
        break;
      case 'dizzy':
        this.tone(600,0.2,{type:'sine',gain:0.08,slide:-300});
        break;
      case 'ko':
        this.tone(90,0.8,{type:'sawtooth',gain:0.22,slide:-45});
        this.noise(0.6,{gain:0.18,freq:300,q:0.5,filter:'lowpass'});
        this.tone(60,0.5,{type:'sine',gain:0.14,slide:-20,delay:0.12});
        break;
      case 'timeover':
        this.tone(320,0.5,{type:'square',gain:0.10,slide:-160});
        break;
      case 'round':
        this.tone(440,0.2,{type:'triangle',gain:0.12});
        this.tone(660,0.3,{type:'triangle',gain:0.10,delay:0.16});
        break;
      case 'fight':
        this.tone(330,0.1,{type:'sawtooth',gain:0.12});
        this.tone(660,0.2,{type:'sawtooth',gain:0.14,delay:0.08});
        break;
    }
  },

  startBgm(stageId){
    this.init();
    if(!this.ctx) return;
    if(this.bgmStage===stageId && this.bgmTimer) return;
    this.stopBgm();
    this.bgmStage=stageId||'street';
    this.bgmStep=0;
    this.nextNote=this.ctx.currentTime+0.15;
    this.bgmTimer=setInterval(()=>this.tickBgm(),110);
  },
  stopBgm(){
    if(this.bgmTimer) clearInterval(this.bgmTimer);
    this.bgmTimer=null;
    this.bgmStage=null;
  },
  tickBgm(){
    if(!this.ctx||this.muted){ return; }
    if(!this.bgmTimer) return;
    const bpm=this.bgmStage==='temple'?112:(this.bgmStage==='factory'?136:126);
    const spb=60/bpm/4;
    while(this.nextNote<this.ctx.currentTime+0.3){
      this.stepBgm(this.bgmStep,this.nextNote,spb);
      this.bgmStep=(this.bgmStep+1)%32;
      this.nextNote+=spb;
    }
  },
  stepBgm(step,t,spb){
    if(!this.ctx) return;
    const stage=this.bgmStage||'street';
    const roots={street:33,temple:38,factory:31};
    const scales={street:[0,3,5,7,10],temple:[0,2,3,7,8],factory:[0,1,5,6,8]};
    const root=roots[stage];
    const sc=scales[stage];
    const bar=Math.floor(step/16)%2;

    if(step%4===0){
      const bf=midiToFreq(root+(bar?2:0));
      this.seqTone(bf*2,0.16,'sawtooth',0.055,t,spb,'lowpass',500);
    }
    if(step%2===0){
      const deg=sc[(step/2)%sc.length];
      const oct=(step%8===0)?2:3;
      this.seqTone(midiToFreq(root+12*oct+deg+bar*2),0.09,'triangle',0.032,t,spb,'lowpass',2600);
    }
    if(step===0||step===8||step===16||step===24){
      this.seqKick(t);
    }
    if(step===4||step===12||step===20||step===28){
      this.seqSnare(t);
    }
    if(step%2===1){
      this.seqHat(t,step%4===3?0.05:0.025);
    }
  },
  seqTone(freq,dur,type,gain,t,spb,filter,freq2){
    const o=this.ctx.createOscillator();
    const g=this.ctx.createGain();
    const f=this.ctx.createBiquadFilter();
    f.type=filter||'lowpass';
    f.frequency.value=freq2||2000;
    o.type=type;
    o.frequency.value=freq;
    g.gain.setValueAtTime(0.0001,t);
    g.gain.linearRampToValueAtTime(gain,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(f); f.connect(g); g.connect(this.master);
    o.start(t); o.stop(t+dur+0.05);
  },
  seqKick(t){
    const o=this.ctx.createOscillator();
    const g=this.ctx.createGain();
    o.type='sine';
    o.frequency.setValueAtTime(120,t);
    o.frequency.exponentialRampToValueAtTime(42,t+0.12);
    g.gain.setValueAtTime(0.16,t);
    g.gain.exponentialRampToValueAtTime(0.0001,t+0.14);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t+0.16);
  },
  seqSnare(t){
    const src=this.ctx.createBufferSource();
    src.buffer=this.noiseBuf;
    const g=this.ctx.createGain();
    const f=this.ctx.createBiquadFilter();
    f.type='bandpass'; f.frequency.value=1800; f.Q.value=0.9;
    g.gain.setValueAtTime(0.09,t);
    g.gain.exponentialRampToValueAtTime(0.0001,t+0.09);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t+0.1);
  },
  seqHat(t,gain){
    const src=this.ctx.createBufferSource();
    src.buffer=this.noiseBuf;
    const g=this.ctx.createGain();
    const f=this.ctx.createBiquadFilter();
    f.type='highpass'; f.frequency.value=6000;
    g.gain.setValueAtTime(gain,t);
    g.gain.exponentialRampToValueAtTime(0.0001,t+0.03);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t+0.04);
  }
};
