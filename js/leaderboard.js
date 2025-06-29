// Leaderboard functionality
function loadLeaderboard() {
    // Show loading state
    const leaderboardBody = document.getElementById('leaderboardBody');
    leaderboardBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Loading leaderboard...</td></tr>';
    
    // Add loading animation to the refresh button
    const refreshButton = document.querySelector('button[onclick="loadLeaderboard()"]');
    if (refreshButton) {
        const refreshIcon = refreshButton.querySelector('.refresh-icon');
        if (refreshIcon) {
            refreshIcon.style.animation = 'spin 1s linear infinite';
        }
        refreshButton.disabled = true;
    }

    // Disable bottom navigation while loading
    const bottomNavButtons = document.querySelectorAll('.mobile-navbar button');
    bottomNavButtons.forEach(button => {
        button.disabled = true;
        button.classList.add('opacity-50', 'cursor-not-allowed');
    });

    // Hide the winner animation by default
    const winnerAnimation = document.getElementById('top3WinnerAnimation');
    if (winnerAnimation) {
        winnerAnimation.classList.add('hidden');
    }

    // Fetch all users and their stats
    database.ref('users').once('value', async (snapshot) => {
        const users = snapshot.val();
        if (!users) {
            leaderboardBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No players found</td></tr>';
            stopLoadingAnimation();
            return;
        }

        // Convert users object to array and filter out users without stats
        // Also filter out any legacy users who might have isDeleted/pendingDeletion flags
        const userArray = Object.entries(users)
            .map(([uid, userData]) => ({
                uid,
                username: userData.username || 'Anonymous',
                stats: userData.stats || { totalScore: 0, wins: 0 },
                isDeleted: userData.isDeleted || false,
                potentiallyOrphaned: userData.potentiallyOrphaned || false,
                pendingDeletion: userData.pendingDeletion || false,
                isVerified: userData.isVerified || false,
                rank: userData.rank || getUserRank(userData.stats?.totalScore || 0)
            }))
            .filter(user => 
                // Only include users with stats
                (user.stats.totalScore > 0 || user.stats.wins > 0) && 
                // And exclude users with any deletion flags (for backward compatibility)
                !user.isDeleted && 
                !user.potentiallyOrphaned &&
                !user.pendingDeletion
            );

        // Sort users by total score (descending)
        userArray.sort((a, b) => b.stats.totalScore - a.stats.totalScore);

        // Take only top 10 players
        const top10Players = userArray.slice(0, 10);

        // Check if current user is in top 3
        if (auth.currentUser) {
            const userRank = userArray.findIndex(user => user.uid === auth.currentUser.uid) + 1;
            if (userRank > 0 && userRank <= 3) {
                const winnerAnimation = document.getElementById('top3WinnerAnimation');
                const top3Message = document.getElementById('top3Message');
                if (winnerAnimation && top3Message) {
                    winnerAnimation.classList.remove('hidden');
                    top3Message.textContent = `You are ranked #${userRank} in the leaderboard!`;
                }
            }
        }

        // Clear and populate the leaderboard
        leaderboardBody.innerHTML = '';
        
        // Update table header to include Rank column
        const leaderboardTable = document.querySelector('#leaderboardBody').closest('table');
        if (leaderboardTable) {
            const headerRow = leaderboardTable.querySelector('thead tr');
            if (headerRow && headerRow.children.length < 5) {
                // Only add the Rank column if it doesn't already exist
                headerRow.innerHTML = `
                    <th class="px-6 py-4 text-left text-sm font-semibold text-gray-600">Rank</th>
                    <th class="px-6 py-4 text-left text-sm font-semibold text-gray-600">Username</th>
                    <th class="px-6 py-4 text-left text-sm font-semibold text-gray-600">Points</th>
                    <th class="px-6 py-4 text-left text-sm font-semibold text-gray-600">Wins</th>
                    <th class="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tier</th>
                `;
            }
        }
        
        top10Players.forEach((user, index) => {
            const row = document.createElement('tr');
            // Default row styling
            row.className = index % 2 === 0 
                ? '' 
                : '';
            
            // Special styling for logged-in user's row
            if (auth.currentUser && user.uid === auth.currentUser.uid) {
                row.classList.remove('bg-white', 'bg-indigo-50', 'hover:bg-indigo-50', 'hover:bg-indigo-100');
                row.classList.add('bg-gradient-to-r', 'from-blue-50', 'to-indigo-50', 'hover:from-blue-100', 'hover:to-indigo-100');
                row.style.borderLeft = '4px solid #4F46E5';
            }
            
            const verifiedIcon = user.isVerified ? '<span class="verified-icon" title="Verified Account">✓</span>' : '';
            const rankIcon = getRankIcon(user.rank);
            
            row.innerHTML = `
                <td class="px-6 py-4 text-sm font-medium text-indigo-900">${index + 1}</td>
                <td class="px-6 py-4 text-sm text-indigo-800">${user.username}${verifiedIcon}</td>
                <td class="px-6 py-4 text-sm font-semibold text-indigo-600">${user.stats.totalScore || 0}</td>
                <td class="px-6 py-4 text-sm font-semibold text-green-600">${user.stats.wins || 0}</td>
                <td class="px-6 py-4 text-sm font-semibold text-purple-600">
                    <span class="px-2 py-1 rounded bg-gradient-to-r ${getRankColor(user.rank)} text-xl" title="${user.rank}">${rankIcon}</span>
                </td>
            `;
            leaderboardBody.appendChild(row);
        });

        if (top10Players.length === 0) {
            leaderboardBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-indigo-500">No players found</td></tr>';
        }
        
        // Stop loading animation
        stopLoadingAnimation();
    }).catch(error => {
        console.error('Error loading leaderboard:', error);
        leaderboardBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">Error loading leaderboard</td></tr>';
        stopLoadingAnimation();
    });
}

