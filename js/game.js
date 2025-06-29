// Game State
let currentGame = {
    board: Array(9).fill(''),
    currentPlayer: 'X',
    gameMode: '',
    isOnline: false,
    gameId: null,
    opponent: null,
    playerSymbol: 'X'
};

// Track if we've already recorded the score for the current game
let scoreRecorded = false;
let statsUpdated = false;  // Add flag to track if stats have been updated

// Store the current list of players for filtering
let currentPlayersList = [];

// Track last challenge times for cooldown
const lastChallengeTimes = new Map();

// Game Mode Selection
function startPVPOffline() {
    currentGame = {
        board: Array(9).fill(''),
        currentPlayer: 'X',
        gameMode: 'PVP Offline',
        isOnline: false,
        playerSymbol: 'X',
        gridSize: 3 // Default to 3x3 for offline games
    };
    showGame();
}

function startPVAI() {
    currentGame = {
        board: Array(9).fill(''),
        currentPlayer: 'X',
        gameMode: 'PV AI',
        isOnline: false,
        playerSymbol: 'X',
        gridSize: 3 // Default to 3x3 for AI games
    };
    showGame();
}

function startPVPOnline() {
    // Check if user is authenticated
    if (!auth.currentUser) {
        alert("You must be logged in to play online.");
        return;
    }
    
    console.log("Starting online PVP mode...");
    console.log("Current user:", auth.currentUser.uid);
    
    // Hide breadcrumbs and back button immediately
    const breadcrumbsContainer = document.getElementById('breadcrumbsContainer');
    const backButtonContainer = document.getElementById('backButtonContainer');
    if (breadcrumbsContainer) {
        breadcrumbsContainer.classList.add('hidden');
        breadcrumbsContainer.style.display = 'none';
    }
    if (backButtonContainer) {
        backButtonContainer.classList.add('hidden');
        backButtonContainer.style.display = 'none';
    }
    
    // Show loading state
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '<div class="text-center text-gray-500">Connecting to online players...</div>';
    
    // Initialize search functionality
    setupPlayerSearch();
    
    // Ensure user status is set to online
    updateUserStatus(auth.currentUser.uid, 'online')
        .then(() => {
            console.log("User status set to online");
            showOnlinePlayers();
            loadOnlinePlayers();
        })
        .catch((error) => {
            console.error("Error setting user status:", error);
            
            // Check for specific error types
            if (error.code === 'PERMISSION_DENIED') {
                alert("Permission denied. Please check your Firebase database rules.");
            } else if (error.code === 'NETWORK_ERROR') {
                alert("Network error. Please check your internet connection.");
            } else {
                alert("Error connecting to online players: " + error.message);
            }
            
            // Show error in the UI
            playersList.innerHTML = '<div class="text-center text-red-500">Error: ' + error.message + '</div>';
        });
}

// UI Functions
function showGame() {
    document.getElementById('gameModesSection').classList.add('hidden');
    document.getElementById('onlinePlayersSection').classList.add('hidden');
    document.getElementById('gameSection').classList.remove('hidden');
    
    // Hide mobile navbar when in a game
    document.querySelector('.mobile-navbar').style.display = 'none';
    
    // Add navbar toggle button if it doesn't exist
    let navbarToggleBtn = document.getElementById('navbarToggleBtn');
    if (!navbarToggleBtn) {
        navbarToggleBtn = document.createElement('button');
        navbarToggleBtn.id = 'navbarToggleBtn';
        navbarToggleBtn.className = 'fixed bottom-2 right-2 bg-indigo-600 text-white p-2 rounded-full shadow-lg z-50';
        navbarToggleBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>';
        navbarToggleBtn.onclick = toggleMobileNavbar;
        document.body.appendChild(navbarToggleBtn);
    } else {
        navbarToggleBtn.style.display = '';
    }
    
    // Hide breadcrumbs and back button for online games
    if (currentGame.isOnline) {
        const breadcrumbsContainer = document.getElementById('breadcrumbsContainer');
        const backButtonContainer = document.getElementById('backButtonContainer');
        if (breadcrumbsContainer) {
            breadcrumbsContainer.classList.add('hidden');
            breadcrumbsContainer.style.display = 'none';
        }
        if (backButtonContainer) {
            backButtonContainer.classList.add('hidden');
            backButtonContainer.style.display = 'none';
        }
    }
    
    document.getElementById('gameMode').textContent = currentGame.gameMode;
    
    // Add leave game button if it doesn't exist
    let leaveButton = document.getElementById('leaveGameButton');
    if (!leaveButton) {
        leaveButton = document.createElement('button');
        leaveButton.id = 'leaveGameButton';
        leaveButton.className = 'mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors duration-200';
        leaveButton.textContent = 'Leave Game';
        leaveButton.onclick = () => {
            customAlert.confirm(
                'Are you sure you want to leave the game?',
                () => {
                    if (currentGame.isOnline) {
                        // Calculate game stats
                        const now = Date.now();
                        const startTime = currentGame.startTime || now;
                        const duration = now - startTime;
                        
                        // Get player stats
                        const stats = {
                            player1Wins: currentGame.player1Wins || 0,
                            player1Losses: currentGame.player1Losses || 0,
                            player1Draws: currentGame.player1Draws || 0,
                            player2Wins: currentGame.player2Wins || 0,
                            player2Losses: currentGame.player2Losses || 0,
                            player2Draws: currentGame.player2Draws || 0,
                            duration: duration,
                            totalMoves: currentGame.board.filter(cell => cell !== '').length
                        };
                        
                        // Show stats modal
                        showGameStatsModal(stats);
                        
                        // Update game status in database
                        database.ref(`games/${currentGame.gameId}`).update({
                            status: 'abandoned',
                            abandonedBy: auth.currentUser.uid,
                            abandonedAt: now,
                            stats: stats
                        }).then(() => {
                            // Wait for stats modal to show before leaving
                            setTimeout(() => {
                                leaveOnlineGame();
                                showGameModes();
                            }, 3000);
                        });
                    } else {
                        showGameModes();
                    }
                },
                () => {
                    // User cancelled leaving the game
                    window.customAlert.info('You are still in the game');
                }
            );
        };
        document.getElementById('gameSection').appendChild(leaveButton);
    }
    
    // Only update game status and render board if we have an active game
    if (currentGame.gameMode) {
        updateGameStatus();
        renderBoard();
    }
}

function showOnlinePlayers() {
    document.getElementById('gameModesSection').classList.add('hidden');
    document.getElementById('onlinePlayersSection').classList.remove('hidden');
    document.getElementById('gameSection').classList.add('hidden');
    
    // Hide breadcrumbs and back button
    const breadcrumbsContainer = document.getElementById('breadcrumbsContainer');
    const backButtonContainer = document.getElementById('backButtonContainer');
    if (breadcrumbsContainer) {
        breadcrumbsContainer.classList.add('hidden');
        breadcrumbsContainer.style.display = 'none';
    }
    if (backButtonContainer) {
        backButtonContainer.classList.add('hidden');
        backButtonContainer.style.display = 'none';
    }
}

function exitGame() {
    if (currentGame.isOnline) {
        leaveOnlineGame();
    }
    
    // Ensure the mobile navbar is visible when exiting any game
    document.querySelector('.mobile-navbar').style.display = '';
    
    showGameModes();
}

// Game Logic
function makeMove(index) {
    if (currentGame.isOnline) {
        // Check if it's the player's turn
        if (currentGame.currentPlayer !== currentGame.playerSymbol) {
            showNotification('Not your turn!');
            return;
        }
        
        // Check if the cell is already occupied
        if (currentGame.board[index] !== '') {
            showNotification('This cell is already occupied!');
            return;
        }
        
        // Make the move in the database with timestamp check
        const newBoard = [...currentGame.board];
        newBoard[index] = currentGame.playerSymbol;
        
        const nextPlayer = currentGame.currentPlayer === 'X' ? 'O' : 'X';
        const moveTimestamp = Date.now();
        
        database.ref(`games/${currentGame.gameId}`).update({
            board: newBoard,
            currentPlayer: nextPlayer,
            lastMove: moveTimestamp,
            lastMoveBy: auth.currentUser.uid
        }).then(() => {
            // Check for game completion after the move
            checkGameCompletion();
        }).catch(error => {
            console.error('Error making move:', error);
            showNotification('Error making move. Please try again.');
        });
    } else {
        // Local game logic
        if (currentGame.board[index] === '' && !isGameOver()) {
            currentGame.board[index] = currentGame.currentPlayer;
            currentGame.currentPlayer = currentGame.currentPlayer === 'X' ? 'O' : 'X';
            renderBoard();
            updateGameStatus();
            
            // Check for game completion
            if (isGameOver() || isDraw()) {
                const winner = isGameOver() ? (currentGame.currentPlayer === 'X' ? 'O' : 'X') : null;
                if (winner) {
                    showNotification(`Game Over! Player ${winner} wins!`);
                } else {
                    showNotification('Game Over! It\'s a draw!');
                }
                // Automatically reset the game after 3 seconds for both win and draw
                setTimeout(() => {
                    performReset();
                }, 3000);
            }
        }
    }
}

function makeAIMove() {
    if (isGameOver()) return;

    const emptyCells = currentGame.board
        .map((cell, index) => cell === '' ? index : null)
        .filter(cell => cell !== null);

    if (emptyCells.length > 0) {
        const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        currentGame.board[randomIndex] = 'O';
        renderBoard();
        currentGame.currentPlayer = 'X';
        updateGameStatus();
    }
}

function isGameOver() {
    const size = currentGame.gridSize;
    const board = currentGame.board;
    
    // Check rows
    for (let i = 0; i < size; i++) {
        const row = board.slice(i * size, (i + 1) * size);
        if (row.every(cell => cell === 'X') || row.every(cell => cell === 'O')) {
            currentGame.winningPattern = row.map((_, index) => i * size + index);
            return true;
        }
    }
    
    // Check columns
    for (let i = 0; i < size; i++) {
        const column = board.filter((_, index) => index % size === i);
        if (column.every(cell => cell === 'X') || column.every(cell => cell === 'O')) {
            currentGame.winningPattern = column.map((_, index) => index * size + i);
            return true;
        }
    }
    
    // Check diagonals
    const diagonal1 = [];
    for (let i = 0; i < size; i++) {
        diagonal1.push(board[i * size + i]);
    }
    if (diagonal1.every(cell => cell === 'X') || diagonal1.every(cell => cell === 'O')) {
        currentGame.winningPattern = Array.from({length: size}, (_, i) => i * size + i);
        return true;
    }
    
    const diagonal2 = [];
    for (let i = 0; i < size; i++) {
        diagonal2.push(board[i * size + (size - 1 - i)]);
    }
    if (diagonal2.every(cell => cell === 'X') || diagonal2.every(cell => cell === 'O')) {
        currentGame.winningPattern = Array.from({length: size}, (_, i) => i * size + (size - 1 - i));
        return true;
    }
    
    return false;
}

function isDraw() {
    return currentGame.board.every(cell => cell !== '');
}

function updateGameStatus() {
    const statusElement = document.getElementById('gameStatus');
    if (!statusElement) return;

    if (isGameOver()) {
        const winner = currentGame.currentPlayer === 'X' ? 'O' : 'X';
        if (currentGame.isOnline) {
            // For online games, determine if current user is the winner
            const isWinner = (winner === 'X' && currentGame.playerSymbol === 'X') ||
                           (winner === 'O' && currentGame.playerSymbol === 'O');
            statusElement.textContent = isWinner ? 'You Won!' : 'You Lost!';
            
            // Log loss to console
            if (!isWinner) {
                console.log('Player lost the game');
            }
            
            // Only add winning animation if current user is the winner
            if (isWinner && currentGame.winningPattern) {
                animateWinningCells();
            }
        } else {
            // For local games
            statusElement.textContent = `Player ${winner} Wins!`;
            if (currentGame.winningPattern) {
                animateWinningCells();
            }
        }
    } else if (isDraw()) {
        statusElement.textContent = "Game Over! It's a Draw!";
        // Add draw animation with a slight delay to ensure smooth transition
        setTimeout(() => {
            const cells = document.querySelectorAll('#gameSection .grid > div');
            cells.forEach(cell => {
                cell.classList.add('draw-game');
            });
            
            // Remove the draw animation after 1 second
            setTimeout(() => {
                cells.forEach(cell => {
                    cell.classList.remove('draw-game');
                });
            }, 1000);
        }, 100);
    } else if (currentGame.isOnline) {
        const isMyTurn = currentGame.currentPlayer === currentGame.playerSymbol;
        
        // Check opponent's status
        if (currentGame.opponentId) {
            database.ref(`users/${currentGame.opponentId}/status`).once('value', (snapshot) => {
                const opponentStatus = snapshot.val();
                if (opponentStatus === 'offline') {
                    statusElement.textContent = "Opponent is offline";
                    statusElement.classList.add('text-red-500');
                    return;
                }
                
                statusElement.classList.remove('text-red-500');
                if (isMyTurn) {
                    statusElement.textContent = "Your Turn";
                } else {
                    // Get opponent's username
                    database.ref(`users/${currentGame.opponentId}`).once('value', (snapshot) => {
                        const userData = snapshot.val();
                        const username = userData ? userData.username || 'Opponent' : 'Opponent';
                        statusElement.textContent = `${username}'s Turn`;
                    }).catch(error => {
                        console.error('Error getting opponent username:', error);
                        statusElement.textContent = "Opponent's Turn";
                    });
                }
            });
        }
    } else {
        statusElement.textContent = `Player ${currentGame.currentPlayer}'s Turn`;
    }
}

