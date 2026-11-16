/* 键盘输入：8 帧缓冲、方向历史指令、双击与蓄力 */

const KEYMAP_P1={
  KeyA:'L', KeyD:'R', KeyS:'D', KeyW:'U',
  KeyJ:'LP', KeyK:'LK', KeyU:'HP', KeyI:'HK',
  KeyL:'ROLL', KeyH:'BLOW'
};
const KEYMAP_P2={
  ArrowLeft:'L', ArrowRight:'R', ArrowDown:'D', ArrowUp:'U',
  Numpad1:'LP', Numpad2:'LK', Numpad4:'HP', Numpad5:'HK', Numpad0:'ROLL', Numpad3:'BLOW',
  Comma:'LP', Period:'LK', Slash:'HP', Semicolon:'HK', Quote:'ROLL', BracketLeft:'BLOW'
};

const PREVENT_KEYS=new Set([
  ...Object.keys(KEYMAP_P1), ...Object.keys(KEYMAP_P2),
  'Enter','Space','KeyM','KeyR','Escape'
]);

const DIR_MIRROR={1:3,2:2,3:1,4:6,5:5,6:4,7:9,8:8,9:7};

function dirToNum(left,right,up,down){
  const x=right?1:(left?-1:0);
  const y=up?1:(down?-1:0);
  if(y>0) return x>0?9:(x<0?7:8);
  if(y<0) return x>0?3:(x<0?1:2);
  return x>0?6:(x<0?4:5);
}

const DIRKEYS_P1={L:'KeyA',R:'KeyD',U:'KeyW',D:'KeyS'};
const DIRKEYS_P2={L:'ArrowLeft',R:'ArrowRight',U:'ArrowUp',D:'ArrowDown'};

