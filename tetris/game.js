// ================= 配置 =================
const CONFIG = {
  COLS: 10,
  ROWS: 20,
  SCALE: 0.7,
  VERSION: '1.0.4'
};

const COLORS = [
  null, '#00ffff', '#0000ff', '#ffa500',
  '#ffff00', '#00ff00', '#800080', '#ff0000'
];

const SHAPES = [
  [[1, 1, 1, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 1], [1, 1, 0]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 1, 0], [0, 1, 1]]
];

// ================= Game State =================
const gameState = {
  grid: Array.from({ length: CONFIG.ROWS }, () => Array(CONFIG.COLS).fill(0)),
  current: null,
  score: 0,
  paused: true,
  lastDrop: 0,
  dropInterval: 500
};

// ================= UI Elements =================
const ui = {};
let CELL = 0;
let canvas = null;
let ctx = null;

// ================= Piece Class =================
class Piece {
  constructor(shape) {
    this.shape = shape;
    this.color = SHAPES.indexOf(shape) + 1;
    this.x = Math.floor(CONFIG.COLS / 2) - 1;
    this.y = -1;
  }

  rotate() {
    this.shape = this.shape[0].map((_, i) =>
      this.shape.map(r => r[i]).reverse()
    );
  }
}

// ================= Core Functions =================
function initGame() {
  // Setup canvas
  canvas = document.getElementById('game');
  ctx = canvas.getContext('2d');
  
  // Calculate cell size
  let usableWidth = window.innerWidth * CONFIG.SCALE;
  let usableHeight = window.innerHeight * 0.65;
  CELL = Math.floor(Math.min(usableWidth / CONFIG.COLS, usableHeight / CONFIG.ROWS));
  
  canvas.width = CONFIG.COLS * CELL;
  canvas.height = CONFIG.ROWS * CELL;
  
  // Setup UI elements
  ui.scoreEl = document.getElementById('score');
  ui.pauseBtn = document.getElementById('pauseBtn');
  ui.versionEl = document.querySelector('.version');
  ui.leftBtn = document.getElementById('left');
  ui.rightBtn = document.getElementById('right');
  ui.downBtn = document.getElementById('down');
  ui.upBtn = document.getElementById('up');
  ui.rotateBtn = document.getElementById('rotate');
  
  // Initialize game
  gameState.current = randomPiece();
  gameState.lastDrop = Date.now();
  
  if (ui.versionEl) ui.versionEl.textContent = `v${CONFIG.VERSION}`;
  if (ui.pauseBtn) ui.pauseBtn.textContent = '开始';
  
  setupEventListeners();
  requestAnimationFrame(loop);
}

function randomPiece() {
  return new Piece(SHAPES[Math.floor(Math.random() * SHAPES.length)]);
}

function valid(piece, dx = 0, dy = 0) {
  for (let i = 0; i < piece.shape.length; i++) {
    for (let j = 0; j < piece.shape[i].length; j++) {
      if (!piece.shape[i][j]) continue;
      
      let x = piece.x + j + dx;
      let y = piece.y + i + dy;
      
      if (x < 0 || x >= CONFIG.COLS || y >= CONFIG.ROWS) return false;
      if (y >= 0 && gameState.grid[y][x]) return false;
    }
  }
  return true;
}

function merge(piece) {
  piece.shape.forEach((row, i) => {
    row.forEach((v, j) => {
      if (v && piece.y + i >= 0)
        gameState.grid[piece.y + i][piece.x + j] = piece.color;
    });
  });
}

function clearLines() {
  let lines = 0;
  for (let y = CONFIG.ROWS - 1; y >= 0; y--) {
    if (gameState.grid[y].every(c => c)) {
      gameState.grid.splice(y, 1);
      gameState.grid.unshift(Array(CONFIG.COLS).fill(0));
      lines++;
      y++;
    }
  }
  if (lines > 0) {
    gameState.score += lines * 10;
    if (ui.scoreEl) ui.scoreEl.textContent = 'Score: ' + gameState.score;
  }
}

function drop() {
  if (valid(gameState.current, 0, 1)) {
    gameState.current.y++;
  } else {
    merge(gameState.current);
    clearLines();
    gameState.current = randomPiece();
    
    if (!valid(gameState.current)) {
      alert('Game Over');
      gameState.grid = Array.from({ length: CONFIG.ROWS }, () => Array(CONFIG.COLS).fill(0));
      gameState.score = 0;
      if (ui.scoreEl) ui.scoreEl.textContent = 'Score: 0';
    }
  }
}

function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
  ctx.strokeStyle = '#333';
  ctx.strokeRect(x * CELL, y * CELL, CELL, CELL);
}

function drawGrid() {
  for (let y = 0; y < CONFIG.ROWS; y++)
    for (let x = 0; x < CONFIG.COLS; x++)
      drawCell(x, y, COLORS[gameState.grid[y][x]] || '#000');
}

function drawPiece(piece) {
  piece.shape.forEach((row, i) => {
    row.forEach((v, j) => {
      if (v && piece.y + i >= 0)
        drawCell(piece.x + j, piece.y + i, COLORS[piece.color]);
    });
  });
}

