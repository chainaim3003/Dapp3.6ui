// Basel III Tab Diagnostic Script
// Copy and paste this entire script into your browser console while on the main app page

console.log('🔧 BASEL III TAB DIAGNOSTIC STARTING...');
console.log('=====================================');

// Function to create diagnostic report
function runBaselIIIDiagnostic() {
    const results = {
        serverConnection: false,
        apiEndpoint: false,
        riskComponentClass: false,
        domElements: false,
        componentInstance: false,
        appIntegration: false,
        tabContent: false
    };
    
    console.log('📊 DIAGNOSTIC REPORT:');
    console.log('=====================');
    
    // 1. Check server connection
    fetch('/api/v1/health')
        .then(response => {
            if (response.ok) {
                results.serverConnection = true;
                console.log('✅ Server Connection: OK');
                
                // 2. Check Basel III API
                return fetch('/api/v1/basel3-config-files');
            } else {
                console.log('❌ Server Connection: FAILED');
                throw new Error('Server not responding');
            }
        })
        .then(response => {
            if (response.ok) {
                results.apiEndpoint = true;
                console.log('✅ Basel III API: OK');
                return response.json();
            } else {
                console.log('❌ Basel III API: FAILED');
                throw new Error('API endpoint failed');
            }
        })
        .then(data => {
            console.log(`📁 Found ${data.count} config files:`, data.files);
            
            // 3. Check RiskComponent class
            if (typeof window.RiskComponent !== 'undefined') {
                results.riskComponentClass = true;
                console.log('✅ RiskComponent Class: AVAILABLE');
            } else {
                console.log('❌ RiskComponent Class: NOT FOUND');
                console.log('🔄 Attempting to load risk.js...');
                
                const script = document.createElement('script');
                script.src = '/js/components/risk.js';
                script.onload = () => {
                    if (typeof window.RiskComponent !== 'undefined') {
                        results.riskComponentClass = true;
                        console.log('✅ RiskComponent Class: LOADED');
                        continueCheck();
                    } else {
                        console.log('❌ RiskComponent Class: STILL NOT AVAILABLE');
                    }
                };
                script.onerror = () => {
                    console.log('❌ Failed to load risk.js');
                };
                document.head.appendChild(script);
                return;
            }
            
            continueCheck();
        })
        .catch(error => {
            console.log('❌ Error during API check:', error.message);
        });
    
    function continueCheck() {
        // 4. Check DOM elements
        const riskTab = document.getElementById('risk-tab');
        const riskContent = document.getElementById('risk-content');
        
        if (riskTab && riskContent) {
            results.domElements = true;
            console.log('✅ DOM Elements: FOUND');
            console.log('  - risk-tab:', !!riskTab);
            console.log('  - risk-content:', !!riskContent);
        } else {
            console.log('❌ DOM Elements: MISSING');
            console.log('  - risk-tab:', !!riskTab);
            console.log('  - risk-content:', !!riskContent);
        }
        
        // 5. Check app integration
        if (window.app) {
            console.log('✅ Main App Object: FOUND');
            if (window.app.riskComponent) {
                results.appIntegration = true;
                console.log('✅ App Integration: RiskComponent INTEGRATED');
            } else {
                console.log('❌ App Integration: RiskComponent NOT INTEGRATED');
                console.log('🔧 You can fix this by running: window.app.riskComponent = new window.RiskComponent()');
            }
        } else {
            console.log('❌ Main App Object: NOT FOUND');
        }
        
        // 6. Try to create component instance
        if (typeof window.RiskComponent !== 'undefined') {
            try {
                // Check if risk-content exists, create if needed
                let riskContentEl = document.getElementById('risk-content');
                if (!riskContentEl) {
                    console.log('🔧 Creating temporary risk-content element...');
                    riskContentEl = document.createElement('div');
                    riskContentEl.id = 'risk-content';
                    document.body.appendChild(riskContentEl);
                }
                
                const testComponent = new window.RiskComponent();
                results.componentInstance = true;
                console.log('✅ Component Instance: CREATED SUCCESSFULLY');
                
                // Check if dropdown was created
                setTimeout(() => {
                    const dropdown = document.getElementById('basel3-config-select');
                    if (dropdown) {
                        results.tabContent = true;
                        console.log('✅ Tab Content: BASEL III DROPDOWN CREATED');
                        console.log(`📊 Dropdown has ${dropdown.options.length} options`);
                    } else {
                        console.log('❌ Tab Content: DROPDOWN NOT CREATED');
                    }
                    
                    // Final summary
                    printSummary();
                }, 2000);
                
            } catch (error) {
                console.log('❌ Component Instance: CREATION FAILED');
                console.log('Error:', error.message);
                console.log('Stack:', error.stack);
                printSummary();
            }
        } else {
            console.log('❌ Component Instance: CANNOT CREATE (CLASS NOT AVAILABLE)');
            printSummary();
        }
    }
    
    function printSummary() {
        console.log('');
        console.log('📋 SUMMARY:');
        console.log('===========');
        Object.entries(results).forEach(([key, value]) => {
            console.log(`${value ? '✅' : '❌'} ${key}: ${value ? 'PASS' : 'FAIL'}`);
        });
        
        console.log('');
        console.log('🎯 RECOMMENDATIONS:');
        console.log('===================');
        
        if (!results.serverConnection) {
            console.log('🔧 Start your server: npm run dev');
        }
        
        if (!results.apiEndpoint) {
            console.log('🔧 Check server logs for API errors');
        }
        
        if (!results.riskComponentClass) {
            console.log('🔧 Verify risk.js is included in app.html');
            console.log('🔧 Check browser Network tab for failed script loads');
        }
        
        if (!results.domElements) {
            console.log('🔧 Check if you are on the correct page (app.html)');
            console.log('🔧 Verify HTML structure includes risk-tab and risk-content');
        }
        
        if (!results.appIntegration) {
            console.log('🔧 Run this to fix integration: window.app.riskComponent = new window.RiskComponent()');
        }
        
        if (!results.componentInstance) {
            console.log('🔧 Check console for JavaScript errors during component creation');
        }
        
        if (!results.tabContent) {
            console.log('🔧 Component created but dropdown missing - check render() method');
        }
        
        if (Object.values(results).every(v => v)) {
            console.log('🎉 ALL CHECKS PASSED! Basel III should be working.');
            console.log('🔄 Try refreshing and going to Risk & Liquidity tab');
        }
        
        console.log('');
        console.log('🔍 For step-by-step debugging, visit: http://localhost:3000/debug-step-by-step.html');
    }
}

// Run the diagnostic
runBaselIIIDiagnostic();