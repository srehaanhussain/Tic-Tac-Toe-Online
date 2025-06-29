// Profile functionality
let currentUser = null;

// Theme functionality
function initializeTheme() {
    // const themeToggle = document.getElementById('themeToggle');
    // const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Check for saved theme preference or use system preference
    // const savedTheme = localStorage.getItem('theme');
    // if (savedTheme === 'dark' || (!savedTheme && prefersDarkScheme.matches)) {
    //     document.body.classList.add('dark-mode');
    //     themeToggle.checked = false;
    // }
    
    // Listen for theme toggle changes
    // themeToggle.addEventListener('change', () => {
    //     if (themeToggle.checked) {
    //         document.body.classList.add('dark-mode');
    //         localStorage.setItem('theme', 'dark');
    //     } else {
    //         document.body.classList.remove('dark-mode');
    //         localStorage.setItem('theme', 'light');
    //     }
    // });
    
    // Listen for system theme changes
    // prefersDarkScheme.addEventListener('change', (e) => {
    //     if (!localStorage.getItem('theme')) {
    //         if (e.matches) {
    //             document.body.classList.add('dark-mode');
    //             themeToggle.checked = true;
    //         } else {
    //             document.body.classList.remove('dark-mode');
    //             themeToggle.checked = false;
    //         }
    //     }
    // });
}

