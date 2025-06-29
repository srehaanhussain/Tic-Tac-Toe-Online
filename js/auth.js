// Initialize Custom Alert
const customAlert = new CustomAlert();

// Helper function to show alerts
function showAlert(message, type = 'info') {
    customAlert.show(message, type, {
        autoClose: true,
        duration: 3000
    });
}

// UI Elements
const authSection = document.getElementById('authSection');
const gameModesSection = document.getElementById('gameModesSection');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const themeToggle = document.getElementById('themeToggle');

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.checked = true;
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

// Event Listeners
themeToggle.addEventListener('change', toggleTheme);

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', initializeTheme);

// Show/Hide Forms
function showLoginForm() {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
}

function showRegisterForm() {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
}

// Authentication Functions
async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showAlert('Please fill in all fields', 'error');
        return;
    }

    // Get the login button and disable it to prevent multiple clicks
    const loginButton = document.querySelector('#loginForm button[onclick="login()"]');
    if (loginButton.disabled) {
        return; // Prevent multiple login attempts
    }

    try {
        // Show loading state
        const originalText = loginButton.textContent;
        loginButton.innerHTML = '<span class="animate-spin mr-2">⌛</span> Logging in...';
        loginButton.disabled = true;

        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Check if user has a username in the database
        const userSnapshot = await firebase.database().ref('users/' + user.uid).once('value');
        const userData = userSnapshot.val();

        if (!userData || !userData.username) {
            // If no username is found, create a default one based on email
            const defaultUsername = email.split('@')[0].substring(0, 7); // Take first 7 chars of email
            await firebase.database().ref('users/' + user.uid).set({
                email: email,
                username: defaultUsername,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                status: 'offline',
                stats: {
                    gamesPlayed: 0,
                    wins: 0,
                    losses: 0,
                    totalScore: 0,
                    highestScore: 0,
                    averageScore: 0
                }
            });
            
            showAlert('Successfully logged in!', 'success');
            // Show game modes section directly
            document.getElementById('authSection').classList.add('hidden');
            document.getElementById('gameModesSection').classList.remove('hidden');
            currentSection = 'game';
            // Refresh the page after successful login
            window.location.reload();
            return;
        }

        // Clean up any stale game invites
        if (typeof cleanupStaleInvites === 'function') {
            cleanupStaleInvites();
        }

        // Show success message
        showAlert('Successfully logged in!', 'success');
        
        // Show game modes section directly
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('gameModesSection').classList.remove('hidden');
        currentSection = 'game';
        // Refresh the page after successful login
        window.location.reload();
        
    } catch (error) {
        showAlert(error.message, 'error');
        loginButton.textContent = 'Login';
        loginButton.disabled = false;
    }
}

// Function to confirm account deletion
function confirmDeleteAccount() {
    customAlert.show(
        'Are you sure you want to delete your account? This action cannot be undone. All your data, including game history and statistics, will be permanently deleted.',
        'warning',
        {
            title: 'Delete Account',
            autoClose: false,
            showConfirmButton: true,
            confirmButtonText: 'Delete Account',
            showCancel: true,
            cancelButtonText: 'Cancel',
            onConfirm: () => {
                deleteAccount();
            },
            onCancel: () => {
                // User cancelled the deletion - no action needed
            }
        }
    );
}