// Function to determine player's rank based on points
function getUserRank(points) {
    if (points >= 501) return "Grandmaster";
    if (points >= 301) return "Master";
    if (points >= 151) return "Expert";
    if (points >= 51) return "Apprentice";
    return "Novice";
}

// Function to get the appropriate color gradient for each rank
function getRankColor(rank) {
    switch(rank) {
        case 'Grandmaster':
            return 'from-red-500 to-orange-500 text-white';
        case 'Master':
            return 'from-purple-500 to-indigo-500 text-white';
        case 'Expert':
            return 'from-blue-500 to-cyan-500 text-white';
        case 'Apprentice':
            return 'from-green-500 to-teal-500 text-white';
        case 'Novice':
        default:
            return 'from-gray-500 to-gray-400 text-white';
    }
}

// Function to get the appropriate icon for each rank
function getRankIcon(rank) {
    switch(rank) {
        case 'Grandmaster':
            return '👑';
        case 'Master':
            return '🏆';
        case 'Expert':
            return '⭐';
        case 'Apprentice':
            return '🥉';
        case 'Novice':
        default:
            return '🎮';
    }
}

// Helper function to stop loading animation
function stopLoadingAnimation() {
    const refreshButton = document.querySelector('button[onclick="loadLeaderboard()"]');
    if (refreshButton) {
        const refreshIcon = refreshButton.querySelector('.refresh-icon');
        if (refreshIcon) {
            refreshIcon.style.animation = '';
        }
        refreshButton.disabled = false;
    }

    // Re-enable bottom navigation
    const bottomNavButtons = document.querySelectorAll('.mobile-navbar button');
    bottomNavButtons.forEach(button => {
        button.disabled = false;
        button.classList.remove('opacity-50', 'cursor-not-allowed');
    });
}

// Load leaderboard when game modes section is shown
const originalShowGameModes = window.showGameModes;
window.showGameModes = function() {
    if (originalShowGameModes) {
        originalShowGameModes();
    } else {
        // If originalShowGameModes is not defined yet, just show the section
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('gameModesSection').classList.remove('hidden');
        document.getElementById('onlinePlayersSection').classList.add('hidden');
        document.getElementById('gameSection').classList.add('hidden');
    }
    
    // Always load the leaderboard when showing game modes section
    loadLeaderboard();
};

// Load leaderboard when the page loads if the user is already authenticated
document.addEventListener('DOMContentLoaded', () => {
    // Check if the game modes section is visible
    if (!document.getElementById('gameModesSection').classList.contains('hidden')) {
        loadLeaderboard();
    }
    
    // Also listen for auth state changes to load leaderboard when user logs in
    firebase.auth().onAuthStateChanged((user) => {
        if (user && !document.getElementById('gameModesSection').classList.contains('hidden')) {
            loadLeaderboard();
        }
    });
});