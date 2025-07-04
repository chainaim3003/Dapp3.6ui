// ===========================
// ZK-PRET Refactored Application
// Clean, modular architecture
// ===========================

/**
 * Base API client for all backend communications
 */
class APIClient {
    constructor(baseURL = '/api/v1') {
        this.baseURL = baseURL;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    async post(endpoint, data) {
        return this.request(endpoint, { 
            method: 'POST', 
            body: JSON.stringify(data) 
        });
    }

    // Health check
    async checkHealth() {
        return this.get('/health');
    }

    // Tool execution
    async executeTool(toolName, parameters) {
        return this.post('/tools/execute', { toolName, parameters });
    }

    // Async job management
    async startJob(jobId, toolName, parameters) {
        return this.post('/jobs/start', { jobId, toolName, parameters });
    }

    // Composed proofs
    async executeComposedProof(request) {
        return this.post('/composed-proofs/execute', request);
    }

    async getComposedProofTemplates() {
        return this.get('/composed-proofs/templates');
    }
}

/**
 * Notification system
 */
class NotificationManager {
    constructor() {
        this.container = document.getElementById('notifications');
        if (!this.container) {
            this.container = this.createNotificationContainer();
        }
    }

    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notifications';
        container.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(container);
        return container;
    }

    show(title, message, type = 'info', duration = 5000) {
        const notification = this.createNotification(title, message, type);
        this.container.appendChild(notification);
        
        setTimeout(() => {
            this.remove(notification);
        }, duration);
    }