// Function to completely delete user account and all associated data
async function deleteAccount() {
    const user = auth.currentUser;
    if (!user) {
        showAlert('No user is currently signed in', 'error');
        return;
    }

    try {
        // Get user data before deletion for cleanup
        const userRef = firebase.database().ref('users/' + user.uid);
        const userSnapshot = await userRef.once('value');
        const userData = userSnapshot.val();
        const userId = user.uid; // Store user ID for later use
        
        // First, update user status to offline
        await userRef.update({
            status: 'offline',
            lastActive: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Delete any game data associated with the user
        const gamesSnapshot = await firebase.database().ref('games')
            .orderByChild('status')
            .equalTo('active')
            .once('value');
            
        if (gamesSnapshot.exists()) {
            const games = gamesSnapshot.val();
            const updates = {};
            
            for (const gameId in games) {
                const game = games[gameId];
                if (game.player1 === userId || game.player2 === userId) {
                    updates[`games/${gameId}`] = null;
                }
            }
            
            if (Object.keys(updates).length > 0) {
                await firebase.database().ref().update(updates);
            }
        }
        
        // Completely remove the user from the database BEFORE deleting authentication
        await userRef.remove();
        
        // Then delete the authentication account
        await user.delete();
        
        showAlert('Your account has been permanently deleted', 'success');
        showAuthSection();
        
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// Function to check if username is already taken
async function isUsernameTaken(username) {
    try {
        // First, check for exact match (case-sensitive)
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
        const matchingUsers = Object.entries(allUsers).filter(([_, userData]) => {
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
        
        // Check if there are any active users with this username
        const users = snapshot.val();
        const userIds = Object.keys(users);
        
        // If there are no users with this username, it's available
        if (userIds.length === 0) {
            return false;
        }
        
        // Handle legacy records: For accounts that have "isDeleted" or "pendingDeletion" flags
        // These may exist from previous versions of the app
        // Filter out deleted or orphaned accounts
        const actualUsers = userIds.filter(uid => {
            const user = users[uid];
            return !user.isDeleted && !user.pendingDeletion && !user.potentiallyOrphaned;
        });
        
        // If no actual users are left after filtering, the username is available
        if (actualUsers.length === 0) {
            return false;
        }
        
        // For any remaining orphaned data, mark for cleanup
        // This is for data that might have been left over if Firebase Auth deletion succeeded
        // but Realtime Database deletion failed
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const cleanupPromises = [];
        
        for (const uid of userIds) {
            const user = users[uid];
            if (!user.isDeleted && !user.pendingDeletion && !user.potentiallyOrphaned) {
                // Only consider active accounts that might be orphaned
                if (!user.lastActive || user.lastActive < thirtyDaysAgo) {
                    // Mark very old accounts as orphaned
                    cleanupPromises.push(
                        firebase.database().ref(`users/${uid}/potentiallyOrphaned`).set(true)
                    );
                }
            }
        }
        
        if (cleanupPromises.length > 0) {
            await Promise.all(cleanupPromises);
            
            // Re-check after cleanup
            const newSnapshot = await firebase.database()
                .ref('users')
                .orderByChild('username')
                .equalTo(username)
                .once('value');
                
            if (!newSnapshot.exists()) {
                return false;
            }
            
            const remainingUsers = newSnapshot.val() || {};
            const activeUsers = Object.entries(remainingUsers).filter(([_, userData]) => 
                !userData.potentiallyOrphaned && !userData.isDeleted && !userData.pendingDeletion
            );
            
            return activeUsers.length > 0;
        }
        
        // Username is taken by an active user
        return actualUsers.length > 0;
    } catch (error) {
        console.error('Error checking username:', error);
        throw error;
    }
}

function register() {
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const username = document.getElementById('username').value.trim();

    if (!email || !password || !username) {
        showAlert('Please fill in all fields', 'error');
        return;
    }

    if (username.length < 3) {
        showAlert('Username must be at least 3 characters long', 'error');
        return;
    }

    if (username.length > 7) {
        showAlert('Username must be less than 7 characters long', 'error');
        return;
    }

    // Check if username contains any numbers
    if (/\d/.test(username)) {
        showAlert('Username cannot contain numbers', 'error');
        return;
    }

    // Check for special characters
    if (/[!@#$%^&*()*\/\-_+=`~]/.test(username)) {
        showAlert('Username cannot contain special characters', 'error');
        return;
    }

    // Show loading state
    const registerButton = document.querySelector('#registerForm button[onclick="register()"]');
    const originalText = registerButton.textContent;
    registerButton.innerHTML = '<span class="animate-spin mr-2">⌛</span> Creating Account...';
    registerButton.disabled = true;

    // First check if username is taken
    isUsernameTaken(username)
        .then(taken => {
            if (taken) {
                throw new Error('Username is already taken (case-insensitive). Please choose another one.');
            }
            // If username is not taken, proceed with registration
            return firebase.auth().createUserWithEmailAndPassword(email, password);
        })
        .then((userCredential) => {
            const user = userCredential.user;
            
            // Update the user's display name
            return user.updateProfile({
                displayName: username
            }).then(() => {
                // Store additional user data in Realtime Database
                return firebase.database().ref('users/' + user.uid).set({
                    email: email,
                    username: username,
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    status: 'offline',
                    stats: {
                        gamesPlayed: 0,
                        wins: 0,
                        losses: 0,
                        totalScore: 0,
                        highestScore: 0,
                        averageScore: 0
                    }
                });
            });
        })
        .then(() => {
            showAlert('Successfully signed up!', 'success');
            // Show game modes section directly
            document.getElementById('authSection').classList.add('hidden');
            document.getElementById('gameModesSection').classList.remove('hidden');
            currentSection = 'game';
            // Refresh the page after successful registration
            window.location.reload();
        })
        .catch((error) => {
            showAlert(error.message, 'error');
        })
        .finally(() => {
            // Reset button state
            registerButton.textContent = originalText;
            registerButton.disabled = false;
        });
}

function logout() {
    customAlert.show(
        'Are you sure you want to logout?',
        'warning',
        {
            title: 'Logout',
            autoClose: false,
            showConfirmButton: true,
            confirmButtonText: 'Logout',
            showCancel: true,
            cancelButtonText: 'Cancel',
            onConfirm: () => {
                if (auth.currentUser) {
                    stopStatusCheck(); // Stop periodic status check
                    
                    // Set user status to offline before logging out
                    updateUserStatus(auth.currentUser.uid, 'offline')
                        .then(() => {
                            // Now perform the actual logout
                            return auth.signOut();
                        })
                        .then(() => {
                            showAuthSection();
                            // Refresh the page after logout
                            window.location.reload();
                        })
                        .catch((error) => {
                            console.error('Error during logout:', error);
                            alert(error.message);
                        });
                } else {
                    showAuthSection();
                    // Refresh the page even if no user was logged in
                    window.location.reload();
                }
            },
            onCancel: () => {
                // User cancelled the logout - no action needed
            }
        }
    );
}

// Section Navigation
function showAuthSection() {
    const sections = [
        'gameModesSection',
        'onlinePlayersSection',
        'gameSection',
        'userAccountSection'
    ];
    
    sections.forEach(sectionId => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.classList.add('hidden');
        }
    });
    
    const authSection = document.getElementById('authSection');
    authSection.classList.remove('hidden');
}

function showGameModes() {
    const sections = [
        'authSection',
        'onlinePlayersSection',
        'gameSection',
        'userAccountSection'
    ];
    
    sections.forEach(sectionId => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.classList.add('hidden');
        }
    });
    
    const gameModesSection = document.getElementById('gameModesSection');
    gameModesSection.classList.remove('hidden');
}

// Auth State Observer
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        const sections = [
            'authSection',
            'userAccountSection',
            'onlinePlayersSection',
            'gameSection'
        ];
        
        sections.forEach(sectionId => {
            const element = document.getElementById(sectionId);
            if (element) {
                element.classList.add('hidden');
                element.classList.remove('fade-in');
            }
        });
        
        const gameModesSection = document.getElementById('gameModesSection');
        gameModesSection.classList.remove('hidden');
        setTimeout(() => {
            gameModesSection.classList.add('fade-in');
        }, 50);
        
        // Update navigation state
        currentSection = 'game';
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector('[data-section="game"]').classList.add('active');
        
        // Update profile UI
        updateProfileUI(user);
        
        // Load the leaderboard
        if (typeof loadLeaderboard === 'function') {
            loadLeaderboard();
        }
    } else {
        // User is signed out
        const sections = [
            'gameModesSection',
            'userAccountSection',
            'onlinePlayersSection',
            'gameSection'
        ];
        
        sections.forEach(sectionId => {
            const element = document.getElementById(sectionId);
            if (element) {
                element.classList.add('hidden');
                element.classList.remove('fade-in');
            }
        });
        
        const authSection = document.getElementById('authSection');
        authSection.classList.remove('hidden');
        setTimeout(() => {
            authSection.classList.add('fade-in');
        }, 50);
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
    }
});

