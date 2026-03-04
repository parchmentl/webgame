const CONFIG = {
  VERSION: 'v1.5.0 · AI: 置换表 + 优化不会'
};

const SIZE = 15;
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('reset');
const versionEl = document.getElementById('version');

const HUMAN = 1; // 玩家执黑
const AI = 2;    // AI 执白
const MAX_DEPTH = 7; // 搜索深度（奇数：我方-对方-我方）

let cell = 0;
let offset = 0;
let board = [];
let current = HUMAN; // 当前执子方
let gameOver = false;
let moves = 0;
let lastMove = null; // 记录最后一步落子位置
let transpositionTable = {}; // 置换表：缓存计算过的局面
let tableHits = 0;  // 置换表命中次数（调试用）

function init() {
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  current = HUMAN;
  gameOver = false;
  moves = 0;
  lastMove = null;
  transpositionTable = {}; // 清空置换表
  tableHits = 0;
  if (versionEl) {
    versionEl.textContent = CONFIG.VERSION;
  }
  resizeBoard();
  updateStatus();
}

function resizeBoard() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const side = Math.min(rect.width, window.innerHeight - 100);
  canvas.width = side * dpr;
  canvas.height = side * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  cell = side / (SIZE + 1);
  offset = cell;
  draw();
}

function draw() {
  const side = canvas.clientWidth;
  ctx.clearRect(0, 0, side, side);

  // 画棋盘格
  ctx.strokeStyle = '#6e4e2f';
  ctx.lineWidth = 1;
  for (let i = 0; i < SIZE; i++) {
    const p = offset + i * cell;
    ctx.beginPath();
    ctx.moveTo(offset, p);
    ctx.lineTo(offset + (SIZE - 1) * cell, p);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p, offset);
    ctx.lineTo(p, offset + (SIZE - 1) * cell);
    ctx.stroke();
  }

  // 画星位
  const stars = [[3, 3], [3, 7], [3, 11], [7, 3], [7, 7], [7, 11], [11, 3], [11, 7], [11, 11]];
  ctx.fillStyle = '#5c3d1f';
  stars.forEach(([r, c]) => {
    ctx.beginPath();
    ctx.arc(offset + c * cell, offset + r * cell, Math.max(2, cell * 0.08), 0, Math.PI * 2);
    ctx.fill();
  });

  // 画棋子
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!board[r][c]) continue;
      drawStone(r, c, board[r][c]);
    }
  }

  // 高亮显示最后一步的落子位置
  if (lastMove) {
    const { r, c } = lastMove;
    const x = offset + c * cell;
    const y = offset + r * cell;
    const radius = cell * 0.48;
    ctx.strokeStyle = '#ff9800';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawStone(r, c, who) {
  const x = offset + c * cell;
  const y = offset + r * cell;
  const radius = cell * 0.42;
  const g = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.35, radius * 0.2, x, y, radius);
  if (who === 1) {
    g.addColorStop(0, '#666');
    g.addColorStop(1, '#111');
  } else {
    g.addColorStop(0, '#fff');
    g.addColorStop(1, '#d9d9d9');
  }
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
}

function updateStatus(msg) {
  if (msg) { statusEl.textContent = msg; return; }
  if (gameOver) {
    statusEl.textContent = '对局结束';
  } else {
    statusEl.textContent = current === HUMAN ? '你的回合（黑棋）' : 'AI 回合（白棋）';
  }
}

function xyToRC(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const c = Math.round((x - offset) / cell);
  const r = Math.round((y - offset) / cell);
  if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return null;
  const px = offset + c * cell;
  const py = offset + r * cell;
  if (Math.hypot(x - px, y - py) > cell * 0.45) return null;
  return { r, c };
}

function checkWin(r, c, who) {
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    let count = 1;
    count += scan(r, c, dr, dc, who);
    count += scan(r, c, -dr, -dc, who);
    if (count >= 5) return true;
  }
  return false;
}

function scan(r, c, dr, dc, who) {
  let n = 0;
  let nr = r + dr, nc = c + dc;
  while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === who) {
    n++; nr += dr; nc += dc;
  }
  return n;
}

function hasWin(who) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === who && checkWin(r, c, who)) return true;
    }
  }
  return false;
}

