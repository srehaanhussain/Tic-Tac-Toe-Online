let currentPlayer = 'X';
let gameBoard = ['', '', '', '', '', '', '', '', ''];
let gameActive = true;
let scores = {
    X: 0,
    O: 0
};
let selectedGridSize = 3;
let winningCells = [];
let playerName = 'Player';
let selectedDifficulty = 'medium';
let isAIThinking = false;

// Show setup modal when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Add grid size selection buttons to setup modal
    const setupModal = document.getElementById('setupModal');
    const gridSizeSelector = document.createElement('div');
    gridSizeSelector.className = 'flex justify-center space-x-4 mb-6';
    gridSizeSelector.innerHTML = `
        <button onclick="selectGridSize(3)" class="btn-primary text-white px-4 py-2 rounded-lg">3x3</button>
        <button onclick="selectGridSize(4)" class="btn-primary text-white px-4 py-2 rounded-lg">4x4</button>
        <button onclick="selectGridSize(5)" class="btn-primary text-white px-4 py-2 rounded-lg">5x5</button>
    `;
    
    // Insert grid size selector after the difficulty buttons
    const difficultySection = setupModal.querySelector('.difficulty-section');
    if (difficultySection) {
        difficultySection.insertAdjacentElement('afterend', gridSizeSelector);
    }
    
    // Show setup modal
    setupModal.style.display = 'flex';
    document.body.classList.add('modal-open');
});

// Select grid size
function selectGridSize(size) {
    selectedGridSize = size;
    // Update button styles
    document.querySelectorAll('.btn-primary').forEach(btn => {
        btn.classList.remove('bg-indigo-600');
        btn.classList.add('bg-gray-400');
    });
    event.target.classList.remove('bg-gray-400');
    event.target.classList.add('bg-indigo-600');
}

