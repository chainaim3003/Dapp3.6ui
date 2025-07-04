class GLEIFComponent {
    constructor() {
        this.showStateChanges = false;
        this.render();
        this.setupEventListeners();
    }

    render() {
        const container = document.getElementById('gleif-content');
        container.innerHTML = `
            <form id="gleif-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Legal Entity Identifier (LEI)</label>
                    <input type="text" name="entityId" class="form-input" placeholder="Enter 20-character LEI code">
                    <div class="text-xs text-gray-500 mt-1">The unique 20-character alphanumeric code assigned to the legal entity</div>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Legal Entity Name</label>
                    <input type="text" name="legalName" class="form-input" placeholder="Enter the legal name of the entity">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Jurisdiction</label>
                    <select name="jurisdiction" class="form-select">
                        <option value="">Select jurisdiction (optional)</option>
                        <option value="US">United States</option>
                        <option value="GB">United Kingdom</option>
                        <option value="DE">Germany</option>
                        <option value="FR">France</option>
                        <option value="JP">Japan</option>
                        <option value="CA">Canada</option>
                    </select>
                </div>
                
                <!-- Blockchain State Tracking Option -->
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <h4 class="text-sm font-medium text-gray-900 mb-1">Blockchain State Tracking</h4>
                            <p class="text-xs text-gray-600">Show before/after blockchain state changes</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="state-tracking-toggle" class="sr-only" ${this.showStateChanges ? 'checked' : ''}>
                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>
                
                <button type="submit" class="btn btn-primary w-full">
                    <i class="fas fa-play mr-2"></i>Generate GLEIF ZK Proof
                </button>
            </form>
            
            <!-- Blockchain State Display Section -->
            <div id="blockchain-state-section" class="mt-6 hidden">
                <div class="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 class="text-lg font-semibold mb-4 flex items-center">
                        <i class="fas fa-cube mr-2 text-blue-600"></i>
                        Blockchain State Changes
                    </h3>
                    
                    <!-- Loading State -->
                    <div id="state-loading" class="hidden text-center py-8">
                        <div class="inline-flex items-center px-4 py-2 bg-blue-50 rounded-lg">
                            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                            <span class="text-sm text-blue-700">Querying blockchain state...</span>
                        </div>
                    </div>
                    
                    <!-- State Comparison Display -->
                    <div id="state-comparison" class="hidden">
                        <div class="grid md:grid-cols-2 gap-6">
                            <!-- Before State -->
                            <div class="bg-gray-50 rounded-lg p-4">
                                <h4 class="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                    <i class="fas fa-clock mr-2 text-gray-500"></i>
                                    Before Execution
                                </h4>
                                <div id="before-state" class="space-y-2">
                                    <!-- Before state will be populated here -->
                                </div>
                            </div>
                            
                            <!-- After State -->
                            <div class="bg-green-50 rounded-lg p-4">
                                <h4 class="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                    <i class="fas fa-check-circle mr-2 text-green-500"></i>
                                    After Execution
                                </h4>
                                <div id="after-state" class="space-y-2">
                                    <!-- After state will be populated here -->
                                </div>
                            </div>
                        </div>
                        
                        <!-- Changes Summary -->
                        <div id="changes-summary" class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 class="text-sm font-semibold text-blue-800 mb-2 flex items-center">
                                <i class="fas fa-list-ul mr-2"></i>
                                Changes Detected
                            </h4>
                            <div id="changes-list" class="space-y-1">
                                <!-- Changes will be populated here -->
                            </div>
                        </div>
                    </div>
                    
                    <!-- No Changes Display -->
                    <div id="no-changes" class="hidden text-center py-6">
                        <div class="text-gray-500">
                            <i class="fas fa-equals text-2xl mb-2"></i>
                            <p class="text-sm">No blockchain state changes detected</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // State tracking toggle
        document.getElementById('state-tracking-toggle').addEventListener('change', (e) => {
            this.showStateChanges = e.target.checked;
            this.toggleStateSection();
        });
        
        // Form submission
        document.getElementById('gleif-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const parameters = Object.fromEntries(formData.entries());
            
            // Remove empty values
            Object.keys(parameters).forEach(key => {
                if (!parameters[key]) delete parameters[key];
            });

            if (this.showStateChanges) {
                await this.executeWithStateTracking(parameters);
            } else {
                await window.app.executeTool('get-GLEIF-verification-with-sign', parameters);
            }
        });
    }
    
    toggleStateSection() {
        const stateSection = document.getElementById('blockchain-state-section');
        if (this.showStateChanges) {
            stateSection.classList.remove('hidden');
        } else {
            stateSection.classList.add('hidden');
        }
    }
    
    async executeWithStateTracking(parameters) {
        try {
            // Show state section and loading
            document.getElementById('blockchain-state-section').classList.remove('hidden');
            document.getElementById('state-loading').classList.remove('hidden');
            document.getElementById('state-comparison').classList.add('hidden');
            document.getElementById('no-changes').classList.add('hidden');
            
            // Execute tool with state tracking
            const response = await fetch('/api/v1/tools/execute-with-state', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    toolName: 'get-GLEIF-verification-with-sign',
                    parameters
                })
            });
            
            const result = await response.json();
            
            // Hide loading
            document.getElementById('state-loading').classList.add('hidden');
            
            // Display results in the main execution results area
            if (window.app && window.app.displayExecutionResult) {
                window.app.displayExecutionResult({
                    success: result.success,
                    result: result.result,
                    executionTime: result.executionTime
                });
            }
            
            // Display state changes if available
            if (result.stateComparison) {
                this.displayStateComparison(result.stateComparison);
            } else {
                document.getElementById('no-changes').classList.remove('hidden');
            }
            
        } catch (error) {
            console.error('Error executing with state tracking:', error);
            
            // Hide loading and show error
            document.getElementById('state-loading').classList.add('hidden');
            document.getElementById('no-changes').classList.remove('hidden');
            document.getElementById('no-changes').innerHTML = `
                <div class="text-red-500">
                    <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                    <p class="text-sm">Failed to retrieve blockchain state changes</p>
                    <p class="text-xs mt-1">${error.message}</p>
                </div>
            `;
            
            // Still show the execution result if available
            if (window.app && window.app.showNotification) {
                window.app.showNotification('State Tracking Error', 'Failed to retrieve blockchain state changes', 'error');
            }
        }
    }
    
    displayStateComparison(stateComparison) {
        const { beforeFormatted, afterFormatted, changes, hasChanges } = stateComparison;
        
        if (!hasChanges) {
            document.getElementById('no-changes').classList.remove('hidden');
            return;
        }
        
        // Show state comparison
        document.getElementById('state-comparison').classList.remove('hidden');
        
        // Populate before state
        const beforeContainer = document.getElementById('before-state');
        beforeContainer.innerHTML = Object.entries(beforeFormatted).map(([key, value]) => `
            <div class="flex justify-between text-xs">
                <span class="text-gray-600">${key}:</span>
                <span class="font-mono text-gray-800">${value}</span>
            </div>
        `).join('');
        
        // Populate after state
        const afterContainer = document.getElementById('after-state');
        afterContainer.innerHTML = Object.entries(afterFormatted).map(([key, value]) => `
            <div class="flex justify-between text-xs">
                <span class="text-gray-600">${key}:</span>
                <span class="font-mono text-gray-800">${value}</span>
            </div>
        `).join('');
        
        // Populate changes summary
        const changesContainer = document.getElementById('changes-list');
        const changedFields = changes.filter(change => change.changed);
        
        if (changedFields.length === 0) {
            changesContainer.innerHTML = '<p class="text-xs text-blue-700">No changes detected</p>';
        } else {
            changesContainer.innerHTML = changedFields.map(change => {
                const icon = this.getChangeIcon(change.type, change.before, change.after);
                const formattedBefore = this.formatValue(change.before);
                const formattedAfter = this.formatValue(change.after);
                
                return `
                    <div class="flex items-center text-xs text-blue-800">
                        <i class="${icon} mr-2 text-green-500"></i>
                        <span class="font-medium">${this.formatFieldName(change.field)}:</span>
                        <span class="ml-2 font-mono">${formattedBefore} → ${formattedAfter}</span>
                    </div>
                `;
            }).join('');
        }
    }
    
    getChangeIcon(type, before, after) {
        if (type === 'boolean') {
            return after ? 'fas fa-toggle-on' : 'fas fa-toggle-off';
        } else if (type === 'number') {
            return after > before ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
        } else {
            return 'fas fa-edit';
        }
    }
    
    formatValue(value) {
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        return String(value);
    }
    
    formatFieldName(field) {
        return field.replace(/([A-Z])/g, ' $1')
                    .replace(/^./, str => str.toUpperCase())
                    .replace(/^Is /, '');
    }
}

window.GLEIFComponent = GLEIFComponent;
