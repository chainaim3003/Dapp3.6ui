/**
 * Simple & Reliable HTTP Response Capture
 * Direct integration with real execution methods
 * Guaranteed to work with actual tool executions
 */

console.log('🔧 Loading Simple HTTP Response Capture...');

// Simple, direct approach
function setupSimpleHttpCapture() {
    if (!window.app) {
        console.log('⚠️ App not ready, retrying...');
        setTimeout(setupSimpleHttpCapture, 100);
        return;
    }

    console.log('🎯 Setting up simple HTTP capture...');

    // Enable HTTP tracking
    window.app.httpResponseEnabled = true;

    // Store original methods
    const originalExecuteSync = window.app.executeSync;
    const originalDisplayResult = window.app.displayResult;

    // Override executeSync with simple capture
    window.app.executeSync = async function(toolName, parameters) {
        console.log('🚀 [SIMPLE] Real execution starting:', toolName);
        
        const startTime = Date.now();
        this.syncExecuting = true;

        // Show progress
        if (this.displayExecutionProgress) {
            this.displayExecutionProgress();
        }

        try {
            // Prepare request
            const requestData = { toolName, parameters };
            const requestBody = JSON.stringify(requestData);

            console.log('📤 [SIMPLE] Making HTTP request...');

            // Make the actual request
            const response = await fetch('/api/v1/tools/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: requestBody
            });

            const endTime = Date.now();
            const responseTime = endTime - startTime;
            const responseText = await response.text();

            console.log(`📡 [SIMPLE] Response received: ${response.status} (${responseTime}ms, ${responseText.length} bytes)`);

            // Parse result
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                result = { error: 'Invalid JSON', rawResponse: responseText.substring(0, 500) };
            }

            // Store HTTP response data in app
            this.lastHttpResponseData = {
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
                    headers: extractHeaders(response),
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

            console.log('💾 [SIMPLE] HTTP response data stored');

            // Display execution result first
            if (this.displayResult) {
                this.displayResult(result);
            }

            // Force show HTTP response container
            setTimeout(() => {
                showSimpleHttpResponse();
            }, 500);

            return result;

        } catch (error) {
            console.error('❌ [SIMPLE] Request failed:', error);
            
            const endTime = Date.now();
            const responseTime = endTime - startTime;

            // Store error data
            this.lastHttpResponseData = {
                request: {
                    method: 'POST',
                    url: '/api/v1/tools/execute',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ toolName, parameters }),
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

            if (this.displayError) {
                this.displayError(error.message);
            }

            // Show HTTP response even for errors
            setTimeout(() => {
                showSimpleHttpResponse();
            }, 500);

            throw error;

        } finally {
            this.syncExecuting = false;
        }
    };

    console.log('✅ [SIMPLE] executeSync method patched');
}

// Helper function to extract headers
function extractHeaders(response) {
    const headers = {};
    if (response.headers && response.headers.forEach) {
        response.headers.forEach((value, key) => {
            headers[key] = value;
        });
    }
    return headers;
}

// Simple function to show HTTP response
function showSimpleHttpResponse() {
    console.log('📺 [SIMPLE] Showing HTTP response...');

    if (!window.app || !window.app.lastHttpResponseData) {
        console.log('❌ [SIMPLE] No HTTP response data found');
        return;
    }

    const container = document.getElementById('http-resp-container');
    if (!container) {
        console.log('❌ [SIMPLE] HTTP response container not found');
        return;
    }

    // Show container
    container.style.display = 'block';
    container.classList.add('http-resp-container-animated');

    const data = window.app.lastHttpResponseData;
    const response = data.response;

    console.log(`📊 [SIMPLE] Updating UI with: ${response.status}, ${response.time}ms, ${response.size} bytes`);

    // Update summary fields
    updateSimpleField('http-resp-status', `${response.status} ${response.statusText}`, getSimpleStatusClass(response.status));
    updateSimpleField('http-resp-time', `${response.time}ms`);
    updateSimpleField('http-resp-size', formatSimpleBytes(response.size));
    updateSimpleField('http-resp-content-type', response.contentType.split(';')[0]);

    // Show notification
    if (window.app.showNotification) {
        window.app.showNotification(
            'HTTP Response Captured',
            `${data.toolName}: ${response.status} (${response.time}ms)`,
            data.success ? 'success' : 'error'
        );
    }

    console.log('✅ [SIMPLE] HTTP response UI updated successfully');
}

// Helper to update fields
function updateSimpleField(id, text, className = null) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
        if (className) {
            element.className = className;
        }
    }
}

// Helper for status class
function getSimpleStatusClass(status) {
    const baseClass = 'http-resp-status-badge';
    if (status >= 200 && status < 300) return `${baseClass} http-resp-status-2xx`;
    if (status >= 400 && status < 500) return `${baseClass} http-resp-status-4xx`;
    if (status >= 500) return `${baseClass} http-resp-status-5xx`;
    if (status === 0) return `${baseClass} http-resp-status-error`;
    return baseClass;
}

// Helper for byte formatting
function formatSimpleBytes(bytes) {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return Math.round(bytes / 1024 * 10) / 10 + ' KB';
    return Math.round(bytes / 1048576 * 10) / 10 + ' MB';
}

// Manual test function
window.testSimpleHttpResponse = function() {
    console.log('🧪 [SIMPLE] Testing HTTP response display...');
    
    // Create test data
    window.app.lastHttpResponseData = {
        request: {
            method: 'POST',
            url: '/api/v1/tools/execute',
            headers: { 'Content-Type': 'application/json' },
            body: '{"toolName":"test","parameters":{}}',
            timestamp: new Date().toISOString(),
            toolName: 'test-tool'
        },
        response: {
            status: 200,
            statusText: 'OK',
            headers: { 'content-type': 'application/json' },
            body: '{"success":true}',
            size: 16,
            time: 1500,
            timestamp: new Date().toISOString(),
            contentType: 'application/json'
        },
        result: { success: true },
        success: true,
        toolName: 'test-tool'
    };
    
    showSimpleHttpResponse();
    console.log('✅ [SIMPLE] Test completed - check sidebar');
};

// Global function to force show
window.forceShowHttpResponse = function() {
    showSimpleHttpResponse();
};

// Auto-setup
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupSimpleHttpCapture);
} else {
    setupSimpleHttpCapture();
}

console.log('✅ [SIMPLE] Simple HTTP Response Capture loaded');
console.log('💡 Commands: testSimpleHttpResponse() or forceShowHttpResponse()');