class PlayerInput{
  constructor(map,dirKeys){
    this.map=map;
    this.dirKeys=dirKeys;
    this.raw=new Set();
    this.frame=0;
    this.facing=1;
    this.dir=5;
    this.dirHist=[{d:5,f:0}];
    this.btnPrev=new Set();
    this.log=[];
    this.lastF6=-999;
    this.lastF4=-999;
    this.dashReq=null;
    this.chargeT=0;
    this.chargeReadyF=-999;
    this.chargeConsumedF=-999;
    this.upHeld=false;
    this.upTapF=-999;
    this.reset();
  }
  reset(){
    this.raw.clear();
    this.dir=5;
    this.dirHist=[{d:5,f:this.frame}];
    this.btnPrev.clear();
    this.log=[];
    this.lastF6=-999;
    this.lastF4=-999;
    this.dashReq=null;
    this.chargeT=0;
    this.chargeReadyF=-999;
    this.upHeld=false;
    this.upTapF=-999;
  }
  pressCode(code){
    const b=this.map[code];
    if(b) this.raw.add(code);
  }
  releaseCode(code){
    this.raw.delete(code);
  }
  clearHeld(){
    this.raw.clear();
    this.btnPrev.clear();
    this.upHeld=false;
  }
  heldButton(b){
    for(const code of this.raw){
      if(this.map[code]===b) return true;
    }
    return false;
  }
  heldDirKey(k){
    return this.raw.has(k);
  }
  poll(){
    this.frame++;
    const left=this.heldDirKey(this.dirKeys.L);
    const right=this.heldDirKey(this.dirKeys.R);
    const up=this.heldDirKey(this.dirKeys.U);
    const down=this.heldDirKey(this.dirKeys.D);

    const absDir=dirToNum(left,right,up,down);
    const rel=this.facing===1?absDir:DIR_MIRROR[absDir];
    if(rel!==this.dir){
      if(rel===6){
        if(this.dir===5&&this.frame-this.lastF6<=12) this.dashReq='f';
        this.lastF6=this.frame;
      }else if(rel===4){
        if(this.dir===5&&this.frame-this.lastF4<=12) this.dashReq='b';
        this.lastF4=this.frame;
      }
      if((this.dir===4||this.dir===7||this.dir===1) && this.chargeT>=40 && rel===6){
        this.chargeReadyF=this.frame;
      }
      this.dir=rel;
      this.dirHist.push({d:rel,f:this.frame});
      if(this.dirHist.length>24) this.dirHist.shift();
    }
    if(rel===4||rel===7||rel===1) this.chargeT++;
    else this.chargeT=0;

    if(!this.upHeld && up) this.upTapF=this.frame;
    this.upHeld=up;

    const now=new Set();
    for(const code of this.raw){
      const b=this.map[code];
      if(b) now.add(b);
    }
    for(const b of now){
      if(!this.btnPrev.has(b)) this.log.push({b,f:this.frame});
    }
    this.btnPrev=now;
    while(this.log.length && this.frame-this.log[0].f>40) this.log.shift();
  }
  dirRel(){return this.dir;}
  backHeld(){const d=this.dir;return d===4||d===7||d===1;}
  downHeld(){const d=this.dir;return d===1||d===2||d===3;}
  upTap(win=6){return this.frame-this.upTapF<=win;}
  takeDash(){
    const d=this.dashReq;
    this.dashReq=null;
    return d;
  }
  takeCharge(){
    if(this.frame-this.chargeReadyF<=10 && this.frame-this.chargeReadyF>=0){
      this.chargeReadyF=-999;
      this.chargeT=0;
      return true;
    }
    return false;
  }
  fresh(b,win=8){
    for(let i=this.log.length-1;i>=0;i--){
      const e=this.log[i];
      if(this.frame-e.f>win) break;
      if(e.b===b) return true;
    }
    return false;
  }
  consume(b,win=8){
    for(let i=this.log.length-1;i>=0;i--){
      const e=this.log[i];
      if(this.frame-e.f>win) break;
      if(e.b===b){
        this.log.splice(i,1);
        return true;
      }
    }
    return false;
  }
  consumeAny(win=8){
    for(let i=this.log.length-1;i>=0;i--){
      if(this.frame-this.log[i].f<=win) return true;
    }
    return false;
  }
  familyPresses(fam,win=2){
    const famBtns=fam==='P'?['LP','HP']:['LK','HK'];
    const hits=[];
    for(let i=this.log.length-1;i>=0;i--){
      const e=this.log[i];
      if(this.frame-e.f>win) break;
      if(famBtns.includes(e.b)) hits.push(e);
    }
    if(hits.length<2) return null;
    for(let i=0;i<hits.length-1;i++){
      for(let j=i+1;j<hits.length;j++){
        if(hits[i].b!==hits[j].b && Math.abs(hits[i].f-hits[j].f)<=win){
          const used=[hits[i],hits[j]];
          this.log=this.log.filter(e=>!used.includes(e));
          return true;
        }
      }
    }
    return false;
  }
  takeThrow(){
    const lp=this.findPress('LP',2);
    const lk=this.findPress('LK',2);
    if(lp&&lk){
      this.log=this.log.filter(e=>e!==lp&&e!==lk);
      return true;
    }
    return false;
  }
  findPress(b,win){
    for(let i=this.log.length-1;i>=0;i--){
      const e=this.log[i];
      if(this.frame-e.f>win) break;
      if(e.b===b) return e;
    }
    return null;
  }
  takeMax(){
    const want=['LP','LK','HP','HK'];
    const found=[];
    for(const b of want){
      const e=this.findPress(b,2);
      if(e) found.push(e);
    }
    if(found.length===4){
      this.log=this.log.filter(e=>!found.includes(e));
      return true;
    }
    return false;
  }
  motion(seq,stepWin=12,total=46){
    const h=this.dirHist;
    if(!h.length) return false;
    let hi=h.length-1;
    let newestF=h[hi].f;
    while(hi>=0 && h[hi].d!==seq[seq.length-1]) hi--;
    if(hi<0) return false;
    let matched=1;
    let limitF=h[hi].f;
    let prevF=h[hi].f;
    hi--;
    while(matched<seq.length && hi>=0){
      const e=h[hi];
      if(prevF-e.f>stepWin) break;
      if(e.d===seq[seq.length-1-matched]){
        matched++;
        prevF=e.f;
        limitF=e.f;
      }
      hi--;
    }
    if(matched<seq.length) return false;
    if(this.frame-limitF>total) return false;
    return true;
  }
}

const P1=new PlayerInput(KEYMAP_P1,DIRKEYS_P1);
const P2=new PlayerInput(KEYMAP_P2,DIRKEYS_P2);
const PLAYERS=[P1,P2];

function onKeyDown(e){
  if(e.repeat){
    if(PREVENT_KEYS.has(e.code)) e.preventDefault();
    return;
  }
  if(PREVENT_KEYS.has(e.code)) e.preventDefault();
  if(KEYMAP_P1[e.code]) P1.pressCode(e.code);
  if(KEYMAP_P2[e.code]) P2.pressCode(e.code);
  if(typeof GameKeys==='function') GameKeys(e.code,e);
}
function onKeyUp(e){
  if(KEYMAP_P1[e.code]) P1.releaseCode(e.code);
  if(KEYMAP_P2[e.code]) P2.releaseCode(e.code);
}

window.addEventListener('keydown',onKeyDown);
window.addEventListener('keyup',onKeyUp);
window.addEventListener('blur',()=>{
  P1.clearHeld();
  P2.clearHeld();
});
