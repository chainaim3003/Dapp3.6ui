// SCF Enhancement JavaScript
// This file contains the enhanced SCF functionality to be integrated into the main application

// SCF-specific data and methods to be added to the ZKPretAsyncApp class
const scfEnhancement = {
    // Initialize SCF data
    initSCF() {
        this.scfData = {
            selectedFinancier: '',
            documentData: {},
            currentCategory: null,
            uploadingDocs: {}
        };
        
        // Document requirements for each financier
        this.scfFinancierData = {
            'Financier 1': {
                ID: [{ name: 'Aadhar Card', points: 10 }, { name: 'Business PAN Card', points: 10 }],
                Compliance: [{ name: 'KYC Document', points: 10 }, { name: 'Bank Statement', points: 10 }],
                OperationalDataIntegrity: [{ name: 'Bill of Ladding', points: 20 }],
                BusinessProcessIntegrity: [{ name: 'Process1', points: 10 }, { name: 'Process2', points: 10 }],
                Actus: [{ name: 'Proof1', points: 10 }, { name: 'Proof2', points: 10 }],
            },
            'Financier 2': {
                ID: [{ name: 'DGFT', points: 10 }, { name: 'GLEIF', points: 10 }],
                Compliance: [{ name: 'Utility Bill', points: 10 }, { name: 'Tax Return', points: 10 }],
                OperationalDataIntegrity: [{ name: 'Bill of Ladding', points: 20 }],
                BusinessProcessIntegrity: [{ name: 'Process1', points: 10 }, { name: 'Process2', points: 10 }],
                Actus: [{ name: 'Proof1', points: 10 }, { name: 'Proof2', points: 10 }],
            },
            'Financier 3': {
                ID: [{ name: 'Voter ID', points: 10 }, { name: 'College ID', points: 10 }],
                Compliance: [{ name: 'Salary Slip', points: 10 }, { name: 'Rental Agreement', points: 10 }],
                OperationalDataIntegrity: [{ name: 'Bill of Ladding', points: 20 }],
                BusinessProcessIntegrity: [{ name: 'Process1', points: 10 }, { name: 'Process2', points: 10 }],
                Actus: [{ name: 'Proof1', points: 10 }, { name: 'Proof2', points: 10 }],
            },
        };
        
        this.setupSCFEventListeners();
    },

    // Setup SCF-specific event listeners
    setupSCFEventListeners() {
        // Financier selection
        const financierSelect = document.getElementById('scf-financier-select');
        financierSelect?.addEventListener('change', (e) => {
            this.handleSCFFinancierChange(e.target.value);
        });

        // Back button
        const backBtn = document.getElementById('scf-back-btn');
        backBtn?.addEventListener('click', () => {
            this.showSCFCategoriesOverview();
        });

        // Submit category button
        const submitBtn = document.getElementById('scf-submit-category-btn');
        submitBtn?.addEventListener('click', () => {
            this.submitSCFCategory(this.scfData.currentCategory);
        });
    },

    // Handle financier selection change
    handleSCFFinancierChange(selectedFinancier) {
        this.scfData.selectedFinancier = selectedFinancier;
        this.scfData.currentCategory = null;
        this.scfData.uploadingDocs = {};
        
        if (selectedFinancier) {
            const categoryData = this.scfFinancierData[selectedFinancier];
            const formatted = {};
            
            for (const category in categoryData) {
                formatted[category] = categoryData[category].map((doc) => ({
                    name: doc.name,
                    points: doc.points,
                    file: null,
                    uploaded: false,
                    submitted: false,
                    composeLevel: '',
                    uploadTime: '',
                    serverFileId: '',
                }));
            }
            
            this.scfData.documentData = formatted;
            this.showSCFCategoriesOverview();
            this.updateSCFOverallStatus();
        } else {
            this.scfData.documentData = {};
            this.hideSCFSections();
        }
        
        this.showSCFStatusMessage('', '');
    },

    // Show categories overview
    showSCFCategoriesOverview() {
        const overviewDiv = document.getElementById('scf-categories-overview');
        const uploadDiv = document.getElementById('scf-upload-section');
        const categoriesList = document.getElementById('scf-categories-list');
        
        overviewDiv.classList.remove('hidden');
        uploadDiv.classList.add('hidden');
        
        // Populate categories with enhanced cards
        categoriesList.innerHTML = '';
        
        // Category icons mapping
        const categoryIcons = {
            'ID': 'fas fa-id-card',
            'Compliance': 'fas fa-shield-check',
            'OperationalDataIntegrity': 'fas fa-database',
            'BusinessProcessIntegrity': 'fas fa-cogs',
            'Actus': 'fas fa-certificate'
        };
        
        // Category colors mapping
        const categoryColors = {
            'ID': 'from-blue-500 to-blue-600',
            'Compliance': 'from-green-500 to-green-600',
            'OperationalDataIntegrity': 'from-purple-500 to-purple-600',
            'BusinessProcessIntegrity': 'from-orange-500 to-orange-600',
            'Actus': 'from-red-500 to-red-600'
        };
        
        Object.entries(this.scfData.documentData).forEach(([category, docs]) => {
            const { uploadedPoints, totalPoints } = this.calculateSCFCategoryPoints(docs);
            const isComplete = uploadedPoints === totalPoints;
            const progress = totalPoints > 0 ? (uploadedPoints / totalPoints * 100) : 0;
            
            const categoryCard = document.createElement('div');
            categoryCard.className = 'category-section cursor-pointer hover:shadow-lg transition-all';
            categoryCard.innerHTML = `
                <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-gradient-to-br ${categoryColors[category] || 'from-gray-500 to-gray-600'} rounded-xl flex items-center justify-center mr-4">
                            <i class="${categoryIcons[category] || 'fas fa-folder'} text-white text-lg"></i>
                        </div>
                        <div>
                            <h5 class="text-lg font-bold text-gray-900 mb-1">${category.replace(/([A-Z])/g, ' $1').trim()}</h5>
                            <p class="text-sm text-gray-600">${docs.length} document${docs.length !== 1 ? 's' : ''} required</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                            isComplete ? 'bg-green-100 text-green-800' : 
                            uploadedPoints > 0 ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-gray-100 text-gray-600'
                        }">
                            ${uploadedPoints}/${totalPoints} pts
                        </div>
                    </div>
                </div>
                
                <!-- Progress Bar -->
                <div class="mb-4">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm font-medium text-gray-700">Completion Progress</span>
                        <span class="text-sm text-gray-600">${Math.round(progress)}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300" 
                             style="width: ${progress}%"></div>
                    </div>
                </div>
                
                <!-- Document List -->
                <div class="space-y-2 mb-4">
                    ${docs.map((doc, idx) => `
                        <div class="flex justify-between items-center py-2 px-3 rounded-lg ${
                            doc.submitted ? 'bg-green-50 border border-green-200' : 
                            doc.uploaded ? 'bg-blue-50 border border-blue-200' : 
                            'bg-gray-50 border border-gray-200'
                        }">
                            <div class="flex items-center">
                                <div class="w-2 h-2 rounded-full mr-3 ${
                                    doc.submitted ? 'bg-green-500' : 
                                    doc.uploaded ? 'bg-blue-500' : 
                                    'bg-gray-400'
                                }"></div>
                                <span class="text-sm font-medium text-gray-800">${doc.name}</span>
                                <span class="text-xs text-gray-500 ml-2">(${doc.points} pts)</span>
                            </div>
                            <div class="text-xs font-semibold ${
                                doc.submitted ? 'text-green-600' : 
                                doc.uploaded ? 'text-blue-600' : 
                                'text-gray-500'
                            }">
                                ${doc.submitted ? '✅ Submitted' : (doc.uploaded ? '📤 Uploaded' : '⏳ Pending')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <!-- Action Button -->
                <button class="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-[1.02] flex items-center justify-center">
                    <i class="fas fa-cloud-upload-alt mr-2"></i>
                    Upload ${category.replace(/([A-Z])/g, ' $1').trim()} Documents
                </button>
            `;
            
            categoryCard.querySelector('button').addEventListener('click', () => {
                this.showSCFUploadSection(category);
            });
            
            categoriesList.appendChild(categoryCard);
        });
    },

    // Show upload section for specific category
    showSCFUploadSection(category) {
        this.scfData.currentCategory = category;
        
        const overviewDiv = document.getElementById('scf-categories-overview');
        const uploadDiv = document.getElementById('scf-upload-section');
        const currentCategorySpan = document.getElementById('scf-current-category');
        const documentsTable = document.getElementById('scf-documents-table');
        
        overviewDiv.classList.add('hidden');
        uploadDiv.classList.remove('hidden');
        currentCategorySpan.textContent = category;
        
        // Populate documents table
        documentsTable.innerHTML = '';
        
        this.scfData.documentData[category].forEach((doc, idx) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="font-medium">${doc.name}</td>
                <td class="text-center font-bold text-blue-600">${doc.points}</td>
                <td>
                    <input type="text" 
                           class="compose-level-input" 
                           placeholder="Enter level" 
                           value="${doc.composeLevel}"
                           onchange="app.updateSCFDocumentLevel('${category}', ${idx}, this.value)">
                </td>
                <td>
                    <div class="document-upload-zone" 
                         id="scf-upload-${category}-${idx}"
                         onclick="document.getElementById('scf-file-${category}-${idx}').click()">
                        ${doc.file ? 
                            `<div class="text-sm text-green-600">
                                <i class="fas fa-file mr-2"></i>${doc.file.name}
                                <button onclick="app.removeSCFDocument('${category}', ${idx})" 
                                        class="ml-2 text-red-500 hover:text-red-700">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>` :
                            `<div class="text-gray-500">
                                <i class="fas fa-cloud-upload-alt text-2xl mb-1"></i>
                                <div class="text-xs">Click or drag to upload</div>
                            </div>`
                        }
                    </div>
                    <input type="file" 
                           id="scf-file-${category}-${idx}" 
                           style="display: none" 
                           onchange="app.handleSCFFileUpload(event, '${category}', ${idx})">
                </td>
                <td class="text-center">
                    ${doc.uploaded ? 
                        '<i class="fas fa-check-circle text-green-500 text-lg"></i>' : 
                        '<i class="fas fa-clock text-gray-400 text-lg"></i>'
                    }
                </td>
            `;
            
            documentsTable.appendChild(row);
            
            // Setup drag and drop for this upload zone
            this.setupSCFUploadZone(`scf-upload-${category}-${idx}`, category, idx);
        });
    },

    // Setup drag and drop for upload zones
    setupSCFUploadZone(uploadZoneId, category, index) {
        const uploadZone = document.getElementById(uploadZoneId);
        if (!uploadZone) return;

        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            
            if (e.dataTransfer.files.length > 0) {
                this.handleSCFFileUpload({ target: { files: e.dataTransfer.files } }, category, index);
            }
        });
    },

    // Handle file upload
    async handleSCFFileUpload(event, category, index) {
        const file = event.target.files[0];
        if (!file) return;

        this.scfData.uploadingDocs[`${category}-${index}`] = true;
        
        try {
            // Simulate API upload
            const apiResponse = await this.uploadFileToAPI(file);
            
            if (apiResponse.success) {
                this.updateSCFDocument(category, index, {
                    file,
                    uploaded: true,
                    uploadTime: new Date().toLocaleString(),
                    serverFileId: apiResponse.serverFileId,
                });
                
                this.showSCFStatusMessage(
                    `File for ${this.scfData.documentData[category][index].name} uploaded successfully.`,
                    'success'
                );
                
                // Refresh the upload section
                this.showSCFUploadSection(category);
            } else {
                this.showSCFStatusMessage('Upload failed, please try again.', 'error');
            }
        } catch (error) {
            this.showSCFStatusMessage('Upload error occurred.', 'error');
        } finally {
            delete this.scfData.uploadingDocs[`${category}-${index}`];
        }
    },

    // Simulate file upload to API
    uploadFileToAPI(file) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ 
                    success: true, 
                    serverFileId: Math.random().toString(36).slice(2) 
                });
            }, 1500);
        });
    },

    // Update document data
    updateSCFDocument(category, index, updates) {
        this.scfData.documentData[category][index] = {
            ...this.scfData.documentData[category][index],
            ...updates
        };
        this.updateSCFOverallStatus();
    },

    // Update document compose level
    updateSCFDocumentLevel(category, index, level) {
        this.updateSCFDocument(category, index, { composeLevel: level });
    },

    // Remove document
    removeSCFDocument(category, index) {
        this.updateSCFDocument(category, index, {
            file: null,
            uploaded: false,
            uploadTime: '',
            serverFileId: ''
        });
        this.showSCFUploadSection(category); // Refresh view
    },

    // Submit category
    submitSCFCategory(category) {
        const docs = this.scfData.documentData[category];
        const allValid = docs.every(doc => doc.file && doc.composeLevel);
        
        if (!allValid) {
            this.showSCFStatusMessage(
                `Please complete all documents under ${category}.`,
                'error'
            );
            return;
        }

        // Mark all documents as submitted
        docs.forEach((doc, index) => {
            this.updateSCFDocument(category, index, { submitted: true });
        });
        
        this.showSCFStatusMessage(
            `${category} documents submitted successfully.`,
            'success'
        );
        
        this.showSCFCategoriesOverview();
    },

    // Calculate category points
    calculateSCFCategoryPoints(docs) {
        const uploadedPoints = docs.reduce((acc, doc) => acc + (doc.uploaded ? doc.points : 0), 0);
        const totalPoints = docs.reduce((acc, doc) => acc + doc.points, 0);
        return { uploadedPoints, totalPoints };
    },

    // Update overall status display
    updateSCFOverallStatus() {
        const overallStatusDiv = document.getElementById('scf-overall-status');
        const allDocsTable = document.getElementById('scf-all-documents-table');
        const totalPointsSpan = document.getElementById('scf-total-points');
        
        // Show overall status if any documents exist
        const hasDocuments = Object.keys(this.scfData.documentData).length > 0;
        if (hasDocuments) {
            overallStatusDiv.classList.remove('hidden');
        } else {
            overallStatusDiv.classList.add('hidden');
            return;
        }
        
        // Populate all documents table
        allDocsTable.innerHTML = '';
        let grandTotal = 0;
        
        Object.entries(this.scfData.documentData).forEach(([category, docs]) => {
            docs.forEach(doc => {
                const pointsObtained = doc.uploaded ? doc.points : 0;
                grandTotal += pointsObtained;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="font-medium">${category}</td>
                    <td>${doc.name}</td>
                    <td class="text-center">${doc.composeLevel || '-'}</td>
                    <td class="text-center">
                        ${doc.submitted ? '✅ Submitted' : (doc.uploaded ? '📤 Uploaded' : '⏳ Pending')}
                    </td>
                    <td class="text-center font-bold">${doc.points}</td>
                    <td class="text-center text-sm">${doc.uploadTime || '-'}</td>
                    <td class="text-center font-bold ${pointsObtained > 0 ? 'text-green-600' : 'text-gray-400'}">
                        ${pointsObtained}
                    </td>
                `;
                
                allDocsTable.appendChild(row);
            });
        });
        
        // Update grand total
        totalPointsSpan.textContent = grandTotal;
    },

    // Show status message
    showSCFStatusMessage(message, type) {
        const statusDiv = document.getElementById('scf-status-message');
        
        if (!message) {
            statusDiv.classList.add('hidden');
            return;
        }
        
        statusDiv.classList.remove('hidden');
        
        const bgColor = type === 'success' ? 'bg-green-50 border-green-200' : 
                       type === 'error' ? 'bg-red-50 border-red-200' : 
                       'bg-blue-50 border-blue-200';
        
        const textColor = type === 'success' ? 'text-green-700' : 
                         type === 'error' ? 'text-red-700' : 
                         'text-blue-700';
        
        const icon = type === 'success' ? 'fas fa-check-circle' : 
                    type === 'error' ? 'fas fa-exclamation-circle' : 
                    'fas fa-info-circle';
        
        statusDiv.className = `mt-4 p-4 rounded-lg border ${bgColor}`;
        statusDiv.innerHTML = `
            <div class="flex items-center">
                <i class="${icon} mr-2 ${textColor}"></i>
                <span class="${textColor}">${message}</span>
            </div>
        `;
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                statusDiv.classList.add('hidden');
            }, 5000);
        }
    },

    // Hide SCF sections
    hideSCFSections() {
        document.getElementById('scf-categories-overview')?.classList.add('hidden');
        document.getElementById('scf-upload-section')?.classList.add('hidden');
        document.getElementById('scf-overall-status')?.classList.add('hidden');
    }
};

// Global functions for event handlers
window.updateSCFDocumentLevel = function(category, index, level) {
    if (window.app && window.app.updateSCFDocumentLevel) {
        window.app.updateSCFDocumentLevel(category, index, level);
    }
};

window.handleSCFFileUpload = function(event, category, index) {
    if (window.app && window.app.handleSCFFileUpload) {
        window.app.handleSCFFileUpload(event, category, index);
    }
};

window.removeSCFDocument = function(category, index) {
    if (window.app && window.app.removeSCFDocument) {
        window.app.removeSCFDocument(category, index);
    }
};

// Export for integration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = scfEnhancement;
} else {
    window.scfEnhancement = scfEnhancement;
}
