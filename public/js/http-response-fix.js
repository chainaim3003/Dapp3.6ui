/**
 * HTTP Response Display Fix for ZK-PRET
 * This script fixes the issue where HTTP responses are captured but not displayed in the UI
 */

console.log('🔧 Loading HTTP Response Display Fix...');

// Direct fix for HTTP response display
function fixHttpResponseDisplay() {
    
    // Override the updateHttpResponseUI method to ensure container shows
    function patchUpdateHttpResponseUI() {
        if (!window.app) return false;
        
        const originalMethod = window.app.updateHttpResponseUI;
        
        window.app.updateHttpResponseUI = function() {
            console.log('📊 updateHttpResponseUI called with data:', !!this.lastHttpResponseData);
            
            if (!this.lastHttpResponseData) {
                console.log('❌ No HTTP response data available');
                return;
            }
            
            try {
                const container = document.getElementById('http-resp-container');
                console.log('🔍 HTTP Response container found:', !!container);
                
                if (container) {
                    // Force show the container
                    container.style.display = 'block';
                    container.classList.add('http-resp-container-animated');
                    console.log('✅ HTTP Response container made visible');
                    
                    // Update summary immediately
                    updateHttpResponseSummary();
                    
                    // Show notification
                    this.showNotification(
                        'HTTP Response Available',
                        'Response details captured and displayed in sidebar',
                        'info'
                    );
                    
                    console.log('✅ HTTP Response UI updated successfully');
                } else {
                    console.error('❌ HTTP Response container not found in DOM');
                }
                
            } catch (error) {
                console.error('❌ Error updating HTTP response UI:', error);
            }
        };
        
        return true;
    }
    
    // Direct summary update function
    function updateHttpResponseSummary() {
        if (!window.app || !window.app.lastHttpResponseData) return;
        
        const data = window.app.lastHttpResponseData;
        console.log('📋 Updating HTTP response summary with:', data.response.status);
        
        // Update status
        const statusEl = document.getElementById('http-resp-status');
        if (statusEl) {
            statusEl.textContent = `${data.response.status} ${data.response.statusText}`;
            statusEl.className = `http-resp-status-badge ${getStatusClass(data.response.status)}`;
        }
        
        // Update timing
        const timeEl = document.getElementById('http-resp-time');
        if (timeEl) {
            timeEl.textContent = data.response.time;
        }
        
        // Update size
        const sizeEl = document.getElementById('http-resp-size');
        if (sizeEl) {
            sizeEl.textContent = formatBytes(data.response.size);
        }
        
        // Update content type
        const contentTypeEl = document.getElementById('http-resp-content-type');
        if (contentTypeEl) {
            const contentType = data.response.headers['content-type'] || 
                              data.response.headers['Content-Type'] || 
                              'unknown';
            contentTypeEl.textContent = contentType.split(';')[0];
        }
        
        console.log('✅ HTTP response summary updated');
    }
    
    // Helper function for status class
    function getStatusClass(status) {
        if (status >= 200 && status < 300) return 'http-resp-status-2xx';
        if (status >= 300 && status < 400) return 'http-resp-status-3xx';
        if (status >= 400 && status < 500) return 'http-resp-status-4xx';
        if (status >= 500) return 'http-resp-status-5xx';
        return 'http-resp-status-error';
    }
    
    // Helper function for formatting bytes
    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    // Hook into execution results display to trigger HTTP response display
    function hookIntoExecutionResults() {
        const originalDisplayResult = window.app.displayResult;
        
        window.app.displayResult = function(result) {
            console.log('🎯 displayResult called, checking for HTTP response data');
            
            // Call original method first
            if (originalDisplayResult) {
                originalDisplayResult.call(this, result);
            }
            
            // Then check and display HTTP response if available
            setTimeout(() => {
                if (this.lastHttpResponseData) {
                    console.log('📡 HTTP response data found, displaying container');
                    this.updateHttpResponseUI();
                } else {
                    console.log('⚠️ No HTTP response data available after execution');
                }
            }, 100);
        };
        
        console.log('✅ Hooked into displayResult method');
    }
    
    // Wait for app to be ready and apply patches
    function waitForApp() {
        if (window.app) {
            console.log('🎯 App found, applying HTTP response fixes...');
            
            if (patchUpdateHttpResponseUI()) {
                console.log('✅ updateHttpResponseUI patched');
            }
            
            hookIntoExecutionResults();
            
            // Add manual test function
            window.app.debugHttpResponse = function() {
                console.log('🐛 HTTP Response Debug Info:');
                console.log('- httpResponseEnabled:', this.httpResponseEnabled);
                console.log('- lastHttpResponseData:', this.lastHttpResponseData);
                console.log('- container exists:', !!document.getElementById('http-resp-container'));
                
                const container = document.getElementById('http-resp-container');
                if (container) {
                    console.log('- container display:', container.style.display);
                    console.log('- container classes:', container.className);
                }
                
                // Force show if data exists
                if (this.lastHttpResponseData) {
                    console.log('🔧 Forcing HTTP response display...');
                    this.updateHttpResponseUI();
                }
            };
            
            // Add force trigger function
            window.app.triggerHttpResponseDisplay = function() {
                console.log('🚀 Manually triggering HTTP response display...');
                const container = document.getElementById('http-resp-container');
                if (container) {
                    container.style.display = 'block';
                    container.classList.add('http-resp-container-animated');
                    
                    if (this.lastHttpResponseData) {
                        updateHttpResponseSummary();
                    } else {
                        // Create mock data for testing
                        this.lastHttpResponseData = {
                            request: {
                                method: 'POST',
                                url: '/api/v1/tools/execute',
                                headers: { 'Content-Type': 'application/json' },
                                body: '{"toolName":"test","parameters":{}}',
                                timestamp: new Date().toISOString()
                            },
                            response: {
                                status: 200,
                                statusText: 'OK',
                                headers: { 'content-type': 'application/json' },
                                body: '{"success":true,"message":"Test"}',
                                size: 45,
                                time: '123ms'
                            },
                            result: { success: true },
                            success: true
                        };
                        updateHttpResponseSummary();
                    }
                    
                    this.showNotification(
                        'HTTP Response Triggered',
                        'HTTP response container manually displayed',
                        'success'
                    );
                    
                    console.log('✅ HTTP response display triggered');
                }
            };
            
            console.log('✅ All HTTP response fixes applied successfully');
            console.log('💡 Use window.app.debugHttpResponse() to debug');
            console.log('💡 Use window.app.triggerHttpResponseDisplay() to force display');
            
        } else {
            console.log('⏳ Waiting for app to initialize...');
            setTimeout(waitForApp, 100);
        }
    }
    
    // Start the fix process
    waitForApp();
}

// Add global functions for easy testing
window.debugHttpResponse = function() {
    if (window.app && window.app.debugHttpResponse) {
        window.app.debugHttpResponse();
    } else {
        console.log('❌ debugHttpResponse not available');
    }
};

window.triggerHttpResponse = function() {
    if (window.app && window.app.triggerHttpResponseDisplay) {
        window.app.triggerHttpResponseDisplay();
    } else {
        console.log('❌ triggerHttpResponseDisplay not available');
    }
};

// Auto-apply fix when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixHttpResponseDisplay);
} else {
    fixHttpResponseDisplay();
}

console.log('✅ HTTP Response Display Fix loaded');
console.log('💡 Use debugHttpResponse() to check status');
console.log('💡 Use triggerHttpResponse() to force display');
