// Notifications System
class NotificationSystem {
    constructor() {
        this.container = null;
        this.notificationBadge = null;
        this.notificationIcon = null;
        this.notificationModal = null;
        this.notificationsData = [];
        this.unreadCount = 0;
        this.isModalOpen = false;
        
        // Initialize when DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            this.initialize();
        });
    }
    
    initialize() {
        // Create notification icon in navbar if it doesn't exist
        this.createNotificationIcon();
        
        // Create notification modal
        this.createNotificationModal();
        
        // Load notifications from Firebase
        this.loadNotifications();
        
        // Listen for new notifications
        this.listenForNewNotifications();
    }
    
    createNotificationIcon() {
        const navbar = document.querySelector('.navbar');
        const refreshButton = document.querySelector('.refresh-button');
        
        if (!navbar || !refreshButton) return;
        
        // Check if notification icon already exists
        if (document.querySelector('.notification-btn')) return;
        
        // Create a container for buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'navbar-buttons';
        buttonContainer.style.cssText = `
            display: flex;
            align-items: center;
        `;
        
        // Create notification button
        const notificationButton = document.createElement('button');
        notificationButton.className = 'notification-btn';
        notificationButton.setAttribute('aria-label', 'Notifications');
        
        // Create notification icon
        const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        iconSvg.setAttribute('class', 'h-6 w-6');
        iconSvg.setAttribute('fill', 'none');
        iconSvg.setAttribute('viewBox', '0 0 24 24');
        iconSvg.setAttribute('stroke', 'currentColor');
        
        const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        iconPath.setAttribute('stroke-linecap', 'round');
        iconPath.setAttribute('stroke-linejoin', 'round');
        iconPath.setAttribute('stroke-width', '2');
        iconPath.setAttribute('d', 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9');
        
        iconSvg.appendChild(iconPath);
        this.notificationIcon = iconSvg;
        
        // Create notification badge
        const badge = document.createElement('span');
        badge.className = 'notification-badge';
        this.notificationBadge = badge;
        
        // Assemble the notification button
        notificationButton.appendChild(iconSvg);
        notificationButton.appendChild(badge);
        
        // Add event listener to open notification modal
        notificationButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleNotificationModal();
        });
        
        // Remove refresh button from navbar
        refreshButton.remove();
        
        // Add both buttons to the container
        buttonContainer.appendChild(notificationButton);
        buttonContainer.appendChild(refreshButton);
        
        // Insert container into navbar
        navbar.appendChild(buttonContainer);
    }
    
    createNotificationModal() {
        // Check if modal already exists
        if (document.getElementById('notificationModal')) return;
        
        // Create modal container
        const modal = document.createElement('div');
        modal.id = 'notificationModal';
        modal.className = 'notification-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 9999;
            display: flex;
            justify-content: center;
            align-items: center;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease, visibility 0.3s ease;
        `;
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'notification-modal-content';
        modalContent.style.cssText = `
            background-color: white;
            border-radius: 1rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            transform: translateY(-20px);
            transition: transform 0.3s ease;
        `;
        
        // Create modal header
        const modalHeader = document.createElement('div');
        modalHeader.className = 'notification-modal-header';
        modalHeader.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            border-bottom: 1px solid #E5E7EB;
        `;
        
        // Create title container for title and delete all button
        const titleContainer = document.createElement('div');
        titleContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 1rem;
        `;
        
        // Create modal title
        const modalTitle = document.createElement('h3');
        modalTitle.textContent = 'Notifications';
        modalTitle.style.cssText = `
            margin: 0;
            font-size: 1.25rem;
            font-weight: 600;
        `;
        
        // Create delete all button
        const deleteAllButton = document.createElement('button');
        deleteAllButton.className = 'delete-all-btn';
        deleteAllButton.textContent = 'Delete All';
        deleteAllButton.style.cssText = `
            background: none;
            border: none;
            font-size: 0.875rem;
            color: #EF4444;
            cursor: pointer;
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
            transition: all 0.2s ease;
        `;
        
        deleteAllButton.addEventListener('mouseover', () => {
            deleteAllButton.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
        });
        
        deleteAllButton.addEventListener('mouseout', () => {
            deleteAllButton.style.backgroundColor = '';
        });
        
        deleteAllButton.addEventListener('click', () => {
            this.deleteAllNotifications();
        });
        
        // Create close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.style.cssText = `
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0;
            color: #4B5563;
        `;
        closeButton.addEventListener('click', () => this.closeNotificationModal());
        
        // Create modal body
        const modalBody = document.createElement('div');
        modalBody.className = 'notification-modal-body';
        modalBody.style.cssText = `
            padding: 1rem;
        `;
        
        // Create notifications list
        const notificationsList = document.createElement('div');
        notificationsList.className = 'notifications-list';
        notificationsList.id = 'notificationsList';
        
        // Assemble modal
        titleContainer.appendChild(modalTitle);
        titleContainer.appendChild(deleteAllButton);
        modalHeader.appendChild(titleContainer);
        modalHeader.appendChild(closeButton);
        modalBody.appendChild(notificationsList);
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        modal.appendChild(modalContent);
        
        // Add event listener to close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeNotificationModal();
            }
        });
        
        // Add modal to body
        document.body.appendChild(modal);
        this.notificationModal = modal;
    }
    
    toggleNotificationModal() {
        if (!this.notificationModal) return;
        
        if (this.isModalOpen) {
            this.closeNotificationModal();
        } else {
            this.openNotificationModal();
        }
    }
    
    openNotificationModal() {
        if (!this.notificationModal) return;
        
        // Mark all notifications as read
        this.markAllAsRead();
        
        // Show modal
        this.notificationModal.style.visibility = 'visible';
        this.notificationModal.style.opacity = '1';
        
        // Animate modal content
        const modalContent = this.notificationModal.querySelector('.notification-modal-content');
        if (modalContent) {
            modalContent.style.transform = 'translateY(0)';
        }
        
        this.isModalOpen = true;
        
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
    }
    
    closeNotificationModal() {
        if (!this.notificationModal) return;
        
        // Animate modal content
        const modalContent = this.notificationModal.querySelector('.notification-modal-content');
        if (modalContent) {
            modalContent.style.transform = 'translateY(-20px)';
        }
        
        // Hide modal
        this.notificationModal.style.opacity = '0';
        
        setTimeout(() => {
            this.notificationModal.style.visibility = 'hidden';
            this.isModalOpen = false;
            
            // Re-enable body scrolling
            document.body.style.overflow = '';
        }, 300);
    }
    
    loadNotifications() {
        // Check if user is logged in
        const user = firebase.auth().currentUser;
        if (!user) {
            // Listen for auth state changes
            firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    this.fetchNotifications(user.uid);
                }
            });
        } else {
            this.fetchNotifications(user.uid);
        }
    }
    
    fetchNotifications(userId) {
        // Get user's notifications
        firebase.database().ref(`notifications/${userId}`)
            .orderByChild('timestamp')
            .limitToLast(20)
            .on('value', (snapshot) => {
                this.notificationsData = [];
                this.unreadCount = 0;
                
                if (snapshot.exists()) {
                    snapshot.forEach((childSnapshot) => {
                        const notification = {
                            id: childSnapshot.key,
                            ...childSnapshot.val()
                        };
                        
                        this.notificationsData.push(notification);
                        
                        // Count unread notifications
                        if (!notification.read) {
                            this.unreadCount++;
                        }
                    });
                    
                    // Sort notifications by timestamp (newest first)
                    this.notificationsData.sort((a, b) => b.timestamp - a.timestamp);
                }
                
                // Update UI
                this.updateNotificationBadge();
                this.renderNotifications();
            });
    }
    
    listenForNewNotifications() {
        // Check if user is logged in
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                // Listen for new notifications
                const notificationsRef = firebase.database().ref(`notifications/${user.uid}`);
                
                notificationsRef.on('child_added', (snapshot) => {
                    const notification = {
                        id: snapshot.key,
                        ...snapshot.val()
                    };
                    
                    // Check if this is a new notification
                    const existingIndex = this.notificationsData.findIndex(n => n.id === notification.id);
                    
                    if (existingIndex === -1) {
                        // Add to notifications array
                        this.notificationsData.unshift(notification);
                        
                        // Update unread count
                        if (!notification.read) {
                            this.unreadCount++;
                            this.updateNotificationBadge();
                        }
                        
                        // Re-render notifications
                        this.renderNotifications();
                        
                        // Show notification toast
                        this.showNotificationToast(notification);
                    }
                });
            }
        });
    }
    
    showNotificationToast(notification) {
        // Use the existing custom alert system
        if (window.customAlert) {
            let message = notification.message;
            
            // Add link if present
            if (notification.link) {
                message += `<div class="notification-toast-link" style="margin-top: 8px;">
                    <a href="${notification.link}" target="_blank" rel="noopener noreferrer" 
                       style="color: #4285f4; text-decoration: none; font-size: 0.875rem; 
                              display: inline-block; padding: 0.3rem 0.5rem; background-color: #f0f4ff; 
                              border-radius: 4px; border: 1px solid #d0e0ff;">
                        ${notification.linkText || notification.link}
                    </a>
                </div>`;
            }
            
            window.customAlert.info(message, {
                title: notification.title || 'New Notification',
                autoClose: true,
                duration: 5000,
                isHTML: notification.link ? true : false
            });
        }
    }
    
    renderNotifications() {
        const notificationsList = document.getElementById('notificationsList');
        if (!notificationsList) return;
        
        // Clear existing notifications
        notificationsList.innerHTML = '';
        
        if (this.notificationsData.length === 0) {
            // Show empty state
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-notifications';
            emptyState.style.cssText = `
                text-align: center;
                padding: 2rem 1rem;
                color: #6B7280;
            `;
            
            const emptyIcon = document.createElement('div');
            emptyIcon.innerHTML = '🔔';
            emptyIcon.style.cssText = `
                font-size: 2rem;
                margin-bottom: 0.5rem;
            `;
            
            const emptyText = document.createElement('p');
            emptyText.textContent = 'No notifications yet';
            emptyText.style.margin = '0';
            
            emptyState.appendChild(emptyIcon);
            emptyState.appendChild(emptyText);
            notificationsList.appendChild(emptyState);
            return;
        }
        
        // Render each notification
        this.notificationsData.forEach((notification) => {
            const notificationItem = document.createElement('div');
            notificationItem.className = `notification-item ${notification.read ? '' : 'unread'}`;
            notificationItem.style.cssText = `
                padding: 1rem;
                border-bottom: 1px solid #E5E7EB;
                cursor: pointer;
                transition: background-color 0.2s ease;
                position: relative;
                display: flex;
                justify-content: space-between;
            `;
            
            if (!notification.read) {
                notificationItem.style.backgroundColor = '#F3F4F6';
                
                // Add unread indicator
                const unreadIndicator = document.createElement('div');
                unreadIndicator.className = 'unread-indicator';
                unreadIndicator.style.cssText = `
                    position: absolute;
                    top: 1rem;
                    left: 0.5rem;
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
                `;
                
                notificationItem.appendChild(unreadIndicator);
            }
            
            // Add hover effect
            notificationItem.addEventListener('mouseover', () => {
                notificationItem.style.backgroundColor = notification.read ? '#F9FAFB' : '#EFF6FF';
            });
            
            notificationItem.addEventListener('mouseout', () => {
                notificationItem.style.backgroundColor = notification.read ? '' : '#F3F4F6';
            });
            
            // Create notification content
            const notificationContent = document.createElement('div');
            notificationContent.className = 'notification-content';
            notificationContent.style.cssText = `
                flex: 1;
                padding-right: 1rem;
            `;
            
            // Add click event to mark as read
            notificationContent.addEventListener('click', () => {
                this.markAsRead(notification.id);
            });
            
            // Create notification title
            if (notification.title) {
                const notificationTitle = document.createElement('h4');
                notificationTitle.className = 'notification-title';
                notificationTitle.textContent = notification.title;
                notificationTitle.style.cssText = `
                    margin: 0 0 0.25rem 0;
                    font-size: 1rem;
                    font-weight: 600;
                    color: #111827;
                `;
                notificationContent.appendChild(notificationTitle);
            }
            
            // Create notification message
            const notificationMessage = document.createElement('p');
            notificationMessage.className = 'notification-message';
            notificationMessage.textContent = notification.message;
            notificationMessage.style.cssText = `
                margin: 0;
                color: #4B5563;
                font-size: 0.875rem;
            `;
            
            // Add link if present
            if (notification.link) {
                const linkContainer = document.createElement('div');
                linkContainer.className = 'notification-link';
                linkContainer.style.cssText = `
                    margin-top: 0.5rem;
                `;
                
                const link = document.createElement('a');
                link.href = notification.link;
                link.textContent = notification.linkText || notification.link;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.style.cssText = `
                    color: #4285f4;
                    text-decoration: none;
                    font-size: 0.875rem;
                    display: inline-block;
                    padding: 0.3rem 0.5rem;
                    background-color: #f0f4ff;
                    border-radius: 4px;
                    border: 1px solid #d0e0ff;
                    transition: all 0.2s ease;
                `;
                
                link.addEventListener('mouseover', () => {
                    link.style.backgroundColor = '#e0ebff';
                    link.style.textDecoration = 'underline';
                });
                
                link.addEventListener('mouseout', () => {
                    link.style.backgroundColor = '#f0f4ff';
                    link.style.textDecoration = 'none';
                });
                
                // Stop propagation to prevent marking as read when clicking the link
                link.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
                
                linkContainer.appendChild(link);
                notificationContent.appendChild(notificationMessage);
                notificationContent.appendChild(linkContainer);
            } else {
                notificationContent.appendChild(notificationMessage);
            }
            
            // Create notification time
            const notificationTime = document.createElement('div');
            notificationTime.className = 'notification-time';
            notificationTime.textContent = this.formatTimestamp(notification.timestamp);
            notificationTime.style.cssText = `
                margin-top: 0.5rem;
                font-size: 0.75rem;
                color: #6B7280;
            `;
            
            // Create delete button
            const deleteButton = document.createElement('button');
            deleteButton.className = 'notification-delete-btn';
            deleteButton.setAttribute('aria-label', 'Delete notification');
            deleteButton.style.cssText = `
                background: none;
                border: none;
                cursor: pointer;
                padding: 0.25rem;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                color: #9CA3AF;
                transition: all 0.2s ease;
                align-self: flex-start;
                opacity: 0.7;
            `;
            
            // Create delete icon
            const deleteIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            deleteIcon.setAttribute('width', '16');
            deleteIcon.setAttribute('height', '16');
            deleteIcon.setAttribute('viewBox', '0 0 24 24');
            deleteIcon.setAttribute('fill', 'none');
            deleteIcon.setAttribute('stroke', 'currentColor');
            deleteIcon.setAttribute('stroke-width', '2');
            deleteIcon.setAttribute('stroke-linecap', 'round');
            deleteIcon.setAttribute('stroke-linejoin', 'round');
            
            const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path1.setAttribute('d', 'M3 6h18');
            deleteIcon.appendChild(path1);
            
            const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path2.setAttribute('d', 'M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2');
            deleteIcon.appendChild(path2);
            
            deleteButton.appendChild(deleteIcon);
            
            // Add hover effect for delete button
            deleteButton.addEventListener('mouseover', () => {
                deleteButton.style.color = '#EF4444';
                deleteButton.style.opacity = '1';
            });
            
            deleteButton.addEventListener('mouseout', () => {
                deleteButton.style.color = '#9CA3AF';
                deleteButton.style.opacity = '0.7';
            });
            
            // Add click event to delete notification
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteNotification(notification.id);
            });
            
            // Assemble notification item
            notificationContent.appendChild(notificationTime);
            notificationItem.appendChild(notificationContent);
            notificationItem.appendChild(deleteButton);
            notificationsList.appendChild(notificationItem);
        });
    }
    
    updateNotificationBadge() {
        if (!this.notificationBadge) return;
        
        if (this.unreadCount > 0) {
            this.notificationBadge.textContent = this.unreadCount > 9 ? '9+' : this.unreadCount;
            this.notificationBadge.style.opacity = '1';
            
            // Add pulse animation
            this.notificationBadge.style.animation = 'pulse 2s infinite';
            
            // Add CSS for pulse animation if it doesn't exist
            if (!document.getElementById('notification-pulse-animation')) {
                const style = document.createElement('style');
                style.id = 'notification-pulse-animation';
                style.textContent = `
                    @keyframes pulse {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.1); }
                        100% { transform: scale(1); }
                    }
                `;
                document.head.appendChild(style);
            }
        } else {
            this.notificationBadge.style.opacity = '0';
            this.notificationBadge.style.animation = '';
        }
    }
    
    markAsRead(notificationId) {
        const user = firebase.auth().currentUser;
        if (!user) return;
        
        // Update in Firebase
        firebase.database().ref(`notifications/${user.uid}/${notificationId}`).update({
            read: true
        });
        
        // Update local data
        const notification = this.notificationsData.find(n => n.id === notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            this.unreadCount = Math.max(0, this.unreadCount - 1);
            this.updateNotificationBadge();
            this.renderNotifications();
        }
    }
    
    markAllAsRead() {
        const user = firebase.auth().currentUser;
        if (!user) return;
        
        // Update all unread notifications
        const updates = {};
        this.notificationsData.forEach(notification => {
            if (!notification.read) {
                updates[`notifications/${user.uid}/${notification.id}/read`] = true;
                notification.read = true;
            }
        });
        
        // Update in Firebase
        if (Object.keys(updates).length > 0) {
            firebase.database().ref().update(updates);
            
            // Reset unread count
            this.unreadCount = 0;
            this.updateNotificationBadge();
            this.renderNotifications();
        }
    }
    
    formatTimestamp(timestamp) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffSec < 60) {
            return 'Just now';
        } else if (diffMin < 60) {
            return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
        } else if (diffHour < 24) {
            return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
        } else if (diffDay < 7) {
            return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
    
    deleteNotification(notificationId) {
        const user = firebase.auth().currentUser;
        if (!user) return;
        
        // Use custom alert instead of standard confirm
        if (window.customAlert) {
            window.customAlert.confirm(
                'Are you sure you want to delete this notification?', 
                // Pass the function directly as second parameter
                () => {
                    // Delete from Firebase
                    firebase.database().ref(`notifications/${user.uid}/${notificationId}`).remove()
                        .then(() => {
                            // Update local data
                            const notificationIndex = this.notificationsData.findIndex(n => n.id === notificationId);
                            if (notificationIndex !== -1) {
                                const notification = this.notificationsData[notificationIndex];
                                
                                // Update unread count if needed
                                if (!notification.read) {
                                    this.unreadCount = Math.max(0, this.unreadCount - 1);
                                    this.updateNotificationBadge();
                                }
                                
                                // Remove from array
                                this.notificationsData.splice(notificationIndex, 1);
                                this.renderNotifications();
                                
                                // Show success message
                                window.customAlert.success('Notification deleted');
                            }
                        })
                        .catch(error => {
                            console.error('Error deleting notification:', error);
                            window.customAlert.error('Failed to delete notification');
                        });
                }
            );
        }
    }
    
    deleteAllNotifications() {
        const user = firebase.auth().currentUser;
        if (!user) return;
        
        // Use custom alert instead of standard confirm
        if (window.customAlert) {
            window.customAlert.confirm(
                'Are you sure you want to delete all notifications?', 
                // Pass the function directly as second parameter
                () => {
                    // Delete all notifications from Firebase
                    firebase.database().ref(`notifications/${user.uid}`).remove()
                        .then(() => {
                            // Clear local data
                            this.notificationsData = [];
                            this.unreadCount = 0;
                            
                            // Update UI
                            this.updateNotificationBadge();
                            this.renderNotifications();
                            
                            // Show success message
                            window.customAlert.success('All notifications deleted');
                        })
                        .catch(error => {
                            console.error('Error deleting all notifications:', error);
                            window.customAlert.error('Failed to delete notifications');
                        });
                }
            );
        }
    }
}

// Initialize notification system
const notificationSystem = new NotificationSystem();

// Export for admin panel
window.notificationSystem = notificationSystem; 