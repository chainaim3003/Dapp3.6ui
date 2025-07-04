// CSP-Safe HTTP Response Fix
// This version avoids eval() and other CSP-restricted operations

console.log('🔧 Loading CSP-Safe HTTP Response Fix...');

// 1. Simple container display function
function showHttpContainer() {
    const container = document.getElementById('http-resp-container');
    if (container) {
        container.style.display = 'block';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
        console.log('✅ HTTP Response container displayed');
        return true;
    }
    console.log('❌ Container not found');
    return false;
}

// 2. Update summary fields safely
function updateHttpSummary(responseData) {
    const fields = [
        ['http-resp-status', responseData.status + ' ' + responseData.statusText],
        ['http-resp-time', responseData.time],
        ['http-resp-size', responseData.size + ' B'],
        ['http-resp-content-type', responseData.contentType || 'text/plain']
    ];
    
    fields.forEach(function(field) {
        const element = document.getElementById(field[0]);
        if (element) {
            element.textContent = field[1];
        }
    });
    
    // Set status badge color
    const statusEl = document.getElementById('http-resp-status');
    if (statusEl && responseData.status) {
        statusEl.className = 'http-resp-status-badge http-resp-status-2xx';
    }
}

// 3. Patch execution method safely
function patchExecuteSync() {
    if (!window.app || !window.app.executeSync) {
        console.log('❌ executeSync not found');
        return false;
    }
    
    const originalExecute = window.app.executeSync;
    
    window.app.executeSync = function(toolName, parameters) {
        console.log('🚀 Patched executeSync called for:', toolName);
        
        const startTime = Date.now();
        
        // Store reference to this
        const self = this;
        
        // Set sync executing flag
        this.syncExecuting = true;
        
        // Show progress
        if (this.displayExecutionProgress) {
            this.displayExecutionProgress();
        }
        
        // Make HTTP request
        const requestData = { toolName: toolName, parameters: parameters };
        
        return fetch('/api/v1/tools/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        })
        .then(function(response) {
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            console.log('📡 Response received:', response.status);
            
            return response.text().then(function(responseText) {
                // Store HTTP response data
                const httpData = {
                    status: response.status,
                    statusText: response.statusText,
                    time: Math.round(responseTime) + 'ms',
                    size: responseText.length,
                    contentType: response.headers.get('content-type') || 'text/plain',
                    body: responseText
                };
                
                // Parse result
                let result;
                try {
                    result = JSON.parse(responseText);
                } catch (e) {
                    result = { error: 'Invalid JSON response', rawResponse: responseText };
                }
                
                // Store in app
                self.lastHttpResponseData = {
                    request: {
                        method: 'POST',
                        url: '/api/v1/tools/execute',
                        body: JSON.stringify(requestData, null, 2),
                        timestamp: new Date().toISOString()
                    },
                    response: httpData,
                    result: result,
                    success: response.ok
                };
                
                // Display execution result
                if (self.displayResult) {
                    self.displayResult(result);
                }
                
                // Show HTTP response after short delay
                setTimeout(function() {
                    showHttpContainer();
                    updateHttpSummary(httpData);
                    
                    if (self.showNotification) {
                        self.showNotification(
                            'HTTP Response Captured',
                            'Response details now available in sidebar',
                            'success'
                        );
                    }
                }, 300);
                
                return result;
            });
        })
        .catch(function(error) {
            console.error('❌ Request failed:', error);
            
            // Handle error
            if (self.displayError) {
                self.displayError(error.message);
            }
            
            // Still show HTTP response for errors
            const errorData = {
                status: 0,
                statusText: 'Network Error',
                time: '0ms',
                size: error.message.length,
                contentType: 'text/plain',
                body: error.message
            };
            
            setTimeout(function() {
                showHttpContainer();
                updateHttpSummary(errorData);
            }, 300);
        })
        .finally(function() {
            self.syncExecuting = false;
        });
    };
    
    console.log('✅ executeSync patched successfully');
    return true;
}

// 4. Simple test function
function testHttpResponse() {
    console.log('🧪 Testing HTTP Response...');
    
    // Test data
    const testData = {
        status: 200,
        statusText: 'OK',
        time: '649ms',
        size: 21894,
        contentType: 'application/json'
    };
    
    // Show container and update
    showHttpContainer();
    updateHttpSummary(testData);
    
    console.log('✅ Test completed - check sidebar for HTTP Response Details');
    return true;
}

// 5. Enable HTTP tracking
if (window.app) {
    window.app.httpResponseEnabled = true;
    console.log('✅ HTTP response tracking enabled');
}

// 6. Apply patches
patchExecuteSync();

// 7. Add global functions
window.testHttpResponse = testHttpResponse;
window.showHttpContainer = showHttpContainer;

console.log('✅ CSP-Safe HTTP Response Fix loaded!');
console.log('📋 Commands:');
console.log('  - testHttpResponse()     // Test display');
console.log('  - showHttpContainer()    // Show container');
console.log('');
console.log('🎯 Now execute any verification tool to see HTTP responses!');

// Auto-test
setTimeout(function() {
    console.log('🔄 Running auto-test...');
    testHttpResponse();
}, 1000);