// Generate and share user stats as an image
function shareUserStats() {
    if (!currentUser) return;
    
    // Show loading notification
    showNotification('Generating stats image...');
    
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions with higher resolution for better quality
    canvas.width = 1200;
    canvas.height = 900;
    
    // Get user data
    database.ref(`users/${currentUser.uid}`).once('value')
        .then(snapshot => {
            const userData = snapshot.val() || {};
            const stats = userData.stats || {};
            const userPoints = stats.totalScore || 0;
            const userRank = userData.rank || getUserRank(userPoints);
            const rankIcon = getRankIcon(userRank);
            const displayName = currentUser.displayName || currentUser.email.split('@')[0];
            
            // Fill background with more attractive gradient
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#4F46E5');
            gradient.addColorStop(1, '#7C3AED');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add small "Generated from" text at the top
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.font = '14px Inter, sans-serif';
            ctx.fillText('Generated from Tic Tac Toe Game | game-tac-toe.netlify.app', canvas.width / 2, 25);
            
            // Add decorative elements
            // Top right corner decoration
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.arc(canvas.width - 100, 100, 300, 0, Math.PI * 2);
            ctx.fill();
            
            // Bottom left decoration
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.beginPath();
            ctx.arc(100, canvas.height - 100, 400, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw game logo
            // Create X and O icons with proper positioning
            const logoY = 120;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = 'bold 80px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('X', canvas.width / 2 - 50, logoY);
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.arc(canvas.width / 2 + 50, logoY - 25, 40, 0, Math.PI * 2);
            ctx.stroke();
            
            // Add title with proper spacing
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 60px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Tic Tac Toe - Player Stats', canvas.width / 2, logoY + 100);
            
            // Draw player name with fancy background
            const nameY = logoY + 180;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            roundedRect(ctx, canvas.width / 2 - 300, nameY - 40, 600, 80, 15);
            ctx.fill();
            
            // Draw player name text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 40px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`Player: ${displayName}`, canvas.width / 2, nameY + 15);
            
            // Draw rank badge at top right
            ctx.save();
            const badgeWidth = 180;
            const badgeHeight = 60;
            const badgeX = canvas.width - badgeWidth - 40;
            const badgeY = 40;
            ctx.globalAlpha = 0.92;
            ctx.fillStyle = 'rgba(79,70,229,0.95)'; // Indigo background
            ctx.strokeStyle = 'rgba(124,58,237,0.8)'; // Purple border
            ctx.lineWidth = 3;
            roundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 18);
            ctx.fill();
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.font = 'bold 28px Inter, sans-serif';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${rankIcon} ${userRank}`, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
            ctx.restore();
            
            // Calculate proper spacing for stats based on canvas height
            const statsStartY = nameY + 120; // Increased spacing by 20px for better layout
            const statsSpacing = 110;
            const statItems = [
                { label: 'Games Played', value: stats.gamesPlayed || 0, icon: '🎮' },
                { label: 'Wins', value: stats.wins || 0, icon: '🏆' },
                { label: 'Losses', value: stats.losses || 0, icon: '❌' },
                { label: 'Draws', value: stats.draws || 0, icon: '🤝' },
                { label: 'Win Rate', value: stats.gamesPlayed ? `${Math.round((stats.wins / stats.gamesPlayed) * 100)}%` : '0%', icon: '📊' },
                { label: 'Highest Score', value: stats.highestScore || 0, icon: '🔥' }
            ];
            
            // Calculate total height needed for stats
            const totalStatsHeight = statItems.length * statsSpacing;
            
            // Draw each stat with proper spacing
            let yPos = statsStartY;
            statItems.forEach((stat, index) => {
                // Draw stat background with glass effect
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
                
                const rectWidth = 800;
                const rectHeight = 80;
                const rectX = canvas.width / 2 - rectWidth / 2;
                const rectY = yPos - rectHeight / 2;
                const radius = 15;
                
                roundedRect(ctx, rectX, rectY, rectWidth, rectHeight, radius);
                ctx.fill();
                ctx.stroke();
                
                // Draw stat icon with proper alignment
                ctx.font = '36px Arial, sans-serif';
                ctx.fillStyle = '#FFFFFF';
                ctx.textAlign = 'left';
                ctx.fillText(stat.icon, rectX + 30, yPos + 10);
                
                // Draw stat text with proper spacing
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 36px Inter, sans-serif';
                ctx.fillText(stat.label, rectX + 100, yPos + 10);
                
                // Draw stat value
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '36px Inter, sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText(stat.value, rectX + rectWidth - 30, yPos + 10);
                
                // Move to next stat position
                yPos += statsSpacing;
            });
            
            // Add decorative corners
            const cornerSize = 30;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 3;
            
            // Top-left corner
            ctx.beginPath();
            ctx.moveTo(30, 30);
            ctx.lineTo(30, 30 + cornerSize);
            ctx.moveTo(30, 30);
            ctx.lineTo(30 + cornerSize, 30);
            ctx.stroke();
            
            // Top-right corner
            ctx.beginPath();
            ctx.moveTo(canvas.width - 30, 30);
            ctx.lineTo(canvas.width - 30, 30 + cornerSize);
            ctx.moveTo(canvas.width - 30, 30);
            ctx.lineTo(canvas.width - 30 - cornerSize, 30);
            ctx.stroke();
            
            // Bottom-left corner
            ctx.beginPath();
            ctx.moveTo(30, canvas.height - 30);
            ctx.lineTo(30, canvas.height - 30 - cornerSize);
            ctx.moveTo(30, canvas.height - 30);
            ctx.lineTo(30 + cornerSize, canvas.height - 30);
            ctx.stroke();
            
            // Bottom-right corner
            ctx.beginPath();
            ctx.moveTo(canvas.width - 30, canvas.height - 30);
            ctx.lineTo(canvas.width - 30, canvas.height - 30 - cornerSize);
            ctx.moveTo(canvas.width - 30, canvas.height - 30);
            ctx.lineTo(canvas.width - 30 - cornerSize, canvas.height - 30);
            ctx.stroke();
            
            // Convert the canvas to a data URL and share
            const dataUrl = canvas.toDataURL('image/png');
            
            // Always use the fallback method to show the download option
            shareImageFallback(dataUrl);
        })
        .catch(error => {
            console.error('Error generating stats image:', error);
            showNotification('Error generating stats image. Please try again.');
        });
}

// Helper function for drawing rounded rectangles
function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// Fallback method for sharing stats image
function shareImageFallback(dataUrl) {
    // Create a temporary link to download the image
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'tic-tac-toe-stats.png';
    
    // Create a modal to show the image with download and copy options
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    modal.onclick = (e) => {
        if (e.target === modal) document.body.removeChild(modal);
    };
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'bg-white rounded-2xl p-6 max-w-lg w-full mx-4 glass-effect';
    
    // Add header
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-4';
    header.innerHTML = `
        <h3 class="text-xl font-semibold text-gray-800">Your Tic Tac Toe Stats</h3>
        <button class="text-gray-500 hover:text-gray-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
    `;
    header.querySelector('button').onclick = () => document.body.removeChild(modal);
    
    // Add image
    const img = document.createElement('img');
    img.src = dataUrl;
    img.className = 'w-full h-auto rounded-lg mb-4 border border-gray-200';
    
    // Add buttons
    const buttons = document.createElement('div');
    buttons.className = 'grid grid-cols-2 gap-3';
    buttons.innerHTML = `
        <button class="btn-primary text-white p-3 rounded-xl text-sm font-semibold transition-all hover:scale-105">
            <span class="flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Image
            </span>
        </button>
        <button class="btn-secondary text-gray-700 p-3 rounded-xl text-sm font-semibold transition-all hover:scale-105">
            <span class="flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share Image
            </span>
        </button>
        <button class="col-span-2 btn-secondary text-gray-700 p-3 rounded-xl text-sm font-semibold transition-all hover:scale-105">
            <span class="flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy to Clipboard
            </span>
        </button>
    `;
    
    // Download button
    buttons.querySelector('.btn-primary').onclick = () => {
        link.click();
        showNotification('Stats image downloaded');
    };
    
    // Share button
    buttons.querySelectorAll('button')[1].onclick = () => {
        // Check if the Web Share API supports sharing files
        if (navigator.share && navigator.canShare) {
            // Create a blob from the data URL
            fetch(dataUrl)
                .then(res => res.blob())
                .then(blob => {
                    // Create a file from the blob
                    const file = new File([blob], 'tic-tac-toe-stats.png', { type: 'image/png' });
                    
                    // Check if this file can be shared
                    const shareData = {
                        title: 'My Tic Tac Toe Stats',
                        text: `Check out my Tic Tac Toe stats!`,
                        files: [file]
                    };
                    
                    if (navigator.canShare(shareData)) {
                        navigator.share(shareData)
                            .then(() => showNotification('Stats shared successfully!'))
                            .catch(error => {
                                console.error('Error sharing stats:', error);
                                showNotification('Unable to share. The image has been downloaded instead.');
                                link.click();
                            });
                    } else {
                        showNotification('Sharing not supported on this device. The image has been downloaded instead.');
                        link.click();
                    }
                });
        } else {
            showNotification('Sharing not supported on this device. The image has been downloaded instead.');
            link.click();
        }
    };
    
    // Copy button
    buttons.querySelector('.col-span-2').onclick = () => {
        // Create a canvas element from the img
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.naturalWidth;
        tempCanvas.height = img.naturalHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);
        
        // Check if ClipboardItem API is supported
        if (window.ClipboardItem) {
            // Convert canvas to blob
            tempCanvas.toBlob(blob => {
                // Copy to clipboard
                const item = new ClipboardItem({ 'image/png': blob });
                navigator.clipboard.write([item])
                    .then(() => showNotification('Stats image copied to clipboard'))
                    .catch(error => {
                        console.error('Error copying to clipboard:', error);
                        showNotification('Error copying to clipboard. Try downloading instead.');
                    });
            });
        } else {
            // Fallback for browsers that don't support ClipboardItem
            showNotification('Copying image to clipboard not supported in this browser. Image downloaded instead.');
            link.click();
        }
    };
    
    // Add all elements to modal
    modalContent.appendChild(header);
    modalContent.appendChild(img);
    modalContent.appendChild(buttons);
    modal.appendChild(modalContent);
    
    // Add modal to body
    document.body.appendChild(modal);
}

// Show only profile section
function showProfileSection() {
    // Hide all sections
    const sections = [
        'authSection',
        'gameModesSection',
        'onlinePlayersSection',
        'gameSection',
        'contactSection'
    ];
    
    sections.forEach(sectionId => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.classList.add('hidden');
        }
    });
    
    // Show only the profile section
    const profileSection = document.getElementById('userAccountSection');
    profileSection.classList.remove('hidden');
    
    // Update navigation state
    currentSection = 'profile';
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector('[data-section="profile"]').classList.add('active');
}

// Initialize profile section
function initializeProfile() {
    initializeTheme();
    showProfileSection(); // Call this to ensure only profile is shown
}

// Reset user stats
async function resetUserStats() {
    if (!currentUser) return;
    
    // Show custom confirmation dialog
    customAlert.confirm(
        'Are you sure you want to reset your stats? This action cannot be undone.',
        async () => {
            try {
                const userRef = database.ref(`users/${currentUser.uid}/stats`);
                await userRef.set({
                    gamesPlayed: 0,
                    wins: 0,
                    losses: 0,
                    draws: 0,
                    totalScore: 0,
                    highestScore: 0,
                    averageScore: 0
                });
                
                // Refresh the profile UI to show reset stats
                updateProfileUI(currentUser);
                showNotification('Stats have been reset successfully');
            } catch (error) {
                console.error('Error resetting user stats:', error);
                showNotification('Error resetting stats. Please try again.');
            }
        },
        () => {
            // User cancelled the reset
            showNotification('Stats reset cancelled');
        }
    );
}

// Update user stats
async function updateUserStats(statsUpdate) {
    if (!currentUser) return;
    
    try {
        const userRef = database.ref(`users/${currentUser.uid}`);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val() || {};
        const currentStats = userData.stats || {};
        
        // Update stats with new values
        const updatedStats = {
            ...currentStats,
            ...statsUpdate
        };
        
        // Calculate average score
        if (updatedStats.gamesPlayed > 0) {
            updatedStats.averageScore = updatedStats.totalScore / updatedStats.gamesPlayed;
        }
        
        // Determine user's rank based on total score
        const userRank = getUserRank(updatedStats.totalScore || 0);
        
        // Update both stats and rank
        await userRef.update({
            stats: updatedStats,
            rank: userRank
        });
        
        // Check if rank has changed and show notification if needed
        if (userData.rank && userData.rank !== userRank) {
            showNotification(`Rank Up! You are now a ${userRank}!`);
            
            // Create rank achievement notification
            await createRankAchievementNotification(userRank);
        }
        
        return updatedStats;
    } catch (error) {
        console.error('Error updating user stats:', error);
        throw error;
    }
}

// Function to create a rank achievement notification
async function createRankAchievementNotification(rank) {
    if (!currentUser) return;
    
    try {
        const notificationsRef = database.ref(`notifications/${currentUser.uid}`);
        
        // Create a unique notification for this rank
        const notificationRef = notificationsRef.push();
        await notificationRef.set({
            type: 'achievement',
            title: `🏆 Achievement Unlocked: ${rank} Rank!`,
            message: `Congratulations! You have reached the ${rank} rank. Your dedication and skill have been recognized! Keep playing to achieve even higher ranks!`,
            read: false,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            icon: getRankIcon(rank),
            achievementType: 'rank',
            rank: rank
        });

        // Show a special achievement notification toast
        if (window.customAlert) {
            window.customAlert.success(
                `<div class="achievement-notification">
                    <div class="achievement-icon">${getRankIcon(rank)}</div>
                    <div class="achievement-content">
                        <h3>Rank Up! 🎉</h3>
                        <p>You've reached the ${rank} rank!</p>
                    </div>
                </div>`,
                {
                    title: 'Achievement Unlocked!',
                    autoClose: true,
                    duration: 5000,
                    isHTML: true
                }
            );
        }
    } catch (error) {
        console.error('Error creating rank achievement notification:', error);
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

// Share App functionality
function shareApp() {
    // Prepare the data to be shared
    const shareData = {
        title: 'Tic Tac Toe Game',
        text: 'Play Tic Tac Toe online for free! Challenge friends in multiplayer mode or play against AI.',
        url: window.location.href
    };

    // Check if the Web Share API is supported by the browser
    // This API is available in most modern browsers on mobile devices
    if (navigator.share) {
        navigator.share(shareData)
            .then(() => {
                showNotification('Thanks for sharing!');
            })
            .catch(error => {
                console.error('Error sharing:', error);
                // If sharing fails, fall back to clipboard copy
                fallbackShare();
            });
    } else {
        // For browsers that don't support Web Share API (mainly desktop)
        fallbackShare();
    }
}

// Fallback sharing method for browsers that don't support Web Share API
function fallbackShare() {
    // Create a temporary input to copy the URL
    const input = document.createElement('input');
    input.style.position = 'fixed';
    input.style.opacity = 0;
    input.value = window.location.href;
    document.body.appendChild(input);

    // Select and copy the URL
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);

    // Show a notification to the user that the URL was copied
    showNotification('Game URL copied to clipboard. Share it with your friends!');
}

// Navigate to game modes
function navigateToGameModes() {
    // Use the main navigation function to ensure URL hash is updated
    navigateTo('game', true);
}

// Function to determine player's rank based on points
function getUserRank(points) {
    if (points >= 501) return "Grandmaster";
    if (points >= 301) return "Master";
    if (points >= 151) return "Expert";
    if (points >= 51) return "Apprentice";
    return "Novice";
}

// Calculate progress to next rank
function calculateRankProgress(points) {
    const ranks = [
        { name: 'Novice', minPoints: 0 },
        { name: 'Apprentice', minPoints: 51 },
        { name: 'Expert', minPoints: 151 },
        { name: 'Master', minPoints: 301 },
        { name: 'Grandmaster', minPoints: 501 }
    ];
    
    // Find current rank and next rank
    let currentRank = ranks[0];
    let nextRank = ranks[1];
    
    for (let i = 0; i < ranks.length - 1; i++) {
        if (points >= ranks[i].minPoints && points < ranks[i + 1].minPoints) {
            currentRank = ranks[i];
            nextRank = ranks[i + 1];
            break;
        }
    }
    
    // If at highest rank, return 100% progress
    if (points >= ranks[ranks.length - 1].minPoints) {
        return {
            currentRank: ranks[ranks.length - 1].name,
            nextRank: null,
            progress: 100,
            pointsNeeded: 0
        };
    }
    
    // Calculate progress percentage
    const pointsInCurrentRank = points - currentRank.minPoints;
    const pointsNeededForNextRank = nextRank.minPoints - currentRank.minPoints;
    const progress = (pointsInCurrentRank / pointsNeededForNextRank) * 100;
    
    return {
        currentRank: currentRank.name,
        nextRank: nextRank.name,
        progress: Math.min(Math.round(progress), 100),
        pointsNeeded: nextRank.minPoints - points
    };
}

// Update profile UI with user data
async function updateProfileUI(user) {
    currentUser = user;
    const userAccountSection = document.getElementById('userAccountSection');
    const profileAvatar = document.getElementById('profileAvatar');
    const dropdownUserName = document.getElementById('dropdownUserName');
    const dropdownUserEmail = document.getElementById('dropdownUserEmail');
    const statsContainer = document.getElementById('userStats');
    const verificationInfoSection = document.querySelector('.mb-6.p-4.bg-indigo-50.rounded-xl');

    if (user) {
        // Show user account section
        userAccountSection.classList.remove('hidden');
        
        // Get first letter of username for avatar
        const firstLetter = user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase();
        
        // Update UI elements
        profileAvatar.textContent = firstLetter;
        
        // Get additional user data including verification status
        try {
            // Check if user should be verified based on win count
            await checkUserVerificationStatus(user.uid);
            
            // Get the latest user data (after potential verification update)
            const userSnapshot = await database.ref(`users/${user.uid}`).once('value');
            const userData = userSnapshot.val() || {};
            
            // Set username and email
            dropdownUserName.innerHTML = '';
            const displayName = user.displayName || user.email.split('@')[0];
            dropdownUserName.textContent = displayName;
            
            // Add verification badge if user is verified
            if (userData.isVerified) {
                const verifiedIcon = document.createElement('span');
                verifiedIcon.className = 'verified-icon-tooltip ml-1';
                
                const icon = document.createElement('span');
                icon.className = 'verified-icon';
                icon.textContent = '✓';
                
                const tooltip = document.createElement('span');
                tooltip.className = 'tooltip-text';
                tooltip.textContent = 'Verified account: Your account has been verified for authenticity and security.';
                
                verifiedIcon.appendChild(icon);
                verifiedIcon.appendChild(tooltip);
                dropdownUserName.appendChild(verifiedIcon);
                
                // Hide verification info section if user is already verified
                if (verificationInfoSection) {
                    verificationInfoSection.style.display = 'none';
                }
            } else {
                // Show verification info section if user is not verified
                if (verificationInfoSection) {
                    verificationInfoSection.style.display = 'block';
                }
            }
            
            dropdownUserEmail.textContent = user.email;
            
            // Load and display user stats
            const stats = userData.stats || {};
            const userPoints = stats.totalScore || 0;
            const userRank = getUserRank(userPoints);
            const rankIcon = getRankIcon(userRank);
            
            // Calculate rank progress
            const rankProgress = calculateRankProgress(userPoints);
            
            // Save rank in the database
            await database.ref(`users/${user.uid}/rank`).set(userRank);
            
            if (statsContainer) {
                statsContainer.innerHTML = `
                    <div class="stat-item p-4 mb-4 rounded-lg glass-effect bg-gradient-to-r from-indigo-50 to-purple-50">
                        <div class="flex items-center justify-between mb-2">
                            <div>
                                <span class="stat-label block text-sm text-gray-600 mb-1">Current Rank</span>
                                <span class="stat-value block text-xl font-bold text-indigo-700">${rankIcon} ${userRank}</span>
                            </div>
                            <div class="text-right">
                                <span class="stat-label block text-sm text-gray-600 mb-1">Points</span>
                                <span class="stat-value block text-lg font-semibold text-indigo-600">${userPoints}</span>
                            </div>
                        </div>
                        <div class="mt-3">
                            <div class="flex justify-between text-sm text-gray-600 mb-1">
                                <span>${rankProgress.currentRank}</span>
                                <span>${rankProgress.nextRank ? rankProgress.nextRank : 'Max Rank'}</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2.5">
                                <div class="bg-gradient-to-r from-indigo-600 to-purple-600 h-2.5 rounded-full" style="width: ${rankProgress.progress}%"></div>
                            </div>
                            ${rankProgress.nextRank ? `
                                <div class="text-xs text-gray-500 mt-1 text-right">
                                    ${rankProgress.pointsNeeded} points needed for ${rankProgress.nextRank}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="stat-item p-4 rounded-lg glass-effect">
                            <span class="stat-label block text-sm text-gray-600 mb-1">Games Played</span>
                            <span class="stat-value block text-lg font-semibold text-gray-800">${stats.gamesPlayed || 0}</span>
                        </div>
                        <div class="stat-item p-4 rounded-lg glass-effect">
                            <span class="stat-label block text-sm text-gray-600 mb-1">Wins</span>
                            <span class="stat-value block text-lg font-semibold text-gray-800">${stats.wins || 0}</span>
                        </div>
                        <div class="stat-item p-4 rounded-lg glass-effect">
                            <span class="stat-label block text-sm text-gray-600 mb-1">Losses</span>
                            <span class="stat-value block text-lg font-semibold text-gray-800">${stats.losses || 0}</span>
                        </div>
                        <div class="stat-item p-4 rounded-lg glass-effect">
                            <span class="stat-label block text-sm text-gray-600 mb-1">Draws</span>
                            <span class="stat-value block text-lg font-semibold text-gray-800">${stats.draws || 0}</span>
                        </div>
                        <div class="stat-item p-4 rounded-lg glass-effect">
                            <span class="stat-label block text-sm text-gray-600 mb-1">Highest Score</span>
                            <span class="stat-value block text-lg font-semibold text-gray-800">${stats.highestScore || 0}</span>
                        </div>
                        <div class="stat-item p-4 rounded-lg glass-effect">
                            <span class="stat-label block text-sm text-gray-600 mb-1">Average Score</span>
                            <span class="stat-value block text-lg font-semibold text-gray-800">${stats.averageScore ? stats.averageScore.toFixed(2) : 0}</span>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    } else {
        // Hide user account section
        userAccountSection.classList.add('hidden');
    }
}

// Initialize profile when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeProfile();
    
    // Check if user is already logged in
    firebase.auth().onAuthStateChanged((user) => {
        updateProfileUI(user);
    });
});

// Profile Management Functions
function showEditUsernameModal() {
    const modal = document.getElementById('usernameEditModal');
    const modalContent = document.getElementById('modalContent');
    const currentUser = firebase.auth().currentUser;
    const currentUsername = currentUser.displayName; // Get username from Firebase Auth
    const newUsernameInput = document.getElementById('newUsername');
    
    // Set current username and update length counter
    newUsernameInput.value = currentUsername;
    updateUsernameLength(currentUsername.length);
    
    // Show modal with animation
    modal.classList.remove('hidden');
    setTimeout(() => {
        modalContent.classList.remove('scale-95', 'opacity-0');
    }, 10);
    
    // Focus the input field
    newUsernameInput.focus();
}

function hideEditUsernameModal() {
    const modal = document.getElementById('usernameEditModal');
    const modalContent = document.getElementById('modalContent');
    
    // Hide with animation
    modalContent.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function handleModalClick(event) {
    const modal = document.getElementById('usernameEditModal');
    const modalContent = document.getElementById('modalContent');
    
    // If click is outside modal content, close modal
    if (event.target === modal) {
        hideEditUsernameModal();
    }
}

function updateUsernameLength(length) {
    const lengthDisplay = document.getElementById('usernameLength');
    lengthDisplay.textContent = `${length}/7`;
    if (length > 7) {
        lengthDisplay.classList.add('text-red-500');
    } else {
        lengthDisplay.classList.remove('text-red-500');
    }
}

function updateUsername() {
    const newUsername = document.getElementById('newUsername').value.trim();
    const currentUser = firebase.auth().currentUser;
    const currentUsername = currentUser.displayName;
    const saveButton = document.getElementById('saveUsernameBtn');
    const saveText = saveButton.querySelector('.save-text');
    const loadingSpinner = saveButton.querySelector('.loading-spinner');
    
    if (!newUsername) {
        showAlert('Please enter a valid username', 'error');
        return;
    }

    if (newUsername.length < 3) {
        showAlert('Username must be at least 3 characters long', 'error');
        return;
    }

    if (newUsername.length > 7) {
        showAlert('Username must be less than 7 characters long', 'error');
        return;
    }

    // Check if username contains any numbers
    if (/\d/.test(newUsername)) {
        showAlert('Username cannot contain numbers', 'error');
        return;
    }

    // Check for special characters
    if (/[!@#$%^&*()*\/\-_+=`~]/.test(newUsername)) {
        showAlert('Username cannot contain special characters', 'error');
        return;
    }

    // If username hasn't changed, no need to check or update
    if (newUsername === currentUsername) {
        hideEditUsernameModal();
        return;
    }

    // Show loading state
    saveText.classList.add('hidden');
    loadingSpinner.classList.remove('hidden');
    saveButton.disabled = true;

    // First check if username is already taken
    isUsernameTaken(newUsername)
        .then(taken => {
            if (taken) {
                throw new Error('Username is already taken (case-insensitive). Please choose another one.');
            }
            
            // If username is not taken, proceed with update
            return Promise.all([
                currentUser.updateProfile({
                    displayName: newUsername
                }),
                firebase.database().ref('users/' + currentUser.uid).update({
                    username: newUsername
                })
            ]);
        })
        .then(() => {
            // Update UI elements
            document.getElementById('dropdownUserName').textContent = newUsername;
            
            // Update username in all relevant places
            const usernameElements = document.querySelectorAll('.username-display');
            usernameElements.forEach(element => {
                element.textContent = newUsername;
            });

            // Update leaderboard if it's visible
            if (document.getElementById('leaderboardBody')) {
                loadLeaderboard();
            }

            hideEditUsernameModal();
            showAlert('Username updated successfully!', 'success');
        })
        .catch((error) => {
            showAlert(error.message, 'error');
        })
        .finally(() => {
            // Reset button state
            saveText.classList.remove('hidden');
            loadingSpinner.classList.add('hidden');
            saveButton.disabled = false;
        });
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    const newUsernameInput = document.getElementById('newUsername');
    if (newUsernameInput) {
        // Handle Enter key
        newUsernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                updateUsername();
            }
        });
        
        // Update length counter
        newUsernameInput.addEventListener('input', (e) => {
            updateUsernameLength(e.target.value.length);
            
            // Add debounced username availability check
            debounce(checkEditUsernameAvailability, 500)();
        });
    }

    // Handle Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !document.getElementById('usernameEditModal').classList.contains('hidden')) {
            hideEditUsernameModal();
        }
    });
});

