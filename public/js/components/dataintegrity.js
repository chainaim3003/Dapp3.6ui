class DataIntegrityComponent {
    constructor() {
        this.initialize();
    }

    initialize() {
        console.log('Data Integrity Component initialized');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Data type selection handler
        const dataTypeSelect = document.getElementById('data-type-select');
        if (dataTypeSelect) {
            dataTypeSelect.addEventListener('change', (e) => {
                this.handleDataTypeChange(e.target.value);
            });
        }

        // File selection handler
        const fileSelect = document.getElementById('data-file-select');
        if (fileSelect) {
            fileSelect.addEventListener('change', (e) => {
                this.handleFileSelection(e.target.value);
            });
        }

        // NOTE: Execute button handler is managed by app.js to support async/sync modes
        // The app calls this.executeDataIntegrityVerification() through executeBusinessDataIntegrity()
        console.log('DataIntegrityComponent: Event listeners setup (execute button managed by app)');
    }

    handleDataTypeChange(dataType) {
        console.log('Data type changed to:', dataType);
        
        // Update UI based on data type
        const fileSelect = document.getElementById('data-file-select');
        
        switch (dataType) {
            case 'DCSA-BillofLading-V3':
                if (fileSelect) {
                    fileSelect.title = 'Select a DCSA Bill of Lading V3 JSON file';
                }
                break;
            default:
                if (fileSelect) {
                    fileSelect.title = 'Select a data file for integrity verification';
                }
                break;
        }
    }

    handleFileSelection(selectedFile) {
        console.log('File selected:', selectedFile);
        
        if (selectedFile) {
            this.showFileInfo(selectedFile);
        }
    }

    showFileInfo(filename) {
        // Create or update file info display
        let fileInfoDiv = document.getElementById('selected-file-info');
        if (!fileInfoDiv) {
            fileInfoDiv = document.createElement('div');
            fileInfoDiv.id = 'selected-file-info';
            fileInfoDiv.className = 'mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg';
            
            const fileSelectContainer = document.getElementById('data-file-select')?.parentNode;
            if (fileSelectContainer) {
                fileSelectContainer.appendChild(fileInfoDiv);
            }
        }
        
        fileInfoDiv.innerHTML = `
            <div class="flex items-start">
                <i class="fas fa-file-alt text-blue-600 mt-0.5 mr-3"></i>
                <div class="flex-1">
                    <h5 class="font-medium text-blue-700 mb-1">Selected File Information</h5>
                    <div class="text-sm text-blue-600 space-y-1">
                        <div><strong>Filename:</strong> ${filename}</div>
                        <div><strong>Format:</strong> JSON (DCSA Standard)</div>
                        <div><strong>Verification Type:</strong> Zero-Knowledge Data Integrity Proof</div>
                    </div>
                </div>
            </div>
        `;
    }

    async executeDataIntegrityVerification() {
        console.log('🔄 DataIntegrityComponent: executeDataIntegrityVerification() called');
        
        // Get form values
        const dataType = document.getElementById('data-type-select')?.value;
        const selectedFile = document.getElementById('data-file-select')?.value;
        
        // Validate inputs
        if (!selectedFile) {
            this.showNotification('Please select a bill of lading file', 'error');
            return;
        }
        
        // If we have app reference, delegate to app's async/sync system
        if (this.app && typeof this.app.executeTool === 'function') {
            console.log('🔗 Using app\'s executeTool for async/sync support');
            
            // Construct the file path for the command pattern
            const relativeFilePath = `./src/data/SCF/BILLOFLADING/${selectedFile}`;
            
            // Prepare parameters
            const parameters = {
                command: 'node ./build/tests/with-sign/BusinessStandardDataIntegrityVerificationTest.js',
                dataType: dataType,
                filePath: relativeFilePath,
                selectedFile: selectedFile,
                typeOfNet: 'TESTNET'
            };
            
            try {
                // Use app's execution system which handles async/sync modes
                await this.app.executeTool('get-BSDI-compliance-verification', parameters);
                console.log('✅ DataIntegrityComponent: Delegated execution to app successfully');
            } catch (error) {
                console.error('❌ DataIntegrityComponent: App execution failed:', error);
                this.showNotification('Execution failed: ' + error.message, 'error');
            }
            return;
        }
        
        // Fallback to direct sync execution if app not available
        console.log('⚠️ App not available, falling back to direct sync execution');
        
        // Show loading state
        const executeButton = document.getElementById('data-integrity-execute-btn');
        const originalText = executeButton?.innerHTML;
        if (executeButton) {
            executeButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Verifying Integrity...';
            executeButton.disabled = true;
        }
        
        try {
            // Construct the file path for the command pattern
            const relativeFilePath = `./src/data/SCF/BILLOFLADING/${selectedFile}`;
            
            // Prepare parameters
            const parameters = {
                command: 'node ./build/tests/with-sign/BusinessStandardDataIntegrityVerificationTest.js',
                dataType: dataType,
                filePath: relativeFilePath,
                selectedFile: selectedFile,
                typeOfNet: 'TESTNET'
            };
            
            // Execute the verification
            const response = await fetch('/api/v1/tools/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    toolName: 'get-BSDI-compliance-verification',
                    parameters: parameters
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Data integrity verification completed successfully!', 'success');
                this.displayResult(result, dataType, selectedFile);
            } else {
                this.showNotification('Data integrity verification failed: ' + (result.error || 'Unknown error'), 'error');
            }
            
        } catch (error) {
            console.error('Data integrity verification error:', error);
            this.showNotification('Network error during verification', 'error');
        } finally {
            // Restore button state
            if (executeButton) {
                executeButton.innerHTML = originalText;
                executeButton.disabled = false;
            }
        }
    }

    displayResult(result, dataType, selectedFile) {
        // Get or create results container
        let resultsContainer = document.getElementById('data-integrity-results');
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'data-integrity-results';
            resultsContainer.className = 'mt-6 bg-green-50 border border-green-200 rounded-lg p-4';
            document.getElementById('data-integrity-tab').appendChild(resultsContainer);
        }
        
        resultsContainer.innerHTML = `
            <div class="flex items-start">
                <i class="fas fa-check-circle text-green-600 mt-0.5 mr-3"></i>
                <div class="flex-1">
                    <h4 class="font-bold text-green-800 mb-2">Business Standard Data Integrity Verification Complete</h4>
                    <div class="text-sm text-green-700 space-y-2">
                        <p><strong>Status:</strong> ${result.success ? 'SUCCESS' : 'FAILED'}</p>
                        <p><strong>Data Type:</strong> ${dataType}</p>
                        <p><strong>File Verified:</strong> ${selectedFile}</p>
                        <p><strong>ZK Proof Generated:</strong> ${result.result?.zkProofGenerated ? 'Yes' : 'No'}</p>
                        <p><strong>Execution Time:</strong> ${result.executionTime || 'N/A'}</p>
                        <p><strong>Timestamp:</strong> ${result.result?.timestamp || new Date().toISOString()}</p>
                        ${result.result?.executionStrategy ? `<p><strong>Strategy:</strong> ${result.result.executionStrategy}</p>` : ''}
                    </div>
                    
                    ${result.result?.executionMetrics ? `
                        <div class="mt-3 p-3 bg-white rounded border">
                            <h5 class="font-medium text-gray-700 mb-2">Integrity Verification Metrics</h5>
                            <div class="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                ${result.result.executionMetrics.proofGenerated ? '<div>✅ Proof Generated</div>' : ''}
                                ${result.result.executionMetrics.circuitCompiled ? '<div>✅ Circuit Compiled</div>' : ''}
                                ${result.result.executionMetrics.verificationSuccessful ? '<div>✅ Verification Successful</div>' : ''}
                                ${result.result.executionMetrics.timings ? `<div><strong>Processing Time:</strong> ${result.result.executionMetrics.timings.join(', ')} ms</div>` : ''}
                                ${result.result.executionMetrics.sizeMetrics ? `<div><strong>Data Size:</strong> ${result.result.executionMetrics.sizeMetrics.join(', ')}</div>` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                        <h5 class="font-medium text-blue-700 mb-2">What This Verification Proves</h5>
                        <div class="text-sm text-blue-600 space-y-1">
                            <div class="flex items-center"><i class="fas fa-shield-alt mr-2"></i>Data integrity without revealing content</div>
                            <div class="flex items-center"><i class="fas fa-fingerprint mr-2"></i>Cryptographic hash validation</div>
                            <div class="flex items-center"><i class="fas fa-lock mr-2"></i>Zero-knowledge proof of compliance</div>
                            <div class="flex items-center"><i class="fas fa-check-double mr-2"></i>DCSA standard adherence verification</div>
                        </div>
                    </div>
                    
                    ${result.result?.output ? `
                        <details class="mt-3">
                            <summary class="cursor-pointer text-green-700 hover:text-green-800 font-medium">
                                <i class="fas fa-code mr-1"></i>View Technical Execution Output
                            </summary>
                            <pre class="mt-2 bg-white border rounded p-3 text-xs overflow-auto max-h-64 text-gray-800">${result.result.output}</pre>
                        </details>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Scroll results into view
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    showNotification(message, type) {
        // Use the global app notification system if available
        if (window.app && window.app.showNotification) {
            window.app.showNotification('Data Integrity Verification', message, type);
        } else {
            // Fallback alert
            alert(message);
        }
    }

    render() {
        // This component uses the HTML form directly, no additional rendering needed
        console.log('Data Integrity component rendered');
    }
}

// Initialize the component when the script loads
window.DataIntegrityComponent = DataIntegrityComponent;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.dataIntegrityComponentInstance) {
            window.dataIntegrityComponentInstance = new DataIntegrityComponent();
        }
    });
} else {
    if (!window.dataIntegrityComponentInstance) {
        window.dataIntegrityComponentInstance = new DataIntegrityComponent();
    }
}
