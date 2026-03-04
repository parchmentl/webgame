const CONFIG = {
  VERSION: '1.1.0'
};

const container = document.getElementById('game-container');
const scoreEl = document.getElementById('score');
const restartBtn = document.getElementById('restartBtn');
const clockEl = document.getElementById('clock');

let grid = [];
let score = 0;
let audioCtx = null;

function ensureAudioContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playMergeSound() {
  const ctx = ensureAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(620, now);
  osc.frequency.exponentialRampToValueAtTime(980, now + 0.08);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.36, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.10);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.11);
}

// 初始化空格
function initGrid() {
  grid = [];
  container.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    grid[i] = [];
    for (let j = 0; j < 4; j++) {
      grid[i][j] = 0;
      const cell = document.createElement('div');
      cell.classList.add('cell');
      container.appendChild(cell);
    }
  }
  addRandom();
  addRandom();
  updateGrid();
}

// 更新界面
function updateGrid() {
  const cells = container.querySelectorAll('.cell');
  let k = 0;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const val = grid[i][j];
      const cell = cells[k++];
      cell.textContent = val > 0 ? val : '';
      cell.className = 'cell';
      if (val > 0) cell.classList.add('cell-' + val);
    }
  }
  scoreEl.textContent = score;
}

// 随机生成2或4
function addRandom() {
  const empty = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (grid[i][j] === 0) empty.push([i, j]);
    }
  }
  if (empty.length === 0) return;
  const [i, j] = empty[Math.floor(Math.random() * empty.length)];
  grid[i][j] = Math.random() < 0.9 ? 2 : 4;
}

// 移动逻辑
function move(dir) {
  let moved = false;
  let merged = false;
  function slide(row) {
    row = row.filter(v => v);
    for (let i = 0; i < row.length - 1; i++) {
      if (row[i] === row[i + 1]) {
        row[i] *= 2;
        score += row[i];
        row[i + 1] = 0;
        merged = true;
      }
    }
    row = row.filter(v => v);
    while (row.length < 4) row.push(0);
    return row;
  }
  if (dir === 'left') {
    for (let i = 0; i < 4; i++) {
      const old = grid[i].slice();
      grid[i] = slide(grid[i]);
      if (old.toString() !== grid[i].toString()) moved = true;
    }
  } else if (dir === 'right') {
    for (let i = 0; i < 4; i++) {
      const old = grid[i].slice();
      grid[i] = slide(grid[i].reverse()).reverse();
      if (old.toString() !== grid[i].toString()) moved = true;
    }
  } else if (dir === 'up') {
    for (let j = 0; j < 4; j++) {
      const col = [];
      for (let i = 0; i < 4; i++) col.push(grid[i][j]);
      const old = col.slice();
      const newCol = slide(col);
      for (let i = 0; i < 4; i++) grid[i][j] = newCol[i];
      if (old.toString() !== newCol.toString()) moved = true;
    }
  } else if (dir === 'down') {
    for (let j = 0; j < 4; j++) {
      const col = [];
      for (let i = 0; i < 4; i++) col.push(grid[i][j]);
      const old = col.slice();
      const newCol = slide(col.reverse()).reverse();
      for (let i = 0; i < 4; i++) grid[i][j] = newCol[i];
      if (old.toString() !== newCol.toString()) moved = true;
    }
  }
  if (moved) {
    addRandom();
    updateGrid();
    if (merged) playMergeSound();
    if (checkGameOver()) alert('游戏结束！得分: ' + score);
  }
}

// 检测游戏结束
function checkGameOver() {
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (grid[i][j] === 0) return false;
      if (i < 3 && grid[i][j] === grid[i + 1][j]) return false;
      if (j < 3 && grid[i][j] === grid[i][j + 1]) return false;
    }
  }
  return true;
}

function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  clockEl.textContent = `${h}:${m}`;
}

// 键盘控制
document.addEventListener('keydown', e => {
  ensureAudioContext();
  if (e.key === 'ArrowLeft') move('left');
  else if (e.key === 'ArrowRight') move('right');
  else if (e.key === 'ArrowUp') move('up');
  else if (e.key === 'ArrowDown') move('down');
});

// 触屏滑动控制（只在棋盘区域生效，避免浏览器手势返回）
let startX = 0, startY = 0;
container.addEventListener('touchstart', e => {
  ensureAudioContext();
  if (e.touches.length !== 1) return;
  const touch = e.touches[0];
  startX = touch.clientX;
  startY = touch.clientY;
}, { passive: false });

container.addEventListener('touchend', e => {
  if (e.changedTouches.length !== 1) return;
  const touch = e.changedTouches[0];
  const dx = touch.clientX - startX;
  const dy = touch.clientY - startY;
  if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
  // 阻止浏览器的默认左右滑动返回等行为
  e.preventDefault();
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) move('right');
    else move('left');
  } else {
    if (dy > 0) move('down');
    else move('up');
  }
}, { passive: false });

// 重新开始按钮
restartBtn.addEventListener('click', () => {
  ensureAudioContext();
  initGrid();
});

// 初始化
function initApp() {
  initGrid();
  updateClock();
  setInterval(updateClock, 30000);
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