// Handle visibility change (tab switching/window minimization)
document.addEventListener('visibilitychange', () => {
    if (auth.currentUser) {
        if (document.hidden) {
            // User switched tabs or minimized window
            updateUserStatus(auth.currentUser.uid, 'offline')
                .then(() => {
                    // Check for any active games
                    return database.ref('games').orderByChild('status').equalTo('active').once('value');
                })
                .then((snapshot) => {
                    const games = snapshot.val();
                    if (games) {
                        const updates = {};
                        for (const gameId in games) {
                            const game = games[gameId];
                            if (game.player1 === auth.currentUser.uid || game.player2 === auth.currentUser.uid) {
                                updates[`games/${gameId}/status`] = 'abandoned';
                                updates[`games/${gameId}/abandonedBy`] = auth.currentUser.uid;
                                updates[`games/${gameId}/abandonedAt`] = Date.now();
                            }
                        }
                        if (Object.keys(updates).length > 0) {
                            return database.ref().update(updates);
                        }
                    }
                })
                .catch((error) => {
                    console.error('Error during tab switch:', error);
                });
        } else {
            // User returned to the tab
            updateUserStatus(auth.currentUser.uid, 'online')
                .catch((error) => {
                    console.error('Error updating status on tab return:', error);
                });
        }
    }
});