function generateCandidates() {
  const candidates = [];
  let hasStone = false;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== 0) {
        hasStone = true;
        break;
      }
    }
    if (hasStone) break;
  }

  // 开局无子时，直接走正中
  if (!hasStone) {
    const center = Math.floor(SIZE / 2);
    return [{ r: center, c: center }];
  }

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== 0) continue;
      let near = false;
      for (let dr = -2; dr <= 2 && !near; dr++) {
        for (let dc = -2; dc <= 2 && !near; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
          if (board[nr][nc] !== 0) near = true;
        }
      }
      if (!near) continue;
      const score = localScore(r, c, AI) + localScore(r, c, HUMAN) * 0.9;
      candidates.push({ r, c, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const LIMIT = 20;
  return candidates.slice(0, LIMIT).map(x => ({ r: x.r, c: x.c }));
}

function localScore(r, c, who) {
  // 改进的局部评分：四个方向的连续子、活度、防守价值
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  let score = 0;
  for (const [dr, dc] of dirs) {
    let count1 = 0, open1 = 0;
    let rr = r + dr, cc = c + dc;
    while (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && board[rr][cc] === who) {
      count1++; rr += dr; cc += dc;
    }
    const blockedRight = (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE || board[rr][cc] !== 0);
    if (!blockedRight) open1 = 1;

    let count2 = 0, open2 = 0;
    rr = r - dr; cc = c - dc;
    while (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && board[rr][cc] === who) {
      count2++; rr -= dr; cc -= dc;
    }
    const blockedLeft = (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE || board[rr][cc] !== 0);
    if (!blockedLeft) open2 = 1;

    const total = count1 + count2;
    const openEnds = open1 + open2;
    if (total <= 0) continue;

    // 改进的评分：同时考虑连续子数、活度和防守价值
    if (total >= 4) score += 500000;  // 已经能赢
    else if (total === 3) {
      if (openEnds === 2) score += 200000;  // 活三 - 进一步提高
      else if (openEnds === 1) score += 15000; // 冲三
    } else if (total === 2) {
      if (openEnds === 2) score += 50000;   // 活二 - 大幅提高
      else if (openEnds === 1) score += 2000; // 冲二 - 大幅提高
    } else if (total === 1) {
      if (openEnds === 2) score += 1000;     // 单子两头开
      else if (openEnds === 1) score += 100;  // 单子一端开
    }
  }
  return score;
}

function evaluateBoard() {
  if (hasWin(AI)) return 1e9;
  if (hasWin(HUMAN)) return -1e9;
  let scoreAI = 0;
  let scoreHuman = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) continue;
      const who = board[r][c];
      const s = localScore(r, c, who);
      if (who === AI) scoreAI += s;
      else scoreHuman += s;
    }
  }
  return scoreAI - scoreHuman;
}

// 生成棋盘哈希值，用于置换表
function boardHash() {
  let hash = '';
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      hash += board[r][c];
    }
  }
  return hash;
}

function alphaBeta(depth, alpha, beta, player) {
  // 检查置换表
  const hash = boardHash();
  const key = `${hash}_${depth}_${player}`;
  if (transpositionTable[key] !== undefined) {
    tableHits++;
    return transpositionTable[key];
  }

  if (depth === 0) return evaluateBoard();
  if (hasWin(AI) || hasWin(HUMAN)) return evaluateBoard();

  const moves = generateCandidates();
  if (moves.length === 0) return 0;

  let bestValue;
  if (player === AI) {
    bestValue = -Infinity;
    for (const { r, c } of moves) {
      board[r][c] = AI;
      const score = alphaBeta(depth - 1, alpha, beta, HUMAN);
      board[r][c] = 0;
      if (score > bestValue) bestValue = score;
      if (bestValue > alpha) alpha = bestValue;
      if (alpha >= beta) break;
    }
  } else {
    bestValue = Infinity;
    for (const { r, c } of moves) {
      board[r][c] = HUMAN;
      const score = alphaBeta(depth - 1, alpha, beta, AI);
      board[r][c] = 0;
      if (score < bestValue) bestValue = score;
      if (bestValue < beta) beta = bestValue;
      if (alpha >= beta) break;
    }
  }

  // 存入置换表
  transpositionTable[key] = bestValue;
  return bestValue;
}

function doMove(r, c) {
  if (gameOver) return;
  if (board[r][c] !== 0) return;

  board[r][c] = current;
  lastMove = { r, c }; // 记录本步落子位置
  moves++;
  draw();

  if (checkWin(r, c, current)) {
    gameOver = true;
    if (current === HUMAN) {
      updateStatus(`你（黑棋）获胜，共 ${moves} 手`);
    } else {
      updateStatus(`AI（白棋）获胜，共 ${moves} 手`);
    }
    return;
  }
  if (moves === SIZE * SIZE) {
    gameOver = true;
    updateStatus('平局');
    return;
  }

  current = current === HUMAN ? AI : HUMAN;
  updateStatus();
}

