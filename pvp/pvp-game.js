let currentPlayer = 'X';
let gameBoard = ['', '', '', '', '', '', '', '', ''];
let gameActive = true;
let scores = {
    X: 0,
    O: 0
};
let selectedGridSize = 3;
let winningCells = [];
let playerNames = {
    X: 'Player X',
    O: 'Player O'
};

// Show setup modal when page loads
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('setupModal');
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
});

// Select grid size
function selectGridSize(size) {
    selectedGridSize = size;
    document.querySelectorAll('.btn-primary').forEach(btn => {
        btn.classList.remove('bg-indigo-600');
        btn.classList.add('bg-gray-400');
    });
    event.target.classList.remove('bg-gray-400');
    event.target.classList.add('bg-indigo-600');
}

// Start game with selected options
function startGame() {
    const playerXName = document.getElementById('playerXName').value.trim();
    const playerOName = document.getElementById('playerOName').value.trim();
    
    if (!playerXName || !playerOName) {
        alert('Please enter names for both players');
        return;
    }
    
    playerNames.X = playerXName;
    playerNames.O = playerOName;
    
    const modal = document.getElementById('setupModal');
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
    initGame();
}

// Initialize the game
function initGame() {
    gameBoard = Array(selectedGridSize * selectedGridSize).fill('');
    gameActive = true;
    currentPlayer = 'X';
    winningCells = [];
    updateGameStatus();
    updateScoreDisplay();
    createGameBoard();
}

// Create the game board based on selected grid size
function createGameBoard() {
    const gameContainer = document.querySelector('.grid');
    gameContainer.innerHTML = '';
    gameContainer.className = `grid grid-cols-${selectedGridSize} gap-2 sm:gap-3 md:gap-4 mb-6 w-full max-w-[90vw] sm:max-w-[80vw] md:max-w-[70vw] lg:max-w-[60vw] xl:max-w-[40vw] mx-auto`;
    
    for (let i = 0; i < selectedGridSize * selectedGridSize; i++) {
        const cell = document.createElement('div');
        cell.className = 'game-cell aspect-square rounded-xl flex items-center justify-center text-3xl sm:text-4xl md:text-5xl font-bold cursor-pointer';
        cell.onclick = () => makeMove(i);
        gameContainer.appendChild(cell);
    }
}

// Handle player moves
function makeMove(cellIndex) {
    if (!gameActive || gameBoard[cellIndex] !== '') return;

    gameBoard[cellIndex] = currentPlayer;
    const cell = document.querySelectorAll('.game-cell')[cellIndex];
    cell.textContent = currentPlayer;
    cell.classList.add(currentPlayer === 'X' ? 'text-indigo-600' : 'text-purple-600');

    if (checkWin()) {
        gameActive = false;
        scores[currentPlayer]++;
        updateScoreDisplay();
        const winnerName = currentPlayer === 'X' ? playerNames.X : playerNames.O;
        document.getElementById('gameStatus').textContent = `${winnerName} Wins!`;
        showNotification(`${winnerName} Wins! 🎉`, 'win');
        animateWinningCells();
        setTimeout(initGame, 2000);
        return;
    }

    if (checkDraw()) {
        gameActive = false;
        document.getElementById('gameStatus').textContent = "It's a Draw!";
        showNotification("It's a Draw! 🤝", 'draw');
        setTimeout(initGame, 2000);
        return;
    }

    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateGameStatus();
}

// Animate winning cells
function animateWinningCells() {
    winningCells.forEach(index => {
        const cell = document.querySelectorAll('.game-cell')[index];
        cell.classList.add('winning-cell');
    });
}

