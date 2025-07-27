const homeScreen = document.getElementById('home-screen');
const gameScreen = document.getElementById('game-screen');
const grid = document.getElementById('grid');
const scoreDisplay = document.getElementById('score');
const startBtn = document.getElementById('start-btn');
const clickSpeedBtn = document.getElementById('click-speed');
const columnInput = document.getElementById('column-input');

let board = [];
let playerPos = { row: 0, col: 0 };
let score = 0;
let speed = 1;

// Sprite paths
const SPRITES = {
  player: 'img/player_default.png',
  coin1: 'img/coin1.png',
  coin3: 'img/coin3.png',
  coin10: 'img/coin10.png',
};

const PIECE_VALUES = [1, 3, 10];
const PIECE_CLASSES = ['coin1', 'coin3', 'coin10'];
const PROBABILITIES = [0.6, 0.3, 0.1];

function initGrid() {
  board = [];
  grid.innerHTML = '';
  for (let r = 0; r < 4; r++) {
    const row = [];
    for (let c = 0; c < 4; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      grid.appendChild(cell);
      row.push({ value: 0, element: cell });
    }
    board.push(row);
  }
}

function placeRandomPiece() {
  const row = Math.floor(Math.random() * 4);
  const col = Math.floor(Math.random() * 4);

  const rand = Math.random();
  let value = 0;
  if (rand < PROBABILITIES[0]) value = 1;
  else if (rand < PROBABILITIES[0] + PROBABILITIES[1]) value = 3;
  else value = 10;

  const sprite = SPRITES[`coin${value}`];
  const cell = board[row][col];
  cell.value = value;
  cell.element.innerHTML = `<img src="${sprite}" alt="coin${value}" />`;
}

function clearCell(row, col) {
  board[row][col].value = 0;
  board[row][col].element.innerHTML = '';
}

function movePlayer() {
  if (playerPos.row >= 4) return;

  const { row, col } = playerPos;
  const cell = board[row][col];

  // Collect piece if present
  if (cell.value > 0) {
    score += cell.value;
    scoreDisplay.textContent = 'Score : ' + score;
  }

  // Clear previous cell
  clearCell(row, col);

  playerPos.row += 1;

  if (playerPos.row < 4) {
    board[playerPos.row][col].element.innerHTML = `<img src="${SPRITES.player}" alt="player" />`;
  }
}

function startMovement() {
  board[playerPos.row][playerPos.col].element.innerHTML = `<img src="${SPRITES.player}" alt="player" />`;
  const interval = setInterval(() => {
    movePlayer();
    if (playerPos.row >= 4) clearInterval(interval);
  }, 1000 / speed);
}

startBtn.addEventListener('click', () => {
  homeScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  initGrid();
  setInterval(placeRandomPiece, 1500);
});

clickSpeedBtn.addEventListener('click', () => {
  const col = parseInt(columnInput.value);
  if (isNaN(col) || col < 0 || col > 3) {
    alert('Choisis une colonne entre 0 et 3');
    return;
  }

  playerPos = { row: 0, col: col };
  // Pour l’instant : chaque clic sur "Valider" augmente la vitesse de 1 jusqu’à 3
  speed = (speed % 3) + 1;

  startMovement();
});