// Start game with selected options
function startGame() {
    const name = document.getElementById('playerName').value.trim();
    
    if (!name) {
        alert('Please enter your name');
        return;
    }
    
    playerName = name;
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
    isAIThinking = false;
    const cells = document.querySelectorAll('.game-cell');
    cells.forEach(cell => cell.style.pointerEvents = 'auto');
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

// AI difficulty levels
const AI_STRATEGIES = {
    easy: {
        getMove: (board) => {
            // Easy AI: Makes mostly random moves with occasional strategic plays
            const availableMoves = board.map((cell, index) => cell === '' ? index : null).filter(index => index !== null);
            
            // 20% chance to make a winning move if available
            if (Math.random() < 0.2) {
                for (const move of availableMoves) {
                    const testBoard = [...board];
                    testBoard[move] = 'O';
                    if (checkWin(testBoard)) {
                        return move;
                    }
                }
            }
            
            // 10% chance to block player's winning move
            if (Math.random() < 0.1) {
                for (const move of availableMoves) {
                    const testBoard = [...board];
                    testBoard[move] = 'X';
                    if (checkWin(testBoard)) {
                        return move;
                    }
                }
            }
            
            // 10% chance to take center if available
            if (Math.random() < 0.1) {
                const center = Math.floor(board.length / 2);
                if (board[center] === '' && availableMoves.includes(center)) {
                    return center;
                }
            }
            
            // Otherwise make a random move
            return availableMoves[Math.floor(Math.random() * availableMoves.length)];
        }
    },
    medium: {
        getMove: (board) => {
            // Medium AI: Makes strategic moves with some randomness
            const availableMoves = board.map((cell, index) => cell === '' ? index : null).filter(index => index !== null);
            
            // 95% chance to make a strategic move
            if (Math.random() < 0.95) {
                // Check for winning move
                for (const move of availableMoves) {
                    const testBoard = [...board];
                    testBoard[move] = 'O';
                    if (checkWin(testBoard)) {
                        return move;
                    }
                }
                
                // Block player's winning move
                for (const move of availableMoves) {
                    const testBoard = [...board];
                    testBoard[move] = 'X';
                    if (checkWin(testBoard)) {
                        return move;
                    }
                }
                
                // Take center if available
                const center = Math.floor(board.length / 2);
                if (board[center] === '' && availableMoves.includes(center)) {
                    return center;
                }
                
                // Take corners
                const corners = [0, 2, 6, 8];
                for (const corner of corners) {
                    if (board[corner] === '' && availableMoves.includes(corner)) {
                        return corner;
                    }
                }
                
                // Create fork opportunities
                for (const move of availableMoves) {
                    const testBoard = [...board];
                    testBoard[move] = 'O';
                    if (countPotentialWins(testBoard, 'O') >= 2) {
                        return move;
                    }
                }
                
                // Block opponent's fork
                for (const move of availableMoves) {
                    const testBoard = [...board];
                    testBoard[move] = 'X';
                    if (countPotentialWins(testBoard, 'X') >= 2) {
                        return move;
                    }
                }
                
                // Take edges
                const edges = [1, 3, 5, 7];
                for (const edge of edges) {
                    if (board[edge] === '' && availableMoves.includes(edge)) {
                        return edge;
                    }
                }
            }
            
            // 5% chance to make a random move
            return availableMoves[Math.floor(Math.random() * availableMoves.length)];
        }
    },
    hard: {
        getMove: (board) => {
            // Hard AI: Uses perfect minimax algorithm with alpha-beta pruning
            return getOptimalMove(board, 'O');
        }
    }
};

// Helper function to check win on a test board
function checkWin(testBoard) {
    const size = selectedGridSize;
    const requiredConsecutive = size; // Require same number of consecutive cells as grid size
    
    // Check rows
    for (let i = 0; i < size; i++) {
        for (let j = 0; j <= size - requiredConsecutive; j++) {
            const firstCell = testBoard[i * size + j];
            if (!firstCell) continue;
            
            let isWin = true;
            for (let k = 1; k < requiredConsecutive; k++) {
                if (testBoard[i * size + j + k] !== firstCell) {
                    isWin = false;
                    break;
                }
            }
            
            if (isWin) {
                return true;
            }
        }
    }
    
    // Check columns
    for (let i = 0; i < size; i++) {
        for (let j = 0; j <= size - requiredConsecutive; j++) {
            const firstCell = testBoard[j * size + i];
            if (!firstCell) continue;
            
            let isWin = true;
            for (let k = 1; k < requiredConsecutive; k++) {
                if (testBoard[(j + k) * size + i] !== firstCell) {
                    isWin = false;
                    break;
                }
            }
            
            if (isWin) {
                return true;
            }
        }
    }
    
    // Check diagonals (top-left to bottom-right)
    for (let i = 0; i <= size - requiredConsecutive; i++) {
        for (let j = 0; j <= size - requiredConsecutive; j++) {
            const firstCell = testBoard[i * size + j];
            if (!firstCell) continue;
            
            let isWin = true;
            for (let k = 1; k < requiredConsecutive; k++) {
                if (testBoard[(i + k) * size + (j + k)] !== firstCell) {
                    isWin = false;
                    break;
                }
            }
            
            if (isWin) {
                return true;
            }
        }
    }
    
    // Check diagonals (top-right to bottom-left)
    for (let i = 0; i <= size - requiredConsecutive; i++) {
        for (let j = requiredConsecutive - 1; j < size; j++) {
            const firstCell = testBoard[i * size + j];
            if (!firstCell) continue;
            
            let isWin = true;
            for (let k = 1; k < requiredConsecutive; k++) {
                if (testBoard[(i + k) * size + (j - k)] !== firstCell) {
                    isWin = false;
                    break;
                }
            }
            
            if (isWin) {
                return true;
            }
        }
    }
    
    return false;
}

// Helper function to count potential winning moves
function countPotentialWins(board, player) {
    let count = 0;
    const emptyCells = board.map((cell, index) => cell === '' ? index : null).filter(index => index !== null);
    
    for (const move of emptyCells) {
        const testBoard = [...board];
        testBoard[move] = player;
        if (checkWin(testBoard)) {
            count++;
        }
    }
    
    return count;
}

// Enhanced minimax algorithm with pattern recognition and adaptive strategy
function getOptimalMove(board, player) {
    const opponent = player === 'X' ? 'O' : 'X';
    
    // Check for immediate win
    for (let i = 0; i < board.length; i++) {
        if (board[i] === '') {
            const testBoard = [...board];
            testBoard[i] = player;
            if (checkWin(testBoard)) {
                return i;
            }
        }
    }
    
    // Block opponent's winning move
    for (let i = 0; i < board.length; i++) {
        if (board[i] === '') {
            const testBoard = [...board];
            testBoard[i] = opponent;
            if (checkWin(testBoard)) {
                return i;
            }
        }
    }
    
    // Pattern recognition for strategic positions
    const strategicMoves = getStrategicMoves(board, player);
    if (strategicMoves.length > 0) {
        return strategicMoves[0];
    }
    
    // Use minimax with alpha-beta pruning for remaining moves
    let bestScore = -Infinity;
    let bestMove = null;
    let alpha = -Infinity;
    let beta = Infinity;
    
    const availableMoves = board.map((cell, index) => cell === '' ? index : null).filter(index => index !== null);
    
    // Prioritize moves based on position value
    const moveScores = availableMoves.map(move => {
        const positionValue = getPositionValue(move, board.length);
        return { move, positionValue };
    });
    
    // Sort moves by position value (higher values first)
    moveScores.sort((a, b) => b.positionValue - a.positionValue);
    
    for (const { move } of moveScores) {
        const testBoard = [...board];
        testBoard[move] = player;
        const score = minimax(testBoard, 0, false, alpha, beta, player);
        
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
        
        alpha = Math.max(alpha, bestScore);
        if (beta <= alpha) {
            break;
        }
    }
    
    return bestMove;
}

// Enhanced minimax with better evaluation
function minimax(board, depth, isMaximizing, alpha, beta, player) {
    const opponent = player === 'X' ? 'O' : 'X';
    
    if (checkWin(board)) {
        return isMaximizing ? -1000 + depth : 1000 - depth;
    }
    
    if (board.every(cell => cell !== '')) {
        return 0;
    }
    
    if (isMaximizing) {
        let bestScore = -Infinity;
        const availableMoves = board.map((cell, index) => cell === '' ? index : null).filter(index => index !== null);
        
        // Prioritize moves based on position value
        const moveScores = availableMoves.map(move => {
            const positionValue = getPositionValue(move, board.length);
            return { move, positionValue };
        });
        
        // Sort moves by position value (higher values first)
        moveScores.sort((a, b) => b.positionValue - a.positionValue);
        
        for (const { move } of moveScores) {
            const testBoard = [...board];
            testBoard[move] = player;
            const score = minimax(testBoard, depth + 1, false, alpha, beta, player);
            bestScore = Math.max(score, bestScore);
            alpha = Math.max(alpha, bestScore);
            if (beta <= alpha) {
                break;
            }
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        const availableMoves = board.map((cell, index) => cell === '' ? index : null).filter(index => index !== null);
        
        // Prioritize moves based on position value
        const moveScores = availableMoves.map(move => {
            const positionValue = getPositionValue(move, board.length);
            return { move, positionValue };
        });
        
        // Sort moves by position value (higher values first)
        moveScores.sort((a, b) => b.positionValue - a.positionValue);
        
        for (const { move } of moveScores) {
            const testBoard = [...board];
            testBoard[move] = opponent;
            const score = minimax(testBoard, depth + 1, true, alpha, beta, player);
            bestScore = Math.min(score, bestScore);
            beta = Math.min(beta, bestScore);
            if (beta <= alpha) {
                break;
            }
        }
        return bestScore;
    }
}

// Get position value based on grid size and position
function getPositionValue(position, boardSize) {
    const size = Math.sqrt(boardSize);
    
    // Center positions are most valuable
    const center = Math.floor(size / 2);
    const isCenter = (position % size === center && Math.floor(position / size) === center);
    if (isCenter) return 10;
    
    // Corners are next most valuable
    const isCorner = (
        (position === 0) || 
        (position === size - 1) || 
        (position === boardSize - size) || 
        (position === boardSize - 1)
    );
    if (isCorner) return 8;
    
    // Edges are least valuable
    const isEdge = (
        (position % size === 0) || 
        (position % size === size - 1) || 
        (position < size) || 
        (position >= boardSize - size)
    );
    if (isEdge) return 6;
    
    // Middle positions
    return 4;
}

// Pattern recognition for strategic moves
function getStrategicMoves(board, player) {
    const opponent = player === 'X' ? 'O' : 'X';
    const strategicMoves = [];
    const size = Math.sqrt(board.length);
    
    // Center control - highest priority
    const center = Math.floor(board.length / 2);
    if (board[center] === '') {
        strategicMoves.push(center);
    }
    
    // Check for potential winning sequences
    const potentialWins = findPotentialWins(board, player);
    if (potentialWins.length > 0) {
        return potentialWins;
    }
    
    // Block opponent's potential winning sequences
    const opponentWins = findPotentialWins(board, opponent);
    if (opponentWins.length > 0) {
        return opponentWins;
    }
    
    // Corner control - high priority
    const corners = [0, size - 1, board.length - size, board.length - 1];
    for (const corner of corners) {
        if (board[corner] === '') {
            strategicMoves.push(corner);
        }
    }
    
    // Create fork opportunities
    for (let i = 0; i < board.length; i++) {
        if (board[i] === '') {
            const testBoard = [...board];
            testBoard[i] = player;
            if (countPotentialWins(testBoard, player) >= 2) {
                strategicMoves.push(i);
            }
        }
    }
    
    // Block opponent's fork
    for (let i = 0; i < board.length; i++) {
        if (board[i] === '') {
            const testBoard = [...board];
            testBoard[i] = opponent;
            if (countPotentialWins(testBoard, opponent) >= 2) {
                strategicMoves.push(i);
            }
        }
    }
    
    // Edge control - lower priority
    const edges = [];
    for (let i = 0; i < board.length; i++) {
        if (i % size !== 0 && i % size !== size - 1 && i >= size && i < board.length - size) {
            edges.push(i);
        }
    }
    
    for (const edge of edges) {
        if (board[edge] === '') {
            strategicMoves.push(edge);
        }
    }
    
    return strategicMoves;
}

// Find potential winning moves
function findPotentialWins(board, player) {
    const size = Math.sqrt(board.length);
    const requiredConsecutive = size;
    const potentialWins = [];
    
    // Check rows
    for (let i = 0; i < size; i++) {
        for (let j = 0; j <= size - requiredConsecutive; j++) {
            const row = [];
            let playerCount = 0;
            let emptyCount = 0;
            let emptyIndex = -1;
            
            for (let k = 0; k < requiredConsecutive; k++) {
                const cell = board[i * size + j + k];
                row.push(cell);
                
                if (cell === player) {
                    playerCount++;
                } else if (cell === '') {
                    emptyCount++;
                    emptyIndex = i * size + j + k;
                }
            }
            
            // If we have all but one cell filled with player's mark and one empty
            if (playerCount === requiredConsecutive - 1 && emptyCount === 1) {
                potentialWins.push(emptyIndex);
            }
        }
    }
    
    // Check columns
    for (let i = 0; i < size; i++) {
        for (let j = 0; j <= size - requiredConsecutive; j++) {
            const col = [];
            let playerCount = 0;
            let emptyCount = 0;
            let emptyIndex = -1;
            
            for (let k = 0; k < requiredConsecutive; k++) {
                const cell = board[(j + k) * size + i];
                col.push(cell);
                
                if (cell === player) {
                    playerCount++;
                } else if (cell === '') {
                    emptyCount++;
                    emptyIndex = (j + k) * size + i;
                }
            }
            
            // If we have all but one cell filled with player's mark and one empty
            if (playerCount === requiredConsecutive - 1 && emptyCount === 1) {
                potentialWins.push(emptyIndex);
            }
        }
    }
    
    // Check diagonals (top-left to bottom-right)
    for (let i = 0; i <= size - requiredConsecutive; i++) {
        for (let j = 0; j <= size - requiredConsecutive; j++) {
            const diag = [];
            let playerCount = 0;
            let emptyCount = 0;
            let emptyIndex = -1;
            
            for (let k = 0; k < requiredConsecutive; k++) {
                const cell = board[(i + k) * size + (j + k)];
                diag.push(cell);
                
                if (cell === player) {
                    playerCount++;
                } else if (cell === '') {
                    emptyCount++;
                    emptyIndex = (i + k) * size + (j + k);
                }
            }
            
            // If we have all but one cell filled with player's mark and one empty
            if (playerCount === requiredConsecutive - 1 && emptyCount === 1) {
                potentialWins.push(emptyIndex);
            }
        }
    }
    
    // Check diagonals (top-right to bottom-left)
    for (let i = 0; i <= size - requiredConsecutive; i++) {
        for (let j = requiredConsecutive - 1; j < size; j++) {
            const diag = [];
            let playerCount = 0;
            let emptyCount = 0;
            let emptyIndex = -1;
            
            for (let k = 0; k < requiredConsecutive; k++) {
                const cell = board[(i + k) * size + (j - k)];
                diag.push(cell);
                
                if (cell === player) {
                    playerCount++;
                } else if (cell === '') {
                    emptyCount++;
                    emptyIndex = (i + k) * size + (j - k);
                }
            }
            
            // If we have all but one cell filled with player's mark and one empty
            if (playerCount === requiredConsecutive - 1 && emptyCount === 1) {
                potentialWins.push(emptyIndex);
            }
        }
    }
    
    return potentialWins;
}

// Handle player moves
function makeMove(cellIndex) {
    if (!gameActive || gameBoard[cellIndex] !== '' || isAIThinking) return;

    // Player's move
    gameBoard[cellIndex] = 'X';
    const cell = document.querySelectorAll('.game-cell')[cellIndex];
    cell.textContent = 'X';
    cell.classList.add('text-indigo-600');

    if (checkWin()) {
        gameActive = false;
        scores.X++;
        updateScoreDisplay();
        document.getElementById('gameStatus').textContent = `${playerName} Wins!`;
        showNotification(`${playerName} Wins! 🎉`, 'win');
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

    // AI's turn
    currentPlayer = 'O';
    updateGameStatus();
    
    // Disable board while AI is thinking
    isAIThinking = true;
    const cells = document.querySelectorAll('.game-cell');
    cells.forEach(cell => cell.style.pointerEvents = 'none');
    
    // AI move with delay
    setTimeout(() => {
        if (gameActive) {
            const aiMove = AI_STRATEGIES[selectedDifficulty].getMove(gameBoard);
            gameBoard[aiMove] = 'O';
            const aiCell = document.querySelectorAll('.game-cell')[aiMove];
            aiCell.textContent = 'O';
            aiCell.classList.add('text-purple-600');

            if (checkWin()) {
                gameActive = false;
                scores.O++;
                updateScoreDisplay();
                document.getElementById('gameStatus').textContent = "AI Wins!";
                showNotification("AI Wins! 😢", 'lose');
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

            currentPlayer = 'X';
            updateGameStatus();
            
            // Re-enable board after AI's move
            isAIThinking = false;
            cells.forEach(cell => cell.style.pointerEvents = 'auto');
        }
    }, 500);
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

// Get win patterns based on grid size
function getWinPatterns() {
    const patterns = [];
    const size = selectedGridSize;

    // Check rows
    for (let i = 0; i < size; i++) {
        const row = [];
        for (let j = 0; j < size; j++) {
            row.push(i * size + j);
        }
        patterns.push(row);
    }

    // Check columns
    for (let i = 0; i < size; i++) {
        const col = [];
        for (let j = 0; j < size; j++) {
            col.push(j * size + i);
        }
        patterns.push(col);
    }

    // Check diagonals
    const diag1 = [];
    const diag2 = [];
    for (let i = 0; i < size; i++) {
        diag1.push(i * size + i);
        diag2.push(i * size + (size - 1 - i));
    }
    patterns.push(diag1, diag2);

    return patterns;
}

// Check for draw
function checkDraw() {
    return gameBoard.every(cell => cell !== '');
}

// Update game status display
function updateGameStatus() {
    document.getElementById('gameStatus').textContent = currentPlayer === 'X' ? `${playerName}'s Turn` : "AI's Turn";
}

// Update score display
function updateScoreDisplay() {
    document.getElementById('scoreDisplay').innerHTML = `
        <div class="flex justify-between items-center">
            <span class="text-indigo-600 font-semibold">${playerName}: ${scores.X}</span>
            <span class="text-purple-600 font-semibold">AI: ${scores.O}</span>
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

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        type === 'win' ? 'bg-green-500' : 
        type === 'lose' ? 'bg-red-500' : 
        'bg-yellow-500'
    } text-white`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

function selectDifficulty(difficulty) {
    selectedDifficulty = difficulty;
    // Remove selected class from all buttons
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.remove('selected');
        btn.style.opacity = '0.7'; // Fade out unselected buttons
    });
    
    // Add selected class to clicked button and make it fully visible
    const selectedBtn = document.getElementById(`${difficulty}Btn`);
    if (selectedBtn) {
        selectedBtn.classList.add('selected');
        selectedBtn.style.opacity = '1';
    }
    initGame();
} 