    createNotification(title, message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} bg-white border-l-4 p-4 rounded-lg shadow-lg max-w-md animate-slide-in`;
        
        const borderColors = {
            success: 'border-green-500',
            error: 'border-red-500',
            warning: 'border-yellow-500',
            info: 'border-blue-500'
        };
        
        notification.classList.add(borderColors[type] || borderColors.info);
        
        notification.innerHTML = `
            <div class="flex items-start">
                <div class="flex-1">
                    <h4 class="font-semibold text-gray-900">${title}</h4>
                    <p class="text-gray-600 text-sm mt-1">${message}</p>
                </div>
                <button class="ml-4 text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">
                    ×
                </button>
            </div>
        `;
        
        return notification;
    }

    remove(notification) {
        if (notification && notification.parentNode) {
            notification.remove();
        }
    }

    // Convenience methods
    success(title, message) { this.show(title, message, 'success'); }
    error(title, message) { this.show(title, message, 'error'); }
    warning(title, message) { this.show(title, message, 'warning'); }
    info(title, message) { this.show(title, message, 'info'); }
}

/**
 * File management utility
 */
class FileManager {
    constructor() {
        this.files = new Map();
    }

    addFile(key, file) {
        this.files.set(key, file);
        this.updateFileDisplay(key, file);
    }

    removeFile(key) {
        this.files.delete(key);
        this.clearFileDisplay(key);
    }

    getFile(key) {
        return this.files.get(key);
    }

    async readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    updateFileDisplay(key, file) {
        const dropZone = document.getElementById(`${key}-drop-zone`);
        if (!dropZone) return;

        const placeholder = dropZone.querySelector('.file-placeholder');
        const fileInfo = dropZone.querySelector('.file-info');
        
        if (placeholder) placeholder.style.display = 'none';
        if (fileInfo) {
            fileInfo.classList.add('show');
            const nameElement = fileInfo.querySelector('[id$="-file-name"]');
            const sizeElement = fileInfo.querySelector('[id$="-file-size"]');
            
            if (nameElement) nameElement.textContent = file.name;
            if (sizeElement) sizeElement.textContent = this.formatFileSize(file.size);
        }
        
        dropZone.classList.add('has-file');
    }

    clearFileDisplay(key) {
        const dropZone = document.getElementById(`${key}-drop-zone`);
        if (!dropZone) return;

        const placeholder = dropZone.querySelector('.file-placeholder');
        const fileInfo = dropZone.querySelector('.file-info');
        
        if (placeholder) placeholder.style.display = 'flex';
        if (fileInfo) fileInfo.classList.remove('show');
        
        dropZone.classList.remove('has-file');
        
        // Clear file input
        const fileInput = document.getElementById(`${key}-input`);
        if (fileInput) fileInput.value = '';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    setupDropZone(dropZoneId, inputId, fileKey) {
        const dropZone = document.getElementById(dropZoneId);
        const fileInput = document.getElementById(inputId);
        
        if (!dropZone || !fileInput) return;

        // Click to browse
        dropZone.addEventListener('click', () => fileInput.click());

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.addFile(fileKey, e.target.files[0]);
            }
        });

        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                this.addFile(fileKey, e.dataTransfer.files[0]);
            }
        });
    }
}

/**
 * Job management for async operations
 */
class JobManager {
    constructor(apiClient, notificationManager) {
        this.apiClient = apiClient;
        this.notifications = notificationManager;
        this.jobs = new Map();
        this.websocket = null;
    }

    initWebSocket() {
        try {
            this.websocket = new WebSocket('ws://localhost:3000');
            
            this.websocket.onopen = () => {
                console.log('WebSocket connected');
            };

            this.websocket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'job_update') {
                    this.handleJobUpdate(data);
                }
            };

            this.websocket.onclose = () => {
                console.log('WebSocket disconnected');
                setTimeout(() => this.initWebSocket(), 5000);
            };
        } catch (error) {
            console.error('WebSocket connection failed:', error);
        }
    }

    async startJob(toolName, parameters) {
        const jobId = this.generateJobId();
        const job = {
            id: jobId,
            toolName,
            parameters,
            status: 'pending',
            startTime: new Date(),
            result: null
        };

        this.jobs.set(jobId, job);
        this.updateJobQueue();

        try {
            await this.apiClient.startJob(jobId, toolName, parameters);
            job.status = 'running';
            this.updateJobQueue();
            
            this.notifications.info(
                'Job Started',
                `${this.formatToolName(toolName)} is running in background`
            );
        } catch (error) {
            job.status = 'failed';
            job.error = error.message;
            this.updateJobQueue();
            this.notifications.error('Job Failed', error.message);
        }
    }

    handleJobUpdate(data) {
        const job = this.jobs.get(data.jobId);
        if (!job) return;

        Object.assign(job, {
            status: data.status,
            progress: data.progress,
            result: data.result,
            error: data.error
        });

        if (data.status === 'completed' || data.status === 'failed') {
            job.endTime = new Date();
            
            this.notifications.show(
                data.status === 'completed' ? 'Job Completed' : 'Job Failed',
                `${this.formatToolName(job.toolName)} ${data.status}`,
                data.status === 'completed' ? 'success' : 'error'
            );
        }

        this.updateJobQueue();
    }

    updateJobQueue() {
        const container = document.getElementById('job-queue-list');
        if (!container) return;

        const jobs = Array.from(this.jobs.values()).reverse();
        
        if (jobs.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 py-4">No jobs in queue</div>';
            return;
        }

        container.innerHTML = jobs.map(this.renderJob.bind(this)).join('');
        this.updateJobQueueIndicator();
    }

    renderJob(job) {
        const statusIcons = {
            pending: '⏳',
            running: '🔄',
            completed: '✅',
            failed: '❌'
        };

        return `
            <div class="job-item p-3 border-l-4 ${this.getJobBorderColor(job.status)} bg-gray-50 rounded">
                <div class="flex justify-between items-center">
                    <div>
                        <span class="font-medium">${this.formatToolName(job.toolName)}</span>
                        <div class="text-sm text-gray-500">${job.startTime.toLocaleTimeString()}</div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span>${statusIcons[job.status] || '❓'}</span>
                        <span class="text-sm ${this.getJobStatusColor(job.status)}">${job.status}</span>
                    </div>
                </div>
                ${job.progress ? `<div class="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full" style="width: ${job.progress}%"></div>
                </div>` : ''}
            </div>
        `;
    }

    updateJobQueueIndicator() {
        const runningJobs = Array.from(this.jobs.values())
            .filter(job => job.status === 'running' || job.status === 'pending').length;
        
        const indicator = document.getElementById('job-queue-indicator');
        const counter = document.getElementById('running-jobs-count');
        
        if (counter) counter.textContent = runningJobs;
        if (indicator) {
            indicator.classList.toggle('hidden', runningJobs === 0);
        }
    }

    clearCompletedJobs() {
        for (const [jobId, job] of this.jobs.entries()) {
            if (job.status === 'completed' || job.status === 'failed') {
                this.jobs.delete(jobId);
            }
        }
        this.updateJobQueue();
    }

    generateJobId() {
        return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    formatToolName(toolName) {
        return toolName
            .replace('get-', '')
            .replace('-with-sign', '')
            .replace('-compliance-verification', '')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    getJobBorderColor(status) {
        const colors = {
            pending: 'border-yellow-400',
            running: 'border-blue-400',
            completed: 'border-green-400',
            failed: 'border-red-400'
        };
        return colors[status] || 'border-gray-400';
    }

    getJobStatusColor(status) {
        const colors = {
            pending: 'text-yellow-600',
            running: 'text-blue-600',
            completed: 'text-green-600',
            failed: 'text-red-600'
        };
        return colors[status] || 'text-gray-600';
    }
}

/**
 * Base class for verification components
 */
class BaseVerificationComponent {
    constructor(apiClient, notifications, fileManager) {
        this.apiClient = apiClient;
        this.notifications = notifications;
        this.fileManager = fileManager;
    }

    async execute(parameters, isAsync = true) {
        try {
            this.validateParameters(parameters);
            const toolName = this.getToolName();
            
            if (isAsync) {
                return await this.executeAsync(toolName, parameters);
            } else {
                return await this.executeSync(toolName, parameters);
            }
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    async executeSync(toolName, parameters) {
        this.showExecutionProgress();
        try {
            const result = await this.apiClient.executeTool(toolName, parameters);
            this.displayResult(result);
            return result;
        } finally {
            this.hideExecutionProgress();
        }
    }

    async executeAsync(toolName, parameters) {
        // This would be handled by JobManager
        throw new Error('Async execution should be handled by JobManager');
    }

    validateParameters(parameters) {
        // Override in subclasses
        throw new Error('validateParameters must be implemented by subclass');
    }

    getToolName() {
        // Override in subclasses
        throw new Error('getToolName must be implemented by subclass');
    }

    showExecutionProgress() {
        const container = document.getElementById('execution-results');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    <p class="mt-4 text-gray-600">Generating ZK Proof...</p>
                    <p class="text-sm text-gray-500">This may take a few moments</p>
                </div>
            `;
        }
    }

    displayResult(result) {
        const container = document.getElementById('execution-results');
        if (!container) return;

        if (result.success) {
            container.innerHTML = `
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div class="flex items-center">
                        <div class="text-green-600 text-2xl mr-3">✅</div>
                        <div>
                            <h3 class="text-lg font-semibold text-green-800">Success</h3>
                            <p class="text-green-700">ZK Proof Generated Successfully</p>
                        </div>
                    </div>
                    ${result.executionTime ? `<p class="mt-2 text-sm text-green-600">Execution Time: ${result.executionTime}</p>` : ''}
                    ${this.formatResultOutput(result)}
                </div>
            `;
        } else {
            this.displayError(result.error || 'Unknown error occurred');
        }
    }

    displayError(message) {
        const container = document.getElementById('execution-results');
        if (container) {
            container.innerHTML = `
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div class="flex items-center">
                        <div class="text-red-600 text-2xl mr-3">❌</div>
                        <div>
                            <h3 class="text-lg font-semibold text-red-800">Failed</h3>
                            <p class="text-red-700">${message}</p>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    formatResultOutput(result) {
        if (!result.result?.output) return '';
        
        const output = result.result.output;
        const truncated = output.length > 500 ? output.substring(0, 500) + '...' : output;
        
        return `
            <div class="mt-4 p-3 bg-gray-100 rounded-lg">
                <h4 class="font-medium text-gray-700 mb-2">Output:</h4>
                <pre class="text-sm text-gray-600 whitespace-pre-wrap">${truncated}</pre>
            </div>
        `;
    }

    handleError(error) {
        this.notifications.error('Execution Failed', error.message);
        this.displayError(error.message);
    }
}

/**
 * GLEIF Verification Component
 */
class GLEIFVerificationComponent extends BaseVerificationComponent {
    getToolName() {
        return 'get-GLEIF-verification-with-sign';
    }

    validateParameters(parameters) {
        if (!parameters.companyName?.trim()) {
            throw new Error('Company name is required');
        }
    }

    collectParameters() {
        const companyName = document.getElementById('company-name-input')?.value?.trim();
        return {
            companyName,
            typeOfNet: 'TESTNET'
        };
    }
}

/**
 * Corporate Registration Verification Component
 */
class CorporateVerificationComponent extends BaseVerificationComponent {
    getToolName() {
        return 'get-Corporate-Registration-verification-with-sign';
    }

    validateParameters(parameters) {
        if (!parameters.cin?.trim()) {
            throw new Error('Corporate Identification Number (CIN) is required');
        }
    }

    collectParameters() {
        const cin = document.getElementById('cin-input')?.value?.trim();
        return {
            cin,
            typeOfNet: 'TESTNET'
        };
    }
}

/**
 * Main Application Controller
 */
class ZKPretApplication {
    constructor() {
        this.apiClient = new APIClient();
        this.notifications = new NotificationManager();
        this.fileManager = new FileManager();
        this.jobManager = new JobManager(this.apiClient, this.notifications);
        
        this.currentTab = 'compliance';
        this.isAsyncMode = true;
        this.syncExecuting = false;
        
        this.components = {
            gleif: new GLEIFVerificationComponent(this.apiClient, this.notifications, this.fileManager),
            corporate: new CorporateVerificationComponent(this.apiClient, this.notifications, this.fileManager)
        };
    }

    async init() {
        this.checkSpecialTabMode();
        this.setupEventListeners();
        this.setupFileDropZones();
        this.jobManager.initWebSocket();
        await this.checkConnection();
        this.updateModeDisplay();
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab || e.target.closest('.tab-btn').dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Mode toggle
        const modeToggle = document.getElementById('async-mode-toggle');
        if (modeToggle) {
            modeToggle.addEventListener('change', (e) => {
                this.isAsyncMode = e.target.checked;
                this.updateModeDisplay();
                this.notifications.info(
                    this.isAsyncMode ? 'Async Mode Enabled' : 'Sync Mode Enabled',
                    this.isAsyncMode ? 'Jobs will run in background' : 'Jobs will block UI until complete'
                );
            });
        }

        // Execution buttons
        this.setupExecutionButtons();

        // Clear completed jobs
        const clearBtn = document.getElementById('clear-completed-jobs');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.jobManager.clearCompletedJobs());
        }
    }

    setupExecutionButtons() {
        const buttons = [
            { id: 'gleif-execute-btn', handler: () => this.executeGLEIF() },
            { id: 'corporate-execute-btn', handler: () => this.executeCorporateRegistration() },
            { id: 'exim-execute-btn', handler: () => this.executeEXIM() },
            { id: 'data-integrity-execute-btn', handler: () => this.executeBusinessDataIntegrity() },
            { id: 'process-integrity-execute-btn', handler: () => this.executeBusinessProcessIntegrity() },
            { id: 'scf-execute-btn', handler: () => this.executeSCF() },
            { id: 'risk-execute-btn', handler: () => this.executeRiskLiquidity() },
            { id: 'deep-composition-execute-btn', handler: () => this.executeDeepComposition() },
            { id: 'registry-execute-btn', handler: () => this.executeRegistry() },
            { id: 'composed-proof-execute-btn', handler: () => this.executeComposedProof() }
        ];

        buttons.forEach(({ id, handler }) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', handler);
            }
        });
    }

    setupFileDropZones() {
        const dropZones = [
            { zone: 'data-file-drop-zone', input: 'data-file-input', key: 'dataFile' },
            { zone: 'actual-process-drop-zone', input: 'actual-process-input', key: 'actualProcessFile' },
            { zone: 'expected-process-drop-zone', input: 'expected-process-input', key: 'expectedProcessFile' },
            { zone: 'deep-composition-file-drop-zone', input: 'deep-composition-file-input', key: 'deepCompositionFile' }
        ];

        dropZones.forEach(({ zone, input, key }) => {
            this.fileManager.setupDropZone(zone, input, key);
        });
    }

    async executeGLEIF() {
        try {
            const parameters = this.components.gleif.collectParameters();
            
            if (this.isAsyncMode) {
                await this.jobManager.startJob('get-GLEIF-verification-with-sign', parameters);
            } else {
                await this.components.gleif.execute(parameters, false);
            }
        } catch (error) {
            // Error is already handled by the component
        }
    }

    async executeCorporateRegistration() {
        try {
            const parameters = this.components.corporate.collectParameters();
            
            if (this.isAsyncMode) {
                await this.jobManager.startJob('get-Corporate-Registration-verification-with-sign', parameters);
            } else {
                await this.components.corporate.execute(parameters, false);
            }
        } catch (error) {
            // Error is already handled by the component
        }
    }

    // Placeholder methods for other verification types
    async executeEXIM() {
        this.notifications.warning('Not Implemented', 'EXIM verification coming soon');
    }

    async executeBusinessDataIntegrity() {
        this.notifications.warning('Not Implemented', 'Business Data Integrity verification coming soon');
    }

    async executeBusinessProcessIntegrity() {
        this.notifications.warning('Not Implemented', 'Business Process Integrity verification coming soon');
    }

    async executeSCF() {
        this.notifications.warning('Not Implemented', 'SCF verification coming soon');
    }

    async executeRiskLiquidity() {
        this.notifications.warning('Not Implemented', 'Risk & Liquidity verification coming soon');
    }

    async executeDeepComposition() {
        this.notifications.warning('Not Implemented', 'DeepComposition verification coming soon');
    }

    async executeRegistry() {
        this.notifications.warning('Not Implemented', 'Registry operations coming soon');
    }

    async executeComposedProof() {
        this.notifications.warning('Not Implemented', 'Composed proofs coming soon');
    }

    switchTab(tabName) {
        if (!this.isAsyncMode && this.syncExecuting) {
            this.notifications.warning(
                'Execution in Progress',
                'Please wait for current execution to complete or switch to Async mode'
            );
            return;
        }

        // Update UI
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (targetBtn) targetBtn.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        const targetTab = document.getElementById(`${tabName}-tab`);
        if (targetTab) targetTab.classList.remove('hidden');

        this.currentTab = tabName;
    }

    checkSpecialTabMode() {
        const targetTab = sessionStorage.getItem('zkpret_target_tab');
        if (targetTab) {
            // Handle special tab modes
            sessionStorage.removeItem('zkpret_target_tab');
        }
    }

    updateModeDisplay() {
        const jobQueuePanel = document.getElementById('job-queue-panel');
        const jobQueueIndicator = document.getElementById('job-queue-indicator');
        
        if (jobQueuePanel) {
            jobQueuePanel.style.display = this.isAsyncMode ? 'block' : 'none';
        }
        
        if (jobQueueIndicator && !this.isAsyncMode) {
            jobQueueIndicator.classList.add('hidden');
        }
    }

    async checkConnection() {
        try {
            const health = await this.apiClient.checkHealth();
            this.updateConnectionStatus(true);
            this.updateServerStatus(health);
        } catch (error) {
            this.updateConnectionStatus(false);
            this.updateServerStatus({ 
                status: 'offline', 
                services: { zkPretServer: false }, 
                timestamp: new Date().toISOString() 
            });
        }
    }

    updateConnectionStatus(connected) {
        const status = document.getElementById('connection-status');
        if (status) {
            status.innerHTML = `
                <div class="flex items-center space-x-2">
                    <div class="w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}"></div>
                    <span class="${connected ? 'text-green-600' : 'text-red-600'}">${connected ? 'Connected' : 'Disconnected'}</span>
                </div>
            `;
        }
    }

    updateServerStatus(status) {
        const container = document.getElementById('server-status');
        if (container) {
            container.innerHTML = `
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span>Status:</span>
                        <span class="font-medium">${status.status || 'unknown'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>ZK-PRET Server:</span>
                        <span class="${status.services?.zkPretServer ? 'text-green-600' : 'text-red-600'}">
                            ${status.services?.zkPretServer ? 'Online' : 'Offline'}
                        </span>
                    </div>
                    <div class="text-xs text-gray-500">
                        Last updated: ${new Date(status.timestamp).toLocaleString()}
                    </div>
                </div>
            `;
        }
    }
}

// Global utility functions
function clearDataFile() {
    if (window.zkpretApp?.fileManager) {
        window.zkpretApp.fileManager.removeFile('dataFile');
    }
}

function clearActualProcessFile() {
    if (window.zkpretApp?.fileManager) {
        window.zkpretApp.fileManager.removeFile('actualProcessFile');
    }
}

function clearExpectedProcessFile() {
    if (window.zkpretApp?.fileManager) {
        window.zkpretApp.fileManager.removeFile('expectedProcessFile');
    }
}

function clearDeepCompositionFile() {
    if (window.zkpretApp?.fileManager) {
        window.zkpretApp.fileManager.removeFile('deepCompositionFile');
    }
}

// Composed proof template selection
function selectComposedProofTemplate(templateId) {
    window.selectedComposedTemplate = templateId;
    
    if (window.zkpretApp?.notifications) {
        window.zkpretApp.notifications.info(
            'Template Selected',
            `${templateId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} template selected`
        );
    }
}

// Load available templates
async function loadAvailableTemplates() {
    if (window.zkpretApp?.notifications) {
        window.zkpretApp.notifications.info(
            'Templates Loaded',
            'Composition templates are now available for selection'
        );
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.zkpretApp = new ZKPretApplication();
    window.zkpretApp.init();
    console.log('✅ ZK-PRET Refactored Application initialized successfully');
});

// Export for global access if needed
window.ZKPretApplication = ZKPretApplication;