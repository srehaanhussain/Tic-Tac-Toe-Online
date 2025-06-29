// Initialize Custom Alert
const customAlert = new CustomAlert();

// Global variables for pagination
let currentPage = 1;
const usersPerPage = 10;
let allUsers = [];
let filteredUsers = [];
let currentUserDetails = null;

// Admin auth state check
auth.onAuthStateChanged(user => {
    if (user) {
        // Check if user is admin
        checkIsAdmin(user).then(isAdmin => {
            if (isAdmin) {
                showAdminDashboard();
                loadAllUsers();
            } else {
                // If authenticated but not admin, log them out
                auth.signOut().then(() => {
                    showAlert('Access denied. You are not authorized as admin.', 'error');
                    showAdminLogin();
                });
            }
        });
    } else {
        showAdminLogin();
    }
});

// Check if user is admin
async function checkIsAdmin(user) {
    // For now, we'll use a single admin email to check
    return user.email === 'admin@tictactoe.com';
}

// Show admin login section
function showAdminLogin() {
    document.getElementById('adminLoginSection').classList.remove('hidden');
    document.getElementById('adminDashboardSection').classList.add('hidden');
}

// Show admin dashboard
function showAdminDashboard() {
    document.getElementById('adminLoginSection').classList.add('hidden');
    document.getElementById('adminDashboardSection').classList.remove('hidden');
    
    // Add games section if it doesn't exist
    if (!document.getElementById('gamesSection')) {
        addGamesSection();
        
        // Restore auto-delete setting
        const autoDeleteEnabled = localStorage.getItem('autoDeleteAbandoned') === 'true';
        const autoDeleteCheckbox = document.getElementById('autoDeleteAbandoned');
        if (autoDeleteCheckbox && autoDeleteEnabled) {
            autoDeleteCheckbox.checked = true;
            startAbandonedGamesMonitoring();
        }
    }
    
    // Add notification section if it doesn't exist
    if (!document.getElementById('notificationSection')) {
        addNotificationSection();
    }
}

