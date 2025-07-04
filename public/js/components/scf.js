class SCFComponent {
    constructor() {
        console.log('SCF Component initialized - using main form');
        // SCF component uses the main form fields directly
        // No additional event listeners needed since main app handles execution
    }

    setupEventListeners() {
        const executeBtn = document.getElementById('scf-execute-btn');
        if (executeBtn) {
            executeBtn.addEventListener('click', () => {
                this.executeSCF();
            });
        }
    }

    async executeSCF() {
        const companyName = document.getElementById('scf-company-name-input')?.value?.trim();
        const supplierName = document.getElementById('scf-supplier-name-input')?.value?.trim();
        const invoiceAmount = document.getElementById('scf-invoice-amount-input')?.value?.trim();
        const financingType = document.getElementById('scf-financing-type-select')?.value;

        // Validate required fields
        if (!companyName) {
            notifications.error('Missing Information', 'Please enter the Company Name');
            return;
        }

        if (!supplierName) {
            notifications.error('Missing Information', 'Please enter the Supplier Name');
            return;
        }

        if (!invoiceAmount) {
            notifications.error('Missing Information', 'Please enter the Invoice Amount');
            return;
        }

        // Validate invoice amount is a number
        const amount = parseFloat(invoiceAmount);
        if (isNaN(amount) || amount <= 0) {
            notifications.error('Invalid Amount', 'Please enter a valid invoice amount');
            return;
        }

        // Additional validation for financing amounts
        const validation = this.validateFinancingAmount(amount);
        if (!validation.valid) {
            notifications.error('Invalid Amount', validation.message);
            return;
        }

        const parameters = {
            companyName: companyName,
            supplierName: supplierName,
            invoiceAmount: amount,
            financingType: financingType || 'INVOICE_FINANCING',
            typeOfNet: 'TESTNET'
        };

        // Check if we're in async mode (from the main app)
        if (window.app && window.app.isAsyncMode) {
            await window.app.executeAsync('get-SCF-verification-with-sign', parameters);
        } else if (window.app) {
            await window.app.executeSync('get-SCF-verification-with-sign', parameters);
        } else {
            // Fallback to sync execution for older implementation
            await this.executeSCFSync(parameters);
        }
    }

    async executeSCFSync(parameters) {
        try {
            const result = await zkpretAPI.executeTool('get-SCF-verification-with-sign', parameters);
            
            if (result.success) {
                notifications.success('Success', 'SCF ZK Proof generated successfully');
            } else {
                notifications.error('Failed', 'SCF ZK Proof generation failed');
            }
        } catch (error) {
            notifications.error('Error', error.message);
        }
    }

    validateFinancingAmount(amount) {
        // Additional validation for financing amounts
        const numAmount = parseFloat(amount);
        if (numAmount > 10000000) { // 10 million limit
            return { valid: false, message: 'Invoice amount exceeds maximum limit of $10,000,000' };
        }
        if (numAmount < 1000) { // 1,000 minimum
            return { valid: false, message: 'Invoice amount must be at least $1,000' };
        }
        return { valid: true };
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SCFComponent;
}

window.SCFComponent = SCFComponent;
