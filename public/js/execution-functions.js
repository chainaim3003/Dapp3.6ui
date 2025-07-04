// Missing execution functions for ZK-PRET-WEB-APP

// Add execution functions to the global app object
document.addEventListener('DOMContentLoaded', () => {
    // Wait for app to be initialized
    setTimeout(() => {
        if (window.app) {
            // Add missing execution functions
            window.app.executeGLEIF = function() {
                const companyName = document.getElementById('company-name-input')?.value;
                if (!companyName) {
                    if (window.notifications) {
                        window.notifications.warning('Missing Information', 'Please enter a company name');
                    }
                    return;
                }
                
                const parameters = {
                    companyName: companyName,
                    legalName: companyName
                };
                
                this.executeTool('get-GLEIF-verification-with-sign', parameters);
            };
            
            window.app.executeCorporateRegistration = function() {
                const cin = document.getElementById('cin-input')?.value;
                const companyName = document.getElementById('corp-company-name-input')?.value;
                
                if (!cin) {
                    if (window.notifications) {
                        window.notifications.warning('Missing Information', 'Please enter a CIN');
                    }
                    return;
                }
                
                const parameters = {
                    cin: cin
                };
                
                if (companyName) {
                    parameters.companyName = companyName;
                }
                
                this.executeTool('get-Corporate-Registration-verification-with-sign', parameters);
            };
            
            window.app.executeEXIM = function() {
                const companyName = document.getElementById('exim-company-name-input')?.value;
                const iec = document.getElementById('iec-input')?.value;
                
                if (!companyName) {
                    if (window.notifications) {
                        window.notifications.warning('Missing Information', 'Please enter a company name');
                    }
                    return;
                }
                
                const parameters = {
                    companyName: companyName,
                    legalName: companyName
                };
                
                if (iec) {
                    parameters.iec = iec;
                }
                
                this.executeTool('get-EXIM-verification-with-sign', parameters);
            };
            
            console.log('✅ Missing execution functions added to app object');
        }
    }, 1000);
});
