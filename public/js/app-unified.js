// ZK-PRET Unified App Class - Handles both Sync and Async modes properly
class ZKPretUnifiedApp {
    constructor() {
        this.currentTab = 'compliance';
        this.isAsyncMode = true;
        this.jobs = new Map();
        this.websocket = null;
        this.syncExecuting = false;
        this.gleifComponent = null;
        this.uploadedFiles = {
            dataFile: null,
            actualProcessFile: null,
            expectedProcessFile: null,
            deepCompositionFile: null
        };
        
        // Initialize SCF data and methods if available
        if (window.scfEnhancement) {
            Object.assign(this, window.scfEnhancement);
            this.initSCF();
        }
        
        this.init();
    }

    async init() {
        this.checkSpecialTabMode();
        this.setupEventListeners();
        this.setupFileDropZones();
        this.initWebSocket();
        await this.checkConnection();
        this.updateModeDisplay();
    }

    checkSpecialTabMode() {
        const targetTab = sessionStorage.getItem('zkpret_target_tab');
        if (targetTab === 'process-integrity') {
            this.showProcessIntegrityOnly();
        } else if (targetTab === 'data-integrity') {
            this.showDataIntegrityOnly();
        } else if (targetTab === 'risk') {
            this.showRiskOnly();
        } else if (targetTab === 'registry') {
            this.showRegistryOnly();
        }
    }

    showProcessIntegrityOnly() {
        const mainNav = document.querySelector('#tab-navigation nav:first-child');
        const processIntegrityOnlyNav = document.getElementById('process-integrity-only-nav');
        
        if (mainNav) mainNav.classList.add('hidden');
        if (processIntegrityOnlyNav) processIntegrityOnlyNav.classList.remove('hidden');
        
        document.querySelectorAll('.tab-content').forEach(content => {
            if (content.id !== 'process-integrity-tab') {
                content.style.display = 'none';
            }
        });
        
        const processTab = document.getElementById('process-integrity-tab');
        if (processTab) processTab.classList.remove('hidden');
        this.currentTab = 'process-integrity';
        
        document.title = 'Business Process Integrity Prover | ZK-PRET';
        sessionStorage.removeItem('zkpret_target_tab');
    }

    showDataIntegrityOnly() {
        const mainNav = document.querySelector('#tab-navigation nav:first-child');
        const dataIntegrityOnlyNav = document.getElementById('data-integrity-only-nav');
        
        if (mainNav) mainNav.classList.add('hidden');
        if (dataIntegrityOnlyNav) dataIntegrityOnlyNav.classList.remove('hidden');
        
        document.querySelectorAll('.tab-content').forEach(content => {
            if (content.id !== 'data-integrity-tab') {
                content.style.display = 'none';
            }
        });
        
        const dataTab = document.getElementById('data-integrity-tab');
        if (dataTab) dataTab.classList.remove('hidden');
        this.currentTab = 'data-integrity';
        
        document.title = 'Business Data Integrity Prover | ZK-PRET';
        sessionStorage.removeItem('zkpret_target_tab');
    }

    showRiskOnly() {
        const mainNav = document.querySelector('#tab-navigation nav:first-child');
        const riskOnlyNav = document.getElementById('risk-only-nav');
        
        if (mainNav) mainNav.classList.add('hidden');
        if (riskOnlyNav) riskOnlyNav.classList.remove('hidden');
        
        document.querySelectorAll('.tab-content').forEach(content => {
            if (content.id !== 'risk-tab') {
                content.style.display = 'none';
            }
        });
        
        const riskTab = document.getElementById('risk-tab');
        if (riskTab) riskTab.classList.remove('hidden');
        this.currentTab = 'risk';
        
        document.title = 'Risk & Liquidity Prover | ZK-PRET';
        sessionStorage.removeItem('zkpret_target_tab');
    }

    showRegistryOnly() {
        const mainNav = document.querySelector('#tab-navigation nav:first-child');
        const registryOnlyNav = document.getElementById('registry-only-nav');
        
        if (mainNav) mainNav.classList.add('hidden');
        if (registryOnlyNav) registryOnlyNav.classList.remove('hidden');
        
        document.querySelectorAll('.tab-content').forEach(content => {
            if (content.id !== 'registry-tab') {
                content.style.display = 'none';
            }
        });
        
        const registryTab = document.getElementById('registry-tab');
        if (registryTab) registryTab.classList.remove('hidden');
        this.currentTab = 'registry';
        
        document.title = 'Registry | ZK-PRET';
        sessionStorage.removeItem('zkpret_target_tab');
    }