function renderBoard() {
    const gameSection = document.getElementById('gameSection');
    const gridContainer = gameSection.querySelector('.grid');
    
    // Clear existing grid
    gridContainer.innerHTML = '';
    
    // Set grid columns based on grid size with responsive design
    gridContainer.className = `grid grid-cols-${currentGame.gridSize} gap-2 sm:gap-3 md:gap-4 mb-6 w-full max-w-[90vw] sm:max-w-[80vw] md:max-w-[70vw] lg:max-w-[60vw] xl:max-w-[40vw] mx-auto`;
    
    // Check if game is over (win, loss, or draw)
    const isGameEnded = isGameOver() || isDraw();
    
    // Create cells based on grid size
    for (let i = 0; i < currentGame.gridSize * currentGame.gridSize; i++) {
        const cell = document.createElement('div');
        cell.className = 'game-cell aspect-square rounded-xl flex items-center justify-center text-3xl sm:text-4xl md:text-5xl font-bold cursor-pointer transition-all';
        
        // Only add click handler if game is not over and it's the player's turn
        if (!isGameEnded && currentGame.currentPlayer === currentGame.playerSymbol) {
            cell.onclick = () => makeMove(i);
        } else {
            cell.classList.add('opacity-50');
            cell.classList.remove('cursor-pointer');
        }
        
        cell.textContent = currentGame.board[i] || '';
        
        if (currentGame.isOnline) {
            cell.classList.toggle('cursor-pointer', currentGame.currentPlayer === currentGame.playerSymbol && !isGameEnded);
            cell.classList.toggle('opacity-50', currentGame.currentPlayer !== currentGame.playerSymbol || isGameEnded);
        }
        
        gridContainer.appendChild(cell);
    }
    
    // Check game state and apply appropriate animations
    if (isGameOver() && currentGame.winningPattern) {
        if (currentGame.isOnline) {
            const winner = currentGame.currentPlayer === 'X' ? 'O' : 'X';
            const isWinner = (winner === 'X' && currentGame.playerSymbol === 'X') ||
                           (winner === 'O' && currentGame.playerSymbol === 'O');
            
            if (!isWinner) {
                console.log('Player lost the game');
            }
            
            if (isWinner) {
                animateWinningCells();
            }
        } else {
            animateWinningCells();
        }
    } else if (isDraw()) {
        setTimeout(() => {
            const cells = gridContainer.querySelectorAll('.game-cell');
            cells.forEach(cell => {
                cell.classList.add('draw-game');
            });
            
            // Remove the draw animation after 1 second
            setTimeout(() => {
                cells.forEach(cell => {
                    cell.classList.remove('draw-game');
                });
            }, 1000);
        }, 100);
    }
}

// Override the resetGame function to reset the score tracking
const originalResetGame = window.resetGame;
window.resetGame = function() {
    // Call the original function
    originalResetGame();
    
    // Reset the score recorded flag
    scoreRecorded = false;
    statsUpdated = false;  // Reset the stats updated flag
    
    // Reset the scoreSystem's scoreUpdated flag
    if (scoreSystem) {
        scoreSystem.scoreUpdated = false;
    }
};

// Define the original resetGame function
function resetGame() {
    // Check if the game is active (not over)
    if (!isGameOver() && !isDraw()) {
        // Show confirmation dialog
        customAlert.confirm(
            'Are you sure you want to reset the game? This will clear the current board.',
            () => {
                // User confirmed reset
                performReset();
            },
            () => {
                // User cancelled reset
                showNotification('Game reset cancelled');
            }
        );
    } else {
        // Game is already over, reset without confirmation
        performReset();
    }
}

// Helper function to perform the actual reset
function performReset() {
    if (currentGame.isOnline) {
        // Store gameId before reset
        const gameId = currentGame.gameId;
        const gridSize = currentGame.gridSize || 3;
        
        // Reset the game board and current player in the database
        database.ref(`games/${gameId}`).update({
            board: Array(gridSize * gridSize).fill(''),
            currentPlayer: 'X',
            status: 'active',
            lastMove: Date.now()
        }).then(() => {
            // Update local game state
            currentGame.board = Array(gridSize * gridSize).fill('');
            currentGame.currentPlayer = 'X';
            
            // Remove draw animation class from all cells
            const cells = document.querySelectorAll('#gameSection .grid > div');
            cells.forEach(cell => {
                cell.classList.remove('draw-game');
            });
            
            // Update the UI
            renderBoard();
            updateGameStatus();
            
            // Make sure scores are still synchronized
            scoreSystem.updateDisplay();
            
            // Reset the score updated flag
            scoreSystem.scoreUpdated = false;
            
            // Keep mobile navbar hidden during the game
            document.querySelector('.mobile-navbar').style.display = 'none';
            
            // Always reattach the game listener after reset
            if (gameId) {
                attachGameListener(gameId);
            }
        }).catch(error => {
            console.error('Error resetting online game:', error);
        });
    } else {
        // Reset local game state
        currentGame.board = Array(currentGame.gridSize * currentGame.gridSize).fill('');
        currentGame.currentPlayer = 'X';
        currentGame.winningPattern = null;
        currentGame.isDraw = false;
        
        // Remove draw animation class from all cells
        const cells = document.querySelectorAll('#gameSection .grid > div');
        cells.forEach(cell => {
            cell.classList.remove('draw-game');
        });
        
        // Keep mobile navbar hidden during the game
        document.querySelector('.mobile-navbar').style.display = 'none';
        
        // Update the UI
        renderBoard();
        updateGameStatus();
    }
}

// Override the exitGame function to reset the score tracking and scores
const originalExitGame = window.exitGame;
window.exitGame = function() {
    // Call the original function
    originalExitGame();
    
    // Reset the score recorded flag
    scoreRecorded = false;
    
    // Reset the scores
    scoreSystem.resetScores();
};

// Helper function to attach game listener
function attachGameListener(gameId) {
    console.log(`Attaching game listener for game ID: ${gameId}`);
    
    // First, remove any existing listeners to avoid duplicates
    database.ref(`games/${gameId}`).off('value');
    
    // Listen for game updates
    database.ref(`games/${gameId}`).on('value', (snapshot) => {
        const updatedGameData = snapshot.val();
        if (updatedGameData) {
            console.log(`Game update received:`, updatedGameData);
            
            // Check if game was abandoned
            if (updatedGameData.status === 'abandoned') {
                if (updatedGameData.abandonedBy !== auth.currentUser.uid) {
                    // Create complete stats object using the most up-to-date data
                    let stats;
                    
                    if (updatedGameData.stats && Object.keys(updatedGameData.stats).length > 0) {
                        // Use stats provided in the game data
                        stats = updatedGameData.stats;
                    } else {
                        // Construct stats from current session stats or defaults
                        const currentSessionStats = updatedGameData.currentSessionStats || {
                            player1Wins: 0,
                            player1Losses: 0,
                            player1Draws: 0,
                            player2Wins: 0,
                            player2Losses: 0,
                            player2Draws: 0
                        };
                        
                        const now = Date.now();
                        const startTime = updatedGameData.startTime || now;
                        const duration = now - startTime;
                        
                        stats = {
                            player1Wins: currentSessionStats.player1Wins || 0,
                            player1Losses: currentSessionStats.player1Losses || 0,
                            player1Draws: currentSessionStats.player1Draws || 0,
                            player2Wins: currentSessionStats.player2Wins || 0,
                            player2Losses: currentSessionStats.player2Losses || 0,
                            player2Draws: currentSessionStats.player2Draws || 0,
                            duration: duration,
                            totalMoves: updatedGameData.board ? updatedGameData.board.filter(cell => cell !== '').length : 0
                        };
                    }
                    
                    // Update local game state to include stats
                    currentGame.player1Wins = stats.player1Wins;
                    currentGame.player1Losses = stats.player1Losses;
                    currentGame.player1Draws = stats.player1Draws;
                    currentGame.player2Wins = stats.player2Wins;
                    currentGame.player2Losses = stats.player2Losses;
                    currentGame.player2Draws = stats.player2Draws;
                    
                    // Show stats modal with the fetched stats
                    showGameStatsModal(stats);
                    
                    // Wait for stats modal to show before leaving
                    setTimeout(() => {
                        showNotification('Your opponent has left the game');
                        
                        // Don't call leaveOnlineGame since we're already handling abandonment
                        // Just clean up listeners and reset state
                        
                        // Remove game listeners
                        database.ref(`games/${gameId}`).off('value');
                        
                        // Remove opponent presence listener if it exists
                        if (currentGame.opponentId) {
                            database.ref(`users/${currentGame.opponentId}/status`).off('value');
                        }
                        
                        // Remove chat listener
                        database.ref(`games/${gameId}/chat`).off('child_added');
                        
                        // Reset game state
                        currentGame = {
                            board: Array(9).fill(''),
                            currentPlayer: 'X',
                            gameMode: '',
                            isOnline: false,
                            gameId: null,
                            opponent: null,
                            playerSymbol: 'X',
                            gridSize: 3 // Default to 3x3
                        };
                        
                        // Reset scores
                        scoreSystem.resetScores();
                        
                        // Return to game modes
                        showGameModes();
                    }, 5000);
                    return;
                }
            }
            
            // Update local game state
            currentGame.board = updatedGameData.board || Array(updatedGameData.gridSize * updatedGameData.gridSize).fill('');
            currentGame.gridSize = updatedGameData.gridSize || 3;
            currentGame.currentPlayer = updatedGameData.currentPlayer || 'X';
            currentGame.status = updatedGameData.status || 'active';
            currentGame.winner = updatedGameData.winner;
            currentGame.isDraw = updatedGameData.isDraw || false;
            
            // Store current session stats if available
            if (updatedGameData.currentSessionStats) {
                currentGame.player1Wins = updatedGameData.currentSessionStats.player1Wins || 0;
                currentGame.player1Losses = updatedGameData.currentSessionStats.player1Losses || 0;
                currentGame.player1Draws = updatedGameData.currentSessionStats.player1Draws || 0;
                currentGame.player2Wins = updatedGameData.currentSessionStats.player2Wins || 0;
                currentGame.player2Losses = updatedGameData.currentSessionStats.player2Losses || 0;
                currentGame.player2Draws = updatedGameData.currentSessionStats.player2Draws || 0;
            }
            
            // Check if game is completed and scores haven't been updated yet
            if (updatedGameData.status === 'completed' && !updatedGameData.scoresUpdated && !updatedGameData.statsUpdated) {
                // Update the scoresUpdated and statsUpdated flags first to prevent double updates
                database.ref(`games/${gameId}`).update({
                    scoresUpdated: true,
                    statsUpdated: true
                });
                
                if (updatedGameData.isDraw) {
                    // It's a draw
                    showNotification('Game Over! It\'s a draw!');
                    
                    // Update score for draw - always use 1 point for draws
                    console.log('Game ended in a draw - adding 1 point to score');
                    scoreSystem.updateScore('draw', 1, 0);

                    // Update user profile stats for draw
                    if (auth.currentUser) {
                        const userRef = database.ref(`users/${auth.currentUser.uid}/stats`);
                        userRef.transaction((currentStats) => {
                            if (!currentStats) {
                                currentStats = {
                                    gamesPlayed: 0,
                                    wins: 0,
                                    losses: 0,
                                    draws: 0,
                                    totalScore: 0,
                                    highestScore: 0,
                                    averageScore: 0
                                };
                            }
                            
                            currentStats.gamesPlayed = (currentStats.gamesPlayed || 0) + 1;
                            currentStats.draws = (currentStats.draws || 0) + 1;
                            currentStats.totalScore = (currentStats.totalScore || 0) + 1;
                            currentStats.averageScore = currentStats.totalScore / currentStats.gamesPlayed;
                            
                            return currentStats;
                        });
                    }
                } else {
                    // Someone won
                    const isWinner = updatedGameData.winner === auth.currentUser.uid;
                    showNotification(isWinner ? 'You won!' : 'You lost!');
                    
                    // Update score
                    const moves = updatedGameData.board.filter(cell => cell !== '').length;
                    const time = updatedGameData.completedAt - updatedGameData.startTime;
                    scoreSystem.updateScore(isWinner ? 'win' : 'loss', moves, time);

                    // Update user profile stats
                    if (auth.currentUser) {
                        const userRef = database.ref(`users/${auth.currentUser.uid}/stats`);
                        userRef.transaction((currentStats) => {
                            if (!currentStats) {
                                currentStats = {
                                    gamesPlayed: 0,
                                    wins: 0,
                                    losses: 0,
                                    draws: 0,
                                    totalScore: 0,
                                    highestScore: 0,
                                    averageScore: 0
                                };
                            }
                            
                            currentStats.gamesPlayed = (currentStats.gamesPlayed || 0) + 1;
                            if (isWinner) {
                                currentStats.wins = (currentStats.wins || 0) + 1;
                                currentStats.totalScore = (currentStats.totalScore || 0) + moves;
                                currentStats.highestScore = Math.max(currentStats.highestScore || 0, moves);
                                
                                // Check for automatic verification after updating wins
                                checkAndUpdateVerification(auth.currentUser.uid, currentStats.wins);
                            } else {
                                currentStats.losses = (currentStats.losses || 0) + 1;
                            }
                            currentStats.averageScore = currentStats.totalScore / currentStats.gamesPlayed;
                            
                            return currentStats;
                        });
                    }
                }
                
                // Reset game after delay
                setTimeout(() => {
                    performReset();
                }, 3000);
            }
            
            // Update the UI
            renderBoard();
            updateGameStatus();
        }
    });
    
    // Set up a presence system to detect when the opponent leaves
    setupOpponentPresence(gameId);
}

