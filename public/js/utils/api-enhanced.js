// Enhanced ZK-PRET API utilities with proper async job handling
const zkpretAPIEnhanced = {
    baseURL: 'http://localhost:3000',
    
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseURL}/api/v1/health`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Health check failed:', error);
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
            
            const result = await response.json();
            console.log('🔧 Tool execution result:', result);
            return result;
        } catch (error) {
            console.error('❌ Tool execution failed:', error);
            throw new Error(`Tool execution failed: ${error.message}`);
        }
    },
    
    async startAsyncJob(jobId, toolName, parameters) {
        try {
            const response = await fetch(`${this.baseURL}/api/v1/jobs/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jobId: jobId,
                    toolName: toolName,
                    parameters: parameters
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('🚀 Async job started:', result);
            return result;
        } catch (error) {
            console.error('❌ Failed to start async job:', error);
            throw new Error(`Failed to start async job: ${error.message}`);
        }
    },
    
    async getJobStatus(jobId) {
        try {
            const response = await fetch(`${this.baseURL}/api/v1/jobs/${jobId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('❌ Failed to get job status:', error);
            throw new Error(`Failed to get job status: ${error.message}`);
        }
    },
    
    async getAllJobs() {
        try {
            const response = await fetch(`${this.baseURL}/api/v1/jobs`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('❌ Failed to get jobs:', error);
            throw new Error(`Failed to get jobs: ${error.message}`);
        }
    },
    
    async clearCompletedJobs() {
        try {
            const response = await fetch(`${this.baseURL}/api/v1/jobs/completed`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('❌ Failed to clear completed jobs:', error);
            throw new Error(`Failed to clear completed jobs: ${error.message}`);
        }
    },
    
    async getComposedProofTemplates() {
        try {
            const response = await fetch(`${this.baseURL}/api/v1/composed-proofs/templates`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('❌ Failed to get templates:', error);
            throw new Error(`Failed to get templates: ${error.message}`);
        }
    },
    
    async executeComposedProof(composedProofRequest) {
        try {
            const response = await fetch(`${this.baseURL}/api/v1/composed-proofs/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(composedProofRequest)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('❌ Composed proof execution failed:', error);
            throw new Error(`Composed proof execution failed: ${error.message}`);
        }
    },
    
    async getServerStatus() {
        try {
            const response = await fetch(`${this.baseURL}/api/v1/status`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('❌ Failed to get server status:', error);
            throw new Error(`Failed to get server status: ${error.message}`);
        }
    },
    
    // Utility method to check if async jobs are enabled
    async isAsyncEnabled() {
        try {
            const status = await this.getServerStatus();
            return status.asyncEnabled === true;
        } catch (error) {
            console.warn('Could not determine async status:', error.message);
            return false;
        }
    }
};

// Enhanced notifications system with better styling and functionality
const notificationsEnhanced = {
    container: null,
    
    init() {
        // Create notifications container if it doesn't exist
        this.container = document.getElementById('notifications');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notifications';
            this.container.className = 'fixed top-4 right-4 z-50 space-y-2';
            document.body.appendChild(this.container);
        }
        return this.container;
    },
    
    show(title, message, type = 'info', duration = 5000) {
        const container = this.init();
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} transform transition-all duration-300 ease-in-out translate-x-full opacity-0`;
        
        const colors = {
            success: 'bg-green-50 border-green-200 text-green-800',
            error: 'bg-red-50 border-red-200 text-red-800',
            warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
            info: 'bg-blue-50 border-blue-200 text-blue-800'
        };
        
        const icons = {
            success: 'fa-check-circle text-green-600',
            error: 'fa-exclamation-circle text-red-600',
            warning: 'fa-exclamation-triangle text-yellow-600',
            info: 'fa-info-circle text-blue-600'
        };
        
        notification.className += ` ${colors[type]} border-l-4 rounded-lg shadow-lg max-w-sm p-4`;
        
        notification.innerHTML = `
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    <i class="fas ${icons[type]} text-lg"></i>
                </div>
                <div class="ml-3 flex-1">
                    <div class="font-semibold text-sm">${title}</div>
                    <div class="text-sm mt-1">${message}</div>
                </div>
                <div class="ml-4 flex-shrink-0">
                    <button onclick="this.closest('.notification').remove()" class="text-gray-400 hover:text-gray-600 focus:outline-none">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full', 'opacity-0');
            notification.classList.add('translate-x-0', 'opacity-100');
        }, 10);
        
        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                this.remove(notification);
            }, duration);
        }
        
        return notification;
    },
    
    remove(notification) {
        if (notification && notification.parentElement) {
            notification.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    },
    
    success(title, message, duration = 5000) {
        return this.show(title, message, 'success', duration);
    },
    
    error(title, message, duration = 7000) {
        return this.show(title, message, 'error', duration);
    },
    
    warning(title, message, duration = 6000) {
        return this.show(title, message, 'warning', duration);
    },
    
    info(title, message, duration = 5000) {
        return this.show(title, message, 'info', duration);
    },
    
    // Persistent notification (doesn't auto-remove)
    persist(title, message, type = 'info') {
        return this.show(title, message, type, 0);
    },
    
    // Clear all notifications
    clear() {
        if (this.container) {
            const notifications = this.container.querySelectorAll('.notification');
            notifications.forEach(notification => this.remove(notification));
        }
    }
};

// WebSocket Manager for handling real-time job updates
class WebSocketManager {
    constructor(url = 'ws://localhost:3000') {
        this.url = url;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000;
        this.listeners = new Map();
        this.isConnected = false;
    }
    
    connect() {
        try {
            this.ws = new WebSocket(this.url);
            
            this.ws.onopen = () => {
                console.log('✅ WebSocket connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.emit('connected');
                notificationsEnhanced.success('Connected', 'Real-time updates enabled');
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📨 WebSocket message:', data);
                    this.emit('message', data);
                    
                    if (data.type) {
                        this.emit(data.type, data);
                    }
                } catch (error) {
                    console.error('❌ WebSocket message parsing error:', error);
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                this.isConnected = false;
                this.emit('error', error);
            };
            
            this.ws.onclose = () => {
                console.log('🔌 WebSocket disconnected');
                this.isConnected = false;
                this.emit('disconnected');
                this.handleReconnect();
            };
            
        } catch (error) {
            console.error('❌ WebSocket connection failed:', error);
            this.handleReconnect();
        }
    }
    
    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('❌ Maximum reconnection attempts reached');
            notificationsEnhanced.error(
                'Connection Lost', 
                'Real-time updates unavailable. Please refresh the page.',
                0 // Persistent notification
            );
        }
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }
    
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
            return true;
        } else {
            console.warn('⚠️ WebSocket not connected, cannot send message');
            return false;
        }
    }
    
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ Error in WebSocket event handler for ${event}:`, error);
                }
            });
        }
    }
    
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts,
            url: this.url
        };
    }
}

// Make enhanced utilities available globally
window.zkpretAPI = zkpretAPIEnhanced;
window.notifications = notificationsEnhanced;
window.WebSocketManager = WebSocketManager;

// Backwards compatibility
window.zkpretAPIEnhanced = zkpretAPIEnhanced;
window.notificationsEnhanced = notificationsEnhanced;

console.log('✅ Enhanced ZK-PRET API utilities loaded');
