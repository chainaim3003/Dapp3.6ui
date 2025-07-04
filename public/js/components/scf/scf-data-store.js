/**
 * SCF Data Store - Centralized state management for Supply Chain Finance workflow
 */
class SCFDataStore {
  constructor() {
    this.data = {
      company: {
        name: '',
        compliance: {
          corporate: {
            verified: false,
            proofHash: null,
            data: null
          },
          gleif: {
            verified: false,
            proofHash: null,
            data: null
          },
          exim: {
            verified: false, 
            proofHash: null,
            data: null
          },
          overallProofHash: null
        }
      },
      invoices: [], // Max 3 BL invoices
      businessIntegrity: {
        results: [],
        proofHashes: [],
        overallScore: null
      },
      processIntegrity: {
        results: [],
        proofHashes: [],
        overallScore: null
      },
      riskAssessment: {
        companyRisk: {
          score: null,
          level: null,
          proofHash: null
        },
        invoiceRisks: [],
        overallScore: null
      },
      financierMatching: {
        scores: {},
        recommendations: [],
        selectedFinanciers: []
      },
      workflow: {
        currentStep: 'compliance',
        completedSteps: [],
        canProceed: false
      }
    };
    
    this.listeners = [];
    this.financierConfig = null;
  }

  // Data management methods
  updateCompanyData(field, value) {
    this.data.company[field] = value;
    this.notifyListeners('company', field, value);
  }

  updateComplianceData(type, data) {
    this.data.company.compliance[type] = { ...this.data.company.compliance[type], ...data };
    this.notifyListeners('compliance', type, data);
    this.checkWorkflowProgress();
  }

  addInvoice(invoiceData) {
    if (this.data.invoices.length < 3) {
      this.data.invoices.push({
        id: Date.now(),
        ...invoiceData,
        timestamp: new Date().toISOString()
      });
      this.notifyListeners('invoices', 'added', invoiceData);
      this.checkWorkflowProgress();
    }
  }

  removeInvoice(invoiceId) {
    this.data.invoices = this.data.invoices.filter(inv => inv.id !== invoiceId);
    this.notifyListeners('invoices', 'removed', invoiceId);
    this.checkWorkflowProgress();
  }

  updateBusinessIntegrity(results) {
    this.data.businessIntegrity = { ...this.data.businessIntegrity, ...results };
    this.notifyListeners('businessIntegrity', 'updated', results);
    this.checkWorkflowProgress();
  }

  updateProcessIntegrity(results) {
    this.data.processIntegrity = { ...this.data.processIntegrity, ...results };
    this.notifyListeners('processIntegrity', 'updated', results);
    this.checkWorkflowProgress();
  }

  updateRiskAssessment(results) {
    this.data.riskAssessment = { ...this.data.riskAssessment, ...results };
    this.notifyListeners('riskAssessment', 'updated', results);
    this.checkWorkflowProgress();
  }

  updateFinancierMatching(results) {
    this.data.financierMatching = { ...this.data.financierMatching, ...results };
    this.notifyListeners('financierMatching', 'updated', results);
  }

  // Workflow management
  setCurrentStep(step) {
    this.data.workflow.currentStep = step;
    this.notifyListeners('workflow', 'stepChanged', step);
  }

  markStepCompleted(step) {
    if (!this.data.workflow.completedSteps.includes(step)) {
      this.data.workflow.completedSteps.push(step);
      this.notifyListeners('workflow', 'stepCompleted', step);
    }
  }

  checkWorkflowProgress() {
    const { company, invoices, businessIntegrity, processIntegrity, riskAssessment } = this.data;
    
    // Check if compliance is complete
    const complianceComplete = company.compliance.corporate.verified && 
                              company.compliance.gleif.verified && 
                              company.compliance.exim.verified;
    
    // Check if invoices are uploaded
    const invoicesUploaded = invoices.length > 0;
    
    // Check if integrity checks are done
    const integrityComplete = businessIntegrity.results.length > 0 && 
                             processIntegrity.results.length > 0;
    
    // Check if risk assessment is done
    const riskComplete = riskAssessment.companyRisk.score !== null;
    
    // Update completed steps
    if (complianceComplete) this.markStepCompleted('compliance');
    if (invoicesUploaded) this.markStepCompleted('invoiceUpload');
    if (integrityComplete) this.markStepCompleted('integrity');
    if (riskComplete) this.markStepCompleted('risk');
    
    // Update can proceed flag
    this.data.workflow.canProceed = complianceComplete && invoicesUploaded;
  }

  // Event system
  subscribe(listener) {
    this.listeners.push(listener);
  }