// Function to set up opponent presence detection
function setupOpponentPresence(gameId) {
    // Get the opponent's ID
    const opponentId = currentGame.opponentId;
    
    if (!opponentId) return;
    
    console.log(`Setting up opponent presence detection for: ${opponentId}`);
    
    // Create a reference to the opponent's status
    const opponentStatusRef = database.ref(`users/${opponentId}/status`);
    
    // Listen for changes to the opponent's status
    opponentStatusRef.on('value', (snapshot) => {
        const status = snapshot.val();
        console.log(`Opponent status changed to: ${status}`);
        
        // Update the game status display immediately
        const statusElement = document.getElementById('gameStatus');
        if (statusElement) {
            if (status === 'offline') {
                statusElement.textContent = "Opponent is offline";
                statusElement.classList.add('text-red-500');
            } else {
                statusElement.classList.remove('text-red-500');
                const isMyTurn = currentGame.currentPlayer === currentGame.playerSymbol;
                if (isMyTurn) {
                    statusElement.textContent = "Your Turn";
                } else {
                    // Get opponent's username
                    database.ref(`users/${opponentId}`).once('value', (userSnapshot) => {
                        const userData = userSnapshot.val();
                        const username = userData ? userData.username || 'Opponent' : 'Opponent';
                        statusElement.textContent = `${username}'s Turn`;
                    }).catch(error => {
                        console.error('Error getting opponent username:', error);
                        statusElement.textContent = "Opponent's Turn";
                    });
                }
            }
        }
        
        // If the opponent goes offline
        if (status === 'offline') {
            console.log('Opponent went offline');
            
            // Check if the game is still active
            database.ref(`games/${gameId}/status`).once('value', (gameSnapshot) => {
                const gameData = gameSnapshot.val() || {};
                
                // Only handle if the game is still active
                if (gameData.status === 'active') {
                    // Get current game stats before abandoning
                    database.ref(`games/${gameId}/currentSessionStats`).once('value', (statsSnapshot) => {
                        const currentStats = statsSnapshot.val() || {
                            player1Wins: 0,
                            player1Losses: 0,
                            player1Draws: 0,
                            player2Wins: 0,
                            player2Losses: 0,
                            player2Draws: 0
                        };
                        
                        // Calculate game duration and moves
                        const now = Date.now();
                        const startTime = gameData.startTime || now;
                        const duration = now - startTime;
                        const totalMoves = gameData.board ? gameData.board.filter(cell => cell !== '').length : 0;
                        
                        // Create complete stats object
                        const stats = {
                            player1Wins: currentStats.player1Wins || 0,
                            player1Losses: currentStats.player1Losses || 0,
                            player1Draws: currentStats.player1Draws || 0,
                            player2Wins: currentStats.player2Wins || 0,
                            player2Losses: currentStats.player2Losses || 0,
                            player2Draws: currentStats.player2Draws || 0,
                            duration: duration,
                            totalMoves: totalMoves
                        };
                        
                    // Show alert to the current player
                    alert('Your opponent has disconnected. The game will end.');
                    
                    // Update the game status to abandoned
                    database.ref(`games/${gameId}`).update({
                        status: 'abandoned',
                        abandonedBy: opponentId,
                            abandonedAt: now,
                            stats: stats
                    }).then(() => {
                            // Show the game stats
                            showGameStatsModal(stats);
                            
                            // Wait for the stats modal to close before leaving
                            setTimeout(() => {
                        // Leave the game
                                currentGame = {
                                    board: Array(9).fill(''),
                                    currentPlayer: 'X',
                                    gameMode: '',
                                    isOnline: false,
                                    gameId: null,
                                    opponent: null,
                                    playerSymbol: 'X',
                                    gridSize: 3
                                };
                                
                                // Reset scores
                                scoreSystem.resetScores();
                                
                                // Show game modes
                        showGameModes();
                            }, 5000);
                        });
                    });
                }
            });
        }
    });
}

// Add search functionality
function setupPlayerSearch() {
    const searchInput = document.getElementById('playerSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterPlayers(searchTerm);
        });
    }
}

// Filter players based on search term
function filterPlayers(searchTerm) {
    const playersList = document.getElementById('playersList');
    if (!playersList) return;

    if (searchTerm === '') {
        // If search is empty, show all players
        renderPlayersList(currentPlayersList);
        return;
    }

    // Filter players based on search term
    const filteredPlayers = currentPlayersList.filter(player => 
        player.username.toLowerCase().includes(searchTerm)
    );

    renderPlayersList(filteredPlayers);
}

// Modified loadOnlinePlayers function to store and render players
function loadOnlinePlayers() {
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '<div class="text-center text-gray-500">Loading players...</div>';
    
    console.log("Loading online players...");
    console.log("Current user ID:", auth.currentUser ? auth.currentUser.uid : "Not logged in");

    // Check if user is authenticated
    if (!auth.currentUser) {
        console.error("User is not authenticated");
        playersList.innerHTML = '<div class="text-center text-red-500">You must be logged in to see online players</div>';
        return;
    }

    // Try to read from the database
    try {
        database.ref('users').on('value', (snapshot) => {
            console.log("Database snapshot received:", snapshot.val());
            const users = snapshot.val();
            playersList.innerHTML = '';

            if (!users) {
                console.log("No users found in database");
                playersList.innerHTML = '<div class="text-center text-gray-500">No players online</div>';
                return;
            }

            let hasOnlinePlayers = false;
            console.log("Total users found:", Object.keys(users).length);

            // Store players in currentPlayersList
            currentPlayersList = [];

            for (const userId in users) {
                console.log("Checking user:", userId);
                
                // Skip the current user
                if (userId === auth.currentUser.uid) {
                    console.log("Skipping current user");
                    continue;
                }
                
                // Check if user object exists and has required properties
                if (!users[userId]) {
                    console.log("User object is undefined for ID:", userId);
                    continue;
                }
                
                // Check if status exists and is 'online'
                const userStatus = users[userId].status || 'offline';
                console.log("User status:", userStatus);
                
                if (userStatus === 'online') {
                    // Check if username exists and is not a filtered name
                    const username = users[userId].username;
                    if (!username || 
                        username === 'Player' || 
                        username === 'rehaanhussain' ||
                        username.toLowerCase() === 'test' ||
                        username.toLowerCase() === 'hello') {
                        console.log("Skipping filtered username:", username);
                        continue;
                    }
                    
                    console.log("Adding online player to list:", username);
                    
                    hasOnlinePlayers = true;
                    currentPlayersList.push({
                        id: userId,
                        username: username
                    });
                }
            }

            // Render the initial list
            renderPlayersList(currentPlayersList);

            if (!hasOnlinePlayers) {
                console.log("No online players found");
                playersList.innerHTML = '<div class="text-center text-gray-500">No players online</div>';
            }
        }, (error) => {
            console.error("Error loading online players:", error);
            playersList.innerHTML = '<div class="text-center text-red-500">Error: ' + error.message + '</div>';
        });
    } catch (error) {
        console.error("Exception in loadOnlinePlayers:", error);
        playersList.innerHTML = '<div class="text-center text-red-500">Error: ' + error.message + '</div>';
    }
}

// Function to check if a player is in a game
function isPlayerInGame(playerId) {
    return new Promise((resolve) => {
        database.ref('games').once('value', (snapshot) => {
            const games = snapshot.val();
            if (!games) {
                resolve(false);
                return;
            }

            for (const gameId in games) {
                const game = games[gameId];
                
                // Check if the game is active and the player is in it
                if ((game.player1 === playerId || game.player2 === playerId) && 
                    game.status === 'active' && 
                    game.board && // Ensure board exists
                    game.currentPlayer && // Ensure currentPlayer exists
                    game.gridSize) { // Ensure gridSize exists
                    
                    // Additional check to ensure the game is actually being played
                    // by checking if there are any moves made
                    const hasMoves = game.board.some(cell => cell !== '');
                    
                    if (hasMoves) {
                        resolve(true);
                        return;
                    }
                }
            }
            
            resolve(false);
        });
    });
}

// Function to render the players list
async function renderPlayersList(players) {
    const playersList = document.getElementById('playersList');
    if (!playersList) return;

    playersList.innerHTML = '';

    if (players.length === 0) {
        playersList.innerHTML = '<div class="text-center text-gray-500">No players found</div>';
        return;
    }

    // Create a loading state
    playersList.innerHTML = '<div class="text-center text-gray-500">Loading player status...</div>';

    try {
        // Process players in parallel
        const playerElements = await Promise.all(players.map(async (player) => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-item p-3 bg-gray-100 rounded-lg shadow-sm hover:bg-gray-200 transition-colors duration-200 flex items-center justify-between';
            
            const playerInfo = document.createElement('div');
            playerInfo.className = 'flex items-center';
            
            const playerAvatar = document.createElement('div');
            playerAvatar.className = 'w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-3';
            playerAvatar.textContent = player.username.charAt(0).toUpperCase();
            
            const playerNameContainer = document.createElement('div');
            playerNameContainer.className = 'flex items-center';
            
            const playerName = document.createElement('span');
            playerName.className = 'font-medium';
            playerName.textContent = player.username;
            
            playerNameContainer.appendChild(playerName);
            
            // Check if player is verified
            const isVerified = await isPlayerVerified(player.id);
            
            if (isVerified) {
                const verifiedIcon = document.createElement('span');
                verifiedIcon.className = 'verified-icon-tooltip';
                
                const icon = document.createElement('span');
                icon.className = 'verified-icon';
                icon.textContent = '✓';
                
                const tooltip = document.createElement('span');
                tooltip.className = 'tooltip-text';
                tooltip.textContent = 'Verified account: This player has been verified for authenticity and security.';
                
                verifiedIcon.appendChild(icon);
                verifiedIcon.appendChild(tooltip);
                playerNameContainer.appendChild(verifiedIcon);
            }
            
            playerInfo.appendChild(playerAvatar);
            playerInfo.appendChild(playerNameContainer);
            
            const playerStatus = document.createElement('div');
            playerStatus.className = 'flex items-center gap-2';
            
            // Check if player is in a game
            const isInGame = await isPlayerInGame(player.id);
            
            if (isInGame) {
                const statusBadge = document.createElement('span');
                statusBadge.className = 'px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full flex items-center';
                
                // Add a pulsing dot to indicate active game
                const dot = document.createElement('span');
                dot.className = 'w-2 h-2 bg-yellow-500 rounded-full mr-1 animate-pulse';
                statusBadge.appendChild(dot);
                
                statusBadge.appendChild(document.createTextNode('In Game'));
                playerStatus.appendChild(statusBadge);
            }
            
            const challengeButton = document.createElement('button');
            challengeButton.className = 'bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600 transition-colors duration-200';
            challengeButton.textContent = 'Challenge';
            challengeButton.disabled = isInGame;
            challengeButton.onclick = () => {
                if (!isInGame) {
                    challengePlayer(player.id, player.username);
                }
            };
            
            if (isInGame) {
                challengeButton.classList.add('opacity-50', 'cursor-not-allowed');
            }
            
            playerStatus.appendChild(challengeButton);
            
            playerDiv.appendChild(playerInfo);
            playerDiv.appendChild(playerStatus);
            
            return playerDiv;
        }));
        
        // Clear loading state
        playersList.innerHTML = '';
        
        // Add the player elements to the DOM
        playerElements.forEach(element => {
            playersList.appendChild(element);
        });
        
    } catch (error) {
        console.error('Error rendering players list:', error);
        playersList.innerHTML = '<div class="text-center text-red-500">Error loading players</div>';
    }
}

// Function to check if a player is verified
async function isPlayerVerified(playerId) {
    try {
        const snapshot = await database.ref(`users/${playerId}`).once('value');
        const userData = snapshot.val();
        return userData && userData.isVerified === true;
    } catch (error) {
        console.error('Error checking player verification status:', error);
        return false;
    }
}

