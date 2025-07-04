/**
 * ZK-PRET Application Controller
 * Main application orchestrator that manages all components and services
 */
class AppController {
    constructor() {
        this.currentTab = 'compliance';
        this.isAsyncMode = true;
        this.syncExecuting = false;
        this.gleifComponent = null;

        // Initialize services
        this.fileManager = new FileManager();
        this.jobManager = new JobManager();
        this.websocketClient = new WebSocketClient();
        this.tabManager = new TabManager();
        this.uiUtils = new UIUtils();
        this.proofExecutors = new ProofExecutors();

        // Initialize SCF data and methods if available
        if (window.scfEnhancement) {
            Object.assign(this, window.scfEnhancement);
            this.initSCF();
        }

        this.init();
    }

    async init() {
        console.log('Initializing ZK-PRET Application...');
        
        this.checkSpecialTabMode();
        this.setupEventListeners();
        this.fileManager.setupFileDropZones();
        
        // Initialize WebSocket for async mode
        if (this.isAsyncMode) {
            this.websocketClient.init();
        }
        
        await this.checkConnection();
        this.updateModeDisplay();
        
        console.log('ZK-PRET Application initialized successfully');
    }

    checkSpecialTabMode() {
        const targetTab = sessionStorage.getItem('zkpret_target_tab');
        if (targetTab) {
            this.tabManager.showSpecialTabMode(targetTab);
            this.currentTab = targetTab;
        }
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab || e.target.closest('.tab-btn').dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Mode toggle
        document.getElementById('async-mode-toggle')