(function(){
  const levelStr = [
    "#####",
    "#.@ #",
    "# $ #",
    "# . #",
    "#####"
  ].join('\n');

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
  const ctx = canvas.getContext('2d');
  const cellSize = 48;

  let map = [];
  let rows = 0, cols = 0;
  let player = {r:0,c:0};

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

  function move(dr,dc){
    const r=player.r, c=player.c;
    const nr=r+dr, nc=c+dc;
    const dest = cell(nr,nc);
    if(dest===TILE.WALL || dest===undefined) return;
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
    }
    draw();
    if(checkWin()) setTimeout(()=>alert('恭喜，你赢了！'),10);
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

  function reset(){ parseLevel(levelStr); resizeCanvas(); draw(); }

  // init
  parseLevel(levelStr);
  resizeCanvas();
  draw();
  window.addEventListener('keydown', handleKey);
  resetBtn.addEventListener('click', reset);
})();