function challengePlayer(opponentId, opponentName) {
    console.log(`Challenging player ${opponentName} (${opponentId})`);
    
    // Check if user is authenticated
    if (!auth.currentUser) {
        console.error("Cannot send challenge: User is not authenticated");
        showNotification("You must be logged in to send a challenge");
        return;
    }

    // Check cooldown
    const lastChallengeTime = lastChallengeTimes.get(opponentId);
    const currentTime = Date.now();
    if (lastChallengeTime && currentTime - lastChallengeTime < 10000) {
        const remainingTime = Math.ceil((10000 - (currentTime - lastChallengeTime)) / 1000);
        showNotification(`Please wait ${remainingTime} seconds before challenging ${opponentName} again`);
        return;
    }

    // Update last challenge time
    lastChallengeTimes.set(opponentId, currentTime);

    // Fetch opponent's stats
    database.ref(`users/${opponentId}/stats`).once('value', (snapshot) => {
        const opponentStats = snapshot.val() || {
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            totalScore: 0,
            highestScore: 0,
            averageScore: 0
        };

        // Create grid size selection modal with player stats
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-white p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-md">
                <div class="mb-4 sm:mb-6">
                    <h3 class="text-lg sm:text-xl font-semibold mb-2">${opponentName}'s Stats</h3>
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        <div class="flex justify-between p-2 bg-gray-50 rounded">
                            <span class="text-gray-600">Games Played:</span>
                            <span class="font-semibold">${opponentStats.gamesPlayed}</span>
                        </div>
                        <div class="flex justify-between p-2 bg-gray-50 rounded">
                            <span class="text-gray-600">Wins:</span>
                            <span class="font-semibold text-green-600">${opponentStats.wins}</span>
                        </div>
                        <div class="flex justify-between p-2 bg-gray-50 rounded">
                            <span class="text-gray-600">Losses:</span>
                            <span class="font-semibold text-red-600">${opponentStats.losses}</span>
                        </div>
                        <div class="flex justify-between p-2 bg-gray-50 rounded">
                            <span class="text-gray-600">Highest Score:</span>
                            <span class="font-semibold">${opponentStats.highestScore}</span>
                        </div>
                        <div class="flex justify-between p-2 bg-gray-50 rounded col-span-2">
                            <span class="text-gray-600">Average Score:</span>
                            <span class="font-semibold">${opponentStats.averageScore ? opponentStats.averageScore.toFixed(2) : 0}</span>
                        </div>
                    </div>
                </div>
                <h3 class="text-lg sm:text-xl font-semibold mb-4">Select Grid Size</h3>
                <div class="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                    <button class="grid-size-btn p-3 sm:p-4 border rounded-lg hover:bg-blue-100 transition-colors duration-200 text-sm sm:text-base" data-size="3">3x3</button>
                    <button class="grid-size-btn p-3 sm:p-4 border rounded-lg hover:bg-blue-100 transition-colors duration-200 text-sm sm:text-base" data-size="4">4x4</button>
                    <button class="grid-size-btn p-3 sm:p-4 border rounded-lg hover:bg-blue-100 transition-colors duration-200 text-sm sm:text-base" data-size="5">5x5</button>
                </div>
                <div class="flex justify-end space-x-2">
                    <button class="px-3 sm:px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors duration-200 text-sm sm:text-base" onclick="closeChallengeModal(this)">Cancel</button>
                </div>
            </div>
        `;

        // Add modal to the page
        document.body.appendChild(modal);
        
        // Disable scrolling on the body
        document.body.style.overflow = 'hidden';

        // Add click handlers for grid size buttons
        modal.querySelectorAll('.grid-size-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const gridSize = parseInt(btn.dataset.size);
                closeChallengeModal(btn);
                createGameWithGridSize(opponentId, opponentName, gridSize);
            });
        });
    }).catch(error => {
        console.error('Error fetching opponent stats:', error);
        showNotification('Error loading player stats. Please try again.');
    });
}

// Add this function to handle closing the modal
function closeChallengeModal(element) {
    const modal = element.closest('.fixed');
    if (modal) {
        modal.remove();
        // Re-enable scrolling on the body
        document.body.style.overflow = '';
    }
}

function createGameWithGridSize(opponentId, opponentName, gridSize) {
    // Generate a new game ID
    const gameId = database.ref('games').push().key;
    console.log(`Created new game with ID: ${gameId}`);
    
    // Create the game in the database with the selected grid size
    database.ref(`games/${gameId}`).set({
        player1: auth.currentUser.uid,
        player2: opponentId,
        status: 'pending',
        board: Array(gridSize * gridSize).fill(''),
        gridSize: gridSize,
        currentPlayer: 'X',
        lastMove: Date.now(),
        createdAt: Date.now()
    })
    .then(() => {
        console.log(`Game ${gameId} created successfully`);
        
        // Send the invitation to the opponent
        return database.ref(`users/${opponentId}/gameInvites/${gameId}`).transaction((currentData) => {
            return {
                from: auth.currentUser.uid,
                fromUsername: auth.currentUser.displayName || 'Player',
                gameId: gameId,
                gridSize: gridSize,
                timestamp: Date.now()
            };
        });
    })
    .then((result) => {
        if (result.committed) {
            console.log(`Game invitation sent to ${opponentName}`);
            showNotification(`Game invitation sent to ${opponentName}`);
        } else {
            console.error(`Failed to send game invitation to ${opponentName}`);
            showNotification(`Failed to send invitation. Please try again.`);
        }
    })
    .catch((error) => {
        console.error("Error creating game:", error);
        showNotification("Failed to create game. Please try again.");
    });
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-1000';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Listen for game invites
function setupGameInviteListener() {
    if (!auth.currentUser) return;
    
    console.log("Setting up game invite listener for user:", auth.currentUser.uid);
    
    // Remove any existing listeners first
    database.ref(`users/${auth.currentUser.uid}/gameInvites`).off('child_added');
    
    // First, clean up any stale invites that might exist from previous sessions
    cleanupStaleInvites();
    
    // Set up the new listener
    database.ref(`users/${auth.currentUser.uid}/gameInvites`).on('child_added', (snapshot) => {
        console.log("Game invite received:", snapshot.val());
        const invite = snapshot.val();
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        // Only show invites that are less than 5 minutes old
        if (now - invite.timestamp < fiveMinutes) {
            showGameInvite(invite);
        } else {
            // Remove expired invites
            snapshot.ref.remove();
        }
    });
}

// Helper function to clean up stale invites
function cleanupStaleInvites() {
    if (!auth.currentUser) return;
    
    database.ref(`users/${auth.currentUser.uid}/gameInvites`).once('value', snapshot => {
        if (snapshot.exists()) {
            const invites = snapshot.val();
            const now = Date.now();
            const fiveMinutes = 5 * 60 * 1000;
            let updates = {};
            let hasStaleInvites = false;
            let pendingChecks = 0;
            let checksCompleted = 0;
            
            // Check each invite to see if it's stale
            Object.keys(invites).forEach(gameId => {
                const invite = invites[gameId];
                
                // Check if invite is older than 5 minutes
                if (now - invite.timestamp > fiveMinutes) {
                    // This is a stale invite, mark it for removal
                    updates[`users/${auth.currentUser.uid}/gameInvites/${gameId}`] = null;
                    hasStaleInvites = true;
                    return; // Skip further checks for this invite
                }
                
                // Check if the sender is still online
                pendingChecks++;
                database.ref(`users/${invite.from}/status`).once('value', statusSnapshot => {
                    checksCompleted++;
                    const status = statusSnapshot.val();
                    
                    // If sender is offline, remove the invite
                    if (status !== 'online') {
                        updates[`users/${auth.currentUser.uid}/gameInvites/${gameId}`] = null;
                        hasStaleInvites = true;
                        console.log(`Removing invite from ${invite.from} as they are offline`);
                    }
                    
                    // If this is the last check, apply all updates
                    if (checksCompleted === pendingChecks && hasStaleInvites) {
                        database.ref().update(updates);
                        console.log("Cleaned up stale game invites");
                    }
                });
            });
            
            // If we found stale invites but no pending checks, apply updates immediately
            if (hasStaleInvites && pendingChecks === 0) {
                database.ref().update(updates);
                console.log("Cleaned up stale game invites");
            }
        }
    });
}

// Call the setup function when the page loads if the user is already logged in
if (auth.currentUser) {
    setupGameInviteListener();
}

// Also set up a listener for auth state changes to handle login/logout
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("User logged in:", user.uid);
        setupGameInviteListener();
    } else {
        console.log("User logged out");
    }
});

function showGameInvite(invite) {
    console.log("Showing game invite:", invite);
    
    // Create invitation container
    const inviteContainer = document.createElement('div');
    inviteContainer.className = 'fixed top-20 right-4 bg-white p-4 rounded-lg shadow-lg z-50 max-w-md';
    inviteContainer.id = `invite-${invite.gameId}`;
    
    // Get challenger's username
    database.ref(`users/${invite.from}`).once('value', (snapshot) => {
        const challengerData = snapshot.val();
        const challengerName = challengerData ? challengerData.username || invite.fromUsername || 'Unknown Player' : 'Unknown Player';
        console.log("Challenger name:", challengerName);
        
        // Create invitation content with grid size information and countdown timer
        inviteContainer.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <h3 class="text-lg font-semibold">Game Invitation</h3>
                <button class="text-gray-500 hover:text-gray-700" onclick="document.getElementById('invite-${invite.gameId}').remove()">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <p class="mb-2">${challengerName} has challenged you to a game!</p>
            <p class="mb-4 text-sm text-gray-600">Grid Size: ${invite.gridSize}x${invite.gridSize}</p>
            <div class="mb-3">
                <p class="text-sm font-medium text-red-500">Time remaining: <span id="countdown-${invite.gameId}">5</span> seconds</p>
            </div>
            <div class="flex justify-end space-x-2">
                <button class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors duration-200" 
                        onclick="ignoreGameInvite('${invite.gameId}')">
                    Ignore
                </button>
                <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200" 
                        onclick="acceptGameInvite('${invite.gameId}')">
                    Accept
                </button>
            </div>
        `;
        
        // Add the invitation to the page
        document.body.appendChild(inviteContainer);
        console.log("Game invite UI added to the page");
        
        // Start the 5-second countdown timer
        let timeLeft = 5;
        const countdownElement = document.getElementById(`countdown-${invite.gameId}`);
        const countdownInterval = setInterval(() => {
            timeLeft--;
            if (countdownElement) {
                countdownElement.textContent = timeLeft;
            }
            
            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                // Auto-ignore the invitation after 5 seconds
                ignoreGameInvite(invite.gameId);
            }
        }, 1000);
        
        // Store the interval ID in the window object so it can be cleared when accepting
        window[`countdownInterval_${invite.gameId}`] = countdownInterval;
        
        // Play a notification sound or show a browser notification
        if (Notification.permission === "granted") {
            new Notification("Game Invitation", {
                body: `${challengerName} has challenged you to a ${invite.gridSize}x${invite.gridSize} game!`,
                icon: "/favicon.ico"
            });
        }
        
        // Auto-remove after 5 minutes (as a fallback)
        const fiveMinutes = 5 * 60 * 1000;
        setTimeout(() => {
            const element = document.getElementById(`invite-${invite.gameId}`);
            if (element) {
                console.log("Auto-removing expired game invite");
                element.remove();
            }
        }, fiveMinutes);
    });
}

function ignoreGameInvite(gameId) {
    // Remove the invitation from the database
    database.ref(`users/${auth.currentUser.uid}/gameInvites/${gameId}`).remove();
    
    // Remove the invitation UI
    const inviteElement = document.getElementById(`invite-${gameId}`);
    if (inviteElement) {
        inviteElement.remove();
    }
    
    // Update game status to declined
    database.ref(`games/${gameId}/status`).set('declined');
    
    showNotification('Game invitation ignored');
}

function acceptGameInvite(gameId) {
    console.log(`Accepting game invite for game ID: ${gameId}`);
    
    // Clear the countdown interval if it exists
    if (window[`countdownInterval_${gameId}`]) {
        clearInterval(window[`countdownInterval_${gameId}`]);
        delete window[`countdownInterval_${gameId}`];
    }
    
    // Hide all sections first
    const sections = [
        'authSection',
        'gameModesSection',
        'onlinePlayersSection',
        'userAccountSection',
        'contactSection'
    ];
    
    sections.forEach(sectionId => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.classList.add('hidden');
            element.classList.remove('fade-in');
        }
    });
    
    // Show game section
    const gameSection = document.getElementById('gameSection');
    gameSection.classList.remove('hidden');
    setTimeout(() => {
        gameSection.classList.add('fade-in');
    }, 50);
    
    // Hide breadcrumbs and back button immediately
    const breadcrumbsContainer = document.getElementById('breadcrumbsContainer');
    const backButtonContainer = document.getElementById('backButtonContainer');
    if (breadcrumbsContainer) {
        breadcrumbsContainer.classList.add('hidden');
        breadcrumbsContainer.style.display = 'none';
    }
    if (backButtonContainer) {
        backButtonContainer.classList.add('hidden');
        backButtonContainer.style.display = 'none';
    }
    
    // Close any open challenge modal
    const openModal = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
    if (openModal) {
        closeChallengeModal(openModal.querySelector('button'));
    }
    
    // Remove the invitation UI
    const inviteElement = document.getElementById(`invite-${gameId}`);
    if (inviteElement) {
        inviteElement.remove();
    }
    
    // Get the game data to find the other player
    database.ref(`games/${gameId}`).once('value', (snapshot) => {
        const gameData = snapshot.val();
        if (gameData) {
            console.log(`Game data retrieved:`, gameData);
            
            // Determine who the other player is
            const otherPlayerId = gameData.player1 === auth.currentUser.uid ? gameData.player2 : gameData.player1;
            console.log(`Other player ID: ${otherPlayerId}`);
            
            // Update game status to active and include a notification for the other player
            database.ref(`games/${gameId}`).update({
                status: 'active',
                acceptedBy: auth.currentUser.uid,
                acceptedAt: Date.now(),
                startTime: Date.now() // Add start time when game becomes active
            })
            .then(() => {
                console.log(`Game status set to active with notification`);
                
                // Remove the invitation from the database
                return database.ref(`users/${auth.currentUser.uid}/gameInvites/${gameId}`).remove();
            })
            .then(() => {
                console.log(`Removed invitation from database`);
                
                // Join the game immediately
                joinOnlineGame(gameId);
                
                // Notify the other player that the game has started
                database.ref(`users/${otherPlayerId}/notifications`).push({
                    type: 'game_started',
                    message: 'Game has started!',
                    timestamp: Date.now()
                });
                
                showNotification('Game started!');
            })
            .catch(error => {
                console.error(`Error in acceptGameInvite:`, error);
                showNotification(`Error accepting game: ${error.message}`);
            });
        } else {
            console.error(`Game data not found for ID: ${gameId}`);
            showNotification(`Error: Game not found`);
        }
    });
}