// Add notification section to admin dashboard
function addNotificationSection() {
    const adminContainer = document.querySelector('.admin-container');
    if (!adminContainer) return;
    
    // Create notification section
    const notificationSection = document.createElement('div');
    notificationSection.id = 'notificationSection';
    notificationSection.className = 'notification-section';
    notificationSection.style.cssText = `
        margin-top: 2rem;
        padding: 1rem;
        background-color: white;
        border-radius: 0.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    `;
    
    // Create section header with delete all button
    const sectionHeader = document.createElement('div');
    sectionHeader.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    `;
    
    const headerTitle = document.createElement('h2');
    headerTitle.textContent = 'Send Notifications';
    
    const deleteAllButton = document.createElement('button');
    deleteAllButton.className = 'btn btn-danger';
    deleteAllButton.textContent = 'Delete All Notifications';
    deleteAllButton.style.cssText = `
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
    `;
    deleteAllButton.addEventListener('click', deleteAllUserNotifications);
    
    sectionHeader.appendChild(headerTitle);
    sectionHeader.appendChild(deleteAllButton);
    
    // Create form
    const form = document.createElement('form');
    form.id = 'notificationForm';
    form.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 1rem;
    `;
    
    // Create recipient selection
    const recipientGroup = document.createElement('div');
    recipientGroup.className = 'form-group';
    
    const recipientLabel = document.createElement('label');
    recipientLabel.setAttribute('for', 'notificationRecipient');
    recipientLabel.textContent = 'Send to:';
    
    const recipientSelect = document.createElement('select');
    recipientSelect.id = 'notificationRecipient';
    recipientSelect.style.cssText = `
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #E5E7EB;
        border-radius: 0.25rem;
        margin-top: 0.25rem;
    `;
    
    // Add recipient options
    const allUsersOption = document.createElement('option');
    allUsersOption.value = 'all';
    allUsersOption.textContent = 'All Users';
    
    const specificUserOption = document.createElement('option');
    specificUserOption.value = 'specific';
    specificUserOption.textContent = 'Specific User';
    
    recipientSelect.appendChild(allUsersOption);
    recipientSelect.appendChild(specificUserOption);
    
    // Add event listener to show/hide user selection
    recipientSelect.addEventListener('change', function() {
        const userSelectionGroup = document.getElementById('userSelectionGroup');
        if (this.value === 'specific') {
            userSelectionGroup.classList.remove('hidden');
        } else {
            userSelectionGroup.classList.add('hidden');
        }
    });
    
    recipientGroup.appendChild(recipientLabel);
    recipientGroup.appendChild(recipientSelect);
    
    // Create user selection (initially hidden)
    const userSelectionGroup = document.createElement('div');
    userSelectionGroup.id = 'userSelectionGroup';
    userSelectionGroup.className = 'form-group hidden';
    
    const userSelectionLabel = document.createElement('label');
    userSelectionLabel.setAttribute('for', 'userSelection');
    userSelectionLabel.textContent = 'Select User:';
    
    const userSelectionInput = document.createElement('input');
    userSelectionInput.type = 'text';
    userSelectionInput.id = 'userSearchInput';
    userSelectionInput.placeholder = 'Search by username or email';
    userSelectionInput.style.cssText = `
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #E5E7EB;
        border-radius: 0.25rem;
        margin-top: 0.25rem;
        margin-bottom: 0.5rem;
    `;
    
    // Add user search functionality
    userSelectionInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const userResults = document.getElementById('userResults');
        userResults.innerHTML = '';
        
        if (searchTerm.length < 2) return;
        
        const matchingUsers = allUsers.filter(user => 
            (user.username && user.username.toLowerCase().includes(searchTerm)) || 
            (user.email && user.email.toLowerCase().includes(searchTerm))
        ).slice(0, 5); // Limit to 5 results
        
        if (matchingUsers.length === 0) {
            const noResults = document.createElement('div');
            noResults.textContent = 'No users found';
            noResults.style.padding = '0.5rem';
            userResults.appendChild(noResults);
            return;
        }
        
        matchingUsers.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-search-item';
            userItem.dataset.userId = user.id;
            userItem.dataset.username = user.username || '';
            userItem.dataset.email = user.email || '';
            userItem.textContent = `${user.username || 'No username'} (${user.email || 'No email'})`;
            userItem.style.cssText = `
                padding: 0.5rem;
                cursor: pointer;
                border-bottom: 1px solid #E5E7EB;
            `;
            
            userItem.addEventListener('mouseover', function() {
                this.style.backgroundColor = '#F3F4F6';
            });
            
            userItem.addEventListener('mouseout', function() {
                this.style.backgroundColor = '';
            });
            
            userItem.addEventListener('click', function() {
                document.getElementById('selectedUserId').value = this.dataset.userId;
                document.getElementById('userSearchInput').value = this.textContent;
                userResults.innerHTML = '';
            });
            
            userResults.appendChild(userItem);
        });
    });
    
    const userResults = document.createElement('div');
    userResults.id = 'userResults';
    userResults.style.cssText = `
        max-height: 200px;
        overflow-y: auto;
        border: 1px solid #E5E7EB;
        border-radius: 0.25rem;
        background-color: white;
        position: absolute;
        width: calc(100% - 2rem);
        z-index: 10;
    `;
    
    // Hidden input to store selected user ID
    const selectedUserIdInput = document.createElement('input');
    selectedUserIdInput.type = 'hidden';
    selectedUserIdInput.id = 'selectedUserId';
    
    userSelectionGroup.appendChild(userSelectionLabel);
    userSelectionGroup.appendChild(userSelectionInput);
    userSelectionGroup.appendChild(userResults);
    userSelectionGroup.appendChild(selectedUserIdInput);
    
    // Create notification title input
    const titleGroup = document.createElement('div');
    titleGroup.className = 'form-group';
    
    const titleLabel = document.createElement('label');
    titleLabel.setAttribute('for', 'notificationTitle');
    titleLabel.textContent = 'Title:';
    
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.id = 'notificationTitle';
    titleInput.placeholder = 'Enter notification title';
    titleInput.style.cssText = `
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #E5E7EB;
        border-radius: 0.25rem;
        margin-top: 0.25rem;
    `;
    
    titleGroup.appendChild(titleLabel);
    titleGroup.appendChild(titleInput);
    
    // Create notification message input
    const messageGroup = document.createElement('div');
    messageGroup.className = 'form-group';
    
    const messageLabel = document.createElement('label');
    messageLabel.setAttribute('for', 'notificationMessage');
    messageLabel.textContent = 'Message:';
    
    const messageInput = document.createElement('textarea');
    messageInput.id = 'notificationMessage';
    messageInput.placeholder = 'Enter notification message';
    messageInput.rows = 4;
    messageInput.style.cssText = `
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #E5E7EB;
        border-radius: 0.25rem;
        margin-top: 0.25rem;
        resize: vertical;
    `;
    
    messageGroup.appendChild(messageLabel);
    messageGroup.appendChild(messageInput);
    
    // Create link input
    const linkGroup = document.createElement('div');
    linkGroup.className = 'form-group';
    
    const linkLabel = document.createElement('label');
    linkLabel.setAttribute('for', 'notificationLink');
    linkLabel.textContent = 'Link (optional):';
    
    const linkInput = document.createElement('input');
    linkInput.type = 'url';
    linkInput.id = 'notificationLink';
    linkInput.placeholder = 'https://example.com';
    linkInput.style.cssText = `
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #E5E7EB;
        border-radius: 0.25rem;
        margin-top: 0.25rem;
    `;
    
    const linkTextGroup = document.createElement('div');
    linkTextGroup.className = 'form-group';
    
    const linkTextLabel = document.createElement('label');
    linkTextLabel.setAttribute('for', 'notificationLinkText');
    linkTextLabel.textContent = 'Link Text (optional):';
    
    const linkTextInput = document.createElement('input');
    linkTextInput.type = 'text';
    linkTextInput.id = 'notificationLinkText';
    linkTextInput.placeholder = 'Click here';
    linkTextInput.style.cssText = `
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #E5E7EB;
        border-radius: 0.25rem;
        margin-top: 0.25rem;
    `;
    
    linkGroup.appendChild(linkLabel);
    linkGroup.appendChild(linkInput);
    linkTextGroup.appendChild(linkTextLabel);
    linkTextGroup.appendChild(linkTextInput);
    
    // Create submit button
    const submitButton = document.createElement('button');
    submitButton.type = 'button';
    submitButton.className = 'btn btn-primary';
    submitButton.textContent = 'Send Notification';
    submitButton.style.cssText = `
        align-self: flex-start;
    `;
    
    submitButton.addEventListener('click', sendNotification);
    
    // Assemble form
    form.appendChild(recipientGroup);
    form.appendChild(userSelectionGroup);
    form.appendChild(titleGroup);
    form.appendChild(messageGroup);
    form.appendChild(linkGroup);
    form.appendChild(linkTextGroup);
    form.appendChild(submitButton);
    
    // Assemble section
    notificationSection.appendChild(sectionHeader);
    notificationSection.appendChild(form);
    
    // Add to admin container
    adminContainer.appendChild(notificationSection);
}

