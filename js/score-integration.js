// Score Integration with Game Logic

// Track if we've already recorded the score for the current game
let scoreRecorded = false;

// Function to check and update scores
function checkAndUpdateScore() {
    // If we've already recorded the score for this game, don't do it again
    if (scoreRecorded || currentGame.status === 'completed') return;
    
    // For online games, let the main game logic handle score updates
    if (currentGame.isOnline) {
        console.log("Online game detected, skipping local score update");
        return;
    }
    
    // Get the game status element
    const statusElement = document.getElementById('gameStatus');
    if (!statusElement) return;
    
    // Get the current status text
    const statusText = statusElement.textContent;
    
    // Check if the game is over by looking at the status text
    if (statusText.includes("Draw")) {
        // It's a draw
        console.log("Local game: Draw detected, updating score");
        scoreSystem.updateScore('draw', 1, 0);
        scoreRecorded = true;
    } 
    else if (statusText.includes("Wins")) {
        // Someone won
        let winner;
        
        // Determine the winner from the status text
        if (statusText.includes("Player X")) {
            winner = 'X';
        } else if (statusText.includes("Player O")) {
            winner = 'O';
        } else {
            // For online games, we need to determine the winner based on the current player
            winner = currentGame.currentPlayer === 'X' ? 'O' : 'X';
        }
        
        console.log(`Local game: Winner detected (${winner}), updating score`);
        const moves = currentGame.board.filter(cell => cell !== '').length;
        const time = Date.now() - currentGame.startTime;
        scoreSystem.updateScore('win', moves, time);
        scoreRecorded = true;
    }
}

// Override the makeMove function to check for game outcomes
const originalMakeMove = window.makeMove;
window.makeMove = function(index) {
    // Call the original function
    originalMakeMove(index);
    
    // Only check for score updates if it's a local game
    if (!currentGame.isOnline) {
        // Check if we need to update the score after a short delay
        // This ensures the game status has been updated
        setTimeout(checkAndUpdateScore, 100);
    }
};

// Override the resetGame function to reset the score tracking
const originalResetGame = window.resetGame;
window.resetGame = function() {
    // Call the original function
    originalResetGame();
    
    // Reset the score recorded flag
    scoreRecorded = false;
};

// Override the exitGame function to reset the score tracking and scores
const originalExitGame = window.exitGame;
window.exitGame = function() {
    // Call the original function
    originalExitGame();
    
    // Reset the score recorded flag
    scoreRecorded = false;
    
    // Reset the scores
    resetScores();
}; 