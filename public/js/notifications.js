// Simple notification system for ZK-PRET
class SimpleNotifications {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create notification container if it doesn't exist
        this.container = document.getElementById('notifications');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notifications';
            this.container.className = 'fixed top-4 right-4 z-50 space-y-2';
            document.body.appendChild(this.container);
        }
    }

    show(title, message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} max-w-sm p-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full`;
        
        const colors = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            warning: 'bg-yellow-500 text-white',
            info: 'bg-blue-500 text-white'
        };

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        notification.className += ` ${colors[type] || colors.info}`;
        
        notification.innerHTML = `
            <div class="flex items-start">
                <i class="${icons[type] || icons.info} mr-3 mt-1"></i>
                <div class="flex-1">
                    <div class="font-semibold">${title}</div>
                    <div class="text-sm opacity-90">${message}</div>
                </div>
                <button class="ml-3 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        this.container.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.remove(notification);
            }, duration);
        }

        return notification;
    }

    remove(notification) {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    success(title, message, duration = 5000) {
        return this.show(title, message, 'success', duration);
    }

    error(title, message, duration = 7000) {
        return this.show(title, message, 'error', duration);
    }

    warning(title, message, duration = 6000) {
        return this.show(title, message, 'warning', duration);
    }

    info(title, message, duration = 5000) {
        return this.show(title, message, 'info', duration);
    }
}

// Initialize notifications system
if (!window.notifications) {
    window.notifications = new SimpleNotifications();
}
