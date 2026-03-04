(function(){
  const VERSION = '1.0.0';
  const LEVELS = [
    [
      "#####",
      "#.@ #",
      "# $ #",
      "# . #",
      "#####"
    ].join('\n'),
    [
      " ####### ",
      " #  .  # ",
      " # $$  # ",
      " #  @  # ",
      " ####### "
    ].join('\n'),
    [
      "  #######  ",
      "  #  .  #  ",
      "  # $$$ #  ",
      "###  $  ###",
      "#   @    #",
      "#  ..... #",
      "###########"
    ].join('\n'),
    [
      "#########",
      "#   .   #",
      "#  $$$  #",
      "# $@$ $ #",
      "#  $$$  #",
      "#   .   #",
      "#########"
    ].join('\n')
  ];
  let currentLevel = 0;
  function levelStr(){ return LEVELS[currentLevel]; }

  const TILE = {
    WALL: '#',
    FLOOR: ' ',
    BOX: '$',
    TARGET: '.',
    PLAYER: '@',
    BOX_ON_TARGET: '*',
    PLAYER_ON_TARGET: '+'
  };

  const canvas = document.getElementById('board');
  const resetBtn = document.getElementById('reset');
  // UI elements for stats & undo (create before inserting into controls)
  const undoBtn = document.createElement('button'); undoBtn.textContent = '撤销';
  const movesLabel = document.createElement('div'); movesLabel.style.alignSelf = 'center'; movesLabel.style.color = '#333';
  const bestLabel = document.createElement('div'); bestLabel.style.alignSelf = 'center'; bestLabel.style.color = '#666';
  // create simple level controls
  const controlsWrap = document.createElement('div');
  controlsWrap.style.marginTop = '8px';
  controlsWrap.style.display = 'flex';
  controlsWrap.style.gap = '8px';
  controlsWrap.style.justifyContent = 'center';
  const prevBtn = document.createElement('button'); prevBtn.textContent = '上一关';
  const nextBtn = document.createElement('button'); nextBtn.textContent = '下一关';
  const lvlLabel = document.createElement('div'); lvlLabel.style.alignSelf = 'center'; lvlLabel.style.color = '#333';
  controlsWrap.appendChild(prevBtn); controlsWrap.appendChild(lvlLabel); controlsWrap.appendChild(nextBtn);
  // add undo and stats
  controlsWrap.appendChild(undoBtn);
  const statsWrap = document.createElement('div'); statsWrap.style.display='flex'; statsWrap.style.gap='10px'; statsWrap.style.alignItems='center';
  statsWrap.appendChild(movesLabel); statsWrap.appendChild(bestLabel);
  controlsWrap.appendChild(statsWrap);
  resetBtn.parentNode.insertBefore(controlsWrap, resetBtn.nextSibling);
  const ctx = canvas.getContext('2d');
  const cellSize = 48;

  // game state
  let map = [];
  let rows = 0, cols = 0;
  let player = {r:0,c:0};

  // history for undo
  let history = [];
  let moveCount = 0;


  function parseLevel(str){
    const lines = str.split('\n');
    rows = lines.length; cols = Math.max(...lines.map(l=>l.length));
    map = Array.from({length:rows}, (_,r)=>{
      const line = lines[r].padEnd(cols, ' ');
      return line.split('');
    });
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      if(map[r][c]===TILE.PLAYER || map[r][c]===TILE.PLAYER_ON_TARGET){ player.r=r; player.c=c; }
    }
  }

  function resizeCanvas(){
    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
  }

  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const x=c*cellSize, y=r*cellSize;
        const ch = map[r][c];
        // floor
        ctx.fillStyle = '#ddd';
        ctx.fillRect(x,y,cellSize,cellSize);
        // draw based on tile
        if(ch===TILE.WALL){ ctx.fillStyle='#444'; ctx.fillRect(x,y,cellSize,cellSize); }
        if(ch===TILE.TARGET){ ctx.fillStyle='#cfc'; ctx.fillRect(x+8,y+8,cellSize-16,cellSize-16); }
        if(ch===TILE.BOX || ch===TILE.BOX_ON_TARGET){ ctx.fillStyle='#b5651d'; ctx.fillRect(x+6,y+6,cellSize-12,cellSize-12); }
        if(ch===TILE.PLAYER || ch===TILE.PLAYER_ON_TARGET){ ctx.fillStyle='#1e90ff'; ctx.beginPath(); ctx.arc(x+cellSize/2,y+cellSize/2,cellSize/3,0,Math.PI*2); ctx.fill(); }
        // grid lines
        ctx.strokeStyle='rgba(0,0,0,0.05)'; ctx.strokeRect(x,y,cellSize,cellSize);
      }
    }
  }

  function cell(r,c){ return map[r] && map[r][c]; }

  function setCell(r,c,val){ map[r][c]=val; }

  function isFree(ch){ return ch===TILE.FLOOR || ch===TILE.TARGET; }

  function snapshotState(){
    return { map: map.map(row=>row.slice()), player: {r: player.r, c: player.c} };
  }

  function restoreState(s){
    map = s.map.map(row=>row.slice());
    player.r = s.player.r; player.c = s.player.c;
    rows = map.length; cols = map[0] ? map[0].length : 0;
    resizeCanvas();
    draw();
  }

  function pushSnapshot(){ history.push(snapshotState()); }

  function updateStats(){
    const key = `sokoban_best_${currentLevel}`;
    const best = localStorage.getItem(key);
    movesLabel.textContent = `步数: ${moveCount}`;
    bestLabel.textContent = `最佳: ${best !== null ? best : '-'} `;
  }

  function move(dr,dc){
    const r=player.r, c=player.c;
    const nr=r+dr, nc=c+dc;
    const dest = cell(nr,nc);
    if(dest===undefined || dest===TILE.WALL) return;
    // push box
    if(dest===TILE.BOX || dest===TILE.BOX_ON_TARGET){
      const br=nr+dr, bc=nc+dc;
      const beyond = cell(br,bc);
      if(!isFree(beyond)) return; // cannot push
      // move box
      if(beyond===TILE.TARGET) setCell(br,bc,TILE.BOX_ON_TARGET); else setCell(br,bc,TILE.BOX);
      // update dest to player
      if(dest===TILE.BOX_ON_TARGET) setCell(nr,nc,TILE.TARGET); else setCell(nr,nc,TILE.FLOOR);
      // move player
      stepTo(nr,nc);
    } else if(isFree(dest)){
      stepTo(nr,nc);
    } else {
      return;
    }
    moveCount++;
    pushSnapshot();
    draw();
    updateStats();
    if(checkWin()){
      const key = `sokoban_best_${currentLevel}`;
      const best = localStorage.getItem(key);
      if(best === null || moveCount < Number(best)){
        localStorage.setItem(key, String(moveCount));
        updateStats();
      }
      setTimeout(()=>alert('恭喜，你赢了！'),10);
    }
  }

  function stepTo(r,c){
    const cur = cell(player.r,player.c);
    // leave current
    if(cur===TILE.PLAYER_ON_TARGET) setCell(player.r,player.c,TILE.TARGET); else setCell(player.r,player.c,TILE.FLOOR);
    const dest = cell(r,c);
    if(dest===TILE.TARGET) setCell(r,c,TILE.PLAYER_ON_TARGET); else setCell(r,c,TILE.PLAYER);
    player.r=r; player.c=c;
  }

  function checkWin(){
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) if(map[r][c]===TILE.BOX) return false;
    return true;
  }

  function handleKey(e){
    const key = e.key;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)){
      e.preventDefault();
      if(key==='ArrowUp') move(-1,0);
      if(key==='ArrowDown') move(1,0);
      if(key==='ArrowLeft') move(0,-1);
      if(key==='ArrowRight') move(0,1);
    }
  }

  function reset(){ parseLevel(levelStr()); resizeCanvas(); draw(); updateLabel();
    // reset history and moves
    moveCount = 0; history = [snapshotState()]; updateStats();
  }

  function updateLabel(){ lvlLabel.textContent = `第 ${currentLevel+1} 关 / ${LEVELS.length} 关`; }

  prevBtn.addEventListener('click', ()=>{ currentLevel = Math.max(0,currentLevel-1); reset(); });
  nextBtn.addEventListener('click', ()=>{ currentLevel = Math.min(LEVELS.length-1,currentLevel+1); reset(); });

  // init
  parseLevel(levelStr());
  resizeCanvas();
  draw();
  updateLabel();
  // initialize history & stats
  moveCount = 0; history = [snapshotState()]; updateStats();
  // undo handler
  undoBtn.addEventListener('click', ()=>{
    if(history.length>1){
      history.pop();
      const s = history[history.length-1];
      restoreState(s);
      moveCount = Math.max(0, moveCount-1);
      updateStats();
    }
  });
  // set version display if present
  const verEl = document.getElementById('version'); if(verEl) verEl.textContent = `v${VERSION}`;
  window.addEventListener('keydown', handleKey);
  resetBtn.addEventListener('click', reset);
})();
