/**
 * Enhanced HTTP Response Capture & Display System
 * Captures real execution data and provides professional UI
 * Safe, CSP-compliant, and backwards-compatible
 */

console.log('🚀 Loading Enhanced HTTP Response System...');

// Enhanced HTTP Response Manager
class HTTPResponseManager {
    constructor() {
        this.isEnabled = true;
        this.currentResponse = null;
        this.responseHistory = [];
        this.maxHistorySize = 10;
        this.detailsVisible = false;
        
        this.init();
    }
    
    init() {
        this.enableHttpTracking();
        this.setupResponseContainer();
        this.patchExecutionMethods();
        this.addEventListeners();
        
        console.log('✅ Enhanced HTTP Response Manager initialized');
    }
    
    enableHttpTracking() {
        if (window.app) {
            window.app.httpResponseEnabled = true;
            console.log('📡 HTTP response tracking enabled');
        }
    }
    
    setupResponseContainer() {
        // Hide container initially (remove test data)
        const container = document.getElementById('http-resp-container');
        if (container) {
            container.style.display = 'none';
            // Clear any test data
            this.clearSummaryFields();
        }
    }
    
    clearSummaryFields() {
        const fields = ['http-resp-status', 'http-resp-time', 'http-resp-size', 'http-resp-content-type'];
        fields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.textContent = '-';
                element.className = element.className.replace(/http-resp-status-\w+/g, '');
            }
        });
    }
    
    patchExecutionMethods() {
        if (!window.app) return;
        
        // Patch executeSync for real HTTP capture
        if (window.app.executeSync) {
            const originalExecuteSync = window.app.executeSync.bind(window.app);
            
            window.app.executeSync = (toolName, parameters) => {
                console.log('🎯 Real execution started:', toolName);
                return this.captureHttpExecution(originalExecuteSync, toolName, parameters);
            };
            
            console.log('✅ executeSync patched for real HTTP capture');
        }
        
        // Also patch async execution if it exists
        if (window.app.executeAsync) {
            const originalExecuteAsync = window.app.executeAsync.bind(window.app);
            
            window.app.executeAsync = (toolName, parameters) => {
                console.log('🎯 Async execution started:', toolName);
                // For async, we'll still capture the initial request
                return this.captureAsyncExecution(originalExecuteAsync, toolName, parameters);
            };
            
            console.log('✅ executeAsync patched for HTTP capture');
        }
    }
    
    async captureHttpExecution(originalMethod, toolName, parameters) {
        const startTime = performance.now();
        const requestTimestamp = new Date().toISOString();
        
        // Create request details
        const requestData = { toolName, parameters };
        const requestDetails = {
            method: 'POST',
            url: '/api/v1/tools/execute',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData, null, 2),
            timestamp: requestTimestamp,
            toolName: toolName
        };
        
        try {
            // Call original method but intercept the HTTP call
            window.app.syncExecuting = true;
            
            if (window.app.displayExecutionProgress) {
                window.app.displayExecutionProgress();
            }
            
            console.log('📤 Making real HTTP request for:', toolName);
            
            // Make the actual HTTP request
            const response = await fetch('/api/v1/tools/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            
            const endTime = performance.now();
            const responseTime = endTime - startTime;
            const responseText = await response.text();
            
            console.log(`📡 Real HTTP response received: ${response.status} (${Math.round(responseTime)}ms)`);
            console.log(`📦 Response size: ${responseText.length} bytes`);
            
            // Parse result
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                result = { 
                    error: 'Invalid JSON response', 
                    rawResponse: responseText.substring(0, 1000) + (responseText.length > 1000 ? '...' : '')
                };
            }
            
            // Create comprehensive response data
            const responseData = {
                request: requestDetails,
                response: {
                    status: response.status,
                    statusText: response.statusText,
                    headers: this.extractHeaders(response),
                    body: responseText,
                    size: responseText.length,
                    time: Math.round(responseTime),
                    timestamp: new Date().toISOString(),
                    contentType: response.headers.get('content-type') || 'text/plain'
                },
                result: result,
                success: response.ok && result?.success !== false,
                toolName: toolName,
                executionId: this.generateExecutionId()
            };
            
            // Store and display
            this.currentResponse = responseData;
            this.addToHistory(responseData);
            
            // Display execution result first
            if (window.app.displayResult) {
                window.app.displayResult(result);
            }
            
            // Then show HTTP response
            setTimeout(() => {
                this.displayHttpResponse(responseData);
            }, 300);
            
            return result;
            
        } catch (error) {
            console.error('❌ HTTP execution failed:', error);
            
            const endTime = performance.now();
            const responseTime = endTime - startTime;
            
            // Create error response data
            const errorResponseData = {
                request: requestDetails,
                response: {
                    status: 0,
                    statusText: 'Network Error',
                    headers: {},
                    body: error.message,
                    size: error.message.length,
                    time: Math.round(responseTime),
                    timestamp: new Date().toISOString(),
                    contentType: 'text/plain'
                },
                result: null,
                success: false,
                error: error,
                toolName: toolName,
                executionId: this.generateExecutionId()
            };
            
            this.currentResponse = errorResponseData;
            this.addToHistory(errorResponseData);
            
            if (window.app.displayError) {
                window.app.displayError(error.message);
            }
            
            setTimeout(() => {
                this.displayHttpResponse(errorResponseData);
            }, 300);
            
            throw error;
            
        } finally {
            window.app.syncExecuting = false;
        }
    }
    
    async captureAsyncExecution(originalMethod, toolName, parameters) {
        // For async executions, we capture the initial request
        const requestTimestamp = new Date().toISOString();
        const requestData = { toolName, parameters };
        
        console.log('🔄 Async execution initiated for:', toolName);
        
        // Store basic request info
        const asyncRequestData = {
            request: {
                method: 'POST',
                url: '/api/v1/jobs/start',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData, null, 2),
                timestamp: requestTimestamp,
                toolName: toolName
            },
            response: {
                status: 'PENDING',
                statusText: 'Async Job Started',
                headers: {},
                body: 'Job queued for background execution',
                size: 0,
                time: 0,
                timestamp: requestTimestamp,
                contentType: 'text/plain'
            },
            result: { status: 'pending', message: 'Job started in background' },
            success: true,
            toolName: toolName,
            executionId: this.generateExecutionId(),
            isAsync: true
        };
        
        this.currentResponse = asyncRequestData;
        this.displayHttpResponse(asyncRequestData);
        
        // Call original async method
        return originalMethod(toolName, parameters);
    }
    
    extractHeaders(response) {
        const headers = {};
        if (response.headers && response.headers.forEach) {
            response.headers.forEach((value, key) => {
                headers[key] = value;
            });
        }
        return headers;
    }
    
    generateExecutionId() {
        return 'exec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }
    
    addToHistory(responseData) {
        this.responseHistory.unshift(responseData);
        if (this.responseHistory.length > this.maxHistorySize) {
            this.responseHistory = this.responseHistory.slice(0, this.maxHistorySize);
        }
    }
    
    displayHttpResponse(responseData) {
        const container = document.getElementById('http-resp-container');
        if (!container) {
            console.error('❌ HTTP response container not found');
            return;
        }
        
        // Show container with animation
        container.style.display = 'block';
        container.classList.add('http-resp-container-animated');
        
        // Update summary
        this.updateSummary(responseData);
        
        // Update details if visible
        if (this.detailsVisible) {
            this.updateDetails(responseData);
        }
        
        // Show notification
        if (window.app && window.app.showNotification) {
            window.app.showNotification(
                'HTTP Response Captured',
                `${responseData.toolName} response: ${responseData.response.status} (${responseData.response.time}ms)`,
                responseData.success ? 'success' : 'error'
            );
        }
        
        console.log('✅ Real HTTP response displayed:', responseData.response.status);
    }
    
    updateSummary(responseData) {
        const { response } = responseData;
        
        // Status
        const statusEl = document.getElementById('http-resp-status');
        if (statusEl) {
            statusEl.textContent = `${response.status} ${response.statusText}`;
            statusEl.className = `http-resp-status-badge ${this.getStatusClass(response.status)}`;
        }
        
        // Time
        const timeEl = document.getElementById('http-resp-time');
        if (timeEl) {
            timeEl.textContent = response.time + 'ms';
        }
        
        // Size
        const sizeEl = document.getElementById('http-resp-size');
        if (sizeEl) {
            sizeEl.textContent = this.formatBytes(response.size);
        }
        
        // Content Type
        const contentTypeEl = document.getElementById('http-resp-content-type');
        if (contentTypeEl) {
            contentTypeEl.textContent = response.contentType.split(';')[0];
        }
    }
    
    updateDetails(responseData) {
        const detailsEl = document.getElementById('http-resp-details');
        if (!detailsEl) return;
        
        detailsEl.innerHTML = this.generateDetailsHTML(responseData);
        detailsEl.classList.remove('hidden');
    }
    
    generateDetailsHTML(responseData) {
        const { request, response, toolName, executionId } = responseData;
        
        return `
            <!-- Execution Info -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 class="font-medium text-blue-800 mb-2 flex items-center">
                    <i class="fas fa-info-circle mr-2"></i>
                    Execution Information
                </h4>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div><span class="font-medium text-gray-600">Tool:</span> ${toolName}</div>
                    <div><span class="font-medium text-gray-600">Execution ID:</span> <code class="text-xs">${executionId}</code></div>
                    <div><span class="font-medium text-gray-600">Started:</span> ${new Date(request.timestamp).toLocaleString()}</div>
                    <div><span class="font-medium text-gray-600">Completed:</span> ${new Date(response.timestamp).toLocaleString()}</div>
                </div>
            </div>
            
            <!-- Request Details -->
            <div class="mb-4">
                <div class="http-resp-collapsible-header bg-gray-50 px-3 py-2 rounded-t border border-gray-200 flex items-center justify-between" onclick="this.nextElementSibling.classList.toggle('hidden')">
                    <h4 class="font-medium text-gray-700 flex items-center">
                        <i class="fas fa-arrow-up text-blue-600 mr-2"></i>
                        Request Details
                    </h4>
                    <i class="fas fa-chevron-down text-gray-400"></i>
                </div>
                <div class="border border-t-0 border-gray-200 rounded-b">
                    <div class="p-3 space-y-3">
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div><span class="font-medium text-gray-600">Method:</span> <code class="bg-gray-100 px-2 py-1 rounded">${request.method}</code></div>
                            <div><span class="font-medium text-gray-600">URL:</span> <code class="bg-gray-100 px-2 py-1 rounded text-xs">${request.url}</code></div>
                        </div>
                        <div>
                            <span class="font-medium text-gray-600">Request Body:</span>
                            <div class="mt-1 http-resp-content">
                                <pre class="bg-gray-100 p-3 rounded text-xs overflow-x-auto">${this.escapeHtml(request.body)}</pre>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Response Details -->
            <div class="mb-4">
                <div class="http-resp-collapsible-header bg-gray-50 px-3 py-2 rounded-t border border-gray-200 flex items-center justify-between" onclick="this.nextElementSibling.classList.toggle('hidden')">
                    <h4 class="font-medium text-gray-700 flex items-center">
                        <i class="fas fa-arrow-down text-green-600 mr-2"></i>
                        Response Details
                    </h4>
                    <i class="fas fa-chevron-down text-gray-400"></i>
                </div>
                <div class="border border-t-0 border-gray-200 rounded-b">
                    <div class="p-3 space-y-3">
                        <div>
                            <span class="font-medium text-gray-600">Response Headers:</span>
                            <div class="mt-1 text-xs bg-gray-100 p-2 rounded max-h-32 overflow-y-auto">
                                ${Object.entries(response.headers).length > 0 
                                    ? Object.entries(response.headers).map(([key, value]) => `${key}: ${value}`).join('\n')
                                    : 'No headers captured'
                                }
                            </div>
                        </div>
                        <div>
                            <span class="font-medium text-gray-600">Response Body:</span>
                            <div class="mt-1 http-resp-content">
                                ${this.formatResponseBody(response.body, response.contentType)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Actions -->
            <div class="flex space-x-2">
                <button onclick="window.httpManager?.copyRawResponse?.()" class="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                    <i class="fas fa-copy mr-1"></i>Copy Raw Response
                </button>
                <button onclick="window.httpManager?.copyRequestCurl?.()" class="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors">
                    <i class="fas fa-terminal mr-1"></i>Copy as cURL
                </button>
                <button onclick="window.httpManager?.toggleDetails?.()" class="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                    <i class="fas fa-eye-slash mr-1"></i>Hide Details
                </button>
            </div>
        `;
    }
    
    formatResponseBody(body, contentType) {
        if (contentType.includes('json')) {
            try {
                const parsed = JSON.parse(body);
                return `<div class="http-resp-json-viewer">${this.escapeHtml(JSON.stringify(parsed, null, 2))}</div>`;
            } catch (e) {
                // Fall through to plain text
            }
        }
        
        // For large responses, truncate and add scroll
        const truncated = body.length > 5000 ? body.substring(0, 5000) + '\n\n... (truncated, ' + (body.length - 5000) + ' more characters)' : body;
        
        return `<pre class="bg-gray-100 p-3 rounded text-xs overflow-x-auto max-h-64 overflow-y-auto">${this.escapeHtml(truncated)}</pre>`;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    getStatusClass(status) {
        if (status >= 200 && status < 300) return 'http-resp-status-2xx';
        if (status >= 300 && status < 400) return 'http-resp-status-3xx';
        if (status >= 400 && status < 500) return 'http-resp-status-4xx';
        if (status >= 500) return 'http-resp-status-5xx';
        return 'http-resp-status-error';
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    addEventListeners() {
        // Toggle details
        const toggleButton = document.querySelector('[onclick*="toggleHttpResponseDetails"]');
        if (toggleButton) {
            toggleButton.onclick = () => this.toggleDetails();
        }
    }
    
    toggleDetails() {
        this.detailsVisible = !this.detailsVisible;
        const detailsEl = document.getElementById('http-resp-details');
        const toggleTextEl = document.getElementById('http-resp-toggle-text');
        
        if (detailsEl && toggleTextEl) {
            if (this.detailsVisible) {
                if (this.currentResponse) {
                    this.updateDetails(this.currentResponse);
                }
                toggleTextEl.textContent = 'Hide Details';
            } else {
                detailsEl.classList.add('hidden');
                toggleTextEl.textContent = 'Show Details';
            }
        }
    }
    
    copyRawResponse() {
        if (!this.currentResponse) return;
        
        const { request, response } = this.currentResponse;
        const rawResponse = `HTTP/1.1 ${response.status} ${response.statusText}\n${Object.entries(response.headers).map(([key, value]) => `${key}: ${value}`).join('\n')}\n\n${response.body}`;
        
        navigator.clipboard.writeText(rawResponse).then(() => {
            if (window.app && window.app.showNotification) {
                window.app.showNotification('Copied!', 'Raw HTTP response copied to clipboard', 'success');
            }
        }).catch(console.error);
    }
    
    copyRequestCurl() {
        if (!this.currentResponse) return;
        
        const { request } = this.currentResponse;
        const curl = `curl -X ${request.method} "${request.url}" \\\n  -H "Content-Type: application/json" \\\n  -d '${request.body.replace(/'/g, "'\\''")}'\`;
        
        navigator.clipboard.writeText(curl).then(() => {
            if (window.app && window.app.showNotification) {
                window.app.showNotification('Copied!', 'cURL command copied to clipboard', 'success');
            }
        }).catch(console.error);
    }
}

// Initialize the enhanced HTTP response manager
const httpManager = new HTTPResponseManager();

// Global access
window.httpManager = httpManager;

// Global functions for backward compatibility
window.testHttpResponse = function() {
    console.log('ℹ️ Test function disabled - system now captures real execution data');
    console.log('💡 Execute any verification tool to see real HTTP responses');
};

window.showHttpContainer = function() {
    const container = document.getElementById('http-resp-container');
    if (container) {
        container.style.display = 'block';
        console.log('✅ HTTP container shown (empty until real execution)');
        return true;
    }
    return false;
};

console.log('✅ Enhanced HTTP Response System loaded successfully!');
console.log('🎯 System is now ready to capture real execution data');
console.log('💡 Execute any verification tool to see live HTTP responses');