  unsubscribe(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  notifyListeners(section, field, value) {
    this.listeners.forEach(listener => {
      if (typeof listener === 'function') {
        listener(section, field, value, this.data);
      }
    });
  }

  // Configuration management
  async loadFinancierConfig() {
    try {
      console.log('📁 Loading financier configuration...');
      const response = await fetch('/config/scf-financier-config.json');
      
      if (!response.ok) {
        console.warn('⚠️ Financier config not found on server, using default configuration');
        // Use default configuration if server file is not available
        this.financierConfig = this.getDefaultFinancierConfig();
        return this.financierConfig;
      }
      
      const text = await response.text();
      
      // Check if response is HTML (404 page) instead of JSON
      if (text.trim().startsWith('<')) {
        console.warn('⚠️ Server returned HTML instead of JSON, using default configuration');
        this.financierConfig = this.getDefaultFinancierConfig();
        return this.financierConfig;
      }
      
      this.financierConfig = JSON.parse(text);
      console.log('✅ Financier configuration loaded successfully');
      return this.financierConfig;
    } catch (error) {
      console.warn('⚠️ Error loading financier configuration, using default:', error.message);
      this.financierConfig = this.getDefaultFinancierConfig();
      return this.financierConfig;
    }
  }
  
  getDefaultFinancierConfig() {
    return {
      "financierTypes": {
        "traditional_bank": {
          "name": "Traditional Bank",
          "description": "Conservative banking institutions",
          "weightage": {
            "compliance": {
              "corporate": 25,
              "gleif": 20,
              "exim": 15
            },
            "businessIntegrity": 15,
            "processIntegrity": 10,
            "riskAssessment": {
              "companyRisk": 10,
              "invoiceRisk": 5
            }
          },
          "thresholds": {
            "minimumScore": 75,
            "riskTolerance": "low"
          }
        },
        "fintech_lender": {
          "name": "FinTech Lender", 
          "description": "Technology-driven financial services",
          "weightage": {
            "compliance": {
              "corporate": 20,
              "gleif": 15,
              "exim": 10
            },
            "businessIntegrity": 20,
            "processIntegrity": 20,
            "riskAssessment": {
              "companyRisk": 10,
              "invoiceRisk": 5
            }
          },
          "thresholds": {
            "minimumScore": 65,
            "riskTolerance": "medium"
          }
        },
        "alternative_finance": {
          "name": "Alternative Finance",
          "description": "Non-traditional financing solutions",
          "weightage": {
            "compliance": {
              "corporate": 15,
              "gleif": 10,
              "exim": 10
            },
            "businessIntegrity": 25,
            "processIntegrity": 25,
            "riskAssessment": {
              "companyRisk": 10,
              "invoiceRisk": 5
            }
          },
          "thresholds": {
            "minimumScore": 55,
            "riskTolerance": "high"
          }
        }
      }
    };
  }

  getFinancierConfig() {
    return this.financierConfig;
  }

  // Data export for smart contract
  exportForSmartContract() {
    return {
      companyName: this.data.company.name,
      complianceHash: this.data.company.compliance.overallProofHash,
      complianceSubItems: [
        this.data.company.compliance.corporate.proofHash,
        this.data.company.compliance.gleif.proofHash,
        this.data.company.compliance.exim.proofHash
      ].filter(hash => hash !== null),
      invoiceEvaluations: this.data.invoices.map(invoice => ({
        invoiceId: invoice.id,
        dataIntegrityHash: invoice.dataIntegrityHash,
        processIntegrityHash: invoice.processIntegrityHash,
        riskAssessmentHash: invoice.riskAssessmentHash,
        totalScore: invoice.totalScore,
        financierMatches: invoice.financierMatches || []
      }))
    };
  }

  // Utility methods
  getTotalScore() {
    const { compliance, businessIntegrity, processIntegrity, riskAssessment } = this.data;
    
    if (!this.financierConfig) return null;
    
    const scores = {};
    
    // Calculate scores for each financier type
    Object.keys(this.financierConfig.financierTypes).forEach(financierType => {
      const config = this.financierConfig.financierTypes[financierType];
      let totalScore = 0;
      
      // Compliance scores
      if (compliance.corporate.verified) {
        totalScore += config.weightage.compliance.corporate;
      }
      if (compliance.gleif.verified) {
        totalScore += config.weightage.compliance.gleif;
      }
      if (compliance.exim.verified) {
        totalScore += config.weightage.compliance.exim;
      }
      
      // Business integrity score
      if (businessIntegrity.overallScore) {
        totalScore += (businessIntegrity.overallScore / 100) * config.weightage.businessIntegrity;
      }
      
      // Process integrity score
      if (processIntegrity.overallScore) {
        totalScore += (processIntegrity.overallScore / 100) * config.weightage.processIntegrity;
      }
      
      // Risk assessment scores
      if (riskAssessment.companyRisk.score) {
        totalScore += (riskAssessment.companyRisk.score / 100) * config.weightage.riskAssessment.companyRisk;
      }
      
      scores[financierType] = Math.round(totalScore);
    });
    
    return scores;
  }

  getEligibleFinanciers() {
    const scores = this.getTotalScore();
    if (!scores || !this.financierConfig) return [];
    
    return Object.keys(scores).filter(financierType => {
      const score = scores[financierType];
      const threshold = this.financierConfig.financierTypes[financierType].thresholds.minimumScore;
      return score >= threshold;
    }).map(financierType => ({
      type: financierType,
      name: this.financierConfig.financierTypes[financierType].name,
      score: scores[financierType],
      threshold: this.financierConfig.financierTypes[financierType].thresholds.minimumScore
    }));
  }

  // Reset data
  reset() {
    this.data = {
      company: { name: '', compliance: { corporate: { verified: false, proofHash: null, data: null }, gleif: { verified: false, proofHash: null, data: null }, exim: { verified: false, proofHash: null, data: null }, overallProofHash: null } },
      invoices: [],
      businessIntegrity: { results: [], proofHashes: [], overallScore: null },
      processIntegrity: { results: [], proofHashes: [], overallScore: null },
      riskAssessment: { companyRisk: { score: null, level: null, proofHash: null }, invoiceRisks: [], overallScore: null },
      financierMatching: { scores: {}, recommendations: [], selectedFinanciers: [] },
      workflow: { currentStep: 'compliance', completedSteps: [], canProceed: false }
    };
    this.notifyListeners('system', 'reset', null);
  }
}

// Export for use in other components
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SCFDataStore;
}

window.SCFDataStore = SCFDataStore;
