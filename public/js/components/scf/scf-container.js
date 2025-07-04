/**
 * SCF Container Widget - Main orchestrator for Supply Chain Finance workflow
 */
class SCFContainerWidget {
  constructor() {
    console.log('🏗️ Initializing SCF Container Widget');
    
    // Initialize data store
    this.scfDataStore = new SCFDataStore();
    
    // Initialize widgets (will be created as needed)
    this.widgets = {};
    this.isInitialized = false;
    
    // Subscribe to data store changes
    this.scfDataStore.subscribe(this.handleDataStoreChange.bind(this));
  }

  // Debug methods
  toggleDebugPanel() {
    const debugPanel = document.getElementById('scf-debug-panel');
    if (debugPanel) {
      debugPanel.classList.toggle('hidden');
    }
  }

  async init() {
    if (this.isInitialized) return;
    
    try {
      console.log('📊 Loading SCF configuration...');
      await this.scfDataStore.loadFinancierConfig();
      
      console.log('🎨 Rendering SCF container...');
      this.render();
      
      console.log('🔧 Setting up event listeners...');
      this.setupEventListeners();
      
      console.log('📦 Initializing widgets...');
      await this.initializeWidgets();
      
      // Initialize the first step
      this.renderCurrentStepContent();
      
      this.isInitialized = true;
      console.log('✅ SCF Container Widget initialized successfully');
      
    } catch (error) {
      console.error('❌ Error initializing SCF Container Widget:', error);
      this.showError('Initialization failed: ' + error.message);
      
      // Try to render a basic fallback interface
      this.renderFallbackInterface();
    }
  }