// Add periodic status check
let statusCheckInterval;

function startStatusCheck() {
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
    }
    
    statusCheckInterval = setInterval(() => {
        if (auth.currentUser && !document.hidden) {
            // Only update if user is authenticated and tab is visible
            updateUserStatus(auth.currentUser.uid, 'online')
                .catch((error) => {
                    console.error('Error in periodic status check:', error);
                });
        }
    }, 30000); // Check every 30 seconds
}

function stopStatusCheck() {
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        statusCheckInterval = null;
    }
}

// Update user status in database
function updateUserStatus(userId, status) {
    // Check if user is authenticated
    if (!auth.currentUser) {
        console.error('Cannot update status: User is not authenticated');
        return Promise.reject(new Error('User is not authenticated'));
    }
    
    // Check if userId matches the current user
    if (userId !== auth.currentUser.uid) {
        console.error(`Cannot update status: User ID ${userId} does not match current user ${auth.currentUser.uid}`);
        return Promise.reject(new Error("Cannot update another user's status"));
    }
    
    // Update the user's status
    return database.ref(`users/${userId}/status`).set(status)
        .then(() => {
            console.log(`Successfully updated user ${userId} status to ${status}`);
            
            // If setting to offline, also update lastActive timestamp
            if (status === 'offline') {
                return database.ref(`users/${userId}/lastActive`).set(Date.now());
            }
            
            // If setting to online, also update lastActive and clear any disconnect timers
            if (status === 'online') {
                return database.ref(`users/${userId}/lastActive`).set(Date.now())
                    .then(() => {
                        // Clear any existing disconnect timers
                        if (window.lastActiveInterval) {
                            clearInterval(window.lastActiveInterval);
                            window.lastActiveInterval = null;
                        }
                    });
            }
        })
        .catch((error) => {
            console.error(`Error updating user ${userId} status:`, error);
            throw error;
        });
}

// Handle user disconnect
window.addEventListener('beforeunload', (event) => {
    if (auth.currentUser) {
        // Update status to offline for all active games
        const userRef = database.ref(`users/${auth.currentUser.uid}`);
        
        // First update the user's status
        userRef.update({
            status: 'offline',
            lastActive: Date.now()
        }).then(() => {
            // Then check for any active games
            return database.ref('games').orderByChild('status').equalTo('active').once('value');
        }).then((snapshot) => {
            const games = snapshot.val();
            if (games) {
                const updates = {};
                for (const gameId in games) {
                    const game = games[gameId];
                    if (game.player1 === auth.currentUser.uid || game.player2 === auth.currentUser.uid) {
                        updates[`games/${gameId}/status`] = 'abandoned';
                        updates[`games/${gameId}/abandonedBy`] = auth.currentUser.uid;
                        updates[`games/${gameId}/abandonedAt`] = Date.now();
                    }
                }
                if (Object.keys(updates).length > 0) {
                    return database.ref().update(updates);
                }
            }
        }).catch((error) => {
            console.error('Error during disconnect:', error);
        });
    }
});

// Add event listener for username input field
document.addEventListener('DOMContentLoaded', function() {
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.addEventListener('input', debounce(checkUsernameAvailability, 500));
    }
});

// Debounce function to limit how often the availability check runs
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Function to check username availability as user types
async function checkUsernameAvailability() {
    const usernameInput = document.getElementById('username');
    const username = usernameInput.value.trim();
    
    // Clear any previous styling
    usernameInput.classList.remove('border-red-500', 'border-green-500');
    
    // Don't check if username is too short
    if (username.length < 3) {
        return;
    }
    
    try {
        const taken = await isUsernameTaken(username);
        if (taken) {
            usernameInput.classList.add('border-red-500');
            // No alert here
        } else {
            usernameInput.classList.add('border-green-500');
        }
    } catch (error) {
        console.error('Error checking username availability:', error);
    }
} 