// Send notification function
async function sendNotification() {
    const recipient = document.getElementById('notificationRecipient').value;
    const title = document.getElementById('notificationTitle').value;
    const message = document.getElementById('notificationMessage').value;
    const link = document.getElementById('notificationLink').value;
    const linkText = document.getElementById('notificationLinkText').value;
    
    if (!message) {
        showAlert('Please enter a notification message', 'error');
        return;
    }
    
    try {
        if (recipient === 'all') {
            // Send to all users
            await sendNotificationToAllUsers(title, message, link, linkText);
            showAlert('Notification sent to all users', 'success');
        } else if (recipient === 'specific') {
            // Send to specific user
            const userId = document.getElementById('selectedUserId').value;
            
            if (!userId) {
                showAlert('Please select a user', 'error');
                return;
            }
            
            await sendNotificationToUser(userId, title, message, link, linkText);
            showAlert('Notification sent successfully', 'success');
        }
        
        // Clear form
        document.getElementById('notificationTitle').value = '';
        document.getElementById('notificationMessage').value = '';
        document.getElementById('notificationLink').value = '';
        document.getElementById('notificationLinkText').value = '';
        document.getElementById('userSearchInput').value = '';
        document.getElementById('selectedUserId').value = '';
    } catch (error) {
        console.error('Error sending notification:', error);
        showAlert('Error sending notification: ' + error.message, 'error');
    }
}

// Send notification to specific user
async function sendNotificationToUser(userId, title, message, link, linkText) {
    const notificationData = {
        title: title || 'Admin Notification',
        message: message,
        link: link,
        linkText: linkText,
        timestamp: Date.now(),
        read: false,
        fromAdmin: true
    };
    
    // Add notification to user's notifications
    await database.ref(`notifications/${userId}`).push(notificationData);
}

// Send notification to all users
async function sendNotificationToAllUsers(title, message, link, linkText) {
    if (allUsers.length === 0) {
        showAlert('No users found', 'error');
        return;
    }
    
    const notificationData = {
        title: title || 'Admin Notification',
        message: message,
        link: link,
        linkText: linkText,
        timestamp: Date.now(),
        read: false,
        fromAdmin: true,
        isGlobal: true
    };
    
    // Create batch updates
    const updates = {};
    
    // Add notification to each user
    allUsers.forEach(user => {
        const notificationKey = database.ref(`notifications/${user.id}`).push().key;
        updates[`notifications/${user.id}/${notificationKey}`] = notificationData;
    });
    
    // Execute batch update
    await database.ref().update(updates);
}

