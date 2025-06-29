/**
 * CSP-Safe HTTP Response Capture
 * Uses only basic DOM operations and static functions
 * No eval, no dynamic code generation, fully CSP compliant
 */

console.log('🔧 Loading CSP-Safe HTTP Response Capture...');

// Static helper functions defined upfront
function updateStatusField(status, statusText) {
    const statusEl = document.getElementById('http-resp-status');
    if (statusEl) {
        statusEl.textContent = status + ' ' + statusText;
        
        // Set CSS class based on status code
        let className = 'http-resp-status-badge';
        if (status >= 200 && status < 300) {
            className += ' http-resp-status-2xx';
        } else if (status >= 400 && status < 500) {
            className += ' http-resp-status-4xx';
        } else if (status >= 500) {
            className += ' http-resp-status-5xx';
        } else if (status === 0) {
            className += ' http-resp-status-error';
        }
        statusEl.className = className;
    }
}

function updateTimeField(timeMs) {
    const timeEl = document.getElementById('http-resp-time');
    if (timeEl) {
        timeEl.textContent = timeMs + 'ms';
    }
}

function updateSizeField(bytes) {
    const sizeEl = document.getElementById('http-resp-size');
    if (sizeEl) {
        let sizeText;
        if (bytes < 1024) {
            sizeText = bytes + ' B';
        } else if (bytes < 1048576) {
            sizeText = Math.round(bytes / 1024 * 10) / 10 + ' KB';
        } else {
            sizeText = Math.round(bytes / 1048576 * 10) / 10 + ' MB';
        }
        sizeEl.textContent = sizeText;
    }
}

function updateContentTypeField(contentType) {
    const typeEl = document.getElementById('http-resp-content-type');
    if (typeEl) {
        const mainType = contentType ? contentType.split(';')[0] : 'text/plain';
        typeEl.textContent = mainType;
    }
}

function showResponseContainer() {
    const container = document.getElementById('http-resp-container');
    if (container) {
        container.style.display = 'block';
        container.style.opacity = '1';
        return true;
    }
    return false;
}

function hideResponseContainer() {
    const container = document.getElementById('http-resp-container');
    if (container) {
        container.style.display = 'none';
    }
}

function clearResponseFields() {
    const fields = ['http-resp-status', 'http-resp-time', 'http-resp-size', 'http-resp-content-type'];
    for (let i = 0; i < fields.length; i++) {
        const element = document.getElementById(fields[i]);
        if (element) {
            element.textContent = '-';
        }
    }
}

function extractResponseHeaders(response) {
    const headers = {};
    if (response && response.headers && response.headers.forEach) {
        response.headers.forEach(function(value, key) {
            headers[key] = value;
        });
    }
    return headers;
}

function displayHttpResponseData(responseData) {
    console.log('📺 Displaying HTTP response data...');
    
    if (!responseData || !responseData.response) {
        console.log('❌ No response data to display');
        return false;
    }
    
    const response = responseData.response;
    
    // Show container
    if (!showResponseContainer()) {
        console.log('❌ Could not show response container');
        return false;
    }
    
    // Update all fields
    updateStatusField(response.status, response.statusText);
    updateTimeField(response.time);
    updateSizeField(response.size);
    updateContentTypeField(response.contentType);
    
    console.log('✅ HTTP response displayed:', response.status, response.time + 'ms', response.size + 'B');
    
    // Show notification if available
    if (window.app && window.app.showNotification) {
        window.app.showNotification(
            'HTTP Response Captured',
            responseData.toolName + ': ' + response.status + ' (' + response.time + 'ms)',
            responseData.success ? 'success' : 'error'
        );
    }
    
    return true;
}

function createMockResponseData() {
    return {
        request: {
            method: 'POST',
            url: '/api/v1/tools/execute',
            headers: { 'Content-Type': 'application/json' },
            body: '{"toolName":"get-GLEIF-verification-with-sign","parameters":{}}',
            timestamp: new Date().toISOString(),
            toolName: 'get-GLEIF-verification-with-sign'
        },
        response: {
            status: 200,
            statusText: 'OK',
            headers: { 'content-type': 'application/json' },
            body: '{"success":true,"message":"GLEIF verification completed"}',
            size: 21894,
            time: 649223,
            timestamp: new Date().toISOString(),
            contentType: 'application/json'
        },
        result: { success: true },
        success: true,
        toolName: 'get-GLEIF-verification-with-sign'
    };
}