// Check for win conditions
function checkWin() {
    const size = selectedGridSize;
    const requiredConsecutive = size; // Require same number of consecutive cells as grid size
    
    // Check rows
    for (let i = 0; i < size; i++) {
        for (let j = 0; j <= size - requiredConsecutive; j++) {
            const firstCell = gameBoard[i * size + j];
            if (!firstCell) continue;
            
            let isWin = true;
            for (let k = 1; k < requiredConsecutive; k++) {
                if (gameBoard[i * size + j + k] !== firstCell) {
                    isWin = false;
                    break;
                }
            }
            
            if (isWin) {
                winningCells = Array.from({length: requiredConsecutive}, (_, k) => i * size + j + k);
                return true;
            }
        }
    }
    
    // Check columns
    for (let i = 0; i < size; i++) {
        for (let j = 0; j <= size - requiredConsecutive; j++) {
            const firstCell = gameBoard[j * size + i];
            if (!firstCell) continue;
            
            let isWin = true;
            for (let k = 1; k < requiredConsecutive; k++) {
                if (gameBoard[(j + k) * size + i] !== firstCell) {
                    isWin = false;
                    break;
                }
            }
            
            if (isWin) {
                winningCells = Array.from({length: requiredConsecutive}, (_, k) => (j + k) * size + i);
                return true;
            }
        }
    }
    
    // Check diagonals (top-left to bottom-right)
    for (let i = 0; i <= size - requiredConsecutive; i++) {
        for (let j = 0; j <= size - requiredConsecutive; j++) {
            const firstCell = gameBoard[i * size + j];
            if (!firstCell) continue;
            
            let isWin = true;
            for (let k = 1; k < requiredConsecutive; k++) {
                if (gameBoard[(i + k) * size + (j + k)] !== firstCell) {
                    isWin = false;
                    break;
                }
            }
            
            if (isWin) {
                winningCells = Array.from({length: requiredConsecutive}, (_, k) => (i + k) * size + (j + k));
                return true;
            }
        }
    }
    
    // Check diagonals (top-right to bottom-left)
    for (let i = 0; i <= size - requiredConsecutive; i++) {
        for (let j = requiredConsecutive - 1; j < size; j++) {
            const firstCell = gameBoard[i * size + j];
            if (!firstCell) continue;
            
            let isWin = true;
            for (let k = 1; k < requiredConsecutive; k++) {
                if (gameBoard[(i + k) * size + (j - k)] !== firstCell) {
                    isWin = false;
                    break;
                }
            }
            
            if (isWin) {
                winningCells = Array.from({length: requiredConsecutive}, (_, k) => (i + k) * size + (j - k));
                return true;
            }
        }
    }
    
    return false;
}

// Check for draw
function checkDraw() {
    return gameBoard.every(cell => cell !== '');
}

// Update game status display
function updateGameStatus() {
    document.getElementById('gameStatus').textContent = `${playerNames[currentPlayer]}'s Turn`;
}

// Update score display
function updateScoreDisplay() {
    document.getElementById('scoreDisplay').innerHTML = `
        <div class="flex justify-between items-center">
            <span class="text-indigo-600 font-semibold">${playerNames.X}: ${scores.X}</span>
            <span class="text-purple-600 font-semibold">${playerNames.O}: ${scores.O}</span>
        </div>
    `;
}

// Reset scores
function resetScores() {
    scores = { X: 0, O: 0 };
    updateScoreDisplay();
}

// Reset game
function resetGame() {
    initGame();
}

// Change grid size
function changeGridSize(size) {
    selectedGridSize = size;
    initGame();
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initGame();
    
    // Add grid size selection buttons
    const gameContainer = document.querySelector('.container');
    const gridSizeSelector = document.createElement('div');
    gridSizeSelector.className = 'flex justify-center space-x-4 mb-6';
    gridSizeSelector.innerHTML = `
        <button onclick="changeGridSize(3)" class="btn-primary text-white px-4 py-2 rounded-lg">3x3</button>
        <button onclick="changeGridSize(4)" class="btn-primary text-white px-4 py-2 rounded-lg">4x4</button>
        <button onclick="changeGridSize(5)" class="btn-primary text-white px-4 py-2 rounded-lg">5x5</button>
    `;
    gameContainer.insertBefore(gridSizeSelector, gameContainer.firstChild);
}); 