function joinOnlineGame(gameId) {
    console.log(`Joining online game: ${gameId}`);
    
    if (!auth.currentUser) {
        console.error("Cannot join game: User not authenticated");
        showNotification("You must be logged in to join a game");
        return;
    }
    
    // Hide breadcrumbs and back button immediately
    const breadcrumbsContainer = document.getElementById('breadcrumbsContainer');
    const backButtonContainer = document.getElementById('backButtonContainer');
    if (breadcrumbsContainer) {
        breadcrumbsContainer.classList.add('hidden');
        breadcrumbsContainer.style.display = 'none';
    }
    if (backButtonContainer) {
        backButtonContainer.classList.add('hidden');
        backButtonContainer.style.display = 'none';
    }
    
    // First, get the initial game state
    database.ref(`games/${gameId}`).once('value', (snapshot) => {
        const gameData = snapshot.val();
        if (gameData) {
            console.log(`Game data retrieved:`, gameData);
            
            // Check if game is already completed or abandoned
            // Also check for the abandonedBy property as a backup check
            if (gameData.status === 'completed' || gameData.status === 'abandoned' || gameData.abandonedBy) {
                // If this user didn't abandon the game, show them the stats first
                if (gameData.abandonedBy && gameData.abandonedBy !== auth.currentUser.uid && gameData.stats) {
                    showNotification('This game has already ended');
                    showGameStatsModal(gameData.stats);
                    
                    // Return to game modes after showing stats
                    setTimeout(() => {
                        showGameModes();
                    }, 5000);
                } else {
                    showNotification('This game has already ended');
                    showGameModes();
                }
                return;
            }
            
            // Determine if the current user is player1 or player2
            const isPlayer1 = gameData.player1 === auth.currentUser.uid;
            console.log(`Current user is ${isPlayer1 ? 'player1' : 'player2'}`);
            
            // Determine opponent ID
            const opponentId = isPlayer1 ? gameData.player2 : gameData.player1;
            
            // Fetch opponent details before setting up the game
            database.ref(`users/${opponentId}`).once('value', (opponentSnapshot) => {
                const opponentData = opponentSnapshot.val() || {};
                const opponentUsername = opponentData.username || 'Opponent';
                
                // Set up the current game state with grid size and opponent info
                currentGame = {
                    board: gameData.board || Array(gameData.gridSize * gameData.gridSize).fill(''),
                    gridSize: gameData.gridSize || 3,
                    currentPlayer: gameData.currentPlayer || 'X',
                    gameMode: 'PVP Online',
                    isOnline: true,
                    gameId: gameId,
                    playerSymbol: isPlayer1 ? 'X' : 'O',
                    opponentId: opponentId,
                    player1: gameData.player1,
                    player2: gameData.player2,
                    startTime: gameData.startTime || Date.now(),
                    // Store opponent info
                    opponent: {
                        displayName: opponentUsername,
                        uid: opponentId
                    }
                };
                
                console.log(`Current game state:`, currentGame);
                
                // Update the game status display
                updateGameStatus();
                
                // Show the game board
                showGame();

                // Attach the game listener
                attachGameListener(gameId);
                
                // Setup chat listener
                setupChatListener();
            });
        }
    });
}

function updateOnlineGame(index) {
    database.ref(`games/${currentGame.gameId}/board/${index}`).set(currentGame.currentPlayer);
    database.ref(`games/${currentGame.gameId}/currentPlayer`).set(currentGame.currentPlayer === 'X' ? 'O' : 'X');
    database.ref(`games/${currentGame.gameId}/lastMove`).set(Date.now());
}

// Add window event listener for page unload/refresh
window.addEventListener('beforeunload', (event) => {
    if (currentGame.isOnline && currentGame.gameId) {
        // Store game data before resetting
        const opponentId = currentGame.opponentId;
        const gameId = currentGame.gameId;
        const gridSize = currentGame.gridSize || 3;
        
        // First, remove all database listeners to fully disconnect
        database.ref(`games/${gameId}`).off('value');
        if (opponentId) {
            database.ref(`users/${opponentId}/status`).off('value');
        }
        database.ref(`games/${gameId}/chat`).off('child_added');
        
        // Get current game stats before disconnecting
        try {
            const currentStats = {
                player1Wins: currentGame.player1Wins || 0,
                player1Losses: currentGame.player1Losses || 0,
                player1Draws: currentGame.player1Draws || 0,
                player2Wins: currentGame.player2Wins || 0,
                player2Losses: currentGame.player2Losses || 0,
                player2Draws: currentGame.player2Draws || 0
            };
            
            const now = Date.now();
            const startTime = currentGame.startTime || now;
            const duration = now - startTime;
            const totalMoves = currentGame.board ? currentGame.board.filter(cell => cell !== '').length : 0;
            
            // Create complete stats object
            const stats = {
                player1Wins: currentStats.player1Wins,
                player1Losses: currentStats.player1Losses,
                player1Draws: currentStats.player1Draws,
                player2Wins: currentStats.player2Wins,
                player2Losses: currentStats.player2Losses,
                player2Draws: currentStats.player2Draws,
                duration: duration,
                totalMoves: totalMoves
            };
            
            // Update game status to abandoned and end the game
            navigator.sendBeacon(`${database.app.options.databaseURL}/games/${gameId}.json`, JSON.stringify({
                status: 'abandoned',
                abandonedBy: auth.currentUser.uid,
                abandonedAt: now,
                stats: stats,
                fullyDisconnected: true,
                lastActive: now
            }));
            
            // Also notify the opponent
            if (opponentId) {
                navigator.sendBeacon(`${database.app.options.databaseURL}/users/${opponentId}/forceReturn.json`, JSON.stringify({
                    action: 'returnToGameModes',
                    timestamp: now,
                    reason: 'opponent_left'
                }));
                
                navigator.sendBeacon(`${database.app.options.databaseURL}/users/${opponentId}/notifications.json`, JSON.stringify({
                    type: 'game_abandoned',
                    message: 'Your opponent has left the game',
                    timestamp: now
                }));
            }
        } catch (error) {
            console.error('Error during beforeunload:', error);
        }
        
        // Reset local game state
        currentGame = {
            board: Array(9).fill(''),
            currentPlayer: 'X',
            gameMode: '',
            isOnline: false,
            gameId: null,
            opponent: null,
            playerSymbol: 'X'
        };
        
        // Reset scores
        scoreSystem.resetScores();
    } else {
        // Reset local scores and game state for offline games
        scoreSystem.resetScores();
        currentGame = {
            board: Array(9).fill(''),
            currentPlayer: 'X',
            gameMode: '',
            isOnline: false,
            gameId: null,
            opponent: null,
            playerSymbol: 'X'
        };
    }
});

function leaveOnlineGame() {
    if (currentGame.gameId) {
        // Store opponentId before resetting game state
        const opponentId = currentGame.opponentId;
        const gameId = currentGame.gameId;
        
        // Remove all database listeners to fully disconnect
        database.ref(`games/${gameId}`).off('value');
        database.ref(`games/${gameId}/chat`).off('child_added');
        
        // Ensure the mobile navbar is visible when leaving the game
        document.querySelector('.mobile-navbar').style.display = '';
        
        // Remove opponent status listener if it exists
        if (opponentId) {
            database.ref(`users/${opponentId}/status`).off('value');
        }
        
        // Fetch current game data to get the most up-to-date stats
        database.ref(`games/${gameId}`).once('value').then((snapshot) => {
            const gameData = snapshot.val() || {};
        
            // Calculate game stats
            const now = Date.now();
            const startTime = gameData.startTime || currentGame.startTime || now;
            const duration = now - startTime;
            
            // Get the most current session stats from the database
            const currentSessionStats = gameData.currentSessionStats || {
                player1Wins: 0,
                player1Losses: 0,
                player1Draws: 0,
                player2Wins: 0,
                player2Losses: 0,
                player2Draws: 0
            };
            
            // Create complete stats object
            const stats = {
                player1Wins: currentSessionStats.player1Wins || 0,
                player1Losses: currentSessionStats.player1Losses || 0,
                player1Draws: currentSessionStats.player1Draws || 0,
                player2Wins: currentSessionStats.player2Wins || 0,
                player2Losses: currentSessionStats.player2Losses || 0,
                player2Draws: currentSessionStats.player2Draws || 0,
                duration: duration,
                totalMoves: gameData.board ? gameData.board.filter(cell => cell !== '').length : 
                           currentGame.board ? currentGame.board.filter(cell => cell !== '').length : 0
            };
            
            // Show stats modal with the fetched stats
            showGameStatsModal(stats);
            
            // Show notification to the other player before deleting the game
            if (opponentId) {
                database.ref(`users/${opponentId}/notifications`).push({
                    type: 'game_abandoned',
                    message: 'Your opponent has left the game',
                    timestamp: Date.now()
                });
                
                // Force opponent to return to game modes
                database.ref(`users/${opponentId}/forceReturn`).set({
                    action: 'returnToGameModes',
                    timestamp: Date.now(),
                    reason: 'opponent_left'
                });
            }
            
            // Wait to show stats before deleting the game
            setTimeout(() => {
                // Delete the game from the database
                database.ref(`games/${gameId}`).remove()
                    .then(() => {
                        console.log(`Game ${gameId} successfully deleted from database`);
                        
                        // Reset game state
                        currentGame = {
                            board: Array(9).fill(''),
                            currentPlayer: 'X',
                            gameMode: '',
                            isOnline: false,
                            gameId: null,
                            opponent: null,
                            playerSymbol: 'X',
                            gridSize: 3 // Default to 3x3
                        };
                        
                        // Reset scores when leaving the game
                        scoreSystem.resetScores();
                        
                        // Return to game modes
                        showGameModes();
                    })
                    .catch(error => {
                        console.error('Error deleting game from database:', error);
                        
                        // Even if deletion fails, reset game state and continue
                        currentGame = {
                            board: Array(9).fill(''),
                            currentPlayer: 'X',
                            gameMode: '',
                            isOnline: false,
                            gameId: null,
                            opponent: null,
                            playerSymbol: 'X',
                            gridSize: 3
                        };
                        
                        // Reset scores
                        scoreSystem.resetScores();
                        
                        // Return to game modes even if there's an error
                        showGameModes();
                    });
            }, 5000); // Wait 5 seconds before deleting
        }).catch(error => {
            console.error('Error fetching game data:', error);
            
            // Fallback to current game stats if database fetch fails
            const now = Date.now();
            const startTime = currentGame.startTime || now;
            const duration = now - startTime;
            
            const stats = {
                player1Wins: currentGame.player1Wins || 0,
                player1Losses: currentGame.player1Losses || 0,
                player1Draws: currentGame.player1Draws || 0,
                player2Wins: currentGame.player2Wins || 0,
                player2Losses: currentGame.player2Losses || 0,
                player2Draws: currentGame.player2Draws || 0,
                duration: duration,
                totalMoves: currentGame.board ? currentGame.board.filter(cell => cell !== '').length : 0
            };
            
            // Show stats modal with fallback stats
            showGameStatsModal(stats);
            
            // Try to delete the game even if fetching data failed
            setTimeout(() => {
                database.ref(`games/${gameId}`).remove()
                    .then(() => {
                        console.log(`Game ${gameId} successfully deleted from database`);
                    })
                    .catch(err => {
                        console.error('Error deleting game from database:', err);
                    });
                
                // Ensure all references to the game are removed
                currentGame = {
                    board: Array(9).fill(''),
                    currentPlayer: 'X',
                    gameMode: '',
                    isOnline: false,
                    gameId: null,
                    opponent: null,
                    playerSymbol: 'X'
                };
                
                // Reset scores
                scoreSystem.resetScores();
                
                // Return to game modes
                showGameModes();
            }, 4000);
        });
    }
}

// Test database connection
function testDatabaseConnection() {
    console.log("Testing database connection...");
    
    // Try to write a test value
    const testRef = database.ref('test');
    testRef.set({
        timestamp: Date.now(),
        test: 'connection_test'
    })
    .then(() => {
        console.log("Successfully wrote to database");
        alert("Database connection successful!");
        
        // Clean up the test data
        testRef.remove();
    })
    .catch((error) => {
        console.error("Error writing to database:", error);
        alert("Database connection failed: " + error.message);
    });
}

// Add a test button to the game modes section
// document.addEventListener('DOMContentLoaded', () => {
//     const gameModesDiv = document.querySelector('#gameModesSection .space-y-4');
//     if (gameModesDiv) {
//         const testButton = document.createElement('button');
//         testButton.className = 'w-full bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600';
//         testButton.textContent = 'Test Database Connection';
//         testButton.onclick = testDatabaseConnection;
//         gameModesDiv.appendChild(testButton);
//     }
// });

// This checkGameCompletion function has been moved and improved at line 2362
// Please use the version at line 2362 instead
/*
function checkGameCompletion() {
    // Check if game is already marked as completed to prevent double updates
    if (currentGame.status === 'completed') return;

    if (isGameOver()) {
        // Game is won
        currentGame.status = 'completed';
        currentGame.winner = currentGame.currentPlayer;
        currentGame.isDraw = false;
        
        // Update game in database
        if (currentGame.isOnline) {
            database.ref(`games/${currentGame.gameId}`).update({
                status: 'completed',
                winner: auth.currentUser.uid,
                isDraw: false,
                completedAt: Date.now(),
                scoresUpdated: false,
                statsUpdated: false
            });
        }
        
        // Show notification for winner
        showNotification('You won!');
        
        // Update score and mark as recorded
        const moves = currentGame.board.filter(cell => cell !== '').length;
        const time = Date.now() - currentGame.startTime;
        scoreSystem.updateScore('win', moves, time);
        scoreRecorded = true;

        // Only update stats if this is an offline game
        if (!currentGame.isOnline) {
            statsUpdated = true;
        }
        
        // Update game status immediately
        updateGameStatus();
        
        // Reset game after delay
        setTimeout(() => {
            resetGame();
        }, 3000);
    } else if (isDraw()) {
        // Game is a draw
        currentGame.status = 'completed';
        currentGame.winner = null;
        currentGame.isDraw = true;
        
        // Update game in database
        if (currentGame.isOnline) {
            database.ref(`games/${currentGame.gameId}`).update({
                status: 'completed',
                winner: null,
                isDraw: true,
                completedAt: Date.now(),
                scoresUpdated: false,
                statsUpdated: false
            });
        }
        
        // Show notification for draw
        showNotification('Game Over! It\'s a draw!');
        
        // Update score for draw and mark as recorded
        console.log('Game ended in a draw - adding 1 point to score');
        scoreSystem.updateScore('draw', 1, 0);
        scoreRecorded = true;

        // Only update stats if this is an offline game
        if (!currentGame.isOnline) {
            statsUpdated = true;
        }
        
        // Update game status immediately
        updateGameStatus();
        
        // Reset game after delay
        setTimeout(() => {
            resetGame();
        }, 3000);
    }
}
*/

