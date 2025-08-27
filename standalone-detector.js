// Standalone Mode Detector - Detects if app is running in standalone mode
(function() {
    'use strict';
    
    // Detect standalone mode
    function detectStandaloneMode() {
        const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches ||
                          window.navigator.standalone ||
                          document.referrer.includes('android-app://');
        
        if (standalone) {
            document.body.classList.add('standalone-mode');
            console.log('🎯 Standalone mode detected');
        } else {
            document.body.classList.add('browser-mode');
            console.log('🌐 Browser mode detected');
        }
        
        return standalone;
    }
    
    // Run detection when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', detectStandaloneMode);
    } else {
        detectStandaloneMode();
    }
})();
