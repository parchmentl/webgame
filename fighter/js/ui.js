/* 屏幕流程、选择界面与按键路由 */

const UI=(function(){
  const el={
    title:document.getElementById('scrTitle'),
    menu:document.getElementById('scrMenu'),
    select:document.getElementById('scrSelect'),
    stage:document.getElementById('scrStage'),
    pause:document.getElementById('scrPause'),
    result:document.getElementById('scrResult'),
    help:document.getElementById('scrHelp'),
    charGrid:document.getElementById('charGrid'),
    stageGrid:document.getElementById('stageGrid'),
    resTitle:document.getElementById('resTitle'),
    resStats:document.getElementById('resStats'),
    p1stat:document.getElementById('p1stat'),
    p2stat:document.getElementById('p2stat'),
    muteBtn:document.getElementById('muteBtn'),
    touchNote:document.getElementById('touchNote')
  };

  const state={
    screen:'title',
    menuIdx:0,
    sel:[0,1],
    locked:[false,false],
    stageIdx:0,
    prevState:'battle',
    helpFrom:'menu',
    lastResult:null,
    pauseIdx:0,
    resultIdx:0
  };

  const menuActions=['versus','help','mute'];
  const pauseActions=['resume','help','restart','menu'];
  const resultActions=['rematch','select','menu'];
  const PAUSE_PREV={'battle':'battle','intro':'intro','ko':'ko'};

  function hide(el){el.classList.add('hidden');}
  function show(el){el.classList.remove('hidden');}

  function hideAll(){
    for(const k of ['title','menu','select','stage','pause','result','help']){
      if(el[k]) hide(el[k]);
    }
  }

  function showTitle(){
    hideAll();
    show(el.title);
    state.screen='title';
    G.state='title';
    AudioSys.stopBgm();
  }

  function showMenu(){
    hideAll();
    show(el.menu);
    state.screen='menu';
    G.state='menu';
    state.menuIdx=0;
    paintMenuFocus();
  }

  function paintMenuFocus(){
    const btns=el.menu.querySelectorAll('button');
    btns.forEach((b,i)=>b.classList.toggle('focus',i===state.menuIdx));
  }

  function selectChar(){
    hideAll();
    show(el.select);
    state.screen='select';
    G.state='select';
    state.locked=[false,false];
    renderCharGrid();
    updateSelectStats();
    AudioSys.play('select');
  }

  function renderCharGrid(){
    el.charGrid.innerHTML='';
    CHARS.forEach((c,i)=>{
      const card=document.createElement('div');
      card.className='card';
      card.style.background='linear-gradient(135deg,'+shade(c.palette.cloth,-40)+' 0%,'+shade(c.palette.pants,-10)+' 60%,rgba(10,6,20,.95) 100%)';
      card.innerHTML=
        '<div class="nm">'+c.name+'</div>'+
        '<div class="tg">'+c.tag+'</div>'+
        '<div class="st">'+c.style+'</div>';
      card.addEventListener('click',()=>{
        AudioSys.play('select');
        if(!state.locked[0]){
          state.sel[0]=i;
          state.locked[0]=true;
        }else if(!state.locked[1]){
          state.sel[1]=i;
          state.locked[1]=true;
        }
        renderCharGrid();
        updateSelectStats();
        checkSelectDone();
      });
      el.charGrid.appendChild(card);
    });
    const cards=el.charGrid.children;
    for(let i=0;i<cards.length;i++){
      cards[i].classList.toggle('p1sel',state.sel[0]===i);
      cards[i].classList.toggle('p2sel',state.sel[1]===i);
      if(state.locked[0]&&state.sel[0]===i){
        const b=document.createElement('span');
        b.className='badge b1';
        b.textContent='P1';
        cards[i].appendChild(b);
      }
      if(state.locked[1]&&state.sel[1]===i){
        const b=document.createElement('span');
        b.className='badge b2';
        b.textContent='P2';
        cards[i].appendChild(b);
      }
    }
  }

  function updateSelectStats(){
    const c1=CHARS[state.sel[0]],c2=CHARS[state.sel[1]];
    el.p1stat.textContent='P1 · '+c1.name+(state.locked[0]?' · 已确认':' · A/D 选择 · J 确认');
    el.p2stat.textContent='P2 · '+c2.name+(state.locked[1]?' · 已确认':' · ←/→ 选择 · 小1 , 确认');
    el.p1stat.classList.toggle('locked',state.locked[0]);
    el.p2stat.classList.toggle('locked',state.locked[1]);
  }

  function checkSelectDone(){
    if(state.locked[0]&&state.locked[1]){
      showStage();
    }
  }

  function showStage(){
    hideAll();
    show(el.stage);
    state.screen='stage';
    G.state='stage';
    state.stageIdx=Math.min(state.stageIdx,STAGES.length-1);
    renderStageGrid();
    AudioSys.play('ok');
  }

  function renderStageGrid(){
    el.stageGrid.innerHTML='';
    STAGES.forEach((s,i)=>{
      const card=document.createElement('div');
      card.className='scard'+(i===state.stageIdx?' sel':'');
      card.style.background='linear-gradient(140deg,'+s.sky[1]+' 0%,'+s.sky[0]+' 70%,rgba(6,3,14,.95) 100%)';
      card.innerHTML='<div class="nm" style="color:'+s.accent+'">'+s.name+'</div><div class="sub">'+s.sub+'</div>';
      card.addEventListener('click',()=>{
        state.stageIdx=i;
        renderStageGrid();
        beginBattle();
      });
      el.stageGrid.appendChild(card);
    });
    Match.stage=STAGES[state.stageIdx];
  }

  function beginBattle(){
    AudioSys.unlock();
    AudioSys.play('fight');
    hideAll();
    state.screen='battle';
    startMatch(state.sel[0],state.sel[1],state.stageIdx);
  }

  function pauseGame(){
    if(G.state!=='battle'&&G.state!=='intro'&&G.state!=='ko') return;
    state.prevState=G.state;
    G.state='pause';
    state.pauseIdx=0;
    paintPauseFocus();
    hideAll();
    show(el.pause);
    state.screen='pause';
  }

  function resumeGame(){
    if(G.state!=='pause') return;
    G.state=state.prevState||'battle';
    hideAll();
    state.screen='battle';
    resetInputRound(P1);
    resetInputRound(P2);
    AudioSys.play('select');
  }

  function paintPauseFocus(){
    const btns=el.pause.querySelectorAll('button');
    btns.forEach((b,i)=>b.classList.toggle('focus',i===state.pauseIdx));
  }

  function paintResultFocus(){
    const btns=el.result.querySelectorAll('button');
    btns.forEach((b,i)=>b.classList.toggle('focus',i===state.resultIdx));
  }

  function showResult(data){
    state.lastResult=data;
    state.screen='result';
    state.resultIdx=0;
    const w=data.winner;
    const name=CHARS[data.chars[w]].name;
    el.resTitle.textContent=name+' 胜利';
    const s1=data.stats[0],s2=data.stats[1];
    el.resStats.innerHTML=
      '<div class="rtitle">MATCH RESULT</div>'+
      '<div class="rrow"><span>回合比分</span><b>'+data.wins[0]+' : '+data.wins[1]+'</b></div>'+
      '<div class="rrow"><span>完美回合</span><b>'+data.perfects[0]+' : '+data.perfects[1]+'</b></div>'+
      '<div class="rrow"><span>P1 最大连击</span><b>'+s1.maxCombo+'</b></div>'+
      '<div class="rrow"><span>P2 最大连击</span><b>'+s2.maxCombo+'</b></div>'+
      '<div class="rrow"><span>P1 总伤害</span><b>'+Math.round(s1.dmg)+'</b></div>'+
      '<div class="rrow"><span>P2 总伤害</span><b>'+Math.round(s2.dmg)+'</b></div>'+
      '<div class="rrow"><span>P1 命中 / 防御</span><b>'+s1.hits+' / '+s1.blocks+'</b></div>'+
      '<div class="rrow"><span>P2 命中 / 防御</span><b>'+s2.hits+' / '+s2.blocks+'</b></div>';
    hideAll();
    show(el.result);
    paintResultFocus();
    AudioSys.play('ok');
  }

  function rematch(){
    if(!state.lastResult) return;
    const idx=STAGES.findIndex(s=>s.id===Match.stage.id);
    state.screen='battle';
    startMatch(state.lastResult.chars[0],state.lastResult.chars[1],idx<0?0:idx);
  }

  function backToMenu(){
    hideAll();
    state.screen='menu';
    G.state='menu';
    Match.p1=null;
    Match.p2=null;
    AudioSys.stopBgm();
    showMenu();
  }

  function showHelp(from){
    state.helpFrom=from||state.screen;
    hideAll();
    show(el.help);
    state.screen='help';
    AudioSys.play('select');
  }
  function closeHelp(){
    if(state.helpFrom==='pause'){
      hideAll();
      show(el.pause);
      state.screen='pause';
    }else if(state.helpFrom==='select'){
      show(el.select);
      state.screen='select';
    }else{
      showMenu();
    }
  }

  function syncMute(){
    if(el.muteBtn){
      el.muteBtn.textContent='音效：'+(AudioSys.muted?'关':'开');
    }
  }

  function moveSel(player,delta){
    if(state.locked[player]) return;
    const n=CHARS.length;
    state.sel[player]=(state.sel[player]+delta+n)%n;
    AudioSys.play('menuMove');
    renderCharGrid();
    updateSelectStats();
  }

  function lockSel(player){
    if(state.locked[player]){
      state.locked[player]=false;
      AudioSys.play('deny');
    }else{
      state.locked[player]=true;
      AudioSys.play('ok');
    }
    renderCharGrid();
    updateSelectStats();
    if(state.locked[0]&&state.locked[1]) setTimeout(()=>{ if(state.screen==='select') showStage(); },260);
  }

  /* 按键路由 */
  function handleKey(code,e){
    AudioSys.unlock();
    if(code==='KeyM'){
      AudioSys.toggleMute();
      syncMute();
      return;
    }
    if(code==='Escape'){
      if(state.screen==='pause'){resumeGame();return;}
      if(state.screen==='help'){closeHelp();return;}
      if(state.screen==='select'){showMenu();return;}
      if(state.screen==='stage'){selectChar();return;}
      if(state.screen==='result'){backToMenu();return;}
      if(G.state==='battle'||G.state==='intro'||G.state==='ko'){pauseGame();return;}
      if(state.screen==='menu'){showTitle();return;}
      return;
    }
    if(state.screen==='title'){
      if(code==='Enter'||code==='Space') showMenu();
      return;
    }
    if(state.screen==='menu'){
      if(code==='KeyW'||code==='ArrowUp'){state.menuIdx=(state.menuIdx-1+menuActions.length)%menuActions.length;paintMenuFocus();AudioSys.play('menuMove');}
      if(code==='KeyS'||code==='ArrowDown'){state.menuIdx=(state.menuIdx+1)%menuActions.length;paintMenuFocus();AudioSys.play('menuMove');}
      if(code==='Enter'||code==='Space'){
        const act=menuActions[state.menuIdx];
        if(act==='versus') selectChar();
        else if(act==='help') showHelp('menu');
        else if(act==='mute'){AudioSys.toggleMute();syncMute();AudioSys.play('select');}
      }
      return;
    }
    if(state.screen==='select'){
      if(code==='KeyA') moveSel(0,-1);
      else if(code==='KeyD') moveSel(0,1);
      else if(code==='KeyJ') lockSel(0);
      else if(code==='ArrowLeft') moveSel(1,-1);
      else if(code==='ArrowRight') moveSel(1,1);
      else if(code==='Numpad1'||code==='Comma') lockSel(1);
      else if(code==='Enter'){
        if(!state.locked[0]) state.locked[0]=true;
        else if(!state.locked[1]) state.locked[1]=true;
        AudioSys.play('ok');
        renderCharGrid();
        updateSelectStats();
        if(state.locked[0]&&state.locked[1]) setTimeout(()=>{ if(state.screen==='select') showStage(); },260);
      }
      return;
    }
    if(state.screen==='stage'){
      if(code==='KeyA'||code==='ArrowLeft'){
        state.stageIdx=(state.stageIdx-1+STAGES.length)%STAGES.length;
        renderStageGrid();
        AudioSys.play('menuMove');
      }else if(code==='KeyD'||code==='ArrowRight'){
        state.stageIdx=(state.stageIdx+1)%STAGES.length;
        renderStageGrid();
        AudioSys.play('menuMove');
      }else if(code==='KeyJ'||code==='Enter'){
        beginBattle();
      }
      return;
    }
    if(state.screen==='pause'){
      if(code==='KeyW'||code==='ArrowUp'){state.pauseIdx=(state.pauseIdx-1+pauseActions.length)%pauseActions.length;paintPauseFocus();AudioSys.play('menuMove');}
      if(code==='KeyS'||code==='ArrowDown'){state.pauseIdx=(state.pauseIdx+1)%pauseActions.length;paintPauseFocus();AudioSys.play('menuMove');}
      if(code==='Enter'||code==='Space'){
        const act=pauseActions[state.pauseIdx];
        if(act==='resume') resumeGame();
        else if(act==='help') showHelp('pause');
        else if(act==='restart'){
          const idx=STAGES.findIndex(s=>s.id===Match.stage.id);
          startMatch(Match.chars[0],Match.chars[1],idx<0?0:idx);
        }else if(act==='menu'){
          hideAll();
          showMenu();
          state.screen='menu';
          G.state='menu';
          AudioSys.stopBgm();
        }
      }
      return;
    }
    if(state.screen==='result'){
      if(code==='Enter'||code==='Space'||code==='KeyR'){rematch();return;}
      if(code==='KeyA'||code==='ArrowLeft'){
        state.resultIdx=(state.resultIdx-1+resultActions.length)%resultActions.length;paintResultFocus();AudioSys.play('menuMove');
      }
      if(code==='KeyD'||code==='ArrowRight'){
        state.resultIdx=(state.resultIdx+1)%resultActions.length;paintResultFocus();AudioSys.play('menuMove');
      }
      return;
    }
    if(state.screen==='help'){
      if(code==='Enter'||code==='Space') closeHelp();
      return;
    }
  }

  function wire(){
    el.menu.addEventListener('click',(e)=>{
      const b=e.target.closest('button');
      if(!b) return;
      const act=b.dataset.act;
      AudioSys.play('select');
      if(act==='versus') selectChar();
      else if(act==='help') showHelp('menu');
      else if(act==='mute'){AudioSys.toggleMute();syncMute();}
    });
    el.pause.addEventListener('click',(e)=>{
      const b=e.target.closest('button');
      if(!b) return;
      const act=b.dataset.act;
      if(act==='resume') resumeGame();
      else if(act==='help') showHelp('pause');
      else if(act==='restart'){
        const idx=STAGES.findIndex(s=>s.id===Match.stage.id);
        startMatch(Match.chars[0],Match.chars[1],idx<0?0:idx);
      }else if(act==='menu'){
        hideAll();
        showMenu();
        state.screen='menu';
        G.state='menu';
        AudioSys.stopBgm();
      }
    });
    el.result.addEventListener('click',(e)=>{
      const b=e.target.closest('button');
      if(!b) return;
      const act=b.dataset.act;
      AudioSys.play('select');
      if(act==='rematch') rematch();
      else if(act==='select') selectChar();
      else if(act==='menu') backToMenu();
    });
    el.help.addEventListener('click',(e)=>{
      if(e.target.closest('.screen')) closeHelp();
    });

    window.addEventListener('blur',()=>{
      if(G.state==='battle'||G.state==='intro'||G.state==='ko') pauseGame();
    });
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden&&(G.state==='battle'||G.state==='intro'||G.state==='ko')) pauseGame();
    });
    const unlock=()=>{AudioSys.unlock();syncMute();};
    window.addEventListener('pointerdown',unlock,{once:true});
    window.addEventListener('keydown',unlock,{once:true});

    if(window.matchMedia&&window.matchMedia('(pointer:coarse)').matches){
      el.touchNote.classList.remove('hidden');
    }
  }

  function boot(){
    wire();
    syncMute();
    showTitle();
    layout();
    startLoop();
  }

  return {
    boot,
    hideAll,
    showResult,
    showTitle,
    showMenu,
    showHelp,
    pauseGame,
    resumeGame,
    syncMute,
    handleKey,
    state
  };
})();

function GameKeys(code,e){ UI.handleKey(code,e); }

UI.boot();
