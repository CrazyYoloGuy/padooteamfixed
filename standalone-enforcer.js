// Standalone Mode Enforcer - Ensures PWA runs in standalone mode
(function() {
    'use strict';
    
    // Check if running in standalone mode
    const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches ||
                        window.navigator.standalone ||
                        document.referrer.includes('android-app://');
    
    // Only enforce on mobile devices
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!isStandalone && isMobile) {
        console.log('📱 App should be running in standalone mode');
        // Could show install prompt or instructions here
    } else {
        console.log('✅ App running in proper mode');
    }
})();
