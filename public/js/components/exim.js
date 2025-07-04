class EximComponent {
    constructor() {
        console.log('EXIM Component initialized - using main form');
        // EXIM component uses the main form fields directly
        // No additional rendering needed since form is already in main HTML
    }

    // Optional: Add any EXIM-specific methods here
    validateEximData(data) {
        const required = ['companyName'];
        const missing = required.filter(field => !data[field] || !data[field].trim());
        
        if (missing.length > 0) {
            return {
                valid: false,
                message: `Missing required fields: ${missing.join(', ')}`
            };
        }
        
        return { valid: true };
    }
}

window.EximComponent = EximComponent;
