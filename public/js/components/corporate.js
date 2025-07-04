class CorporateComponent {
    constructor() {
        console.log('Corporate Component initialized - using main form');
        // Corporate component uses the main form fields directly
        // No additional rendering needed since form is already in main HTML
    }

    // Optional: Add any Corporate-specific methods here
    validateCorporateData(data) {
        const required = ['companyName'];
        const missing = required.filter(field => !data[field] || !data[field].trim());
        
        if (missing.length > 0) {
            return {
                valid: false,
                message: `Missing required fields: ${missing.join(', ')}`
            };
        }
        
        // Validate CIN format if provided
        if (data.cin && !this.isValidCIN(data.cin)) {
            return {
                valid: false,
                message: 'Invalid CIN format. Expected format: U01112TZ2022PTC039493'
            };
        }
        
        return { valid: true };
    }
    
    isValidCIN(cin) {
        // Basic CIN validation - should be 21 characters
        return typeof cin === 'string' && cin.length === 21;
    }
}

window.CorporateComponent = CorporateComponent;