function update() {
  if (Date.now() - gameState.lastDrop > gameState.dropInterval) {
    drop();
    gameState.lastDrop = Date.now();
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawPiece(gameState.current);
  
  if (gameState.paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.floor(CELL * 1.2)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('已暂停', canvas.width / 2, canvas.height / 2);
  }
}

function loop() {
  if (!gameState.paused) {
    update();
  }
  render();
  requestAnimationFrame(loop);
}

function rotateSafe() {
  gameState.current.rotate();
  if (!valid(gameState.current))
    for (let i = 0; i < 3; i++) gameState.current.rotate();
}

function togglePause() {
  gameState.paused = !gameState.paused;
  if (ui.pauseBtn) {
    ui.pauseBtn.textContent = gameState.paused ? '继续' : '暂停';
  }
}

// ================= Event Listeners =================
let downHoldTimer = null;
let leftHoldTimer = null;
let rightHoldTimer = null;

function setupEventListeners() {
  // Pause button
  if (ui.pauseBtn) {
    ui.pauseBtn.addEventListener('click', () => {
      if (gameState.paused) {
        gameState.paused = false;
        ui.pauseBtn.textContent = '暂停';
      } else {
        gameState.paused = true;
        ui.pauseBtn.textContent = '继续';
      }
    });
  }
  
  // Keyboard controls
  document.addEventListener('keydown', e => {
    if (e.key === 'p' || e.key === 'P') {
      togglePause();
      return;
    }
    if (gameState.paused) return;
    
    if (e.key === 'ArrowLeft' && valid(gameState.current, -1, 0)) gameState.current.x--;
    if (e.key === 'ArrowRight' && valid(gameState.current, 1, 0)) gameState.current.x++;
    if (e.key === 'ArrowDown') { drop(); gameState.lastDrop = Date.now(); }
    if (e.key === 'ArrowUp') rotateSafe();
  });
  
  // Touch controls
  if (ui.leftBtn) {
    ui.leftBtn.addEventListener('touchstart', e => {
      e.preventDefault();
      if (gameState.paused) return;
      if (valid(gameState.current, -1, 0)) gameState.current.x--;
      if (leftHoldTimer) clearInterval(leftHoldTimer);
      leftHoldTimer = setInterval(() => {
        if (!gameState.paused && valid(gameState.current, -1, 0)) gameState.current.x--;
      }, 120);
    });
    ui.leftBtn.addEventListener('touchend', e => {
      e.preventDefault();
      if (leftHoldTimer) {
        clearInterval(leftHoldTimer);
        leftHoldTimer = null;
      }
    });
    ui.leftBtn.addEventListener('touchcancel', e => {
      e.preventDefault();
      if (leftHoldTimer) {
        clearInterval(leftHoldTimer);
        leftHoldTimer = null;
      }
    });
  }
  
  if (ui.rightBtn) {
    ui.rightBtn.addEventListener('touchstart', e => {
      e.preventDefault();
      if (gameState.paused) return;
      if (valid(gameState.current, 1, 0)) gameState.current.x++;
      if (rightHoldTimer) clearInterval(rightHoldTimer);
      rightHoldTimer = setInterval(() => {
        if (!gameState.paused && valid(gameState.current, 1, 0)) gameState.current.x++;
      }, 120);
    });
    ui.rightBtn.addEventListener('touchend', e => {
      e.preventDefault();
      if (rightHoldTimer) {
        clearInterval(rightHoldTimer);
        rightHoldTimer = null;
      }
    });
    ui.rightBtn.addEventListener('touchcancel', e => {
      e.preventDefault();
      if (rightHoldTimer) {
        clearInterval(rightHoldTimer);
        rightHoldTimer = null;
      }
    });
  }
  
  if (ui.downBtn) {
    ui.downBtn.addEventListener('touchstart', e => {
      e.preventDefault();
      if (gameState.paused) return;
      drop();
      gameState.lastDrop = Date.now();
      if (downHoldTimer) clearInterval(downHoldTimer);
      downHoldTimer = setInterval(() => {
        if (!gameState.paused) {
          drop();
          gameState.lastDrop = Date.now();
        }
      }, 120);
    });
    ui.downBtn.addEventListener('touchend', e => {
      e.preventDefault();
      if (downHoldTimer) {
        clearInterval(downHoldTimer);
        downHoldTimer = null;
      }
    });
    ui.downBtn.addEventListener('touchcancel', e => {
      e.preventDefault();
      if (downHoldTimer) {
        clearInterval(downHoldTimer);
        downHoldTimer = null;
      }
    });
  }
  
  if (ui.upBtn) {
    ui.upBtn.addEventListener('touchstart', e => {
      e.preventDefault();
      if (!gameState.paused) rotateSafe();
    });
  }
  
  if (ui.rotateBtn) {
    ui.rotateBtn.addEventListener('touchstart', e => {
      e.preventDefault();
      if (!gameState.paused) rotateSafe();
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