// Request notification permissions
function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.log("This browser does not support desktop notifications");
        return;
    }
    
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                console.log("Notification permission granted");
            } else {
                console.log("Notification permission denied");
            }
        });
    }
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', () => {
    requestNotificationPermission();
});

// Test Firebase permissions
function testFirebasePermissions() {
    if (!auth.currentUser) {
        console.error("Cannot test permissions: User is not authenticated");
        showNotification("You must be logged in to test permissions");
        return;
    }
    
    console.log("Testing Firebase permissions...");
    
    // Test reading users
    database.ref('users').once('value')
        .then(() => {
            console.log("✅ Successfully read users");
            
            // Test writing to own gameInvites
            const testGameId = 'test-' + Date.now();
            return database.ref(`users/${auth.currentUser.uid}/gameInvites/${testGameId}`).set({
                test: true,
                timestamp: Date.now()
            });
        })
        .then(() => {
            console.log("✅ Successfully wrote to own gameInvites");
            
            // Clean up the test data
            return database.ref(`users/${auth.currentUser.uid}/gameInvites/test-${Date.now()}`).remove();
        })
        .then(() => {
            console.log("✅ Successfully cleaned up test data");
            showNotification("Firebase permissions test completed successfully");
        })
        .catch((error) => {
            console.error("❌ Firebase permissions test failed:", error);
            showNotification(`Permissions test failed: ${error.message}`);
        });
}

// Add a test button to the UI
// document.addEventListener('DOMContentLoaded', () => {
//     // Add a test button to the online players section
//     const onlinePlayersSection = document.getElementById('onlinePlayersSection');
//     if (onlinePlayersSection) {
//         const testButton = document.createElement('button');
//         testButton.className = 'mt-4 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors duration-200';
//         testButton.textContent = 'Test Firebase Permissions';
//         testButton.onclick = testFirebasePermissions;
//         onlinePlayersSection.appendChild(testButton);
//     }
// });

// Listen for game acceptance notifications
function setupGameAcceptedListener() {
    if (!auth.currentUser) {
        console.log("Cannot set up game accepted listener: User not authenticated");
        return;
    }
    
    // Keep track of processed acceptances to avoid duplicate processing
    const processedAcceptances = new Set();
    
    // Set up a listener for new games
    database.ref('games').on('child_added', (snapshot) => {
        const gameData = snapshot.val();
        const gameId = snapshot.key;
        
        if (gameData && gameData.status === 'active' && gameData.acceptedBy &&
            !processedAcceptances.has(gameId)) {
            console.log("New active game detected:", gameData);
            
            // Check if this game is for the current user
            if (gameData.player1 === auth.currentUser.uid || gameData.player2 === auth.currentUser.uid) {
                // Check if the game was just accepted by the other player
                if (gameData.acceptedBy !== auth.currentUser.uid) {
                    console.log(`Game ${gameId} was accepted by the other player`);
                    
                    // Mark this game as processed
                    processedAcceptances.add(gameId);
                    
                    // Join the game immediately
                    joinOnlineGame(gameId);
                    
                    // Show notification
                    showNotification('Game has started!');
                }
            }
        }
    });
    
    // Set up a listener for game updates
    database.ref('games').on('child_changed', (snapshot) => {
        const gameData = snapshot.val();
        const gameId = snapshot.key;
        
        if (gameData && gameData.status === 'active' && gameData.acceptedBy &&
            !processedAcceptances.has(gameId)) {
            console.log("Game status changed to active:", gameData);
            
            // Check if this game is for the current user
            if (gameData.player1 === auth.currentUser.uid || gameData.player2 === auth.currentUser.uid) {
                // Check if the game was just accepted by the other player
                if (gameData.acceptedBy !== auth.currentUser.uid) {
                    console.log(`Game ${gameId} was accepted by the other player`);
                    
                    // Mark this game as processed
                    processedAcceptances.add(gameId);
                    
                    // Join the game immediately
                    joinOnlineGame(gameId);
                    
                    // Show notification
                    showNotification('Game has started!');
                }
            }
        }
        
        // Handle game abandonment
        if (gameData && (gameData.status === 'abandoned' || gameData.abandonedBy)) {
            if (gameData.player1 === auth.currentUser.uid || gameData.player2 === auth.currentUser.uid) {
                if (gameData.abandonedBy !== auth.currentUser.uid) {
                    // Other player left the game
                    showNotification('Your opponent has left the game');
                    
                    // Show stats if available
                    if (gameData.stats) {
                        showGameStatsModal(gameData.stats);
                        
                        // Return to game modes after showing stats
                        setTimeout(() => {
                            showGameModes();
                        }, 5000);
                    } else {
                        showGameModes();
                    }
                }
            }
        }
    });
}

// Check for active games when the page loads
function checkForActiveGames() {
    if (!auth.currentUser) {
        console.log("Cannot check for active games: User not authenticated");
        return;
    }
    
    console.log("Checking for active games for user:", auth.currentUser.uid);
    
    // First, check if there are any abandoned games that need cleanup
    database.ref('games').once('value', (snapshot) => {
        const games = snapshot.val();
        if (games) {
            // Check for any games involving this user
            for (const gameId in games) {
                const game = games[gameId];
                
                // If the user is part of this game
                if ((game.player1 === auth.currentUser.uid || game.player2 === auth.currentUser.uid)) {
                    
                    // If the game is marked as abandoned or has abandonedBy property, just return to game modes
                    if (game.status === 'abandoned' || game.abandonedBy) {
                        console.log(`Found abandoned game: ${gameId}`);
                        showGameModes();
                        return;
                    }
                }
            }
            
            // Now check for active games
            for (const gameId in games) {
                const game = games[gameId];
                
                // Check for actually active games (not abandoned)
                if (game.status === 'active' && !game.abandonedBy && 
                    (game.player1 === auth.currentUser.uid || game.player2 === auth.currentUser.uid)) {
                    
                    console.log(`Found active game for user: ${gameId}`);
                    
                    // Check if the game was accepted by the other player
                    if (game.acceptedBy && game.acceptedBy !== auth.currentUser.uid) {
                        console.log(`Game ${gameId} was accepted by the other player`);
                        
                        // Join the game
                        joinOnlineGame(gameId);
                        return; // Only join the first active game found
                    }
                }
            }
        }
        
        console.log("No active games found for user");
    });
}

// Call the setup function when the page loads if the user is already logged in
if (auth.currentUser) {
    setupGameAcceptedListener();
    checkForActiveGames();
}

// Also set up a listener for auth state changes to handle login/logout
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("User logged in:", user.uid);
        setupGameAcceptedListener();
        checkForActiveGames();
    } else {
        console.log("User logged out");
    }
});

// Update user status when they connect/disconnect
function updateUserStatus(userId, status) {
    if (!auth.currentUser) return Promise.reject(new Error("User not authenticated"));
    
    console.log(`Updating user ${userId} status to ${status}`);
    
    // Set the user's status
    return database.ref(`users/${userId}/status`).set(status)
        .then(() => {
            console.log(`Successfully set user ${userId} status to ${status}`);
            
            // If setting to online, also set a timestamp
            if (status === 'online') {
                return database.ref(`users/${userId}/lastActive`).set(Date.now());
            }
        })
        .catch(error => {
            console.error(`Error setting user ${userId} status:`, error);
            throw error;
        });
}

// Set up presence system to track when users are actually online
function setupPresenceSystem() {
    if (!auth.currentUser) return;
    
    console.log("Setting up presence system for user:", auth.currentUser.uid);
    
    // Create a reference to the user's status
    const userStatusRef = database.ref(`users/${auth.currentUser.uid}/status`);
    const userLastActiveRef = database.ref(`users/${auth.currentUser.uid}/lastActive`);
    
    // Create a reference to the special '.info/connected' path in Realtime Database
    const connectedRef = database.ref('.info/connected');
    
    // When the client's connection state changes
    connectedRef.on('value', (snap) => {
        if (snap.val() === true) {
            // User is connected, set status to online
            console.log("User is connected, setting status to online");
            
            // Set status to online
            userStatusRef.set('online');
            
            // Set last active timestamp
            userLastActiveRef.set(Date.now());
            
            // Set up a periodic update to lastActive timestamp while online
            const lastActiveInterval = setInterval(() => {
                userLastActiveRef.set(Date.now());
            }, 30000); // Update every 30 seconds
            
            // When the user disconnects, clear the interval and remove any pending game invites
            userStatusRef.onDisconnect().set('offline');
            userLastActiveRef.onDisconnect().set(Date.now());
            database.ref(`users/${auth.currentUser.uid}/gameInvites`).onDisconnect().remove();
            
            // Store the interval ID to clear it later
            window.lastActiveInterval = lastActiveInterval;
        } else {
            // User is disconnected, clear any existing interval
            if (window.lastActiveInterval) {
                clearInterval(window.lastActiveInterval);
                window.lastActiveInterval = null;
            }
            
            console.log("User is disconnected");
        }
    });
}

// Call setupPresenceSystem when the page loads if the user is already logged in
if (auth.currentUser) {
    setupPresenceSystem();
}

// Also set up a listener for auth state changes to handle login/logout
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("User logged in:", user.uid);
        setupPresenceSystem();
    } else {
        console.log("User logged out");
        // Clear any existing interval
        if (window.lastActiveInterval) {
            clearInterval(window.lastActiveInterval);
            window.lastActiveInterval = null;
        }
    }
});

// Function to animate the winning cells
function animateWinningCells() {
    if (!currentGame.winningPattern) return;
    
    const cells = document.querySelectorAll('#gameSection .grid > div');
    
    // Add animation class to winning cells
    currentGame.winningPattern.forEach(index => {
        if (cells[index]) {
            cells[index].classList.add('winning-cell');
        }
    });
    
    // Add confetti animation
    showConfetti();
}

// Function to show confetti animation
function showConfetti() {
    // Create confetti container if it doesn't exist
    let confettiContainer = document.getElementById('confetti-container');
    if (!confettiContainer) {
        confettiContainer = document.createElement('div');
        confettiContainer.id = 'confetti-container';
        confettiContainer.style.position = 'fixed';
        confettiContainer.style.top = '0';
        confettiContainer.style.left = '0';
        confettiContainer.style.width = '100%';
        confettiContainer.style.height = '100%';
        confettiContainer.style.pointerEvents = 'none';
        confettiContainer.style.zIndex = '1000';
        document.body.appendChild(confettiContainer);
    }
    
    // Create confetti pieces
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.position = 'absolute';
        confetti.style.width = Math.random() * 10 + 5 + 'px';
        confetti.style.height = Math.random() * 10 + 5 + 'px';
        confetti.style.backgroundColor = getRandomColor();
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-20px';
        confetti.style.opacity = Math.random() * 0.8 + 0.2;
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        confetti.style.animation = `fall ${Math.random() * 3 + 2}s linear forwards`;
        confettiContainer.appendChild(confetti);
        
        // Remove confetti after animation
        setTimeout(() => {
            confetti.remove();
        }, 5000);
    }
}

