// ZK-PRET Diagnostic Script
// Add this to check what's happening with the tabs

console.log('🔍 ZK-PRET Diagnostic Script Loaded');

// Check if DOM elements exist
function checkElements() {
    const elements = [
        'gleif-tab',
        'corporate-tab', 
        'exim-tab',
        'company-name-input',
        'corporate-company-name-input',
        'exim-company-name-input'
    ];
    
    console.log('📋 Checking DOM elements:');
    elements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`  ${id}: ${element ? '✅ Found' : '❌ Missing'}`);
        if (element && element.classList.contains('hidden')) {
            console.log(`    ⚠️ ${id} is hidden`);
        }
    });
}

// Check active tab
function checkActiveTab() {
    const tabs = document.querySelectorAll('.tab-content');
    console.log('📑 Tab states:');
    tabs.forEach(tab => {
        const isActive = tab.classList.contains('active');
        const isHidden = tab.classList.contains('hidden');
        console.log(`  ${tab.id}: ${isActive ? '✅ Active' : '⚪ Inactive'} ${isHidden ? '🚫 Hidden' : '👁️ Visible'}`);
    });
}

// Test tab switching
function testTabSwitch(tabName) {
    console.log(`🔄 Testing switch to ${tabName} tab`);
    if (window.app && window.app.switchTab) {
        window.app.switchTab(tabName);
        setTimeout(() => {
            checkActiveTab();
            checkElements();
        }, 100);
    } else {
        console.log('❌ window.app.switchTab not available');
    }
}

// Check if app is loaded
function checkApp() {
    console.log('🏃 Checking app status:');
    console.log(`  window.app: ${window.app ? '✅ Available' : '❌ Missing'}`);
    
    if (window.app) {
        console.log(`  currentTab: ${window.app.currentTab}`);
        console.log(`  isAsyncMode: ${window.app.isAsyncMode}`);
    }
}

// Main diagnostic function
function runDiagnostics() {
    console.log('🚀 Running ZK-PRET Diagnostics...');
    checkApp();
    checkElements();
    checkActiveTab();
    
    // Test switching to each tab
    setTimeout(() => {
        console.log('🧪 Testing tab switches...');
        testTabSwitch('gleif');
        setTimeout(() => testTabSwitch('corporate'), 1000);
        setTimeout(() => testTabSwitch('exim'), 2000);
    }, 1000);
}

// Run diagnostics when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runDiagnostics);
} else {
    runDiagnostics();
}

// Add global function to manually run diagnostics
window.runZKPRETDiagnostics = runDiagnostics;

console.log('💡 You can run diagnostics manually by calling: runZKPRETDiagnostics()');
