// Custom Alert System
class CustomAlert {
    constructor() {
        this.container = document.createElement('div');
        this.container.id = 'custom-alert-container';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        `;
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', options = {}) {
        const {
            title = '',
            confirmText = 'OK',
            cancelText = 'Cancel',
            showCancel = false,
            onConfirm = () => {},
            onCancel = () => {},
            autoClose = false,
            duration = 3000
        } = options;

        // Disable scrolling
        document.body.style.overflow = 'hidden';

        const alertBox = document.createElement('div');
        alertBox.className = 'custom-alert-box';
        alertBox.style.cssText = `
            background: white;
            padding: 1.5rem;
            border-radius: 1rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            max-width: 90%;
            width: 400px;
            transform: translateY(-20px);
            opacity: 0;
            transition: all 0.3s ease;
        `;

        // Set background color based on type
        const typeColors = {
            success: '#10B981',
            error: '#EF4444',
            warning: '#F59E0B',
            info: '#3B82F6'
        };

        const iconMap = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        alertBox.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                <span style="font-size: 1.5rem;">${iconMap[type]}</span>
                ${title ? `<h3 style="margin: 0; font-size: 1.25rem; font-weight: 600;">${title}</h3>` : ''}
            </div>
            <p style="margin: 0 0 1.5rem 0; color: #4B5563;">${message}</p>
            <div style="display: flex; justify-content: flex-end; gap: 1rem;">
                ${showCancel ? `
                    <button class="cancel-btn" style="
                        padding: 0.5rem 1rem;
                        border: 1px solid #E5E7EB;
                        border-radius: 0.5rem;
                        background: white;
                        color: #4B5563;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    ">${cancelText}</button>
                ` : ''}
                <button class="confirm-btn" style="
                    padding: 0.5rem 1rem;
                    border: none;
                    border-radius: 0.5rem;
                    background: ${typeColors[type]};
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s ease;
                ">${confirmText}</button>
            </div>
        `;

        this.container.appendChild(alertBox);
        this.container.style.opacity = '1';
        this.container.style.visibility = 'visible';
        
        // Animate in
        setTimeout(() => {
            alertBox.style.transform = 'translateY(0)';
            alertBox.style.opacity = '1';
        }, 10);

        // Add event listeners
        const confirmBtn = alertBox.querySelector('.confirm-btn');
        const cancelBtn = alertBox.querySelector('.cancel-btn');

        confirmBtn.addEventListener('click', () => {
            this.close(alertBox);
            onConfirm();
        });

        if (showCancel) {
            cancelBtn.addEventListener('click', () => {
                this.close(alertBox);
                onCancel();
            });
        }

        // Auto close if enabled
        if (autoClose) {
            setTimeout(() => {
                this.close(alertBox);
            }, duration);
        }

        // Add hover effects
        confirmBtn.addEventListener('mouseover', () => {
            confirmBtn.style.opacity = '0.9';
        });
        confirmBtn.addEventListener('mouseout', () => {
            confirmBtn.style.opacity = '1';
        });

        if (showCancel) {
            cancelBtn.addEventListener('mouseover', () => {
                cancelBtn.style.backgroundColor = '#F3F4F6';
            });
            cancelBtn.addEventListener('mouseout', () => {
                cancelBtn.style.backgroundColor = 'white';
            });
        }
    }

    close(alertBox) {
        alertBox.style.transform = 'translateY(-20px)';
        alertBox.style.opacity = '0';
        
        setTimeout(() => {
            alertBox.remove();
            if (this.container.children.length === 0) {
                this.container.style.opacity = '0';
                this.container.style.visibility = 'hidden';
                // Re-enable scrolling
                document.body.style.overflow = '';
            }
        }, 300);
    }

    // Add confirm method to the class
    confirm(message, onConfirm, onCancel) {
        this.show(message, 'info', {
            showCancel: true,
            onConfirm,
            onCancel
        });
    }

    // Add info method to the class
    info(message, options = {}) {
        this.show(message, 'info', {
            autoClose: true,
            duration: 3000,
            ...options
        });
    }
}

// Create global instance
window.customAlert = new CustomAlert();

// Override default alert
window.alert = function(message) {
    window.customAlert.show(message, 'info', {
        autoClose: true,
        duration: 3000
    });
};

// Add success method
window.customAlert.success = function(message, options = {}) {
    window.customAlert.show(message, 'success', {
        autoClose: true,
        duration: 3000,
        ...options
    });
};

// Add error method
window.customAlert.error = function(message, options = {}) {
    window.customAlert.show(message, 'error', {
        autoClose: true,
        duration: 4000,
        ...options
    });
};

// Add warning method
window.customAlert.warning = function(message, options = {}) {
    window.customAlert.show(message, 'warning', {
        autoClose: true,
        duration: 4000,
        ...options
    });
};

// Add info method
window.customAlert.info = function(message, options = {}) {
    window.customAlert.show(message, 'info', {
        autoClose: true,
        duration: 3000,
        ...options
    });
}; 