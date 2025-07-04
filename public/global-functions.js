// Global function definitions for file management
window.clearDataFile = function() {
    if (window.app && window.app.clearDataFile) {
        window.app.clearDataFile();
    }
};

window.clearActualProcessFile = function() {
    if (window.app && window.app.clearActualProcessFile) {
        window.app.clearActualProcessFile();
    }
};

window.clearExpectedProcessFile = function() {
    if (window.app && window.app.clearExpectedProcessFile) {
        window.app.clearExpectedProcessFile();
    }
};

window.clearDeepCompositionFile = function() {
    if (window.app && window.app.clearDeepCompositionFile) {
        window.app.clearDeepCompositionFile();
    }
};