// Function to get random color for confetti
function getRandomColor() {
    const colors = ['#FF5252', '#FF4081', '#E040FB', '#7C4DFF', '#536DFE', '#448AFF', '#40C4FF', '#18FFFF', '#64FFDA', '#69F0AE', '#B2FFD8', '#EEFF41', '#FFFF00', '#FFD740', '#FFAB40', '#FF6E40'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Add CSS for confetti animation
function addConfettiStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fall {
            0% {
                transform: translateY(-20px) rotate(0deg);
                opacity: 1;
            }
            100% {
                transform: translateY(100vh) rotate(360deg);
                opacity: 0;
            }
        }
        
        .winning-cell {
            animation: pulse 1s infinite;
            background-color: rgba(255, 215, 0, 0.3);
            transition: all 0.3s ease;
        }
        
        @keyframes pulse {
            0% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.1);
            }
            100% {
                transform: scale(1);
            }
        }
        
        .draw-game {
            animation: draw-pulse 1.5s infinite;
            background-color: rgba(128, 128, 128, 0.3);
            transition: all 0.3s ease;
        }
        
        @keyframes draw-pulse {
            0% {
                transform: scale(1);
                background-color: rgba(128, 128, 128, 0.3);
            }
            50% {
                transform: scale(1.05);
                background-color: rgba(128, 128, 128, 0.5);
            }
            100% {
                transform: scale(1);
                background-color: rgba(128, 128, 128, 0.3);
            }
        }
    `;
    document.head.appendChild(style);
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', () => {
    addConfettiStyles();
});

// Add a listener for force return to game modes
function setupForceReturnListener() {
    if (!auth.currentUser) return;
    
    database.ref(`users/${auth.currentUser.uid}/forceReturn`).on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && data.action === 'returnToGameModes') {
            console.log('Force return triggered:', data);
            
            // If the game was abandoned by the opponent, show a notification
            if (data.reason === 'opponent_left') {
                showNotification('Your opponent has left the game');
                
                // If we have a current game ID, try to fetch stats before returning to game modes
                if (currentGame.gameId) {
                    database.ref(`games/${currentGame.gameId}`).once('value').then((gameSnapshot) => {
                        const gameData = gameSnapshot.val();
                        if (gameData && gameData.stats) {
                            // Show game stats modal before returning
                            showGameStatsModal(gameData.stats);
                            
                            // Wait for stats to display before returning to game modes
                            setTimeout(() => {
                                // Reset scores and return to game modes
                                scoreSystem.resetScores();
                                showGameModes();
                            }, 5000);
                        } else {
                            // No stats available, just return to game modes
                            scoreSystem.resetScores();
                            showGameModes();
                        }
                    }).catch(error => {
                        console.error('Error fetching game data for force return:', error);
                        // Fallback to just returning to game modes
                        scoreSystem.resetScores();
                        showGameModes();
                    });
                } else {
                    // No current game ID, just return to game modes
                    scoreSystem.resetScores();
                    showGameModes();
                }
            } else {
                // Standard force return without reason (legacy support)
                scoreSystem.resetScores();
                showGameModes();
            }
            
            // Clear the force return flag
            database.ref(`users/${auth.currentUser.uid}/forceReturn`).remove();
        }
    });
}

// Call setupForceReturnListener when the page loads if the user is already logged in
if (auth.currentUser) {
    setupForceReturnListener();
}
// Also set up a listener for auth state changes to handle login/logout
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("User logged in:", user.uid);
        setupForceReturnListener();
    } else {
        console.log("User logged out");
    }
});

// Add page load event listener
window.addEventListener('load', () => {
    // Reset game state
    currentGame = {
        board: Array(9).fill(''),
        currentPlayer: 'X',
        gameMode: '',
        isOnline: false,
        gameId: null,
        opponent: null,
        playerSymbol: 'X'
    };
    
    // Reset score system
    scoreSystem.resetScores();
    
    // Hide game section and show game modes
    document.getElementById('gameSection').classList.add('hidden');
    document.getElementById('gameModesSection').classList.remove('hidden');
    
    // Ensure mobile navbar is visible
    document.querySelector('.mobile-navbar').style.display = '';
    
    // Reset score recorded flags
    scoreRecorded = false;
    statsUpdated = false;
    
    // Add listeners for page visibility changes
    setupPageVisibilityListeners();
});

// Function to handle when player leaves the game by changing tabs or closing window
function setupPageVisibilityListeners() {
    // Track time when page becomes hidden
    let hiddenTime = 0;
    const MAX_ALLOWED_HIDDEN_TIME = 10000; // 10 seconds of inactivity (tab change, etc.) before ending game
    
    // Listen for visibility change events
    document.addEventListener('visibilitychange', () => {
        // Only handle if in an online game
        if (!currentGame.isOnline || !currentGame.gameId) return;
        
        if (document.visibilityState === 'hidden') {
            // Page is now hidden (user switched tabs or minimized)
            hiddenTime = Date.now();
            console.log('Game page hidden at:', hiddenTime);
            
            // Create a timeout to check if the user has been away too long
            window.gameInactivityTimeout = setTimeout(() => {
                // If still in a game and page is still hidden, abandon the game
                if (currentGame.isOnline && currentGame.gameId && document.visibilityState === 'hidden') {
                    console.log('Player inactive for too long, abandoning game');
                    handleGameAbandonment();
                }
            }, MAX_ALLOWED_HIDDEN_TIME);
        } else if (document.visibilityState === 'visible') {
            // Page is visible again
            console.log('Game page visible again');
            
            // Clear any pending timeout
            if (window.gameInactivityTimeout) {
                clearTimeout(window.gameInactivityTimeout);
                window.gameInactivityTimeout = null;
            }
            
            // If player was hidden for more than MAX_ALLOWED_HIDDEN_TIME, check if game is still active
            const hiddenDuration = Date.now() - hiddenTime;
            if (hiddenTime > 0 && hiddenDuration > MAX_ALLOWED_HIDDEN_TIME && currentGame.isOnline && currentGame.gameId) {
                console.log('Checking game status after inactivity');
                
                // Verify game is still active
                database.ref(`games/${currentGame.gameId}/status`).once('value', (snapshot) => {
                    const status = snapshot.val();
                    if (status === 'abandoned') {
                        // Game was abandoned while we were away
                        showNotification('Game was ended due to inactivity');
                        showGameModes();
                    }
                });
            }
            
            hiddenTime = 0;
        }
    });
}

// Function to handle game abandonment due to inactivity
function handleGameAbandonment() {
    if (!currentGame.isOnline || !currentGame.gameId) return;
    
    // Store opponentId before resetting game state
    const opponentId = currentGame.opponentId;
    const gameId = currentGame.gameId;
    
    // Fetch current game data to get the most up-to-date stats
    database.ref(`games/${gameId}`).once('value').then((snapshot) => {
        const gameData = snapshot.val() || {};
        
        // Only proceed if game is still active
        if (gameData.status === 'active') {
            // Calculate game stats
            const now = Date.now();
            const startTime = gameData.startTime || currentGame.startTime || now;
            const duration = now - startTime;
            
            // Get the most current session stats from the database
            const currentSessionStats = gameData.currentSessionStats || {
                player1Wins: 0,
                player1Losses: 0,
                player1Draws: 0,
                player2Wins: 0,
                player2Losses: 0,
                player2Draws: 0
            };
            
            // Create complete stats object
            const stats = {
                player1Wins: currentSessionStats.player1Wins || 0,
                player1Losses: currentSessionStats.player1Losses || 0,
                player1Draws: currentSessionStats.player1Draws || 0,
                player2Wins: currentSessionStats.player2Wins || 0,
                player2Losses: currentSessionStats.player2Losses || 0,
                player2Draws: currentSessionStats.player2Draws || 0,
                duration: duration,
                totalMoves: gameData.board ? gameData.board.filter(cell => cell !== '').length : 
                           currentGame.board ? currentGame.board.filter(cell => cell !== '').length : 0
            };
            
            // Update game status to abandoned in database
            database.ref(`games/${gameId}`).update({
                status: 'abandoned',
                abandonedBy: auth.currentUser.uid,
                abandonedAt: now,
                stats: stats
            }).then(() => {
                console.log('Game marked as abandoned due to inactivity');
                
                // Notify the opponent
                if (opponentId) {
                    database.ref(`users/${opponentId}/notifications`).push({
                        type: 'game_abandoned',
                        message: 'Your opponent left the game due to inactivity',
                        timestamp: Date.now()
                    });
                    
                    // Force opponent to return to game modes
                    database.ref(`users/${opponentId}/forceReturn`).set({
                        action: 'returnToGameModes',
                        timestamp: Date.now()
                    });
                }
                
                // Reset local game state (will take effect when user returns to the tab)
                currentGame = {
                    board: Array(9).fill(''),
                    currentPlayer: 'X',
                    gameMode: '',
                    isOnline: false,
                    gameId: null,
                    opponent: null,
                    playerSymbol: 'X'
                };
                
                // Reset scores
                scoreSystem.resetScores();
            }).catch(error => {
                console.error('Error abandoning game:', error);
            });
        }
    }).catch(error => {
        console.error('Error fetching game data:', error);
    });
}

// Chat functionality
function sendChatMessage() {
    if (!currentGame.isOnline || !currentGame.gameId) return;
    
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message) return;
    
    // Get current user's username
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    database.ref(`users/${currentUser.uid}`).once('value', (snapshot) => {
        const userData = snapshot.val();
        const username = userData ? userData.username || 'Player' : 'Player';
        
        // Add message to Firebase
        database.ref(`games/${currentGame.gameId}/chat`).push({
            sender: currentUser.uid,
            senderName: username,
            message: message,
            timestamp: Date.now()
        }).then(() => {
            // Clear input
            chatInput.value = '';
            
            // Scroll to bottom of messages
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) {
                setTimeout(() => {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }, 100);
            }
        }).catch(error => {
            console.error('Error sending chat message:', error);
            showNotification('Error sending message');
        });
    });
}

function setupChatListener() {
    if (!currentGame.isOnline || !currentGame.gameId) return;
    
    // Clear existing chat messages
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    chatMessages.innerHTML = '';
    
    // Make sure the chat input doesn't affect navbar visibility
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        // Remove any existing focus/blur listeners that might affect the navbar
        const oldFocus = chatInput.onfocus;
        const oldBlur = chatInput.onblur;
        
        chatInput.onfocus = function(e) {
            // Keep the navbar hidden during game
            document.querySelector('.mobile-navbar').style.display = 'none';
            // Call original handler if it exists
            if (oldFocus) oldFocus.call(this, e);
        };
        
        chatInput.onblur = function(e) {
            // Keep the navbar hidden during game
            document.querySelector('.mobile-navbar').style.display = 'none';
            // Call original handler if it exists
            if (oldBlur) oldBlur.call(this, e);
        };
    }
    
    // Listen for new chat messages
    database.ref(`games/${currentGame.gameId}/chat`).on('child_added', (snapshot) => {
        const message = snapshot.val();
        if (!message) return;
        
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message mb-2 p-2 rounded-lg max-w-[80%] ${
            message.sender === auth.currentUser.uid 
                ? 'bg-indigo-100 ml-auto text-right sent' 
                : 'bg-gray-100 received new-message'
        }`;
        
        // Add message content
        messageElement.innerHTML = `
            <div class="text-xs text-gray-500">${message.senderName}</div>
            <div class="text-sm break-words">${message.message}</div>
        `;
        
        // Add to chat container
        chatMessages.appendChild(messageElement);
        
        // If it's a received message, add notification effect
        if (message.sender !== auth.currentUser.uid) {
            // Create notification element
            const notification = document.createElement('div');
            notification.className = 'message-notification';
            notification.innerHTML = `
                <div class="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                    </svg>
                    <span>New message from ${message.senderName}</span>
                </div>
            `;
            
            // Make notification clickable
            notification.style.cursor = 'pointer';
            notification.onclick = () => {
                // Scroll to chat section
                const chatSection = document.querySelector('.chat-container');
                if (chatSection) {
                    chatSection.scrollIntoView({ behavior: 'smooth' });
                    // Remove notification when clicked
                    notification.remove();
                }
            };
            
            document.body.appendChild(notification);
            
            // Remove notification after animation
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    notification.remove();
                }
            }, 3000);
            
            // Play notification sound if available
            playNotificationSound();
        }
        
        // Scroll to bottom of messages
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 100);
    });
}

// Add notification sound function
function playNotificationSound() {
    const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU...');
    audio.volume = 0.3;
    audio.play().catch(e => console.log('Audio play failed:', e));
}

// Add event listener for Enter key in chat input
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
});

// Function to show game stats modal
function showGameStatsModal(stats) {
    // Only show stats if there's actual game data
    if (!stats || (!stats.player1Wins && !stats.player1Losses && !stats.player1Draws && 
        !stats.player2Wins && !stats.player2Losses && !stats.player2Draws)) {
        return;
    }

    // Disable scrolling
    document.body.style.overflow = 'hidden';

    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.style.animation = 'fadeIn 0.3s ease-in-out';

    // Use stats parameter if provided, otherwise fetch from database
    if (stats && Object.keys(stats).length > 0) {
        displayStats(stats);
    } else if (currentGame.gameId) {
        // Fetch current game data if stats not provided
        database.ref(`games/${currentGame.gameId}`).once('value').then((snapshot) => {
            const gameData = snapshot.val() || {};

            // Only show stats if game is completed or abandoned
            if (gameData.status !== 'completed' && gameData.status !== 'abandoned') {
                return;
            }

            // Use database stats or create default stats object
            const currentGameStats = gameData.currentSessionStats || {
                player1Wins: 0,
                player1Losses: 0,
                player1Draws: 0,
                player2Wins: 0,
                player2Losses: 0,
                player2Draws: 0
            };
            
            // Get duration and moves data
            const duration = Date.now() - (gameData.startTime || Date.now());
            const totalMoves = gameData.board ? gameData.board.filter(cell => cell !== '').length : 0;
            
            const fullStats = {
                player1Wins: currentGameStats.player1Wins || 0,
                player1Losses: currentGameStats.player1Losses || 0,
                player1Draws: currentGameStats.player1Draws || 0,
                player2Wins: currentGameStats.player2Wins || 0,
                player2Losses: currentGameStats.player2Losses || 0,
                player2Draws: currentGameStats.player2Draws || 0,
                duration: duration,
                totalMoves: totalMoves
            };
            
            displayStats(fullStats);
        }).catch(error => {
            console.error('Error fetching game stats:', error);
        });
    }
    
    // Helper function to display stats in the modal
    function displayStats(statsData) {
        // Get player names from current game data or fallback to defaults
        const currentUserName = auth.currentUser?.displayName || auth.currentUser?.email || 'Player 1';
        
        // For the opponent, we need to ensure we get the name correctly
        let opponentName = 'Player 2';
        
        if (currentGame.opponent && currentGame.opponent.displayName) {
            // Use opponent data directly from current game state
            opponentName = currentGame.opponent.displayName;
        } else if (currentGame.opponentId) {
            // Try to fetch opponent data asynchronously
            database.ref(`users/${currentGame.opponentId}`).once('value').then((snapshot) => {
                const userData = snapshot.val();
                if (userData && userData.username) {
                    const nameElement = document.querySelector('#opponentName');
                    if (nameElement) {
                        nameElement.textContent = `${userData.username} (O)`;
                    }
                }
            }).catch(error => {
                console.error('Error fetching opponent username:', error);
            });
        }
        
        // Determine which player is X and which is O based on playerSymbol
        const isCurrentUserX = currentGame.playerSymbol === 'X';
        const player1Symbol = isCurrentUserX ? 'X' : 'O';
        const player2Symbol = isCurrentUserX ? 'O' : 'X';
        
        // Format player stats
        const currentGameStats = {
            player1: {
                wins: statsData.player1Wins || 0,
                losses: statsData.player1Losses || 0,
                draws: statsData.player1Draws || 0
            },
            player2: {
                wins: statsData.player2Wins || 0,
                losses: statsData.player2Losses || 0,
                draws: statsData.player2Draws || 0
            }
        };

        // Calculate game duration
        const duration = statsData.duration || 0;
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        const durationText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

        // Use provided total moves or default to 0
        const totalMoves = statsData.totalMoves || 0;

        const statsContent = `
            <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4 glass-effect">
                <h3 class="text-xl font-semibold text-center mb-4">Game Results</h3>
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse">
                        <thead>
                            <tr>
                                <th class="px-4 py-2 text-left font-bold" id="player1Name">
                                    ${currentUserName} (${player1Symbol})
                                    <span class="ml-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">You</span>
                                </th>
                                <th class="px-4 py-2 text-left font-bold" id="opponentName">
                                    ${opponentName} (${player2Symbol})
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="px-4 py-2 border">
                                    <span class="text-green-600">Wins:</span> ${isCurrentUserX ? currentGameStats.player1.wins : currentGameStats.player2.wins}
                                </td>
                                <td class="px-4 py-2 border">
                                    <span class="text-green-600">Wins:</span> ${isCurrentUserX ? currentGameStats.player2.wins : currentGameStats.player1.wins}
                                </td>
                            </tr>
                            <tr>
                                <td class="px-4 py-2 border">
                                    <span class="text-red-600">Losses:</span> ${isCurrentUserX ? currentGameStats.player1.losses : currentGameStats.player2.losses}
                                </td>
                                <td class="px-4 py-2 border">
                                    <span class="text-red-600">Losses:</span> ${isCurrentUserX ? currentGameStats.player2.losses : currentGameStats.player1.losses}
                                </td>
                            </tr>
                            <tr>
                                <td class="px-4 py-2 border">
                                    <span class="text-yellow-600">Draws:</span> ${isCurrentUserX ? currentGameStats.player1.draws : currentGameStats.player2.draws}
                                </td>
                                <td class="px-4 py-2 border">
                                    <span class="text-yellow-600">Draws:</span> ${isCurrentUserX ? currentGameStats.player2.draws : currentGameStats.player1.draws}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="mt-4 text-center text-sm text-gray-600">
                    <p>Game Duration: ${durationText}</p>
                    <p>Total Moves: ${totalMoves}</p>
                </div>
            </div>
        `;

        modal.innerHTML = statsContent;
        document.body.appendChild(modal);

        // Auto-close after 5 seconds to give more time to read
        setTimeout(() => {
            modal.style.animation = 'fadeOut 0.3s ease-in-out';
            setTimeout(() => {
                modal.remove();
                // Re-enable scrolling
                document.body.style.overflow = '';
            }, 300);
        }, 5000);
    }
}

