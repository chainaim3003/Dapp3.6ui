// Basel III Async Server Diagnostic Script
// Copy and paste this entire script into your browser console while on the main app page
// This version is optimized for npm run dev-async

console.log('🔧 BASEL III ASYNC SERVER DIAGNOSTIC STARTING...');
console.log('==============================================');

// Function to create async-aware diagnostic report
function runAsyncBaselIIIDiagnostic() {
    console.log('📊 ASYNC SERVER DIAGNOSTIC REPORT:');
    console.log('==================================');
    
    const results = {
        asyncServer: false,
        apiEndpoint: false,
        websocket: false,
        riskComponentClass: false,
        appAsyncMode: false,
        componentInstance: false,
        appIntegration: false
    };
    
    // 1. Check async server health
    fetch('/api/v1/health')
        .then(response => {
            if (response.ok) {
                results.asyncServer = true;
                console.log('✅ Async Server: RUNNING');
                return response.json();
            } else {
                console.log('❌ Async Server: FAILED');
                throw new Error('Server not responding');
            }
        })
        .then(healthData => {
            console.log('📊 Server Features:', healthData.services || {});
            console.log('🔗 Active Jobs:', healthData.activeJobs || 0);
            console.log('🔌 WebSocket Clients:', healthData.services?.websockets || false);
            
            // 2. Check Basel III API on async server
            return fetch('/api/v1/basel3-config-files');
        })
        .then(response => {
            if (response.ok) {
                results.apiEndpoint = true;
                console.log('✅ Basel III API: OK (Async Server)');
                return response.json();
            } else {
                console.log('❌ Basel III API: FAILED');
                throw new Error('API endpoint failed');
            }
        })
        .then(data => {
            console.log(`📁 Found ${data.count} config files:`, data.files);
            
            // 3. Test WebSocket connection (async server specific)
            console.log('🔌 Testing WebSocket connection...');
            const ws = new WebSocket('ws://localhost:3000');
            
            ws.onopen = () => {
                results.websocket = true;
                console.log('✅ WebSocket: CONNECTED');
                ws.close();
            };
            
            ws.onerror = () => {
                console.log('❌ WebSocket: CONNECTION FAILED');
            };
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log('📩 WebSocket Message:', data);
            };
            
            setTimeout(() => {
                if (ws.readyState !== WebSocket.OPEN) {
                    console.log('❌ WebSocket: TIMEOUT');
                }
                continueAsyncCheck();
            }, 3000);
        })
        .catch(error => {
            console.log('❌ Error during server/API check:', error.message);
            continueAsyncCheck();
        });
    
    function continueAsyncCheck() {
        // 4. Check RiskComponent class
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
                    continueComponentCheck();
                } else {
                    console.log('❌ RiskComponent Class: STILL NOT AVAILABLE');
                    continueComponentCheck();
                }
            };
            script.onerror = () => {
                console.log('❌ Failed to load risk.js');
                continueComponentCheck();
            };
            document.head.appendChild(script);
            return;
        }
        
        continueComponentCheck();
    }
    
    function continueComponentCheck() {
        // 5. Check app async mode
        if (window.app) {
            console.log('✅ Main App Object: FOUND');
            console.log('🔍 App Async Mode:', window.app.isAsyncMode);
            
            if (window.app.isAsyncMode === true) {
                results.appAsyncMode = true;
                console.log('✅ App Async Mode: ENABLED');
            } else if (window.app.isAsyncMode === false) {
                console.log('❌ App Async Mode: DISABLED (Running sync mode on async server)');
                console.log('🔧 Fix: window.app.isAsyncMode = true');
            } else {
                console.log('⚠️ App Async Mode: UNDEFINED');
            }
            
            if (window.app.riskComponent) {
                results.appIntegration = true;
                console.log('✅ App Integration: RiskComponent INTEGRATED');
            } else {
                console.log('❌ App Integration: RiskComponent NOT INTEGRATED');
                console.log('🔧 Fix: window.app.riskComponent = new window.RiskComponent()');
            }
        } else {
            console.log('❌ Main App Object: NOT FOUND');
        }
        
        // 6. Try to create component instance in async environment
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
                console.log('✅ Component Instance: CREATED IN ASYNC ENVIRONMENT');
                
                // Check if dropdown was created
                setTimeout(() => {
                    const dropdown = document.getElementById('basel3-config-select');
                    if (dropdown) {
                        console.log('✅ Basel III Dropdown: CREATED');
                        console.log(`📊 Dropdown has ${dropdown.options.length} options`);
                    } else {
                        console.log('❌ Basel III Dropdown: NOT CREATED');
                    }
                    
                    // Final async summary
                    printAsyncSummary();
                }, 2000);
                
            } catch (error) {
                console.log('❌ Component Instance: CREATION FAILED');
                console.log('Error:', error.message);
                console.log('Stack:', error.stack);
                printAsyncSummary();
            }
        } else {
            console.log('❌ Component Instance: CANNOT CREATE (CLASS NOT AVAILABLE)');
            printAsyncSummary();
        }
    }
    
    function printAsyncSummary() {
        console.log('');
        console.log('📋 ASYNC SERVER SUMMARY:');
        console.log('========================');
        Object.entries(results).forEach(([key, value]) => {
            console.log(`${value ? '✅' : '❌'} ${key}: ${value ? 'PASS' : 'FAIL'}`);
        });
        
        console.log('');
        console.log('🎯 ASYNC SERVER RECOMMENDATIONS:');
        console.log('================================');
        
        if (!results.asyncServer) {
            console.log('🔧 Start async server: npm run dev-async');
        }
        
        if (!results.websocket) {
            console.log('🔧 WebSocket issues may affect async functionality');
            console.log('🔧 Check if ENABLE_WEBSOCKETS=true in .env');
        }
        
        if (!results.appAsyncMode) {
            console.log('🔧 Enable async mode: window.app.isAsyncMode = true');
        }
        
        if (!results.appIntegration) {
            console.log('🔧 Integrate component: window.app.riskComponent = new window.RiskComponent()');
        }
        
        // Async-specific fixes
        console.log('');
        console.log('⚡ ASYNC-SPECIFIC QUICK FIXES:');
        console.log('=============================');
        
        if (window.app && !window.app.isAsyncMode) {
            console.log('🔧 ASYNC MODE FIX:');
            console.log('   window.app.isAsyncMode = true');
        }
        
        if (window.app && window.RiskComponent && !window.app.riskComponent) {
            console.log('🔧 INTEGRATION FIX:');
            console.log('   window.app.riskComponent = new window.RiskComponent()');
        }
        
        if (window.app && window.RiskComponent) {
            console.log('🔧 COMPLETE ASYNC FIX:');
            console.log('   window.app.isAsyncMode = true;');
            console.log('   window.app.riskComponent = new window.RiskComponent();');
            console.log('   console.log("Async Basel III fix applied!");');
        }
        
        if (Object.values(results).every(v => v)) {
            console.log('🎉 ALL ASYNC CHECKS PASSED! Basel III should work in async mode.');
        } else {
            console.log('');
            console.log('🔍 For detailed async debugging: http://localhost:3000/debug-async-basel3.html');
        }
    }
}

// Run the async diagnostic
runAsyncBaselIIIDiagnostic();