// Main HTTP capture function
function captureRealHttpExecution(originalExecuteSync, toolName, parameters) {
    console.log('🚀 Capturing real HTTP execution for:', toolName);
    
    const startTime = Date.now();
    
    // Set sync executing flag
    window.app.syncExecuting = true;
    
    // Show progress
    if (window.app.displayExecutionProgress) {
        window.app.displayExecutionProgress();
    }
    
    // Prepare request data
    const requestData = { toolName: toolName, parameters: parameters };
    const requestBody = JSON.stringify(requestData);
    
    console.log('📤 Making real HTTP request...');
    
    // Make the actual HTTP request
    return fetch('/api/v1/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody
    })
    .then(function(response) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        console.log('📡 Response received:', response.status, '(' + responseTime + 'ms)');
        
        return response.text().then(function(responseText) {
            console.log('📦 Response size:', responseText.length, 'bytes');
            
            // Parse result
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                result = { 
                    error: 'Invalid JSON response', 
                    rawResponse: responseText.substring(0, 500) 
                };
            }
            
            // Create response data object
            const responseData = {
                request: {
                    method: 'POST',
                    url: '/api/v1/tools/execute',
                    headers: { 'Content-Type': 'application/json' },
                    body: requestBody,
                    timestamp: new Date(startTime).toISOString(),
                    toolName: toolName
                },
                response: {
                    status: response.status,
                    statusText: response.statusText,
                    headers: extractResponseHeaders(response),
                    body: responseText,
                    size: responseText.length,
                    time: responseTime,
                    timestamp: new Date(endTime).toISOString(),
                    contentType: response.headers.get('content-type') || 'text/plain'
                },
                result: result,
                success: response.ok,
                toolName: toolName
            };
            
            // Store in app
            window.app.lastHttpResponseData = responseData;
            
            console.log('💾 HTTP response data stored');
            
            // Display execution result first
            if (window.app.displayResult) {
                window.app.displayResult(result);
            }
            
            // Show HTTP response after a delay
            setTimeout(function() {
                displayHttpResponseData(responseData);
            }, 1000);
            
            return result;
        });
    })
    .catch(function(error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        console.error('❌ HTTP request failed:', error);
        
        // Create error response data
        const errorResponseData = {
            request: {
                method: 'POST',
                url: '/api/v1/tools/execute',
                headers: { 'Content-Type': 'application/json' },
                body: requestBody,
                timestamp: new Date(startTime).toISOString(),
                toolName: toolName
            },
            response: {
                status: 0,
                statusText: 'Network Error',
                headers: {},
                body: error.message,
                size: error.message.length,
                time: responseTime,
                timestamp: new Date(endTime).toISOString(),
                contentType: 'text/plain'
            },
            result: null,
            success: false,
            error: error,
            toolName: toolName
        };
        
        // Store error data
        window.app.lastHttpResponseData = errorResponseData;
        
        // Display error
        if (window.app.displayError) {
            window.app.displayError(error.message);
        }
        
        // Show HTTP response even for errors
        setTimeout(function() {
            displayHttpResponseData(errorResponseData);
        }, 1000);
        
        throw error;
    })
    .finally(function() {
        window.app.syncExecuting = false;
    });
}

// Setup function
function setupCSPSafeHttpCapture() {
    if (!window.app) {
        console.log('⏳ Waiting for app...');
        setTimeout(setupCSPSafeHttpCapture, 100);
        return;
    }
    
    console.log('🎯 Setting up CSP-safe HTTP capture...');
    
    // Enable HTTP tracking
    window.app.httpResponseEnabled = true;
    
    // Clear container initially
    hideResponseContainer();
    clearResponseFields();
    
    // Patch executeSync if it exists
    if (window.app.executeSync) {
        const originalExecuteSync = window.app.executeSync;
        
        window.app.executeSync = function(toolName, parameters) {
            console.log('🔄 executeSync called for:', toolName);
            return captureRealHttpExecution(originalExecuteSync, toolName, parameters);
        };
        
        console.log('✅ executeSync patched for HTTP capture');
    } else {
        console.log('⚠️ executeSync method not found');
    }
    
    console.log('✅ CSP-safe HTTP capture setup complete');
}

// Global test functions
window.testCSPSafeHttpResponse = function() {
    console.log('🧪 Testing CSP-safe HTTP response...');
    
    const mockData = createMockResponseData();
    window.app.lastHttpResponseData = mockData;
    
    const success = displayHttpResponseData(mockData);
    if (success) {
        console.log('✅ Test successful - check sidebar for HTTP Response Details');
    } else {
        console.log('❌ Test failed');
    }
    return success;
};

window.forceShowHttpResponse = function() {
    if (window.app && window.app.lastHttpResponseData) {
        return displayHttpResponseData(window.app.lastHttpResponseData);
    } else {
        console.log('❌ No HTTP response data available');
        return false;
    }
};

window.clearHttpResponse = function() {
    hideResponseContainer();
    clearResponseFields();
    if (window.app) {
        window.app.lastHttpResponseData = null;
    }
    console.log('✅ HTTP response cleared');
};

// Auto-setup when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupCSPSafeHttpCapture);
} else {
    setupCSPSafeHttpCapture();
}

console.log('✅ CSP-Safe HTTP Response Capture loaded');
console.log('🧪 Test with: testCSPSafeHttpResponse()');
console.log('🔧 Force show: forceShowHttpResponse()');
console.log('🧹 Clear: clearHttpResponse()');
