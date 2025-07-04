// ZK-PRET API utilities
const zkpretAPI = {
    baseURL: 'http://localhost:3000',  // Changed from 8080 to 3000
    
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseURL}/api/v1/health`);
            return await response.json();
        } catch (error) {
            throw new Error(`Health check failed: ${error.message}`);
        }
    },
    
    async executeTool(toolName, parameters) {
        try {
            const response = await fetch(`${this.baseURL}/api/v1/tools/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    toolName: toolName,
                    parameters: parameters
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            throw new Error(`Tool execution failed: ${error.message}`);
        }
    },
    
    async getComposedProofTemplates() {
        try {
            const response = await fetch(`${this.baseURL}/api/v1/composed-proofs/templates`);
            return await response.json();
        } catch (error) {
            throw new Error(`Failed to get templates: ${error.message}`);
        }
    }
};

// Simple notifications system
const notifications = {
    show(title, message, type = 'info') {
        const container = document.getElementById('notifications');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} mb-2 p-4 rounded-lg shadow-lg max-w-sm`;
        
        const colors = {
            success: 'bg-green-100 border-green-500 text-green-800',
            error: 'bg-red-100 border-red-500 text-red-800',
            warning: 'bg-yellow-100 border-yellow-500 text-yellow-800',
            info: 'bg-blue-100 border-blue-500 text-blue-800'
        };
        
        notification.className += ` ${colors[type]} border-l-4`;
        
        notification.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <div class="font-semibold">${title}</div>
                    <div class="text-sm mt-1">${message}</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        container.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    },
    
    success(title, message) {
        this.show(title, message, 'success');
    },
    
    error(title, message) {
        this.show(title, message, 'error');
    },
    
    warning(title, message) {
        this.show(title, message, 'warning');
    },
    
    info(title, message) {
        this.show(title, message, 'info');
    }
};

// Make API and notifications available globally
window.zkpretAPI = zkpretAPI;
window.notifications = notifications;