// Update the checkGameCompletion function to track current session stats
function checkGameCompletion() {
    if (currentGame.status === 'completed') return;

    if (isGameOver()) {
        // Game is won
        currentGame.status = 'completed';
        currentGame.winner = currentGame.currentPlayer;
        currentGame.isDraw = false;
        
        if (currentGame.isOnline) {
            // Get current session stats
            database.ref(`games/${currentGame.gameId}/currentSessionStats`).transaction((currentStats) => {
                if (!currentStats) currentStats = {
                    player1Wins: 0,
                    player1Losses: 0,
                    player1Draws: 0,
                    player2Wins: 0,
                    player2Losses: 0,
                    player2Draws: 0
                };

                // Determine winner - playerSymbol is 'X' for player1 and 'O' for player2
                const winningSymbol = currentGame.currentPlayer === 'X' ? 'O' : 'X'; // Current player is the one who made the last move, opposite is winner
                
                // Update based on which player won
                if (winningSymbol === 'X') {
                    // Player 1 (X) won
                    currentStats.player1Wins++;
                    currentStats.player2Losses++;
                } else {
                    // Player 2 (O) won
                    currentStats.player2Wins++;
                    currentStats.player1Losses++;
                }
                
                return currentStats;
            });

            database.ref(`games/${currentGame.gameId}`).update({
                status: 'completed',
                winner: auth.currentUser.uid,
                isDraw: false,
                completedAt: Date.now(),
                scoresUpdated: false,
                statsUpdated: false
            });
        }
        
        // Update score and mark as recorded
        const moves = currentGame.board.filter(cell => cell !== '').length;
        const time = Date.now() - currentGame.startTime;
        scoreSystem.updateScore('win', moves, time);
        scoreRecorded = true;
        
        // Show notification for winner
        showNotification('You won!');
        updateGameStatus();
        
        // Reset game after delay
        setTimeout(() => {
            performReset();
        }, 3000);
    } else if (isDraw()) {
        // Game is a draw
        currentGame.status = 'completed';
        currentGame.winner = null;
        currentGame.isDraw = true;
        
        if (currentGame.isOnline) {
            // Update draw stats for both players
            database.ref(`games/${currentGame.gameId}/currentSessionStats`).transaction((currentStats) => {
                if (!currentStats) currentStats = {
                    player1Wins: 0,
                    player1Losses: 0,
                    player1Draws: 0,
                    player2Wins: 0,
                    player2Losses: 0,
                    player2Draws: 0
                };
                
                currentStats.player1Draws++;
                currentStats.player2Draws++;
                return currentStats;
            });

            database.ref(`games/${currentGame.gameId}`).update({
                status: 'completed',
                winner: null,
                isDraw: true,
                completedAt: Date.now(),
                scoresUpdated: false,
                statsUpdated: false
            });
        }
        
        // Update score for draw and mark as recorded
        console.log('Game ended in a draw - adding 1 point to score');
        scoreSystem.updateScore('draw', 1, 0);
        scoreRecorded = true;
        
        // Show notification for draw
        showNotification('Game Over! It\'s a draw!');
        updateGameStatus();
        
        // Reset game after delay
        setTimeout(() => {
            performReset();
        }, 3000);
    }
}

// Add visibility change event listener to detect tab switching or browser minimizing
document.addEventListener('visibilitychange', () => {
    // Only handle if in an online game
    if (!currentGame.isOnline || !currentGame.gameId) return;
    
    if (document.visibilityState === 'hidden') {
        console.log('Game page hidden, player may have left');
        
        // Set a timeout to end the game if hidden for more than a few seconds
        // This prevents ending the game for momentary tab switches
        window.visibilityTimeout = setTimeout(() => {
            if (!currentGame.isOnline || !currentGame.gameId) return;
            
            console.log('Player left the game (tab change/refresh)');
            
            // Store game data before cleaning up
            const opponentId = currentGame.opponentId;
            const gameId = currentGame.gameId;
            
            // First, remove all database listeners to fully disconnect
            database.ref(`games/${gameId}`).off('value');
            if (opponentId) {
                database.ref(`users/${opponentId}/status`).off('value');
            }
            database.ref(`games/${gameId}/chat`).off('child_added');
            
            // Get current game stats
            database.ref(`games/${gameId}/currentSessionStats`).once('value', (statsSnapshot) => {
                const currentStats = statsSnapshot.val() || {
                    player1Wins: 0,
                    player1Losses: 0,
                    player1Draws: 0,
                    player2Wins: 0,
                    player2Losses: 0,
                    player2Draws: 0
                };
                
                // Calculate game duration and moves
                const now = Date.now();
                database.ref(`games/${gameId}`).once('value', (gameSnapshot) => {
                    const gameData = gameSnapshot.val() || {};
                    const startTime = gameData.startTime || now;
                    const duration = now - startTime;
                    const totalMoves = gameData.board ? gameData.board.filter(cell => cell !== '').length : 0;
                    
                    // Create complete stats object
                    const stats = {
                        player1Wins: currentStats.player1Wins || 0,
                        player1Losses: currentStats.player1Losses || 0,
                        player1Draws: currentStats.player1Draws || 0,
                        player2Wins: currentStats.player2Wins || 0,
                        player2Losses: currentStats.player2Losses || 0,
                        player2Draws: currentStats.player2Draws || 0,
                        duration: duration,
                        totalMoves: totalMoves
                    };
                    
                    // Update game status to abandoned and include relevant data
                    database.ref(`games/${gameId}`).update({
                        status: 'abandoned',
                        abandonedBy: auth.currentUser.uid,
                        abandonedAt: now,
                        stats: stats,
                        lastActive: now,
                        fullyDisconnected: true
                    });
                    
                    // Force opponent to return to game modes if they're still in the game
                    if (opponentId) {
                        database.ref(`users/${opponentId}/forceReturn`).set({
                            action: 'returnToGameModes',
                            timestamp: Date.now(),
                            reason: 'opponent_left'
                        });
                        
                        // Also update the opponent's notifications
                        database.ref(`users/${opponentId}/notifications`).push({
                            type: 'game_abandoned',
                            message: 'Your opponent has left the game',
                            timestamp: Date.now()
                        });
                    }
                    
                    // Reset local game state to ensure full disconnection
                    currentGame = {
                        board: Array(9).fill(''),
                        currentPlayer: 'X',
                        gameMode: '',
                        isOnline: false,
                        gameId: null,
                        opponent: null,
                        playerSymbol: 'X',
                        gridSize: 3
                    };
                    
                    // Reset scores
                    scoreSystem.resetScores();
                    
                    // Return to game modes
                    showGameModes();
                });
            });
        }, 3000); // Wait 3 seconds to confirm the player has actually left
    } else if (document.visibilityState === 'visible') {
        // Page is visible again, clear timeout if it exists
        if (window.visibilityTimeout) {
            clearTimeout(window.visibilityTimeout);
            window.visibilityTimeout = null;
        }
        
        // Check if game was abandoned while we were away
        if (currentGame.isOnline && currentGame.gameId) {
            database.ref(`games/${currentGame.gameId}`).once('value', (snapshot) => {
                const gameData = snapshot.val();
                if (gameData && (gameData.status === 'abandoned' || gameData.abandonedBy)) {
                    // Game was abandoned, redirect to game modes
                    showNotification('Game was ended while you were away');
                    
                    // Show stats if available and this user wasn't the one who abandoned
                    if (gameData.stats && gameData.abandonedBy !== auth.currentUser.uid) {
                        showGameStatsModal(gameData.stats);
                    }
                    
                    // Reset local game state
                    currentGame = {
                        board: Array(9).fill(''),
                        currentPlayer: 'X',
                        gameMode: '',
                        isOnline: false,
                        gameId: null,
                        opponent: null,
                        playerSymbol: 'X'
                    };
                    
                    // Reset scores
                    scoreSystem.resetScores();
                    
                    // Return to game modes
                    showGameModes();
                }
            });
        }
    }
});

function showGameModes() {
    // Use the main navigation function to ensure URL hash is updated
    navigateTo('game', true);
    
    // Show mobile navbar when returning to game modes
    document.querySelector('.mobile-navbar').style.display = '';
    
    // Hide navbar toggle button when not in a game
    const navbarToggleBtn = document.getElementById('navbarToggleBtn');
    if (navbarToggleBtn) {
        navbarToggleBtn.style.display = 'none';
    }
    
    // Show breadcrumbs and back button again when returning to game modes
    const breadcrumbsContainer = document.getElementById('breadcrumbsContainer');
    const backButtonContainer = document.getElementById('backButtonContainer');
    if (breadcrumbsContainer) {
        breadcrumbsContainer.classList.remove('hidden');
        breadcrumbsContainer.style.display = '';
    }
    if (backButtonContainer) {
        backButtonContainer.classList.add('hidden'); // Keep back button hidden initially
        backButtonContainer.style.display = '';
    }
    
    // Update current breadcrumb
    const currentBreadcrumb = document.getElementById('currentBreadcrumb');
    if (currentBreadcrumb) {
        currentBreadcrumb.textContent = 'Game Modes';
    }
}

// Function to toggle mobile navbar visibility
function toggleMobileNavbar() {
    const navbar = document.querySelector('.mobile-navbar');
    if (navbar.style.display === 'none') {
        navbar.style.display = '';
        setTimeout(() => {
            // Only hide it again if we're still in a game
            if (document.getElementById('gameSection').classList.contains('hidden') === false) {
                navbar.style.display = 'none';
            }
        }, 5000);
    } else {
        navbar.style.display = 'none';
    }
}

// Function to check and update verification status
async function checkAndUpdateVerification(userId, wins) {
    if (wins >= 200) {
        try {
            const userRef = database.ref(`users/${userId}`);
            const snapshot = await userRef.once('value');
            const userData = snapshot.val();
            
            // Only update if not already verified
            if (userData && !userData.isVerified) {
                await userRef.update({ isVerified: true });
                showNotification('Congratulations! You have been automatically verified for reaching 200 wins! 🎉');
                
                // Check if verification notification already exists
                const notificationsRef = database.ref(`notifications/${userId}`);
                const notificationsSnapshot = await notificationsRef.orderByChild('title').equalTo('Achievement Unlocked: Verified Status').once('value');
                
                // Only create notification if it doesn't already exist
                if (!notificationsSnapshot.exists()) {
                    // Add notification to notification panel
                    const notificationRef = notificationsRef.push();
                    await notificationRef.set({
                        type: 'achievement',
                        title: 'Achievement Unlocked: Verified Status',
                        message: 'Congratulations! You have been verified for reaching 200 wins. Your profile now displays a verification badge (✓).',
                        read: false,
                        timestamp: firebase.database.ServerValue.TIMESTAMP,
                        icon: '🏆'
                    });
                }
            }
        } catch (error) {
            console.error('Error updating verification status:', error);
        }
    }
}

// Update user profile stats
if (auth.currentUser) {
    const userRef = database.ref(`users/${auth.currentUser.uid}/stats`);
    userRef.transaction((currentStats) => {
        if (!currentStats) {
            currentStats = {
                gamesPlayed: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                totalScore: 0,
                highestScore: 0,
                averageScore: 0
            };
        }
        
        currentStats.gamesPlayed = (currentStats.gamesPlayed || 0) + 1;
        if (isWinner) {
            currentStats.wins = (currentStats.wins || 0) + 1;
            currentStats.totalScore = (currentStats.totalScore || 0) + moves;
            currentStats.highestScore = Math.max(currentStats.highestScore || 0, moves);
            
            // Check for automatic verification after updating wins
            checkAndUpdateVerification(auth.currentUser.uid, currentStats.wins);
        } else {
            currentStats.losses = (currentStats.losses || 0) + 1;
        }
        currentStats.averageScore = currentStats.totalScore / currentStats.gamesPlayed;
        
        return currentStats;
    });
}