// Admin login function
async function adminLogin() {
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    
    if (!email || !password) {
        showAlert('Please fill in all fields', 'error');
        return;
    }

    try {
        // Match specific admin credentials
        if (email !== 'admin@tictactoe.com') {
            showAlert('Admin account not recognized', 'error');
            return;
        }

        await auth.signInWithEmailAndPassword(email, password);
        // Auth state change listener will handle the rest
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// Admin logout function
function adminLogout() {
    auth.signOut()
        .then(() => {
            showAlert('Successfully logged out', 'success');
            showAdminLogin();
        })
        .catch(error => {
            showAlert(error.message, 'error');
        });
}

// Load all users from the database
async function loadAllUsers() {
    try {
        const snapshot = await database.ref('users').once('value');
        const usersData = snapshot.val();
        
        if (!usersData) {
            document.getElementById('usersList').innerHTML = '<tr><td colspan="5">No users found</td></tr>';
            return;
        }
        
        // Convert users object to array
        allUsers = Object.keys(usersData).map(userId => ({
            id: userId,
            ...usersData[userId]
        }));
        
        // Apply current filters
        filterUsers();
    } catch (error) {
        console.error('Error loading users:', error);
        showAlert('Error loading users: ' + error.message, 'error');
    }
}

// Filter users based on search and dropdown
function filterUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    
    filteredUsers = allUsers.filter(user => {
        const matchesSearch = 
            (user.username && user.username.toLowerCase().includes(searchTerm)) || 
            (user.email && user.email.toLowerCase().includes(searchTerm));
        
        const matchesStatus = 
            statusFilter === 'all' || 
            (statusFilter === 'verified' && user.isVerified) || 
            (statusFilter === 'unverified' && !user.isVerified);
            
        return matchesSearch && matchesStatus;
    });
    
    // Reset to first page when filtering
    currentPage = 1;
    displayUsers();
    updatePaginationControls();
}

// Display users for the current page
function displayUsers() {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';
    
    if (filteredUsers.length === 0) {
        usersList.innerHTML = '<tr><td colspan="6">No users match your search criteria</td></tr>';
        return;
    }
    
    // Calculate start and end index for current page
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = Math.min(startIndex + usersPerPage, filteredUsers.length);
    
    // Display users for current page
    for (let i = startIndex; i < endIndex; i++) {
        const user = filteredUsers[i];
        const gamesPlayed = user.stats && user.stats.gamesPlayed ? user.stats.gamesPlayed : 0;
        const totalScore = user.stats && user.stats.totalScore ? user.stats.totalScore : 0;
        const userRank = getUserRank(totalScore);
        const verifiedIcon = user.isVerified ? 
            '<span class="verified-icon">✓</span>' : 
            '';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.username || 'N/A'}${verifiedIcon}</td>
            <td>${user.email || 'N/A'}</td>
            <td>${gamesPlayed}</td>
            <td>${userRank}</td>
            <td>${user.status || 'offline'}</td>
            <td>
                <button class="btn btn-small btn-primary" onclick="viewUserDetails('${user.id}')">View</button>
                ${user.isVerified 
                    ? `<button class="btn btn-small btn-warning" onclick="toggleVerification('${user.id}', false)">Remove Verified</button>` 
                    : `<button class="btn btn-small btn-success" onclick="toggleVerification('${user.id}', true)">Verify</button>`
                }
                <button class="btn btn-small btn-info" onclick="sendUserNotification('${user.id}', '${user.username || ''}')">Notify</button>
                <button class="btn btn-small btn-danger" onclick="deleteUserAccount('${user.id}')">Delete</button>
            </td>
        `;
        usersList.appendChild(row);
    }
}

// Send notification to specific user from the user list
function sendUserNotification(userId, username) {
    // Set recipient to specific user
    document.getElementById('notificationRecipient').value = 'specific';
    document.getElementById('userSelectionGroup').classList.remove('hidden');
    
    // Set user in search input
    document.getElementById('userSearchInput').value = username;
    document.getElementById('selectedUserId').value = userId;
    
    // Focus on notification title
    document.getElementById('notificationTitle').focus();
    
    // Scroll to notification section
    document.getElementById('notificationSection').scrollIntoView({ behavior: 'smooth' });
}

// Update pagination controls based on filtered results
function updatePaginationControls() {
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages || 1}`;
    
    // Enable/disable previous/next buttons
    document.getElementById('prevPage').disabled = currentPage <= 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
}

// Go to previous page
function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        displayUsers();
        updatePaginationControls();
    }
}

// Go to next page
function goToNextPage() {
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayUsers();
        updatePaginationControls();
    }
}

