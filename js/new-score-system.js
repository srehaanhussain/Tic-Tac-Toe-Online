// New Score System
const scoreSystem = {
    // Current game stats
    currentGame: {
        moves: 0,
        time: 0,
        streak: 0
    },
    
    // Overall stats
    stats: {
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        bestStreak: 0,
        achievements: []
    },
    
    // Flag to track if score has been updated for current game
    scoreUpdated: false,
    
    // Points configuration
    pointsConfig: {
        win: 10,
        loss: -5,
        draw: 2,
        quickWin: 5, // Bonus for winning in less than 10 moves
        streakBonus: 2 // Points per streak level
    },
    
    // Initialize the score system
    initialize() {
        const savedStats = localStorage.getItem('gameStats');
        if (savedStats) {
            this.stats = JSON.parse(savedStats);
        }
        this.scoreUpdated = false; // Reset the flag when initializing
        this.updateDisplay();
    },
    
    // Update score when a game ends
    updateScore(result, moves, time) {
        // If score already updated for this game, don't update again
        if (this.scoreUpdated) {
            console.log('Score already updated for this game, skipping update');
            return;
        }
        
        console.log('updateScore called with result:', result);
        console.log('Current stats before update:', JSON.stringify(this.stats));
        
        this.stats.totalGames++;
        this.currentGame.moves = moves;
        this.currentGame.time = time;
        
        // Update basic stats
        if (result === 'win') {
            this.stats.wins++;
            this.currentGame.streak++;
            this.stats.bestStreak = Math.max(this.stats.bestStreak, this.currentGame.streak);
            
            // Calculate points
            let points = this.pointsConfig.win;
            
            // Quick win bonus
            if (moves < 10) {
                points += this.pointsConfig.quickWin;
            }
            
            // Streak bonus
            points += this.currentGame.streak * this.pointsConfig.streakBonus;
            
            this.stats.points += points;
            
            // Check for achievements
            this.checkAchievements('win', moves, time);
        } else if (result === 'loss') {
            this.stats.losses++;
            this.currentGame.streak = 0;
            this.stats.points += this.pointsConfig.loss;
        } else if (result === 'draw') {
            this.stats.draws++;
            this.stats.points += this.pointsConfig.draw;
        }
        
        // Mark score as updated for this game
        this.scoreUpdated = true;
        
        console.log('Final stats after update:', JSON.stringify(this.stats));
        
        // Save to localStorage
        this.saveStats();
        
        // Update the display
        this.updateDisplay();
    },
    
    // Check for achievements
    checkAchievements(result, moves, time) {
        const newAchievements = [];
        
        // First win achievement
        if (this.stats.wins === 1) {
            newAchievements.push({
                id: 'first_win',
                title: 'First Victory',
                description: 'Win your first game',
                points: 5
            });
        }
        
        // Streak achievements
        if (this.currentGame.streak === 3) {
            newAchievements.push({
                id: 'streak_3',
                title: 'On Fire!',
                description: 'Win 3 games in a row',
                points: 10
            });
        }
        
        // Quick win achievement
        if (moves < 10) {
            newAchievements.push({
                id: 'quick_win',
                title: 'Speed Demon',
                description: 'Win a game in less than 10 moves',
                points: 5
            });
        }
        
        // Add new achievements
        newAchievements.forEach(achievement => {
            if (!this.stats.achievements.find(a => a.id === achievement.id)) {
                this.stats.achievements.push(achievement);
                this.stats.points += achievement.points;
            }
        });
    },
    
    // Reset all scores
    resetScores() {
        this.stats = {
            totalGames: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            points: 0,
            bestStreak: 0,
            achievements: []
        };
        this.currentGame.streak = 0;
        this.scoreUpdated = false;
        this.saveStats();
        this.updateDisplay();
    },
    
    // Save stats to localStorage
    saveStats() {
        localStorage.setItem('gameStats', JSON.stringify(this.stats));
    },
    
    // Update the score display in the UI
    updateDisplay() {
        const scoreDisplay = document.getElementById('scoreDisplay');
        if (scoreDisplay) {
            scoreDisplay.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <span class="text-green-600 font-semibold">Wins:</span>
                    <span class="font-bold">${this.stats.wins}</span>
                </div>
                <div class="flex justify-between items-center mb-2">
                    <span class="text-red-600 font-semibold">Losses:</span>
                    <span class="font-bold">${this.stats.losses}</span>
                </div>
                <div class="flex justify-between items-center mb-2">
                    <span class="text-gray-600 font-semibold">Draws:</span>
                    <span class="font-bold">${this.stats.draws}</span>
                </div>
                <div class="flex justify-between items-center mb-2">
                    <span class="text-blue-600 font-semibold">Best Streak:</span>
                    <span class="font-bold">${this.stats.bestStreak}</span>
                </div>
                <div class="mt-4">
                    <h4 class="text-center font-semibold mb-2">Achievements</h4>
                    <div class="space-y-2">
                        ${this.stats.achievements.map(achievement => `
                            <div class="bg-indigo-50 p-2 rounded">
                                <div class="font-semibold">${achievement.title}</div>
                                <div class="text-sm text-indigo-600">${achievement.description}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }
};

// Initialize score system when the page loads
document.addEventListener('DOMContentLoaded', () => {
    scoreSystem.initialize();
}); 