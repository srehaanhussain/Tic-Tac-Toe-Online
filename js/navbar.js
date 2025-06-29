document.addEventListener('DOMContentLoaded', function() {
    const accessibilityBtns = document.querySelectorAll('.accessibility-btn');
    const navMenu = document.querySelector('.nav-menu');
    const closeBtn = document.querySelector('.close-menu-btn');
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;
    let isScrolling = false;

    // Toggle menu on accessibility button click
    accessibilityBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleMenu();
        });
    });

    // Close menu when close button is clicked
    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleMenu();
        });
    }

    // Touch events for swipe to close
    navMenu.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
        isScrolling = false;
    }, { passive: true });

    navMenu.addEventListener('touchmove', function(e) {
        const touchY = e.changedTouches[0].screenY;
        const touchX = e.changedTouches[0].screenX;
        
        // Check if the user is scrolling vertically
        if (Math.abs(touchY - touchStartY) > Math.abs(touchX - touchStartX)) {
            isScrolling = true;
        }
    }, { passive: true });

    navMenu.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const swipeDistanceX = touchEndX - touchStartX;
        const swipeDistanceY = Math.abs(touchEndY - touchStartY);
        
        // Only recognize horizontal swipes if not scrolling vertically
        if (!isScrolling && swipeDistanceX < -50 && swipeDistanceY < 50 && navMenu.classList.contains('active')) {
            toggleMenu();
        }
    }

    function toggleMenu() {
        accessibilityBtns.forEach(btn => {
            btn.classList.toggle('active');
            btn.setAttribute('aria-expanded', btn.classList.contains('active'));
        });
        
        if (navMenu.classList.contains('active')) {
            // Animate menu out
            navMenu.style.transform = 'translateX(-100%)';
            setTimeout(() => {
                navMenu.classList.remove('active');
                document.body.style.overflow = '';
                navMenu.style.transform = '';
            }, 300);
        } else {
            // Animate menu in
            navMenu.classList.add('active');
            document.body.style.overflow = 'hidden';
            // Small delay to ensure the animation runs
            setTimeout(() => {
                navMenu.style.transform = 'translateX(0)';
            }, 10);
        }
    }

    // Close menu when a link is clicked
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            if (navMenu.classList.contains('active')) {
                toggleMenu();
            }
            
            // Add active state to clicked nav item
            const navLinks = document.querySelectorAll('.nav-link');
            navLinks.forEach(navLink => {
                navLink.classList.remove('active-link');
                navLink.setAttribute('aria-current', 'false');
            });
            link.classList.add('active-link');
            link.setAttribute('aria-current', 'true');
        });

        // Add touch feedback
        link.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.98)';
            this.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
        }, { passive: true });

        link.addEventListener('touchend', function() {
            this.style.transform = '';
            setTimeout(() => {
                this.style.backgroundColor = '';
            }, 150);
        }, { passive: true });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        const isClickInsideNavbar = document.querySelector('.navbar')?.contains(event.target);
        const isClickInsideMobileNavbar = document.querySelector('.mobile-navbar')?.contains(event.target);
        
        if (navMenu && navMenu.classList.contains('active') && 
            !isClickInsideNavbar && !isClickInsideMobileNavbar) {
            toggleMenu();
        }
    });

    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 900 && navMenu && navMenu.classList.contains('active')) {
            toggleMenu();
        }
    });
    
    // Initialize active link based on current page
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        if (currentPath === linkPath || 
            (currentPath === '/' && linkPath === '/') || 
            (currentPath !== '/' && linkPath !== '/' && currentPath.includes(linkPath))) {
            link.classList.add('active-link');
            link.setAttribute('aria-current', 'true');
        }
    });

    // Firebase auth state change observer
    firebase.auth().onAuthStateChanged(async function(user) {
        if (user) {
            // User is signed in
            console.log('User is signed in');
            document.querySelectorAll('.auth-required').forEach(el => {
                el.classList.remove('hidden');
            });
            document.querySelectorAll('.auth-not-required').forEach(el => {
                el.classList.add('hidden');
            });
            
            // Check if user is admin and show admin link
            if (user.email === 'admin@tictactoe.com') {
                const adminLinkContainer = document.createElement('li');
                adminLinkContainer.className = 'nav-item admin-link';
                
                const adminLink = document.createElement('a');
                adminLink.href = '/admin/';
                adminLink.className = 'nav-link';
                adminLink.innerHTML = '<i class="fas fa-shield-alt"></i> Admin';
                
                adminLinkContainer.appendChild(adminLink);
                
                // Add to navbar
                const navbar = document.querySelector('.navbar-nav');
                if (navbar) {
                    navbar.appendChild(adminLinkContainer);
                }
            }
            
            // Update user profile display
            updateUserProfileDisplay(user);
        } else {
            // No user is signed in
            console.log('No user is signed in');
            document.querySelectorAll('.auth-required').forEach(el => {
                el.classList.add('hidden');
            });
            document.querySelectorAll('.auth-not-required').forEach(el => {
                el.classList.remove('hidden');
            });
            
            // Remove admin link if it exists
            const adminLink = document.querySelector('.admin-link');
            if (adminLink) {
                adminLink.remove();
            }
        }
    });
});

// Update user profile display in navbar
async function updateUserProfileDisplay(user) {
    if (!user) return;
    
    try {
        // Get user data from database
        const userSnapshot = await firebase.database().ref(`users/${user.uid}`).once('value');
        const userData = userSnapshot.val() || {};
        
        // Update username display
        const userDisplayElements = document.querySelectorAll('.user-display-name');
        userDisplayElements.forEach(element => {
            let displayText = userData.username || user.email?.split('@')[0] || 'User';
            
            // Add verification badge if user is verified
            if (userData.isVerified) {
                element.innerHTML = '';
                element.textContent = displayText;
                
                const verifiedIcon = document.createElement('span');
                verifiedIcon.className = 'verified-icon-tooltip ml-1';
                
                const icon = document.createElement('span');
                icon.className = 'verified-icon';
                icon.textContent = '✓';
                
                const tooltip = document.createElement('span');
                tooltip.className = 'tooltip-text';
                tooltip.textContent = 'Verified account: This account has been verified for authenticity and security.';
                
                verifiedIcon.appendChild(icon);
                verifiedIcon.appendChild(tooltip);
                element.appendChild(verifiedIcon);
            } else {
                element.textContent = displayText;
            }
        });
        
    } catch (error) {
        console.error('Error updating user profile display:', error);
    }
} 