// View user details
async function viewUserDetails(userId) {
    try {
        const userSnapshot = await database.ref(`users/${userId}`).once('value');
        const userData = userSnapshot.val();
        
        if (!userData) {
            showAlert('User data not found', 'error');
            return;
        }
        
        currentUserDetails = {
            id: userId,
            ...userData
        };
        
        displayUserDetails(currentUserDetails);
        document.getElementById('userDetailPanel').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading user details:', error);
        showAlert('Error loading user details: ' + error.message, 'error');
    }
}

// Display user details in the panel
function displayUserDetails(user) {
    const stats = user.stats || { gamesPlayed: 0, wins: 0, losses: 0, draws: 0 };
    const totalScore = stats.totalScore || 0;
    const userRank = getUserRank(totalScore);
    const detailsHTML = `
        <div class="user-profile">
            <div class="profile-header">
                <h4>${user.username || 'No username'} ${user.isVerified ? '<span class="verified-icon">✓</span>' : ''}</h4>
                <p>${user.email || 'No email'}</p>
                <p><strong>Rank:</strong> ${userRank}</p>
            </div>
            
            <div class="profile-stats">
                <h5>Stats</h5>
                <p>Games Played: ${stats.gamesPlayed || 0}</p>
                <p>Wins: ${stats.wins || 0}</p>
                <p>Losses: ${stats.losses || 0}</p>
                <p>Draws: ${stats.draws || 0}</p>
                <p>Win Rate: ${stats.gamesPlayed ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0}%</p>
            </div>
            
            <div class="profile-actions">
                ${user.isVerified 
                    ? `<button class="btn btn-warning" onclick="toggleVerification('${user.id}', false)">Remove Verified Status</button>` 
                    : `<button class="btn btn-success" onclick="toggleVerification('${user.id}', true)">Verify User</button>`
                }
                <button class="btn btn-info" onclick="sendUserNotification('${user.id}', '${user.username || ''}')">Send Notification</button>
                <button class="btn btn-secondary" onclick="resetUserStats('${user.id}')">Reset Stats</button>
                <button class="btn btn-danger" onclick="deleteUserAccount('${user.id}')">Delete Account</button>
            </div>

            <div class="user-notifications">
                <h5>User Notifications</h5>
                <div id="userNotificationsList" class="notifications-list">
                    Loading notifications...
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('userDetails').innerHTML = detailsHTML;
    
    // Load user notifications
    loadUserNotifications(user.id);
}

// Close user details panel
function closeUserDetails() {
    document.getElementById('userDetailPanel').classList.add('hidden');
    currentUserDetails = null;
}

// Toggle user verification status
async function toggleVerification(userId, verifyStatus) {
    try {
        await database.ref(`users/${userId}`).update({
            isVerified: verifyStatus
        });
        
        // Update local data
        const userIndex = allUsers.findIndex(user => user.id === userId);
        if (userIndex !== -1) {
            allUsers[userIndex].isVerified = verifyStatus;
        }
        
        // Update current user details if open
        if (currentUserDetails && currentUserDetails.id === userId) {
            currentUserDetails.isVerified = verifyStatus;
            displayUserDetails(currentUserDetails);
        }
        
        // Refresh displayed users
        filterUsers();
        
        showAlert(`User ${verifyStatus ? 'verified' : 'unverified'} successfully`, 'success');
        
        // Send notification to user
        const notificationMessage = verifyStatus 
            ? 'Congratulations! Your account has been verified by an administrator.' 
            : 'Your account verification status has been removed by an administrator.';
            
        await sendNotificationToUser(userId, verifyStatus ? 'Account Verified' : 'Verification Removed', notificationMessage, '', '');
        
    } catch (error) {
        console.error('Error toggling verification:', error);
        showAlert('Error updating user: ' + error.message, 'error');
    }
}

// Reset user stats
async function resetUserStats(userId) {
    try {
        // Confirm action
        customAlert.confirm('Are you sure you want to reset this user\'s stats? This action cannot be undone.', async () => {
            const defaultStats = {
                gamesPlayed: 0,
                wins: 0,
                losses: 0,
                draws: 0
            };
            
            await database.ref(`users/${userId}/stats`).set(defaultStats);
            
            // Update local data
            const userIndex = allUsers.findIndex(user => user.id === userId);
            if (userIndex !== -1) {
                allUsers[userIndex].stats = defaultStats;
            }
            
            // Update current user details if open
            if (currentUserDetails && currentUserDetails.id === userId) {
                currentUserDetails.stats = defaultStats;
                displayUserDetails(currentUserDetails);
            }
            
            showAlert('User stats reset successfully', 'success');
            
            // Send notification to user
            await sendNotificationToUser(
                userId, 
                'Stats Reset', 
                'Your game statistics have been reset by an administrator.',
                '',
                ''
            );
            
        }, () => {
            // User canceled
        });
    } catch (error) {
        console.error('Error resetting stats:', error);
        showAlert('Error resetting stats: ' + error.message, 'error');
    }
}

// Delete user account
async function deleteUserAccount(userId) {
    try {
        // Confirm action
        customAlert.confirm('Are you sure you want to delete this user account? This action cannot be undone.', async () => {
            // Get user data for notification
            const userSnapshot = await database.ref(`users/${userId}`).once('value');
            const userData = userSnapshot.val();
            
            // Delete user data
            await database.ref(`users/${userId}`).remove();
            
            // Remove from local data
            allUsers = allUsers.filter(user => user.id !== userId);
            filteredUsers = filteredUsers.filter(user => user.id !== userId);
            
            // Close details panel if open
            if (currentUserDetails && currentUserDetails.id === userId) {
                closeUserDetails();
            }
            
            // Refresh displayed users
            displayUsers();
            updatePaginationControls();
            
            showAlert('User account deleted successfully', 'success');
            
            // Log admin action
            logAdminAction(`Deleted user account: ${userData?.username || userData?.email || userId}`);
        }, () => {
            // User canceled
        });
    } catch (error) {
        console.error('Error deleting account:', error);
        showAlert('Error deleting account: ' + error.message, 'error');
    }
}

// Log admin action
function logAdminAction(action) {
    const adminUser = auth.currentUser;
    if (!adminUser) return;
    
    const logEntry = {
        adminEmail: adminUser.email,
        action: action,
        timestamp: Date.now()
    };
    
    database.ref('adminLogs').push(logEntry)
        .catch(error => console.error('Error logging admin action:', error));
}

// Show alert using custom alert
function showAlert(message, type = 'info') {
    customAlert.show(message, type, {
        autoClose: true,
        duration: 3000
    });
}

// Add this new function at the end of the file
async function deleteAllUserNotifications() {
    if (window.customAlert) {
        window.customAlert.confirm(
            'Are you sure you want to delete all notifications for all users? This action cannot be undone.',
            async () => {
                try {
                    // Get all users
                    const usersSnapshot = await database.ref('users').once('value');
                    const users = usersSnapshot.val();
                    
                    if (!users) {
                        showAlert('No users found', 'error');
                        return;
                    }
                    
                    // Create batch updates
                    const updates = {};
                    
                    // Delete notifications for each user
                    Object.keys(users).forEach(userId => {
                        updates[`notifications/${userId}`] = null;
                    });
                    
                    // Execute batch update
                    await database.ref().update(updates);
                    
                    showAlert('All notifications have been deleted successfully', 'success');
                } catch (error) {
                    console.error('Error deleting all notifications:', error);
                    showAlert('Error deleting notifications: ' + error.message, 'error');
                }
            }
        );
    }
}

// Add these new functions at the end of the file
async function loadUserNotifications(userId) {
    try {
        const notificationsSnapshot = await database.ref(`notifications/${userId}`).once('value');
        const notifications = notificationsSnapshot.val();
        const notificationsList = document.getElementById('userNotificationsList');
        
        if (!notifications) {
            notificationsList.innerHTML = '<p class="no-notifications">No notifications found</p>';
            return;
        }
        
        // Convert notifications object to array and sort by timestamp
        const notificationsArray = Object.entries(notifications).map(([id, data]) => ({
            id,
            ...data
        })).sort((a, b) => b.timestamp - a.timestamp);
        
        if (notificationsArray.length === 0) {
            notificationsList.innerHTML = '<p class="no-notifications">No notifications found</p>';
            return;
        }
        
        // Create notifications list
        const listHTML = notificationsArray.map(notification => `
            <div class="notification-item ${notification.read ? '' : 'unread'}">
                <div class="notification-content">
                    <h6>${notification.title || 'Notification'}</h6>
                    <p>${notification.message}</p>
                    ${notification.link ? `<p class="notification-link"><a href="${notification.link}" target="_blank">${notification.linkText || notification.link}</a></p>` : ''}
                    <small>${new Date(notification.timestamp).toLocaleString()}</small>
                </div>
                <button class="btn btn-small btn-danger" onclick="deleteUserNotification('${userId}', '${notification.id}')">
                    Delete
                </button>
            </div>
        `).join('');
        
        notificationsList.innerHTML = listHTML;
    } catch (error) {
        console.error('Error loading notifications:', error);
        document.getElementById('userNotificationsList').innerHTML = 
            '<p class="error">Error loading notifications</p>';
    }
}

async function deleteUserNotification(userId, notificationId) {
    if (window.customAlert) {
        window.customAlert.confirm(
            'Are you sure you want to delete this notification?',
            async () => {
                try {
                    await database.ref(`notifications/${userId}/${notificationId}`).remove();
                    
                    // Reload notifications
                    loadUserNotifications(userId);
                    
                    showAlert('Notification deleted successfully', 'success');
                } catch (error) {
                    console.error('Error deleting notification:', error);
                    showAlert('Error deleting notification: ' + error.message, 'error');
                }
            }
        );
    }
}

// Add games section to admin dashboard
function addGamesSection() {
    const adminContainer = document.querySelector('.admin-container');
    if (!adminContainer) return;
    
    // Create games section
    const gamesSection = document.createElement('div');
    gamesSection.id = 'gamesSection';
    gamesSection.className = 'games-section';
    gamesSection.style.cssText = `
        margin-top: 2rem;
        padding: 1rem;
        background-color: white;
        border-radius: 0.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    `;
    
    // Create section header
    const sectionHeader = document.createElement('div');
    sectionHeader.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    `;
    
    const headerTitle = document.createElement('h2');
    headerTitle.textContent = 'Active Games';
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        gap: 0.5rem;
        align-items: center;
    `;
    
    // Add auto-delete abandoned games toggle
    const autoDeleteContainer = document.createElement('div');
    autoDeleteContainer.style.cssText = `
        display: flex;
        align-items: center;
        margin-right: 1rem;
    `;
    
    const autoDeleteCheckbox = document.createElement('input');
    autoDeleteCheckbox.type = 'checkbox';
    autoDeleteCheckbox.id = 'autoDeleteAbandoned';
    autoDeleteCheckbox.style.cssText = `
        margin-right: 0.5rem;
    `;
    
    const autoDeleteLabel = document.createElement('label');
    autoDeleteLabel.htmlFor = 'autoDeleteAbandoned';
    autoDeleteLabel.textContent = 'Auto-delete abandoned games';
    autoDeleteLabel.style.cssText = `
        font-size: 0.875rem;
        color: #4B5563;
    `;
    
    autoDeleteContainer.appendChild(autoDeleteCheckbox);
    autoDeleteContainer.appendChild(autoDeleteLabel);
    
    // Add event listener for auto-delete toggle
    autoDeleteCheckbox.addEventListener('change', function() {
        if (this.checked) {
            startAbandonedGamesMonitoring();
        } else {
            stopAbandonedGamesMonitoring();
        }
    });
    
    const refreshButton = document.createElement('button');
    refreshButton.className = 'btn btn-primary';
    refreshButton.textContent = 'Refresh Games';
    refreshButton.style.cssText = `
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
    `;
    refreshButton.addEventListener('click', loadActiveGames);
    
    const deleteAllButton = document.createElement('button');
    deleteAllButton.className = 'btn btn-danger';
    deleteAllButton.textContent = 'Delete All Games';
    deleteAllButton.style.cssText = `
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
    `;
    deleteAllButton.addEventListener('click', deleteAllGames);
    
    buttonContainer.appendChild(autoDeleteContainer);
    buttonContainer.appendChild(refreshButton);
    buttonContainer.appendChild(deleteAllButton);
    
    sectionHeader.appendChild(headerTitle);
    sectionHeader.appendChild(buttonContainer);
    
    // Create games table
    const gamesTable = document.createElement('table');
    gamesTable.id = 'gamesTable';
    gamesTable.style.cssText = `
        width: 100%;
        border-collapse: collapse;
        margin-top: 1rem;
    `;
    
    gamesTable.innerHTML = `
        <thead>
            <tr>
                <th>Game ID</th>
                <th>Players</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody id="gamesList">
            <!-- Games will be loaded here -->
        </tbody>
    `;
    
    gamesSection.appendChild(sectionHeader);
    gamesSection.appendChild(gamesTable);
    
    // Add games section before notification section
    const notificationSection = document.getElementById('notificationSection');
    if (notificationSection) {
        adminContainer.insertBefore(gamesSection, notificationSection);
    } else {
        adminContainer.appendChild(gamesSection);
    }
    
    // Load initial games
    loadActiveGames();
}

// Variable to store the monitoring interval
let abandonedGamesMonitoringInterval = null;

// Start monitoring abandoned games
function startAbandonedGamesMonitoring() {
    // Store the setting in localStorage
    localStorage.setItem('autoDeleteAbandoned', 'true');
    
    // Set up real-time listener for games
    database.ref('games').on('value', handleAbandonedGames);
    
    showAlert('Auto-delete abandoned games enabled', 'success');
}

// Stop monitoring abandoned games
function stopAbandonedGamesMonitoring() {
    // Remove the setting from localStorage
    localStorage.setItem('autoDeleteAbandoned', 'false');
    
    // Remove real-time listener
    database.ref('games').off('value', handleAbandonedGames);
    
    showAlert('Auto-delete abandoned games disabled', 'success');
}

// Handle abandoned games
async function handleAbandonedGames(snapshot) {
    const games = snapshot.val();
    if (!games) return;
    
    const updates = {};
    let deletedCount = 0;
    
    for (const [gameId, game] of Object.entries(games)) {
        // Check if game is abandoned
        if (game.status === 'abandoned' || game.abandonedBy) {
            // Delete the game
            updates[`games/${gameId}`] = null;
            deletedCount++;
            
            // Log the deletion
            logAdminAction(`Auto-deleted abandoned game: ${gameId}`);
        }
    }
    
    // If there are games to delete, perform the batch update
    if (deletedCount > 0) {
        try {
            await database.ref().update(updates);
            showAlert(`Automatically deleted ${deletedCount} abandoned game(s)`, 'success');
            loadActiveGames(); // Refresh the games list
        } catch (error) {
            console.error('Error deleting abandoned games:', error);
            showAlert('Error deleting abandoned games: ' + error.message, 'error');
        }
    }
}

// Load active games from database
async function loadActiveGames() {
    try {
        const gamesList = document.getElementById('gamesList');
        if (!gamesList) return;
        
        gamesList.innerHTML = '<tr><td colspan="5" class="text-center">Loading games...</td></tr>';
        
        const gamesSnapshot = await database.ref('games').once('value');
        const games = gamesSnapshot.val();
        
        if (!games) {
            gamesList.innerHTML = '<tr><td colspan="5" class="text-center">No active games found</td></tr>';
            return;
        }
        
        gamesList.innerHTML = '';
        
        // Convert games object to array and sort by creation time
        const gamesArray = Object.entries(games).map(([id, game]) => ({
            id,
            ...game,
            createdAt: game.createdAt || Date.now()
        })).sort((a, b) => b.createdAt - a.createdAt);
        
        for (const game of gamesArray) {
            const row = document.createElement('tr');
            row.style.cssText = `
                border-bottom: 1px solid #E5E7EB;
                padding: 0.5rem;
            `;
            
            // Format creation date
            const createdAt = new Date(game.createdAt);
            const formattedDate = createdAt.toLocaleString();
            
            // Get player names
            const player1Name = game.player1Name || 'Player 1';
            const player2Name = game.player2Name || 'Player 2';
            
            row.innerHTML = `
                <td style="padding: 0.5rem;">${game.id}</td>
                <td style="padding: 0.5rem;">${player1Name} vs ${player2Name}</td>
                <td style="padding: 0.5rem;">${game.status || 'active'}</td>
                <td style="padding: 0.5rem;">${formattedDate}</td>
                <td style="padding: 0.5rem;">
                    <button class="btn btn-small btn-danger" onclick="deleteGame('${game.id}')">Delete</button>
                </td>
            `;
            
            gamesList.appendChild(row);
        }
    } catch (error) {
        console.error('Error loading games:', error);
        showAlert('Error loading games: ' + error.message, 'error');
    }
}

// Delete game from database
async function deleteGame(gameId) {
    try {
        // Confirm deletion
        customAlert.confirm('Are you sure you want to delete this game? This action cannot be undone.', async () => {
            await database.ref(`games/${gameId}`).remove();
            showAlert('Game deleted successfully', 'success');
            loadActiveGames(); // Refresh the games list
        }, () => {
            // User canceled
        });
    } catch (error) {
        console.error('Error deleting game:', error);
        showAlert('Error deleting game: ' + error.message, 'error');
    }
}

// Delete all games from database
async function deleteAllGames() {
    try {
        // Confirm deletion
        customAlert.confirm('Are you sure you want to delete ALL games? This action cannot be undone.', async () => {
            await database.ref('games').remove();
            showAlert('All games deleted successfully', 'success');
            loadActiveGames(); // Refresh the games list
        }, () => {
            // User canceled
        });
    } catch (error) {
        console.error('Error deleting all games:', error);
        showAlert('Error deleting games: ' + error.message, 'error');
    }
}

function getUserRank(points) {
    if (points >= 501) return "Grandmaster";
    if (points >= 301) return "Master";
    if (points >= 151) return "Expert";
    if (points >= 51) return "Apprentice";
    return "Novice";
}