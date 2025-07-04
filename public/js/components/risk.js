class RiskComponent {
    constructor() {
        console.log('📌 RiskComponent constructor called');
        
        try {
            this.currentRiskTab = 'basel3'; // Default to Basel III Compliance tab
            this.showStateChanges = false;
            this.actusUrl = 'http://98.84.165.146:8083/eventsBatch'; // Default fallback
            
            console.log('📌 Starting RiskComponent render...');
            this.render();
            console.log('📌 RiskComponent render completed');
            
            console.log('📌 Setting up RiskComponent event listeners...');
            this.setupEventListeners();
            console.log('📌 RiskComponent event listeners setup completed');
            
            // Initialize configuration
            this.initializeConfiguration();
            
            console.log('✅ RiskComponent constructor completed successfully');
        } catch (error) {
            console.error('❌ RiskComponent constructor failed:', error);
            console.error('Error stack:', error.stack);
            throw error;
        }
    }

    async initializeConfiguration() {
        // Load ACTUS URL from server environment
        await this.loadActusConfiguration();
        
        // Load Basel III config files
        await this.populateBasel3ConfigFiles();
        
        // Load Risk Advanced config files and execution settings
        await this.populateAdvancedConfigFiles();
        await this.populateAdvancedExecutionSettings();
        
        // Load Stablecoin jurisdictions and setup jurisdiction change handler
        await this.populateStablecoinJurisdictions();
        this.setupStablecoinJurisdictionHandler();
    }

    async loadActusConfiguration() {
        try {
            console.log('🔄 Loading ACTUS configuration from server...');
            
            const response = await fetch('/api/v1/actus-config');
            if (response.ok) {
                const data = await response.json();
                this.actusUrl = data.actusUrl;
                
                // Update the input field if it exists
                const actusInput = document.getElementById('basel3-actus-url');
                if (actusInput) {
                    actusInput.value = this.actusUrl;
                }
                
                console.log(`✅ ACTUS URL loaded from ${data.source}:`, this.actusUrl);
            } else {
                console.log('⚠️ Failed to load ACTUS configuration, using default');
            }
        } catch (error) {
            console.error('Failed to load ACTUS configuration:', error);
        }
    }

    render() {
        console.log('🎨 RiskComponent render() called');
        
        const container = document.getElementById('risk-content');
        console.log('🗺 Container found:', !!container, container);
        
        if (!container) {
            console.error('❌ risk-content container not found!');
            return;
        }
        
        try {
            container.innerHTML = `
                <!-- Risk & Liquidity Tab Navigation -->
                <div class="mb-6">
                    <div class="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                        <button class="risk-tab-btn flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors active" 
                                data-risk-tab="basel3">
                            <i class="fas fa-university mr-2"></i>Basel III Compliance
                        </button>
                        <button class="risk-tab-btn flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors" 
                                data-risk-tab="stablecoin">
                            <i class="fas fa-coins mr-2"></i>Stablecoin
                        </button>
                        <button class="risk-tab-btn flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors" 
                                data-risk-tab="advanced">
                            <i class="fas fa-chart-area mr-2"></i>Advanced
                        </button>
                    </div>
                </div>

                <!-- Basel III Compliance Tab -->
                <div id="basel3-risk-tab" class="risk-tab-content">
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <div class="flex items-center mb-3">
                            <i class="fas fa-university text-blue-600 text-lg mr-3"></i>
                            <h3 class="text-lg font-semibold text-blue-800">Basel III Compliance Verification</h3>
                        </div>
                        <p class="text-blue-700 text-sm">
                            Verify compliance with Basel III regulatory requirements for capital adequacy, stress testing, and market liquidity risk.
                        </p>
                    </div>

                    <form id="basel3-form" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                <strong>Basel III Configuration File</strong>
                            </label>
                            <select id="basel3-config-select" class="form-input">
                                <option value="">Select Basel III configuration file...</option>
                            </select>
                            <div class="text-xs text-gray-500 mt-1">Configuration files from the Basel III CONFIG directory</div>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <strong>LCR Threshold</strong>
                                </label>
                                <input type="number" id="basel3-lcr-threshold" class="form-input" 
                                       placeholder="Enter LCR threshold" min="0" step="0.01" value="100">
                                <div class="text-xs text-gray-500 mt-1">Liquidity Coverage Ratio threshold</div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <strong>NSFR Threshold</strong>
                                </label>
                                <input type="number" id="basel3-nsfr-threshold" class="form-input" 
                                       placeholder="Enter NSFR threshold" min="0" step="0.01" value="100">
                                <div class="text-xs text-gray-500 mt-1">Net Stable Funding Ratio threshold</div>
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                <strong>ACTUS Server URL</strong>
                            </label>
                            <input type="url" id="basel3-actus-url" class="form-input bg-gray-50" 
                                   value="${this.getDefaultActusUrl()}" readonly>
                            <div class="text-xs text-gray-500 mt-1">ACTUS framework server endpoint (configured)</div>
                        </div>
                        
                        <!-- Blockchain State Tracking Option -->
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div class="flex items-center justify-between">
                                <div>
                                    <h4 class="text-sm font-medium text-gray-900 mb-1">Blockchain State Tracking</h4>
                                    <p class="text-xs text-gray-600">Show before/after blockchain state changes</p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="basel3-state-tracking-toggle" class="sr-only">
                                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>
                        
                        <button type="submit" class="btn btn-primary w-full">
                            <i class="fas fa-university mr-2"></i>Generate Basel III Compliance ZK Proof
                        </button>
                    </form>
                </div>

                <!-- Stablecoin Tab -->
                <div id="stablecoin-risk-tab" class="risk-tab-content hidden">
                    <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                        <div class="flex items-center mb-3">
                            <i class="fas fa-coins text-green-600 text-lg mr-3"></i>
                            <h3 class="text-lg font-semibold text-green-800">Stablecoin Verification</h3>
                        </div>
                        <p class="text-green-700 text-sm">
                            Verify stablecoin reserves and regulatory compliance using jurisdiction-specific configurations.
                        </p>
                    </div>

                    <form id="stablecoin-form" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                <strong>Jurisdiction</strong>
                            </label>
                            <select id="stablecoin-jurisdiction-select" class="form-input">
                                <option value="">Select jurisdiction...</option>
                            </select>
                            <div class="text-xs text-gray-500 mt-1">Regulatory jurisdiction for stablecoin verification</div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                <strong>Situation</strong>
                            </label>
                            <select id="stablecoin-situation-select" class="form-input" disabled>
                                <option value="">Select situation...</option>
                            </select>
                            <div class="text-xs text-gray-500 mt-1">Specific scenario configuration file</div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                <strong>Liquidity THRESHOLD</strong>
                            </label>
                            <input type="number" id="stablecoin-liquidity-threshold" class="form-input" 
                                   value="100" min="0" step="1">
                            <div class="text-xs text-gray-500 mt-1">Liquidity threshold value</div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                <strong>ACTUS-URL-SERVER</strong>
                            </label>
                            <input type="url" id="stablecoin-actus-url" class="form-input bg-gray-50" 
                                   value="${this.getDefaultActusUrl()}" readonly>
                            <div class="text-xs text-gray-500 mt-1">ACTUS framework server endpoint (configured)</div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                <strong>Execution Mode</strong>
                            </label>
                            <select id="stablecoin-execution-mode" class="form-input">
                                <option value="ultra_strict" selected>Ultra Strict</option>
                                <option value="strict">Strict</option>
                                <option value="standard">Standard</option>
                                <option value="relaxed">Relaxed</option>
                            </select>
                            <div class="text-xs text-gray-500 mt-1">Verification strictness level</div>
                        </div>
                        
                        <button type="submit" class="btn btn-primary w-full">
                            <i class="fas fa-coins mr-2"></i>Generate Stablecoin ZK Proof
                        </button>
                    </form>
                </div>

                <!-- Advanced Tab -->
                <div id="advanced-risk-tab" class="risk-tab-content hidden">
                    <div class="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                        <div class="flex items-center mb-3">
                            <i class="fas fa-chart-area text-purple-600 text-lg mr-3"></i>
                            <h3 class="text-lg font-semibold text-purple-800">Advanced Risk Model</h3>
                        </div>
                        <p class="text-purple-700 text-sm">
                            Advanced risk assessment models with custom parameters and sophisticated analytics.
                        </p>
                    </div>

                    <form id="advanced-form" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                <strong>ZK PRET Server Location</strong>
                            </label>
                            <select id="advanced-config-select" class="form-input">
                                <option value="">Select advanced configuration file...</option>
                            </select>
                            <div class="text-xs text-gray-500 mt-1">Configuration files from the Risk Advanced CONFIG directory</div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                <strong>Liquidity THRESHOLD</strong>
                            </label>
                            <input type="number" id="advanced-liquidity-threshold" class="form-input" 
                                   placeholder="Enter liquidity threshold" min="0" step="1" value="100">
                            <div class="text-xs text-gray-500 mt-1">Liquidity threshold value (default: 100)</div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                <strong>ACTUS-URL-SERVER</strong>
                            </label>
                            <input type="url" id="advanced-actus-url" class="form-input bg-gray-50" 
                                   value="${this.getDefaultActusUrl()}" readonly>
                            <div class="text-xs text-gray-500 mt-1">ACTUS framework server endpoint (configured)</div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                <strong>Execution Settings</strong>
                            </label>
                            <select id="advanced-execution-settings" class="form-input">
                                <option value="">Select execution mode...</option>
                            </select>
                            <div class="text-xs text-gray-500 mt-1">Execution mode based on execution-settings.json</div>
                        </div>
                        
                        <button type="submit" class="btn btn-primary w-full">
                            <i class="fas fa-chart-area mr-2"></i>Generate Risk Advanced ZK Proof
                        </button>
                    </form>
                </div>
                
                <!-- Blockchain State Display Section (shared across all tabs) -->
                <div id="risk-blockchain-state-section" class="mt-6 hidden">
                    <div class="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 class="text-lg font-semibold mb-4 flex items-center">
                            <i class="fas fa-cube mr-2 text-blue-600"></i>
                            Blockchain State Changes
                        </h3>
                        
                        <!-- Loading State -->
                        <div id="risk-state-loading" class="hidden text-center py-8">
                            <div class="inline-flex items-center px-4 py-2 bg-blue-50 rounded-lg">
                                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                                <span class="text-sm text-blue-700">Querying blockchain state...</span>
                            </div>
                        </div>
                        
                        <!-- State Comparison Display -->
                        <div id="risk-state-comparison" class="hidden">
                            <div class="grid md:grid-cols-2 gap-6">
                                <!-- Before State -->
                                <div class="bg-gray-50 rounded-lg p-4">
                                    <h4 class="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                        <i class="fas fa-clock mr-2 text-gray-500"></i>
                                        Before Execution
                                    </h4>
                                    <div id="risk-before-state" class="space-y-2">
                                        <!-- Before state will be populated here -->
                                    </div>
                                </div>
                                
                                <!-- After State -->
                                <div class="bg-green-50 rounded-lg p-4">
                                    <h4 class="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                        <i class="fas fa-check-circle mr-2 text-green-500"></i>
                                        After Execution
                                    </h4>
                                    <div id="risk-after-state" class="space-y-2">
                                        <!-- After state will be populated here -->
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Changes Summary -->
                            <div id="risk-changes-summary" class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 class="text-sm font-semibold text-blue-800 mb-2 flex items-center">
                                    <i class="fas fa-list-ul mr-2"></i>
                                    Changes Detected
                                </h4>
                                <div id="risk-changes-list" class="space-y-1">
                                    <!-- Changes will be populated here -->
                                </div>
                            </div>
                        </div>
                        
                        <!-- No Changes Display -->
                        <div id="risk-no-changes" class="hidden text-center py-6">
                            <div class="text-gray-500">
                                <i class="fas fa-equals text-2xl mb-2"></i>
                                <p class="text-sm">No blockchain state changes detected</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            console.log('✅ RiskComponent HTML content set successfully');
        } catch (error) {
            console.error('❌ Error setting RiskComponent HTML content:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Risk tab navigation
        document.querySelectorAll('.risk-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.riskTab || e.target.closest('.risk-tab-btn').dataset.riskTab;
                this.switchRiskTab(tabName);
            });
        });

        // Basel III form submission
        const basel3Form = document.getElementById('basel3-form');
        if (basel3Form) {
            basel3Form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.executeBasel3Verification();
            });
        }

        // Stablecoin form submission
        const stablecoinForm = document.getElementById('stablecoin-form');
        if (stablecoinForm) {
            stablecoinForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.executeStablecoinVerification();
            });
        }

        // Advanced form submission
        const advancedForm = document.getElementById('advanced-form');
        if (advancedForm) {
            advancedForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.executeAdvancedVerification();
            });
        }

        // State tracking toggle for Basel III
        const basel3StateToggle = document.getElementById('basel3-state-tracking-toggle');
        if (basel3StateToggle) {
            basel3StateToggle.addEventListener('change', (e) => {
                this.showStateChanges = e.target.checked;
                this.toggleStateSection();
            });
        }
    }

    switchRiskTab(tabName) {
        console.log(`🔄 Switching to risk tab: ${tabName}`);
        
        // Update tab buttons
        document.querySelectorAll('.risk-tab-btn').forEach(btn => {
            btn.classList.remove('active', 'bg-blue-600', 'text-white');
            btn.classList.add('text-gray-600', 'hover:text-gray-800');
        });
        
        const targetBtn = document.querySelector(`[data-risk-tab="${tabName}"]`);
        if (targetBtn) {
            targetBtn.classList.remove('text-gray-600', 'hover:text-gray-800');
            targetBtn.classList.add('active', 'bg-blue-600', 'text-white');
        }
        
        // Update tab content
        document.querySelectorAll('.risk-tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        const targetContent = document.getElementById(`${tabName}-risk-tab`);
        if (targetContent) {
            targetContent.classList.remove('hidden');
        }
        
        this.currentRiskTab = tabName;
        console.log(`✅ Risk tab switched to: ${tabName}`);
    }

    async populateBasel3ConfigFiles() {
        try {
            console.log('🔄 Loading Basel III config files...');
            
            const response = await fetch('/api/v1/basel3-config-files');
            if (response.ok) {
                const data = await response.json();
                
                const configSelect = document.getElementById('basel3-config-select');
                if (configSelect) {
                    configSelect.innerHTML = '<option value="">Select Basel III configuration file...</option>';
                    data.files.forEach(file => {
                        const option = document.createElement('option');
                        option.value = file;
                        option.textContent = file;
                        
                        // Default to basel3-VALID-1.json if available
                        if (file === 'basel3-VALID-1.json') {
                            option.selected = true;
                        }
                        
                        configSelect.appendChild(option);
                    });
                    console.log(`✅ Loaded ${data.files.length} Basel III config files`);
                    
                    // Log which file was selected as default
                    const selectedFile = configSelect.value;
                    if (selectedFile) {
                        console.log(`🎯 Default Basel III config file selected: ${selectedFile}`);
                    }
                }
            } else {
                console.log('⚠️ Failed to load Basel III config files:', await response.text());
                this.showNotification('Config Loading Error', 'Failed to load Basel III configuration files', 'error');
            }
        } catch (error) {
            console.error('Failed to load Basel III config files:', error);
            this.showNotification('Config Loading Error', 'Failed to load Basel III configuration files', 'error');
        }
    }

    async populateAdvancedConfigFiles() {
        try {
            console.log('🔄 Loading Risk Advanced config files...');
            
            const response = await fetch('/api/v1/risk-advanced-config-files');
            if (response.ok) {
                const data = await response.json();
                
                const configSelect = document.getElementById('advanced-config-select');
                if (configSelect) {
                    configSelect.innerHTML = '<option value="">Select advanced configuration file...</option>';
                    data.files.forEach(file => {
                        const option = document.createElement('option');
                        option.value = file;
                        option.textContent = file;
                        
                        // Default to Advanced-VALID-1.json if available
                        if (file === 'Advanced-VALID-1.json') {
                            option.selected = true;
                        }
                        
                        configSelect.appendChild(option);
                    });
                    console.log(`✅ Loaded ${data.files.length} Risk Advanced config files`);
                    
                    // Log which file was selected as default
                    const selectedFile = configSelect.value;
                    if (selectedFile) {
                        console.log(`🎯 Default Risk Advanced config file selected: ${selectedFile}`);
                    }
                }
            } else {
                console.log('⚠️ Failed to load Risk Advanced config files:', await response.text());
                this.showNotification('Config Loading Error', 'Failed to load Risk Advanced configuration files', 'error');
            }
        } catch (error) {
            console.error('Failed to load Risk Advanced config files:', error);
            this.showNotification('Config Loading Error', 'Failed to load Risk Advanced configuration files', 'error');
        }
    }

    async populateAdvancedExecutionSettings() {
        try {
            console.log('🔄 Loading Risk Advanced execution settings...');
            
            const response = await fetch('/api/v1/risk-advanced-execution-settings');
            if (response.ok) {
                const data = await response.json();
                
                const settingsSelect = document.getElementById('advanced-execution-settings');
                if (settingsSelect) {
                    settingsSelect.innerHTML = '<option value="">Select execution mode...</option>';
                    data.executionPaths.forEach(path => {
                        const option = document.createElement('option');
                        option.value = path.id;
                        option.textContent = `${path.name} - ${path.description}`;
                        
                        // Default to ultra_strict if available
                        if (path.id === 'ultra_strict') {
                            option.selected = true;
                        }
                        
                        settingsSelect.appendChild(option);
                    });
                    console.log(`✅ Loaded ${data.executionPaths.length} execution paths`);
                    
                    // Log which execution mode was selected as default
                    const selectedMode = settingsSelect.value;
                    if (selectedMode) {
                        console.log(`🎯 Default execution mode selected: ${selectedMode}`);
                    }
                }
            } else {
                console.log('⚠️ Failed to load Risk Advanced execution settings:', await response.text());
                this.showNotification('Settings Loading Error', 'Failed to load execution settings', 'error');
            }
        } catch (error) {
            console.error('Failed to load Risk Advanced execution settings:', error);
            this.showNotification('Settings Loading Error', 'Failed to load execution settings', 'error');
        }
    }

    async populateStablecoinJurisdictions() {
        try {
            console.log('🔄 Loading Stablecoin jurisdictions...');
            
            const response = await fetch('/api/v1/stablecoin-jurisdictions');
            if (response.ok) {
                const data = await response.json();
                
                const jurisdictionSelect = document.getElementById('stablecoin-jurisdiction-select');
                if (jurisdictionSelect) {
                    jurisdictionSelect.innerHTML = '<option value="">Select jurisdiction...</option>';
                    data.jurisdictions.forEach(jurisdiction => {
                        const option = document.createElement('option');
                        option.value = jurisdiction;
                        option.textContent = jurisdiction;
                        jurisdictionSelect.appendChild(option);
                    });
                    console.log(`✅ Loaded ${data.jurisdictions.length} stablecoin jurisdictions`);
                }
            } else {
                console.log('⚠️ Failed to load stablecoin jurisdictions:', await response.text());
                this.showNotification('Jurisdiction Loading Error', 'Failed to load stablecoin jurisdictions', 'error');
            }
        } catch (error) {
            console.error('Failed to load stablecoin jurisdictions:', error);
            this.showNotification('Jurisdiction Loading Error', 'Failed to load stablecoin jurisdictions', 'error');
        }
    }

    async populateStablecoinSituations(jurisdiction) {
        try {
            console.log(`🔄 Loading Stablecoin situations for ${jurisdiction}...`);
            
            const response = await fetch(`/api/v1/stablecoin-situations/${jurisdiction}`);
            if (response.ok) {
                const data = await response.json();
                
                const situationSelect = document.getElementById('stablecoin-situation-select');
                if (situationSelect) {
                    situationSelect.innerHTML = '<option value="">Select situation...</option>';
                    situationSelect.disabled = false;
                    
                    data.situations.forEach(situation => {
                        const option = document.createElement('option');
                        option.value = situation;
                        option.textContent = situation;
                        situationSelect.appendChild(option);
                    });
                    console.log(`✅ Loaded ${data.situations.length} stablecoin situations for ${jurisdiction}`);
                }
            } else {
                console.log(`⚠️ Failed to load stablecoin situations for ${jurisdiction}:`, await response.text());
                this.showNotification('Situation Loading Error', `Failed to load situations for ${jurisdiction}`, 'error');
            }
        } catch (error) {
            console.error(`Failed to load stablecoin situations for ${jurisdiction}:`, error);
            this.showNotification('Situation Loading Error', `Failed to load situations for ${jurisdiction}`, 'error');
        }
    }

    setupStablecoinJurisdictionHandler() {
        const jurisdictionSelect = document.getElementById('stablecoin-jurisdiction-select');
        if (jurisdictionSelect) {
            jurisdictionSelect.addEventListener('change', async (e) => {
                const jurisdiction = e.target.value;
                const situationSelect = document.getElementById('stablecoin-situation-select');
                
                if (jurisdiction) {
                    await this.populateStablecoinSituations(jurisdiction);
                } else {
                    // Clear situation dropdown if no jurisdiction selected
                    if (situationSelect) {
                        situationSelect.innerHTML = '<option value="">Select situation...</option>';
                        situationSelect.disabled = true;
                    }
                }
            });
        }
    }

    async executeBasel3Verification() {
        const configFile = document.getElementById('basel3-config-select')?.value;
        const lcrThreshold = document.getElementById('basel3-lcr-threshold')?.value;
        const nsfrThreshold = document.getElementById('basel3-nsfr-threshold')?.value;
        const actusUrl = document.getElementById('basel3-actus-url')?.value;
        
        // Validate required fields
        if (!configFile) {
            this.showNotification('Missing Information', 'Please select a Basel III configuration file', 'error');
            return;
        }
        
        if (!lcrThreshold) {
            this.showNotification('Missing Information', 'Please enter an LCR threshold value', 'error');
            return;
        }
        
        if (!nsfrThreshold) {
            this.showNotification('Missing Information', 'Please enter an NSFR threshold value', 'error');
            return;
        }
        
        if (!actusUrl) {
            this.showNotification('Missing Information', 'ACTUS URL is required', 'error');
            return;
        }
        
        // Validate thresholds are positive numbers
        const lcrThresholdValue = parseFloat(lcrThreshold);
        if (isNaN(lcrThresholdValue) || lcrThresholdValue < 0) {
            this.showNotification('Invalid LCR Threshold', 'Please enter a valid positive number for LCR threshold', 'error');
            return;
        }
        
        const nsfrThresholdValue = parseFloat(nsfrThreshold);
        if (isNaN(nsfrThresholdValue) || nsfrThresholdValue < 0) {
            this.showNotification('Invalid NSFR Threshold', 'Please enter a valid positive number for NSFR threshold', 'error');
            return;
        }

        // Construct the file path for the command pattern
        const relativeConfigPath = `src/data/RISK/Basel3/CONFIG/${configFile}`;
        
        const parameters = {
            command: 'node ./build/tests/with-sign/RiskLiquidityBasel3OptimMerkleVerificationTestWithSign.js',
            lcrThreshold: lcrThresholdValue,
            nsfrThreshold: nsfrThresholdValue,
            actusUrl: actusUrl,
            configFilePath: relativeConfigPath
        };

        // Use the standard tool execution pattern like other components
        const toolName = 'get-RiskLiquidityBasel3Optim-Merkle-verification-with-sign';

        if (this.showStateChanges) {
            await this.executeWithStateTracking(toolName, parameters);
        } else {
            await this.executeRiskVerification(toolName, parameters);
        }
    }

    async executeStablecoinVerification() {
        const jurisdiction = document.getElementById('stablecoin-jurisdiction-select')?.value;
        const situation = document.getElementById('stablecoin-situation-select')?.value;
        const liquidityThreshold = document.getElementById('stablecoin-liquidity-threshold')?.value;
        const actusUrl = document.getElementById('stablecoin-actus-url')?.value;
        const executionMode = document.getElementById('stablecoin-execution-mode')?.value;
        
        // Validate required fields
        if (!jurisdiction) {
            this.showNotification('Missing Information', 'Please select a jurisdiction', 'error');
            return;
        }
        
        if (!situation) {
            this.showNotification('Missing Information', 'Please select a situation', 'error');
            return;
        }
        
        if (!liquidityThreshold) {
            this.showNotification('Missing Information', 'Please enter a liquidity threshold', 'error');
            return;
        }
        
        if (!actusUrl) {
            this.showNotification('Missing Information', 'ACTUS URL is required', 'error');
            return;
        }
        
        if (!executionMode) {
            this.showNotification('Missing Information', 'Please select an execution mode', 'error');
            return;
        }
        
        // Validate threshold is a positive number
        const thresholdValue = parseFloat(liquidityThreshold);
        if (isNaN(thresholdValue) || thresholdValue < 0) {
            this.showNotification('Invalid Threshold', 'Please enter a valid positive number for liquidity threshold', 'error');
            return;
        }

        // Construct configuration file path following the same pattern as other Risk components
        const relativeConfigPath = `src/data/RISK/StableCoin/CONFIG/${jurisdiction}/${situation}`;
        
        const parameters = {
            command: 'node ./build/tests/with-sign/StablecoinProofOfReservesRiskVerificationTestWithSign.js',
            jurisdiction: jurisdiction,
            situation: situation,
            liquidityThreshold: thresholdValue,
            actusUrl: actusUrl,
            executionMode: executionMode,
            configFilePath: relativeConfigPath,
            typeOfNet: 'TESTNET'
        };

        console.log('Executing stablecoin verification with parameters:', parameters);
        
        const toolName = 'get-StablecoinProofOfReservesRisk-verification-with-sign';
        await this.executeRiskVerification(toolName, parameters);
    }

    async executeAdvancedVerification() {
        const configFile = document.getElementById('advanced-config-select')?.value;
        const liquidityThreshold = document.getElementById('advanced-liquidity-threshold')?.value;
        const actusUrl = document.getElementById('advanced-actus-url')?.value;
        const executionMode = document.getElementById('advanced-execution-settings')?.value;
        
        // Validate required fields
        if (!configFile) {
            this.showNotification('Missing Information', 'Please select an advanced configuration file', 'error');
            return;
        }
        
        if (!liquidityThreshold) {
            this.showNotification('Missing Information', 'Please enter a liquidity threshold value', 'error');
            return;
        }
        
        if (!actusUrl) {
            this.showNotification('Missing Information', 'ACTUS URL is required', 'error');
            return;
        }
        
        if (!executionMode) {
            this.showNotification('Missing Information', 'Please select an execution mode', 'error');
            return;
        }
        
        // Validate threshold is a positive number
        const thresholdValue = parseFloat(liquidityThreshold);
        if (isNaN(thresholdValue) || thresholdValue < 0) {
            this.showNotification('Invalid Threshold', 'Please enter a valid positive number for liquidity threshold', 'error');
            return;
        }

        // Construct the file path for the command pattern
        const relativeConfigPath = `src/data/RISK/Advanced/CONFIG/${configFile}`;
        
        const parameters = {
            command: 'node ./build/tests/with-sign/RiskLiquidityAdvancedOptimMerkleVerificationTestWithSign.js',
            liquidityThreshold: thresholdValue,
            actusUrl: actusUrl,
            configFilePath: relativeConfigPath,
            executionMode: executionMode
        };

        // Use the correct tool name that we just added to zkPretClient
        const toolName = 'get-RiskLiquidityAdvancedOptimMerkle-verification-with-sign';
        await this.executeRiskVerification(toolName, parameters);
    }

    async executeRiskVerification(toolName, parameters) {
        try {
            console.log('Executing risk verification with parameters:', { toolName, parameters });
            
            if (window.app && window.app.executeTool) {
                await window.app.executeTool(toolName, parameters);
            } else {
                console.error('App or executeTool method not available');
                this.showNotification('Error', 'Application not properly initialized', 'error');
            }
        } catch (error) {
            console.error('Error executing risk verification:', error);
            this.showNotification('Execution Error', error.message, 'error');
        }
    }
    
    toggleStateSection() {
        const stateSection = document.getElementById('risk-blockchain-state-section');
        if (this.showStateChanges) {
            stateSection.classList.remove('hidden');
        } else {
            stateSection.classList.add('hidden');
        }
    }
    
    async executeWithStateTracking(toolName, parameters) {
        try {
            // Show state section and loading
            document.getElementById('risk-blockchain-state-section').classList.remove('hidden');
            document.getElementById('risk-state-loading').classList.remove('hidden');
            document.getElementById('risk-state-comparison').classList.add('hidden');
            document.getElementById('risk-no-changes').classList.add('hidden');
            
            // Execute tool with state tracking
            const response = await fetch('/api/v1/tools/execute-with-state', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    toolName: toolName,
                    parameters: parameters
                })
            });
            
            const result = await response.json();
            
            // Hide loading
            document.getElementById('risk-state-loading').classList.add('hidden');
            
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
                document.getElementById('risk-no-changes').classList.remove('hidden');
            }
            
        } catch (error) {
            console.error('Error executing with state tracking:', error);
            
            // Hide loading and show error
            document.getElementById('risk-state-loading').classList.add('hidden');
            document.getElementById('risk-no-changes').classList.remove('hidden');
            document.getElementById('risk-no-changes').innerHTML = `
                <div class="text-red-500">
                    <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                    <p class="text-sm">Failed to retrieve blockchain state changes</p>
                    <p class="text-xs mt-1">${error.message}</p>
                </div>
            `;
            
            this.showNotification('State Tracking Error', 'Failed to retrieve blockchain state changes', 'error');
        }
    }
    
    displayStateComparison(stateComparison) {
        const { beforeFormatted, afterFormatted, changes, hasChanges } = stateComparison;
        
        if (!hasChanges) {
            document.getElementById('risk-no-changes').classList.remove('hidden');
            return;
        }
        
        // Show state comparison
        document.getElementById('risk-state-comparison').classList.remove('hidden');
        
        // Populate before state
        const beforeContainer = document.getElementById('risk-before-state');
        beforeContainer.innerHTML = Object.entries(beforeFormatted).map(([key, value]) => `
            <div class="flex justify-between text-xs">
                <span class="text-gray-600">${key}:</span>
                <span class="font-mono text-gray-800">${value}</span>
            </div>
        `).join('');
        
        // Populate after state
        const afterContainer = document.getElementById('risk-after-state');
        afterContainer.innerHTML = Object.entries(afterFormatted).map(([key, value]) => `
            <div class="flex justify-between text-xs">
                <span class="text-gray-600">${key}:</span>
                <span class="font-mono text-gray-800">${value}</span>
            </div>
        `).join('');
        
        // Populate changes summary
        const changesContainer = document.getElementById('risk-changes-list');
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
    
    getDefaultActusUrl() {
        // Return the instance variable that was loaded from server environment
        return this.actusUrl || 'http://98.84.165.146:8083/eventsBatch';
    }

    showNotification(title, message, type) {
        if (window.app && window.app.showNotification) {
            window.app.showNotification(title, message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${title} - ${message}`);
        }
    }
}

window.RiskComponent = RiskComponent;