// Debounce function to limit how often the availability check runs
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Function to check username availability in edit modal
async function checkEditUsernameAvailability() {
    const newUsernameInput = document.getElementById('newUsername');
    const username = newUsernameInput.value.trim();
    const currentUser = firebase.auth().currentUser;
    
    // Clear any previous styling
    newUsernameInput.classList.remove('border-red-500', 'border-green-500');
    
    // Don't check if username is too short or unchanged
    if (username.length < 3 || username === currentUser.displayName) {
        return;
    }
    
    try {
        const taken = await isUsernameTaken(username);
        if (taken) {
            newUsernameInput.classList.add('border-red-500');
            // No alert here
        } else {
            newUsernameInput.classList.add('border-green-500');
        }
    } catch (error) {
        console.error('Error checking username availability:', error);
    }
}

// Function to check if username is already taken
async function isUsernameTaken(username) {
    try {
        // Get the current user before making the database query
        const currentUser = firebase.auth().currentUser;
        
        // First check for exact match (case-sensitive)
        const snapshot = await firebase.database()
            .ref('users')
            .orderByChild('username')
            .equalTo(username)
            .once('value');
            
        // Check for case-insensitive matches
        const allUsersSnapshot = await firebase.database()
            .ref('users')
            .once('value');
            
        const allUsers = allUsersSnapshot.val() || {};
        const lowercaseUsername = username.toLowerCase();
        
        // Find any users with the same username (case-insensitive)
        const matchingUsers = Object.entries(allUsers).filter(([uid, userData]) => {
            // Skip the current user - their username doesn't count as "taken"
            if (currentUser && uid === currentUser.uid) {
                return false;
            }
            
            return userData.username && 
                   userData.username.toLowerCase() === lowercaseUsername &&
                   !userData.isDeleted && 
                   !userData.pendingDeletion && 
                   !userData.potentiallyOrphaned;
        });
        
        // If we have case-insensitive matches, username is taken
        if (matchingUsers.length > 0) {
            return true;
        }
            
        // If no users with this username, it's not taken
        if (!snapshot.exists()) {
            return false;
        }
        
        const users = snapshot.val();
        const userIds = Object.keys(users);
        
        // If there's only one user with this username and it's the current user, 
        // then the username is not taken by anyone else
        if (userIds.length === 1 && currentUser && userIds[0] === currentUser.uid) {
            return false;
        }
        
        // Check each user in the results to see if any are not the current user and are active
        for (const uid of userIds) {
            // Skip the current user - their username doesn't count as "taken"
            if (currentUser && uid === currentUser.uid) {
                continue;
            }
            
            const user = users[uid];
            // Check if this is an active user (not deleted and not orphaned)
            if (!user.potentiallyOrphaned && !user.isDeleted) {
                return true; // Username is taken by an active user
            }
        }
        
        // If we get here, all matches were either the current user, orphaned accounts, or deleted accounts
        return false;
    } catch (error) {
        console.error('Error checking username:', error);
        throw error;
    }
}

// Function to check if a user should be verified based on their win count
async function checkUserVerificationStatus(userId) {
    try {
        const userRef = database.ref(`users/${userId}`);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();
        
        if (!userData) return false;
        
        // If user is already verified, return true
        if (userData.isVerified) return true;
        
        // Check if user has 200 or more wins
        const stats = userData.stats || {};
        const wins = stats.wins || 0;
        
        // If user has 200 or more wins, update their verification status
        if (wins >= 200) {
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
            
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error checking user verification status:', error);
        return false;
    }
}