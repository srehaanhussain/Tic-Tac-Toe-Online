// Navigation state management
let currentSection = 'game';
let isNavigating = false; // Flag to prevent multiple navigation attempts at once
let navigationHistory = ['game'];

// Add fade effect to all section transitions
function addTransitionEffects() {
    const sections = [
        'authSection',
        'gameModesSection',
        'onlinePlayersSection',
        'gameSection',
        'userAccountSection',
        'contactSection'
    ];
    
    sections.forEach(sectionId => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.classList.add('section-transition');
        }
    });
}

function showProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

function navigateTo(section, replaceState = false) {
    // Prevent navigation if already navigating
    if (isNavigating) return;
    isNavigating = true;
    
    // Prevent switching to players section if in a game
    if (section === 'players' && currentGame.gameMode) {
        customAlert.info('Please finish or leave your current game before viewing players');
        isNavigating = false;
        return;
    }

    // Disable browser back button
    window.history.pushState(null, null, window.location.href);
    window.onpopstate = function() {
        window.history.pushState(null, null, window.location.href);
    };
    
    // Update browser history
    if (replaceState) {
        window.history.replaceState({ section: section }, '', `#${section}`);
    } else {
        window.history.pushState({ section: section }, '', `#${section}`);
    }

    // Get all sections
    const sections = [
        'authSection',
        'gameModesSection',
        'onlinePlayersSection',
        'gameSection',
        'userAccountSection',
        'contactSection'
    ];

    // Hide all sections first
    sections.forEach(sectionId => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.classList.add('hidden');
        }
    });

    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Add active class to clicked nav item
    const navItem = document.querySelector(`[data-section="${section}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }

    // Show the selected section
    switch(section) {
        case 'game':
            if (isUserLoggedIn()) {
                // If there's an active game, show it directly
                if (currentGame.gameMode) {
                    const gameSection = document.getElementById('gameSection');
                    gameSection.classList.remove('hidden');
                    updateGameStatus();
                    renderBoard();
                } else {
                    const gameModes = document.getElementById('gameModesSection');
                    gameModes.classList.remove('hidden');
                }
            } else {
                const authSection = document.getElementById('authSection');
                authSection.classList.remove('hidden');
                window.history.replaceState({ section: 'auth' }, '', '#auth');
            }
            break;
        case 'players':
            if (isUserLoggedIn()) {
                const playersSection = document.getElementById('onlinePlayersSection');
                playersSection.classList.remove('hidden');
                loadOnlinePlayers();
            } else {
                const authSection = document.getElementById('authSection');
                authSection.classList.remove('hidden');
                window.history.replaceState({ section: 'auth' }, '', '#auth');
            }
            break;
        case 'contact':
            const contactSection = document.getElementById('contactSection');
            contactSection.classList.remove('hidden');
            break;
        case 'profile':
            if (isUserLoggedIn()) {
                const profileSection = document.getElementById('userAccountSection');
                profileSection.classList.remove('hidden');
                showProfileSection();
                showProfileDropdown();
            } else {
                const authSection = document.getElementById('authSection');
                authSection.classList.remove('hidden');
                window.history.replaceState({ section: 'auth' }, '', '#auth');
            }
            break;
    }
    
    // Reset navigation flag
    isNavigating = false;
    currentSection = section;
}

// Check if user is logged in
function isUserLoggedIn() {
    return firebase.auth().currentUser !== null;
}

// Function to handle post-authentication navigation
function handlePostAuthNavigation() {
    // Add fade-out class to current section
    const authSection = document.getElementById('authSection');
    const userSection = document.getElementById('userAccountSection');
    
    if (!authSection.classList.contains('hidden')) {
        authSection.classList.add('fade-out');
    }
    
    if (!userSection.classList.contains('hidden')) {
        userSection.classList.add('fade-out');
    }
    
    // Hide sections after fade out
    setTimeout(() => {
        authSection.classList.add('hidden');
        authSection.classList.remove('fade-out');
        userSection.classList.add('hidden');
        userSection.classList.remove('fade-out');
        
        // Show game modes section with fade-in effect
        const gameModes = document.getElementById('gameModesSection');
        gameModes.classList.remove('hidden');
        setTimeout(() => {
            gameModes.classList.add('fade-in');
            setTimeout(() => {
                gameModes.classList.remove('fade-in');
            }, 300);
        }, 50);
    }, 200);
    
    // Update navigation state
    currentSection = 'game';
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const gameNavItem = document.querySelector('[data-section="game"]');
    if (gameNavItem) {
        gameNavItem.classList.add('active');
    }
    
    // Update browser history
    window.history.replaceState({ section: 'game' }, '', '#game');
}

// Breadcrumbs and Back Navigation
const breadcrumbsContainer = document.getElementById('breadcrumbsContainer');
const backButtonContainer = document.getElementById('backButtonContainer');
const currentBreadcrumb = document.getElementById('currentBreadcrumb');

// Function to update breadcrumbs
function updateBreadcrumbs(section) {
    if (!breadcrumbsContainer || !currentBreadcrumb) return;
    
    // Show breadcrumbs container
    breadcrumbsContainer.classList.remove('hidden');
    
    // Update current breadcrumb text
    let breadcrumbText = '';
    switch(section) {
        case 'game':
            breadcrumbText = 'Game Modes';
            break;
        case 'players':
            breadcrumbText = 'Online Players';
            break;
        case 'contact':
            breadcrumbText = 'Contact';
            break;
        case 'profile':
            breadcrumbText = 'Profile';
            break;
        default:
            breadcrumbText = section.charAt(0).toUpperCase() + section.slice(1);
    }
    currentBreadcrumb.textContent = breadcrumbText;
    
    // Handle navigation history
    if (section === 'game') {
        // Clear history when returning to home
        navigationHistory = ['game'];
        backButtonContainer.classList.add('hidden');
    } else {
        // Add to navigation history if not already the last item
        if (navigationHistory[navigationHistory.length - 1] !== section) {
            navigationHistory.push(section);
        }
        
        // Show back button if we have history and not on home
        if (navigationHistory.length > 1) {
            backButtonContainer.classList.remove('hidden');
        } else {
            backButtonContainer.classList.add('hidden');
        }
    }
}

// Function to handle mobile back button
function handleMobileBackButton() {
    // Check if player is in a game match
    if (currentGame && currentGame.gameMode) {
        // If player is in a game, show confirmation dialog
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
                            navigateTo('game', true);
                        }, 3000);
                    });
                } else {
                    navigateTo('game', true);
                }
            },
            () => {
                // User cancelled leaving the game
                window.customAlert.info('You are still in the game');
            }
        );
        return;
    }

    // Check if we're already on the game section and there's no navigation history
    if (currentSection === 'game' && (navigationHistory.length <= 1 || navigationHistory[navigationHistory.length - 1] === 'game')) {
        // If we're already on the game section and user presses back, close the tab
        window.close();
        return;
    }

    // If not in a game, go back to home section
    navigateTo('game', true);
}

// Update the existing goBack function
function goBack() {
    handleMobileBackButton();
}

// Modify the existing navigateTo function to update breadcrumbs
const originalNavigateTo = navigateTo;
navigateTo = function(section, replaceState = false) {
    originalNavigateTo(section, replaceState);
    updateBreadcrumbs(section);
};

// Initialize navigation
document.addEventListener('DOMContentLoaded', () => {
    // Add transition effects to all sections
    addTransitionEffects();

    // Hide all sections initially
    const allSections = [
        'authSection',
        'gameModesSection',
        'onlinePlayersSection',
        'gameSection',
        'userAccountSection',
        'contactSection'
    ];
    
    allSections.forEach(sectionId => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.classList.add('hidden');
        }
    });

    // Reset navigation history and breadcrumbs on load
    navigationHistory = ['game'];
    updateBreadcrumbs('game');

    // Check URL hash and redirect to #game if needed
    if (!window.location.hash || window.location.hash === '#profile') {
        window.location.hash = isUserLoggedIn() ? '#game' : '#auth';
    }

    // Set initial active state
    if (isUserLoggedIn()) {
        handlePostAuthNavigation();
    } else {
        const authSection = document.getElementById('authSection');
        authSection.classList.remove('hidden');
        setTimeout(() => {
            authSection.classList.add('fade-in');
        }, 50);
        window.history.replaceState({ section: 'auth' }, '', '#auth');
    }

    // Handle auth state changes
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            handlePostAuthNavigation();
        } else {
            // User is signed out
            const sections = [
                'gameModesSection',
                'userAccountSection',
                'onlinePlayersSection',
                'gameSection'
            ];
            
            // Add fade-out to any visible sections
            sections.forEach(sectionId => {
                const element = document.getElementById(sectionId);
                if (element && !element.classList.contains('hidden')) {
                    element.classList.add('fade-out');
                }
            });
            
            // Hide sections after fade out
            setTimeout(() => {
                sections.forEach(sectionId => {
                    const element = document.getElementById(sectionId);
                    if (element) {
                        element.classList.add('hidden');
                        element.classList.remove('fade-out');
                    }
                });
                
                // Show auth section with fade-in
                const authSection = document.getElementById('authSection');
                authSection.classList.remove('hidden');
                setTimeout(() => {
                    authSection.classList.add('fade-in');
                    setTimeout(() => {
                        authSection.classList.remove('fade-in');
                    }, 300);
                }, 50);
                
                // Update URL to #auth
                window.history.replaceState({ section: 'auth' }, '', '#auth');
            }, 200);
            
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
        }
    });

    // Add search functionality for online players
    const playerSearch = document.getElementById('playerSearch');
    if (playerSearch) {
        playerSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const playersList = document.getElementById('playersList');
            const playerItems = playersList.getElementsByClassName('player-item');
            let hasVisiblePlayers = false;
            
            Array.from(playerItems).forEach(item => {
                const playerName = item.textContent.toLowerCase();
                if (playerName.includes(searchTerm)) {
                    item.style.display = '';
                    hasVisiblePlayers = true;
                } else {
                    item.style.display = 'none';
                }
            });

            // Show "No players found" message if no players match the search
            if (!hasVisiblePlayers) {
                const noPlayersMessage = document.createElement('div');
                noPlayersMessage.className = 'text-center text-gray-500 py-4';
                noPlayersMessage.textContent = 'No players found';
                
                // Remove any existing "No players found" message
                const existingMessage = playersList.querySelector('.text-center.text-gray-500');
                if (existingMessage) {
                    existingMessage.remove();
                }
                
                playersList.appendChild(noPlayersMessage);
            } else {
                // Remove "No players found" message if there are visible players
                const existingMessage = playersList.querySelector('.text-center.text-gray-500');
                if (existingMessage) {
                    existingMessage.remove();
                }
            }
        });
    }

    // Modified Loading Animation Handler
    const loadingScreen = document.querySelector('.loading-screen');
    const loadingText = document.querySelector('.loading-text');
    
    // Add loading progress messages
    const loadingMessages = [
        "Loading game assets...",
        "Initializing game engine...",
        "Setting up game board...",
        "Getting everything ready...",
        "Almost there..."
    ];
    
    let messageIndex = 0;
    
    // Update loading message every 600ms
    const messageInterval = setInterval(() => {
        loadingText.textContent = loadingMessages[messageIndex];
        messageIndex = (messageIndex + 1) % loadingMessages.length;
    }, 600);
    
    // Start initializing the app immediately, but keep the loading screen visible
    // for a fixed amount of time (3 seconds)
    setTimeout(() => {
        clearInterval(messageInterval);
        loadingText.textContent = "Ready to play!";
        
        setTimeout(() => {
            loadingScreen.classList.add('fade-out');
            // Remove the loading screen from DOM after animation
            setTimeout(() => {
                loadingScreen.remove();
            }, 500);
        }, 500);
    }, 3000);

    // Hide mobile navbar when user clicks on input fields and enable enter key functionality
    const inputElements = document.querySelectorAll('input, textarea');
    const mobileNavbar = document.querySelector('.mobile-navbar');
    
    // Add event listeners to all input fields
    inputElements.forEach(input => {
        // Hide navbar when input is focused - only if not in a game match
        input.addEventListener('focus', function() {
            if (mobileNavbar && document.getElementById('gameSection').classList.contains('hidden')) {
                mobileNavbar.style.display = 'none';
            }
        });
        
        // Show navbar when input loses focus - only if not in a game match
        input.addEventListener('blur', function() {
            if (mobileNavbar && document.getElementById('gameSection').classList.contains('hidden')) {
                mobileNavbar.style.display = 'block';
            }
        });
        
        // Enable Enter key functionality for all EXCEPT chatInput
        if (input.id !== 'chatInput') {
        input.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                // Determine which function to call based on the input's id
                if (this.id === 'loginEmail' || this.id === 'loginPassword') {
                    login();
                } else if (this.id === 'registerEmail' || this.id === 'registerPassword' || this.id === 'username') {
                    register();
                } else if (this.id === 'newUsername') {
                    updateUsername();
                } else if (this.id === 'playerSearch') {
                    // If there's a search function, call it here
                }
                // Blur the input to hide the keyboard on mobile
                this.blur();
            }
        });
        }
    });

    // Add code that detects a swipe up from the bottom of the screen to show the mobile navbar temporarily
    let startY;
    let endY;
    
    document.addEventListener('touchstart', function(e) {
        startY = e.touches[0].clientY;
    }, false);
    
    document.addEventListener('touchend', function(e) {
        endY = e.changedTouches[0].clientY;
        handleSwipe();
    }, false);
    
    function handleSwipe() {
        // Detect swipe up from bottom of screen
        if (startY > window.innerHeight - 50 && endY < startY - 50) {
            // Get current state of navbar
            const navbar = document.querySelector('.mobile-navbar');
            if (navbar.style.display === 'none') {
                // Show navbar temporarily
                navbar.style.display = '';
                // Hide it again after 3 seconds
                setTimeout(() => {
                    // Only hide it again if we're still in a game
                    if (document.getElementById('gameSection').classList.contains('hidden') === false) {
                        navbar.style.display = 'none';
                    }
                }, 3000);
            }
        }
    }
    
    // Handle browser back button using History API
    window.addEventListener('popstate', (event) => {
        handleMobileBackButton();
    });

    // Add event listener for mobile back button
    window.addEventListener('beforeunload', (event) => {
        if (currentGame && currentGame.gameMode) {
            // If in a game, show confirmation dialog
            event.preventDefault();
            event.returnValue = '';
            return '';
        }
    });
    
    // Set initial history state
    if (!window.history.state) {
        window.history.replaceState({ section: currentSection }, '', `#${currentSection}`);
    }
});