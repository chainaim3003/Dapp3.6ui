/**
 * HTTP Response Enhancement for ZK-PRET Application
 * This module enhances the HTTP response display functionality
 * to ensure it shows properly below execution results in the sidebar
 */

// Enhanced updateHttpResponseUI method
function enhanceUpdateHttpResponseUI() {
    if (!window.app) {
        console.warn('App instance not found for HTTP response enhancement');
        return;
    }

    const originalUpdateMethod = window.app.updateHttpResponseUI;
    
    window.app.updateHttpResponseUI = function() {
        if (!this.lastHttpResponseData) return;
        
        try {
            const container = document.getElementById('http-resp-container');
            if (container) {
                // Show the container with animation
                container.style.display = 'block';
                container.classList.add('http-resp-container-animated');
                console.log('🔍 HTTP Response container shown with animation');
            }
            
            // Update summary
            this.updateHttpResponseSummary();
            
            // Update detailed view if visible
            if (this.httpRespDetailedViewVisible) {
                this.updateHttpResponseDetails();
            }
            
            // Show notification to user about HTTP response availability
            this.showNotification(
                'HTTP Response Captured',
                'Response details are now available in the sidebar below execution results',
                'info'
            );
            
        } catch (error) {
            console.warn('HTTP Response UI update failed (non-critical):', error);
        }
    };

    console.log('✅ HTTP Response UI enhancement applied');
}

// Enhanced capture method that ensures visibility
function enhanceCaptureHttpResponse() {
    if (!window.app) {
        console.warn('App instance not found for HTTP response capture enhancement');
        return;
    }

    const originalCaptureMethod = window.app.captureHttpResponseSafely;
    
    window.app.captureHttpResponseSafely = function(requestDetails, response, responseTime, responseText, result) {
        if (!this.httpResponseEnabled) return;
        
        console.log('📝 HTTP Response captured (Enhanced):', {
            status: response?.status,
            responseTime: Math.round(responseTime) + 'ms',
            bodySize: responseText ? responseText.length : 0
        });
        
        try {
            // Safely extract response headers
            let headers = {};
            if (response && response.headers) {
                if (typeof response.headers.forEach === 'function') {
                    response.headers.forEach((value, key) => {
                        headers[key] = value;
                    });
                } else if (typeof response.headers.entries === 'function') {
                    for (const [key, value] of response.headers.entries()) {
                        headers[key] = value;
                    }
                }
            }
            
            const responseData = {
                request: {
                    method: requestDetails.method || 'POST',
                    url: requestDetails.url || '/api/v1/tools/execute',
                    headers: requestDetails.headers || {},
                    body: JSON.stringify(requestDetails.body, null, 2),
                    timestamp: requestDetails.timestamp || new Date().toISOString()
                },
                response: {
                    status: response?.status || 0,
                    statusText: response?.statusText || 'Unknown',
                    headers: headers,
                    body: responseText || '',
                    size: responseText ? responseText.length : 0,
                    time: Math.round(responseTime) + 'ms'
                },
                result: result,
                success: result?.success !== false && (response?.status >= 200 && response?.status < 300)
            };
            
            this.lastHttpResponseData = responseData;
            
            // Add to history
            if (this.addToHttpResponseHistory) {
                this.addToHttpResponseHistory(responseData);
            }
            
            // Force update UI with a slight delay to ensure DOM is ready
            setTimeout(() => {
                this.updateHttpResponseUI();
            }, 100);
            
        } catch (error) {
            console.warn('HTTP Response capture failed (non-critical):', error);
        }
    };

    console.log('✅ HTTP Response capture enhancement applied');
}

// Force show HTTP response container method for manual activation
function addForceShowMethod() {
    if (!window.app) {
        console.warn('App instance not found for force show method');
        return;
    }

    window.app.forceShowHttpResponseContainer = function() {
        const container = document.getElementById('http-resp-container');
        if (container) {
            container.style.display = 'block';
            container.classList.add('http-resp-container-animated');
            console.log('✅ HTTP Response container force-shown');
        }
    };

    console.log('✅ Force show HTTP response method added');
}

// Test method to verify HTTP response functionality
function addTestMethod() {
    if (!window.app) {
        console.warn('App instance not found for test method');
        return;
    }

    window.app.testHttpResponseDisplay = function() {
        console.log('🧪 Testing HTTP Response Display...');
        
        // Create mock HTTP response data
        const mockResponseData = {
            request: {
                method: 'POST',
                url: '/api/v1/tools/execute',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toolName: 'test', parameters: {} }, null, 2),
                timestamp: new Date().toISOString()
            },
            response: {
                status: 200,
                statusText: 'OK',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ success: true, message: 'Test response' }),
                size: 45,
                time: '1234ms'
            },
            result: { success: true, message: 'Test response' },
            success: true
        };
        
        this.lastHttpResponseData = mockResponseData;
        this.updateHttpResponseUI();
        
        console.log('✅ HTTP Response test completed');
        return mockResponseData;
    };

    console.log('✅ Test HTTP response method added');
}

// Main enhancement function
function applyHttpResponseEnhancements() {
    console.log('🚀 Applying HTTP Response Enhancements...');
    
    // Wait for app to be available
    const checkApp = () => {
        if (window.app) {
            enhanceUpdateHttpResponseUI();
            enhanceCaptureHttpResponse();
            addForceShowMethod();
            addTestMethod();
            
            // Add global test function
            window.testHttpResponse = () => {
                if (window.app && window.app.testHttpResponseDisplay) {
                    return window.app.testHttpResponseDisplay();
                }
                console.warn('HTTP response test method not available');
            };
            
            console.log('✅ All HTTP Response enhancements applied successfully');
            console.log('💡 You can test the functionality with: testHttpResponse()');
        } else {
            console.log('⏳ Waiting for app to initialize...');
            setTimeout(checkApp, 100);
        }
    };
    
    // Start checking for app availability
    checkApp();
}

// Auto-apply enhancements when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyHttpResponseEnhancements);
} else {
    applyHttpResponseEnhancements();
}

// Export for manual usage
window.applyHttpResponseEnhancements = applyHttpResponseEnhancements;