  render() {
    const container = document.getElementById('scf-tab');
    if (!container) {
      console.error('SCF tab container not found');
      return;
    }

    container.innerHTML = `
      <div class="scf-container">
        <!-- Header -->
        <div class="mb-6">
          <h3 class="text-xl font-bold text-gray-900 flex items-center mb-2">
            <i class="fas fa-link mr-3 text-teal-600"></i>
            Supply Chain Finance Verification Platform
          </h3>
          <p class="text-gray-600">Complete end-to-end verification workflow for supply chain financing</p>
        </div>

        <!-- Progress Indicator -->
        <div id="scf-progress" class="mb-8">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-lg font-semibold text-gray-800">Verification Progress</h4>
            <button id="scf-reset-btn" class="text-sm text-gray-500 hover:text-red-600 transition-colors">
              <i class="fas fa-undo mr-1"></i>Reset
            </button>
          </div>
          <div class="flex items-center space-x-4">
            <!-- Step indicators will be rendered here -->
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left Column - Current Step -->
          <div class="lg:col-span-2">
            <div class="bg-white rounded-xl shadow-sm border">
              
              <!-- Step Content Container -->
              <div id="scf-step-content" class="p-6">
                <!-- Dynamic content for current step -->
              </div>
              
              <!-- Navigation -->
              <div id="scf-navigation" class="px-6 py-4 bg-gray-50 border-t rounded-b-xl">
                <div class="flex justify-between items-center">
                  <button id="scf-prev-btn" class="btn-secondary hidden">
                    <i class="fas fa-chevron-left mr-2"></i>Previous
                  </button>
                  <div class="flex-1"></div>
                  <button id="scf-next-btn" class="btn-primary">
                    Next Step<i class="fas fa-chevron-right ml-2"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column - Summary & Status -->
          <div class="space-y-6">
            
            <!-- Company Summary -->
            <div id="scf-company-summary" class="bg-white rounded-xl shadow-sm border p-6">
              <h4 class="text-lg font-semibold mb-4 flex items-center">
                <i class="fas fa-building mr-2 text-blue-600"></i>
                Company Profile
              </h4>
              <div id="company-summary-content">
                <p class="text-gray-500 text-sm">No company information yet</p>
              </div>
            </div>

            <!-- Verification Status -->
            <div id="scf-verification-status" class="bg-white rounded-xl shadow-sm border p-6">
              <h4 class="text-lg font-semibold mb-4 flex items-center">
                <i class="fas fa-clipboard-check mr-2 text-green-600"></i>
                Verification Status
              </h4>
              <div id="verification-status-content">
                <!-- Status items will be rendered here -->
              </div>
            </div>

            <!-- Financier Matching -->
            <div id="scf-financier-preview" class="bg-white rounded-xl shadow-sm border p-6 hidden">
              <h4 class="text-lg font-semibold mb-4 flex items-center">
                <i class="fas fa-handshake mr-2 text-purple-600"></i>
                Financier Matching
              </h4>
              <div id="financier-preview-content">
                <!-- Financier previews will be rendered here -->
              </div>
            </div>

            <!-- Results Export -->
            <div id="scf-results-export" class="bg-white rounded-xl shadow-sm border p-6 hidden">
              <h4 class="text-lg font-semibold mb-4 flex items-center">
                <i class="fas fa-download mr-2 text-indigo-600"></i>
                Export Results
              </h4>
              <div class="space-y-3">
                <button id="export-smart-contract-btn" class="w-full btn-secondary text-sm">
                  <i class="fas fa-code mr-2"></i>Export to Smart Contract
                </button>
                <button id="export-json-btn" class="w-full btn-secondary text-sm">
                  <i class="fas fa-file-code mr-2"></i>Export as JSON
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Debug Panel (hidden by default) -->
        <div id="scf-debug-panel" class="hidden mt-8 bg-gray-100 rounded-lg p-4">
          <h5 class="font-semibold mb-2">Debug Information</h5>
          <pre id="scf-debug-content" class="text-xs bg-white p-3 rounded border overflow-auto max-h-40"></pre>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    // Navigation buttons
    document.getElementById('scf-next-btn')?.addEventListener('click', () => this.nextStep());
    document.getElementById('scf-prev-btn')?.addEventListener('click', () => this.prevStep());
    
    // Reset button
    document.getElementById('scf-reset-btn')?.addEventListener('click', () => this.resetWorkflow());
    
    // Export buttons
    document.getElementById('export-smart-contract-btn')?.addEventListener('click', () => this.exportToSmartContract());
    document.getElementById('export-json-btn')?.addEventListener('click', () => this.exportAsJSON());
  }

  async initializeWidgets() {
    // Initialize widgets as needed
    // We'll create them dynamically based on current step
    console.log('📦 Widget initialization complete');
  }

  // Data store change handler
  handleDataStoreChange(section, field, value, fullData) {
    console.log(`📊 Data store changed: ${section}.${field}`, value);
    
    // Update UI components based on data changes
    this.updateProgressIndicator();
    this.updateCompanySummary();
    this.updateVerificationStatus();
    this.updateFinancierPreview();
    this.updateNavigation();
    
    // Update debug panel if visible
    this.updateDebugPanel(fullData);
  }

  // Workflow management
  getWorkflowSteps() {
    return [
      {
        key: 'compliance',
        title: 'Company Compliance',
        description: 'Verify corporate registration, GLEIF, and EXIM credentials',
        icon: 'fas fa-shield-alt',
        required: true
      },
      {
        key: 'invoiceUpload', 
        title: 'Invoice Management',
        description: 'Upload and manage Bill of Lading documents (max 3)',
        icon: 'fas fa-file-invoice',
        required: true
      },
      {
        key: 'businessIntegrity',
        title: 'Business Data Integrity',
        description: 'Verify integrity of business and invoice data',
        icon: 'fas fa-database',
        required: true
      },
      {
        key: 'processIntegrity',
        title: 'Process Integrity',
        description: 'Validate business process compliance using BPMN verification',
        icon: 'fas fa-sitemap',
        required: true
      },
      {
        key: 'riskAssessment',
        title: 'Risk & Liquidity',
        description: 'Assess company and invoice-level risk profiles',
        icon: 'fas fa-chart-line',
        required: true
      },
      {
        key: 'financierMatching',
        title: 'Financier Matching',
        description: 'Calculate scores and match with suitable financiers',
        icon: 'fas fa-handshake',
        required: false
      }
    ];
  }

  getCurrentStep() {
    return this.scfDataStore.data.workflow.currentStep;
  }

  setCurrentStep(stepKey) {
    this.scfDataStore.setCurrentStep(stepKey);
    this.renderCurrentStepContent();
  }

  nextStep() {
    const steps = this.getWorkflowSteps();
    const currentIndex = steps.findIndex(step => step.key === this.getCurrentStep());
    
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      this.setCurrentStep(nextStep.key);
    }
  }

  prevStep() {
    const steps = this.getWorkflowSteps();
    const currentIndex = steps.findIndex(step => step.key === this.getCurrentStep());
    
    if (currentIndex > 0) {
      const prevStep = steps[currentIndex - 1];
      this.setCurrentStep(prevStep.key);
    }
  }

  renderCurrentStepContent() {
    const currentStep = this.getCurrentStep();
    const stepContainer = document.getElementById('scf-step-content');
    
    if (!stepContainer) return;
    
    console.log(`🎨 Rendering step content for: ${currentStep}`);
    
    switch (currentStep) {
      case 'compliance':
        this.renderComplianceStep(stepContainer);
        break;
      case 'invoiceUpload':
        this.renderInvoiceUploadStep(stepContainer);
        break;
      case 'businessIntegrity':
        this.renderBusinessIntegrityStep(stepContainer);
        break;
      case 'processIntegrity':
        this.renderProcessIntegrityStep(stepContainer);
        break;
      case 'riskAssessment':
        this.renderRiskAssessmentStep(stepContainer);
        break;
      case 'financierMatching':
        this.renderFinancierMatchingStep(stepContainer);
        break;
      default:
        stepContainer.innerHTML = '<p class="text-gray-500">Step not implemented yet</p>';
    }
  }

  // Step rendering methods (placeholder implementations)
  renderComplianceStep(container) {
    container.innerHTML = `
      <div class="step-content">
        <h4 class="text-xl font-bold mb-4 flex items-center">
          <i class="fas fa-shield-alt mr-3 text-blue-600"></i>
          Company Compliance Verification
        </h4>
        <p class="text-gray-600 mb-6">Verify your company's regulatory credentials to establish trust with financiers.</p>
        
        <div class="space-y-6">
          <!-- Company Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
            <input type="text" id="scf-company-name" class="form-input" placeholder="Enter your company's legal name">
          </div>
          
          <!-- Compliance Verification Widgets -->
          <div id="scf-compliance-widgets">
            <p class="text-gray-500 text-sm">Compliance verification widgets will be loaded here...</p>
          </div>
        </div>
      </div>
    `;
  }

  renderInvoiceUploadStep(container) {
    container.innerHTML = `
      <div class="step-content">
        <h4 class="text-xl font-bold mb-4 flex items-center">
          <i class="fas fa-file-invoice mr-3 text-green-600"></i>
          Invoice Management
        </h4>
        <p class="text-gray-600 mb-6">Upload your Bill of Lading documents for verification (maximum 3 invoices).</p>
        
        <div id="scf-invoice-manager">
          <p class="text-gray-500 text-sm">Invoice management widget will be loaded here...</p>
        </div>
      </div>
    `;
  }

  renderBusinessIntegrityStep(container) {
    container.innerHTML = `
      <div class="step-content">
        <h4 class="text-xl font-bold mb-4 flex items-center">
          <i class="fas fa-database mr-3 text-purple-600"></i>
          Business Data Integrity Verification
        </h4>
        <p class="text-gray-600 mb-6">Verify the integrity of your business data and invoice information.</p>
        
        <div id="scf-business-integrity-widget">
          <p class="text-gray-500 text-sm">Business integrity verification widget will be loaded here...</p>
        </div>
      </div>
    `;
  }

  renderProcessIntegrityStep(container) {
    container.innerHTML = `
      <div class="step-content">
        <h4 class="text-xl font-bold mb-4 flex items-center">
          <i class="fas fa-sitemap mr-3 text-indigo-600"></i>
          Business Process Integrity Verification
        </h4>
        <p class="text-gray-600 mb-6">Validate your business processes comply with industry standards using BPMN verification.</p>
        
        <div id="scf-process-integrity-widget">
          <p class="text-gray-500 text-sm">Process integrity verification widget will be loaded here...</p>
        </div>
      </div>
    `;
  }

  renderRiskAssessmentStep(container) {
    container.innerHTML = `
      <div class="step-content">
        <h4 class="text-xl font-bold mb-4 flex items-center">
          <i class="fas fa-chart-line mr-3 text-red-600"></i>
          Risk & Liquidity Assessment
        </h4>
        <p class="text-gray-600 mb-6">Assess the risk profile of your company and invoices for financing evaluation.</p>
        
        <div id="scf-risk-assessment-widget">
          <p class="text-gray-500 text-sm">Risk assessment widget will be loaded here...</p>
        </div>
      </div>
    `;
  }

  renderFinancierMatchingStep(container) {
    container.innerHTML = `
      <div class="step-content">
        <h4 class="text-xl font-bold mb-4 flex items-center">
          <i class="fas fa-handshake mr-3 text-teal-600"></i>
          Financier Matching & Recommendations
        </h4>
        <p class="text-gray-600 mb-6">Based on your verification results, see which financiers are the best match for your needs.</p>
        
        <div id="scf-financier-matching-widget">
          <p class="text-gray-500 text-sm">Financier matching widget will be loaded here...</p>
        </div>
      </div>
    `;
  }

  // UI Update methods
  updateProgressIndicator() {
    const progressContainer = document.querySelector('#scf-progress .flex.items-center.space-x-4');
    if (!progressContainer) return;
    
    const steps = this.getWorkflowSteps();
    const currentStep = this.getCurrentStep();
    const completedSteps = this.scfDataStore.data.workflow.completedSteps;
    
    progressContainer.innerHTML = steps.map((step, index) => {
      const isCompleted = completedSteps.includes(step.key);
      const isCurrent = step.key === currentStep;
      const isAccessible = index === 0 || completedSteps.includes(steps[index - 1].key);
      
      let statusClass = 'text-gray-400 bg-gray-200';
      if (isCompleted) statusClass = 'text-white bg-green-500';
      else if (isCurrent) statusClass = 'text-white bg-blue-500';
      else if (isAccessible) statusClass = 'text-gray-600 bg-gray-300';
      
      return `
        <div class="flex flex-col items-center">
          <div class="w-10 h-10 rounded-full flex items-center justify-center ${statusClass} mb-2">
            ${isCompleted ? '<i class="fas fa-check"></i>' : `<i class="${step.icon}"></i>`}
          </div>
          <span class="text-xs text-gray-600 text-center max-w-20">${step.title}</span>
        </div>
      `;
    }).join('');
  }

  updateCompanySummary() {
    const container = document.getElementById('company-summary-content');
    if (!container) return;
    
    const companyData = this.scfDataStore.data.company;
    
    if (!companyData.name) {
      container.innerHTML = '<p class="text-gray-500 text-sm">No company information yet</p>';
      return;
    }
    
    const compliance = companyData.compliance;
    container.innerHTML = `
      <div class="space-y-3">
        <div>
          <h5 class="font-medium text-gray-900">${companyData.name}</h5>
        </div>
        <div class="space-y-1">
          <div class="flex items-center justify-between text-sm">
            <span>Corporate:</span>
            <span class="${compliance.corporate.verified ? 'text-green-600' : 'text-gray-400'}">
              <i class="fas fa-${compliance.corporate.verified ? 'check' : 'clock'}"></i>
            </span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span>GLEIF:</span>
            <span class="${compliance.gleif.verified ? 'text-green-600' : 'text-gray-400'}">
              <i class="fas fa-${compliance.gleif.verified ? 'check' : 'clock'}"></i>
            </span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span>EXIM:</span>
            <span class="${compliance.exim.verified ? 'text-green-600' : 'text-gray-400'}">
              <i class="fas fa-${compliance.exim.verified ? 'check' : 'clock'}"></i>
            </span>
          </div>
        </div>
      </div>
    `;
  }

  updateVerificationStatus() {
    const container = document.getElementById('verification-status-content');
    if (!container) return;
    
    const data = this.scfDataStore.data;
    const steps = this.getWorkflowSteps();
    
    container.innerHTML = steps.map(step => {
      const isCompleted = data.workflow.completedSteps.includes(step.key);
      const isCurrent = data.workflow.currentStep === step.key;
      
      let statusIcon = 'fas fa-clock text-gray-400';
      let statusText = 'Pending';
      
      if (isCompleted) {
        statusIcon = 'fas fa-check-circle text-green-500';
        statusText = 'Completed';
      } else if (isCurrent) {
        statusIcon = 'fas fa-play-circle text-blue-500';
        statusText = 'In Progress';
      }
      
      return `
        <div class="flex items-center justify-between py-2 text-sm">
          <span class="flex items-center">
            <i class="${step.icon} mr-2 text-gray-600"></i>
            ${step.title}
          </span>
          <span class="flex items-center">
            <i class="${statusIcon} mr-1"></i>
            <span class="text-xs">${statusText}</span>
          </span>
        </div>
      `;
    }).join('');
  }

  updateFinancierPreview() {
    const container = document.getElementById('scf-financier-preview');
    if (!container) return;
    
    const eligibleFinanciers = this.scfDataStore.getEligibleFinanciers();
    
    if (eligibleFinanciers.length === 0) {
      container.classList.add('hidden');
      return;
    }
    
    container.classList.remove('hidden');
    const contentContainer = document.getElementById('financier-preview-content');
    
    contentContainer.innerHTML = eligibleFinanciers.map(financier => `
      <div class="bg-gray-50 rounded-lg p-3 mb-3">
        <div class="flex justify-between items-center">
          <h6 class="font-medium text-sm">${financier.name}</h6>
          <span class="text-xs font-bold text-green-600">${financier.score}%</span>
        </div>
        <div class="text-xs text-gray-500 mt-1">
          Threshold: ${financier.threshold}%
        </div>
      </div>
    `).join('');
  }

  updateNavigation() {
    const nextBtn = document.getElementById('scf-next-btn');
    const prevBtn = document.getElementById('scf-prev-btn');
    
    if (!nextBtn || !prevBtn) return;
    
    const steps = this.getWorkflowSteps();
    const currentIndex = steps.findIndex(step => step.key === this.getCurrentStep());
    
    // Previous button visibility
    if (currentIndex > 0) {
      prevBtn.classList.remove('hidden');
    } else {
      prevBtn.classList.add('hidden');
    }
    
    // Next button text and state
    if (currentIndex < steps.length - 1) {
      nextBtn.innerHTML = 'Next Step<i class="fas fa-chevron-right ml-2"></i>';
      nextBtn.disabled = !this.scfDataStore.data.workflow.canProceed;
    } else {
      nextBtn.innerHTML = 'Complete<i class="fas fa-check ml-2"></i>';
      nextBtn.disabled = false;
    }
  }

  updateDebugPanel(data) {
    const debugContent = document.getElementById('scf-debug-content');
    if (debugContent) {
      debugContent.textContent = JSON.stringify(data, null, 2);
    }
  }

  // Utility methods
  resetWorkflow() {
    if (confirm('Are you sure you want to reset the entire workflow? All progress will be lost.')) {
      this.scfDataStore.reset();
      this.setCurrentStep('compliance');
      this.renderCurrentStepContent();
      
      if (window.app?.showNotification) {
        window.app.showNotification('Workflow Reset', 'SCF workflow has been reset to the beginning', 'info');
      }
    }
  }

  async exportToSmartContract() {
    try {
      const exportData = this.scfDataStore.exportForSmartContract();
      console.log('📤 Exporting to smart contract:', exportData);
      
      // TODO: Implement smart contract integration
      if (window.app?.showNotification) {
        window.app.showNotification('Export Ready', 'Smart contract export data prepared. Integration pending.', 'info');
      }
    } catch (error) {
      console.error('Export to smart contract failed:', error);
      if (window.app?.showNotification) {
        window.app.showNotification('Export Failed', error.message, 'error');
      }
    }
  }

  exportAsJSON() {
    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        company: this.scfDataStore.data.company,
        invoices: this.scfDataStore.data.invoices,
        verificationResults: {
          businessIntegrity: this.scfDataStore.data.businessIntegrity,
          processIntegrity: this.scfDataStore.data.processIntegrity,
          riskAssessment: this.scfDataStore.data.riskAssessment
        },
        financierMatching: this.scfDataStore.data.financierMatching,
        scores: this.scfDataStore.getTotalScore(),
        eligibleFinanciers: this.scfDataStore.getEligibleFinanciers()
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scf-verification-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      if (window.app?.showNotification) {
        window.app.showNotification('Export Complete', 'SCF verification data exported successfully', 'success');
      }
    } catch (error) {
      console.error('JSON export failed:', error);
      if (window.app?.showNotification) {
        window.app.showNotification('Export Failed', error.message, 'error');
      }
    }
  }

  showError(message) {
    if (window.app?.showNotification) {
      window.app.showNotification('SCF Error', message, 'error');
    } else {
      console.error('SCF Error:', message);
    }
  }

  renderFallbackInterface() {
    const container = document.getElementById('scf-tab');
    if (!container) {
      console.error('SCF tab container not found for fallback');
      return;
    }

    container.innerHTML = `
      <div class="scf-container">
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <div class="flex items-center mb-4">
            <i class="fas fa-exclamation-triangle text-yellow-600 text-xl mr-3"></i>
            <h3 class="text-lg font-semibold text-yellow-800">SCF Container - Limited Mode</h3>
          </div>
          <p class="text-yellow-700 mb-4">
            The SCF Container is running in limited mode due to configuration issues.
            Some features may not be available.
          </p>
          <div class="text-sm text-yellow-600">
            <p>• Configuration file could not be loaded</p>
            <p>• Using default settings where possible</p>
            <p>• Contact administrator to resolve server configuration</p>
          </div>
        </div>
        
        <div class="bg-white rounded-xl shadow-sm border p-6">
          <h4 class="text-xl font-bold mb-4 flex items-center">
            <i class="fas fa-link mr-3 text-teal-600"></i>
            Supply Chain Finance Verification
          </h4>
          <p class="text-gray-600 mb-6">
            This is a basic version of the SCF verification interface.
            Full functionality requires proper server configuration.
          </p>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
              <input type="text" id="scf-fallback-company" class="form-input" placeholder="Enter your company name">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Verification Type</label>
              <select id="scf-fallback-type" class="form-input">
                <option value="compliance">Compliance Verification</option>
                <option value="invoice">Invoice Verification</option>
                <option value="risk">Risk Assessment</option>
              </select>
            </div>
            <button id="scf-fallback-btn" class="btn-primary w-full" onclick="window.app?.showNotification('SCF Demo', 'This is a demonstration of SCF functionality. Full features require server configuration.', 'info')">
              <i class="fas fa-play mr-2"></i>
              Demo SCF Verification
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Public API methods
  setCompanyName(name) {
    this.scfDataStore.updateCompanyData('name', name);
  }

  addInvoice(invoiceData) {
    this.scfDataStore.addInvoice(invoiceData);
  }

  updateComplianceVerification(type, verified, proofHash = null, data = null) {
    this.scfDataStore.updateComplianceData(type, { verified, proofHash, data });
  }

  // Integration methods for existing components
  integrateWithExistingTools() {
    // This method will help integrate with existing GLEIF, Corporate, EXIM, Risk components
    // when they complete verification in SCF context
    console.log('🔗 Setting up integration with existing tools...');
  }
}

// Export for global use
window.SCFContainerWidget = SCFContainerWidget;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM ready, SCF Container Widget available for initialization');
  });
} else {
  console.log('🚀 SCF Container Widget available for initialization');
}