function placeAt(clientX, clientY) {
  if (gameOver) return;
  // 只允许玩家在自己的回合点击落子
  if (current !== HUMAN) return;
  const rc = xyToRC(clientX, clientY);
  if (!rc) return;
  const { r, c } = rc;
  doMove(r, c);
  // 玩家落子后，若游戏未结束则轮到 AI
  if (!gameOver && current === AI) {
    setTimeout(aiMove, 200);
  }
}

function aiMove() {
  if (gameOver || current !== AI) return;

  const move = findBestMove();
  if (!move) return;
  const { r, c } = move;
  doMove(r, c);
}

function findBestMove() {
  const candidates = generateCandidates();
  if (candidates.length === 0) return null;

  // 第一层防守：检查对手是否有立即获胜的位置
  for (const { r, c } of candidates) {
    board[r][c] = HUMAN;
    if (checkWin(r, c, HUMAN)) {
      board[r][c] = 0;
      return { r, c }; // 立即防守必赢局面
    }
    board[r][c] = 0;
  }

  // 第二层防守：检查对手是否有"活三"威胁（两端都开放的三子）
  let activeThreatMoves = [];
  for (const { r, c } of candidates) {
    board[r][c] = HUMAN;
    let isActiveThreat = false;
    outer: for (const [dr, dc] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      let count1 = 0, open1 = 0;
      let rr = r + dr, cc = c + dc;
      while (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && board[rr][cc] === HUMAN) {
        count1++; rr += dr; cc += dc;
      }
      if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && board[rr][cc] === 0) open1 = 1;

      let count2 = 0, open2 = 0;
      rr = r - dr; cc = c - dc;
      while (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && board[rr][cc] === HUMAN) {
        count2++; rr -= dr; cc -= dc;
      }
      if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && board[rr][cc] === 0) open2 = 1;

      if (count1 + count2 === 3 && open1 === 1 && open2 === 1) {
        isActiveThreat = true;
        break outer;
      }
    }
    board[r][c] = 0;
    if (isActiveThreat) {
      activeThreatMoves.push({ r, c });
    }
  }

  if (activeThreatMoves.length > 0) {
    return activeThreatMoves[Math.floor(Math.random() * activeThreatMoves.length)];
  }

  // 第三层防守：检查对手的关键活二（两端开放的活二）
  let criticalTwoMoves = [];
  for (const { r, c } of candidates) {
    board[r][c] = HUMAN;
    let hasCriticalTwo = false;
    outer2: for (const [dr, dc] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      let count1 = 0, open1 = 0;
      let rr = r + dr, cc = c + dc;
      while (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && board[rr][cc] === HUMAN) {
        count1++; rr += dr; cc += dc;
      }
      if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && board[rr][cc] === 0) open1 = 1;

      let count2 = 0, open2 = 0;
      rr = r - dr; cc = c - dc;
      while (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && board[rr][cc] === HUMAN) {
        count2++; rr -= dr; cc -= dc;
      }
      if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && board[rr][cc] === 0) open2 = 1;

      // 关键活二：两端都开放的活二
      if (count1 + count2 === 2 && open1 === 1 && open2 === 1) {
        hasCriticalTwo = true;
        break outer2;
      }
    }
    board[r][c] = 0;
    if (hasCriticalTwo) {
      criticalTwoMoves.push({ r, c });
    }
  }

  if (criticalTwoMoves.length > 0) {
    return criticalTwoMoves[Math.floor(Math.random() * criticalTwoMoves.length)];
  }

  // 进攻逻辑：搜索最佳落子点
  let bestScore = -Infinity;
  let bestMoves = [];

  // 对候选着法进行威胁排序：优先考虑威胁大的着法
  const rankedCandidates = candidates.map(({ r, c }) => {
    const aiThreat = localScore(r, c, AI);  // 己方进攻威胁
    const humanThreat = localScore(r, c, HUMAN) * 1.2;  // 对手防守威胁（权重更高）
    return { r, c, priority: aiThreat + humanThreat };
  }).sort((a, b) => b.priority - a.priority);

  for (const { r, c } of rankedCandidates) {
    board[r][c] = AI;
    const score = alphaBeta(MAX_DEPTH - 1, -Infinity, Infinity, HUMAN);
    board[r][c] = 0;
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [{ r, c }];
    } else if (score === bestScore) {
      bestMoves.push({ r, c });
    }
  }

  if (bestMoves.length === 0) return candidates[0];
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

// Event listeners
canvas.addEventListener('click', e => placeAt(e.clientX, e.clientY));
canvas.addEventListener('touchend', e => {
  const t = e.changedTouches[0];
  placeAt(t.clientX, t.clientY);
}, { passive: true });

window.addEventListener('resize', resizeBoard);
resetBtn.addEventListener('click', init);

// Initialize
function initApp() {
  init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