    setupEventListeners() {
        try {
            // Tab navigation
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tabName = e.target.dataset.tab || e.target.closest('.tab-btn').dataset.tab;
                    this.switchTab(tabName);
                });
            });

            // Mode toggle
            const asyncToggle = document.getElementById('async-mode-toggle');
            if (asyncToggle) {
                asyncToggle.addEventListener('change', (e) => {
                    this.isAsyncMode = e.target.checked;
                    this.updateModeDisplay();
                    this.showNotification(
                        this.isAsyncMode ? 'Async Mode Enabled' : 'Sync Mode Enabled',
                        this.isAsyncMode ? 'Jobs will run in background' : 'Jobs will block UI until complete',
                        'info'
                    );
                    
                    // Reinitialize WebSocket when switching to async mode
                    if (this.isAsyncMode) {
                        this.initWebSocket();
                    }
                });
            }

            // Data input method radio buttons
            document.querySelectorAll('input[name="data-input-method"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    this.toggleDataInputMethod(e.target.value);
                });
            });

            // Execution buttons
            this.setupExecutionButtons();
            
            // Clear completed jobs
            const clearJobsBtn = document.getElementById('clear-completed-jobs');
            if (clearJobsBtn) {
                clearJobsBtn.addEventListener('click', () => {
                    this.clearCompletedJobs();
                });
            }
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }

    setupExecutionButtons() {
        const buttons = [
            { id: 'gleif-execute-btn', method: 'executeGLEIF' },
            { id: 'corporate-execute-btn', method: 'executeCorporateRegistration' },
            { id: 'exim-execute-btn', method: 'executeEXIM' },
            { id: 'data-integrity-execute-btn', method: 'executeBusinessDataIntegrity' },
            { id: 'process-integrity-execute-btn', method: 'executeBusinessProcessIntegrity' },
            { id: 'risk-execute-btn', method: 'executeRiskLiquidity' },
            { id: 'scf-execute-btn', method: 'executeSCF' },
            { id: 'deep-composition-execute-btn', method: 'executeDeepComposition' },
            { id: 'registry-execute-btn', method: 'executeRegistry' },
            { id: 'composed-proof-execute-btn', method: 'executeComposedProof' }
        ];

        buttons.forEach(({ id, method }) => {
            const btn = document.getElementById(id);
            if (btn && this[method]) {
                btn.addEventListener('click', () => this[method]());
            }
        });

        // Enhanced mode toggle for GLEIF
        const gleifToggle = document.getElementById('gleif-enhanced-mode');
        if (gleifToggle) {
            gleifToggle.addEventListener('change', (e) => {
                this.toggleGLEIFMode(e.target.checked);
            });
        }
    }

    setupFileDropZones() {
        const dropZones = [
            { dropZoneId: 'data-file-drop-zone', inputId: 'data-file-input', fileKey: 'dataFile' },
            { dropZoneId: 'actual-process-drop-zone', inputId: 'actual-process-input', fileKey: 'actualProcessFile' },
            { dropZoneId: 'expected-process-drop-zone', inputId: 'expected-process-input', fileKey: 'expectedProcessFile' },
            { dropZoneId: 'deep-composition-file-drop-zone', inputId: 'deep-composition-file-input', fileKey: 'deepCompositionFile' }
        ];

        dropZones.forEach(({ dropZoneId, inputId, fileKey }) => {
            this.setupDropZone(dropZoneId, inputId, fileKey);
        });
    }

    setupDropZone(dropZoneId, inputId, fileKey) {
        const dropZone = document.getElementById(dropZoneId);
        const fileInput = document.getElementById(inputId);
        
        if (!dropZone || !fileInput) return;

        // Click to browse
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFile(e.target.files[0], fileKey, dropZoneId);
            }
        });

        // Drag and drop events
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
                this.handleFile(e.dataTransfer.files[0], fileKey, dropZoneId);
            }
        });
    }

    handleFile(file, fileKey, dropZoneId) {
        this.uploadedFiles[fileKey] = file;
        const dropZone = document.getElementById(dropZoneId);
        const placeholder = dropZone.querySelector('.file-placeholder');
        const fileInfo = dropZone.querySelector('.file-info');

        // Update UI
        if (placeholder) placeholder.style.display = 'none';
        if (fileInfo) fileInfo.classList.add('show');
        dropZone.classList.add('has-file');

        // Update file info
        const nameElement = fileInfo.querySelector('[id$="-file-name"]');
        const sizeElement = fileInfo.querySelector('[id$="-file-size"]');
        if (nameElement) nameElement.textContent = file.name;
        if (sizeElement) sizeElement.textContent = this.formatFileSize(file.size);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    toggleDataInputMethod(method) {
        const filePathSection = document.getElementById('data-filepath-section');
        const uploadSection = document.getElementById('data-upload-section');
        
        if (filePathSection && uploadSection) {
            if (method === 'filepath') {
                filePathSection.classList.remove('hidden');
                uploadSection.classList.add('hidden');
                this.clearDataFile();
            } else {
                filePathSection.classList.add('hidden');
                uploadSection.classList.remove('hidden');
                const pathInput = document.getElementById('data-file-path-input');
                if (pathInput) pathInput.value = '';
            }
        }
    }

    switchTab(tabName) {
        // In sync mode, prevent tab switching during execution
        if (!this.isAsyncMode && this.syncExecuting) {
            this.showNotification(
                'Execution in Progress',
                'Please wait for current execution to complete or switch to Async mode',
                'warning'
            );
            return;
        }

        // Check if we're in specialized mode
        const processIntegrityOnlyNav = document.getElementById('process-integrity-only-nav');
        const dataIntegrityOnlyNav = document.getElementById('data-integrity-only-nav');
        const riskOnlyNav = document.getElementById('risk-only-nav');
        const registryOnlyNav = document.getElementById('registry-only-nav');

        if ((!processIntegrityOnlyNav?.classList.contains('hidden')) || 
            (!dataIntegrityOnlyNav?.classList.contains('hidden')) || 
            (!riskOnlyNav?.classList.contains('hidden')) || 
            (!registryOnlyNav?.classList.contains('hidden'))) {
            return; // Don't allow tab switching in specialized mode
        }

        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        const targetTab = document.getElementById(`${tabName}-tab`);
        if (targetTab) {
            targetTab.classList.remove('hidden');
        }

        // Initialize GLEIF component when switching to GLEIF tab
        if (tabName === 'gleif' && !this.gleifComponent && window.GLEIFComponent) {
            this.gleifComponent = new window.GLEIFComponent();
        }

        this.currentTab = tabName;
    }

    toggleGLEIFMode(enhanced) {
        const originalForm = document.getElementById('gleif-original-form');
        const enhancedForm = document.getElementById('gleif-enhanced-form');
        
        if (originalForm && enhancedForm) {
            if (enhanced) {
                originalForm.classList.add('hidden');
                enhancedForm.classList.remove('hidden');
                
                if (!this.gleifComponent && window.GLEIFComponent) {
                    try {
                        this.gleifComponent = new window.GLEIFComponent();
                    } catch (error) {
                        console.error('Failed to initialize GLEIFComponent:', error);
                        this.showNotification('Enhancement Error', 'Failed to load enhanced mode', 'error');
                        const gleifToggle = document.getElementById('gleif-enhanced-mode');
                        if (gleifToggle) gleifToggle.checked = false;
                        this.toggleGLEIFMode(false);
                    }
                }
            } else {
                originalForm.classList.remove('hidden');
                enhancedForm.classList.add('hidden');
            }
        }
    }

    updateModeDisplay() {
        const jobQueuePanel = document.getElementById('job-queue-panel');
        const jobQueueIndicator = document.getElementById('job-queue-indicator');
        
        if (jobQueuePanel) {
            jobQueuePanel.style.display = this.isAsyncMode ? 'block' : 'none';
        }
        
        if (jobQueueIndicator) {
            if (this.isAsyncMode && this.jobs.size > 0) {
                jobQueueIndicator.classList.remove('hidden');
            } else {
                jobQueueIndicator.classList.add('hidden');
            }
        }
    }

    // WebSocket Management
    initWebSocket() {
        if (!this.isAsyncMode) return;

        try {
            // Close existing connection
            if (this.websocket) {
                this.websocket.close();
            }

            this.websocket = new WebSocket(`ws://localhost:3000`);
            
            this.websocket.onopen = () => {
                console.log('✅ WebSocket connected for async job updates');
                this.showNotification('Connection', 'Real-time job updates enabled', 'info');
            };

            this.websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'job_update') {
                        this.handleJobUpdate(data);
                    }
                } catch (error) {
                    console.error('WebSocket message parsing error:', error);
                }
            };

            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.showNotification('Connection Error', 'Real-time updates unavailable', 'warning');
            };

            this.websocket.onclose = () => {
                console.log('WebSocket disconnected');
                // Attempt to reconnect after 5 seconds
                setTimeout(() => {
                    if (this.isAsyncMode) {
                        this.initWebSocket();
                    }
                }, 5000);
            };
        } catch (error) {
            console.error('WebSocket initialization failed:', error);
        }
    }

    handleJobUpdate(data) {
        const job = this.jobs.get(data.jobId);
        if (!job) return;

        // Update job status
        job.status = data.status;
        job.progress = data.progress;
        job.result = data.result;
        job.error = data.error;

        if (data.status === 'completed' || data.status === 'failed') {
            job.endTime = new Date();
            
            if (data.status === 'completed' && data.result) {
                this.displayResult({
                    success: true,
                    result: data.result,
                    toolName: job.toolName,
                    executionTime: job.endTime - job.startTime + 'ms'
                });
            } else if (data.status === 'failed') {
                this.displayError(data.error || 'Job execution failed');
            }

            this.showNotification(
                data.status === 'completed' ? 'Job Completed' : 'Job Failed',
                `${job.toolName.replace('get-', '').replace('-with-sign', '').replace('-compliance-verification', '')} ${data.status === 'completed' ? 'completed successfully' : 'failed'}`,
                data.status === 'completed' ? 'success' : 'error'
            );
        }

        this.updateJobQueue();
        this.updateJobQueueIndicator();
    }

    updateJobQueue() {
        const container = document.getElementById('job-queue-list');
        if (!container) return;

        const jobs = Array.from(this.jobs.values()).reverse();
        
        if (jobs.length === 0) {
            container.innerHTML = `
                <div class="text-center py-6 text-gray-500">
                    <i class="fas fa-clock text-2xl mb-2 opacity-50"></i>
                    <p class="text-sm">No jobs in queue</p>
                </div>
            `;
            return;
        }

        container.innerHTML = jobs.map(job => `
            <div class="job-item p-3 border rounded-lg ${this.getJobBorderColor(job.status)} bg-white">
                <div class="flex justify-between items-center">
                    <div class="flex-1">
                        <div class="font-medium text-sm">
                            ${job.toolName.replace('get-', '').replace('-with-sign', '').replace('-compliance-verification', '')}
                        </div>
                        <div class="text-xs text-gray-500">
                            ${job.startTime.toLocaleTimeString()}
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        ${this.getJobStatusIcon(job.status)}
                        <span class="text-xs ${this.getJobStatusColor(job.status)}">${job.status}</span>
                    </div>
                </div>
                ${job.progress ? `
                    <div class="mt-2">
                        <div class="w-full bg-gray-200 rounded-full h-1">
                            <div class="bg-blue-600 h-1 rounded-full transition-all duration-300" style="width: ${job.progress}%"></div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    updateJobQueueIndicator() {
        const runningJobs = Array.from(this.jobs.values()).filter(job => 
            job.status === 'running' || job.status === 'pending'
        ).length;
        
        const countElement = document.getElementById('running-jobs-count');
        if (countElement) {
            countElement.textContent = runningJobs;
        }

        const indicator = document.getElementById('job-queue-indicator');
        if (indicator) {
            if (runningJobs > 0 && this.isAsyncMode) {
                indicator.classList.remove('hidden');
            } else {
                indicator.classList.add('hidden');
            }
        }
    }

    clearCompletedJobs() {
        for (const [jobId, job] of this.jobs.entries()) {
            if (job.status === 'completed' || job.status === 'failed') {
                this.jobs.delete(jobId);
            }
        }
        this.updateJobQueue();
        this.updateJobQueueIndicator();
        this.showNotification('Jobs Cleared', 'Completed jobs have been removed', 'info');
    }

    getJobBorderColor(status) {
        switch (status) {
            case 'pending': return 'border-yellow-400';
            case 'running': return 'border-blue-400';
            case 'completed': return 'border-green-400';
            case 'failed': return 'border-red-400';
            default: return 'border-gray-400';
        }
    }

    getJobStatusIcon(status) {
        switch (status) {
            case 'pending': return '<i class="fas fa-clock text-yellow-600"></i>';
            case 'running': return '<i class="fas fa-spinner fa-spin text-blue-600"></i>';
            case 'completed': return '<i class="fas fa-check text-green-600"></i>';
            case 'failed': return '<i class="fas fa-times text-red-600"></i>';
            default: return '<i class="fas fa-question text-gray-600"></i>';
        }
    }

    getJobStatusColor(status) {
        switch (status) {
            case 'pending': return 'text-yellow-600';
            case 'running': return 'text-blue-600';
            case 'completed': return 'text-green-600';
            case 'failed': return 'text-red-600';
            default: return 'text-gray-600';
        }
    }

    generateJobId() {
        return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Execution Methods
    async executeAsync(toolName, parameters) {
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
        this.updateJobQueueIndicator();

        // Show initial pending state in results
        this.displayPendingResult(job);

        try {
            const response = await fetch('/api/v1/jobs/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId, toolName, parameters })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            job.status = 'running';
            this.updateJobQueue();
            
            this.showNotification(
                'Job Started',
                `${toolName.replace('get-', '').replace('-with-sign', '').replace('-compliance-verification', '')} is now running in background`,
                'info'
            );
        } catch (error) {
            job.status = 'failed';
            job.error = error.message;
            this.updateJobQueue();
            this.displayError(error.message);
            this.showNotification('Job Failed', error.message, 'error');
        }
    }

    async executeSync(toolName, parameters) {
        this.syncExecuting = true;
        
        this.displayLoadingResult();

        try {
            const response = await fetch('/api/v1/tools/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toolName, parameters })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            this.displayResult(result);
        } catch (error) {
            this.displayError(error.message);
            this.showNotification('Execution Failed', error.message, 'error');
        } finally {
            this.syncExecuting = false;
        }
    }

    displayPendingResult(job) {
        const container = document.getElementById('execution-results');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-clock text-2xl mb-4 text-yellow-600"></i>
                    <p class="font-medium">Job Queued</p>
                    <p class="text-sm text-gray-600 mt-2">Running in background - you can switch tabs freely</p>
                    <div class="mt-4 text-xs text-gray-500">
                        Job ID: ${job.id.substring(0, 8)}...
                    </div>
                </div>
            `;
        }
    }

    displayLoadingResult() {
        const container = document.getElementById('execution-results');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-spinner fa-spin text-2xl mb-4 text-blue-600"></i>
                    <p class="font-medium">Generating ZK Proof...</p>
                    <p class="text-sm text-gray-600 mt-2">This may take a few moments</p>
                    <div class="mt-4 text-xs text-yellow-600">
                        ⚠️ Sync mode - UI is blocked. Switch to Async for better experience.
                    </div>
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
                    <div class="flex items-center mb-3">
                        <i class="fas fa-check-circle text-green-600 mr-2 text-lg"></i>
                        <span class="font-semibold text-green-800">Success</span>
                    </div>
                    <div class="space-y-2 text-sm">
                        <div><strong>Tool:</strong> ${result.toolName || 'ZK Proof Generation'}</div>
                        <div><strong>ZK Proof:</strong> Generated</div>
                        <div><strong>Time:</strong> ${result.executionTime || 'N/A'}</div>
                        ${result.result?.output ? `
                            <div class="mt-3">
                                <strong>Output:</strong>
                                <div class="mt-1 p-2 bg-gray-100 rounded text-xs font-mono max-h-32 overflow-y-auto">
                                    ${result.result.output.substring(0, 500)}${result.result.output.length > 500 ? '...' : ''}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        } else {
            this.displayError(result.error || 'Unknown error');
        }
    }

    displayError(message) {
        const container = document.getElementById('execution-results');
        if (container) {
            container.innerHTML = `
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div class="flex items-center mb-2">
                        <i class="fas fa-exclamation-circle text-red-600 mr-2 text-lg"></i>
                        <span class="font-semibold text-red-800">Failed</span>
                    </div>
                    <div class="text-sm text-red-700">
                        <strong>Error:</strong> ${message}
                    </div>
                </div>
            `;
        }
    }

    async checkConnection() {
        try {
            const response = await fetch('/api/v1/health');
            const health = await response.json();
            this.updateConnectionStatus(health.status === 'healthy');
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
                <div class="w-3 h-3 ${connected ? 'bg-green-400' : 'bg-red-400'} rounded-full"></div>
                <span class="text-sm text-gray-600">${connected ? 'Connected' : 'Disconnected'}</span>
            `;
        }
    }

    updateServerStatus(status) {
        const container = document.getElementById('server-status');
        if (container) {
            container.innerHTML = `
                <div class="space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-medium">Status</span>
                        <span class="px-2 py-1 rounded text-xs ${status.status === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${status.status || 'unknown'}</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-medium">ZK-PRET Server</span>
                        <span class="text-sm ${status.services?.zkPretServer ? 'text-green-600' : 'text-red-600'}">
                            <i class="fas fa-${status.services?.zkPretServer ? 'check' : 'times'} mr-1"></i>
                            ${status.services?.zkPretServer ? 'Online' : 'Offline'}
                        </span>
                    </div>
                    ${status.services?.asyncJobs !== undefined ? `
                        <div class="flex items-center justify-between">
                            <span class="text-sm font-medium">Async Jobs</span>
                            <span class="text-sm ${status.services?.asyncJobs ? 'text-green-600' : 'text-gray-600'}">
                                <i class="fas fa-${status.services?.asyncJobs ? 'check' : 'times'} mr-1"></i>
                                ${status.services?.asyncJobs ? 'Enabled' : 'Disabled'}
                            </span>
                        </div>
                    ` : ''}
                    <div class="text-xs text-gray-500">
                        Last updated: ${new Date(status.timestamp).toLocaleString()}
                    </div>
                </div>
            `;
        }
    }

    showNotification(title, message, type = 'info') {
        if (window.notifications) {
            window.notifications[type](title, message);
        } else {
            console.log(`${type.toUpperCase()}: ${title} - ${message}`);
        }
    }

    // Tool execution methods
    async executeGLEIF() {
        const companyName = document.getElementById('company-name-input')?.value?.trim();
        if (!companyName) {
            this.showNotification('Missing Information', 'Please enter a company name', 'warning');
            return;
        }

        const parameters = {
            companyName: companyName,
            typeOfNet: 'TESTNET'
        };

        if (this.isAsyncMode) {
            await this.executeAsync('get-GLEIF-verification-with-sign', parameters);
        } else {
            await this.executeSync('get-GLEIF-verification-with-sign', parameters);
        }
    }

    async executeCorporateRegistration() {
        const cin = document.getElementById('cin-input')?.value?.trim();
        if (!cin) {
            this.showNotification('Missing Information', 'Please enter the Corporate Identification Number (CIN)', 'error');
            return;
        }

        const parameters = {
            cin: cin,
            typeOfNet: 'TESTNET'
        };

        if (this.isAsyncMode) {
            await this.executeAsync('get-Corporate-Registration-verification-with-sign', parameters);
        } else {
            await this.executeSync('get-Corporate-Registration-verification-with-sign', parameters);
        }
    }

    async executeEXIM() {
        const companyName = document.getElementById('exim-company-name-input')?.value?.trim();
        if (!companyName) {
            this.showNotification('Missing Information', 'Please enter the Company Name for EXIM verification', 'error');
            return;
        }

        const parameters = {
            companyName: companyName,
            typeOfNet: 'TESTNET'
        };

        if (this.isAsyncMode) {
            await this.executeAsync('get-EXIM-verification-with-sign', parameters);
        } else {
            await this.executeSync('get-EXIM-verification-with-sign', parameters);
        }
    }

    async executeBusinessDataIntegrity() {
        const selectedMethod = document.querySelector('input[name="data-input-method"]:checked')?.value;
        let filePath;

        if (selectedMethod === 'filepath') {
            filePath = document.getElementById('data-file-path-input')?.value?.trim();
            if (!filePath) {
                filePath = 'default';
            }
        } else {
            if (!this.uploadedFiles.dataFile) {
                this.showNotification('Missing File', 'Please upload an actual data file', 'error');
                return;
            }
            filePath = this.uploadedFiles.dataFile.name;
        }

        const parameters = { filePath: filePath };

        if (this.isAsyncMode) {
            await this.executeAsync('get-BSDI-compliance-verification', parameters);
        } else {
            await this.executeSync('get-BSDI-compliance-verification', parameters);
        }
    }

    async executeBusinessProcessIntegrity() {
        if (!this.uploadedFiles.actualProcessFile || !this.uploadedFiles.expectedProcessFile) {
            this.showNotification('Missing Files', 'Please upload both actual and expected process files', 'error');
            return;
        }

        const processType = document.getElementById('process-type-select')?.value;
        const parameters = {
            actualProcessFile: this.uploadedFiles.actualProcessFile.name,
            expectedProcessFile: this.uploadedFiles.expectedProcessFile.name,
            actualFileContent: await this.readFileContent(this.uploadedFiles.actualProcessFile),
            expectedFileContent: await this.readFileContent(this.uploadedFiles.expectedProcessFile),
            businessProcessType: processType,
            typeOfNet: 'TESTNET'
        };

        if (this.isAsyncMode) {
            await this.executeAsync('get-BPI-compliance-verification', parameters);
        } else {
            await this.executeSync('get-BPI-compliance-verification', parameters);
        }
    }

    async executeRiskLiquidity() {
        const riskType = document.getElementById('risk-type-select')?.value;
        const threshold = document.getElementById('risk-threshold-input')?.value?.trim();
        const actusUrl = document.getElementById('risk-actus-url-input')?.value?.trim();

        if (!threshold) {
            this.showNotification('Missing Information', 'Please enter the threshold value', 'error');
            return;
        }

        if (!actusUrl) {
            this.showNotification('Missing Information', 'Please enter the ACTUS URL', 'error');
            return;
        }

        const thresholdNum = parseInt(threshold);
        if (isNaN(thresholdNum) || thresholdNum < 0 || thresholdNum > 9999) {
            this.showNotification('Invalid Threshold', 'Threshold must be a number between 0 and 9999', 'error');
            return;
        }

        let toolName;
        if (riskType === 'ACTUS_ADV') {
            toolName = 'get-RiskLiquidityACTUS-Verifier-Test_adv_zk';
        } else {
            toolName = 'get-RiskLiquidityACTUS-Verifier-Test_Basel3_Withsign';
        }

        const parameters = {
            threshold: thresholdNum,
            actusUrl: actusUrl
        };

        if (this.isAsyncMode) {
            await this.executeAsync(toolName, parameters);
        } else {
            await this.executeSync(toolName, parameters);
        }
    }

    async executeSCF() {
        const companyName = document.getElementById('scf-company-name-input')?.value?.trim();
        const supplierName = document.getElementById('scf-supplier-name-input')?.value?.trim();
        const invoiceAmount = document.getElementById('scf-invoice-amount-input')?.value?.trim();
        const financingType = document.getElementById('scf-financing-type-select')?.value;

        if (!companyName) {
            this.showNotification('Missing Information', 'Please enter the Company Name', 'error');
            return;
        }

        if (!supplierName) {
            this.showNotification('Missing Information', 'Please enter the Supplier Name', 'error');
            return;
        }

        if (!invoiceAmount) {
            this.showNotification('Missing Information', 'Please enter the Invoice Amount', 'error');
            return;
        }

        const amount = parseFloat(invoiceAmount);
        if (isNaN(amount) || amount <= 0) {
            this.showNotification('Invalid Amount', 'Please enter a valid invoice amount', 'error');
            return;
        }

        if (amount > 10000000) {
            this.showNotification('Amount Too Large', 'Invoice amount exceeds maximum limit of $10,000,000', 'error');
            return;
        }

        if (amount < 1000) {
            this.showNotification('Amount Too Small', 'Invoice amount must be at least $1,000', 'error');
            return;
        }

        const parameters = {
            companyName: companyName,
            supplierName: supplierName,
            invoiceAmount: amount,
            financingType: financingType,
            typeOfNet: 'TESTNET'
        };

        if (this.isAsyncMode) {
            await this.executeAsync('get-SCF-verification-with-sign', parameters);
        } else {
            await this.executeSync('get-SCF-verification-with-sign', parameters);
        }
    }

    async executeDeepComposition() {
        if (!this.uploadedFiles.deepCompositionFile) {
            this.showNotification('Missing File', 'Please upload an analysis file for DeepComposition', 'error');
            return;
        }

        const analysisType = document.getElementById('deep-composition-type-select')?.value;
        const confidence = document.getElementById('deep-composition-confidence')?.value;
        const maxIterations = document.getElementById('deep-composition-iterations')?.value;

        const confidenceNum = parseFloat(confidence);
        if (isNaN(confidenceNum) || confidenceNum < 0.1 || confidenceNum > 1.0) {
            this.showNotification('Invalid Confidence', 'Confidence threshold must be between 0.1 and 1.0', 'error');
            return;
        }

        const iterationsNum = parseInt(maxIterations);
        if (isNaN(iterationsNum) || iterationsNum < 10 || iterationsNum > 1000) {
            this.showNotification('Invalid Iterations', 'Max iterations must be between 10 and 1000', 'error');
            return;
        }

        const parameters = {
            analysisType: analysisType,
            fileName: this.uploadedFiles.deepCompositionFile.name,
            fileContent: await this.readFileContent(this.uploadedFiles.deepCompositionFile),
            confidence: confidenceNum,
            maxIterations: iterationsNum,
            typeOfNet: 'TESTNET'
        };

        if (this.isAsyncMode) {
            await this.executeAsync('get-DeepComposition-analysis-with-sign', parameters);
        } else {
            await this.executeSync('get-DeepComposition-analysis-with-sign', parameters);
        }
    }

    async executeRegistry() {
        const operation = document.getElementById('registry-operation-select')?.value;
        const entityName = document.getElementById('registry-entity-name-input')?.value?.trim();
        const entityType = document.getElementById('registry-entity-type-select')?.value;
        const registryId = document.getElementById('registry-identifier-input')?.value?.trim();
        const metadata = document.getElementById('registry-metadata-input')?.value?.trim();

        if (!entityName) {
            this.showNotification('Missing Information', 'Please enter the Entity Name', 'error');
            return;
        }

        let parsedMetadata = null;
        if (metadata) {
            try {
                parsedMetadata = JSON.parse(metadata);
            } catch (error) {
                this.showNotification('Invalid Metadata', 'Please enter valid JSON format for metadata', 'error');
                return;
            }
        }

        const parameters = {
            operation: operation,
            entityName: entityName,
            entityType: entityType,
            registryId: registryId || null,
            metadata: parsedMetadata,
            typeOfNet: 'TESTNET'
        };

        if (this.isAsyncMode) {
            await this.executeAsync('get-Registry-operation-with-sign', parameters);
        } else {
            await this.executeSync('get-Registry-operation-with-sign', parameters);
        }
    }

    async executeComposedProof() {
        const selectedTemplate = this.getSelectedTemplate();
        if (!selectedTemplate) {
            this.showNotification('No Template Selected', 'Please select a composition template first', 'error');
            return;
        }

        const globalParameters = this.collectGlobalParameters();
        const executionOptions = this.collectExecutionOptions();

        const composedProofRequest = {
            templateId: selectedTemplate,
            globalParameters,
            executionOptions,
            requestId: `composed-${Date.now()}`
        };

        this.showComposedProofProgress();

        try {
            const response = await fetch('/api/v1/composed-proofs/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(composedProofRequest)
            });

            const result = await response.json();

            if (result.success) {
                this.displayComposedProofResult(result.result);
                this.showNotification(
                    'Composed Proof Started',
                    `${selectedTemplate} composition is running${this.isAsyncMode ? ' in background' : ''}`,
                    'info'
                );
            } else {
                throw new Error(result.error || 'Composed proof execution failed');
            }
        } catch (error) {
            this.hideComposedProofProgress();
            this.showNotification('Execution Failed', error.message, 'error');
            this.displayError(error.message);
        }
    }

    getSelectedTemplate() {
        return window.selectedComposedTemplate || null;
    }

    collectGlobalParameters() {
        return {
            companyName: document.getElementById('composed-company-name')?.value?.trim(),
            cin: document.getElementById('composed-cin')?.value?.trim(),
            threshold: parseFloat(document.getElementById('composed-threshold')?.value) || 0.7,
            actusUrl: document.getElementById('composed-actus-url')?.value?.trim(),
            filePath: document.getElementById('composed-file-path')?.value?.trim(),
            processId: document.getElementById('composed-process-id')?.value?.trim()
        };
    }

    collectExecutionOptions() {
        return {
            maxParallelism: parseInt(document.getElementById('composed-max-parallelism')?.value) || 2,
            enableCaching: document.getElementById('composed-enable-caching')?.value === 'true',
            retryPolicy: {
                maxRetries: parseInt(document.getElementById('composed-max-retries')?.value) || 2,
                backoffStrategy: document.getElementById('composed-retry-strategy')?.value || 'FIXED',
                backoffDelay: parseInt(document.getElementById('composed-retry-delay')?.value) || 1000
            }
        };
    }

    showComposedProofProgress() {
        const progressDiv = document.getElementById('composed-proof-progress');
        if (progressDiv) {
            progressDiv.classList.remove('hidden');
            const detailsDiv = document.getElementById('progress-details');
            if (detailsDiv) {
                detailsDiv.innerHTML = `
                    <div class="text-center py-4">
                        <i class="fas fa-spinner fa-spin text-2xl text-blue-600 mb-3"></i>
                        <p class="font-medium">Executing Composed Proof...</p>
                        <p class="text-sm text-gray-600 mt-2">Running multiple verification components</p>
                    </div>
                `;
            }
        }
    }

    hideComposedProofProgress() {
        const progressDiv = document.getElementById('composed-proof-progress');
        if (progressDiv) {
            progressDiv.classList.add('hidden');
        }
    }

    displayComposedProofResult(result) {
        this.hideComposedProofProgress();
        const container = document.getElementById('execution-results');
        if (!container) return;

        if (result.success) {
            container.innerHTML = `
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div class="flex items-center mb-3">
                        <i class="fas fa-check-circle text-green-600 mr-2 text-lg"></i>
                        <span class="font-semibold text-green-800">Composed Proof Completed</span>
                    </div>
                    <div class="space-y-2 text-sm">
                        <div><strong>Overall Verdict:</strong> ${result.overallVerdict}</div>
                        <div><strong>Execution ID:</strong> ${result.executionId?.substring(0, 8)}...</div>
                        <div><strong>Total Components:</strong> ${result.aggregatedResult?.totalComponents || 0}</div>
                        <div><strong>Passed:</strong> <span class="text-green-600">${result.aggregatedResult?.passedComponents || 0}</span></div>
                        <div><strong>Failed:</strong> <span class="text-red-600">${result.aggregatedResult?.failedComponents || 0}</span></div>
                        <div><strong>Execution Time:</strong> ${result.executionMetrics?.totalExecutionTime || 'N/A'}</div>
                        ${result.componentResults && result.componentResults.length > 0 ? `
                            <div class="mt-3">
                                <strong>Component Results:</strong>
                                <div class="mt-1 space-y-1">
                                    ${result.componentResults.map(comp => `
                                        <div class="flex justify-between items-center p-2 bg-gray-50 rounded text-xs">
                                            <span>${comp.componentId}</span>
                                            <span class="px-2 py-1 rounded ${comp.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${comp.status}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        } else {
            this.displayError(result.error || 'Composed proof execution failed');
        }
    }

    async readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    // File clearing methods
    clearDataFile() {
        this.uploadedFiles.dataFile = null;
        const dropZone = document.getElementById('data-file-drop-zone');
        if (dropZone) {
            const placeholder = dropZone.querySelector('.file-placeholder');
            const fileInfo = dropZone.querySelector('.file-info');
            if (placeholder) placeholder.style.display = 'flex';
            if (fileInfo) fileInfo.classList.remove('show');
            dropZone.classList.remove('has-file');
        }
        const fileInput = document.getElementById('data-file-input');
        if (fileInput) fileInput.value = '';
    }

    clearActualProcessFile() {
        this.uploadedFiles.actualProcessFile = null;
        const dropZone = document.getElementById('actual-process-drop-zone');
        if (dropZone) {
            const placeholder = dropZone.querySelector('.file-placeholder');
            const fileInfo = dropZone.querySelector('.file-info');
            if (placeholder) placeholder.style.display = 'flex';
            if (fileInfo) fileInfo.classList.remove('show');
            dropZone.classList.remove('has-file');
        }
        const fileInput = document.getElementById('actual-process-input');
        if (fileInput) fileInput.value = '';
    }

    clearExpectedProcessFile() {
        this.uploadedFiles.expectedProcessFile = null;
        const dropZone = document.getElementById('expected-process-drop-zone');
        if (dropZone) {
            const placeholder = dropZone.querySelector('.file-placeholder');
            const fileInfo = dropZone.querySelector('.file-info');
            if (placeholder) placeholder.style.display = 'flex';
            if (fileInfo) fileInfo.classList.remove('show');
            dropZone.classList.remove('has-file');
        }
        const fileInput = document.getElementById('expected-process-input');
        if (fileInput) fileInput.value = '';
    }

    clearDeepCompositionFile() {
        this.uploadedFiles.deepCompositionFile = null;
        const dropZone = document.getElementById('deep-composition-file-drop-zone');
        if (dropZone) {
            const placeholder = dropZone.querySelector('.file-placeholder');
            const fileInfo = dropZone.querySelector('.file-info');
            if (placeholder) placeholder.style.display = 'flex';
            if (fileInfo) fileInfo.classList.remove('show');
            dropZone.classList.remove('has-file');
        }
        const fileInput = document.getElementById('deep-composition-file-input');
        if (fileInput) fileInput.value = '';
    }
}

// Global functions
window.selectedComposedTemplate = null;

function selectComposedProofTemplate(templateId) {
    window.selectedComposedTemplate = templateId;
    
    // Update template selection visual feedback
    document.querySelectorAll('[onclick*="selectComposedProofTemplate"]').forEach(el => {
        el.classList.remove('ring-2', 'ring-purple-500', 'border-purple-300');
        el.classList.add('border-gray-200');
    });
    
    const selectedElement = event.target.closest('.bg-white.rounded-lg.p-4.border');
    if (selectedElement) {
        selectedElement.classList.remove('border-gray-200');
        selectedElement.classList.add('ring-2', 'ring-purple-500', 'border-purple-300');
    }
    
    // Show selected template info
    const templateInfo = document.getElementById('selected-template-info');
    const templateName = document.getElementById('selected-template-name');
    const templateDetails = document.getElementById('template-details');
    
    if (templateInfo) templateInfo.classList.remove('hidden');
    if (templateName) templateName.textContent = templateId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Template-specific details
    const templates = {
        'full-kyc-compliance': {
            description: 'Combines GLEIF entity verification, Corporate Registration validation, and EXIM trade compliance checks',
            components: ['GLEIF Verification', 'Corporate Registration', 'EXIM Verification (Optional)'],
            aggregation: 'All Required (2 out of 3, EXIM optional)',
            estimatedTime: '2-5 minutes'
        },
        'financial-risk-assessment': {
            description: 'Evaluates financial risk using Basel3 compliance and advanced ACTUS risk models',
            components: ['Basel3 Compliance Check', 'ACTUS Advanced Risk Model'],
            aggregation: 'Weighted Scoring (Basel3: 60%, ACTUS: 40%)',
            estimatedTime: '3-7 minutes'
        },
        'business-integrity-check': {
            description: 'Verifies business data integrity and process compliance',
            components: ['Business Standard Data Integrity', 'Business Process Integrity'],
            aggregation: 'All Components Required',
            estimatedTime: '2-4 minutes'
        },
        'comprehensive-compliance': {
            description: 'Complete compliance verification combining all major regulatory checks',
            components: ['KYC Phase', 'Risk Assessment Phase', 'Integrity Verification Phase'],
            aggregation: 'Weighted Multi-Phase (KYC: 40%, Risk: 35%, Integrity: 25%)',
            estimatedTime: '8-15 minutes'
        }
    };
    
    const template = templates[templateId];
    if (template && templateDetails) {
        templateDetails.innerHTML = `
            <div class="space-y-3">
                <p class="text-gray-700">${template.description}</p>
                <div>
                    <strong class="text-gray-900">Components:</strong>
                    <div class="mt-1 space-y-1">
                        ${template.components.map(comp => `
                            <div class="flex items-center text-sm text-gray-600">
                                <i class="fas fa-check text-green-500 mr-2 text-xs"></i>
                                ${comp}
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <strong class="text-gray-900">Aggregation:</strong>
                        <p class="text-sm text-gray-600">${template.aggregation}</p>
                    </div>
                    <div>
                        <strong class="text-gray-900">Est. Time:</strong>
                        <p class="text-sm text-gray-600">${template.estimatedTime}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    if (window.app) {
        window.app.showNotification(
            'Template Selected',
            `${templateName.textContent} composition template selected`,
            'info'
        );
    }
}

async function loadAvailableTemplates() {
    const button = document.getElementById('load-templates-btn');
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...';
    button.disabled = true;
    
    try {
        const response = await fetch('/api/v1/composed-proofs/templates');
        const data = await response.json();
        
        if (data.templates && data.templates.length > 0) {
            window.app?.showNotification(
                'Templates Loaded',
                `Found ${data.total} available composition templates`,
                'success'
            );
        } else {
            window.app?.showNotification(
                'No Templates',
                'No composition templates found on server',
                'warning'
            );
        }
    } catch (error) {
        window.app?.showNotification(
            'Load Failed',
            'Failed to load templates from server',
            'error'
        );
        console.error('Failed to load templates:', error);
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// File management functions
function clearDataFile() {
    if (window.app && window.app.clearDataFile) {
        window.app.clearDataFile();
    }
}

function clearActualProcessFile() {
    if (window.app && window.app.clearActualProcessFile) {
        window.app.clearActualProcessFile();
    }
}

function clearExpectedProcessFile() {
    if (window.app && window.app.clearExpectedProcessFile) {
        window.app.clearExpectedProcessFile();
    }
}

function clearDeepCompositionFile() {
    if (window.app && window.app.clearDeepCompositionFile) {
        window.app.clearDeepCompositionFile();
    }
}

// Initialize the unified app
document.addEventListener('DOMContentLoaded', () => {
    // Clear any existing app instance
    if (window.app) {
        delete window.app;
    }
    
    // Create new unified app instance
    try {
        window.app = new ZKPretUnifiedApp();
        console.log('✅ ZK-PRET Unified App initialized successfully');
        
        // Check if user came from home page with specific tab
        const targetTab = sessionStorage.getItem('zkpret_target_tab');
        if (targetTab) {
            sessionStorage.removeItem('zkpret_target_tab');
            setTimeout(() => {
                window.app.switchTab(targetTab);
            }, 100);
        }
    } catch (error) {
        console.error('❌ Failed to initialize ZK-PRET Unified App:', error);
    }
});
