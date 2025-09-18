class DeliveryApp {
    constructor() {
        this.orders = [];
        this.shops = [];
        this.categories = [];
        this.recentOrders = [];
        this.notifications = [];
        this.currentFilter = 'all';
        this.currentPage = 'home';
        this.floatingButton = null;
        this.userType = 'driver';
        this.userEmail = null;
        this.userId = null;
        this.sessionToken = null;
        this.currentUser = null;
        this.settings = {
            earningsPerOrder: 1.50
        };
        this.ws = null;
        this.audioContext = null;
        this.notificationAudio = null;
        this.isAudioEnabled = localStorage.getItem('notificationSound') !== 'false';
        this.soundVolume = parseFloat(localStorage.getItem('soundVolume')) || 0.5; // Default 50% volume
        this.initNotificationSound();

        // Auto-refresh intervals
        this.notificationRefreshInterval = null;
        this.timeUpdateInterval = null;

        // Initialize translation system early so UI renders in saved language
        this.initTranslations();

        // Initialize the app
        this.init();



        // Apply modern UI enhancements immediately
        setTimeout(() => this.applyModernUIEnhancements(), 100);
    }

    // Apply modern UI enhancements to ensure visual changes are visible
    applyModernUIEnhancements() {
        console.log('🎨 Applying modern UI enhancements...');

        // Force modern navigation styling
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) {
            bottomNav.style.cssText += `
                background: rgba(255, 255, 255, 0.95) !important;
                backdrop-filter: blur(24px) !important;
                -webkit-backdrop-filter: blur(24px) !important;
                border-radius: 28px 28px 0 0 !important;
                box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.08) !important;
                padding: 16px 12px 24px 12px !important;
            `;
        }

        // Force modern nav item styling
        document.querySelectorAll('.nav-item').forEach((item, index) => {
            item.style.cssText += `
                padding: 12px 16px !important;
                border-radius: 18px !important;
                font-size: 11px !important;
                font-weight: 600 !important;
                letter-spacing: 0.3px !important;
                text-transform: uppercase !important;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
                position: relative !important;
            `;

            const icon = item.querySelector('i');
            if (icon) {
                icon.style.cssText += `
                    font-size: 22px !important;
                    margin-bottom: 6px !important;
                    transition: all 0.3s ease !important;
                `;
            }

            // Add hover effects
            item.addEventListener('mouseenter', () => {
                if (!item.classList.contains('active')) {
                    item.style.cssText += `
                        background: rgba(255, 107, 53, 0.08) !important;
                        color: #ff6b35 !important;
                        transform: translateY(-3px) scale(1.02) !important;
                        box-shadow: 0 8px 25px rgba(255, 107, 53, 0.15) !important;
                    `;
                    if (icon) {
                        icon.style.transform = 'scale(1.1)';
                        icon.style.filter = 'drop-shadow(0 2px 6px rgba(255, 107, 53, 0.3))';
                    }
                }
            });

            item.addEventListener('mouseleave', () => {
                if (!item.classList.contains('active')) {
                    item.style.cssText += `
                        background: transparent !important;
                        color: #6b7280 !important;
                        transform: none !important;
                        box-shadow: none !important;
                    `;
                    if (icon) {
                        icon.style.transform = 'none';
                        icon.style.filter = 'none';
                    }
                }
            });
        });

        // Force modern header styling
        const appHeader = document.querySelector('.app-header');
        if (appHeader) {
            appHeader.style.cssText += `
                background: linear-gradient(135deg, #ff6b35 0%, #ff8f65 50%, #e55a2b 100%) !important;
                padding: 20px 24px !important;
                box-shadow: 0 8px 32px rgba(255, 107, 53, 0.15) !important;
                backdrop-filter: blur(20px) !important;
            `;
        }

        const headerLogo = document.querySelector('.header-logo');
        if (headerLogo) {
            headerLogo.style.cssText += `
                width: 44px !important;
                height: 44px !important;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
                transition: all 0.3s ease !important;
            `;

            headerLogo.addEventListener('mouseenter', () => {
                headerLogo.style.transform = 'scale(1.05) rotate(5deg)';
                headerLogo.style.boxShadow = '0 6px 24px rgba(0, 0, 0, 0.2)';
            });

            headerLogo.addEventListener('mouseleave', () => {
                headerLogo.style.transform = 'none';
                headerLogo.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
            });
        }

        const appTitle = document.querySelector('.app-title');
        if (appTitle) {
            appTitle.style.cssText += `
                font-size: 24px !important;
                font-weight: 800 !important;
                color: white !important;
                letter-spacing: -0.5px !important;
                text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
            `;
        }

        console.log('✨ Modern UI enhancements applied successfully!');
    }

    // ===== SMART MEMORY SYSTEM =====

    // Initialize Smart Memory System (called after authentication)
    initializeSmartMemory() {
        console.log('🧠 Initializing Smart Memory System...');

        // Smart Memory System for instant loading
        this.smartMemory = {
            acceptedOrders: { data: [], lastUpdate: 0, isLoading: false },
            recentOrders: { data: [], lastUpdate: 0, isLoading: false },
            shops: { data: [], lastUpdate: 0, isLoading: false },
            notifications: { data: [], lastUpdate: 0, isLoading: false }
        };

        // Memory configuration
        this.memoryConfig = {
            acceptedOrders: { ttl: 5 * 60 * 1000, preloadDelay: 2000 }, // 5min TTL, preload after 2s
            recentOrders: { ttl: 2 * 60 * 1000, preloadDelay: 3000 },   // 2min TTL, preload after 3s
            shops: { ttl: 10 * 60 * 1000, preloadDelay: 1000 },         // 10min TTL, preload after 1s
            notifications: { ttl: 1 * 60 * 1000, preloadDelay: 1500 }   // 1min TTL, preload after 1.5s
        };

        // Start background preloading after app initialization
        setTimeout(() => this.startSmartPreloading(), 1000);
    }

    // Start background preloading of important data
    startSmartPreloading() {
        if (!this.userId || !this.sessionToken) {
            console.log('🧠 Skipping preloading - no user session');
            return;
        }

        console.log('🧠 Starting smart preloading...');

        try {
            // Schedule preloading with delays to avoid overwhelming the server
            Object.keys(this.memoryConfig).forEach(key => {
                const config = this.memoryConfig[key];
                setTimeout(() => {
                    this.preloadToMemory(key).catch(error => {
                        console.error(`🧠 Preload failed for ${key}:`, error);
                    });
                }, config.preloadDelay);
            });

            // Set up periodic refresh for all cached data
            setInterval(() => {
                this.refreshExpiredMemory();
            }, 30000); // Check every 30 seconds
        } catch (error) {
            console.error('🧠 Error starting smart preloading:', error);
        }
    }

    // Preload specific data type to memory
    async preloadToMemory(dataType) {
        const memory = this.smartMemory[dataType];
        if (memory.isLoading) return;

        const now = Date.now();
        const config = this.memoryConfig[dataType];

        // Skip if data is still fresh
        if (memory.data.length > 0 && (now - memory.lastUpdate) < config.ttl) {
            return;
        }

        memory.isLoading = true;
        console.log(`🧠 Preloading ${dataType}...`);

        try {
            let data;
            switch (dataType) {
                case 'acceptedOrders':
                    data = await this.fetchAcceptedOrdersRaw();
                    break;
                case 'recentOrders':
                    data = await this.fetchRecentOrdersRaw();
                    break;
                case 'shops':
                    data = await this.fetchShopsRaw();
                    break;
                case 'notifications':
                    data = await this.fetchNotificationsRaw();
                    break;
            }

            if (data) {
                memory.data = data;
                memory.lastUpdate = now;
                console.log(`🧠 Preloaded ${dataType}: ${data.length} items`);
            }
        } catch (error) {
            console.error(`🧠 Failed to preload ${dataType}:`, error);
        } finally {
            memory.isLoading = false;
        }
    }

    // Get data from memory (instant) or fetch if needed
    async getFromMemory(dataType, forceRefresh = false) {
        try {
            // Check if smart memory is initialized
            if (!this.smartMemory || !this.memoryConfig) {
                console.warn(`🧠 Smart memory not initialized, falling back to direct fetch for ${dataType}`);
                return await this.fallbackFetch(dataType);
            }

            const memory = this.smartMemory[dataType];
            const config = this.memoryConfig[dataType];
            const now = Date.now();

            // Return cached data if fresh and not forcing refresh
            if (!forceRefresh && memory.data.length > 0 && (now - memory.lastUpdate) < config.ttl) {
                console.log(`🧠 Serving ${dataType} from memory (${memory.data.length} items)`);
                return memory.data;
            }

            // If data is stale or force refresh, fetch new data
            console.log(`🧠 Fetching fresh ${dataType}...`);
            await this.preloadToMemory(dataType);
            return memory.data;
        } catch (error) {
            console.error(`🧠 Error getting ${dataType} from memory:`, error);
            return await this.fallbackFetch(dataType);
        }
    }

    // Fallback fetch when smart memory fails
    async fallbackFetch(dataType) {
        console.log(`🧠 Fallback fetch for ${dataType}`);
        try {
            switch (dataType) {
                case 'acceptedOrders':
                    return await this.fetchAcceptedOrdersRaw();
                case 'recentOrders':
                    return await this.fetchRecentOrdersRaw();
                case 'shops':
                    return await this.fetchShopsRaw();
                case 'notifications':
                    return await this.fetchNotificationsRaw();
                default:
                    return [];
            }
        } catch (error) {
            console.error(`🧠 Fallback fetch failed for ${dataType}:`, error);
            return [];
        }
    }

    // Refresh expired memory in background
    refreshExpiredMemory() {
        const now = Date.now();
        Object.keys(this.smartMemory).forEach(dataType => {
            const memory = this.smartMemory[dataType];
            const config = this.memoryConfig[dataType];

            if (memory.data.length > 0 && (now - memory.lastUpdate) >= config.ttl) {
                console.log(`🧠 Background refresh of ${dataType}`);
                this.preloadToMemory(dataType);
            }
        });
    }

    // Update memory when data changes (real-time updates)
    updateMemory(dataType, newData) {
        try {
            if (!this.smartMemory || !this.smartMemory[dataType]) return;
            const memory = this.smartMemory[dataType];
            memory.data = newData;
            memory.lastUpdate = Date.now();
            console.log(`🧠 Updated ${dataType} memory with ${newData.length} items`);
        } catch (error) {
            console.error(`🧠 Error updating ${dataType} memory:`, error);
        }
    }

    // Add single item to memory (for real-time updates)
    addToMemory(dataType, item) {
        try {
            if (!this.smartMemory || !this.smartMemory[dataType]) return;
            const memory = this.smartMemory[dataType];

            // Normalize orders so UI never shows N/A/Unknown when we have the data
            const normalizeOrder = (o) => {
                if (!o) return o;
                const n = { ...o };
                if ((n.id == null || n.id === 'N/A') && n.order_id != null) n.id = n.order_id;
                if (!n.shop_name) {
                    try {
                        const sid = n.shop_account_id || n.shop_id;
                        const shops = (this.smartMemory?.shops?.data?.length ? this.smartMemory.shops.data : this.shops) || [];
                        const s = shops.find(x => x && (String(x.id) === String(sid)));
                        if (s) n.shop_name = s.name || s.shop_name;
                    } catch(_) {}
                }
                return n;
            };

            if (dataType === 'notifications') {
                // Ensure array
                if (!Array.isArray(memory.data)) memory.data = [];
                // If same ID exists, update in place
                const byId = memory.data.findIndex(n => n && n.id === item.id);
                if (byId !== -1) {
                    memory.data[byId] = { ...memory.data[byId], ...item };
                } else {
                    // Remove duplicate pending for same order
                    if (item && item.order_id) {
                        const dup = memory.data.findIndex(n => n && n.order_id === item.order_id && n.status === 'pending' && (item.status === 'pending' || !item.status) && n.id !== item.id);
                        if (dup !== -1) memory.data.splice(dup, 1);
                    }
                    memory.data.unshift(item);
                }
            } else {
                // Normalize accepted/recent orders before storing
                const toStore = (dataType === 'acceptedOrders' || dataType === 'recentOrders') ? normalizeOrder(item) : item;
                memory.data.unshift(toStore);
            }

            memory.lastUpdate = Date.now();
            console.log(`🧠 Added item to ${dataType} memory`);
        } catch (error) {
            console.error(`🧠 Error adding to ${dataType} memory:`, error);
        }
    }

    // Update single item in memory
    updateItemInMemory(dataType, itemId, updatedItem) {
        try {
            if (!this.smartMemory || !this.smartMemory[dataType]) return;
            const memory = this.smartMemory[dataType];
            const index = memory.data.findIndex(item => item.id === itemId);
            if (index !== -1) {
                memory.data[index] = updatedItem;
                memory.lastUpdate = Date.now();
                console.log(`🧠 Updated item in ${dataType} memory`);
            }
        } catch (error) {
            console.error(`🧠 Error updating item in ${dataType} memory:`, error);
        }
    }

    // Remove item from memory
    removeFromMemory(dataType, itemId) {
        try {
            if (!this.smartMemory || !this.smartMemory[dataType]) return;
            const memory = this.smartMemory[dataType];
            if (dataType === 'notifications') {
                const targetId = (itemId || '').toString();
                memory.data = (memory.data || []).filter(item => ((item?.id)?.toString && item.id.toString()) !== targetId);
            } else {
                memory.data = memory.data.filter(item => item.id !== itemId);
            }
            memory.lastUpdate = Date.now();
            console.log(`🧠 Removed item from ${dataType} memory`);
        } catch (error) {
            console.error(`🧠 Error removing from ${dataType} memory:`, error);
        }
    }

    // ===== RAW FETCH METHODS FOR SMART MEMORY =====

    async fetchAcceptedOrdersRaw() {
        const response = await fetch(`/api/driver/${this.userId}/accepted-orders`, {
            headers: { 'Authorization': `Bearer ${this.sessionToken}` }
        });
        if (!response.ok) throw new Error('Failed to fetch accepted orders');
        const data = await response.json();
        return data.orders || [];
    }

    async fetchRecentOrdersRaw() {
        const response = await fetch('/api/recent-orders', {
            headers: { 'Authorization': `Bearer ${this.sessionToken}` }
        });
        if (!response.ok) throw new Error('Failed to fetch recent orders');
        const data = await response.json();
        return data.orders || [];
    }

    async fetchShopsRaw() {
        const response = await fetch('/api/user/shops', {
            headers: { 'Authorization': `Bearer ${this.sessionToken}` }
        });
        if (!response.ok) throw new Error('Failed to fetch shops');
        const data = await response.json();
        return data.shops || [];
    }

    async fetchNotificationsRaw() {
        const response = await fetch(`/api/driver/${this.userId}/notifications`, {
            headers: { 'Authorization': `Bearer ${this.sessionToken}` }
        });
        if (!response.ok) throw new Error('Failed to fetch notifications');
        const data = await response.json();
        return data.notifications || [];
    }

    async init() {
        console.log('Main app initializing...');

        // Check if user is logged in
        if (!this.checkAuthStatus()) {
            window.location.href = '/';
            return;
        }

        // Enhanced back button prevention for mobile apps
        this.preventBackNavigation();

        // Set user data from authenticated session
        if (this.currentUser) {
            this.userEmail = this.currentUser.email;
            this.userId = this.currentUser.id;
            console.log('User data set:', { email: this.userEmail, id: this.userId });
        }

        // Initialize Smart Memory System after authentication
        this.initializeSmartMemory();

        // Initialize app components
        this.bindEvents();
        this.createConfirmModal();
        this.updateCurrentDate();

        // Initialize audio and WebSocket after authentication
        this.initializeAudio();
        this.connectWebSocket();

        await this.loadUserData();
        await this.loadSettingsData();
        await this.loadCategories();

        // Setup push notifications
        await this.setupPushNotifications();

        // Navigate to home page
        this.navigateToPage('home');
        this.updateUI();

        await this.fetchInitialNotifications();

        // Setup notifications menu
        this.setupNotificationsMenu();

        console.log('Main app initialization complete');
    }



    checkAuthStatus() {
        // Get user session data from localStorage
        const sessionData = localStorage.getItem('userSession');

        if (sessionData) {
            try {
                // Parse the session data
                const session = JSON.parse(sessionData);

                // Check if we have all required session data
                if (session && session.user && session.sessionToken) {
                    this.currentUser = session.user;
                    this.sessionToken = session.sessionToken;

                    // Store in app-specific keys for backward compatibility
                    localStorage.setItem('deliveryAppUser', JSON.stringify(this.currentUser));
                    localStorage.setItem('deliveryAppSession', this.sessionToken);

                    console.log('Found valid session for:', this.currentUser.email);
                    return true;
                }
            } catch (error) {
                console.error('Error parsing stored user data:', error);
                localStorage.removeItem('userSession');
                localStorage.removeItem('deliveryAppUser');
                localStorage.removeItem('deliveryAppSession');
            }
        } else {
            // Check for legacy storage keys as fallback
            const storedUser = localStorage.getItem('deliveryAppUser');
            const storedSession = localStorage.getItem('deliveryAppSession');

            if (storedUser && storedSession) {
                try {
                    this.currentUser = JSON.parse(storedUser);
                    this.sessionToken = storedSession;
                    console.log('Found valid legacy session for:', this.currentUser.name || this.currentUser.email);
                    return true;
                } catch (error) {
                    console.error('Error parsing legacy user data:', error);
                    localStorage.removeItem('deliveryAppUser');
                    localStorage.removeItem('deliveryAppSession');
                }
            }
        }

        console.warn('No valid session found, user needs to log in');
        return false;
    }

    bindEvents() {
        console.log('Binding main app events...');

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const page = e.currentTarget.dataset.page;
                if (page) {
                    console.log('Navigation clicked:', page);
                    this.navigateToPage(page);
                }
            });
        });

        // Use event delegation for dynamic content
        document.addEventListener('click', async (e) => {
            // Don't process clicks if they're inside a notification modal
            if (e.target.closest('#edit-notification-modal, #delete-notification-modal, #confirm-notification-modal')) {
                return;
            }

            // Handle Accept Order via delegation (fallback if inline fails)
            const acceptBtn = e.target.closest('[data-accept-order]');
            if (acceptBtn) {
                e.preventDefault();
                e.stopPropagation();
                const nId = acceptBtn.getAttribute('data-notification-id');
                console.log('🟢 Delegated Accept click for notification:', nId);
                if (nId) {
                    this.acceptOrder(nId, acceptBtn);
                } else {
                    console.error('Accept button missing data-notification-id');
                }
                return;
            }

            // Handle notification action buttons
            if (e.target.closest('.action-btn-mini')) {
                e.preventDefault();
                e.stopPropagation();

                const button = e.target.closest('.action-btn-mini');
                const notificationId = button.getAttribute('data-notification-id');
                const action = button.getAttribute('data-action');

                console.log('Notification button clicked:', action, 'for notification:', notificationId);
                console.log('Button element:', button);
                console.log('Button attributes:', {
                    'data-notification-id': button.getAttribute('data-notification-id'),
                    'data-action': button.getAttribute('data-action'),
                    'class': button.className
                });

                if (!notificationId) {
                    console.error('No notification ID found on button');
                    console.error('Button HTML:', button.outerHTML);
                    console.error('Button parent:', button.parentElement?.outerHTML);
                    this.showToast('Error: Notification ID not found', 'error');
                    return;
                }

                if (!action) {
                    console.error('No action found on button');
                    console.error('Button HTML:', button.outerHTML);
                    this.showToast('Error: Action not specified', 'error');
                    return;
                }

                if (action === 'confirm') {
                    console.log('Confirming notification:', notificationId);
                    const notificationCard = button.closest('.notification-card');
                    const messageElement = notificationCard?.querySelector('.notification-message-mini');
                    const shopElement = notificationCard?.querySelector('.shop-name-mini');

                    const message = messageElement ? messageElement.textContent : '';
                    const shopName = shopElement ? shopElement.textContent : 'Unknown Shop';

                    this.showConfirmationModal(notificationId, message, shopName);
                } else if (action === 'delete') {
                    console.log('Deleting notification:', notificationId);
                    this.showDeleteConfirmationModal(notificationId);
                } else {
                    console.error('Unknown action:', action);
                    this.showToast('Error: Unknown action', 'error');
                }
                return;
            }

            // Prevent any clicks from bubbling up
            const target = e.target.closest('button, .nav-item, .action-card');

            // Logout button
            if (e.target.closest('.logout-btn')) {
                e.preventDefault();
                e.stopPropagation();
                this.logout();
                return;
            }

            // Add order buttons (action card and floating button) - be more specific
            if (e.target.closest('#add-order-btn') ||
                (e.target.closest('.action-card') && e.target.closest('[data-action="add-order"]'))) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Add order button clicked');
                this.openOrderModal();
                return;
            }

            // Manage shops button - DISABLED
            if (e.target.closest('.action-card') && e.target.closest('[data-action="manage-shops"]')) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Manage shops button clicked - feature disabled');
                this.showToast('Shop creation is no longer available. You can only work with shops that add you to their team.', 'info');
                return;
            }

            // Add shop button in settings - DISABLED
            if (e.target.closest('.add-shop-btn') || e.target.closest('.empty-action')) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Add shop button clicked - feature disabled');
                this.showToast('Shop creation is no longer available. Contact a shop owner to join their team.', 'info');
                return;
            }

            // Filter buttons
            if (e.target.closest('.filter-btn')) {
                e.preventDefault();
                e.stopPropagation();
                const filter = e.target.closest('.filter-btn').dataset.filter;
                this.setFilter(filter);
                return;
            }
        });

        // Form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.matches('#settings-form')) {
                e.preventDefault();
                this.saveSettings();
            }
        });

        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    navigateToPage(page) {
        console.log(`Navigating to ${page}`);

        // Clear notification time updates when leaving notifications page
        if (this.currentPage === 'notifications' && page !== 'notifications' && this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
            this.timeUpdateInterval = null;
            console.log('Stopped notification time updates');
        }

        // Update navigation active state with modern styling
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.getAttribute('data-page') === page) {
                item.classList.add('active');
                // Apply modern active styling
                item.style.cssText += `
                    background: linear-gradient(135deg, rgba(255, 107, 53, 0.12), rgba(255, 139, 101, 0.08)) !important;
                    color: #ff6b35 !important;
                    transform: translateY(-2px) !important;
                    box-shadow: 0 6px 20px rgba(255, 107, 53, 0.2), 0 0 0 1px rgba(255, 107, 53, 0.1) inset !important;
                `;
                const icon = item.querySelector('i');
                if (icon) {
                    icon.style.cssText += `
                        transform: scale(1.1) !important;
                        filter: drop-shadow(0 2px 6px rgba(255, 107, 53, 0.3)) !important;
                    `;
                }
            } else {
                item.classList.remove('active');
                // Reset to inactive styling
                item.style.cssText += `
                    background: transparent !important;
                    color: #6b7280 !important;
                    transform: none !important;
                    box-shadow: none !important;
                `;
                const icon = item.querySelector('i');
                if (icon) {
                    icon.style.cssText += `
                        transform: none !important;
                        filter: none !important;
                    `;
                }
            }
        });

        // Hide all pages
        document.querySelectorAll('.page').forEach(pageEl => {
            pageEl.classList.remove('active');
        });

        // Show the selected page
        const pageElement = document.getElementById(`${page}-page`);
        if (pageElement) {
            pageElement.classList.add('active');
        }

        // Update current page
        this.currentPage = page;

        // Floating button removed - no longer needed

        // Handle specific page actions
        switch (page) {
            case 'home':
                this.updateRecentActivity();
                break;
            case 'orders':
                this.renderOrders();
                break;
            case 'notifications':
                this.loadNotifications();
                // Setup the notifications menu when navigating to notifications page
                setTimeout(() => {
                    this.setupNotificationsMenu();
                }, 100);
                break;
            case 'recent':
                this.loadRecentOrdersPage();
                break;
            case 'profile':
                this.loadProfileData();
                break;
            case 'driver-announcements':
                this.loadDriverAnnouncementsPage();
                break;
            case 'driver-analytics':
                this.renderDriverAnalyticsPage();
                break;
        }
    }

    updateFloatingButton(page) {
        // Floating button removed - no longer needed
    }

    async loadUserData() {
        try {
            console.log('Loading user data for user ID:', this.userId);

            // Create headers with authentication
            const headers = {
                'Content-Type': 'application/json'
            };

            // Add authorization header if we have a session token
            if (this.sessionToken) {
                headers['Authorization'] = `Bearer ${this.sessionToken}`;
            }

            console.log('Making authenticated request with headers:', headers);

            // Load shops FIRST so they're available when processing orders
            const shopsResponse = await fetch('/api/user/shops', {
                headers: headers
            });

            if (shopsResponse.ok) {
                const shopsResult = await shopsResponse.json();
                this.shops = shopsResult.shops || [];
                console.log(`✅ Loaded ${this.shops.length} shops for current user`);
            } else {
                const errorText = await shopsResponse.text();
                console.error('Failed to load shops:', errorText);
                // If authentication failed, try to logout and redirect
                if (shopsResponse.status === 401) {
                    console.warn('Authentication failed, logging out...');
                    this.logout();
                    return;
                }
            }

            // Load orders
            const ordersResponse = await fetch('/api/user/orders', {
                headers: headers
            });

            if (ordersResponse.ok) {
                const ordersResult = await ordersResponse.json();
                this.orders = ordersResult.orders || [];
                console.log(`✅ Loaded ${this.orders.length} orders for current user`);



                this.updateStats();
                this.updateRecentActivity();
            } else {
                const errorText = await ordersResponse.text();
                console.error('Failed to load orders:', errorText);
                // If authentication failed, try to logout and redirect
                if (ordersResponse.status === 401) {
                    console.warn('Authentication failed, logging out...');
                    this.logout();
                    return;
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showToast('Failed to load your data. Please refresh the page.', 'error');
        }
    }

    updateStats() {
        // Update Home stats using new driver stats endpoint (lifetime + today)
        (async () => {
            const totalOrdersEl = document.getElementById('total-orders');
            const todayOrdersEl = document.getElementById('today-orders');
            const totalEarningsEl = document.getElementById('total-earnings');
            const totalShopsEl = document.getElementById('total-shops');
            try {
                const headers = { 'Content-Type': 'application/json' };
                if (this.sessionToken) headers['Authorization'] = `Bearer ${this.sessionToken}`;

                // 1) Try lifetime stats endpoint
                const r1 = await fetch(`/api/driver/${this.userId}/stats`, { headers });
                if (r1.ok) {
                    const result = await r1.json();
                    if (result && result.success && result.stats) {
                        const s = result.stats;
                        if (todayOrdersEl) todayOrdersEl.textContent = Number(s.today_orders || 0);
                        if (totalOrdersEl) totalOrdersEl.textContent = Number(s.total_orders || 0);
                        if (totalEarningsEl) totalEarningsEl.textContent = `€${Number(s.total_earnings || 0).toFixed(2)}`;
                        if (totalShopsEl) totalShopsEl.textContent = this.shops.length;
                        return;
                    }
                }

                // 2) Fallback to daily analytics for today (if stats route not available)
                const d = new Date();
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const dateStr = `${y}-${m}-${day}`;
                const r2 = await fetch(`/api/driver/${this.userId}/analytics?date=${encodeURIComponent(dateStr)}`, { headers });
                if (r2.ok) {
                    const result = await r2.json();
                    if (result && result.success && result.summary) {
                        const s = result.summary;
                        if (todayOrdersEl) todayOrdersEl.textContent = Number(s.total_orders || 0);
                        if (totalOrdersEl) totalOrdersEl.textContent = Number(s.total_orders || 0);
                        if (totalEarningsEl) totalEarningsEl.textContent = `€${Number(s.total_earnings || 0).toFixed(2)}`;
                        if (totalShopsEl) totalShopsEl.textContent = this.shops.length;
                        return;
                    }
                }
            } catch (e) {
                console.warn('Failed to load driver stats; falling back to local:', e);
            }

            // 3) Final fallback to local personal orders
            const totalEarnings = this.orders.reduce((sum, order) => sum + (parseFloat(order.earnings) || 0), 0);
            const totalOrders = this.orders.length;
            const today = new Date().toDateString();
            const todayOrders = this.orders.filter(order => {
                const orderDate = new Date(order.created_at).toDateString();
                return orderDate === today;
            }).length;
            if (totalEarningsEl) totalEarningsEl.textContent = `€${totalEarnings.toFixed(2)}`;
            if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
            if (todayOrdersEl) todayOrdersEl.textContent = todayOrders;
            if (totalShopsEl) totalShopsEl.textContent = this.shops.length;
        })();
    }

    updateRecentActivity() {
        console.log('Updating recent activity...');
        const activityContainer = document.getElementById('recent-activity');
        if (!activityContainer) return;

        // Gather last interactions from memory/cache so we can show Accepted / Picked Up / Completed
        let pool = [];
        try { if (this.smartMemory?.acceptedOrders?.data) pool = pool.concat(this.smartMemory.acceptedOrders.data); } catch(_){}
        try { if (this._recentOrdersCache?.data) pool = pool.concat(this._recentOrdersCache.data); } catch(_){}
        if ((!pool || pool.length === 0) && this.orders && this.orders.length) pool = this.orders;

        const byId = new Map();
        (pool || []).forEach(o => {
            if (!o || !o.id) return;
            const ts = new Date(o.delivery_time || o.delivered_at || o.updated_at || o.picked_up_at || o.assigned_at || o.created_at).getTime() || 0;
            const prev = byId.get(o.id);
            if (!prev || ts > prev._ts) byId.set(o.id, { ...o, _ts: ts });
        });

        const items = Array.from(byId.values()).sort((a,b)=> (b._ts||0) - (a._ts||0)).slice(0,5);
        if (items.length === 0) {
            activityContainer.innerHTML = `
                <div class="empty-activity">
                    <div class="empty-icon"><i class="fas fa-clock"></i></div>
                    <p>No recent activity</p>
                    <small>Your last accept or complete actions will appear here</small>
                </div>
            `;
            return;
        }

        const labelFor = (o) => o.status === 'delivered' ? 'Completed' : (o.status === 'picked_up' ? 'Picked up' : 'Accepted');
        const iconFor = (o) => o.status === 'delivered' ? 'check-circle' : (o.status === 'picked_up' ? 'shipping-fast' : 'handshake');
        const colorFor = (o) => o.status === 'delivered' ? '#10b981' : (o.status === 'picked_up' ? '#3b82f6' : '#f59e0b');

        const activityHTML = items.map(o => `
            <div class="activity-item">
                <div class="activity-icon" style="background:${colorFor(o)}20; color:${colorFor(o)};">
                    <i class="fas fa-${iconFor(o)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${labelFor(o)}</div>
                    <div class="activity-sub">Order #${o.id} • ${(this.getShopName ? this.getShopName(o) : (o.shop_name || 'Shop'))}</div>
                    <div class="activity-time">${this.formatTimeAgo(o.delivery_time || o.updated_at || o.created_at)}</div>
                </div>
            </div>
        `).join('');

        activityContainer.innerHTML = `
            <div class="activity-header">
                <h4>Recent Activity</h4>
                <span class="activity-count">${items.length}</span>
            </div>
            <div class="activity-list">${activityHTML}</div>
            <div class="activity-footer">
                <button class="view-all-btn" onclick="deliveryApp.navigateToPage('recent')">View All Recent</button>
            </div>
        `;
    }

    updateCurrentDate() {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Europe/Athens'
        };
        const currentDateElement = document.getElementById('current-date');
        if (currentDateElement) {
            currentDateElement.textContent = now.toLocaleDateString('el-GR', options);
        }
    }

    formatTimeAgo(dateString) {
        // Handle invalid or missing date
        if (!dateString) {
            return window.t ? window.t('recently') : 'recently';
        }

        // Use same logic as shop app for consistency
        const notificationDate = new Date(dateString);

        // Check if date is valid
        if (isNaN(notificationDate.getTime())) {
            return window.t ? window.t('recently') : 'recently';
        }

        const now = new Date();
        const diffInSeconds = Math.floor((now - notificationDate) / 1000);
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        // For very recent notifications (less than 30 seconds), show "just now"
        if (diffInSeconds < 30) {
            return window.t ? window.t('justNow') : 'just now';
        }

        // For less than a minute
        if (diffInMinutes < 1) {
            return window.t ? `${diffInSeconds} seconds ago` : `${diffInSeconds} seconds ago`;
        }

        // For less than an hour
        if (diffInMinutes < 60) {
            return window.t ? `${diffInMinutes} ${window.t('minutesAgo')}` : `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
        }

        // For less than a day
        if (diffInHours < 24) {
            return window.t ? `${diffInHours} ${window.t('hoursAgo')}` : `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        }

        // For less than a week
        if (diffInDays < 7) {
            return window.t ? `${diffInDays} ${window.t('daysAgo')}` : `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
        }

        // For older dates, show the actual date
        const locale = window.i18n ? (window.i18n.getCurrentLanguage() === 'gr' ? 'el-GR' : 'en-US') : 'en-US';
        return new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
                timeZone: 'Europe/Athens'
            }).format(notificationDate);
    }

    // Modal methods
    openOrderModal() {
        console.log('Opening category selection modal first...');

        // Check if shops exist first
        if (this.shops.length === 0) {
            this.showToast(`❌ You're not part of any shop teams yet. Contact a shop owner to join their team before creating orders.`, 'error');
            setTimeout(() => {
                this.navigateToPage('settings');
            }, 1500);
            return;
        }

        // Check if categories exist
        if (this.categories.length === 0) {
            this.showToast(`❌ ${window.t ? window.t('noCategoriesAvailable') : 'No categories available. Please contact admin.'}`, 'error');
            return;
        }

        this.createCategorySelectionModal();
    }

    createCategorySelectionModal() {
        console.log('Creating category selection modal...');

        // Remove existing modals
        this.closeModal();

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'category-selection-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            padding: 20px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                width: 100%;
                max-width: 480px;
                max-height: 90vh;
                overflow-y: auto;
                position: relative;
            ">
                <!-- Header -->
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 24px 28px;
                    border-bottom: 1px solid #e5e7eb;
                    background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
                    border-radius: 16px 16px 0 0;
                    position: relative;
                ">
                    <div style="
                        width: 48px;
                        height: 48px;
                        background: linear-gradient(135deg, #ff6b35 0%, #f12711 100%);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 20px;
                        box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
                    ">
                        <i class="fas fa-th-large"></i>
                    </div>
                    <div style="flex: 1;">
                        <h3 style="
                            font-size: 20px;
                            font-weight: 700;
                            color: #1f2937;
                            margin: 0 0 4px 0;
                        ">${window.t ? window.t('selectCategoryTitle') : 'Select Category'}</h3>
                        <p style="
                            font-size: 14px;
                            color: #6b7280;
                            margin: 0;
                        ">${window.t ? window.t('selectCategoryDesc') : 'Choose the category for your order'}</p>
                    </div>
                    <button class="modal-close" type="button" style="
                        position: absolute;
                        top: 20px;
                        right: 20px;
                        width: 32px;
                        height: 32px;
                        background: #f3f4f6;
                        border: none;
                        border-radius: 50%;
                        color: #6b7280;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 16px;
                        font-weight: bold;
                        transition: background-color 0.2s ease;
                        z-index: 1;
                    " onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'"
                       title="Close Modal">
                        ×
                    </button>
                </div>

                <!-- Body -->
                <div style="padding: 24px 28px;">
                    <div class="categories-grid" style="
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                        gap: 16px;
                    ">
                        ${this.categories.filter(cat => cat.is_active).map(category => `
                            <div class="category-option" data-category-id="${category.id}" style="
                                background: white;
                                border: 2px solid #e5e7eb;
                                border-radius: 12px;
                                padding: 20px;
                                cursor: pointer;
                                transition: all 0.3s ease;
                                text-align: center;
                            " onmouseover="this.style.borderColor='${category.color || '#ff6b35'}'; this.style.backgroundColor='${category.color || '#ff6b35'}10';"
                               onmouseout="this.style.borderColor='#e5e7eb'; this.style.backgroundColor='white';"
                               onclick="deliveryApp.selectCategoryForOrder('${category.id}')">
                                <div style="
                                    width: 48px;
                                    height: 48px;
                                    background: ${category.color || '#ff6b35'};
                                    border-radius: 50%;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    color: white;
                                    font-size: 20px;
                                    margin: 0 auto 12px auto;
                                    box-shadow: 0 4px 12px ${category.color || '#ff6b35'}30;
                                ">
                                    <i class="${category.icon || 'fas fa-utensils'}"></i>
                                </div>
                                <h4 style="
                                    font-size: 16px;
                                    font-weight: 600;
                                    color: #1f2937;
                                    margin: 0 0 4px 0;
                                ">${category.name}</h4>
                                <p style="
                                    font-size: 12px;
                                    color: #6b7280;
                                    margin: 0;
                                ">${category.description || 'Click to select'}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        // Add to DOM
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Bind close events
        const closeButton = modal.querySelector('.modal-close');
        closeButton.addEventListener('click', () => {
            this.closeModal();
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    selectCategoryForOrder(categoryId) {
        console.log('Category selected for order:', categoryId);

        // Find the selected category
        const selectedCategory = this.categories.find(cat => cat.id.toString() === categoryId.toString());
        if (!selectedCategory) {
            this.showToast('Category not found', 'error');
            return;
        }

        // Filter shops by the selected category
        const categoryShops = this.shops.filter(shop => shop.category_id && shop.category_id.toString() === categoryId.toString());

        if (categoryShops.length === 0) {
            this.showToast(`No shops available in the "${selectedCategory.name}" category. Please add shops in this category first.`, 'error');
            this.closeModal();
            return;
        }

        // Close category selection modal and open order modal with filtered shops
        this.closeModal();

        // Store selected category for the order modal
        this.selectedCategoryForOrder = selectedCategory;
        this.filteredShopsForOrder = categoryShops;

        // Create order modal with filtered shops
        this.createOrderModal();
    }

    async openShopModal() {
        console.log('Shop creation modal disabled - drivers can no longer create shops');
        this.showToast('Shop creation is no longer available. Contact a shop owner to join their team.', 'info');
    }

    closeModal() {
        console.log('=== CLOSE STANDARD MODAL START ===');

        // Simply remove all modals immediately
        const modals = document.querySelectorAll('[id$="-modal"]:not(#edit-notification-modal):not(#delete-notification-modal):not(#confirm-notification-modal)');
        console.log('Found standard modals to close:', modals.length);

        // Log all modals in DOM for debugging
        const allModals = document.querySelectorAll('[id$="-modal"]');
        console.log('All modals in DOM:', allModals.length);
        Array.from(allModals).forEach(m => console.log('- Modal in DOM:', m.id));

        // Log notification modals specifically
        const notificationModals = document.querySelectorAll('#edit-notification-modal, #delete-notification-modal, #confirm-notification-modal');
        console.log('Notification modals found:', notificationModals.length);
        Array.from(notificationModals).forEach(m => console.log('- Notification modal:', m.id));

        modals.forEach(modal => {
            console.log('Removing standard modal:', modal.id);
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
                console.log('Standard modal removed from DOM:', modal.id);
            } else {
                console.log('Standard modal has no parent, cannot remove:', modal.id);
            }
        });

        // Reset body overflow
        document.body.style.overflow = 'auto';

        console.log('=== CLOSE STANDARD MODAL END ===');
    }

    createConfirmModal() {
        // Create confirm modal for deletions
        console.log('Confirm modal created');
    }

    async handleOrderSubmit() {
        try {
        console.log('Order form submitted');

            // Get form data
        const shopSelect = document.getElementById('order-shop');
        const priceInput = document.getElementById('order-price');
        const earningsInput = document.getElementById('order-earnings');
        const notesInput = document.getElementById('order-notes');
        const addressInput = document.getElementById('order-address');
                // Get the selected payment method from radio buttons
        const selectedPaymentMethod = document.querySelector('input[name="payment-method"]:checked');
        const paymentMethod = selectedPaymentMethod ? selectedPaymentMethod.value : 'cash';
        const isPaid = paymentMethod === 'paid';

        console.log('Selected payment method:', paymentMethod, 'isPaid:', isPaid);

            const formData = {
                shop_id: shopSelect?.value,
                price: isPaid ? '0' : (priceInput?.value || '0'),
                earnings: earningsInput?.value,
                notes: notesInput?.value || '',
                address: addressInput?.value || '',
                payment_method: paymentMethod
            };

            console.log('Form data collected:', formData);

            // Validate required fields
            if (!formData.shop_id) {
            this.showToast('Please select a shop', 'error');
            return;
        }

            // Only validate price if payment method is cash
            if (!isPaid && (!formData.price || formData.price <= 0)) {
            this.showToast('Please enter a valid order price', 'error');
            return;
        }

            if (!formData.earnings || formData.earnings <= 0) {
                this.showToast('Please enter valid earnings', 'error');
            return;
        }

        // Show loading state
            const submitBtn = document.querySelector('#order-form button[type="submit"]');
            const originalBtnHTML = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding Order...';
        submitBtn.disabled = true;
            submitBtn.style.opacity = '0.6';

        try {
            // Create headers with authentication
            const headers = {
                'Content-Type': 'application/json'
            };

            // Add authorization header if we have a session token
            if (this.sessionToken) {
                headers['Authorization'] = `Bearer ${this.sessionToken}`;
            }

                // Submit to API
            const response = await fetch('/api/user/orders', {
                method: 'POST',
                headers: headers,
                    body: JSON.stringify(formData)
            });

                console.log('Response status:', response.status);

            const result = await response.json();
            console.log('Server response:', result);

                if (response.ok && result.success) {
                    // Add to personal order list only if persisted to legacy orders table
                    if (result.persisted) {
                        this.orders.unshift(result.order);

                        // Re-render orders if on orders page
                        if (this.currentPage === 'orders') {
                            this.renderOrders();
                        }

                        // Update stats
                        this.updateUI();
                    }

                // Close modal
                this.closeModal();

                    // Show success message
                    this.showToast(result.message || 'Order added successfully!', 'success');

                    console.log('Order added successfully:', result.order);

                    // If server mirrored into shop_orders, inject into acceptedOrders memory as delivered
                    if (result.shop_order) {
                        try {
                            const shopOrder = { ...result.shop_order, status: 'delivered' };
                            this.addToMemory('acceptedOrders', shopOrder);
                            // If user is on Orders page and History tab, render instantly
                            if (this.currentPage === 'orders' && this.currentOrdersView === 'history') {
                                const contentArea = document.getElementById('orders-content-area');
                                if (contentArea) await this.loadHistoryContent(contentArea);
                            }
                        } catch (e) { console.warn('Could not inject manual order into history memory', e); }
                    }
            } else {
                    console.log('Server error:', result);

                    // Handle authentication errors
                    if (response.status === 401) {
                        this.showToast('Authentication failed. Please log in again.', 'error');
                        this.logout();
                        return;
                    }

                    throw new Error(result.message || 'Failed to add order');
            }
        } finally {
            // Reset button state
            submitBtn.innerHTML = originalBtnHTML;
            submitBtn.style.opacity = '1';
            submitBtn.disabled = false;
            }
        } catch (error) {
            console.error('Error adding order:', error);
            this.showToast(error.message || 'Failed to add order', 'error');
        }
    }

    async handleShopSubmit() {
        try {
        console.log('Shop form submitted');

            // Get form data
            const nameInput = document.getElementById('shop-name');
            const categorySelect = document.getElementById('shop-category');
            const shopName = nameInput?.value?.trim();
            const categoryId = categorySelect?.value;

            console.log('Shop name:', shopName);
            console.log('Category ID:', categoryId);

            if (!shopName) {
                this.showToast('Please enter a shop name', 'error');
                return;
            }

            if (!categoryId) {
                this.showToast('Please select a category', 'error');
                return;
            }

        // Show loading state
            const submitBtn = document.querySelector('#shop-form button[type="submit"]');
            const originalBtnHTML = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding Shop...';
        submitBtn.disabled = true;
            submitBtn.style.opacity = '0.6';

        try {
            // Create headers with authentication
            const headers = {
                'Content-Type': 'application/json'
            };

            // Add authorization header if we have a session token
            if (this.sessionToken) {
                headers['Authorization'] = `Bearer ${this.sessionToken}`;
            }

            const response = await fetch('/api/user/shops', {
                method: 'POST',
                headers: headers,
                    body: JSON.stringify({
                        name: shopName,
                        category_id: parseInt(categoryId)
                    })
            });

            const result = await response.json();

                if (response.ok && result.success) {
                // Add shop to local array
                this.shops.push(result.shop);

                    // Re-render shops
                    this.renderShops();

                // Close modal
                this.closeModal();

                    // Show success message
                    this.showToast(result.message || 'Shop added successfully!', 'success');

                console.log('Shop added successfully:', result.shop);
            } else {
                    // Handle authentication errors
                    if (response.status === 401) {
                        this.showToast('Authentication failed. Please log in again.', 'error');
                        this.logout();
                        return;
                    }

                    throw new Error(result.message || 'Failed to add shop');
            }
        } finally {
            // Reset button state
            submitBtn.innerHTML = originalBtnHTML;
            submitBtn.style.opacity = '1';
            submitBtn.disabled = false;
            }
        } catch (error) {
            console.error('Error adding shop:', error);
            this.showToast(error.message || 'Failed to add shop', 'error');
        }
    }

    showFormError(input, message) {
        // Clear existing errors
        this.clearFormErrors(input);

        // Add error styling
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.1)';

        // Create error message
        const errorElement = document.createElement('div');
        errorElement.className = 'form-error';
        errorElement.style.cssText = `
            color: #ef4444;
            font-size: 12px;
            margin-top: 6px;
            display: flex;
            align-items: center;
            gap: 6px;
            animation: fadeIn 0.3s ease;
        `;
        errorElement.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;

        // Add error after input
        input.parentNode.appendChild(errorElement);

        // Auto-remove error on input
        const removeError = () => {
            this.clearFormErrors(input);
            input.removeEventListener('input', removeError);
        };
        input.addEventListener('input', removeError);
    }

    clearFormErrors(input) {
        // Reset input styling
        input.style.borderColor = '#e5e7eb';
        input.style.boxShadow = 'none';

        // Remove error messages
        const existingErrors = input.parentNode.querySelectorAll('.form-error');
        existingErrors.forEach(error => error.remove());
    }

    async loadSettingsData() {
        try {
            console.log('Loading settings data...');

            // First, fetch settings from the server
            const serverSettings = await this.getUserSettings();
            console.log('Server settings loaded:', serverSettings);

            // Update local settings object with server data
            if (serverSettings && serverSettings.earnings_per_order !== undefined) {
                this.settings = this.settings || {};
                this.settings.earningsPerOrder = parseFloat(serverSettings.earnings_per_order);
                console.log('Updated local settings:', this.settings);
            } else {
                // Set default if no server settings
                this.settings = this.settings || {};
                this.settings.earningsPerOrder = this.settings.earningsPerOrder || 1.50;
                console.log('Using default earnings:', this.settings.earningsPerOrder);
            }

            // Update UI elements if they exist
            const earningsInput = document.getElementById('earnings-per-order');
            if (earningsInput) {
                earningsInput.value = this.settings.earningsPerOrder;
                console.log('Updated earnings input to:', this.settings.earningsPerOrder);
            }

            // Render shops in settings
            this.renderShops();

            // Bind settings form if not already bound
            const settingsForm = document.getElementById('settings-form');
            if (settingsForm && !settingsForm.hasAttribute('data-bound')) {
                settingsForm.setAttribute('data-bound', 'true');
                settingsForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveSettings();
                });
            }
        } catch (error) {
            console.error('Error loading settings data:', error);
            // Set defaults on error
            this.settings = this.settings || {};
            this.settings.earningsPerOrder = this.settings.earningsPerOrder || 1.50;

            const earningsInput = document.getElementById('earnings-per-order');
            if (earningsInput) {
                earningsInput.value = this.settings.earningsPerOrder;
            }
        }
    }

    async saveSettings() {
        const earningsInput = document.getElementById('earnings-per-order');
        if (earningsInput) {
            const newEarnings = parseFloat(earningsInput.value) || 0;

            try {
                // Save to server first
                const response = await fetch('/api/user/settings', {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${this.sessionToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        earnings_per_order: newEarnings
                    })
                });

                if (response.ok) {
                    const savedData = await response.json();
                    console.log('Settings saved successfully:', savedData);

                    // Update local settings with the server response
                    this.settings = this.settings || {};
                    this.settings.earningsPerOrder = savedData.earnings_per_order || newEarnings;
                    localStorage.setItem('deliveryAppSettings', JSON.stringify(this.settings));

                    // Update the UI immediately
                    if (earningsInput) {
                        earningsInput.value = this.settings.earningsPerOrder;
                    }

                    this.showToast('Settings saved successfully!', 'success');
                } else {
                    const errorText = await response.text();
                    console.error('Settings save failed:', response.status, errorText);
                    let errorMsg;
                    try {
                        const error = JSON.parse(errorText);
                        errorMsg = error.message || error.error || 'Failed to save settings';
                    } catch (e) {
                        errorMsg = `Server error: ${response.status}`;
                    }
                    throw new Error(errorMsg);
                }
            } catch (error) {
                console.error('Error saving settings:', error);
                this.showToast('Failed to save settings: ' + error.message, 'error');
            }
        } else {
            console.error('Earnings input not found');
            this.showToast('Error: Could not find earnings input', 'error');
        }
    }

    async loadCategories() {
        try {
            console.log('Loading categories...');

            // Create headers with authentication
            const headers = {
                'Content-Type': 'application/json'
            };

            // Add authorization header if we have a session token
            if (this.sessionToken) {
                headers['Authorization'] = `Bearer ${this.sessionToken}`;
            }

            const response = await fetch('/api/categories', {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.warn('Categories require authentication, user needs to log in again');
                    return;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success) {
                this.categories = result.categories || [];
                console.log('Categories loaded successfully:', this.categories.length);
            } else {
                throw new Error(result.message || 'Failed to load categories');
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            this.categories = [];
            // Don't show toast for categories loading error as it's not critical for app functionality
        }
    }

    loadProfileData() {
        console.log('loadProfileData called, currentUser:', this.currentUser);
        if (!this.currentUser) {
            console.error('No current user data available for profile');
            // Try to load user data first, then render profile
            this.loadUserData().then(() => {
                if (this.currentUser) {
                    this.loadProfileStats();
                }
            });
            return;
        }

        console.log('Loading profile data for user:', this.currentUser);

        // Render the modern profile UI
        this.loadProfileStats();

        // Load additional profile statistics
        this.loadProfileStats();
    }

    loadProfileStats() {
        // For the Profile page, render the modern Instagram-style UI
        // via updateProfileDisplay which builds the new layout.
        try {
            if (!this.currentUser) return;
            this.updateProfileDisplay();
        } catch (e) {
            console.error('Failed to render profile page:', e);
        }
    }

    updateUI() {
        if (!this.currentUser) return;

        // Update profile displays
        const profileElements = document.querySelectorAll('.profile-name');
        profileElements.forEach(el => {
            el.textContent = this.currentUser.name || 'User';
        });

        this.updateStats();
        this.updateRecentActivity();
        this.loadProfileData();
    }

    setFilter(filter) {
        this.currentFilter = filter;
        this.renderOrders();

        // Update filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    }

    async logout() {
        try {
            // Call server logout endpoint if we have a session token
            if (this.sessionToken) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.sessionToken}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.error('Error calling logout endpoint:', error);
        }

        // Clear all session data from localStorage
        this.clearSessionData();

        // Clear session heartbeat interval
        if (this.sessionHeartbeatInterval) {
            clearInterval(this.sessionHeartbeatInterval);
            this.sessionHeartbeatInterval = null;
        }

        // Close WebSocket connection
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.showToast('Logged out successfully', 'success');

        setTimeout(() => {
            window.location.href = '/login';
        }, 1000);
    }

    showToast(message, type = 'success') {
        // Auto-translate toast message if i18n is available
        const translated = (window.i18n && typeof window.i18n.translateText === 'function')
            ? window.i18n.translateText(message)
            : message;
        this.showModernToast(translated, type);
    }

    // Modern toast notification (brief style for all messages)
    showModernToast(message, type = 'success') {
        // Prevent duplicate notifications
        const existingNotification = document.querySelector('.modern-toast-popup');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Determine colors and icons based on type
        let accentColor, iconClass;

        switch (type) {
            case 'success':
                accentColor = '#10b981';
                iconClass = 'fas fa-check-circle';
                break;
            case 'error':
                accentColor = '#ef4444';
                iconClass = 'fas fa-exclamation-circle';
                break;
            case 'warning':
                accentColor = '#f59e0b';
                iconClass = 'fas fa-exclamation-triangle';
                break;
            default: // info
                accentColor = '#3b82f6';
                iconClass = 'fas fa-info-circle';
        }

        const toast = document.createElement('div');
        toast.className = 'modern-toast-popup';
        toast.style.cssText = `
            position: fixed;
            top: 16px;
            right: 16px;
            left: 16px;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.8);
            z-index: 10000;
            max-width: 320px;
            margin: 0 auto;
            transform: translateY(-80px) scale(0.9);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        `;

        toast.innerHTML = `
            <div style="padding: 12px 16px; display: flex; align-items: center; gap: 12px;">
                <div style="width: 32px; height: 32px; background: ${accentColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i class="${iconClass}" style="font-size: 14px; color: white;"></i>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 500; font-size: 13px; color: #1f2937; line-height: 1.3;">
                        ${message}
                    </div>
                </div>
                <button class="toast-close-btn" style="background: none; border: none; color: #9ca3af; font-size: 14px; cursor: pointer; padding: 4px; border-radius: 4px; transition: color 0.2s;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateY(0) scale(1)';
            toast.style.opacity = '1';
        }, 50);

        // Handle close button
        const closeBtn = toast.querySelector('.toast-close-btn');
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.color = '#374151';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.color = '#9ca3af';
        });
        closeBtn.addEventListener('click', () => {
            this.closeModernToast(toast);
        });

        // Auto remove after 3 seconds (brief for status messages)
        setTimeout(() => {
            if (toast.parentNode) {
                this.closeModernToast(toast);
            }
        }, 3000);
    }

    // Helper function to close modern toast with animation
    closeModernToast(toast) {
        toast.style.transform = 'translateY(-80px) scale(0.9)';
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    // createToastContainer removed - using modern notifications only

    async renderOrders() {
        console.log('Rendering orders page with navigation...');

        // Initialize current view if not set
        if (!this.currentOrdersView) {
            this.currentOrdersView = 'active';
        }

        // Try both possible container IDs
        let container = document.getElementById('orders-container');
        if (!container) {
            container = document.getElementById('orders-list');
        }

        if (!container) {
            console.error('Orders container not found!');
            return;
        }

        try {
            // Create the navigation and content structure
            container.innerHTML = `
                <!-- Navigation Tabs -->
                <div style="
                    background: #ffffff;
                    border-radius: 12px;
                    padding: 4px;
                    margin-bottom: 20px;
                    border: 1px solid #e5e7eb;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                    display: flex;
                    gap: 4px;
                ">
                    <button
                        id="active-orders-tab"
                        onclick="deliveryApp.switchOrdersView('active')"
                        style="
                            flex: 1;
                            padding: 12px 16px;
                            border: none;
                            border-radius: 8px;
                            font-size: 14px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            background: ${this.currentOrdersView === 'active' ? '#ff6b35' : 'transparent'};
                            color: ${this.currentOrdersView === 'active' ? 'white' : '#6b7280'};
                        "
                        onmouseover="if('${this.currentOrdersView}' !== 'active') { this.style.background='#f3f4f6'; this.style.color='#374151'; }"
                        onmouseout="if('${this.currentOrdersView}' !== 'active') { this.style.background='transparent'; this.style.color='#6b7280'; }"
                    >
                        <i class="fas fa-clock" style="margin-right: 6px;"></i>
                        ${window.t ? window.t('activeOrders') : 'Active Orders'}
                    </button>
                    <button
                        id="history-tab"
                        onclick="deliveryApp.switchOrdersView('history')"
                        style="
                            flex: 1;
                            padding: 12px 16px;
                            border: none;
                            border-radius: 8px;
                            font-size: 14px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            background: ${this.currentOrdersView === 'history' ? '#ff6b35' : 'transparent'};
                            color: ${this.currentOrdersView === 'history' ? 'white' : '#6b7280'};
                        "
                        onmouseover="if('${this.currentOrdersView}' !== 'history') { this.style.background='#f3f4f6'; this.style.color='#374151'; }"
                        onmouseout="if('${this.currentOrdersView}' !== 'history') { this.style.background='transparent'; this.style.color='#6b7280'; }"
                    >
                        <i class="fas fa-history" style="margin-right: 6px;"></i>
                        ${window.t ? window.t('history') : 'History'}
                    </button>
                </div>

                <!-- Content Area -->
                <div id="orders-content-area">
                    <!-- Content will be loaded here -->
                </div>
            `;

            // Update page header and load content
            this.updateOrdersPageHeader(this.currentOrdersView);
            await this.loadOrdersContent();

        } catch (error) {
            console.error('Error rendering orders page:', error);
            container.innerHTML = `
                <div class="no-orders-minimal">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Failed to load orders</span>
                    <button class="btn-minimal" onclick="deliveryApp.renderOrders()">
                        <i class="fas fa-refresh"></i> Retry
                    </button>
                </div>
            `;
        }
    }

    // Switch between Active Orders and History views
    async switchOrdersView(view) {
        console.log('Switching to view:', view);
        this.currentOrdersView = view;

        // Update page header
        this.updateOrdersPageHeader(view);

        // Update tab styles
        const activeTab = document.getElementById('active-orders-tab');
        const historyTab = document.getElementById('history-tab');

        if (activeTab && historyTab) {
            if (view === 'active') {
                activeTab.style.background = '#ff6b35';
                activeTab.style.color = 'white';
                historyTab.style.background = 'transparent';
                historyTab.style.color = '#6b7280';
            } else {
                historyTab.style.background = '#ff6b35';
                historyTab.style.color = 'white';
                activeTab.style.background = 'transparent';
                activeTab.style.color = '#6b7280';
            }
        }

        // Load content for the selected view
        await this.loadOrdersContent();
    }

    // Update the page header based on current view
    updateOrdersPageHeader(view) {
        const pageHeader = document.querySelector('#orders-page .page-header h2');
        const filtersContainer = document.querySelector('#orders-page .orders-filters');

        if (pageHeader) {
            if (view === 'active') {
                pageHeader.textContent = window.t ? window.t('activeOrders') : 'Active Orders';
            } else {
                pageHeader.textContent = window.t ? window.t('history') : 'History';
            }
        }

        // Hide the filter buttons since we're not using them
        if (filtersContainer) {
            filtersContainer.style.display = 'none';
        }
    }

    // Load content based on current view
    async loadOrdersContent() {
        const contentArea = document.getElementById('orders-content-area');
        if (!contentArea) return;

        try {
            if (this.currentOrdersView === 'active') {
                await this.loadActiveOrdersContent(contentArea);
            } else {
                await this.loadHistoryContent(contentArea);
            }
        } catch (error) {
            console.error('Error loading orders content:', error);
            contentArea.innerHTML = `
                <div class="no-orders-minimal">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Failed to load content</span>
                </div>
            `;
        }
    }

    // Load Active Orders (assigned/picked_up status)
    async loadActiveOrdersContent(container) {
        const acceptedOrders = await this.loadAcceptedOrders();
        let activeOrders = acceptedOrders.filter(order =>
            order && (order.status === 'assigned' || order.status === 'picked_up')
        );

        // Normalize and filter to avoid transient N/A/Unknown cards
        const normalize = (o) => {
            if (!o) return o;
            const n = { ...o };
            if ((n.id == null || n.id === 'N/A') && n.order_id != null) n.id = n.order_id;
            if (!n.shop_name) {
                try {
                    const sid = n.shop_account_id || n.shop_id;
                    const shops = (this.smartMemory?.shops?.data?.length ? this.smartMemory.shops.data : this.shops) || [];
                    const s = shops.find(x => x && (String(x.id) === String(sid)));
                    if (s) n.shop_name = s.name || s.shop_name;
                } catch(_) {}
            }
            return n;
        };
        activeOrders = activeOrders.map(normalize);

        // Smart bug metrics (phone/address can be empty; not bugs)
        const isBug = (o) => {
            if (!o) return true;
            if (!o.id || o.id === 'N/A') return true;
            if (!o.shop_name || o.shop_name === 'Unknown Shop') return true;
            if (!o.created_at || isNaN(new Date(o.created_at))) return true;
            const valid = ['pending','accepted','assigned','picked_up','delivered','cancelled'];
            if (o.status && !valid.includes(o.status)) return true;
            return false;
        };
        const bugCountNow = activeOrders.filter(isBug).length;
        this.metrics = this.metrics || {};
        this.metrics.bugCards = (this.metrics.bugCards || 0) + bugCountNow;
        this.metrics.lastBugAt = Date.now();
        window.__bugCardCount = this.metrics.bugCards;

        // Hide incomplete items from UI; trigger self-heal refresh
        const filtered = activeOrders.filter(o => o && o.id && o.id !== 'N/A');
        const hadInvalids = filtered.length !== activeOrders.length || filtered.some(o => !o.shop_name || o.shop_name === 'Unknown Shop');
        if (hadInvalids) {
            this.scheduleActiveOrdersHeal && this.scheduleActiveOrdersHeal();
        }
        activeOrders = filtered;

        console.log('🔍 Active orders (sanitized):', activeOrders.length, activeOrders.map(o => `${o.id}:${o.status}`));

        if (activeOrders.length === 0) {
            container.innerHTML = `
                <div class="no-orders-minimal">
                    <i class="fas fa-clock"></i>
                    <span>${window.t ? window.t('noActiveOrders') : 'No active orders'}</span>
                    <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">${window.t ? window.t('activeOrdersAppear') : "Orders you're working on will appear here"}</p>
                </div>
            `;
            return;
        }

        // Compute per-day numbering for today's orders (based on created_at)
        const start = new Date(); start.setHours(0,0,0,0);
        const end = new Date(); end.setHours(23,59,59,999);
        const todays = (acceptedOrders || []).filter(o => {
            const t = new Date(o.created_at);
            return !isNaN(t) && t >= start && t <= end;
        }).sort((a,b)=> new Date(a.created_at) - new Date(b.created_at));
        const dayIndexMap = new Map(); todays.forEach((o,i)=> dayIndexMap.set(o.id, i+1));

        const ordersHTML = (activeOrders || [])
            .filter(o => o && o.id && o.created_at)
            .map(o => { try { return this.createAcceptedOrderCard({ ...o, _displayIndex: dayIndexMap.get(o.id) }); } catch (e) { console.warn('Skipping corrupt order', o?.id, e); return ''; } })
            .join('');
        container.innerHTML = ordersHTML;
        this.setupOrderCardClickListeners();

        // Initialize delivery timers for orders with delivery times
        this.initializeDeliveryTimers(activeOrders);
    }

    // Self-heal: refresh accepted orders quickly to fix any incomplete data within 10s
    scheduleActiveOrdersHeal() {
        if (this._activeHealScheduled) return;
        this._activeHealScheduled = true;
        // quick attempt
        setTimeout(async () => {
            try { await this.getFromMemory('acceptedOrders', true); } catch(_) {}
            this.renderOrders();
        }, 2000);
        // final attempt within ~10s
        setTimeout(async () => {
            try { await this.getFromMemory('acceptedOrders', true); } catch(_) {}
            this.renderOrders();
            this._activeHealScheduled = false;
        }, 9000);
    }

    // Load History (delivered status)
    async loadHistoryContent(container) {
        const acceptedOrders = await this.loadAcceptedOrders();
        const cutoff = Date.now() - 24 * 60 * 60 * 1000; // last 24 hours
        const historyOrders = acceptedOrders.filter(order => {
            if (!order || order.status !== 'delivered') return false;
            const ts = new Date(order.delivery_time || order.updated_at || order.created_at).getTime();
            return !isNaN(ts) && ts >= cutoff;
        });

        if (historyOrders.length === 0) {
            container.innerHTML = `
                <div class="no-orders-minimal">
                    <i class="fas fa-history"></i>
                    <span>${window.t ? window.t('noCompletedOrders24h') : 'No completed orders in the last 24 hours'}</span>
                    <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">${window.t ? window.t('completedDeliveriesAppear') : 'Completed deliveries from the last 24 hours will appear here'}</p>
                </div>
            `;
            return;
        }

        // Compute per-day numbering for TODAY'S DELIVERED orders only (by delivery time)
        const start = new Date(); start.setHours(0,0,0,0);
        const end = new Date(); end.setHours(23,59,59,999);
        const todaysDelivered = (acceptedOrders || []).filter(o => {
            if (!o || o.status !== 'delivered') return false;
            const t = new Date(o.delivery_time || o.updated_at || o.created_at);
            return !isNaN(t) && t >= start && t <= end;
        }).sort((a,b)=> new Date(a.delivery_time || a.updated_at || a.created_at) - new Date(b.delivery_time || b.updated_at || b.created_at));
        const dayIndexMap = new Map(); todaysDelivered.forEach((o,i)=> dayIndexMap.set(o.id, i+1));

        // Progressive rendering to avoid blocking the UI and speed up initial paint
        container.innerHTML = '';
        const chunkSize = 10;
        for (let i = 0; i < historyOrders.length; i += chunkSize) {
            const chunk = historyOrders.slice(i, i + chunkSize);
            const html = chunk.map(order => this.createAcceptedOrderCard({ ...order, _displayIndex: dayIndexMap.get(order.id) })).join('');
            container.insertAdjacentHTML('beforeend', html);
            // Yield to the browser to keep UI responsive
            await new Promise(requestAnimationFrame);
        }
        this.setupOrderCardClickListeners();
    }

    // Initialize delivery timers for orders that have delivery times set (optimized)
    initializeDeliveryTimers(orders) {
        if (!orders) return;

        // Clear timer elements cache when initializing new timers
        this.timerElements = new Map();

        // Use requestAnimationFrame for better performance
        requestAnimationFrame(() => {
            const now = new Date();
            orders.forEach(order => {
                if (order.delivery_time && order.status === 'picked_up') {
                    const deliveryTime = new Date(order.delivery_time);

                    // Start timer if in the future; otherwise show Ended immediately
                    if (deliveryTime > now) {
                        console.log(`🔄 Resuming countdown for order ${order.id}`);
                        this.startDeliveryCountdown(order.id, deliveryTime);
                    } else {
                        this.updateCountdownDisplay(order.id, 0, true);
                    }
                }
            });
        });
    }


    // Load accepted orders for this driver (now uses smart memory)
    async loadAcceptedOrders() {
        if (!this.userId) {
            throw new Error('No user ID available');
        }

        // Use smart memory for instant loading
        return await this.getFromMemory('acceptedOrders');
    }

    // Setup click listeners for order cards
    setupOrderCardClickListeners() {
        const orderCards = document.querySelectorAll('.order-card-clickable');
        console.log('🎯 Setting up click listeners for', orderCards.length, 'order cards');

        orderCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking on buttons
                if (e.target.closest('button')) {
                    console.log('🚫 Button clicked, ignoring card click');
                    return;
                }

                const orderId = card.getAttribute('data-order-id');
                console.log('🎯 Order card clicked, ID:', orderId);
                this.openOrderDetailsModal(orderId);
            });
        });
    }

    // Open order details modal
    async openOrderDetailsModal(orderId) {
        console.log('🔍 Opening order details modal for order:', orderId);

        try {
            // First, let's test if modal exists
            const modal = document.getElementById('order-details-modal');
            console.log('Modal element found:', !!modal);

            if (!modal) {
                console.error('❌ Modal element not found!');
                this.showToast('Modal not found', 'error');
                return;
            }

            // Find the order in the current accepted orders
            console.log('📋 Loading accepted orders...');
            const acceptedOrders = await this.loadAcceptedOrders();
            console.log('Found orders:', acceptedOrders.length);

            const order = acceptedOrders.find(o => o.id === parseInt(orderId));
            console.log('Found order:', !!order, order);

            if (!order) {
                console.error('❌ Order not found in accepted orders');


                this.showToast('Order not found', 'error');
                return;
            }

            // Populate modal content
            console.log('📝 Populating modal content...');
            this.populateOrderDetailsModal(order);

            // Show modal with explicit styles for testing
            console.log('🎭 Showing modal...');
            modal.style.display = 'flex';

            // Guard against corrupted orders (missing critical fields)
            if (!order.id || !order.created_at) {
                console.warn('Removing corrupt order from view:', order);
                const card = document.querySelector(`[data-order-id="${orderId}"]`);
                if (card) card.remove();
                this.showToast('This order had invalid data and was removed from the list.', 'warning');
                return;
            }

            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.right = '0';
            modal.style.bottom = '0';
            modal.style.background = 'rgba(0, 0, 0, 0.8)';
            modal.style.zIndex = '99999';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';

            // Force visibility check
            setTimeout(() => {
                const computedStyle = window.getComputedStyle(modal);
                console.log('Modal computed styles:', {
                    display: computedStyle.display,
                    visibility: computedStyle.visibility,
                    opacity: computedStyle.opacity,
                    zIndex: computedStyle.zIndex
                });
            }, 100);

            console.log('✅ Modal should be visible now with explicit styles');

        } catch (error) {
            console.error('❌ Error opening order details:', error);
            this.showToast('Failed to load order details', 'error');
        }
    }

    // Close order details modal
    closeOrderDetailsModal() {
        const modal = document.getElementById('order-details-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300); // Wait for animation
            document.body.style.overflow = 'auto';
        }
    }

    // Populate order details modal content
    populateOrderDetailsModal(order) {
        const title = document.getElementById('order-details-title');
        const content = document.getElementById('order-details-content');

        console.log('Modal elements found:', { title: !!title, content: !!content });
        if (!title || !content) {
            console.error('Modal elements not found!');
            return;
        }

        title.textContent = `Order #${order.id}`;
        console.log('✅ Title set to:', title.textContent);

        // Format timestamps
        const createdAt = new Date(order.created_at);
        const assignedAt = order.assigned_at ? new Date(order.assigned_at) : null;
        const pickedUpAt = order.picked_up_at ? new Date(order.picked_up_at) : null;
        const deliveredAt = order.delivered_at ? new Date(order.delivered_at) : null;

        const formatDateTime = (date) => {
            if (!date) return 'Not set';
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        // Determine status info
        const statusColor = order.status === 'assigned' ? '#f59e0b' :
                          order.status === 'picked_up' ? '#3b82f6' :
                          order.status === 'delivered' ? '#10b981' : '#6b7280';

        const statusText = order.status === 'assigned' ? 'Assigned' :
                         order.status === 'picked_up' ? 'Picked Up' :
                         order.status === 'delivered' ? 'Delivered' : 'Unknown';

        // Normalize payment method display for this modal (infer from amount if missing)
        const inferredMethodForModal = order?.payment_method || ((order?.order_amount === null || order?.order_amount === undefined || parseFloat(order?.order_amount) === 0) ? 'paid' : 'cash');
        const paymentDisplay = this.getPaymentMethodDisplay(inferredMethodForModal);


        content.innerHTML = `
            <div style="padding: 20px;">
                <!-- Status Badge -->
                <div style="text-align: center; margin-bottom: 24px;">
                    <span style="
                        background: ${statusColor};
                        color: white;
                        padding: 8px 16px;
                        border-radius: 20px;
                        font-size: 14px;
                        font-weight: 600;
                        display: inline-block;
                    ">
                        <i class="fas fa-info-circle" style="margin-right: 6px;"></i>
                        ${statusText}
                    </span>
                </div>

                <!-- Order Information -->
                <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 12px 0; color: #374151; font-size: 16px;">Order Information</h4>
                    <div style="display: grid; gap: 12px;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #6b7280;">Order Amount:</span>
                            <span style="font-weight: 600; color: #111827;">${(paymentDisplay === 'Paid' || parseFloat(order.order_amount || 0) === 0) ? '-' : `€${parseFloat(order.order_amount || 0).toFixed(2)}`}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #6b7280;">Your Earnings:</span>
                            <span style="font-weight: 600; color: #10b981;">€${parseFloat(order.driver_earnings || 1.50).toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #6b7280;">Payment Method:</span>
                            <span style="font-weight: 600; color: #111827;">${paymentDisplay || 'Not specified'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #6b7280;">Preparation Time:</span>
                            <span style="font-weight: 600; color: #111827;">${order.preparation_time === 0 ? 'Now' : `${order.preparation_time} min`}</span>
                        </div>
                    </div>
                </div>

                <!-- Customer & Shop Info -->
                <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 12px 0; color: #374151; font-size: 16px;">Contact Information</h4>
                    <div style="display: grid; gap: 12px;">
                        <div>
                            <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">Customer Phone</div>
                            <div style="font-weight: 600; color: #111827;">${order.customer_phone || 'Not provided'}</div>
                        </div>
                        <div>
                            <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">Shop</div>
                            <div style="font-weight: 600; color: #111827;">${order.shop_name || 'Unknown Shop'}</div>
                        </div>
                        <div>
                            <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">Delivery Address</div>
                            <div style="font-weight: 600; color: #111827;">${order.delivery_address || 'Not provided'}</div>
                        </div>
                    </div>
                </div>

                <!-- Timeline -->
                <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 12px 0; color: #374151; font-size: 16px;">Timeline</h4>
                    <div style="display: grid; gap: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #6b7280;">Order Created:</span>
                            <span style="font-weight: 500; color: #111827; font-size: 13px;">${formatDateTime(createdAt)}</span>
                        </div>
                        ${assignedAt ? `
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #6b7280;">Assigned to You:</span>
                                <span style="font-weight: 500; color: #f59e0b; font-size: 13px;">${formatDateTime(assignedAt)}</span>
                            </div>
                        ` : ''}
                        ${pickedUpAt ? `
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #6b7280;">Picked Up:</span>
                                <span style="font-weight: 500; color: #3b82f6; font-size: 13px;">${formatDateTime(pickedUpAt)}</span>
                            </div>
                        ` : ''}
                        ${deliveredAt ? `
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #6b7280;">Delivered:</span>
                                <span style="font-weight: 500; color: #10b981; font-size: 13px;">${formatDateTime(deliveredAt)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Notes -->
                ${order.notes ? `
                    <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                        <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 16px;">Notes</h4>
                        <p style="margin: 0; color: #6b7280; font-style: italic; line-height: 1.5;">"${order.notes}"</p>
                    </div>
                ` : ''}

                <!-- Action Buttons -->
                <div style="display: flex; gap: 12px; margin-top: 24px;">
                    <button
                        onclick="deliveryApp.openMaps('${order.delivery_address}')"
                        style="
                            flex: 1;
                            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                            color: white;
                            border: none;
                            padding: 14px;
                            border-radius: 10px;
                            font-size: 14px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
                        "
                        onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.3)'"
                        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(16, 185, 129, 0.2)'"
                    >
                        <i class="fas fa-map-marked-alt" style="margin-right: 8px;"></i>
                        Open Maps
                    </button>
                    <button
                        onclick="deliveryApp.callPhone('${order.customer_phone}')"
                        style="
                            flex: 1;
                            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                            color: white;
                            border: none;
                            padding: 14px;
                            border-radius: 10px;
                            font-size: 14px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
                        "
                        onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.3)'"
                        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(59, 130, 246, 0.2)'"
                    >
                        <i class="fas fa-phone" style="margin-right: 8px;"></i>
                        Call Customer
                    </button>
                </div>
            </div>
        `;
    }

    // Open Google Maps with address
    openMaps(address) {
        if (!address || address === 'Not provided') {
            this.showToast('No address available', 'error');
            return;
        }

        const encodedAddress = encodeURIComponent(address);
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

        // Open in new tab/window
        window.open(mapsUrl, '_blank');
    }

    // Open phone app to call customer
    callPhone(phoneNumber) {
        if (!phoneNumber || phoneNumber === 'Not provided') {
            this.showToast('No phone number available', 'error');
            return;
        }

        // Clean phone number (remove spaces, dashes, etc.)
        const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');

        // Open phone app
        window.location.href = `tel:${cleanPhone}`;
    }

    // Create accepted order card with Complete/Set Time buttons
    createAcceptedOrderCard(order) {
        const shopName = order.shop_name || 'Unknown Shop';
        const orderDate = new Date(order.created_at);
        const timeAgo = this.formatTimeAgo(order.created_at);
        const orderPrice = parseFloat(order.order_amount || 0).toFixed(2);
        const driverEarnings = parseFloat(order.driver_earnings || 1.50).toFixed(2);
        const paymentDisplay = this.getPaymentMethodDisplay(order.payment_method);

        // Determine status color and text
        const statusColor = order.status === 'assigned' ? '#f59e0b' :
                          order.status === 'picked_up' ? '#3b82f6' :
                          order.status === 'delivered' ? '#10b981' : '#6b7280';

        const statusText = order.status === 'assigned' ? 'Assigned' :
                         order.status === 'picked_up' ? 'Picked Up' :
                         order.status === 'delivered' ? 'Delivered' : 'Unknown';

        // Parse preparation time
        const prepTime = order.preparation_time || 0;
        const prepTimeText = prepTime === 0 ? 'Now' : `${prepTime} min`;
        const prepTimeIcon = prepTime === 0 ? 'bolt' :
                           prepTime <= 5 ? 'clock' :
                           prepTime <= 10 ? 'hourglass-half' : 'pause-circle';
        const prepTimeColor = prepTime === 0 ? '#10b981' :
                            prepTime <= 5 ? '#f59e0b' :
                            prepTime <= 10 ? '#3b82f6' : '#ef4444';

        return `
            <div style="
                margin-bottom: 12px;
                background: #ffffff;
                border-radius: 12px;
                border: 1px solid #e5e7eb;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                transition: all 0.2s ease;
                cursor: pointer;
            "
            data-order-id="${order.id}" class="order-card-clickable"
            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(0, 0, 0, 0.1)'"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 3px rgba(0, 0, 0, 0.05)'">
                <!-- Header -->
                <div class="order-header" style="
                    background: linear-gradient(135deg, ${statusColor}12 0%, ${statusColor}06 100%);
                    padding: 12px 16px;
                    border-bottom: 1px solid #f3f4f6;
                ">
                    <div style="display: flex; align-items: flex-start; justify-content: space-between; width: 100%;">
                        <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                            <div style="
                                width: 32px;
                                height: 32px;
                                background: ${statusColor};
                                border-radius: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                ${order._displayIndex != null ? `<span style="color: white; font-weight: 800; font-size: 13px;">${order._displayIndex}</span>` : `<i class=\"fas fa-shopping-bag\" style=\"color: white; font-size: 14px;\"></i>`}
                            </div>
                            <div>
                                <h3 style="
                                    margin: 0 0 2px 0;
                                    font-size: 16px;
                                    font-weight: 700;
                                    color: #111827;
                                    line-height: 1.2;
                                ">Order #${order.id}</h3>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="
                                        color: #6b7280;
                                        font-size: 12px;
                                    ">${timeAgo}</span>
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; min-width: 80px;">
                            <div style="
                                font-size: 18px;
                                font-weight: 700;
                                color: #111827;
                                line-height: 1;
                                text-align: right;
                            ">€${orderPrice}</div>
                            <span style="
                                background: ${statusColor};
                                color: white;
                                padding: 4px 8px;
                                border-radius: 6px;
                                font-size: 11px;
                                font-weight: 600;
                                display: inline-block;
                            ">${statusText}</span>
                        </div>
                    </div>
                </div>

                <!-- Order Details -->
                <div style="padding: 14px 16px;">
                    <!-- 2x2 Grid Layout -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px 20px; margin-bottom: 14px;">
                        <!-- Phone -->
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="
                                width: 32px;
                                height: 32px;
                                background: #dbeafe;
                                border-radius: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <i class="fas fa-phone" style="color: #3b82f6; font-size: 13px;"></i>
                            </div>
                            <div>
                                <div style="font-weight: 600; color: #111827; font-size: 13px; line-height: 1.2;">${order.customer_phone}</div>
                                <div style="color: #6b7280; font-size: 11px;">Phone</div>
                            </div>
                        </div>

                        <!-- Shop -->
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="
                                width: 32px;
                                height: 32px;
                                background: #fff7ed;
                                border-radius: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <i class="fas fa-store" style="color: #ff6b35; font-size: 13px;"></i>
                            </div>
                            <div>
                                <div style="font-weight: 600; color: #111827; font-size: 13px; line-height: 1.2;">${shopName}</div>
                                <div style="color: #6b7280; font-size: 11px;">Shop</div>
                            </div>
                        </div>

                        <!-- Address -->
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="
                                width: 32px;
                                height: 32px;
                                background: #fef3c7;
                                border-radius: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <i class="fas fa-map-marker-alt" style="color: #f59e0b; font-size: 13px;"></i>
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 600; color: #111827; font-size: 13px; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${order.delivery_address}</div>
                                <div style="color: #6b7280; font-size: 11px;">Address</div>
                            </div>
                        </div>

                        <!-- Preparation Time -->
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="
                                width: 32px;
                                height: 32px;
                                background: ${prepTimeColor}15;
                                border-radius: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <i class="fas fa-${prepTimeIcon}" style="color: ${prepTimeColor}; font-size: 13px;"></i>
                            </div>
                            <div>
                                <div style="font-weight: 600; color: #111827; font-size: 13px; line-height: 1.2;">${prepTimeText}</div>
                                <div style="color: #6b7280; font-size: 11px;">Ready</div>
                            </div>
                        </div>
                    </div>

                    <!-- Notes Section -->
                    <div style="
                        background: #f8fafc;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        padding: 12px;
                        margin-bottom: 14px;
                        text-align: center;
                    ">
                        ${order.notes ? `
                            <p style="margin: 0; color: #374151; font-size: 13px; line-height: 1.4; font-style: italic;">"${order.notes}"</p>
                        ` : `
                            <p style="margin: 0; color: #9ca3af; font-size: 13px;">No Notes</p>
                        `}
                    </div>

                    <!-- Action Buttons -->
                    ${order.status === 'assigned' ? `
                        <div style="display: flex; gap: 8px;">
                            <button
                                onclick="event.stopPropagation(); deliveryApp.completeOrder(${order.id}, event)"
                                style="
                                    flex: 1;
                                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                                    color: white;
                                    border: none;
                                    padding: 12px;
                                    border-radius: 8px;
                                    font-size: 14px;
                                    font-weight: 600;
                                    cursor: pointer;
                                    transition: all 0.2s ease;
                                    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
                                "
                                onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.3)'"
                                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(16, 185, 129, 0.2)'"
                            >
                                <i class="fas fa-check" style="margin-right: 6px;"></i>
                                Complete
                            </button>
                            <button
                                onclick="event.stopPropagation(); deliveryApp.setOrderTime(${order.id}, event)"
                                style="
                                    flex: 1;
                                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                                    color: white;
                                    border: none;
                                    padding: 12px;
                                    border-radius: 8px;
                                    font-size: 14px;
                                    font-weight: 600;
                                    cursor: pointer;
                                    transition: all 0.2s ease;
                                    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
                                "
                                onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.3)'"
                                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(59, 130, 246, 0.2)'"
                            >
                                <i class="fas fa-clock" style="margin-right: 6px;"></i>
                                Set Time
                            </button>
                        </div>
                    ` : `
                        ${order.status === 'picked_up' ? `
                            <div style="background:#dbeafe;border:1px solid #bfdbfe;border-radius:8px;padding:12px;text-align:center;">
                                <i class=\"fas fa-info-circle\" style=\"color:#3b82f6;font-size:16px;margin-right:6px;\"></i>
                                <span style=\"color:#1d4ed8;font-weight:600;font-size:14px;\">Order Picked Up</span>
                            </div>
                            <div style=\"display:flex;gap:8px;margin-top:8px;\">
                                <button onclick=\"event.stopPropagation(); deliveryApp.completeOrder(${order.id}, event)\" style=\"
                                        flex:1;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#fff;border:none;padding:12px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;\">
                                    <i class=\"fas fa-check\" style=\"margin-right:6px;\"></i> Complete
                                </button>
                            </div>
                        ` : `
                            <div style=\"background:#dcfce7;border:1px solid #bbf7d0;border-radius:8px;padding:12px;text-align:center;\">
                                <i class=\"fas fa-check-circle\" style=\"color:#10b981;font-size:16px;margin-right:6px;\"></i>
                                <span style=\"color:#065f46;font-weight:600;font-size:14px;\">Order ${statusText}</span>
                            </div>
                        `}
                    `}
                </div>
            </div>
        `;
    }

    // Complete an order
    async completeOrder(orderId, event) {
        try {
            const button = event?.target;
            const originalText = button?.innerHTML;
            if (button) {
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Completing...';
                button.disabled = true;
            }

            const response = await fetch(`/api/orders/${orderId}/complete`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify({
                    driver_id: this.userId
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Failed to complete order');
            }

            this.showToast('🎉 Order completed successfully!', 'success');

            // Update local memories and cache so UI flips instantly
            if (result.order) {
                try {
                    // Accepted orders memory: mark delivered immediately
                    const mem = this.smartMemory?.acceptedOrders?.data || [];
                    const existing = mem.find(o => o && (String(o.id) === String(orderId)));
                    const targetId = existing?.id ?? orderId;
                    const updated = { ...result.order, status: 'delivered' };
                    this.updateItemInMemory('acceptedOrders', targetId, updated);
                } catch (_) {}

                try {
                    // Recent orders memory: mark delivered too
                    const memR = this.smartMemory?.recentOrders?.data || [];
                    const existingR = memR.find(o => o && (String(o.id) === String(orderId)));
                    const targetIdR = existingR?.id ?? orderId;
                    const updatedR = { ...result.order, status: 'delivered' };
                    this.updateItemInMemory('recentOrders', targetIdR, updatedR);
                } catch (_) {}

                // Update recent orders cache used by Recent page
                this.updateRecentOrdersCache({ ...result.order, status: 'delivered' }, 'completed');
            }

            // Invalidate memory timestamps to allow background refresh later
            if (this.smartMemory) {
                this.smartMemory.acceptedOrders.lastUpdate = 0;
                this.smartMemory.recentOrders.lastUpdate = 0;
            }

            // Refresh the orders list and stats (live)
            this.renderOrders();
            this.updateStats();
            this.updateRecentActivity();

            // Refresh Recent Orders page if currently viewing it
            if (this.currentPage === 'recent') {
                this.loadRecentOrdersPage(false);
            }

        } catch (error) {
            console.error('Error completing order:', error);
            this.showToast(`Failed to complete order: ${error.message}`, 'error');

            // Restore button if still exists
            const button = event?.target;
            if (button) {
                button.innerHTML = '<i class="fas fa-check"></i> Complete';
                button.disabled = false;
            }
        }
    }

    // Set order time - open modal to set delivery time in minutes
    async setOrderTime(orderId, event) {
        console.log('🕒 Opening set time modal for order:', orderId);

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'set-time-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        `;

        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 20px;
                max-width: 400px;
                width: 100%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                overflow: hidden;
            ">
                <!-- Header -->
                <div style="
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    padding: 24px;
                    color: white;
                    text-align: center;
                ">
                    <div style="
                        width: 60px;
                        height: 60px;
                        background: rgba(255, 255, 255, 0.2);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 16px;
                    ">
                        <i class="fas fa-clock" style="font-size: 24px;"></i>
                    </div>
                    <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">Set Delivery Time</h2>
                    <p style="margin: 0; opacity: 0.9; font-size: 16px;">How many minutes until delivery?</p>
                </div>

                <!-- Content -->
                <div style="padding: 32px 24px 24px;">
                    <div style="margin-bottom: 24px;">
                        <label style="
                            display: block;
                            font-size: 14px;
                            font-weight: 600;
                            color: #374151;
                            margin-bottom: 8px;
                        ">Delivery Time (minutes)</label>
                        <input
                            type="number"
                            id="delivery-minutes"
                            min="1"
                            max="120"
                            value="15"
                            style="
                                width: 100%;
                                padding: 16px;
                                border: 2px solid #e5e7eb;
                                border-radius: 12px;
                                font-size: 18px;
                                font-weight: 600;
                                text-align: center;
                                color: #1f2937;
                                background: #f9fafb;
                                transition: all 0.2s ease;
                            "
                            onfocus="this.style.borderColor='#3b82f6'; this.style.background='#ffffff'"
                            onblur="this.style.borderColor='#e5e7eb'; this.style.background='#f9fafb'"
                        >
                        <div style="
                            display: flex;
                            gap: 8px;
                            margin-top: 12px;
                            justify-content: center;
                        ">
                            <button onclick="document.getElementById('delivery-minutes').value = '5'" style="
                                padding: 8px 16px;
                                background: #f3f4f6;
                                border: 1px solid #d1d5db;
                                border-radius: 8px;
                                font-size: 12px;
                                font-weight: 600;
                                color: #374151;
                                cursor: pointer;
                                transition: all 0.2s ease;
                            " onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">5 min</button>
                            <button onclick="document.getElementById('delivery-minutes').value = '10'" style="
                                padding: 8px 16px;
                                background: #f3f4f6;
                                border: 1px solid #d1d5db;
                                border-radius: 8px;
                                font-size: 12px;
                                font-weight: 600;
                                color: #374151;
                                cursor: pointer;
                                transition: all 0.2s ease;
                            " onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">10 min</button>
                            <button onclick="document.getElementById('delivery-minutes').value = '15'" style="
                                padding: 8px 16px;
                                background: #f3f4f6;
                                border: 1px solid #d1d5db;
                                border-radius: 8px;
                                font-size: 12px;
                                font-weight: 600;
                                color: #374151;
                                cursor: pointer;
                                transition: all 0.2s ease;
                            " onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">15 min</button>
                            <button onclick="document.getElementById('delivery-minutes').value = '30'" style="
                                padding: 8px 16px;
                                background: #f3f4f6;
                                border: 1px solid #d1d5db;
                                border-radius: 8px;
                                font-size: 12px;
                                font-weight: 600;
                                color: #374151;
                                cursor: pointer;
                                transition: all 0.2s ease;
                            " onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">30 min</button>
                        </div>
                    </div>

                    <!-- Buttons -->
                    <div style="display: flex; gap: 12px;">
                        <button onclick="deliveryApp.closeSetTimeModal()" style="
                            flex: 1;
                            background: #f3f4f6;
                            color: #374151;
                            border: none;
                            padding: 16px;
                            border-radius: 12px;
                            font-size: 16px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        " onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">
                            Cancel
                        </button>
                        <button onclick="deliveryApp.confirmSetTime(${orderId})" style="
                            flex: 1;
                            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                            color: white;
                            border: none;
                            padding: 16px;
                            border-radius: 12px;
                            font-size: 16px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                        " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 16px rgba(59, 130, 246, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.3)'">
                            Set Timer
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Focus on input
        setTimeout(() => {
            const input = document.getElementById('delivery-minutes');
            if (input) {
                input.focus();
                input.select();
            }
        }, 100);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeSetTimeModal();
            }
        });
    }

    // Close set time modal
    closeSetTimeModal() {
        const modal = document.getElementById('set-time-modal');
        if (modal) {
            modal.remove();
            document.body.style.overflow = 'auto';
        }
    }

    // Confirm set time and start countdown
    async confirmSetTime(orderId) {
        try {
            const minutesInput = document.getElementById('delivery-minutes');
            const minutes = parseInt(minutesInput.value);

            if (!minutes || minutes < 1 || minutes > 120) {
                this.showToast('Please enter a valid time between 1-120 minutes', 'error');
                return;
            }

            console.log(`🕒 Setting ${minutes} minute timer for order ${orderId}`);

            // Close modal
            this.closeSetTimeModal();

            // Calculate delivery time
            const deliveryTime = new Date();
            deliveryTime.setMinutes(deliveryTime.getMinutes() + minutes);

            // Update order with pickup status and delivery time
            const response = await fetch(`/api/orders/${orderId}/pickup`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify({
                    driver_id: this.userId,
                    delivery_time: deliveryTime.toISOString(),
                    delivery_minutes: minutes
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Failed to set delivery time');
            }

            this.showToast(`⏰ ${minutes} minute delivery timer started!`, 'success');

            // Start countdown timer for this order
            this.startDeliveryCountdown(orderId, deliveryTime);

            // Update smart memory so UI flips to picked_up immediately (hides Set Time)
            try {
                const mem = this.smartMemory?.acceptedOrders?.data || [];
                const existing = mem.find(o => o && (o.id === orderId || (o.id && o.id.toString() === orderId.toString())));
                const updated = { ...(existing || { id: orderId }), status: 'picked_up', delivery_time: deliveryTime.toISOString(), delivery_minutes: minutes, picked_up_at: new Date().toISOString() };
                this.updateItemInMemory('acceptedOrders', orderId, updated);
            } catch(_) {}

            // Refresh the orders list to show updated status
            this.renderOrders();

            // Immediately show the countdown timer
            setTimeout(() => {
                this.updateCountdownDisplay(orderId, deliveryTime.getTime() - new Date().getTime());
            }, 200);

        } catch (error) {
            console.error('Error setting delivery time:', error);
            this.showToast(`Failed to set delivery time: ${error.message}`, 'error');
        }
    }

    // Start countdown timer for an order
    startDeliveryCountdown(orderId, deliveryTime) {
        console.log(`⏰ Starting countdown for order ${orderId} until ${deliveryTime}`);

        // Clear any existing timer for this order
        if (this.deliveryTimers && this.deliveryTimers[orderId]) {
            clearInterval(this.deliveryTimers[orderId]);
        }

        // Clear cached timer element for this order
        if (this.timerElements) {
            this.timerElements.delete(orderId);
        }

        // Initialize timers object if not exists
        if (!this.deliveryTimers) {
            this.deliveryTimers = {};
        }

        // Start countdown
        this.deliveryTimers[orderId] = setInterval(async () => {
            const now = new Date();
            const timeLeft = deliveryTime.getTime() - now.getTime();

            if (timeLeft <= 0) {
                // Time's up - do NOT auto-complete; notify and mark ended
                console.log(`⏰ Timer expired for order ${orderId} - notifying driver`);
                clearInterval(this.deliveryTimers[orderId]);
                delete this.deliveryTimers[orderId];

                // Update UI to show Ended
                this.updateCountdownDisplay(orderId, 0, true);

                // Push notification to this driver (server will fan-out to all devices)
                try {
                    await fetch(`/api/orders/${orderId}/timer-expired`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.sessionToken}`
                        },
                        body: JSON.stringify({})
                    });
                } catch (err) {
                    console.warn('Timer-expired notify failed (non-fatal):', err);
                }
            } else {
                // Update countdown display
                this.updateCountdownDisplay(orderId, timeLeft);
            }
        }, 1000); // Update every second
    }

    // Auto complete order when timer expires
    async autoCompleteOrder(orderId) {
        try {
            console.log(`🎯 Auto-completing order ${orderId}`);

            const response = await fetch(`/api/orders/${orderId}/complete`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify({
                    driver_id: this.userId,
                    auto_completed: true
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Failed to auto-complete order');
            }

            this.showToast('🎉 Order automatically completed!', 'success');

            // Invalidate memory to force refresh
            if (this.smartMemory) {
                this.smartMemory.acceptedOrders.lastUpdate = 0;
                this.smartMemory.recentOrders.lastUpdate = 0;
            }

            // Refresh the orders list and stats (live)
            this.renderOrders();
            this.updateStats();
            this.updateRecentActivity();

        } catch (error) {
            console.error('Error auto-completing order:', error);
            this.showToast(`Failed to auto-complete order: ${error.message}`, 'error');
        }
    }

    // Update countdown display in order card (optimized)
    updateCountdownDisplay(orderId, timeLeft, isEnded = false) {
        const minutes = Math.floor(Math.max(0, timeLeft) / (1000 * 60));
        const seconds = Math.floor((Math.max(0, timeLeft) % (1000 * 60)) / 1000);
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Use cached element reference if available
        if (!this.timerElements) {
            this.timerElements = new Map();
        }

        let countdownElement = this.timerElements.get(orderId);

        // If element not cached or doesn't exist in DOM, find/create it
        if (!countdownElement || !document.contains(countdownElement)) {
            const orderCard = document.querySelector(`[data-order-id="${orderId}"]`);
            if (!orderCard) return;

            countdownElement = orderCard.querySelector('.countdown-timer');
            if (!countdownElement) {
                // Create countdown element below the order details
                const orderDetailsArea = orderCard.querySelector('div[style*="padding: 14px 16px"]');
                if (orderDetailsArea) {
                    countdownElement = document.createElement('div');
                    countdownElement.className = 'countdown-timer';
                    countdownElement.style.cssText = `
                        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                        color: white;
                        padding: 8px 12px;
                        border-radius: 8px;
                        font-size: 13px;
                        font-weight: 600;
                        text-align: center;
                        margin: 12px 0 0 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                        box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
                    `;
                    orderDetailsArea.appendChild(countdownElement);
                }
            }

            // Cache the element reference
            if (countdownElement) {
                this.timerElements.set(orderId, countdownElement);
            }
        }

        // Update content efficiently
        if (countdownElement) {
            if (isEnded) {
                const redBg = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                countdownElement.style.background = redBg;
                countdownElement.style.boxShadow = '0 2px 4px rgba(220, 38, 38, 0.2)';
                const newContent = `<i class="fas fa-exclamation-circle" style="font-size: 12px;"></i> Deliver Time: Ended`;
                if (countdownElement.innerHTML !== newContent) countdownElement.innerHTML = newContent;
            } else {
                const blueBg = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                countdownElement.style.background = blueBg;
                countdownElement.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
                const newContent = `<i class=\"fas fa-clock\" style=\"font-size: 12px;\"></i> Delivery in ${timeString}`;
                if (countdownElement.innerHTML !== newContent) countdownElement.innerHTML = newContent;
            }
        }
    }

    renderShops() {
        const shopsContainer = document.getElementById('shops-display-container');
        if (shopsContainer) {
            shopsContainer.innerHTML = this.renderShopsGrid();
        }

        // Legacy support for other containers
        const legacyContainer = document.getElementById('shops-list');
        if (legacyContainer) {
            legacyContainer.innerHTML = this.renderShopsGrid();
        }
    }

    createOrderModal() {
        console.log('Creating order modal...');

        // Get default earnings from settings
        const defaultEarnings = this.settings?.earningsPerOrder || 1.50;

        const modalHTML = `
            <div id="order-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;">
                <div style="background: white; border-radius: 12px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; position: relative;">
                    <!-- Close Button -->
                    <button class="modal-close-x" style="position: absolute; top: 16px; right: 16px; width: 32px; height: 32px; background: #f3f4f6; border: none; border-radius: 50%; color: #6b7280; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; transition: background-color 0.2s ease; z-index: 10;" onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">×</button>

                    <div style="padding: 24px 24px 0; border-bottom: 1px solid #e5e7eb; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; padding-right: 40px;">
                            <h3 style="margin: 0; font-size: 20px; font-weight: 600; color: #1f2937; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-plus-circle" style="color: var(--primary-color);"></i>
                                Add New Order
                            </h3>
                    </div>
                        <p style="margin: 8px 0 16px; color: #6b7280; font-size: 14px;">Record a new delivery order</p>
                </div>

                    <form id="order-form" style="padding: 0 24px 24px;">
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #374151; font-size: 14px;">
                                <i class="fas fa-store" style="color: var(--primary-color); margin-right: 6px;"></i>
                                Restaurant/Shop <span style="color: #ef4444;">*</span>
                            </label>
                            <select id="order-shop" required style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: white;">
                                <option value="">Select a shop...</option>
                                ${(this.filteredShopsForOrder || this.shops).map(shop => `<option value="${shop.id}">${shop.name}</option>`).join('')}
                            </select>
                            ${this.selectedCategoryForOrder ? `
                                <small style="color: #6b7280; font-size: 12px; margin-top: 4px; display: block;">
                                    <i class="fas fa-info-circle" style="color: #ff6b35;"></i>
                                    Showing shops in "${this.selectedCategoryForOrder.name}" category
                                </small>
                            ` : ''}
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #374151; font-size: 14px;">
                                <i class="fas fa-money-bill-wave" style="color: var(--primary-color); margin-right: 6px;"></i>
                                Payment Method <span style="color: #ef4444;">*</span>
                            </label>
                            <div style="display: flex; gap: 12px;">
                                <label style="flex: 1; display: flex; align-items: center; gap: 8px; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; cursor: pointer; background: white;">
                                    <input type="radio" name="payment-method" value="paid" id="payment-paid" checked>
                                    <span style="font-size: 14px;">Paid</span>
                                </label>
                                <label style="flex: 1; display: flex; align-items: center; gap: 8px; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; cursor: pointer; background: white;">
                                    <input type="radio" name="payment-method" value="cash" id="payment-cash">
                                    <span style="font-size: 14px;">Cash</span>
                                </label>
                            </div>
                        </div>

                        <div id="price-container" style="margin-bottom: 16px; display: none;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #374151; font-size: 14px;">
                                <i class="fas fa-dollar-sign" style="color: var(--primary-color); margin-right: 6px;"></i>
                                Order Price <span style="color: #ef4444;">*</span>
                            </label>
                            <input type="number" id="order-price" step="0.01" min="0" placeholder="Enter order price" style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px;">
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #374151; font-size: 14px;">
                                <i class="fas fa-map-marker-alt" style="color: var(--primary-color); margin-right: 6px;"></i>
                                Delivery Address
                            </label>
                            <input type="text" id="order-address" placeholder="Enter delivery address" style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px;">
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #374151; font-size: 14px;">
                                <i class="fas fa-coins" style="color: var(--primary-color); margin-right: 6px;"></i>
                                Your Earnings <span style="color: #ef4444;">*</span>
                            </label>
                            <input type="number" id="order-earnings" step="0.01" min="0" required value="${defaultEarnings}" placeholder="Enter your earnings" style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px;">
                        </div>

                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #374151; font-size: 14px;">
                                <i class="fas fa-sticky-note" style="color: var(--primary-color); margin-right: 6px;"></i>
                                Notes (Optional)
                            </label>
                            <textarea id="order-notes" placeholder="Add any notes about this order..." style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; min-height: 80px; resize: vertical;"></textarea>
                        </div>

                        <div style="display: flex; gap: 12px; justify-content: flex-end;">
                            <button type="button" class="modal-close" style="padding: 10px 20px; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background-color 0.2s ease;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
                                Cancel
                            </button>
                            <button type="submit" style="padding: 10px 20px; background: var(--primary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-plus"></i>
                                Add Order
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.body.style.overflow = 'hidden';

        // Get the modal element
        const modal = document.getElementById('order-modal');

        // Bind events
        this.bindModalEvents(modal);

        // Handle payment method change
        const paidRadio = document.getElementById('payment-paid');
        const cashRadio = document.getElementById('payment-cash');
        const priceContainer = document.getElementById('price-container');
        const priceInput = document.getElementById('order-price');

        if (paidRadio && cashRadio && priceContainer && priceInput) {
            // Initial state - hide price for paid
            priceContainer.style.display = 'none';
            priceInput.required = false;

            // Event listeners for radio buttons
            paidRadio.addEventListener('change', () => {
                if (paidRadio.checked) {
                    priceContainer.style.display = 'none';
                    priceInput.required = false;
                }
            });

            cashRadio.addEventListener('change', () => {
                if (cashRadio.checked) {
                    priceContainer.style.display = 'block';
                    priceInput.required = true;
                }
            });
        }

        // Bind form submission specifically
        const orderForm = document.getElementById('order-form');
        if (orderForm) {
            orderForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Order form submitted via event listener');
                this.handleOrderSubmit();
            });
        }
    }

    createShopModal() {
        console.log('Creating simplified functional shop modal...');

        // Remove existing modals
        this.closeModal();

        // Create modal with inline styles (like the test modal)
        const modal = document.createElement('div');
        modal.id = 'shop-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            padding: 20px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                width: 100%;
                max-width: 480px;
                max-height: 90vh;
                overflow-y: auto;
                position: relative;

            ">
                <!-- Header -->
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 24px 28px;
                    border-bottom: 1px solid #e5e7eb;
                    background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
                    border-radius: 16px 16px 0 0;
                    position: relative;
                ">
                    <div style="
                        width: 48px;
                        height: 48px;
                        background: linear-gradient(135deg, #ff6b35 0%, #f12711 100%);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 20px;
                        box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
                    ">
                        <i class="fas fa-store"></i>
                    </div>
                    <div style="flex: 1;">
                        <h3 style="
                            font-size: 20px;
                            font-weight: 700;
                            color: #1f2937;
                            margin: 0 0 4px 0;
                        ">Add New Shop</h3>
                        <p style="
                            font-size: 14px;
                            color: #6b7280;
                            margin: 0;
                        ">Add a restaurant or shop you deliver for</p>
                    </div>
                    <button class="modal-close" type="button" style="
                        position: absolute;
                        top: 20px;
                        right: 20px;
                        width: 32px;
                        height: 32px;
                        background: #f3f4f6;
                        border: none;
                        border-radius: 50%;
                        color: #6b7280;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 16px;
                        font-weight: bold;
                        transition: background-color 0.2s ease;
                        z-index: 1;
                    " onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'"
                       title="Close Modal">
                        ×
                    </button>
                </div>

                <!-- Body -->
                <div style="padding: 32px 28px;">
                    <form id="shop-form">
                        <!-- Shop Name Input -->
                        <div style="margin-bottom: 24px;">
                            <label style="
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                font-size: 14px;
                                font-weight: 600;
                                color: #1f2937;
                                margin-bottom: 8px;
                            ">
                                <i class="fas fa-tag" style="color: #ff6b35; width: 16px;"></i>
                                <span>Shop Name</span>
                            </label>
                            <input
                                type="text"
                                id="shop-name"
                                name="shop-name"
                                placeholder="e.g., McDonald's, Pizza Hut, KFC, Subway..."
                                required
                                autofocus
                                maxlength="50"
                                autocomplete="off"
                                style="
                                    width: 100%;
                                    padding: 16px 20px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 12px;
                                    font-size: 16px;
                                    background: white;
                                    color: #1f2937;
                                    transition: all 0.3s ease;
                                    box-sizing: border-box;
                                    font-family: inherit;
                                "
                                onfocus="this.style.borderColor='#ff6b35'; this.style.boxShadow='0 0 0 4px rgba(255, 107, 53, 0.1)';"
                                onblur="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none';"
                            >
                            <small style="
                                display: flex;
                                align-items: center;
                                gap: 6px;
                                font-size: 12px;
                                color: #6b7280;
                                margin-top: 8px;
                                opacity: 0.8;
                            ">
                                <i class="fas fa-info-circle" style="color: #ff6b35; font-size: 10px;"></i>
                                Enter the name of the restaurant or shop you deliver for
                            </small>
                        </div>

                        <!-- Category Selection -->
                        <div style="margin-bottom: 24px;">
                            <label style="
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                font-size: 14px;
                                font-weight: 600;
                                color: #1f2937;
                                margin-bottom: 8px;
                            ">
                                <i class="fas fa-th-large" style="color: #ff6b35; width: 16px;"></i>
                                <span>Category *</span>
                            </label>
                            <select
                                id="shop-category"
                                name="shop-category"
                                required
                                style="
                                    width: 100%;
                                    padding: 16px 20px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 12px;
                                    font-size: 16px;
                                    background: white;
                                    color: #1f2937;
                                    transition: all 0.3s ease;
                                    box-sizing: border-box;
                                    font-family: inherit;
                                    cursor: pointer;
                                "
                                onfocus="this.style.borderColor='#ff6b35'; this.style.boxShadow='0 0 0 4px rgba(255, 107, 53, 0.1)';"
                                onblur="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none';"
                            >
                                <option value="">Select a category</option>
                                ${this.categories.filter(cat => cat.is_active).map(category => `
                                    <option value="${category.id}">${category.name}</option>
                                `).join('')}
                            </select>
                            <small style="
                                display: flex;
                                align-items: center;
                                gap: 6px;
                                font-size: 12px;
                                color: #6b7280;
                                margin-top: 8px;
                                opacity: 0.8;
                            ">
                                <i class="fas fa-info-circle" style="color: #ff6b35; font-size: 10px;"></i>
                                Select the category that best describes this shop
                            </small>
                        </div>

                        <!-- Form Actions -->
                        <div style="
                            display: flex;
                            gap: 16px;
                            margin-top: 32px;
                            padding-top: 24px;
                            border-top: 1px solid #e5e7eb;
                        ">
                            <button type="button" class="btn secondary modal-close" style="
                                flex: 1;
                                min-width: 120px;
                                padding: 14px 20px;
                                font-size: 15px;
                                font-weight: 600;
                                border-radius: 12px;
                                background: #f9fafb;
                                color: #6b7280;
                                border: 2px solid #e5e7eb;
                                cursor: pointer;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                gap: 8px;
                            " onmouseover="this.style.background='#e5e7eb'; this.style.color='#1f2937';"
                               onmouseout="this.style.background='#f9fafb'; this.style.color='#6b7280';">
                                <i class="fas fa-times"></i>
                                <span>Cancel</span>
                            </button>
                            <button type="submit" id="shop-submit-btn" style="
                                flex: 1;
                                min-width: 120px;
                                padding: 14px 20px;
                                font-size: 15px;
                                font-weight: 600;
                                border-radius: 12px;
                                background: linear-gradient(135deg, #ff6b35 0%, #f12711 100%);
                                color: white;
                                border: none;
                                cursor: pointer;
                                transition: all 0.3s ease;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                gap: 8px;
                                box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
                            " onmouseover="this.style.boxShadow='0 6px 20px rgba(255, 107, 53, 0.4)';"
                               onmouseout="this.style.boxShadow='0 4px 12px rgba(255, 107, 53, 0.3)';">
                                <i class="fas fa-plus"></i>
                                <span>Add Shop</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Add to DOM immediately
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        console.log('Modal added and shown:', modal);

        // Bind events
        this.bindModalEvents(modal);

        // Focus input
        setTimeout(() => {
            const shopNameInput = modal.querySelector('#shop-name');
            if (shopNameInput) {
                shopNameInput.focus();
                shopNameInput.select();
                console.log('Focused on shop name input');
            }
        }, 100);
    }

    bindModalEvents(modal) {
        console.log('Binding modal events...');

        // Close button events (both × and Cancel buttons)
        const closeButtons = modal.querySelectorAll('.modal-close, .modal-close-x');
        console.log('Found close buttons:', closeButtons.length);

        closeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('Close button clicked');
                e.preventDefault();
                e.stopPropagation();
                this.closeModal();
            });
        });

        // Background click to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                console.log('Background clicked, closing modal');
                this.closeModal();
            }
        });

        // Prevent modal content clicks from closing modal
        const modalContent = modal.querySelector('[style*="background: white"]');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // Form submission for shops
        const shopForm = modal.querySelector('#shop-form');
        if (shopForm) {
            console.log('Binding shop form submission');
            shopForm.addEventListener('submit', (e) => {
                console.log('Shop form submitted');
                e.preventDefault();
                e.stopPropagation();
                this.handleShopSubmit();
            });
        }

        // Focus first input
        setTimeout(() => {
            const firstInput = modal.querySelector('input:not([type="hidden"]), select, textarea');
            if (firstInput) {
                firstInput.focus();
                console.log('Focused on first input');
            }
        }, 100);
    }

    getTimeAgo(date) {
        // Simple, reliable Greek time display
        const notificationDate = new Date(date);
        const now = new Date();
        const diffInSeconds = Math.floor((now - notificationDate) / 1000);

        // For very recent notifications (less than 30 seconds), show "Τώρα"
        if (diffInSeconds < 30) {
            return 'Τώρα';
        }

        // Always show Greek time
        return new Intl.DateTimeFormat('el-GR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Athens'
        }).format(notificationDate);
    }

    async editShop(shopId) {
        try {
            console.log('Editing shop with ID:', shopId);
            const shop = this.shops.find(s => s.id === shopId || s.id.toString() === shopId.toString());
            if (!shop) {
                this.showToast('Shop not found', 'error');
                console.error('Shop not found with ID:', shopId);
                return;
            }

            // Ensure categories are loaded before creating the edit modal
            if (!this.categories || this.categories.length === 0) {
                console.log('Categories not loaded for edit, loading now...');
                await this.loadCategories();
            }

            console.log('Categories available for edit:', this.categories?.length || 0);
            console.log('Shop category ID:', shop.category_id);

            // Double check that categories are loaded
            if (!this.categories || this.categories.length === 0) {
                this.showToast('Categories not available. Please try again.', 'error');
                return;
            }

        // Remove existing modal if any
        const existingEditModal = document.getElementById('edit-shop-modal');
        if (existingEditModal) {
            existingEditModal.remove();
        }

        // Create modal with direct HTML insertion - simplest approach
        const modalHTML = `
        <div id="edit-shop-modal" style="
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background: rgba(0, 0, 0, 0.7) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 999999 !important;
            padding: 20px !important;
        ">
            <div style="
                background: white !important;
                border-radius: 16px !important;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
                width: 100% !important;
                max-width: 500px !important;
                position: relative !important;
                overflow: hidden !important;
                margin: 0 auto !important;
            ">
                <!-- Header -->
                <div style="
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    padding: 24px;
                    text-align: center;
                    color: white;
                ">
                    <div style="
                        width: 48px;
                        height: 48px;
                        background: rgba(255, 255, 255, 0.2);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 12px auto;
                        backdrop-filter: blur(10px);
                    ">
                        <i class="fas fa-store" style="font-size: 20px;"></i>
                    </div>
                    <h3 style="
                        margin: 0;
                        font-size: 18px;
                        font-weight: 600;
                    ">Edit Shop</h3>
                </div>

                <!-- Content -->
                <div style="padding: 24px;">
                    <form id="edit-shop-form">
                        <div style="margin-bottom: 20px;">
                            <label for="edit-shop-name" style="
                                display: block;
                                font-size: 14px;
                                font-weight: 500;
                                color: #4b5563;
                                margin-bottom: 8px;
                            ">
                                Shop Name
                            </label>
                            <input
                                type="text"
                                id="edit-shop-name"
                                value="${this.escapeHTML(shop.name)}"
                                placeholder="Enter shop name"
                                required
                                style="
                                    width: 100%;
                                    padding: 12px;
                                    border: 1px solid #d1d5db;
                                    border-radius: 8px;
                                    font-size: 15px;
                                "
                            >
                            <div class="form-error" style="
                                color: #ef4444;
                                font-size: 14px;
                                margin-top: 4px;
                            "></div>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <label for="edit-shop-category" style="
                                display: block;
                                font-size: 14px;
                                font-weight: 500;
                                color: #4b5563;
                                margin-bottom: 8px;
                            ">
                                Category *
                            </label>
                            <select
                                id="edit-shop-category"
                                required
                                style="
                                    width: 100%;
                                    padding: 12px;
                                    border: 1px solid #d1d5db;
                                    border-radius: 8px;
                                    font-size: 15px;
                                    background: white;
                                    cursor: pointer;
                                "
                            >
                                <option value="">Select a category</option>
                                ${this.categories.filter(cat => cat.is_active).map(category => {
                                    const isSelected = parseInt(shop.category_id) === parseInt(category.id);
                                    console.log(`Category ${category.name} (ID: ${category.id}) - Shop Category ID: ${shop.category_id} - Selected: ${isSelected}`);
                                    return `
                                        <option value="${category.id}" ${isSelected ? 'selected' : ''}>
                                        ${category.name}
                                    </option>
                                    `;
                                }).join('')}
                            </select>
                            <div class="category-form-error" style="
                                color: #ef4444;
                                font-size: 14px;
                                margin-top: 4px;
                            "></div>
                        </div>
                    </form>
                </div>

                <!-- Actions -->
                <div style="
                    display: flex;
                    gap: 12px;
                    padding: 0 24px 24px;
                ">
                    <button id="edit-shop-cancel" style="
                        flex: 1;
                        padding: 12px 16px;
                        border: 1px solid #e2e8f0;
                        background: white;
                        color: #64748b;
                        border-radius: 10px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: all 0.2s ease;
                    ">
                        Cancel
                    </button>
                    <button id="edit-shop-save" style="
                        flex: 2;
                        padding: 12px 16px;
                        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                        color: white;
                        border: none;
                        border-radius: 10px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        transition: all 0.2s ease;
                        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                    ">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                </div>
            </div>
        </div>
        `;

        // Insert the modal HTML directly into the body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.body.style.overflow = 'hidden';

        console.log('Edit shop modal added to DOM with ID: edit-shop-modal');

        // Get references to the modal and buttons
        const modal = document.getElementById('edit-shop-modal');
        const cancelBtn = document.getElementById('edit-shop-cancel');
        const saveBtn = document.getElementById('edit-shop-save');

        console.log('Cancel button found:', !!cancelBtn);
        console.log('Save button found:', !!saveBtn);

        // Bind events to the modal buttons
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Cancel button clicked');
                modal.remove();
                document.body.style.overflow = 'auto';
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Save button clicked');

                // Get form data
                const shopName = document.getElementById('edit-shop-name').value.trim();
                const categoryId = document.getElementById('edit-shop-category').value;

                // Validate
                if (!shopName) {
                    const errorDiv = document.querySelector('.form-error');
                    errorDiv.textContent = 'Shop name is required';
                    return;
                }

                if (!categoryId) {
                    const errorDiv = document.querySelector('.category-form-error');
                    errorDiv.textContent = 'Category is required';
                    return;
                }

                // Show loading state
                this.showLoadingOverlay('Updating shop...');

                try {
                    // Create headers with authentication
                    const headers = {
                        'Content-Type': 'application/json'
                    };

                    // Add authorization header if we have a session token
                    if (this.sessionToken) {
                        headers['Authorization'] = `Bearer ${this.sessionToken}`;
                    }

                    const response = await fetch(`/api/partner_shops/${shop.id}`, {
                        method: 'PUT',
                        headers: headers,
                        body: JSON.stringify({
                            name: shopName,
                            category_id: parseInt(categoryId)
                        })
                    });

                    const result = await response.json();

                    if (result.success) {
                        // Update local data
                        const updatedShop = result.shop || { ...shop, name: shopName };
                        this.shops = this.shops.map(s => {
                            if (s.id === shop.id || s.id.toString() === shop.id.toString()) {
                                return updatedShop;
                            }
                            return s;
                        });

                        // Close modal
                        modal.remove();
                        document.body.style.overflow = 'auto';

                        // Show success message
                        this.showToast('Shop updated successfully!', 'success');

                        // Update UI
                        if (document.getElementById('shops-display-container')) {
                            document.getElementById('shops-display-container').innerHTML = this.renderShopsGrid();
                        }
                    } else {
                        // Handle error
                        this.showToast(result.message || 'Failed to update shop', 'error');
                    }
                } catch (error) {
                    console.error('Error updating shop:', error);
                    this.showToast('Network error. Please try again.', 'error');
                } finally {
                    this.hideLoadingOverlay();
                }
            });
        }

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                console.log('Background clicked, closing modal');
                modal.remove();
                document.body.style.overflow = 'auto';
            }
        });

        // Focus on input
        setTimeout(() => {
            const input = document.getElementById('edit-shop-name');
            if (input) {
                input.focus();
                // Position cursor at end of text
                input.selectionStart = input.selectionEnd = input.value.length;
            }

            // Debug modal visibility
            this.debugModalVisibility('edit-shop-modal');
        }, 100);
        } catch (error) {
            console.error('Error in editShop:', error);
            this.showToast('Failed to open edit modal. Please try again.', 'error');
        }
    }

    async deleteShop(shopId) {
        console.log('Deleting shop with ID:', shopId);
        const shop = this.shops.find(s => s.id === shopId || s.id.toString() === shopId.toString());
        if (!shop) {
            this.showToast('Shop not found', 'error');
            console.error('Shop not found with ID:', shopId);
            return;
        }

        // Remove existing modal if any
        const existingDeleteModal = document.getElementById('delete-shop-modal');
        if (existingDeleteModal) {
            existingDeleteModal.remove();
        }

        // Create modal with direct HTML insertion - simplest approach
        const modalHTML = `
        <div id="delete-shop-modal" style="
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background: rgba(0, 0, 0, 0.7) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 999999 !important;
            padding: 20px !important;
        ">
            <div style="
                background: white !important;
                border-radius: 16px !important;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
                width: 100% !important;
                max-width: 500px !important;
                position: relative !important;
                overflow: hidden !important;
                margin: 0 auto !important;
            ">
                <!-- Header -->
                <div style="
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    padding: 24px;
                    text-align: center;
                    color: white;
                ">
                    <div style="
                        width: 48px;
                        height: 48px;
                        background: rgba(255, 255, 255, 0.2);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 12px auto;
                        backdrop-filter: blur(10px);
                    ">
                        <i class="fas fa-trash-alt" style="font-size: 20px;"></i>
                    </div>
                    <h3 style="
                        margin: 0;
                        font-size: 18px;
                        font-weight: 600;
                    ">Delete Shop</h3>
                </div>

                <!-- Content -->
                <div style="padding: 24px; text-align: center;">
                    <div style="
                        text-align: center;
                        padding: 20px 0;
                    ">
                        <div style="
                            font-size: 48px;
                            color: #f59e0b;
                            margin-bottom: 16px;
                        ">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <p style="
                            font-size: 16px;
                            margin-bottom: 8px;
                        ">Are you sure you want to delete <strong>${this.escapeHTML(shop.name)}</strong>?</p>
                        <p style="
                            color: #64748b;
                            font-size: 14px;
                            margin-top: 8px;
                        ">This action cannot be undone. Orders from this shop will still be visible in your history.</p>
                    </div>
                </div>

                <!-- Actions -->
                <div style="
                    display: flex;
                    gap: 12px;
                    padding: 0 24px 24px;
                    justify-content: center;
                ">
                    <button id="delete-shop-cancel" style="
                        flex: 1;
                        padding: 12px 16px;
                        border: 1px solid #e2e8f0;
                        background: white;
                        color: #64748b;
                        border-radius: 10px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: all 0.2s ease;
                    ">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button id="delete-shop-confirm" style="
                        flex: 1;
                        padding: 12px 16px;
                        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                        color: white;
                        border: none;
                        border-radius: 10px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        transition: all 0.2s ease;
                        box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
                    ">
                        <i class="fas fa-trash-alt"></i> Delete Shop
                    </button>
                </div>
            </div>
        </div>
        `;

        // Insert the modal HTML directly into the body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.body.style.overflow = 'hidden';

        console.log('Delete shop modal added to DOM with ID: delete-shop-modal');

        // Get references to the modal and buttons
        const modal = document.getElementById('delete-shop-modal');
        const cancelBtn = document.getElementById('delete-shop-cancel');
        const deleteBtn = document.getElementById('delete-shop-confirm');

        console.log('Cancel button found:', !!cancelBtn);
        console.log('Delete button found:', !!deleteBtn);

        // Bind events to the modal buttons
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Cancel button clicked');
                modal.remove();
                document.body.style.overflow = 'auto';
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Delete button clicked');

                // Show loading state
                this.showLoadingOverlay('Deleting shop...');

                try {
                    // Create headers with authentication
                    const headers = {
                        'Content-Type': 'application/json'
                    };

                    // Add authorization header if we have a session token
                    if (this.sessionToken) {
                        headers['Authorization'] = `Bearer ${this.sessionToken}`;
                    }

                    const response = await fetch(`/api/user/shops/${shop.id}`, {
                        method: 'DELETE',
                        headers: headers
                    });

                    const result = await response.json();

                    if (result.success) {
                        // Update local data
                        this.shops = this.shops.filter(s => s.id !== shop.id && s.id.toString() !== shop.id.toString());

                        // Close modal
                        modal.remove();
                        document.body.style.overflow = 'auto';

                        // Show success message
                        this.showToast('Shop deleted successfully!', 'success');

                        // Update UI
                        if (document.getElementById('shops-display-container')) {
                            document.getElementById('shops-display-container').innerHTML = this.renderShopsGrid();
                        }
                    } else {
                        // Handle error
                        this.showToast(result.message || 'Failed to delete shop', 'error');
                    }
                } catch (error) {
                    console.error('Error deleting shop:', error);
                    this.showToast('Network error. Please try again.', 'error');
                } finally {
                    this.hideLoadingOverlay();
                }
            });
        }

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                console.log('Background clicked, closing delete shop modal');
                modal.remove();
                document.body.style.overflow = 'auto';
            }
        });

        // Debug modal visibility
        setTimeout(() => {
            this.debugModalVisibility('delete-shop-modal');
        }, 100);
    }

    editOrder(orderId) {
        console.log('Editing order with ID:', orderId);
        const order = this.orders.find(o => o.id === orderId || (o.id && o.id.toString() === orderId.toString()));
        if (!order) {
            this.showToast('Order not found', 'error');
            console.error('Order not found with ID:', orderId);
            return;
        }

        // Close any existing modals first
        this.closeModal();

        // Get shop information
        const shopId = order.shop_id || '';
        console.log('Looking for shop with ID:', shopId);

        const shop = this.shops.find(s => {
            if (!s || !s.id) return false;
            if (!shopId) return false;

            const shopIdStr = typeof shopId === 'string' ? shopId : String(shopId);
            const sIdStr = typeof s.id === 'string' ? s.id : String(s.id);

            return s.id === shopId || sIdStr === shopIdStr;
        });

        const shopName = shop ? shop.name : 'Unknown Shop';

        // Create modal with direct HTML insertion - simplest approach
        const modalHTML = `
        <div id="edit-order-modal" style="
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background: rgba(0, 0, 0, 0.7) !important;
            display: flex !important;
            align-items: flex-start !important;
            justify-content: center !important;
            z-index: 999999 !important;
            padding: 20px !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
        ">
            <div style="
                background: white !important;
                border-radius: 16px !important;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
                width: 100% !important;
                max-width: 500px !important;
                position: relative !important;
                margin: 20px auto !important;
                max-height: calc(100vh - 40px) !important;
                display: flex !important;
                flex-direction: column !important;
                overflow: hidden !important;
            ">
                <!-- Header -->
                <div style="
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    padding: 24px;
                    text-align: center;
                    color: white;
                    flex-shrink: 0;
                ">
                    <div style="
                        width: 48px;
                        height: 48px;
                        background: rgba(255, 255, 255, 0.2);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 12px auto;
                        backdrop-filter: blur(10px);
                    ">
                        <i class="fas fa-edit" style="font-size: 20px;"></i>
                    </div>
                    <h3 style="
                        margin: 0;
                        font-size: 18px;
                        font-weight: 600;
                    ">Edit Order</h3>
                </div>

                <!-- Content -->
                <div style="padding: 24px; overflow-y: auto; flex: 1;">
                    <form id="edit-order-form">
                        <div style="margin-bottom: 16px;">
                            <label style="
                                display: block;
                                font-size: 14px;
                                font-weight: 500;
                                color: #4b5563;
                                margin-bottom: 8px;
                            ">
                                <i class="fas fa-store" style="margin-right: 8px;"></i>
                                Restaurant/Shop
                            </label>
                            <select id="edit-order-shop" style="
                                width: 100%;
                                padding: 12px;
                                border: 1px solid #d1d5db;
                                border-radius: 8px;
                                font-size: 15px;
                            ">
                                ${this.shops.map(s => {
                                    const shopIdStr = shopId ? (typeof shopId === 'string' ? shopId : String(shopId)) : '';
                                    const sIdStr = s.id ? (typeof s.id === 'string' ? s.id : String(s.id)) : '';
                                    const isSelected = sIdStr === shopIdStr;
                                    return `<option value="${s.id}" ${isSelected ? 'selected' : ''}>${s.name}</option>`;
                                }).join('')}
                            </select>
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label style="
                                display: block;
                                font-size: 14px;
                                font-weight: 500;
                                color: #4b5563;
                                margin-bottom: 8px;
                            ">
                                <i class="fas fa-map-marker-alt" style="margin-right: 8px;"></i>
                                Delivery Address
                            </label>
                            <textarea
                                id="edit-order-address"
                                placeholder="Enter delivery address"
                                style="
                                    width: 100%;
                                    padding: 12px;
                                    border: 1px solid #d1d5db;
                                    border-radius: 8px;
                                    font-size: 15px;
                                    min-height: 80px;
                                    resize: vertical;
                                "
                            >${order.address || ''}</textarea>
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label style="
                                display: block;
                                font-size: 14px;
                                font-weight: 500;
                                color: #4b5563;
                                margin-bottom: 8px;
                            ">
                                <i class="fas fa-credit-card" style="margin-right: 8px;"></i>
                                Payment Method
                            </label>
                            <select id="edit-order-payment" style="
                                width: 100%;
                                padding: 12px;
                                border: 1px solid #d1d5db;
                                border-radius: 8px;
                                font-size: 15px;
                            " onchange="deliveryApp.handlePaymentMethodChange()">
                                <option value="cash" ${(order.payment_method || 'cash') === 'cash' ? 'selected' : ''}>Cash</option>
                                <option value="paid" ${order.payment_method === 'paid' ? 'selected' : ''}>Paid</option>
                            </select>
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label style="
                                display: block;
                                font-size: 14px;
                                font-weight: 500;
                                color: #4b5563;
                                margin-bottom: 8px;
                            ">
                                <i class="fas fa-dollar-sign" style="margin-right: 8px;"></i>
                                Order Price
                            </label>
                            <input
                                type="number"
                                id="edit-order-price"
                                value="${order.price || ''}"
                                step="0.01"
                                min="0"
                                placeholder="Enter order price"
                                style="
                                    width: 100%;
                                    padding: 12px;
                                    border: 1px solid #d1d5db;
                                    border-radius: 8px;
                                    font-size: 15px;
                                "
                                ${order.payment_method === 'paid' ? 'disabled' : ''}
                            >
                            ${order.payment_method === 'paid' ? `
                                <small style="color: #6b7280; font-size: 12px; margin-top: 4px; display: block;">
                                    <i class="fas fa-info-circle"></i> Price is locked when payment is marked as "Paid"
                                </small>
                            ` : ''}
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label style="
                                display: block;
                                font-size: 14px;
                                font-weight: 500;
                                color: #4b5563;
                                margin-bottom: 8px;
                            ">
                                <i class="fas fa-coins" style="margin-right: 8px;"></i>
                                Your Earnings (Cannot be modified)
                            </label>
                            <input
                                type="number"
                                id="edit-order-earnings"
                                value="${order.earnings || ''}"
                                disabled
                                style="
                                    width: 100%;
                                    padding: 12px;
                                    border: 1px solid #d1d5db;
                                    border-radius: 8px;
                                    font-size: 15px;
                                    background-color: #f3f4f6;
                                    cursor: not-allowed;
                                "
                            >
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label style="
                                display: block;
                                font-size: 14px;
                                font-weight: 500;
                                color: #4b5563;
                                margin-bottom: 8px;
                            ">
                                <i class="fas fa-sticky-note" style="margin-right: 8px;"></i>
                                Notes
                            </label>
                            <textarea
                                id="edit-order-notes"
                                placeholder="Enter notes about this order"
                                style="
                                    width: 100%;
                                    padding: 12px;
                                    border: 1px solid #d1d5db;
                                    border-radius: 8px;
                                    font-size: 15px;
                                    min-height: 100px;
                                    resize: vertical;
                                "
                            >${order.notes || ''}</textarea>
                        </div>
                    </form>
                </div>

                <!-- Actions -->
                <div style="
                    display: flex;
                    gap: 12px;
                    padding: 0 24px 24px;
                    flex-shrink: 0;
                    border-top: 1px solid #e5e7eb;
                    background: white;
                ">
                    <button id="edit-order-cancel" style="
                        flex: 1;
                        padding: 12px 16px;
                        border: 1px solid #e2e8f0;
                        background: white;
                        color: #64748b;
                        border-radius: 10px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: all 0.2s ease;
                    ">
                        Cancel
                    </button>
                    <button id="edit-order-save" style="
                        flex: 2;
                        padding: 12px 16px;
                        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                        color: white;
                        border: none;
                        border-radius: 10px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        transition: all 0.2s ease;
                        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                    ">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                </div>
            </div>
        </div>
        `;

        // Create a modal element and append it to the body
        const modalElement = document.createElement('div');
        modalElement.innerHTML = modalHTML;
        document.body.appendChild(modalElement.firstElementChild);
        document.body.style.overflow = 'hidden';

        console.log('Edit order modal added to DOM with ID: edit-order-modal');

        // Get references to the modal and buttons
        const modal = document.getElementById('edit-order-modal');
        const cancelBtn = document.getElementById('edit-order-cancel');
        const saveBtn = document.getElementById('edit-order-save');

        console.log('Modal found:', !!modal);
        console.log('Cancel button found:', !!cancelBtn);
        console.log('Save button found:', !!saveBtn);

        // Bind events to the modal buttons
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Cancel button clicked');
                this.closeModal();
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Save button clicked');

                // Get form data
                const shopId = document.getElementById('edit-order-shop').value;
                const price = document.getElementById('edit-order-price').value;
                const notes = document.getElementById('edit-order-notes').value;
                const address = document.getElementById('edit-order-address').value;
                const paymentMethod = document.getElementById('edit-order-payment').value;

                // Validate
                if (!shopId) {
                    this.showToast('Please select a shop', 'error');
                    return;
                }

                // For paid orders, allow 0 price, for cash orders require valid price > 0
                if (paymentMethod === 'paid') {
                if (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
                        this.showToast('Please enter a valid price (0 or higher for paid orders)', 'error');
                    return;
                    }
                } else {
                    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
                        this.showToast('Please enter a valid price greater than 0', 'error');
                        return;
                    }
                }

                // Show loading state
                this.showLoadingOverlay('Updating order...');

                try {
                    // Create headers with authentication
                    const headers = {
                        'Content-Type': 'application/json'
                    };

                    // Add authorization header if we have a session token
                    if (this.sessionToken) {
                        headers['Authorization'] = `Bearer ${this.sessionToken}`;
                    }

                    const response = await fetch(`/api/user/orders/${order.id}`, {
                        method: 'PUT',
                        headers: headers,
                        body: JSON.stringify({
                            shop_id: shopId,
                            price: parseFloat(price),
                            notes: notes,
                            address: address,
                            payment_method: paymentMethod,
                            // Keep original earnings
                            earnings: parseFloat(order.earnings || 0)
                        })
                    });

                    const result = await response.json();

                    if (result.success) {
                        // Update local data
                        const updatedOrder = result.order || {
                            ...order,
                            shop_id: shopId,
                            price: parseFloat(price),
                            notes: notes,
                            address: address,
                            payment_method: paymentMethod
                        };

                        this.orders = this.orders.map(o => {
                            if (o.id === order.id || (o.id && order.id && o.id.toString() === order.id.toString())) {
                                return updatedOrder;
                            }
                            return o;
                        });

                        // Close modal
                        this.closeModal();

                        // Show success message
                        this.showToast('Order updated successfully!', 'success');

                        // Update UI
                        this.renderOrders();
                        this.updateStats();
                    } else {
                        // Handle error
                        this.showToast(result.message || 'Failed to update order', 'error');
                    }
                } catch (error) {
                    console.error('Error updating order:', error);
                    this.showToast('Network error. Please try again.', 'error');
                } finally {
                    this.hideLoadingOverlay();
                }
            });
        }

        // Close on background click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    console.log('Background clicked, closing modal');
                    this.closeModal();
                }
            });

            // Debug modal visibility
            setTimeout(() => {
                this.debugModalVisibility('edit-order-modal');
            }, 100);
        }
    }

    async deleteOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) {
            this.showToast('Order not found', 'error');
            return;
        }

        const shop = this.shops.find(s => s.id === order.shop_id);
        const shopName = shop ? shop.name : 'Unknown Shop';

        if (!confirm(`Are you sure you want to delete the order from ${shopName}?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/user/orders/${orderId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                // Remove from local array
                this.orders = this.orders.filter(o => o.id !== orderId);

                this.showToast('Order deleted successfully!', 'success');
                this.updateStats();
                this.renderOrders();
                this.updateRecentActivity();
            } else {
                this.showToast(result.message || 'Failed to delete order', 'error');
            }
        } catch (error) {
            console.error('Error deleting order:', error);
            this.showToast('Network error. Please try again.', 'error');
        }
    }

    openOrderDetails(orderId) {
        console.log('Opening order details for ID:', orderId);

        const order = this.orders.find(o => o.id === orderId);
        if (!order) {
            this.showToast('Order not found', 'error');
            return;
        }

        this.createOrderDetailsModal(order);
    }

    createOrderDetailsModal(order) {
        console.log('Creating minimal order details modal for:', order);

        // Remove existing modals
        this.closeModal();

        // Get shop name
        let shopName = 'Unknown Shop';
        if (order.shop_name) {
            shopName = order.shop_name;
        } else if (order.shop_id) {
            const shop = this.shops.find(s => s.id === parseInt(order.shop_id));
            shopName = shop ? shop.name : `Shop #${order.shop_id}`;
        }

        const orderDate = new Date(order.created_at);
        const formattedDate = orderDate.toLocaleDateString('el-GR', { timeZone: 'Europe/Athens' });
        const formattedTime = orderDate.toLocaleTimeString('el-GR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Athens'
        });

        const orderPrice = parseFloat(order.price || 0).toFixed(2);
        const orderEarnings = parseFloat(order.earnings || this.settings.earningsPerOrder).toFixed(2);

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'order-details-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            padding: 20px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 6px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                width: 100%;
                max-width: 380px;
                position: relative;
            ">
                <!-- Header -->
                <div style="
                    padding: 16px 20px;
                    border-bottom: 1px solid #e5e7eb;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <div>
                        <h3 style="font-size: 16px; font-weight: 600; margin: 0; color: #111827;">Order Details</h3>
                        <p style="font-size: 12px; color: #6b7280; margin: 2px 0 0 0;">${shopName}</p>
                    </div>
                    <button class="modal-close" type="button" style="
                        position: absolute;
                        top: 16px;
                        right: 16px;
                        width: 28px;
                        height: 28px;
                        background: #f3f4f6;
                        border: none;
                        border-radius: 50%;
                        color: #6b7280;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 14px;
                        font-weight: bold;
                        transition: background-color 0.2s ease;
                        z-index: 1;
                    " onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">
                        ×
                    </button>
                </div>

                <!-- Content -->
                <div style="padding: 20px;">
                    <!-- Amounts -->
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 16px;
                        padding: 12px;
                        background: #f9fafb;
                        border-radius: 4px;
                    ">
                        <div style="text-align: center; flex: 1;">
                            <div style="color: #6b7280; font-size: 10px; text-transform: uppercase; margin-bottom: 2px;">Order</div>
                            <div style="color: #111827; font-size: 18px; font-weight: 700;">$${orderPrice}</div>
                        </div>
                        <div style="text-align: center; flex: 1;">
                            <div style="color: #059669; font-size: 10px; text-transform: uppercase; margin-bottom: 2px;">Earned</div>
                            <div style="color: #059669; font-size: 18px; font-weight: 700;">$${orderEarnings}</div>
                        </div>
                    </div>

                    <!-- Date & Time -->
                    <div style="
                        padding: 12px;
                        background: #f9fafb;
                        border-radius: 4px;
                        margin-bottom: 16px;
                        text-align: center;
                    ">
                        <div style="font-size: 13px; color: #374151; margin-bottom: 2px;">${formattedDate} at ${formattedTime}</div>
                        <div style="font-size: 11px; color: #9ca3af;">${this.getTimeAgo(orderDate)}</div>
                    </div>

                    <!-- Address -->
                    ${order.address ? `
                        <div style="
                            padding: 12px;
                            background: #ecfdf5;
                            border-radius: 4px;
                            margin-bottom: 16px;
                        ">
                            <div style="font-size: 11px; color: #065f46; text-transform: uppercase; margin-bottom: 4px;">Delivery Address</div>
                            <div style="color: #047857; font-size: 13px; line-height: 1.4;">${order.address}</div>
                        </div>
                    ` : ''}

                    <!-- Payment Method -->
                    <div style="
                        padding: 12px;
                        background: #f0f9ff;
                        border-radius: 4px;
                        margin-bottom: 16px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    ">
                        <div>
                            <div style="font-size: 11px; color: #075985; text-transform: uppercase; margin-bottom: 4px;">Payment Method</div>
                            <div style="color: #0369a1; font-size: 13px; font-weight: 500; text-transform: capitalize;">
                                ${this.getPaymentMethodDisplay(order?.payment_method || ((order?.order_amount === null || order?.order_amount === undefined || parseFloat(order?.order_amount) === 0) ? 'paid' : 'cash'))}
                            </div>
                        </div>
                        <div style="color: #0369a1; font-size: 18px;">
                            <i class="fas ${this.getPaymentMethodIcon(order?.payment_method || ((order?.order_amount === null || order?.order_amount === undefined || parseFloat(order?.order_amount) === 0) ? 'paid' : 'cash'))}"></i>
                        </div>
                    </div>

                    ${order.notes ? `
                        <div style="
                            padding: 12px;
                            background: #fffbeb;
                            border-radius: 4px;
                            margin-bottom: 16px;
                        ">
                            <div style="font-size: 11px; color: #92400e; text-transform: uppercase; margin-bottom: 4px;">Notes</div>
                            <div style="color: #92400e; font-size: 13px; line-height: 1.4;">${order.notes}</div>
                        </div>
                    ` : ''}

                    <!-- Action Buttons -->
                    <div style="
                        display: flex;
                        gap: 8px;
                    ">
                        <button onclick="deliveryApp.editOrder(${order.id});" style="
                            flex: 1;
                            background: #2563eb;
                            color: white;
                            border: none;
                            padding: 10px 12px;
                            border-radius: 4px;
                            font-weight: 500;
                            cursor: pointer;
                            font-size: 12px;
                            transition: all 0.15s ease;
                        " onmouseover="this.style.background='#1d4ed8'"
                           onmouseout="this.style.background='#2563eb'">
                            <i class="fas fa-edit"></i> Edit
                        </button>


                    </div>
                </div>
            </div>
        `;

        // Add to DOM
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        console.log('Minimal order details modal created');

        // Bind close events
        this.bindModalEvents(modal);
    }

    getShopName(order) {
        // Helper function to get shop name from order
        let shopName = 'Unknown Shop';

        if (order.shop_name) {
            // Direct shop name from order
            shopName = order.shop_name;
        } else if (order.shop_id) {
            // Try to find shop by ID with multiple comparison methods
            const shop = this.shops.find(s => {
                const orderId = parseInt(order.shop_id) || order.shop_id;
                const shopId = parseInt(s.id) || s.id;
                return shopId === orderId || s.id.toString() === order.shop_id.toString();
            });

            if (shop && shop.name) {
                shopName = shop.name;
            } else {
                shopName = `Shop #${order.shop_id}`;
            }
        }

        return shopName;
    }

    getPaymentMethodDisplay(paymentMethod) {
        // Normalize payment method and provide proper display text
        if (!paymentMethod) return 'Cash';

        const method = paymentMethod.toString().toLowerCase().trim();

        console.log('Payment method for display:', method);

        switch (method) {
            case 'paid':
            case 'card':
            case 'credit':
            case 'online':
                return 'Paid';
            case 'cash':
            case 'cod':
            default:
                return 'Cash';
        }
    }

    getPaymentMethodIcon(paymentMethod) {
        // Normalize payment method and provide proper icon
        if (!paymentMethod) return 'fa-money-bill-wave';

        const method = paymentMethod.toString().toLowerCase().trim();

        console.log('Payment method for icon:', method);

        switch (method) {
            case 'paid':
            case 'card':
            case 'credit':
            case 'online':
                return 'fa-credit-card';
            case 'cash':
            case 'cod':
            default:
                return 'fa-money-bill-wave';
        }
    }

    async renderSettingsPage() {
        const settingsPage = document.getElementById('settings-page');
        if (!settingsPage) return;

        // Check browser notification permission status
        const notificationPermission = 'Notification' in window ? Notification.permission : 'denied';

        try {
            // Get user notification settings from database
            let userSettings = await this.getUserSettings();

            const notificationSettings = userSettings?.notification_settings || userSettings?.notificationSettings || {
                soundEnabled: this.isAudioEnabled,
                browserEnabled: notificationPermission === 'granted'
            };

            const settingsHtml = `
                <div class="settings-container">

                <!-- Language Settings Section -->
                <div class="language-settings">
                    <div class="setting-header">
                        <div class="setting-icon">
                            <i class="fas fa-globe"></i>
                        </div>
                        <div class="setting-info">
                            <h3 data-translate="languageSettings">Language Settings</h3>
                            <p data-translate="languageSettingsDesc">Choose your preferred language</p>
                        </div>
                    </div>
                    <div class="language-controls">
                        <div class="language-control">
                            <div class="control-info">
                                <h4 data-translate="currentLanguage">Current Language</h4>
                                <p id="current-language-display">${window.i18n ? window.i18n.getCurrentLanguage() === 'en' ? 'English' : 'Ελληνικά' : 'English'}</p>
                            </div>
                            <div class="control-actions">
                                <div class="language-switch">
                                    <button class="language-btn ${window.i18n && window.i18n.getCurrentLanguage() === 'en' ? 'active' : ''}" id="lang-en">
                                        <i class="fas"></i>
                                        <span data-translate="english">English</span>
                                    </button>
                                    <button class="language-btn ${window.i18n && window.i18n.getCurrentLanguage() === 'gr' ? 'active' : ''}" id="lang-gr">
                                        <i class="fas"></i>
                                        <span data-translate="greek">Greek</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Notification Settings Section -->
                <div class="notification-settings">
                    <div class="setting-header">
                        <div class="setting-icon">
                            <i class="fas fa-bell"></i>
                        </div>
                        <div class="setting-info">
                            <h3 data-translate="notificationSettings">Notification Settings</h3>
                            <p data-translate="notificationSettingsDesc">Configure how you receive notifications from shops</p>
                        </div>
                    </div>
                    <div class="notification-controls">
                        <div class="notification-control">
                            <div class="control-info">
                                <h4 data-translate="soundNotificationsLabel">${window.t ? window.t('soundNotificationsLabel') : 'Sound Notifications'}</h4>
                                <p data-translate="soundNotificationsDesc">${window.t ? window.t('soundNotificationsDesc') : 'Play a sound when receiving new notifications'}</p>
                            </div>
                            <div class="control-actions">
                                    <button class="sound-toggle-btn ${notificationSettings.soundEnabled ? 'enabled' : 'disabled'}" id="sound-toggle">
                                        <i class="fas ${notificationSettings.soundEnabled ? 'fa-volume-up' : 'fa-volume-mute'}"></i>
                                        ${window.t ? window.t(notificationSettings.soundEnabled ? 'enabled' : 'disabled') : (notificationSettings.soundEnabled ? 'Enabled' : 'Disabled')}
                                    </button>
                                    <button class="test-sound-btn" id="test-sound-btn">
                                        <i class="fas fa-play"></i>
                                        ${window.t ? window.t('testSound') : 'Test Sound'}
                                </button>
                            </div>
                        </div>
                        <div class="notification-control">
                            <div class="control-info">
                                <h4 data-translate="browserNotificationsLabel">${window.t ? window.t('browserNotificationsLabel') : 'Browser Notifications'}</h4>
                                <p data-translate="browserNotificationsDesc">${window.t ? window.t('browserNotificationsDesc') : 'Show desktop notifications even when the app is in background'}</p>
                            </div>
                            <div class="control-actions">
                                ${notificationPermission === 'granted'
                                    ? `<button class="permission-button granted"><i class="fas fa-check"></i> ${window.t ? window.t('enabled') : 'Enabled'}</button>`
                                    : notificationPermission === 'denied'
                                        ? `<button class="permission-button" disabled><i class="fas fa-ban"></i> ${window.t ? window.t('blocked') : 'Blocked by Browser'}</button>`
                                        : `<button class="permission-button" id="enable-notifications-btn"><i class="fas fa-bell"></i> ${window.t ? window.t('enable') : 'Enable'}</button>`
                                }
                            </div>
                        </div>
                    </div>
                </div>

                    <!-- Keep existing settings sections unchanged -->
                    ${this.renderExistingSettings()}
                </div>
            `;

            settingsPage.innerHTML = settingsHtml;

            // Setup notification settings listeners
            this.setupNotificationSettingsListeners();

            // Setup language switch listeners
            this.setupLanguageSettingsListeners();

            // Setup shop menu listeners
            this.setupShopMenuListeners();

            // Setup shop search functionality
            const searchInput = document.getElementById('search-shops');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.filterShops(e.target.value);
                });

                // Clear search button
                const clearSearchBtn = document.getElementById('clear-shop-search');
                if (clearSearchBtn) {
                    clearSearchBtn.style.display = 'none'; // Hide initially

                    clearSearchBtn.addEventListener('click', () => {
                        searchInput.value = '';
                        this.filterShops('');
                        clearSearchBtn.style.display = 'none';
                    });

                    // Show/hide clear button based on input
                    searchInput.addEventListener('input', () => {
                        clearSearchBtn.style.display = searchInput.value ? 'flex' : 'none';
                    });
                }
            }
        } catch (error) {
            console.error('Error rendering settings page:', error);
            settingsPage.innerHTML = `
                <div class="settings-container">
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Failed to load settings. Please try again later.</p>
                        <button class="retry-btn" id="retry-settings-btn">Retry</button>
                    </div>
                </div>
            `;

            const retryBtn = document.getElementById('retry-settings-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => this.renderSettingsPage());
            }
        }
    }

    renderExistingSettings() {
        return `
                <!-- Earnings Settings Section -->
                <div class="settings-section">
                    <div class="section-title">
                        <i class="fas fa-coins"></i>
                        <h3>Earnings Settings</h3>
                    </div>
                    <form id="settings-form" class="earnings-form">
                        <div class="form-group">
                            <label for="earnings-per-order">
                                <i class="fas fa-dollar-sign"></i>
                                Default earnings per order
                            </label>
                            <input
                                type="number"
                                id="earnings-per-order"
                                step="0.01"
                                min="0"
                                value="${this.settings?.earningsPerOrder || 1.50}"
                                placeholder="Enter default earnings amount"
                            >
                            <small style="color: var(--text-secondary); font-size: 12px;">
                                This will be pre-filled when adding new orders
                            </small>
                        </div>
                        <button type="submit" class="save-btn">
                            <i class="fas fa-save"></i>
                            Save Settings
                        </button>
                    </form>
                </div>

                <!-- Team Shops Section -->
                <div class="settings-section">
                    <div class="section-title">
                        <i class="fas fa-store"></i>
                        <h3>Team Shops</h3>
                    </div>
                    <div class="shops-management">
                        <div class="shops-header">
                            <div class="shops-info">
                                <h4 style="margin: 0; color: var(--text-primary);">Shops You're Part Of</h4>
                                <span class="shops-count">${this.shops.length}</span>
                            </div>
                            <div class="shops-controls">
                                <div class="search-container">
                                    <input
                                        type="text"
                                        id="search-shops"
                                        class="search-shops"
                                        placeholder="🔍 Search shops..."
                                    >
                                    <button id="clear-shop-search" class="clear-search">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                                <div class="info-message" style="background: #e3f2fd; color: #1976d2; padding: 8px 12px; border-radius: 6px; font-size: 13px; display: flex; align-items: center; gap: 8px;">
                                    <i class="fas fa-info-circle"></i>
                                    <span>Contact shop owners to join their team</span>
                                </div>
                            </div>
                        </div>
                        <div id="shops-display-container">
                            ${this.renderShopsGrid()}
                    </div>
                </div>
            </div>
        `;
    }

    async setupNotificationSettingsListeners() {
        // Sound toggle button
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.addEventListener('click', async () => {
                try {
                    // Update UI immediately for better user experience
                    const isCurrentlyEnabled = soundToggle.classList.contains('enabled');
                    const willBeEnabled = !isCurrentlyEnabled;

                    // Update button appearance for immediate visual feedback
                    if (willBeEnabled) {
                        soundToggle.classList.remove('disabled');
                        soundToggle.classList.add('enabled');
                        soundToggle.innerHTML = '<i class="fas fa-volume-up"></i> Enabled';
                    } else {
                        soundToggle.classList.remove('enabled');
                        soundToggle.classList.add('disabled');
                        soundToggle.innerHTML = '<i class="fas fa-volume-mute"></i> Disabled';
                    }

                    // Update local state
                    this.isAudioEnabled = willBeEnabled;
                    localStorage.setItem('notificationSound', willBeEnabled.toString());

                    // Play test sound if enabling
                    if (willBeEnabled) {
                        await this.playNotificationSound();
                    }

                    // Update user settings in the background
                    this.updateUserSettings({
                        notificationSettings: {
                            soundEnabled: willBeEnabled,
                            browserEnabled: 'Notification' in window ? Notification.permission === 'granted' : false
                        }
                    }).then(() => {
                        this.showToast(
                            willBeEnabled ? 'Sound notifications enabled' : 'Sound notifications disabled',
                            willBeEnabled ? 'success' : 'info'
                        );
                    }).catch(error => {
                        console.error('Error updating sound settings:', error);
                        // Revert UI if update fails
                        if (willBeEnabled) {
                            soundToggle.classList.remove('enabled');
                            soundToggle.classList.add('disabled');
                            soundToggle.innerHTML = '<i class="fas fa-volume-mute"></i> Disabled';
                        } else {
                            soundToggle.classList.remove('disabled');
                            soundToggle.classList.add('enabled');
                            soundToggle.innerHTML = '<i class="fas fa-volume-up"></i> Enabled';
                        }
                        this.isAudioEnabled = isCurrentlyEnabled;
                        localStorage.setItem('notificationSound', isCurrentlyEnabled.toString());
                        this.showToast('Failed to update sound settings', 'error');
                    });
                } catch (error) {
                    console.error('Error toggling sound:', error);
                    this.showToast('Failed to update sound settings', 'error');
                }
            });
        }

        // Test sound button
        const testSoundBtn = document.getElementById('test-sound-btn');
        if (testSoundBtn) {
            testSoundBtn.addEventListener('click', async () => {
                try {
                    // Always try to play the sound, regardless of settings
                    console.log('🎵 Testing notification sound...');

                    // Show immediate feedback
                    const originalText = testSoundBtn.innerHTML;
                    testSoundBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Playing...';
                    testSoundBtn.disabled = true;

                    // Play all test sounds in sequence for better testing
                    await this.playNotificationSound(false);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await this.playConfirmationSound();
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await this.playWarningSound();

                    // Restore button
                    testSoundBtn.innerHTML = originalText;
                    testSoundBtn.disabled = false;

                    this.showToast('🎵 Sound test completed!', 'success');
                } catch (error) {
                    console.error('Error playing test sound:', error);
                    testSoundBtn.innerHTML = '<i class="fas fa-play"></i> Test Sound';
                    testSoundBtn.disabled = false;
                    this.showToast('Sound test failed. Check your audio settings.', 'error');
                }
            });
        }

        // Enable notifications button
        const enableNotificationsBtn = document.getElementById('enable-notifications-btn');
        if (enableNotificationsBtn) {
            enableNotificationsBtn.addEventListener('click', async () => {
                try {
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        // Update button state
                        const buttonHtml = '<button class="permission-button granted"><i class="fas fa-check"></i> Enabled</button>';
                        enableNotificationsBtn.parentNode.innerHTML = buttonHtml;

                        // Update user settings
                        await this.updateUserSettings({
                            notificationSettings: {
                                soundEnabled: this.isAudioEnabled,
                                browserEnabled: true
                            }
                        });

                        this.showToast('Browser notifications enabled', 'success');
                    } else if (permission === 'denied') {
                        // Update button state to show blocked
                        const buttonHtml = '<button class="permission-button" disabled><i class="fas fa-ban"></i> Blocked by Browser</button>';
                        enableNotificationsBtn.parentNode.innerHTML = buttonHtml;

                        this.showToast('Notification permission denied by browser', 'warning');
                    }
                } catch (error) {
                    console.error('Error requesting notification permission:', error);
                    this.showToast('Failed to enable browser notifications', 'error');
                }
            });
        }

        // Bind form submission
        const settingsForm = document.getElementById('settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveSettings();
            });
        }

        // Bind search functionality
        const searchInput = document.getElementById('search-shops');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterShops(e.target.value);
            });
        }
    }

    async getUserSettings() {
        try {
            // Check if we have a valid session token
            if (!this.sessionToken) {
                console.warn('No session token available');
                return this.getDefaultSettings();
            }

            const response = await fetch('/api/user/settings', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch user settings');
            }

            const settings = await response.json();

            // Handle both notificationSettings and notification_settings for backward compatibility
            if (settings.notification_settings && !settings.notificationSettings) {
                settings.notificationSettings = settings.notification_settings;
            }

            // Update local settings state for earnings
            if (settings.earnings_per_order !== undefined) {
                this.settings = this.settings || {};
                this.settings.earningsPerOrder = parseFloat(settings.earnings_per_order);
            }

            return settings;
        } catch (error) {
            console.error('Error fetching user settings:', error);
            return this.getDefaultSettings();
        }
    }

    getDefaultSettings() {
        return {
            earnings_per_order: 1.50,
            notificationSettings: {
                soundEnabled: this.isAudioEnabled,
                browserEnabled: 'Notification' in window ? Notification.permission === 'granted' : false
            }
        };
    }

    async updateUserSettings(updates) {
        try {
            // Check if we have a valid session token
            if (!this.sessionToken) {
                console.warn('No session token available');
                throw new Error('Not authenticated');
            }

            // Don't convert notificationSettings - keep it as camelCase to match database schema
            const apiUpdates = { ...updates };

            const response = await fetch('/api/user/settings', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(apiUpdates)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update user settings');
            }

            const settings = await response.json();

            // Update local state for notification settings
            if (updates.notificationSettings) {
                this.isAudioEnabled = updates.notificationSettings.soundEnabled;
                localStorage.setItem('notificationSound', updates.notificationSettings.soundEnabled.toString());
            }

            // Update local earnings setting if provided
            if (updates.earnings_per_order !== undefined) {
                this.settings = this.settings || {};
                this.settings.earningsPerOrder = parseFloat(updates.earnings_per_order);
            }

            return settings;
        } catch (error) {
            console.error('Error updating user settings:', error);
            throw error;
        }
    }

    renderShopsGrid(filteredShops = null) {
        const shopsToRender = filteredShops || this.shops;

        if (shopsToRender.length === 0) {
            if (filteredShops && this.shops.length > 0) {
                // No search results
                return `
                    <div class="no-results">
                        <div class="no-results-icon">
                            <i class="fas fa-search"></i>
                        </div>
                        <h4>No shops found</h4>
                        <p>Try adjusting your search terms</p>
                    </div>
                `;
            } else {
                // No team shops at all
                return `
                    <div class="empty-shops">
                        <div class="empty-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <h4>Not part of any shop teams yet</h4>
                        <p>Contact shop owners to join their team and start delivering orders</p>
                        <div class="info-box" style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 12px; margin-top: 16px; color: #0369a1;">
                            <i class="fas fa-info-circle" style="margin-right: 8px;"></i>
                            <span style="font-size: 13px;">Shop owners can add you to their team from their settings page</span>
                        </div>
                    </div>
                `;
            }
        }

        const shopsHTML = shopsToRender.map((shop, index) => `
            <div class="shop-card team-shop-card" data-shop-id="${shop.id}" style="
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 12px;
                padding: 24px;
                margin-bottom: 20px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                transition: all 0.2s ease;
                cursor: pointer;
            " onmouseover="this.style.boxShadow='0 4px 12px rgba(0, 0, 0, 0.15)'; this.style.transform='translateY(-1px)'" onmouseout="this.style.boxShadow='0 1px 3px rgba(0, 0, 0, 0.1)'; this.style.transform='translateY(0)'">

                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="flex: 1; display: flex; align-items: center; gap: 16px;">
                        <!-- Shop icon -->
                        <div style="
                            background: #10b981;
                            width: 48px;
                            height: 48px;
                            border-radius: 12px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            flex-shrink: 0;
                        ">
                            <i class="fas fa-store" style="color: white; font-size: 20px;"></i>
                        </div>

                        <!-- Shop info -->
                        <div style="flex: 1; min-width: 0;">
                            <h4 style="
                                margin: 0 0 8px 0;
                                font-size: 18px;
                                font-weight: 600;
                                color: #111827;
                                line-height: 1.3;
                            ">${shop.name}</h4>

                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                <span style="
                                    background: #dcfce7;
                                    color: #166534;
                                    padding: 4px 10px;
                                    border-radius: 16px;
                                    font-size: 12px;
                                    font-weight: 500;
                                    display: inline-flex;
                                    align-items: center;
                                    gap: 4px;
                                ">
                                    <i class="fas fa-users" style="font-size: 10px;"></i>
                                    Team Member
                                </span>
                            </div>

                            <div style="
                                font-size: 14px;
                                color: #6b7280;
                                display: flex;
                                align-items: center;
                                gap: 6px;
                            ">
                                <i class="fas fa-calendar-plus" style="font-size: 12px;"></i>
                                Joined ${shop.created_at ? this.formatTimeAgo(shop.created_at) : 'recently'}
                            </div>
                        </div>
                    </div>

                    <!-- Status -->
                    <div style="
                        background: #dcfce7;
                        color: #166534;
                        font-size: 12px;
                        font-weight: 600;
                        padding: 6px 12px;
                        border-radius: 20px;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        flex-shrink: 0;
                    ">
                        <i class="fas fa-check-circle" style="font-size: 10px;"></i>
                        ACTIVE
                    </div>
                </div>
            </div>
        `).join('');

        return `
            <div class="shops-container">
                <div class="shops-grid">
                    ${shopsHTML}
                </div>
            </div>
        `;
    }

    // Show team shop information (drivers can't edit team shops)
    showShopOptions(shopId, event) {
        console.log('Showing team shop info for shop ID:', shopId);
        event.preventDefault();
        event.stopPropagation();

        // Close any existing modals
        this.closeModal();

        // Find shop data
        const shop = this.shops.find(s => s.id === shopId || s.id.toString() === shopId.toString());
        if (!shop) {
            console.error('Shop not found with ID:', shopId);
            return;
        }

        // Create the info modal
        const modal = document.createElement('div');
        modal.id = 'shop-info-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.right = '0';
        modal.style.bottom = '0';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '1000';

        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; width: 90%; max-width: 360px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);">
                <div style="padding: 20px; border-bottom: 1px solid #e2e8f0; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px;">
                        <i class="fas fa-store" style="font-size: 20px;"></i>
                        <h3 style="margin: 0; font-size: 20px; font-weight: 600;">${this.escapeHTML(shop.name)}</h3>
                    </div>
                    <div style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; display: inline-block;">
                        <i class="fas fa-users" style="margin-right: 4px;"></i>
                        Team Member
                    </div>
                </div>
                <div style="padding: 20px;">
                    <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                        <div style="color: #64748b; font-size: 13px; margin-bottom: 8px;">Team Status</div>
                        <div style="color: #10b981; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-check-circle"></i>
                            Active Team Member
                        </div>
                    </div>
                    <div style="color: #64748b; font-size: 13px; text-align: center; line-height: 1.4;">
                        You're part of this shop's delivery team. Contact the shop owner if you need to make changes to your membership.
                    </div>
                </div>
                <div style="padding: 16px; border-top: 1px solid #e2e8f0; text-align: center;">
                    <button class="close-btn" style="width: 100%; padding: 12px; background: #f1f5f9; border: none; border-radius: 8px; font-weight: 500; color: #64748b; cursor: pointer; transition: background-color 0.2s;">
                        Close
                    </button>
                </div>
            </div>
        `;

        // Add to DOM
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Add event listeners
        const closeBtn = modal.querySelector('.close-btn');

        closeBtn.addEventListener('click', () => {
            this.closeModal();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    // Handle shop menu toggle and actions
    setupShopMenuListeners() {
        console.log('Setting up shop menu listeners');

        // First remove any existing event listeners by cloning and replacing elements
        document.querySelectorAll('.shop-menu-toggle').forEach(toggle => {
            const newToggle = toggle.cloneNode(true);
            toggle.parentNode.replaceChild(newToggle, toggle);
        });

        document.querySelectorAll('.shop-menu-item').forEach(item => {
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
        });

        // Close all menus when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.shop-menu') && !e.target.closest('.shop-menu-toggle')) {
                document.querySelectorAll('.shop-menu.show').forEach(menu => {
                    menu.classList.remove('show');
                });
            }
        });

        // Setup toggle buttons
        document.querySelectorAll('.shop-menu-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const shopId = toggle.getAttribute('data-shop-id');
                console.log('Toggle clicked for shop ID:', shopId);

                const menu = document.getElementById(`shop-menu-${shopId}`);
                if (!menu) {
                    console.error('Menu not found for shop ID:', shopId);
                    return;
                }

                // Close all other menus first
                document.querySelectorAll('.shop-menu.show').forEach(openMenu => {
                    if (openMenu !== menu) {
                        openMenu.classList.remove('show');
                    }
                });

                // Toggle this menu
                menu.classList.toggle('show');
                console.log('Menu visibility toggled:', menu.classList.contains('show'));
            });
        });

        // Setup menu item actions
        document.querySelectorAll('.shop-menu-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const action = item.getAttribute('data-action');
                const shopId = item.getAttribute('data-shop-id');
                console.log('Menu item clicked:', action, 'for shop ID:', shopId);

                if (action === 'edit') {
                    await this.editShop(shopId);
                } else if (action === 'delete') {
                    this.deleteShop(shopId);
                }

                // Close the menu
                const menu = document.getElementById(`shop-menu-${shopId}`);
                if (menu) {
                    menu.classList.remove('show');
                }
            });
        });

        console.log('Shop menu listeners setup complete');
    }

    filterShops(searchTerm) {
        const term = searchTerm.toLowerCase().trim();

        if (!term) {
            // Show all shops
            document.getElementById('shops-display-container').innerHTML = this.renderShopsGrid();
            return;
        }

        const filteredShops = this.shops.filter(shop =>
            shop.name.toLowerCase().includes(term)
        );

        document.getElementById('shops-display-container').innerHTML = this.renderShopsGrid(filteredShops);
    }

    // Floating button functions removed - keeping stubs to prevent errors
    ensureFloatingButton() {
        // Removed - no longer needed
    }

    showFloatingButton() {
        // Removed - no longer needed
    }

    hideFloatingButton() {
        // Removed - no longer needed
    }

    async loadNotifications() {
        try {
            console.log('=== LOAD NOTIFICATIONS START ===');
            console.log('Loading notifications...');

            if (!this.currentUser || !this.currentUser.id) {
                console.error('No user ID available to load notifications');
                return;
            }

            // Use smart memory for instant loading
            const notifications = await this.getFromMemory('notifications');

            // Store notifications in the class instance for compatibility
            this.notifications = notifications;
            console.log('Loaded notifications count:', this.notifications.length);

            this.renderNotifications(this.notifications);

            // Count unread notifications
            const unreadCount = notifications.filter(n => !n.is_read).length;
            this.updateNotificationBadge(unreadCount);
            console.log(`Successfully loaded ${this.notifications.length} notifications (${unreadCount} unread)`);



            // Start real-time updates for notification times
            this.startNotificationTimeUpdates();

            // Update the menu with correct counts after loading notifications
            if (document.getElementById('notifications-page')) {
                console.log('🔄 Refreshing menu after loading notifications...');
                this.updateNotificationsMenuCounts();
            }

            console.log('=== LOAD NOTIFICATIONS END ===');
        } catch (error) {
            console.error('=== LOAD NOTIFICATIONS ERROR ===');
            console.error('Error loading notifications:', error);
            console.error('Error stack:', error.stack);
            this.notifications = []; // Initialize as empty array on error
            this.showToast('Failed to load notifications: ' + error.message, 'error');

            // Show error state
            const container = document.getElementById('notifications-list');
            if (container) {
                container.innerHTML = `
                    <div class="notifications-error">
                        <div class="error-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <h4>Failed to Load Notifications</h4>
                        <p>Unable to connect to the server. Please check your connection and try again.</p>
                        <button class="retry-btn" onclick="deliveryApp.loadNotifications()">
                            <i class="fas fa-redo"></i> Try Again
                        </button>
                    </div>
                `;
            }
        }
    }

    startNotificationTimeUpdates() {
        // Clear any existing interval
        if (this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
        }

        // Update notification times every minute
        this.timeUpdateInterval = setInterval(() => {
            if (this.currentPage === 'notifications' && this.notifications && this.notifications.length > 0) {
                console.log('Updating notification times...');
                this.updateNotificationTimes();
            }
        }, 60000); // Update every minute

        console.log('Started real-time notification time updates');
    }

    updateNotificationTimes() {
        // Update time displays for visible notifications
        const timeElements = document.querySelectorAll('.notification-time-text');
        timeElements.forEach(element => {
            const notificationId = element.getAttribute('data-notification-id');
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification) {
                element.textContent = this.formatNotificationTime(notification.created_at);
            }
        });
    }

    renderNotifications(notifications) {
        // Update the entire notifications page container instead of just the list
        const pageContainer = document.getElementById('notifications-page');
        if (!pageContainer) return;

        const sortedNotifications = [...notifications].sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        );

        // Deduplicate pending items by order_id to avoid duplicate live orders
        const deduped = [];
        const seen = new Set();
        for (const n of sortedNotifications) {
            const key = (n && n.status === 'pending' && n.order_id) ? `pending-${n.order_id}` : `id-${n?.id}`;
            if (!seen.has(key)) {
                seen.add(key);
                deduped.push(n);
            }
        }

        const liveOrdersCount = deduped.filter(n => n.status === 'pending').length;

        // Create modern mobile UI
        pageContainer.innerHTML = `
            <div class="orders-container" style="padding: 20px; max-width: 100%; margin: 0 auto; background: #f8fafc; min-height: 100vh;">
                <!-- Simple Header -->
                <div style="margin-bottom: 24px;">
                    <h1 style="
                        margin: 0 0 8px 0;
                        font-size: 28px;
                        font-weight: 700;
                        color: #1f2937;
                        text-align: left;
                    ">Orders</h1>
                    <p style="
                        margin: 0 0 20px 0;
                        color: #6b7280;
                        font-size: 16px;
                        line-height: 1.5;
                        text-align: left;
                    ">Available orders from your shops</p>

                    <!-- Live Orders - Minimalistic -->
                    <div style="
                        background: #ffffff;
                        border-radius: 12px;
                        padding: 20px;
                        border: 1px solid #e5e7eb;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                        margin-bottom: 24px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    ">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="
                                width: 40px;
                                height: 40px;
                                background: ${liveOrdersCount > 0 ? '#ff6b35' : '#f3f4f6'};
                                border-radius: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                transition: all 0.2s ease;
                            ">
                                <i class="fas fa-shopping-bag" style="color: ${liveOrdersCount > 0 ? 'white' : '#9ca3af'}; font-size: 16px;"></i>
                            </div>
                            <div>
                                <div style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 2px;">Live Orders</div>
                                <div style="font-size: 13px; color: #6b7280;">
                                    ${liveOrdersCount > 0 ? 'Available to accept' : 'No orders available'}
                                </div>
                            </div>
                        </div>
                        <div style="
                            font-size: 24px;
                            font-weight: 700;
                            color: ${liveOrdersCount > 0 ? '#ff6b35' : '#9ca3af'};
                            min-width: 32px;
                            text-align: right;
                        ">${liveOrdersCount}</div>
                    </div>
                </div>

                <!-- Orders List Section -->
                <div style="margin-bottom: 20px;">
                    <div style="
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 16px;
                        padding: 0 4px;
                    ">
                        <h2 style="
                            margin: 0;
                            font-size: 20px;
                            font-weight: 600;
                            color: #111827;
                        ">Active Orders</h2>
                        <button style="
                            background: none;
                            border: none;
                            color: #6b7280;
                            font-size: 14px;
                            cursor: pointer;
                            padding: 4px 8px;
                            border-radius: 6px;
                            transition: all 0.2s ease;
                        " onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='none'" onclick="deliveryApp.loadNotifications()">
                            <i class="fas fa-sync-alt" style="margin-right: 4px;"></i>
                            Refresh
                        </button>
                    </div>

                    <!-- Orders List Container -->
                    <div class="orders-list" id="notifications-list" style="
                        background: #ffffff;
                        border-radius: 16px;
                        border: 1px solid #e5e7eb;
                        overflow: hidden;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
                    ">
                        ${this.renderOrdersList(deduped)}
                    </div>
                </div>
            </div>
        `;

        // Setup notifications menu after rendering
        setTimeout(() => {
            this.setupNotificationsMenu();
        }, 100);
    }

    // Accept an order from notification
    async acceptOrder(notificationId, btnEl = null) {
        console.log('🚀 ACCEPT ORDER CLICKED! Notification ID:', notificationId);

        // Keep a stable reference to the button (from inline onclick: this)
        const button = btnEl || null;
        let originalText = '';

        try {
            // Show loading state on the button that was clicked
            if (button) {
                console.log('🔘 Button element received');
                originalText = button.innerHTML;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Accepting...';
                button.disabled = true;
            }

            // Find the notification to get the order ID (tolerate string/number mismatches)
            const nid = (notificationId || '').toString();
            const notification = this.notifications.find(n => ((n?.id)?.toString && n.id.toString()) === nid);
            if (!notification) {
                console.error('❌ Notification not found in memory. Available notifications:', (this.notifications || []).map(n => (n?.id)?.toString && n.id.toString()));
                throw new Error('Notification not found');
            }

            console.log('📦 Found notification:', notification);

            // Extract order ID from notification with robust fallbacks
            let orderId = null;
            if (notification.order_id) {
                orderId = notification.order_id;
                console.log('✅ Found order_id in notification:', orderId);
            } else {
                // Fallback 1: parse from message (e.g., "Order #1234")
                const rawMsg = (notification.message || '').toString();
                const msg = this.unescapeHTML ? this.unescapeHTML(rawMsg) : rawMsg;
                const match = msg.match(/Order\s*#\s*(\d+)/i);
                if (match && match[1]) {
                    orderId = match[1];
                    console.log('🧩 Parsed order_id from message:', orderId);
                }

                // If still missing, do not throw hard error; surface friendly notice and remove this broken item
                if (!orderId) {
                    console.warn('⚠️ Notification has no order_id and none could be parsed. Notification:', notification);
                    this.showToast('This item is not linked to an order and was removed.', 'warning');

                    // Remove from local list so it doesn’t block the flow
                    this.notifications = (this.notifications || []).filter(n => (String(n?.id) !== String(notificationId)));
                    if (this.currentPage === 'notifications') {
                        this.renderNotifications(this.notifications);
                        this.updateNotificationBadge(this.notifications.filter(n => !n.is_read).length);
                    }

                    // Restore button state if present
                    if (button) {
                        button.innerHTML = originalText || '<i class="fas fa-check"></i> Accept Order';
                        button.disabled = false;
                    }
                    return; // gracefully exit
                }
            }

            console.log('📞 Accepting order ID:', orderId);

            // Call the actual order acceptance API
            const response = await fetch('/api/orders/accept', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify({
                    orderId: orderId,
                    notificationId: notificationId,
                    acceptedVia: 'notification'
                })
            });

            if (!response.ok) {
                let errorData = {};
                try { errorData = await response.json(); } catch (e) {}
                const msg = (errorData && errorData.message) ? errorData.message : 'Failed to accept order';

                // If server says order is gone/invalid or already taken, remove this notification to keep flow clean
                const stale = [404, 409, 410].includes(response.status) || /not\s*found|already\s*(accepted|assigned)|invalid\s*order/i.test(msg);
                if (stale) {
                    this.notifications = (this.notifications || []).filter(n => (String(n?.id) !== String(notificationId)));
                    if (this.currentPage === 'notifications') {
                        this.renderNotifications(this.notifications);
                        this.updateNotificationBadge(this.notifications.filter(n => !n.is_read).length);
                    }
                    this.showToast('This order is no longer available and was removed.', 'info');
                }

                throw new Error(msg);
            }

            const result = await response.json();
            console.log('✅ Order accepted successfully:', result);

            // Show success message
            this.showToast('🎉 Order accepted successfully!', 'success');

            // Note: We don't need to call confirmNotification here because the API
            // already handles the notification confirmation when accepting the order

            // Remove the notification from the current view and memory
            this.notifications = this.notifications.filter(n => (String(n?.id) !== String(notificationId)));
            this.removeFromMemory('notifications', notificationId);

            // Invalidate orders memory to force refresh
            if (this.smartMemory) {
                this.smartMemory.acceptedOrders.lastUpdate = 0;
                this.smartMemory.recentOrders.lastUpdate = 0;
            }

            // Re-render notifications if on notifications page
            if (this.currentPage === 'notifications') {
                this.renderNotifications(this.notifications);
            }

            // Navigate to orders page to show accepted order
            this.navigateToPage('orders');

        } catch (error) {
            console.error('Error accepting order:', error);
            this.showToast('Failed to accept order. Please try again.', 'error');

            // Restore button if still exists
            if (button) {
                button.innerHTML = originalText || '<i class="fas fa-check"></i> Accept Order';
                button.disabled = false;
            }
        }
    }

    // Show compact order details modal
    showOrderDetailsModal(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (!notification) return;

        // Parse order details from message
        const message = this.unescapeHTML(notification.message || '');
        const orderMatch = message.match(/Order #(\d+)/);
        const amountMatch = message.match(/Amount: €([\d.]+)/);
        const addressMatch = message.match(/📍 (.+?)(?:\n|📞)/);
        const phoneMatch = message.match(/📞 (.+?)(?:\n|⏰|👤|📝|$)/);
        const timeMatch = message.match(/⏰ (.+?)(?:\n|👤|📝|$)/);
        const nameMatch = message.match(/👤 (.+?)(?:\n|📝|$)/);
        const notesMatch = message.match(/📝 (.+?)(?:\n|$)/);

        const orderId = orderMatch ? orderMatch[1] : 'N/A';
        const amount = amountMatch ? amountMatch[1] : '0';
        const address = addressMatch ? addressMatch[1].trim() : 'Address not provided';
        const phone = phoneMatch ? phoneMatch[1].trim() : 'Phone not provided';
        const preparationTime = timeMatch ? timeMatch[1].trim() : 'Ready Now';
        const customerName = nameMatch ? nameMatch[1].trim() : '';
        const notes = notesMatch ? notesMatch[1].trim() : '';
        const shopName = notification.shop?.name || notification.shop_name || 'Unknown Shop';
        const paymentMethod = parseFloat(amount) > 0 ? 'Cash' : 'Card';

        // Create compact modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        `;

        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 16px;
                max-width: 350px;
                width: 100%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                overflow: hidden;
            ">
                <!-- Header -->
                <div style="
                    background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
                    padding: 20px;
                    color: white;
                    text-align: center;
                ">
                    <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700;">Order #${orderId}</h3>
                    <div style="display: flex; justify-content: center; gap: 12px; align-items: center;">
                        <span style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 600;">${paymentMethod}</span>
                        ${parseFloat(amount) > 0 ? `<span style="font-size: 18px; font-weight: 700;">€${amount}</span>` : ''}
                    </div>
                </div>

                <!-- Content -->
                <div style="padding: 20px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                        <!-- Phone -->
                        <div>
                            <div style="color: #6b7280; font-size: 12px; font-weight: 600; margin-bottom: 4px;">PHONE</div>
                            <div style="color: #111827; font-size: 14px; font-weight: 600;">${phone}</div>
                        </div>

                        <!-- Shop -->
                        <div>
                            <div style="color: #6b7280; font-size: 12px; font-weight: 600; margin-bottom: 4px;">SHOP</div>
                            <div style="color: #111827; font-size: 14px; font-weight: 600;">${shopName}</div>
                        </div>

                        <!-- Preparation Time -->
                        <div>
                            <div style="color: #6b7280; font-size: 12px; font-weight: 600; margin-bottom: 4px;">READY</div>
                            <div style="color: #111827; font-size: 14px; font-weight: 600;">${preparationTime}</div>
                        </div>

                        <!-- Order Time -->
                        <div>
                            <div style="color: #6b7280; font-size: 12px; font-weight: 600; margin-bottom: 4px;">ORDERED</div>
                            <div style="color: #111827; font-size: 14px; font-weight: 600;">${this.formatTimeAgo(notification.created_at)}</div>
                        </div>
                    </div>

                    <!-- Address -->
                    <div style="margin-bottom: 16px;">
                        <div style="color: #6b7280; font-size: 12px; font-weight: 600; margin-bottom: 4px;">DELIVERY ADDRESS</div>
                        <div style="color: #111827; font-size: 14px; font-weight: 600; line-height: 1.4;">${address}</div>
                    </div>

                    ${customerName ? `
                        <div style="margin-bottom: 16px;">
                            <div style="color: #6b7280; font-size: 12px; font-weight: 600; margin-bottom: 4px;">CUSTOMER</div>
                            <div style="color: #111827; font-size: 14px; font-weight: 600;">${customerName}</div>
                        </div>
                    ` : ''}

                    <!-- Notes -->
                    <div style="margin-bottom: 20px;">
                        <div style="color: #6b7280; font-size: 12px; font-weight: 600; margin-bottom: 4px;">NOTES</div>
                        <div style="
                            background: #f8fafc;
                            border: 1px solid #e5e7eb;
                            border-radius: 8px;
                            padding: 12px;
                            color: ${notes ? '#374151' : '#9ca3af'};
                            font-size: 13px;
                            line-height: 1.4;
                            ${notes ? 'font-style: italic;' : ''}
                        ">${notes || 'No Notes'}</div>
                    </div>

                    <!-- Actions -->
                    <div style="display: flex; gap: 12px;">
                        <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" style="
                            flex: 1;
                            background: #f3f4f6;
                            color: #6b7280;
                            border: none;
                            padding: 14px;
                            border-radius: 10px;
                            font-size: 14px;
                            font-weight: 600;
                            cursor: pointer;
                        ">Close</button>
                        ${(notification.status === 'pending') && (notification.order_id || (/Order #\d+/i.test((notification.message || '')))) ? `
>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Show order details modal (keep original for backward compatibility)
    showOrderDetails(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (!notification) return;

        // Parse order details from message
        const message = this.unescapeHTML(notification.message || '');
        const orderMatch = message.match(/Order #(\d+)/);
        const amountMatch = message.match(/Amount: €([\d.]+)/);
        const addressMatch = message.match(/📍 (.+?)(?:\n|📞)/);
        const phoneMatch = message.match(/📞 (.+?)(?:\n|⏰|👤|📝|$)/);
        const timeMatch = message.match(/⏰ (.+?)(?:\n|👤|📝|$)/);
        const nameMatch = message.match(/👤 (.+?)(?:\n|📝|$)/);
        const notesMatch = message.match(/📝 (.+?)(?:\n|$)/);

        const orderId = orderMatch ? orderMatch[1] : 'N/A';
        const amount = amountMatch ? amountMatch[1] : '0';
        const address = addressMatch ? addressMatch[1].trim() : 'Address not provided';
        const phone = phoneMatch ? phoneMatch[1].trim() : 'Phone not provided';
        const preparationTime = timeMatch ? timeMatch[1].trim() : 'Ready Now';
        const customerName = nameMatch ? nameMatch[1].trim() : 'Customer';
        const notes = notesMatch ? notesMatch[1].trim() : '';
        const shopName = notification.shop?.name || notification.shop_name || 'Unknown Shop';

        // Create modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        `;

        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 20px;
                max-width: 400px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            ">
                <!-- Header -->
                <div style="
                    background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
                    padding: 24px;
                    border-radius: 20px 20px 0 0;
                    color: white;
                    text-align: center;
                ">
                    <div style="
                        background: rgba(255, 255, 255, 0.2);
                        padding: 4px 12px;
                        border-radius: 12px;
                        font-size: 12px;
                        font-weight: 600;
                        margin-bottom: 12px;
                        display: inline-block;
                    ">${shopName}</div>
                    <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">Order #${orderId}</h2>
                    <p style="margin: 0; opacity: 0.9; font-size: 16px;">${parseFloat(amount) > 0 ? `€${amount}` : 'Card'}</p>
                </div>

                <!-- Content -->
                <div style="padding: 24px;">
                    ${customerName !== 'Customer' ? `
                        <div style="margin-bottom: 20px;">
                            <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Customer</h4>
                            <p style="margin: 0; font-size: 16px; color: #111827; font-weight: 500;">${customerName}</p>
                        </div>
                    ` : ''}

                    <div style="margin-bottom: 20px;">
                        <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Phone</h4>
                        <p style="margin: 0; font-size: 16px; color: #111827; font-weight: 500;">${phone}</p>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Preparation Time</h4>
                        <p style="margin: 0; font-size: 16px; color: #111827; font-weight: 500;">${preparationTime}</p>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Delivery Address</h4>
                        <p style="margin: 0; font-size: 16px; color: #111827; font-weight: 500; line-height: 1.4;">${address}</p>
                    </div>

                    ${notes ? `
                        <div style="margin-bottom: 20px;">
                            <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Notes</h4>
                            <p style="margin: 0; font-size: 16px; color: #111827; font-weight: 500; line-height: 1.4;">${notes}</p>
                        </div>
                    ` : ''}

                    <div style="margin-bottom: 24px;">
                        <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Order Time</h4>
                        <p style="margin: 0; font-size: 16px; color: #111827; font-weight: 500;">${this.formatTimeAgo(notification.created_at)}</p>
                    </div>

                    <!-- Actions -->
                    <div style="display: flex; gap: 12px;">
                        <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" style="
                            flex: 1;
                            background: #f3f4f6;
                            color: #6b7280;
                            border: none;
                            padding: 16px;
                            border-radius: 12px;
                            font-size: 16px;
                            font-weight: 500;
                            cursor: pointer;
                        ">Close</button>
                        ${(notification.status === 'pending') && (notification.order_id || (/Order #\d+/i.test((notification.message || '')))) ? `
>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    renderOrdersList(notifications) {
        if (!notifications || notifications.length === 0) {
            return `
                <div style="
                    padding: 40px 20px;
                    text-align: center;
                    background: #ffffff;
                ">
                    <div style="
                        width: 64px;
                        height: 64px;
                        background: #f3f4f6;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 16px;
                    ">
                        <i class="fas fa-inbox" style="color: #9ca3af; font-size: 24px;"></i>
                    </div>
                    <h3 style="
                        margin: 0 0 8px 0;
                        font-size: 18px;
                        font-weight: 600;
                        color: #374151;
                    ">No orders yet</h3>
                    <p style="
                        margin: 0;
                        color: #6b7280;
                        font-size: 15px;
                        line-height: 1.4;
                    ">New delivery orders will appear here</p>
                </div>
            `;
        }

        return (notifications || []).filter(n => ((n.status || 'pending') === 'pending')).map(n => this.createModernOrderCard(n)).join('');
    }

    createModernOrderCard(notification) {
        const statusColor = notification.status === 'pending' ? '#f59e0b' : '#10b981';
        const statusIcon = notification.status === 'pending' ? 'shopping-bag' : 'check-circle';
        const statusText = notification.status === 'pending' ? 'New Order' : 'Completed';

        // Prefer structured fields; fall back to parsing message
        const message = this.unescapeHTML(notification.message || '');
        const orderMatch = message.match(/Order #(\d+)/);
        const amountMatch = message.match(/Amount: €([\d.]+)/);
        const addressMatch = message.match(/📍 (.+?)(?:\n|📞)/);
        const phoneMatch = message.match(/📞 (.+?)(?:\n|⏰|👤|📝|$)/);
        const timeMatch = message.match(/⏰ (.+?)(?:\n|👤|📝|$)/);
        const nameMatch = message.match(/👤 (.+?)(?:\n|📝|$)/);
        const notesMatch = message.match(/📝 (.+?)(?:\n|$)/);

        const orderId = notification.order_id || (orderMatch ? orderMatch[1] : 'N/A');
        const amountNum = (notification.order_amount != null) ? Number(notification.order_amount) : (amountMatch ? Number(amountMatch[1]) : 0);
        const amount = isNaN(amountNum) ? 0 : amountNum;
        const address = notification.delivery_address || (addressMatch ? addressMatch[1].trim() : 'Address not provided');
        const phone = notification.customer_phone || (phoneMatch ? phoneMatch[1].trim() : 'Phone not provided');
        const rawPrep = (notification.preparation_time != null) ? `${notification.preparation_time} minutes` : (timeMatch ? timeMatch[1].trim() : 'Ready Now');
        const preparationTime = rawPrep;
        const customerName = notification.customer_name || (nameMatch ? nameMatch[1].trim() : '');
        const notes = (notification.notes != null && notification.notes !== '') ? notification.notes : (notesMatch ? notesMatch[1].trim() : '');

        // Get shop name from notification
        const shopName = notification.shop?.name || notification.shop_name || 'Unknown Shop';

        // Determine payment method (prefer structured field)
        const paymentMethod = (notification.payment_method) ? notification.payment_method : ((Number(amount) > 0) ? 'Cash' : 'Card');

        // Parse preparation time for icon and display
        const prepTimeIcon = preparationTime.includes('Ready Now') ? 'bolt' :
                           preparationTime.includes('5 minutes') ? 'clock' :
                           preparationTime.includes('10 minutes') ? 'hourglass-half' :
                           preparationTime.includes('15 minutes') ? 'pause-circle' : 'clock';

        const prepTimeColor = preparationTime.includes('Ready Now') ? '#10b981' :
                            preparationTime.includes('5 minutes') ? '#f59e0b' :
                            preparationTime.includes('10 minutes') ? '#3b82f6' :
                            preparationTime.includes('15 minutes') ? '#ef4444' : '#f59e0b';

        const prepTimeText = preparationTime.includes('Ready Now') ? 'Now' :
                           preparationTime.includes('5 minutes') ? '5 min' :
                           preparationTime.includes('10 minutes') ? '10 min' :
                           preparationTime.includes('15 minutes') ? '15 min' : preparationTime;

        return `
            <div style="
                margin-bottom: 12px;
                background: #ffffff;
                border-radius: 12px;
                border: 1px solid #e5e7eb;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                transition: all 0.2s ease;
            " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(0, 0, 0, 0.1)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 3px rgba(0, 0, 0, 0.05)'">
                <!-- Compact Header -->
                <div style="
                    background: linear-gradient(135deg, ${statusColor}12 0%, ${statusColor}06 100%);
                    padding: 12px 16px;
                    border-bottom: 1px solid #f3f4f6;
                ">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="
                                width: 32px;
                                height: 32px;
                                background: ${statusColor};
                                border-radius: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <i class="fas fa-${statusIcon}" style="color: white; font-size: 14px;"></i>
                            </div>
                            <div>
                                <h3 style="
                                    margin: 0 0 2px 0;
                                    font-size: 16px;
                                    font-weight: 700;
                                    color: #111827;
                                    line-height: 1.2;
                                ">Order #${orderId}</h3>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="
                                        color: #6b7280;
                                        font-size: 12px;
                                    ">${this.formatTimeAgo(notification.created_at)}</span>
                                </div>
                            </div>
                        </div>
                        <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; margin-left: auto;">
                            <div style="
                                font-size: 18px;
                                font-weight: 700;
                                color: #111827;
                                line-height: 1;
                            ">${(paymentMethod && paymentMethod.toLowerCase() === 'cash' && Number(amount) > 0) ? `€${Number(amount).toFixed(2)}` : 'Paid'}</div>
                            <span style="
                                background: #ff6b35;
                                color: white;
                                padding: 4px 8px;
                                border-radius: 6px;
                                font-size: 11px;
                                font-weight: 600;
                                display: inline-block;
                            ">${paymentMethod}</span>
                        </div>
                    </div>
                </div>

                <!-- Compact Order Details -->
                <div style="padding: 14px 16px;">
                    <!-- 2x2 Grid Layout -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px 20px; margin-bottom: 14px;">
                        <!-- Phone (Top Left) -->
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="
                                width: 32px;
                                height: 32px;
                                background: #dbeafe;
                                border-radius: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <i class="fas fa-phone" style="color: #3b82f6; font-size: 13px;"></i>
                            </div>
                            <div>
                                <div style="font-weight: 600; color: #111827; font-size: 13px; line-height: 1.2;">${phone}</div>
                                <div style="color: #6b7280; font-size: 11px;">Phone</div>
                            </div>
                        </div>

                        <!-- Shop (Top Right) -->
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="
                                width: 32px;
                                height: 32px;
                                background: #fff7ed;
                                border-radius: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <i class="fas fa-store" style="color: #ff6b35; font-size: 13px;"></i>
                            </div>
                            <div>
                                <div style="font-weight: 600; color: #111827; font-size: 13px; line-height: 1.2;">${shopName}</div>
                                <div style="color: #6b7280; font-size: 11px;">Shop</div>
                            </div>
                        </div>

                        <!-- Address (Bottom Left) -->
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="
                                width: 32px;
                                height: 32px;
                                background: #fef3c7;
                                border-radius: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <i class="fas fa-map-marker-alt" style="color: #f59e0b; font-size: 13px;"></i>
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 600; color: #111827; font-size: 13px; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${address}</div>
                                <div style="color: #6b7280; font-size: 11px;">Address</div>
                            </div>
                        </div>

                        <!-- Preparation Time (Bottom Right) -->
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="
                                width: 32px;
                                height: 32px;
                                background: ${prepTimeColor}15;
                                border-radius: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <i class="fas fa-${prepTimeIcon}" style="color: ${prepTimeColor}; font-size: 13px;"></i>
                            </div>
                            <div>
                                <div style="font-weight: 600; color: #111827; font-size: 13px; line-height: 1.2;">${prepTimeText}</div>
                                <div style="color: #6b7280; font-size: 11px;">Ready</div>
                            </div>
                        </div>
                    </div>

                    <!-- Notes Section -->
                    <div style="
                        background: #f8fafc;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        padding: 12px;
                        margin-bottom: 14px;
                        text-align: center;
                    ">
                        ${notes ? `
                            <p style="margin: 0; color: #374151; font-size: 13px; line-height: 1.4; font-style: italic;">"${notes}"</p>
                        ` : `
                            <p style="margin: 0; color: #9ca3af; font-size: 13px;">No Notes</p>
                        `}
                    </div>

                    <!-- Compact Action Buttons -->
                    ${(notification.status === 'pending') && (notification.order_id || (/Order #\d+/i.test((notification.message || '')))) ? `
                        <div style="display: flex; gap: 8px; margin-top: 14px;">
                            <button
                                type="button"
                                data-accept-order="true"
                                data-notification-id="${notification.id}"
                                onclick="deliveryApp.acceptOrder(${notification.id}, this)"
                                style="
                                    flex: 1;
                                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                                    color: white;
                                    border: none;
                                    padding: 12px;
                                    border-radius: 8px;
                                    font-size: 14px;
                                    font-weight: 600;
                                    cursor: pointer;
                                    transition: all 0.2s ease;
                                    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
                                "
                                onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.3)'"
                                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(16, 185, 129, 0.2)'"
                            >
                                <i class="fas fa-check" style="margin-right: 6px;"></i>
                                Accept Order
                            </button>
                            <button
                                onclick="deliveryApp.showOrderDetailsModal(${notification.id})"
                                style="
                                    background: #f8fafc;
                                    color: #6b7280;
                                    border: 1px solid #e5e7eb;
                                    padding: 12px;
                                    border-radius: 8px;
                                    font-size: 14px;
                                    font-weight: 500;
                                    cursor: pointer;
                                    transition: all 0.2s ease;
                                    min-width: 44px;
                                "
                                onmouseover="this.style.background='#f1f5f9'; this.style.borderColor='#cbd5e1'"
                                onmouseout="this.style.background='#f8fafc'; this.style.borderColor='#e5e7eb'"
                            >
                                <i class="fas fa-info-circle"></i>
                            </button>
                        </div>
                    ` : `
                        <div style="
                            background: #dcfce7;
                            border: 1px solid #bbf7d0;
                            border-radius: 8px;
                            padding: 12px;
                            text-align: center;
                        ">
                            <i class="fas fa-check-circle" style="color: #10b981; font-size: 16px; margin-right: 6px;"></i>
                            <span style="color: #065f46; font-weight: 600; font-size: 14px;">Order Completed</span>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    groupNotificationsByDate(notifications) {
        const groups = {};
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        notifications.forEach(notification => {
            const notificationDate = new Date(notification.created_at);
            let dateKey;

            if (notificationDate.toDateString() === today.toDateString()) {
                dateKey = 'Σήμερα';
            } else if (notificationDate.toDateString() === yesterday.toDateString()) {
                dateKey = 'Χθες';
            } else {
                dateKey = notificationDate.toLocaleDateString('el-GR', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'Europe/Athens'
                });
            }

            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(notification);
        });

        return groups;
    }

    createNotificationCard(notification) {
        const isUnread = !notification.is_read;
        const isPending = notification.status === 'pending';
        const isConfirmed = notification.status === 'confirmed';
        // Check if this is a very recent notification (less than 2 minutes old)
        const notificationTime = new Date(notification.created_at);
        const now = new Date();
        const diffInSeconds = Math.floor((now - notificationTime) / 1000);

        // If notification is very recent (likely just received), use current timestamp for display
        const timestamp = diffInSeconds < 120 ? new Date().toISOString() : notification.created_at;
        const formattedTime = this.formatNotificationTime(timestamp);

        console.log('Creating notification card for:', notification.id, 'Status:', notification.status);

        return `
            <div class="notification-card compact ${isPending ? 'pending' : 'confirmed'} ${isUnread ? 'unread' : ''}"
                 data-id="${notification.id}" data-notification-id="${notification.id}">
                <div class="card-accent"></div>

                <div class="notification-row">
                    <div class="shop-section">
                        <div class="shop-avatar-mini">
                            <i class="fas fa-store"></i>
                            <div class="status-dot ${notification.status}"></div>
                        </div>
                        <div class="shop-info-mini">
                            <h4 class="shop-name-mini">${this.escapeHTML(notification.shop.name)}</h4>
                            <span class="time-mini">
                                <i class="fas fa-clock"></i>
                                <span class="notification-time-text" data-notification-id="${notification.id}">${formattedTime}</span>
                            </span>
                        </div>
                    </div>

                    <div class="status-section">
                        <span class="status-badge-mini ${notification.status}">
                            <i class="fas ${isPending ? 'fa-hourglass-half' : 'fa-check-circle'}"></i>
                            ${isPending ? 'Pending' : 'Confirmed'}
                        </span>
                    </div>

                    <div class="actions-section">
                        ${isPending ? `
                            <button class="action-btn-mini confirm"
                                    data-notification-id="${notification.id}"
                                    data-action="confirm"
                                    title="Confirm notification">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : `
                            <button class="action-btn-mini delete"
                                    data-notification-id="${notification.id}"
                                    data-action="delete"
                                    title="Delete notification">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        `}
                    </div>
                </div>

                <div class="message-section">
                    <div class="message-content-mini">
                        <i class="fas fa-quote-left message-quote"></i>
                        <p class="notification-message-mini">${this.escapeHTML(notification.message)}</p>
                        ${isUnread ? '<span class="new-indicator">NEW</span>' : ''}
                    </div>
                </div>
            </div>
        `;
    }

    formatNotificationTime(dateString) {
        // Simple, reliable Greek time display
        const notificationDate = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - notificationDate) / 1000);

        // For very recent notifications (less than 30 seconds), show "Τώρα"
        if (diffInSeconds < 30) {
            return 'Τώρα';
        }

        // Always show Greek time
        return new Intl.DateTimeFormat('el-GR', {
                hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Athens'
        }).format(notificationDate);
    }

    escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    unescapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'");
    }

    updateNotificationBadge(count) {
        const badge = document.querySelector('.nav-item[data-page="notifications"] .badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    async fetchInitialNotifications() {
        try {
            const count = await this.fetchNotificationCount();
            this.updateNotificationBadge(count);
        } catch (error) {
            console.error('Error fetching initial notifications:', error);
        }
    }

    showConfirmationModal(notificationId, message, shopName) {
        console.log('=== SHOW CONFIRMATION MODAL START ===');
        console.log('Notification ID:', notificationId);
        console.log('Message:', message);
        console.log('Shop Name:', shopName);

        const modal = document.createElement('div');
        modal.className = 'confirmation-modal active';
        modal.id = 'confirm-notification-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            padding: 20px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        modal.innerHTML = `
            <div class="confirmation-modal-content" style="
                background: white;
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
                width: 100%;
                max-width: 380px;
                position: relative;
                overflow: hidden;
            ">
                <!-- Header -->
                <div style="
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    padding: 24px;
                    text-align: center;
                    color: white;
                ">
                    <div style="
                        width: 48px;
                        height: 48px;
                        background: rgba(255, 255, 255, 0.2);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 12px auto;
                        backdrop-filter: blur(10px);
                    ">
                        <i class="fas fa-check" style="font-size: 20px;"></i>
                    </div>
                    <h3 style="
                        margin: 0;
                        font-size: 18px;
                        font-weight: 600;
                    ">Confirm Notification</h3>
                </div>

                <!-- Content -->
                <div style="padding: 24px; text-align: center;">
                    <div style="
                        background: #f8fafc;
                        padding: 16px;
                        border-radius: 12px;
                        margin-bottom: 24px;
                        border: 1px solid #e2e8f0;
                    ">
                        <div style="
                            font-size: 14px;
                            color: #64748b;
                            margin-bottom: 8px;
                            font-weight: 500;
                        ">
                            <i class="fas fa-store" style="margin-right: 8px; color: #059669;"></i>
                            ${this.escapeHTML(shopName)}
                        </div>
                        <div style="
                            color: #1e293b;
                            font-size: 15px;
                            line-height: 1.5;
                            font-style: italic;
                        ">
                            "${this.unescapeHTML(message)}"
                        </div>
                    </div>

                    <p style="
                        color: #64748b;
                        font-size: 14px;
                        margin: 0 0 24px 0;
                        line-height: 1.4;
                    ">
                        Confirm that you've received and read this message.
                    </p>
                </div>

                <!-- Actions -->
                <div style="
                    display: flex;
                    gap: 12px;
                    padding: 0 24px 24px;
                ">
                    <button class="cancel-btn" style="
                        flex: 1;
                        padding: 12px 16px;
                        border: 1px solid #e2e8f0;
                        background: white;
                        color: #64748b;
                        border-radius: 10px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: all 0.2s ease;
                    ">
                        Cancel
                    </button>
                    <button class="confirm-btn" style="
                        flex: 2;
                        padding: 12px 16px;
                        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                        color: white;
                        border: none;
                        border-radius: 10px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        transition: all 0.2s ease;
                        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                    ">
                        <i class="fas fa-check"></i> Confirm
                    </button>
                </div>
            </div>
        `;

        // Remove any existing modal
        const existingModal = document.getElementById('confirm-notification-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add new modal
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Bind events to the modal buttons
        const cancelBtn = modal.querySelector('.cancel-btn');
        const confirmBtn = modal.querySelector('.confirm-btn');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Cancel button clicked');
                this.closeConfirmationModal();
            });

            // Hover effect
            cancelBtn.addEventListener('mouseenter', () => {
                cancelBtn.style.background = '#f8fafc';
                cancelBtn.style.borderColor = '#cbd5e1';
                cancelBtn.style.color = '#475569';
            });
            cancelBtn.addEventListener('mouseleave', () => {
                cancelBtn.style.background = 'white';
                cancelBtn.style.borderColor = '#e2e8f0';
                cancelBtn.style.color = '#64748b';
            });
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Confirm button clicked for notification:', notificationId);

                // Disable button immediately to prevent multiple clicks
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Confirming...';

                this.confirmNotification(notificationId);
            });

            // Hover effect
            confirmBtn.addEventListener('mouseenter', () => {
                if (!confirmBtn.disabled) {
                    confirmBtn.style.transform = 'translateY(-1px)';
                    confirmBtn.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                }
            });
            confirmBtn.addEventListener('mouseleave', () => {
                if (!confirmBtn.disabled) {
                    confirmBtn.style.transform = 'translateY(0)';
                    confirmBtn.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                }
            });
        }

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeConfirmationModal();
            }
        });

        console.log('Confirmation modal created and shown with clean design');
    }

    closeConfirmationModal() {
        console.log('=== CLOSE CONFIRMATION MODAL START ===');

        try {
            // Remove all confirmation modals with various selectors
            const modals = document.querySelectorAll('.confirmation-modal, #delete-notification-modal, #confirm-notification-modal, #edit-notification-modal');
            console.log('Found modals to close:', modals.length);

            // Log details about each modal
            modals.forEach((modal, index) => {
                console.log(`Modal ${index + 1}:`, {
                    id: modal.id,
                    className: modal.className,
                    isVisible: modal.style.display !== 'none',
                    parent: modal.parentNode?.tagName || 'No parent'
                });
            });

            // Remove modals immediately instead of using setTimeout
            modals.forEach(modal => {
                console.log(`Removing modal:`, modal.id || 'unnamed modal');
                try {
                    if (modal && modal.parentNode) {
                        modal.parentNode.removeChild(modal);
                        console.log(`Modal ${modal.id || 'unnamed'} removed from DOM`);
                    } else {
                        console.log(`Modal ${modal.id || 'unnamed'} has no parent, cannot remove`);
                    }
                } catch (err) {
                    console.error(`Error removing modal ${modal.id}:`, err);
                }
            });

            // Also try direct removal by ID as a fallback
            ['edit-notification-modal', 'delete-notification-modal', 'confirm-notification-modal'].forEach(id => {
                const modal = document.getElementById(id);
                if (modal) {
                    try {
                        modal.remove();
                        console.log(`Directly removed modal with ID: ${id}`);
                    } catch (err) {
                        console.error(`Error directly removing modal ${id}:`, err);
                    }
                }
            });

            // Restore body scroll
            document.body.style.overflow = 'auto';
        } catch (err) {
            console.error('Error in closeConfirmationModal:', err);
        }

        console.log('=== CLOSE CONFIRMATION MODAL END ===');
    }

    async confirmNotification(notificationId) {
        // Find and disable the confirm button immediately
        const confirmBtn = document.querySelector(`button[onclick*="${notificationId}"]`);
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Confirming...';
        }

        try {
            console.log('Confirming notification:', notificationId);

            const response = await fetch(`/api/driver/${this.userId}/notifications/${notificationId}/confirm`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });

            // Fastest-wins handling
            if (response.status === 409) {
                const err = await response.json().catch(() => ({}));
                console.warn('Order already accepted by another driver');
                this.handleOrderAlreadyAccepted(notificationId);
                return;
            }

            const result = await response.json();

            if (result.success) {
                console.log('Notification confirmed successfully');

                // Play confirmation sound for the driver
                this.playConfirmationSound();

                // Update the notification in the local array
                const notificationIndex = this.notifications.findIndex(n => n.id === notificationId);
                if (notificationIndex !== -1) {
                    this.notifications[notificationIndex].status = 'confirmed';
                    this.notifications[notificationIndex].is_read = true;
                    this.notifications[notificationIndex].confirmed_at = new Date().toISOString();
                }

                // Re-render notifications
                if (this.currentPage === 'notifications') {
                    this.renderNotifications(this.notifications);
                }

                // Update notification count
                this.fetchNotificationCount();

                this.showToast('✅ Notification confirmed successfully', 'success');

                // Close any open modals
                this.closeConfirmationModal();
            } else {
                throw new Error(result.message || 'Failed to confirm notification');
            }
        } catch (error) {
            console.error('Error confirming notification:', error);
            this.showToast('❌ Failed to confirm notification', 'error');

            // Re-enable button on error
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="fas fa-check"></i> Confirm';
            }
        }
    }

    // Helper method to check if a modal is visible and debug it
    debugModalVisibility(modalId) {
        console.log(`Debugging modal visibility for: ${modalId}`);
        const modal = document.getElementById(modalId);

        if (!modal) {
            console.error(`Modal with ID ${modalId} not found in DOM!`);
            return false;
        }

        const styles = window.getComputedStyle(modal);
        console.log(`Modal ${modalId} visibility check:`, {
            display: styles.display,
            visibility: styles.visibility,
            opacity: styles.opacity,
            zIndex: styles.zIndex,
            position: styles.position
        });

        // Check if modal is visually hidden
        if (styles.display === 'none' || styles.visibility === 'hidden' || styles.opacity === '0') {
            console.error(`Modal ${modalId} is in DOM but not visible!`);
            return false;
        }

        console.log(`Modal ${modalId} appears to be visible`);
        return true;
    }

    async executeDeleteNotification(notificationId) {
        try {
            console.log('=== EXECUTE DELETE NOTIFICATION START ===');
            console.log('Notification ID:', notificationId);

            this.closeConfirmationModal();

            console.log(`Deleting notification ${notificationId} from database...`);

            if (!this.currentUser || !this.currentUser.id) {
                console.error('No user ID available for deletion');
                this.showToast('Error: User information not available', 'error');
                return;
            }

            // Show loading state
            this.showToast('Deleting notification...', 'info');

            // Call API to delete notification from database
            const response = await fetch(`/api/driver/${this.currentUser.id}/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Failed to delete notification from server');
            }

            console.log('Server response:', result);
            console.log('Notifications before deletion:', this.notifications.length);

            // Remove from local array and update UI
            this.notifications = this.notifications.filter(n => n.id !== notificationId);

            console.log('Notifications after deletion:', this.notifications.length);

            this.renderNotifications(this.notifications);
            this.updateNotificationBadge(this.notifications.filter(n => !n.is_read).length);

            // Send WebSocket message to broadcast the deletion
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'notification_update',
                    action: 'deleted',
                    notificationId: notificationId,
                    data: {
                        deleted: true
                    }
                }));
            }

            // Play warning sound for deletion
            this.playWarningSound();

            this.showToast('Notification deleted successfully! (Removed from both driver and shop views)', 'success');
            console.log('=== EXECUTE DELETE NOTIFICATION END ===');

        } catch (error) {
            console.error('=== EXECUTE DELETE NOTIFICATION ERROR ===');
            console.error('Error deleting notification:', error);
            console.error('Error stack:', error.stack);
            this.showToast('Failed to delete notification: ' + error.message, 'error');
        }
    }

    async fetchNotificationCount() {
        try {
            if (!this.currentUser || !this.currentUser.id) {
                console.log('No current user, skipping notification count fetch');
                return 0;
            }

            const response = await fetch(`/api/driver/${this.currentUser.id}/notifications?limit=1`);

            if (!response.ok) {
                throw new Error('Failed to load notifications');
            }

            const data = await response.json();

            if (data.success) {
                return data.unread_count || 0;
            } else {
                throw new Error(data.message || 'Failed to load notification count');
            }
        } catch (error) {
            console.error('Error fetching notification count:', error);
            throw error;
        }
    }

    updateProfileDisplay() {
        console.log('updateProfileDisplay called');
        if (!this.currentUser) {
            console.log('No current user available');
            return;
        }

        const profileContainer = document.querySelector('#profile-page .profile-container');
        if (!profileContainer) {
            console.log('Profile container not found');
            return;
        }
        console.log('Profile container found, updating display');

        const userEmail = this.currentUser.email || 'Not available';
        const userId = this.userId || 'N/A';
        const displayName = this.currentUser.name || this.currentUser.email?.split('@')[0] || 'Driver';
        const joinDate = this.currentUser.created_at ?
            new Date(this.currentUser.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : 'Recently';

        // Calculate statistics
        const totalOrders = this.orders ? this.orders.length : 0;
        const totalEarnings = this.orders ? this.orders.reduce((sum, order) => sum + (parseFloat(order.earnings) || 0), 0) : 0;
        const totalShops = this.shops ? this.shops.length : 0;

        profileContainer.innerHTML = `
            <!-- Modern Profile Header (Instagram Style) -->
            <div style="
                background: #ffffff;
                padding: 24px 20px;
                border-bottom: 1px solid #e5e7eb;
            ">
                <!-- Profile Info Section -->
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    margin-bottom: 20px;
                ">
                    <!-- Profile Picture -->
                    <div style="
                        width: 90px;
                        height: 90px;
                        background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
                        position: relative;
                    ">
                        <i class="fas fa-user" style="font-size: 36px; color: white;"></i>
                        <!-- Online Status Indicator -->
                        <div style="
                            position: absolute;
                            bottom: 2px;
                            right: 2px;
                            width: 20px;
                            height: 20px;
                            background: #10b981;
                            border-radius: 50%;
                            border: 3px solid white;
                        "></div>
                    </div>

                    <!-- Profile Details -->
                    <div style="flex: 1;">
                        <h1 style="
                            margin: 0 0 4px 0;
                            font-size: 22px;
                            font-weight: 700;
                            color: #111827;
                        ">${displayName}</h1>
                        <p style="
                            margin: 0 0 8px 0;
                            font-size: 15px;
                            color: #6b7280;
                            font-weight: 500;
                        ">Delivery Driver</p>
                        <div style="
                            font-size: 13px;
                            color: #9ca3af;
                            background: #f3f4f6;
                            padding: 4px 8px;
                            border-radius: 6px;
                            display: inline-block;
                            font-weight: 500;
                        ">ID: ${userId}</div>
                    </div>
                </div>

                <!-- Stats Row (Instagram Style) -->
                <div style="
                    display: flex;
                    justify-content: space-around;
                    padding: 16px 0;
                    border-top: 1px solid #f3f4f6;
                    border-bottom: 1px solid #f3f4f6;
                ">
                    <div style="text-align: center;">
                        <div style="
                            font-size: 20px;
                            font-weight: 700;
                            color: #111827;
                            margin-bottom: 2px;
                        ">${totalOrders}</div>
                        <div style="
                            font-size: 13px;
                            color: #6b7280;
                            font-weight: 500;
                        ">Orders</div>
                    </div>

                    <div style="text-align: center;">
                        <div style="
                            font-size: 20px;
                            font-weight: 700;
                            color: #111827;
                            margin-bottom: 2px;
                        ">${totalShops}</div>
                        <div style="
                            font-size: 13px;
                            color: #6b7280;
                            font-weight: 500;
                        ">Shops</div>
                    </div>

                    <div style="text-align: center;">
                        <div style="
                            font-size: 20px;
                            font-weight: 700;
                            color: #111827;
                            margin-bottom: 2px;
                        ">€${this.settings?.earningsPerOrder || '1.50'}</div>
                        <div style="
                            font-size: 13px;
                            color: #6b7280;
                            font-weight: 500;
                        " data-translate="perOrder">${window.t ? window.t('perOrder') : 'Per Order'}</div>
                    </div>
                </div>
            </div>

            <!-- Menu Items (Instagram Style) -->
            <div style="background: #ffffff;">
                <!-- Account Section -->
                <div style="
                    padding: 8px 0;
                    border-bottom: 1px solid #f3f4f6;
                ">
                    <div style="
                        padding: 0 20px 8px;
                        font-size: 13px;
                        font-weight: 600;
                        color: #9ca3af;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    " data-translate="account">${window.t ? window.t('account') : 'Account'}</div>

                    <!-- Settings -->
                    <div onclick="deliveryApp.openSettingsModal()" style="
                        display: flex;
                        align-items: center;
                        padding: 16px 20px;
                        cursor: pointer;
                        transition: background-color 0.2s;
                    " onmouseover="this.style.backgroundColor='#f9fafb'" onmouseout="this.style.backgroundColor='transparent'">
                        <div style="
                            width: 40px;
                            height: 40px;
                            background: #f3f4f6;
                            border-radius: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-right: 16px;
                        ">
                            <i class="fas fa-cog" style="color: #6b7280; font-size: 18px;"></i>
                        </div>
                        <div style="flex: 1;">
                            <div style="
                                font-size: 16px;
                                font-weight: 500;
                                color: #111827;
                                margin-bottom: 2px;
                            " data-translate="settings">${window.t ? window.t('settings') : 'Settings'}</div>
                            <div style="
                                font-size: 13px;
                                color: #6b7280;
                            " data-translate="earningsPerOrderDesc">${window.t ? window.t('earningsPerOrderDesc') : 'Earnings and preferences'}</div>
                        </div>
                        <i class="fas fa-chevron-right" style="color: #d1d5db; font-size: 14px;"></i>
                    </div>

                    <!-- Language -->
                    <div onclick="deliveryApp.openLanguageModal()" style="
                        display: flex;
                        align-items: center;
                        padding: 16px 20px;
                        cursor: pointer;
                        transition: background-color 0.2s;
                    " onmouseover="this.style.backgroundColor='#f9fafb'" onmouseout="this.style.backgroundColor='transparent'">
                        <div style="
                            width: 40px;
                            height: 40px;
                            background: #f3f4f6;
                            border-radius: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-right: 16px;
                        ">
                            <i class="fas fa-globe" style="color: #6b7280; font-size: 18px;"></i>
                        </div>
                        <div style="flex: 1;">
                            <div style="
                                font-size: 16px;
                                font-weight: 500;
                                color: #111827;
                                margin-bottom: 2px;
                            " data-translate="languageSettings">${window.t ? window.t('languageSettings') : 'Language'}</div>
                            <div style="
                                font-size: 13px;
                                color: #6b7280;
                            " data-translate="languageSettingsDesc">${window.t ? window.t('languageSettingsDesc') : 'Choose your preferred language'}</div>
                        </div>
                        <i class="fas fa-chevron-right" style="color: #d1d5db; font-size: 14px;"></i>
                    </div>


                    <!-- Announcements (Drivers) -->
                    <div onclick="deliveryApp.navigateToPage('driver-announcements')" style="
                        display: flex;
                        align-items: center;
                        padding: 16px 20px;
                        cursor: pointer;
                        transition: background-color 0.2s;
                    " onmouseover="this.style.backgroundColor='#f9fafb'" onmouseout="this.style.backgroundColor='transparent'">
                        <div style="
                            width: 40px;
                            height: 40px;
                            background: #f3f4f6;
                            border-radius: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-right: 16px;
                        ">
                            <i class="fas fa-bullhorn" style="color: #6b7280; font-size: 18px;"></i>
                        </div>
                        <div style="flex: 1;">
                            <div style="
                                font-size: 16px;
                                font-weight: 500;
                                color: #111827;
                                margin-bottom: 2px;
                            ">Announcements</div>
                            <div style="
                                font-size: 13px;
                                color: #6b7280;
                            ">Latest updates from admin</div>
                        </div>
                        <i class="fas fa-chevron-right" style="color: #d1d5db; font-size: 14px;"></i>
                    </div>

                    <!-- Analytics (Drivers) -->
                    <div onclick="deliveryApp.navigateToPage('driver-analytics')" style="
                        display: flex;
                        align-items: center;
                        padding: 16px 20px;
                        cursor: pointer;
                        transition: background-color 0.2s;
                    " onmouseover="this.style.backgroundColor='#f9fafb'" onmouseout="this.style.backgroundColor='transparent'">
                        <div style="
                            width: 40px;
                            height: 40px;
                            background: #f3f4f6;
                            border-radius: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-right: 16px;
                        ">
                            <i class="fas fa-chart-line" style="color: #6b7280; font-size: 18px;"></i>
                        </div>
                        <div style="flex: 1;">
                            <div style="
                                font-size: 16px;
                                font-weight: 500;
                                color: #111827;
                                margin-bottom: 2px;
                            ">Analytics</div>
                            <div style="
                                font-size: 13px;
                                color: #6b7280;
                            ">Daily and monthly performance</div>
                        </div>
                        <i class="fas fa-chevron-right" style="color: #d1d5db; font-size: 14px;"></i>
                    </div>

                    <!-- Account Info -->
                    <div style="
                        display: flex;
                        align-items: center;
                        padding: 16px 20px;
                    ">
                        <div style="
                            width: 40px;
                            height: 40px;
                            background: #f3f4f6;
                            border-radius: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-right: 16px;
                        ">
                            <i class="fas fa-user-circle" style="color: #6b7280; font-size: 18px;"></i>
                        </div>
                        <div style="flex: 1;">
                            <div style="
                                font-size: 16px;
                                font-weight: 500;
                                color: #111827;
                                margin-bottom: 2px;
                            " data-translate="accountInfo">${window.t ? window.t('accountInfo') : 'Account Info'}</div>
                            <div style="
                                font-size: 13px;
                                color: #6b7280;
                            ">${userEmail}</div>
                        </div>
                    </div>

                    <!-- Member Since -->
                    <div style="
                        display: flex;
                        align-items: center;
                        padding: 16px 20px;
                    ">
                        <div style="
                            width: 40px;
                            height: 40px;
                            background: #f3f4f6;
                            border-radius: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-right: 16px;
                        ">
                            <i class="fas fa-calendar-alt" style="color: #6b7280; font-size: 18px;"></i>
                        </div>
                        <div style="flex: 1;">
                            <div style="
                                font-size: 16px;
                                font-weight: 500;
                                color: #111827;
                                margin-bottom: 2px;
                            " data-translate="memberSince">${window.t ? window.t('memberSince') : 'Member Since'}</div>
                            <div style="
                                font-size: 13px;
                                color: #6b7280;
                            ">${joinDate}</div>
                        </div>
                    </div>
                </div>

                <!-- Support Section -->
                <div style="
                    padding: 8px 0;
                    border-bottom: 1px solid #f3f4f6;
                ">
                    <div style="
                        padding: 0 20px 8px;
                        font-size: 13px;
                        font-weight: 600;
                        color: #9ca3af;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    " data-translate="support">${window.t ? window.t('support') : 'Support'}</div>

                    <!-- Help Center -->
                    <div style="
                        display: flex;
                        align-items: center;
                        padding: 16px 20px;
                        cursor: pointer;
                        transition: background-color 0.2s;
                    " onmouseover="this.style.backgroundColor='#f9fafb'" onmouseout="this.style.backgroundColor='transparent'">
                        <div style="
                            width: 40px;
                            height: 40px;
                            background: #f3f4f6;
                            border-radius: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-right: 16px;
                        ">
                            <i class="fas fa-question-circle" style="color: #6b7280; font-size: 18px;"></i>
                        </div>
                        <div style="flex: 1;">
                            <div style="
                                font-size: 16px;
                                font-weight: 500;
                                color: #111827;
                                margin-bottom: 2px;
                            ">Help Center</div>
                            <div style="
                                font-size: 13px;
                                color: #6b7280;
                            ">Get help and support</div>
                        </div>
                        <i class="fas fa-chevron-right" style="color: #d1d5db; font-size: 14px;"></i>
                    </div>

                    <!-- About -->
                    <div style="
                        display: flex;
                        align-items: center;
                        padding: 16px 20px;
                        cursor: pointer;
                        transition: background-color 0.2s;
                    " onmouseover="this.style.backgroundColor='#f9fafb'" onmouseout="this.style.backgroundColor='transparent'">
                        <div style="
                            width: 40px;
                            height: 40px;
                            background: #f3f4f6;
                            border-radius: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-right: 16px;
                        ">
                            <i class="fas fa-info-circle" style="color: #6b7280; font-size: 18px;"></i>
                        </div>
                        <div style="flex: 1;">
                            <div style="
                                font-size: 16px;
                                font-weight: 500;
                                color: #111827;
                                margin-bottom: 2px;
                            ">About</div>
                            <div style="
                                font-size: 13px;
                                color: #6b7280;
                            ">App version and info</div>
                        </div>
                        <i class="fas fa-chevron-right" style="color: #d1d5db; font-size: 14px;"></i>
                    </div>
                </div>

                <!-- Logout Section -->
                <div style="padding: 16px 0;">
                    <div class="logout-btn" style="
                        display: flex;
                        align-items: center;
                        padding: 16px 20px;
                        cursor: pointer;
                        transition: background-color 0.2s;
                    " onmouseover="this.style.backgroundColor='#fef2f2'" onmouseout="this.style.backgroundColor='transparent'">
                        <div style="
                            width: 40px;
                            height: 40px;
                            background: #fee2e2;
                            border-radius: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-right: 16px;
                        ">
                            <i class="fas fa-sign-out-alt" style="color: #ef4444; font-size: 18px;"></i>
                        </div>
                        <div style="flex: 1;">
                            <div style="
                                font-size: 16px;
                                font-weight: 500;
                                color: #ef4444;
                                margin-bottom: 2px;
                            ">Logout</div>
                            <div style="
                                font-size: 13px;
                                color: #f87171;
                            ">Sign out of your account</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Bind logout functionality
        const logoutBtn = profileContainer.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        console.log('Profile updated with mobile-friendly design v2');
    }

    // Open language selection modal
    openLanguageModal() {
        // Remove any existing modal
        const existingModal = document.getElementById('language-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const currentLang = window.i18n ? window.i18n.getCurrentLanguage() : 'en';
        const modalHTML = `
            <div id="language-modal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                backdrop-filter: blur(4px);
            ">
                <div style="
                    background: white;
                    border-radius: 16px;
                    width: 90%;
                    max-width: 400px;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                ">
                    <!-- Header -->
                    <div style="
                        padding: 24px 24px 16px;
                        border-bottom: 1px solid #f3f4f6;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <h3 style="
                            margin: 0;
                            font-size: 20px;
                            font-weight: 600;
                            color: #111827;
                        " data-translate="languageModal">${window.t ? window.t('languageModal') : 'Language Selection'}</h3>
                        <button onclick="document.getElementById('language-modal').remove()" style="
                            background: none;
                            border: none;
                            font-size: 24px;
                            color: #6b7280;
                            cursor: pointer;
                            padding: 4px;
                            border-radius: 6px;
                            transition: background-color 0.2s;
                        " onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor='transparent'">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <!-- Language Options -->
                    <div style="padding: 24px;">
                        <div class="language-option ${currentLang === 'en' ? 'selected' : ''}" data-lang="en" style="
                            display: flex;
                            align-items: center;
                            padding: 16px;
                            border: 2px solid ${currentLang === 'en' ? '#3b82f6' : '#e5e7eb'};
                            border-radius: 12px;
                            cursor: pointer;
                            transition: all 0.2s;
                            margin-bottom: 12px;
                            background: ${currentLang === 'en' ? '#eff6ff' : 'white'};
                        " onmouseover="if(!this.classList.contains('selected')) this.style.borderColor='#d1d5db'" onmouseout="if(!this.classList.contains('selected')) this.style.borderColor='#e5e7eb'">
                            <div style="
                                font-size: 32px;
                                margin-right: 16px;
                            ">🇺🇸</div>
                            <div style="flex: 1;">
                                <h4 style="
                                    margin: 0 0 4px 0;
                                    font-size: 16px;
                                    font-weight: 600;
                                    color: #111827;
                                " data-translate="english">${window.t ? window.t('english') : 'English'}</h4>
                                <p style="
                                    margin: 0;
                                    font-size: 14px;
                                    color: #6b7280;
                                ">English</p>
                            </div>
                            <div style="
                                color: #3b82f6;
                                font-size: 20px;
                                opacity: ${currentLang === 'en' ? '1' : '0'};
                                transition: opacity 0.2s;
                            ">
                                <i class="fas fa-check"></i>
                            </div>
                        </div>

                        <div class="language-option ${currentLang === 'gr' ? 'selected' : ''}" data-lang="gr" style="
                            display: flex;
                            align-items: center;
                            padding: 16px;
                            border: 2px solid ${currentLang === 'gr' ? '#3b82f6' : '#e5e7eb'};
                            border-radius: 12px;
                            cursor: pointer;
                            transition: all 0.2s;
                            background: ${currentLang === 'gr' ? '#eff6ff' : 'white'};
                        " onmouseover="if(!this.classList.contains('selected')) this.style.borderColor='#d1d5db'" onmouseout="if(!this.classList.contains('selected')) this.style.borderColor='#e5e7eb'">
                            <div style="
                                font-size: 32px;
                                margin-right: 16px;
                            ">🇬🇷</div>
                            <div style="flex: 1;">
                                <h4 style="
                                    margin: 0 0 4px 0;
                                    font-size: 16px;
                                    font-weight: 600;
                                    color: #111827;
                                " data-translate="greek">${window.t ? window.t('greek') : 'Greek'}</h4>
                                <p style="
                                    margin: 0;
                                    font-size: 14px;
                                    color: #6b7280;
                                ">Ελληνικά</p>
                            </div>
                            <div style="
                                color: #3b82f6;
                                font-size: 20px;
                                opacity: ${currentLang === 'gr' ? '1' : '0'};
                                transition: opacity 0.2s;
                            ">
                                <i class="fas fa-check"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add click handlers for language options
        const languageOptions = document.querySelectorAll('#language-modal .language-option');
        languageOptions.forEach(option => {
            option.addEventListener('click', async () => {
                const selectedLang = option.getAttribute('data-lang');

                // Remove selected class and styling from all options
                languageOptions.forEach(opt => {
                    opt.classList.remove('selected');
                    opt.style.borderColor = '#e5e7eb';
                    opt.style.background = 'white';
                    opt.querySelector('div:last-child').style.opacity = '0';
                });

                // Add selected class and styling to clicked option
                option.classList.add('selected');
                option.style.borderColor = '#3b82f6';
                option.style.background = '#eff6ff';
                option.querySelector('div:last-child').style.opacity = '1';

                // Change language
                if (window.i18n) {
                    const success = await window.i18n.setLanguage(selectedLang);
                    if (success) {
                        this.showToast(
                            window.t ? window.t('settingsSaved') : 'Language changed successfully!',
                            'success'
                        );

                        // Close modal after a short delay
                        setTimeout(() => {
                            document.getElementById('language-modal').remove();
                        }, 500);
                    } else {
                        this.showToast('Failed to change language', 'error');
                    }
                }
            });
        });

        // Close modal when clicking outside
        document.getElementById('language-modal').addEventListener('click', (e) => {
            if (e.target.id === 'language-modal') {
                document.getElementById('language-modal').remove();
            }
        });
    }

    // Open settings modal from profile page
    openSettingsModal() {
        const modalHTML = `
            <div id="settings-modal" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            ">
                <div style="
                    background: white;
                    border-radius: 16px;
                    width: 100%;
                    max-width: 500px;
                    max-height: 90vh;
                    overflow-y: auto;
                    position: relative;
                ">
                    <!-- Header -->
                    <div style="
                        padding: 24px 24px 16px;
                        border-bottom: 1px solid #e5e7eb;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    ">
                        <h2 style="
                            margin: 0;
                            font-size: 20px;
                            font-weight: 700;
                            color: #111827;
                        ">Settings</h2>
                        <button onclick="document.getElementById('settings-modal').remove()" style="
                            background: none;
                            border: none;
                            font-size: 24px;
                            color: #6b7280;
                            cursor: pointer;
                            padding: 4px;
                        ">×</button>
                    </div>

                    <!-- Content -->
                    <div style="padding: 24px;">
                        <!-- Earnings Settings -->
                        <div style="margin-bottom: 24px;">
                            <h3 style="
                                margin: 0 0 8px 0;
                                font-size: 16px;
                                font-weight: 600;
                                color: #111827;
                            ">Earnings Settings</h3>
                            <p style="
                                margin: 0 0 16px 0;
                                font-size: 14px;
                                color: #6b7280;
                            ">Set your default earnings per order</p>

                            <form id="settings-modal-form">
                                <div style="margin-bottom: 16px;">
                                    <label style="
                                        display: block;
                                        font-size: 14px;
                                        font-weight: 500;
                                        color: #374151;
                                        margin-bottom: 6px;
                                    ">Default Earnings per Order</label>
                                    <div style="
                                        display: flex;
                                        align-items: center;
                                        border: 1px solid #d1d5db;
                                        border-radius: 8px;
                                        overflow: hidden;
                                    ">
                                        <span style="
                                            background: #f9fafb;
                                            padding: 12px;
                                            color: #6b7280;
                                            font-weight: 500;
                                        ">€</span>
                                        <input
                                            type="number"
                                            id="modal-earnings-input"
                                            step="0.01"
                                            min="0"
                                            value="${this.settings?.earningsPerOrder || '1.50'}"
                                            style="
                                                flex: 1;
                                                border: none;
                                                padding: 12px;
                                                font-size: 16px;
                                                outline: none;
                                            "
                                        >
                                    </div>
                                </div>

                                <button type="submit" style="
                                    width: 100%;
                                    background: #ff6b35;
                                    color: white;
                                    border: none;
                                    padding: 12px 16px;
                                    border-radius: 8px;
                                    font-size: 16px;
                                    font-weight: 600;
                                    cursor: pointer;
                                    transition: background-color 0.2s;
                                " onmouseover="this.style.background='#e55a2b'" onmouseout="this.style.background='#ff6b35'">
                                    <i class="fas fa-save" style="margin-right: 8px;"></i>
                                    Save Settings
                                </button>
                            </form>
                        </div>

                        <!-- Team Shops -->
                        <div>
                            <h3 style="
                                margin: 0 0 8px 0;
                                font-size: 16px;
                                font-weight: 600;
                                color: #111827;
                            ">Team Shops</h3>
                            <p style="
                                margin: 0 0 16px 0;
                                font-size: 14px;
                                color: #6b7280;
                            ">Shops where you're a team member</p>

                            <div id="modal-shops-container">
                                ${this.renderShopsForModal()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Bind form submission
        const form = document.getElementById('settings-modal-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const earningsInput = document.getElementById('modal-earnings-input');
                if (earningsInput) {
                    const newEarnings = parseFloat(earningsInput.value) || 0;

                    try {
                        const response = await fetch('/api/user/settings', {
                            method: 'PATCH',
                            headers: {
                                'Authorization': `Bearer ${this.sessionToken}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                earnings_per_order: newEarnings
                            })
                        });

                        if (response.ok) {
                            this.settings = this.settings || {};
                            this.settings.earningsPerOrder = newEarnings;
                            this.showToast('Settings saved successfully!', 'success');
                            document.getElementById('settings-modal').remove();
                            // Refresh profile to show updated earnings
                            this.updateProfileDisplay();
                        } else {
                            throw new Error('Failed to save settings');
                        }
                    } catch (error) {
                        console.error('Error saving settings:', error);
                        this.showToast('Failed to save settings', 'error');
                    }
                }
            });
        }
    }

    renderShopsForModal() {
        if (!this.shops || this.shops.length === 0) {
            return `
                <div style="
                    text-align: center;
                    padding: 24px;
                    color: #6b7280;
                    background: #f9fafb;
                    border-radius: 8px;
                    border: 2px dashed #d1d5db;
                ">
                    <i class="fas fa-store" style="font-size: 24px; margin-bottom: 8px;"></i>
                    <p style="margin: 0; font-size: 14px;">No team shops yet</p>
                    <p style="margin: 4px 0 0 0; font-size: 12px;">Contact shop owners to join their team</p>
                </div>
            `;
        }

        return this.shops.map(shop => `
            <div style="
                display: flex;
                align-items: center;
                padding: 12px;
                background: #f9fafb;
                border-radius: 8px;
                margin-bottom: 8px;
            ">
                <div style="
                    width: 40px;
                    height: 40px;
                    background: #ff6b35;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 12px;
                ">
                    <i class="fas fa-store" style="color: white; font-size: 16px;"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #111827; font-size: 14px;">${shop.shop_name || shop.name}</div>
                    <div style="color: #6b7280; font-size: 12px;">Active Team Member</div>
                </div>
            </div>
        `).join('');
    }

    // Load Recent Orders Page - ULTRA OPTIMIZED for maximum speed
    async loadRecentOrdersPage(force = false) {
        const recentPage = document.getElementById('recent-page');
        if (!recentPage) return;

        const container = document.getElementById('recent-orders-content');
        if (!container) return;

        try {
            const now = Date.now();
            const cacheFreshMs = 3 * 60 * 1000; // 3 minute client cache
            let orders, fromCache = false;

            // Check client cache first
            if (!force && this._recentOrdersCache && (now - this._recentOrdersCache.time < cacheFreshMs)) {
                orders = this._recentOrdersCache.data;
                fromCache = true;
            }

            // If we have cached data, render it INSTANTLY while fetching fresh data in background
            if (fromCache) {
                this.renderRecentOrdersInstant(container, orders);

                // Background refresh (don't await - fire and forget)
                this.refreshRecentOrdersBackground();
                return;
            }

            // Show skeleton loading only for fresh data
            container.innerHTML = this.createRecentOrdersSkeleton();

            // Fetch fresh data
            const response = await fetch('/api/recent-orders', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch recent orders');
            }

            const result = await response.json();
            orders = result.orders || [];

            // Cache the results
            this._recentOrdersCache = { time: now, data: orders };

            if (!orders || orders.length === 0) {
                container.innerHTML = `
                    <div style="
                        text-align: center;
                        padding: 60px 20px;
                        color: #6b7280;
                    ">
                        <i class="fas fa-clock" style="font-size: 48px; margin-bottom: 16px; color: #d1d5db;"></i>
                        <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #374151;">No Recent Orders</h3>
                        <p style="margin: 0; font-size: 14px;">Recent accepted orders will appear here</p>
                    </div>
                `;
                return;
            }

            // Ultra-fast rendering with optimized DOM operations
            this.renderRecentOrdersOptimized(container, orders);

        } catch (error) {
            console.error('Error loading recent orders:', error);
            container.innerHTML = `
                <div style="
                    text-align: center;
                    padding: 40px 20px;
                    color: #ef4444;
                ">
                    <i class="fas fa-exclamation-triangle" style="font-size: 32px; margin-bottom: 12px;"></i>
                    <h3 style="margin: 0 0 8px 0; font-size: 16px;">Failed to Load Orders</h3>
                    <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280;">Unable to fetch recent orders</p>
                    <button onclick="deliveryApp.loadRecentOrdersPage(true)" style="
                        background: #ff6b35;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 6px;
                        font-size: 14px;
                        cursor: pointer;
                    ">Try Again</button>
                </div>
            `;
        }
    }

    // Create skeleton loading for Recent orders (ultra-fast perceived performance)
    createRecentOrdersSkeleton() {
        const skeletonCard = `
            <div style="
                margin-bottom: 12px;
                background: #ffffff;
                border-radius: 12px;
                border: 1px solid #e5e7eb;
                overflow: hidden;
                padding: 16px;
            ">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <div style="
                        width: 120px;
                        height: 20px;
                        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                        background-size: 200% 100%;
                        animation: shimmer 1.5s infinite;
                        border-radius: 4px;
                    "></div>
                    <div style="
                        width: 60px;
                        height: 20px;
                        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                        background-size: 200% 100%;
                        animation: shimmer 1.5s infinite;
                        border-radius: 4px;
                    "></div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    ${Array(4).fill().map(() => `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="
                                width: 24px;
                                height: 24px;
                                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                                background-size: 200% 100%;
                                animation: shimmer 1.5s infinite;
                                border-radius: 4px;
                            "></div>
                            <div style="
                                width: 80px;
                                height: 16px;
                                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                                background-size: 200% 100%;
                                animation: shimmer 1.5s infinite;
                                border-radius: 4px;
                            "></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        return `
            <style>
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            </style>
            <div style="
                background: #f8fafc;
                padding: 16px;
                border-radius: 12px;
                margin-bottom: 16px;
                text-align: center;
            ">
                <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #374151;">Recent Activity</h3>
                <p style="margin: 0; font-size: 14px; color: #6b7280;">Loading latest orders...</p>
            </div>
            ${Array(6).fill(skeletonCard).join('')}
        `;
    }

    // Instant rendering for cached data (zero delay)
    renderRecentOrdersInstant(container, orders) {
        const headerHTML = `
            <div style="
                background: #f8fafc;
                padding: 16px;
                border-radius: 12px;
                margin-bottom: 16px;
                text-align: center;
            ">
                <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #374151;">Recent Activity</h3>
                <p style="margin: 0; font-size: 14px; color: #6b7280;">Last 20 accepted & completed orders (cached)</p>
            </div>
        `;

        // Render all at once for cached data (instant)
        const ordersHTML = (orders || [])
            .filter(o => o && o.id && o.created_at)
            .map(o => { try { return this.createRecentOrderCard(o); } catch (e) { console.warn('Skipping corrupt recent order', o?.id, e); return ''; } })
            .join('');
        container.innerHTML = headerHTML + ordersHTML;
    }

    // Optimized rendering with immediate first paint
    renderRecentOrdersOptimized(container, orders) {
        const headerHTML = `
            <div style="
                background: #f8fafc;
                padding: 16px;
                border-radius: 12px;
                margin-bottom: 16px;
                text-align: center;
            ">
                <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #374151;">Recent Activity</h3>
                <p style="margin: 0; font-size: 14px; color: #6b7280;">Last 20 accepted & completed orders (fresh)</p>
            </div>
            <div id="recent-orders-list"></div>
        `;

        container.innerHTML = headerHTML;
        const listEl = document.getElementById('recent-orders-list');

        // Render first 8 cards immediately for instant feedback
        const firstBatch = orders.slice(0, 8);
        const firstHTML = firstBatch
            .filter(o => o && o.id && o.created_at)
            .map(o => { try { return this.createRecentOrderCard(o); } catch (e) { console.warn('Skipping corrupt recent order', o?.id, e); return ''; } })
            .join('');
        listEl.innerHTML = firstHTML;

        // Render remaining cards in next frame
        if (orders.length > 8) {
            requestAnimationFrame(() => {
                const remainingHTML = orders.slice(8)
                    .filter(o => o && o.id && o.created_at)
                    .map(o => { try { return this.createRecentOrderCard(o); } catch (e) { console.warn('Skipping corrupt recent order', o?.id, e); return ''; } })
                    .join('');
                listEl.insertAdjacentHTML('beforeend', remainingHTML);
            });
        }
    }

    // Background refresh for cached data (silent update)
    async refreshRecentOrdersBackground() {
        try {
            const response = await fetch('/api/recent-orders', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                const orders = result.orders || [];

                // Update cache silently
                this._recentOrdersCache = { time: Date.now(), data: orders };

                console.log('Recent orders refreshed in background');
            }
        } catch (error) {
            console.log('Background refresh failed:', error);
        }
    }

    // Update recent orders cache when order status changes
    updateRecentOrdersCache(order, action) {
        if (!this._recentOrdersCache || !this._recentOrdersCache.data) {
            console.log('No recent orders cache to update');
            return;
        }

        const orders = this._recentOrdersCache.data;
        const existingIndex = orders.findIndex(o => o.id === order.id);

        if (action === 'accepted') {
            // Add new accepted order to the beginning
            if (existingIndex === -1) {
                orders.unshift(order);
                // Keep only last 20 orders
                if (orders.length > 20) {
                    orders.splice(20);
                }
                console.log('Added new accepted order to recent orders cache');
            }
        } else if (action === 'completed') {
            // Update existing order status to completed
            if (existingIndex !== -1) {
                orders[existingIndex] = { ...orders[existingIndex], ...order, status: 'delivered' };
                console.log('Updated order status to completed in recent orders cache');
            }
        }

        // Update cache timestamp
        this._recentOrdersCache.time = Date.now();
    }

    // Create recent order card (display only, no management buttons) - matches History page exactly
    createRecentOrderCard(order) {
        const shopName = order.shop_name || 'Unknown Shop';
        const timeAgo = this.formatTimeAgo(order.created_at);
        const orderPrice = parseFloat(order.order_amount || 0).toFixed(2);

        // Determine status color and text (same as History page)
        const statusColor = order.status === 'assigned' ? '#f59e0b' :
                          order.status === 'picked_up' ? '#3b82f6' :
                          order.status === 'delivered' ? '#10b981' : '#6b7280';

        const statusText = order.status === 'assigned' ? 'Assigned' :
                         order.status === 'picked_up' ? 'Picked Up' :
                         order.status === 'delivered' ? 'Delivered' : 'Unknown';

        // Parse preparation time (same as History page)
        const prepTime = order.preparation_time || 0;
        const prepTimeText = prepTime === 0 ? 'Now' : `${prepTime} min`;
        const prepTimeIcon = prepTime === 0 ? 'bolt' :
                           prepTime <= 5 ? 'clock' :
                           prepTime <= 10 ? 'hourglass-half' : 'pause-circle';
        const prepTimeColor = prepTime === 0 ? '#10b981' :
                            prepTime <= 5 ? '#f59e0b' :
                            prepTime <= 10 ? '#3b82f6' : '#ef4444';

        return `
            <div style="
                margin-bottom: 12px;
                background: #ffffff;
                border-radius: 12px;
                border: 1px solid #e5e7eb;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                transition: all 0.2s ease;
            "
            data-order-id="${order.id}" class="order-card-clickable"
            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(0, 0, 0, 0.1)'"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 3px rgba(0, 0, 0, 0.05)'">
                <!-- Header -->
                <div class="order-header" style="
                    background: linear-gradient(135deg, ${statusColor}12 0%, ${statusColor}06 100%);
                    padding: 12px 16px;
                    border-bottom: 1px solid #f3f4f6;
                ">
                    <div style="display: flex; align-items: flex-start; justify-content: space-between; width: 100%;">
                        <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                            <div style="
                                width: 32px;
                                height: 32px;
                                background: ${statusColor};
                                border-radius: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                ${order._displayIndex != null ? `<span style=\"color: white; font-weight: 800; font-size: 13px;\">${order._displayIndex}</span>` : `<i class=\"fas fa-shopping-bag\" style=\"color: white; font-size: 14px;\"></i>`}
                            </div>
                            <div>
                                <h3 style="
                                    margin: 0 0 2px 0;
                                    font-size: 16px;
                                    font-weight: 700;
                                    color: #111827;
                                    line-height: 1.2;
                                ">Order #${order.id}</h3>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="
                                        color: #6b7280;
                                        font-size: 12px;
                                    ">${timeAgo}</span>
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; min-width: 80px;">
                            ${ (this.getPaymentMethodDisplay(order.payment_method) === 'Paid' || parseFloat(order.order_amount || 0) === 0) ? `
                                <div style="
                                    font-size: 12px;
                                    font-weight: 700;
                                    color: #0ea5e9;
                                    line-height: 1;
                                    text-align: right;
                                    background: #e0f2fe;
                                    padding: 4px 8px;
                                    border-radius: 6px;
                                ">Card</div>
                            ` : `
                                <div style="
                                    font-size: 18px;
                                    font-weight: 700;
                                    color: #111827;
                                    line-height: 1;
                                    text-align: right;
                                ">€${orderPrice}</div>
                            `}
                            <span style="
                                background: ${statusColor};
                                color: white;
                                padding: 4px 8px;
                                border-radius: 6px;
                                font-size: 11px;
                                font-weight: 600;
                                display: inline-block;
                            ">${statusText}</span>
                        </div>
                    </div>
                </div>

                <!-- Order Details -->
                <div style="padding: 14px 16px;">
                    <!-- 2x2 Grid Layout -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px 20px; margin-bottom: 14px;">
                        <!-- Phone -->
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="
                                width: 32px;
                                height: 32px;
                                background: #dbeafe;
                                border-radius: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <i class="fas fa-phone" style="color: #3b82f6; font-size: 13px;"></i>
                            </div>
                            <div>
                                <div style="font-weight: 600; color: #111827; font-size: 13px; line-height: 1.2;">${order.customer_phone || 'Not provided'}</div>
                                <div style="color: #6b7280; font-size: 11px;">Phone</div>
                            </div>
                        </div>

                        <!-- Shop -->
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="
                                width: 32px;
                                height: 32px;
                                background: #fff7ed;
                                border-radius: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <i class="fas fa-store" style="color: #ff6b35; font-size: 13px;"></i>
                            </div>
                            <div>
                                <div style="font-weight: 600; color: #111827; font-size: 13px; line-height: 1.2;">${shopName}</div>
                                <div style="color: #6b7280; font-size: 11px;">Shop</div>
                            </div>
                        </div>

                        <!-- Address -->
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="
                                width: 32px;
                                height: 32px;
                                background: #fef3c7;
                                border-radius: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <i class="fas fa-map-marker-alt" style="color: #f59e0b; font-size: 13px;"></i>
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 600; color: #111827; font-size: 13px; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${order.delivery_address || 'Not provided'}</div>
                                <div style="color: #6b7280; font-size: 11px;">Address</div>
                            </div>
                        </div>

                        <!-- Driver -->
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="
                                width: 32px;
                                height: 32px;
                                background: #e0e7ff;
                                border-radius: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <i class="fas fa-user" style="color: #6366f1; font-size: 13px;"></i>
                            </div>
                            <div>
                                <div style="font-weight: 600; color: #111827; font-size: 13px; line-height: 1.2;">${order.driver_name || order.driver_email || (order.driver_id ? `Driver #${order.driver_id}` : 'Unknown')}</div>
                                <div style="color: #6b7280; font-size: 11px;">Driver</div>
                            </div>
                        </div>
                    </div>

                    <!-- Notes Section -->
                    <div style="
                        background: #f8fafc;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        padding: 12px;
                        margin-bottom: 14px;
                        text-align: center;
                    ">
                        ${order.notes ? `
                            <p style="margin: 0; color: #374151; font-size: 13px; line-height: 1.4; font-style: italic;">"${order.notes}"</p>
                        ` : `
                            <p style="margin: 0; color: #9ca3af; font-size: 13px;">No Notes</p>
                        `}
                    </div>

                    <!-- Status Display (no action buttons for Recent page) -->
                    ${(() => {
                        // Dynamic panel colors by status
                        let bg='#dcfce7', br='#bbf7d0', ic='#10b981', tx='#065f46';
                        if (order.status === 'assigned') { bg = '#fef3c7'; br = '#fde68a'; ic = '#d97706'; tx = '#92400e'; }
                        else if (order.status === 'picked_up') { bg = '#dbeafe'; br = '#bfdbfe'; ic = '#3b82f6'; tx = '#1d4ed8'; }
                        return `
                        <div style="background:${bg}; border:1px solid ${br}; border-radius:8px; padding:12px; text-align:center;">
                            <i class=\"fas fa-info-circle\" style=\"color: ${ic}; font-size: 16px; margin-right: 6px;\"></i>
                            <span style=\"color: ${tx}; font-weight: 600; font-size: 14px;\">Order ${statusText}</span>
                        </div>`;
                    })()}

                </div>
            </div>
        `;
    }

    // Initialize audio for notifications
    initializeAudio() {
        try {
            // Create audio context for notification sounds
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create notification sound using Web Audio API
            this.createNotificationSound();

            console.log('🔊 Audio initialized for notifications');
        } catch (error) {
            console.warn('⚠️ Audio not available:', error);
        }
    }

    // Create notification sound using Web Audio API
    createNotificationSound() {
        if (!this.audioContext) return;

        try {
            // Create a simple notification sound (two-tone)
            this.notificationAudio = () => {
                if (!this.isAudioEnabled) return;

                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);

                // First tone
                oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
                oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);

                gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + 0.3);
            };
        } catch (error) {
            console.warn('⚠️ Could not create notification sound:', error);
        }
    }

    // Enhanced notification sound system
    async playNotificationSound(strong = false) {
            if (!this.isAudioEnabled) return;

        try {
            const ctx = this.audioContext || new (window.AudioContext || window.webkitAudioContext)();
                const now = ctx.currentTime;

            if (strong) {
                // Melodic chime sequence for important notifications (C5, E5, G5)
                const notes = [523.25, 659.25, 783.99];
                notes.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + i * 0.15);
                    gain.gain.setValueAtTime(0.3 * this.soundVolume, now + i * 0.15);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15 + i * 0.15);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + i * 0.15);
                    osc.stop(now + 0.15 + i * 0.15);
                });
            } else if (this.notificationAudio) {
                // Regular notification sound
                this.notificationAudio();
            }

            console.log(`🔊 Played ${strong ? 'strong' : 'regular'} notification sound`);
            } catch (error) {
            console.warn('⚠️ Could not play notification sound:', error);
        }
    }

    // Play confirmation sound for successful actions
    async playConfirmationSound() {
        if (!this.isAudioEnabled) return;

        try {
            const ctx = this.audioContext || new (window.AudioContext || window.webkitAudioContext)();
            const now = ctx.currentTime;

            // Success chime: C5, G5, C6 (major chord progression)
            const confirmationNotes = [523.25, 783.99, 1046.50];
            confirmationNotes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + i * 0.1);
                gain.gain.setValueAtTime(0.25 * this.soundVolume, now + i * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2 + i * 0.1);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + i * 0.1);
                osc.stop(now + 0.2 + i * 0.1);
            });

            console.log('🎵 Played confirmation sound');
        } catch (error) {
            console.warn('⚠️ Could not play confirmation sound:', error);
        }
    }

    // Play delete/warning sound
    async playWarningSound() {
        if (!this.isAudioEnabled) return;

        try {
            const ctx = this.audioContext || new (window.AudioContext || window.webkitAudioContext)();
            const now = ctx.currentTime;

            // Warning tone: descending notes (G5, E5, C5)
            const warningNotes = [783.99, 659.25, 523.25];
            warningNotes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, now + i * 0.12);
                gain.gain.setValueAtTime(0.2 * this.soundVolume, now + i * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15 + i * 0.12);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + i * 0.12);
                osc.stop(now + 0.15 + i * 0.12);
            });

            console.log('⚠️ Played warning sound');
        } catch (error) {
            console.warn('⚠️ Could not play warning sound:', error);
        }
    }

    // Connect to WebSocket server
    connectWebSocket() {
        if (!this.userId) {
            console.warn('⚠️ No user ID found, cannot connect to WebSocket');
            return;
        }

        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;

            console.log('🔌 Connecting to WebSocket:', wsUrl);

            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('✅ WebSocket connected');

                // Reset reconnection attempts on successful connection
                this.reconnectAttempts = 0;
                if (this.reconnectTimeout) {
                    clearTimeout(this.reconnectTimeout);
                    this.reconnectTimeout = null;
                }

                // Authenticate with server (include session token for resilience)
                this.ws.send(JSON.stringify({
                    type: 'authenticate',
                    userId: this.userId,
                    userType: 'driver',
                    sessionToken: this.sessionToken
                }));
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('❌ Error parsing WebSocket message:', error);
                }
            };

            this.ws.onclose = (event) => {
                console.log('🔌 WebSocket disconnected:', event.code, event.reason);

                // Clear heartbeat interval
                if (this.sessionHeartbeatInterval) {
                    clearInterval(this.sessionHeartbeatInterval);
                    this.sessionHeartbeatInterval = null;
                }

                // Implement exponential backoff for reconnection
                if (!this.reconnectAttempts) this.reconnectAttempts = 0;
                const backoffTime = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Max 30 seconds

                console.log(`🔄 Attempting reconnection in ${backoffTime}ms (attempt ${this.reconnectAttempts + 1})`);

                this.reconnectTimeout = setTimeout(() => {
                    if (this.userId) {
                        this.reconnectAttempts++;
                        this.connectWebSocket();
                    }
                }, backoffTime);
            };

            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
            };

            // Send session heartbeat every 30 seconds
            this.sessionHeartbeatInterval = setInterval(() => {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({
                        type: 'session_heartbeat',
                        userId: this.userId
                    }));
                }
            }, 30000);

        } catch (error) {
            console.error('❌ Failed to connect to WebSocket:', error);
        }
    }

    // Handle WebSocket messages
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'authenticated':
                console.log('👤 WebSocket authentication successful');
                break;

            case 'notification':
                console.log('🔔 Real-time notification received:', data.data);
                this.handleRealtimeNotification(data.data);
                // Update notifications memory
                this.addToMemory('notifications', data.data);
                break;

            case 'notification_count':
                console.log('🔢 Notification count update:', data.count);
                this.updateNotificationBadge(data.count);
                break;

            case 'order_removed':
                console.log('🗑️ Order removed:', data.order_id);
                this.handleOrderRemoved(data.order_id, data.accepted_by);
                break;

            case 'order_accepted':
                console.log('🎯 Order accepted:', data);
                this.handleOrderAccepted(data);
                break;

            case 'order_completed':
                console.log('✅ Order completed:', data);
                this.handleOrderCompleted(data);
                break;

            case 'session_conflict':
                console.log('⚠️ Session conflict detected:', data);
                this.handleSessionConflict(data);
                break;

            case 'force_logout':
                console.log('🚫 Force logout received:', data);
                this.handleForceLogout(data);
                break;

            case 'notification_update':
                console.log('🔄 Real-time notification update:', data);
                this.handleNotificationUpdate(data);
                break;

            case 'authentication_failed':
                console.log('❌ WebSocket authentication failed:', data);
                this.handleAuthenticationFailed(data);
                break;

            case 'order_update':
                this.handleOrderUpdate(data);
            default:
                console.log('📨 Unknown WebSocket message type:', data.type);
        }
    }

    // Handle order accepted (real-time memory update)
    handleOrderAccepted(data) {
        const orderId = data.order_id;
        const driverId = data.driver_id;

        // If this driver accepted the order, add to accepted orders memory
        if (driverId === this.userId && data.order) {
            this.addToMemory('acceptedOrders', data.order);
            console.log('🧠 Added accepted order to memory');

            // Update recent orders cache immediately
            this.updateRecentOrdersCache(data.order, 'accepted');
        }

        // Remove any notification referencing this order (by order_id)
        try {
            // Remove from in-memory list
            this.notifications = (this.notifications || []).filter(n => (String(n?.order_id) !== String(orderId)));
            if (this.currentPage === 'notifications') {
                this.renderNotifications(this.notifications);
                this.updateNotificationBadge(this.notifications.filter(n => !n.is_read).length);
            }
            // Remove from smart memory store
            if (this.smartMemory && this.smartMemory.notifications) {
                const mem = this.smartMemory.notifications;
                mem.data = (mem.data || []).filter(n => (String(n?.order_id) !== String(orderId)));
                mem.lastUpdate = Date.now();
            }
        } catch (_) {}


        // Update recent orders memory if needed
        if (data.order) {
            this.addToMemory('recentOrders', data.order);
        }

        // Refresh Recent Orders page if currently viewing it
        if (this.currentPage === 'recent') {
            this.loadRecentOrdersPage(false);
        }

        // Update Home recent activity feed
        this.updateRecentActivity();
    }

    // Handle order completed (real-time memory update)
    handleOrderCompleted(data) {
        const orderId = data.order_id;

        // Update the order status in accepted orders memory
        this.updateItemInMemory('acceptedOrders', orderId, { ...data.order, status: 'delivered' });

        // Update recent orders memory
        this.updateItemInMemory('recentOrders', orderId, { ...data.order, status: 'delivered' });

        // Also update recent orders cache (used by UI) so the item flips to completed
        if (data.order) {
            this.updateRecentOrdersCache({ ...data.order, status: 'delivered' }, 'completed');
        }

        // If user is on Recent page, refresh it instantly
        if (this.currentPage === 'recent') {
            this.loadRecentOrdersPage(false);
        }

        // Live update Home stats and recent activity
        this.updateStats();
        this.updateRecentActivity();

        console.log('🧠 Updated order status to delivered in memory and cache');
    }

    // Handle order removal (when another driver accepts it)
    handleOrderRemoved(orderId, acceptedBy) {
        console.log(`Order ${orderId} was accepted by driver ${acceptedBy}, removing from notifications`);

        // Remove the notification from local array
        const initialLength = this.notifications.length;
        this.notifications = this.notifications.filter(n => {
            // Remove notifications that match this order
            const message = this.unescapeHTML(n.message || '');
            const orderMatch = message.match(/Order #(\d+)/);
            const notificationOrderId = orderMatch ? orderMatch[1] : null;
            return notificationOrderId !== orderId.toString();
        });

        const removedCount = initialLength - this.notifications.length;
        if (removedCount > 0) {
            console.log(`Removed ${removedCount} notifications for order ${orderId}`);

            // Re-render notifications if on notifications page
            if (this.currentPage === 'notifications') {
                this.renderNotifications(this.notifications);
            }

            // Update notification badge
            this.updateNotificationBadge(this.notifications.filter(n => !n.is_read).length);

            // Show toast notification
            this.showToast(`Order #${orderId} was accepted by another driver`, 'info');
        }
    }

    // Handle case when server says the order was accepted by someone else
    handleOrderAlreadyAccepted(notificationId) {
        const idx = this.notifications.findIndex(n => n.id === parseInt(notificationId));
        if (idx !== -1) {
            const msg = this.unescapeHTML(this.notifications[idx].message || '');
            const orderMatch = msg.match(/Order #(\d+)/);
            const orderId = orderMatch ? orderMatch[1] : null;
            this.notifications.splice(idx, 1);
            if (this.currentPage === 'notifications') {
                this.renderNotifications(this.notifications);
            }
            if (orderId) this.showToast(`Order #${orderId} was accepted by another driver`, 'info');
        } else {
            this.showToast('Order already accepted by another driver', 'info');
        }
        this.updateNotificationBadge(this.notifications.filter(n => !n.is_read).length);
    }

    // Handle real-time notification update
    handleNotificationUpdate(data) {
        console.log('🔄 Delivery app received notification update:', data);
        const { action, notificationId, data: updateData } = data;

        // Find and update the notification
        const notificationIndex = this.notifications.findIndex(n => n.id === notificationId);
        if (notificationIndex !== -1) {
            if (action === 'confirmed') {
                this.notifications[notificationIndex].status = 'confirmed';
                this.notifications[notificationIndex].confirmed_at = updateData?.confirmed_at;
                // Play confirmation sound only - notification popup is handled elsewhere to prevent duplicates
                this.playConfirmationSound();
            } else if (action === 'deleted') {
                // Play warning sound only - notification popup is handled elsewhere to prevent duplicates
                this.playWarningSound();
                this.notifications.splice(notificationIndex, 1);
            } else if (action === 'edited') {
                // Play regular notification sound only - notification popup is handled elsewhere to prevent duplicates
                this.playNotificationSound(false);
                this.notifications[notificationIndex] = {
                    ...this.notifications[notificationIndex],
                    ...updateData
                };
            }

            // Re-render notifications if on notifications page
            if (this.currentPage === 'notifications') {
                this.renderNotifications(this.notifications);
            }

            // Update notification count
            this.updateNotificationBadge(this.notifications.filter(n => !n.is_read).length);
        }

        console.log(`🔄 Notification update processed: ${action} for ID ${notificationId}`);
    }

    // Handle notification confirmed
    handleNotificationConfirmed(notificationId, data) {
        const notificationIndex = this.notifications.findIndex(n => n.id === notificationId);
        if (notificationIndex !== -1) {
            this.notifications[notificationIndex] = {
                ...this.notifications[notificationIndex],
                status: 'confirmed',
                confirmed_at: data.confirmed_at
            };

            if (this.currentPage === 'notifications') {
                this.renderNotifications(this.notifications);
            }

            this.showToast('Notification confirmed successfully', 'success');
        }
    }

    // Handle notification deleted
    handleNotificationDeleted(notificationId) {
        const notificationIndex = this.notifications.findIndex(n => n.id === notificationId);
        if (notificationIndex !== -1) {
            this.notifications.splice(notificationIndex, 1);

            if (this.currentPage === 'notifications') {
                this.renderNotifications(this.notifications);
            }

            this.showToast('Notification deleted', 'info');
        }
    }

    // Handle notification edited
    handleNotificationEdited(notificationId, data) {
        const notificationIndex = this.notifications.findIndex(n => n.id === notificationId);
        if (notificationIndex !== -1) {
            this.notifications[notificationIndex] = {
                ...this.notifications[notificationIndex],
                ...data
            };

            if (this.currentPage === 'notifications') {
                this.renderNotifications(this.notifications);
            }

            this.showToast('Notification updated', 'info');
        }
    }

    // Handle real-time notification
    handleRealtimeNotification(notification) {
        console.log('🔔 Delivery app received real-time notification:', notification);

        // Defensive: ensure list exists
        if (!Array.isArray(this.notifications)) this.notifications = [];

        // Remove duplicate pending notification for same order (keep the latest)
        try {
            if (notification && notification.order_id) {
                const dupIdx = this.notifications.findIndex(n => n && n.order_id === notification.order_id && n.status === 'pending' && (notification.status === 'pending' || !notification.status) && n.id !== notification.id);
                if (dupIdx !== -1) {
                    console.log('🧹 Removing duplicate pending notification for order', notification.order_id);
                    this.notifications.splice(dupIdx, 1);
                }
            }
        } catch (_) {}

        // Check if notification already exists by ID
        const existingIndex = this.notifications.findIndex(n => n.id === notification.id);
        if (existingIndex !== -1) {
            // Update the existing notification in place
            this.notifications[existingIndex] = {
                ...this.notifications[existingIndex],
                ...notification
            };
            console.log('🔄 Updated existing notification');

            // Re-render notifications if on notifications page
            if (this.currentPage === 'notifications') {
                this.renderNotifications(this.notifications);
                // Always update menu counts after any notification change
                setTimeout(() => {
                    this.updateNotificationsMenuCounts();
                }, 100);
            }
        } else {
            // Add as new notification (real-time push)
            this.notifications.unshift(notification);
            console.log('➕ Added new notification');

        if (this.currentPage === 'notifications') {
            this.renderNotifications(this.notifications);
                // Always update menu counts after any notification change
                setTimeout(() => {
                    this.updateNotificationsMenuCounts();
                }, 100);
        }

            // Avoid duplicate in-app sound/popups when push notifications are enabled
            if (!this.isPushEnabled()) {
                this.playNotificationSound(true); // Fallback sound only when push not enabled
                this.showBrowserNotification(notification); // Fallback in-app popup
            }
            this.fetchNotificationCount();
        }

        // Update notification count
        this.updateNotificationBadge(this.notifications.filter(n => !n.is_read).length);

        // CRITICAL: Always update menu counts for live updates, even if not on notifications page
        setTimeout(() => {
            this.updateNotificationsMenuCounts();
        }, 150);
    }

    // Handle session conflict
    handleSessionConflict(data) {
        console.log('🔄 Handling session conflict:', data);

        // Immediately clear session data and close connections
        this.clearSessionData();

        // Close WebSocket connection immediately
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        // Clear session heartbeat interval
        if (this.sessionHeartbeatInterval) {
            clearInterval(this.sessionHeartbeatInterval);
            this.sessionHeartbeatInterval = null;
        }

        // Show session conflict modal immediately
        this.showSessionConflictModal(data);

        // Redirect to login page faster (1 second instead of 3)
        setTimeout(() => {
            window.location.href = '/login';
        }, 1000);
    }

    // Handle force logout
    handleForceLogout(data) {
        console.log('🚫 Handling force logout:', data);

        // Immediately clear session data
        this.clearSessionData();

        // Close WebSocket connection immediately
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        // Clear session heartbeat interval
        if (this.sessionHeartbeatInterval) {
            clearInterval(this.sessionHeartbeatInterval);
            this.sessionHeartbeatInterval = null;
        }

        // Show immediate logout notification
        this.showToast('Your session has been terminated due to new login', 'warning');

        // Show session conflict modal
        this.showSessionConflictModal({
            message: 'Your session has been terminated due to new login',
            newLoginTime: data.timestamp
        });

        // Redirect to login page immediately
        setTimeout(() => {
            window.location.href = '/login';
        }, 500);
    }

    // Handle authentication failed
    handleAuthenticationFailed(data) {
        console.log('❌ Handling authentication failed:', data);

        this.showToast('Session expired. Please log in again.', 'error');

        // Clear session data
        this.clearSessionData();

        // Close WebSocket connection
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        // Redirect to login page
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
    }

    // Clear session data
    clearSessionData() {
        localStorage.removeItem('userSession');
        localStorage.removeItem('deliveryAppUser');
        localStorage.removeItem('deliveryAppSession');
        localStorage.removeItem('deliveryAppSettings');
        console.log('🗑️ Session data cleared');
    }

    // Show session conflict modal
    showSessionConflictModal(data) {
        const modal = document.createElement('div');
        modal.className = 'modal show session-conflict-modal';
        modal.style.zIndex = '10000';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 450px; border: 2px solid #f59e0b;">
                <div class="modal-header" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white;">
                    <div class="modal-header-icon" style="background: rgba(255,255,255,0.2);">
                        <i class="fas fa-exclamation-triangle" style="color: white;"></i>
                    </div>
                    <div class="modal-header-text">
                        <h3 style="color: white; margin: 0;">Session Conflict</h3>
                        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Your account is being used elsewhere</p>
                    </div>
                    <button class="modal-close-btn" onclick="this.closest('.modal').remove();" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 5px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="padding: 24px;">
                    <div class="session-conflict-info">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <i class="fas fa-user-clock" style="font-size: 48px; color: #f59e0b; margin-bottom: 15px;"></i>
                        </div>
                        <p style="font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 15px;">
                            <strong>Someone else has logged into your account.</strong>
                        </p>
                        <p style="color: #6b7280; margin-bottom: 20px; line-height: 1.5;">
                            For security reasons, you have been automatically logged out.
                            This ensures only one person can use your account at a time.
                        </p>
                        <div class="conflict-details" style="background: #f3f4f6; padding: 12px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                            <small style="color: #6b7280;">
                                <i class="fas fa-clock"></i> New login time: ${new Date(data.newLoginTime).toLocaleString()}
                            </small>
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="padding: 20px 24px; border-top: 1px solid #e5e7eb;">
                    <button class="btn primary" onclick="window.location.href='/'" style="width: 100%; padding: 12px; font-size: 16px; font-weight: 600;">
                        <i class="fas fa-sign-in-alt"></i>
                        Go to Login Page
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Prevent closing by clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                // Don't close when clicking outside
                return;
            }
        });

        // Auto-remove modal after 8 seconds (longer to give user time to read)
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 8000);
    }

    // Show modern custom notification (replaces browser notifications)
    showBrowserNotification(notification) {
        console.log('🔔 Showing modern custom notification:', notification);

        // Always use custom notifications for better control and modern design
        this.showModernNotificationPopup(notification);
    }

    // Show ultra-brief modern notification popup
    showModernNotificationPopup(notification) {
        // Prevent duplicate notifications
        const existingNotification = document.querySelector('.modern-notification-popup');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Determine notification details based on action
        const action = notification.action || 'new';
        let accentColor, iconClass, message;

        switch (action) {
            case 'confirmed':
                accentColor = '#10b981';
                iconClass = 'fas fa-check-circle';
                message = '✅ Delivery confirmed';
                break;
            case 'deleted':
                accentColor = '#ef4444';
                iconClass = 'fas fa-trash-alt';
                message = '🗑️ Notification deleted';
                break;
            case 'edited':
                accentColor = '#3b82f6';
                iconClass = 'fas fa-edit';
                message = '✏️ Notification updated';
                break;
            default:
                accentColor = '#667eea';
                iconClass = 'fas fa-store';
                message = '🚚 New delivery request';
        }

        const toast = document.createElement('div');
        toast.className = 'modern-notification-popup';
        toast.style.cssText = `
            position: fixed;
            top: 16px;
            right: 16px;
            left: 16px;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.8);
            z-index: 10000;
            max-width: 320px;
            margin: 0 auto;
            transform: translateY(-80px) scale(0.9);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        `;

        toast.innerHTML = `
            <div style="padding: 12px 16px; display: flex; align-items: center; gap: 12px;">
                <div style="width: 36px; height: 36px; background: ${accentColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i class="${iconClass}" style="font-size: 16px; color: white;"></i>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 14px; color: #1f2937; line-height: 1.3;">
                        ${message}
                    </div>
                    <div style="font-size: 12px; color: #6b7280; margin-top: 1px;">
                        ${notification.shop?.name || 'Shop'}
                    </div>
                    </div>
                <button class="notification-close-btn" style="background: none; border: none; color: #9ca3af; font-size: 16px; cursor: pointer; padding: 4px; border-radius: 4px; transition: color 0.2s;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateY(0) scale(1)';
            toast.style.opacity = '1';
        }, 50);

        // Handle close button
        const closeBtn = toast.querySelector('.notification-close-btn');
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.color = '#374151';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.color = '#9ca3af';
        });
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeNotificationPopup(toast);
        });

        // Handle click on notification (navigate to notifications)
        toast.addEventListener('click', () => {
                this.navigateToPage('notifications');
            this.closeNotificationPopup(toast);
        });

        // Auto remove after 4 seconds (shorter for brief notifications)
                setTimeout(() => {
                    if (toast.parentNode) {
                this.closeNotificationPopup(toast);
            }
        }, 4000);
    }

    // Helper function to close notification popup with animation
    closeNotificationPopup(toast) {
        toast.style.transform = 'translateY(-80px) scale(0.9)';
        toast.style.opacity = '0';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }

    // Keep original function as fallback
    showCustomNotificationToast(notification) {
        // Use the new modern popup instead
        this.showModernNotificationPopup(notification);
    }

    // Enhanced back navigation prevention for mobile apps
    preventBackNavigation() {
        // Clear any existing history entries that point to login
        window.history.replaceState(null, null, window.location.href);

        // Add multiple entries to prevent back navigation
        for (let i = 0; i < 20; i++) {
            window.history.pushState(null, null, window.location.href);
        }

        // Track consecutive back button presses
        let backPressCount = 0;
        let lastBackPress = 0;

        // Handle popstate events (back button presses)
        window.addEventListener('popstate', (event) => {
            event.preventDefault();

            // Always push state to prevent navigation
            window.history.pushState(null, null, window.location.href);

            // Reset counter if enough time has passed
            const now = Date.now();
            if (now - lastBackPress > 2000) {
                backPressCount = 0;
            }

            backPressCount++;
            lastBackPress = now;

            // Show appropriate message based on press count
            if (backPressCount === 1) {
            this.showToast('Please use the logout button to exit the app', 'warning');
            } else if (backPressCount === 2) {
                this.showToast('Back button disabled for app security. Use logout to exit.', 'warning');
            } else {
                this.showToast('❌ Cannot exit app via back button. Please use logout.', 'error');
            }

            // Vibrate for mobile feedback
            if ('vibrate' in navigator) {
                navigator.vibrate([100, 50, 100]);
            }

            // Add more history entries to make it harder to navigate back
            for (let i = 0; i < 5; i++) {
                window.history.pushState(null, null, window.location.href);
            }
        });

        // Additional mobile-specific prevention
        if (window.DeviceMotionEvent || window.DeviceOrientationEvent) {
            // Mobile device detected
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    // App became visible again, ensure we're still on the right page
                    window.history.pushState(null, null, window.location.href);
                }
            });
        }

        // Prevent page unload for mobile PWAs
        window.addEventListener('pagehide', (event) => {
            // Only prevent if it's not a normal navigation
            if (!event.persisted) {
                event.preventDefault();
            }
        });

        console.log('Enhanced back navigation prevention activated (no browser exit dialogs)');
    }

    // Enhanced push notification system with better permission handling
    async setupPushNotifications() {
        try {
            // Check browser compatibility
            if (!this.checkNotificationSupport()) {
                return;
            }

            // Get current permission status
            let permission = Notification.permission;
            console.log('Current notification permission:', permission);

            if (permission === 'default') {
                // Show enhanced permission modal
                this.showEnhancedPermissionModal();
                return;
            }

            if (permission === 'granted') {
                console.log('✅ Notification permission granted');

                // Setup push subscription with retry logic
                const subscriptionSuccess = await this.setupPushSubscriptionWithRetry();

                if (subscriptionSuccess) {
                    this.showToast('🎉 Push notifications enabled! You\'ll receive order alerts even when the app is closed.', 'success');

                    // Store permission status
                    localStorage.setItem('notificationPermission', 'granted');
                } else {
                    this.showToast('⚠️ Push notifications partially enabled. Some features may not work.', 'warning');
                }

            } else if (permission === 'denied') {
                console.warn('❌ Notification permission denied');
                this.handlePermissionDenied();
            }

            // Enhanced service worker message handling
            this.setupServiceWorkerMessageHandling();

        } catch (error) {
            console.error('Error setting up push notifications:', error);
            this.showToast('Failed to setup notifications. Please refresh and try again.', 'error');
        }
    }

    // Simple check if push notifications are effectively enabled (permission granted)
    isPushEnabled() {
        return (typeof Notification !== 'undefined') && Notification.permission === 'granted';
    }


    // Check if browser supports notifications
    checkNotificationSupport() {
        if (!('Notification' in window)) {
            console.warn('❌ Browser does not support notifications');
            this.showToast('Your browser doesn\'t support push notifications. Please use a modern browser.', 'warning');
            return false;
        }

        if (!('serviceWorker' in navigator)) {
            console.warn('❌ Service workers not supported');
            this.showToast('Your browser doesn\'t support background notifications.', 'warning');
            return false;
        }

        if (!('PushManager' in window)) {
            console.warn('❌ Push messaging not supported');
            this.showToast('Push notifications are not supported on this device.', 'warning');
            return false;
        }

        return true;
    }

    // Handle permission denied scenario
    handlePermissionDenied() {
        // Show helpful instructions
        this.showPermissionDeniedModal();

        // Store status
        localStorage.setItem('notificationPermission', 'denied');

        // Disable notification-related features
        this.disableNotificationFeatures();
    }

    // Setup service worker message handling
    setupServiceWorkerMessageHandling() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data) {
                    this.handleServiceWorkerMessage(event.data);
                }
            });

            // Handle service worker updates
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('Service worker updated, reloading...');
                window.location.reload();
            });
        }
    }

    // Setup push subscription for mobile notifications
    async setupPushSubscription() {
        try {
            const registration = await navigator.serviceWorker.ready;

            // Check if we already have a subscription
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                // Create new subscription
                const applicationServerKey = this.getApplicationServerKey();

                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: this.urlBase64ToUint8Array(applicationServerKey)
                });

                console.log('Created new push subscription');
            } else {
                console.log('Using existing push subscription');
            }

            // Send subscription to server
            await this.sendSubscriptionToServer(subscription);

        } catch (error) {
            console.warn('Error setting up push subscription (non-critical):', error);
            // Don't throw - this is not critical for app functionality
        }
    }

    // Enhanced push subscription setup with retry logic
    async setupPushSubscriptionWithRetry(maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 Setting up push subscription (attempt ${attempt}/${maxRetries})`);

                const registration = await navigator.serviceWorker.ready;
                console.log('✅ Service worker ready');

                // Check if we already have a subscription
                let subscription = await registration.pushManager.getSubscription();

                if (!subscription) {
                    console.log('📝 Creating new push subscription');

                    const applicationServerKey = this.getApplicationServerKey();

                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: this.urlBase64ToUint8Array(applicationServerKey)
                    });

                    console.log('✅ Created new push subscription');
                } else {
                    console.log('♻️ Using existing push subscription');
                }

                // Validate subscription
                if (!subscription || !subscription.endpoint) {
                    throw new Error('Invalid subscription created');
                }

                // Send subscription to server with retry
                const serverSuccess = await this.sendSubscriptionToServerWithRetry(subscription);

                if (serverSuccess) {
                    console.log('🎉 Push subscription setup completed successfully');
                    return true;
                } else {
                    throw new Error('Failed to register subscription with server');
                }

            } catch (error) {
                console.error(`❌ Push subscription attempt ${attempt} failed:`, error);

                if (attempt === maxRetries) {
                    console.error('💥 All push subscription attempts failed');
                    this.showToast('Failed to setup push notifications after multiple attempts.', 'error');
                    return false;
                }

                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }

        return false;
    }

    // Send subscription to server with retry logic
    async sendSubscriptionToServerWithRetry(subscription, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`📤 Sending subscription to server (attempt ${attempt}/${maxRetries})`);

                const response = await fetch('/api/push/subscription', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.sessionToken}`
                    },
                    body: JSON.stringify({
                        subscription: subscription,
                        userId: this.userId,
                        userType: 'driver'
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Subscription registered with server:', result);
                    return true;
                } else {
                    throw new Error(`Server responded with status: ${response.status}`);
                }

            } catch (error) {
                console.error(`❌ Server registration attempt ${attempt} failed:`, error);

                if (attempt === maxRetries) {
                    return false;
                }

                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }

        return false;
    }

    // Send subscription to server
    async sendSubscriptionToServer(subscription) {
        try {
            const response = await fetch('/api/push/subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify({
                    subscription: subscription,
                    userId: this.userId,
                    userType: 'driver'
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log('Push subscription saved to server');
            } else {
                console.error('Failed to save push subscription:', result.message);
            }

        } catch (error) {
            console.warn('Error sending subscription to server (non-critical):', error);
            // Don't throw - this is not critical for app functionality
        }
    }

    // Enhanced service worker message handler
    handleServiceWorkerMessage(data) {
        console.log('Received message from service worker:', data);

        switch (data.type) {
            case 'notification_clicked':
                this.handleNotificationClick(data);
                break;
            case 'play_notification_sound':
                this.playNotificationSound(data.strong || false);
                break;
            case 'order_accepted':
                this.handleOrderAcceptedFromSW(data);
                break;
            default:
                console.log('Unknown service worker message type:', data.type);
        }
    }

    // Handle notification click from service worker
    handleNotificationClick(data) {
        console.log('Handling notification click:', data);

        const notificationId = data.notificationId || data;
        const { orderId, action, shopName } = data;

        // Navigate to appropriate page based on action
        if (action === 'accept' && orderId) {
            // Show order acceptance UI
            this.showOrderAcceptanceModal(orderId, shopName);
        } else if (orderId) {
            // Navigate to orders page and highlight specific order
            this.navigateToPage('orders');
            setTimeout(() => {
                this.highlightOrder(orderId);
            }, 500);
        } else {
            // Default: navigate to notifications page
            this.navigateToPage('notifications');
        }

        // Mark notification as read if ID provided
        if (notificationId) {
            setTimeout(() => {
                this.confirmNotification(notificationId);
            }, 500);
        }

        // Show toast with context
        if (shopName) {
            this.showToast(`📱 Opened order from ${shopName}`, 'info');
        }
    }

    // Handle order accepted from service worker
    handleOrderAcceptedFromSW(data) {
        console.log('Order accepted via notification:', data);

        const { orderId, notificationId } = data;

        // Refresh orders to show updated status
        this.renderOrders();
        this.updateRecentActivity();

        // Mark related notification as read
        if (notificationId) {
            setTimeout(() => {
                this.confirmNotification(notificationId);
            }, 500);
        }

        // Show success message
        this.showToast('✅ Order accepted successfully!', 'success');

        // Navigate to orders page to show accepted order
        this.navigateToPage('orders');
    }

    // Show order acceptance modal
    showOrderAcceptanceModal(orderId, shopName) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3>🚚 Accept Order</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 48px; margin-bottom: 10px;">📦</div>
                        <h4>New Order from ${shopName || 'Shop'}</h4>
                        <p style="color: #666;">Order ID: ${orderId}</p>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-primary" onclick="deliveryApp.acceptOrderById('${orderId}'); this.closest('.modal-overlay').remove();">
                            ✅ Accept Order
                        </button>
                        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove();">
                            ❌ Decline
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Auto-close after 30 seconds
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 30000);
    }

    // Accept order by ID (direct order acceptance)
    async acceptOrderById(orderId) {
        try {
            const response = await fetch('/api/orders/accept', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify({
                    orderId: orderId,
                    acceptedVia: 'app'
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.showToast('✅ Order accepted successfully!', 'success');
                this.renderOrders(); // Refresh orders list
                this.navigateToPage('orders');
            } else {
                throw new Error('Failed to accept order');
            }
        } catch (error) {
            console.error('Error accepting order:', error);
            this.showToast('❌ Failed to accept order. Please try again.', 'error');
        }
    }

    // Highlight specific order in the orders list
    highlightOrder(orderId) {
        const orderElement = document.querySelector(`[data-order-id="${orderId}"]`);
        if (orderElement) {
            orderElement.style.backgroundColor = '#fff3cd';
            orderElement.style.border = '2px solid #ffc107';
            orderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Remove highlight after 3 seconds
            setTimeout(() => {
                orderElement.style.backgroundColor = '';
                orderElement.style.border = '';
            }, 3000);
        }
    }

    // Get application server key (VAPID public key)
    getApplicationServerKey() {
        // This should match the key in service worker and server
        return 'BG_qTrWFr2qESzBzbog1Ajx_6r79bf4WheyZD2jgdzz_o68TzMkzR4Fd-WS0Y-G2gJK7xQcD0HvQ259UgQk4kM8';
    }

    // Convert VAPID key to Uint8Array
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // Request notification permission (enhanced)
    async requestNotificationPermission() {
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                // Show a custom permission request modal
                this.showNotificationPermissionModal();
            } else if (Notification.permission === 'denied') {
                this.showToast('Notifications are blocked. Please enable them in your browser settings to receive updates.', 'warning');
            } else if (Notification.permission === 'granted') {
                // Setup push subscription if not already done
                await this.setupPushSubscription();
            }
        }
    }

    // Show custom notification permission modal
    showNotificationPermissionModal() {
        const modal = document.createElement('div');
        modal.className = 'notification-permission-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            backdrop-filter: blur(5px);
        `;

        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 20px;
                padding: 32px;
                max-width: 400px;
                width: 90%;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                transform: scale(0.9);
                transition: transform 0.3s ease;
            ">
                <div style="
                    width: 80px;
                    height: 80px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 24px;
                    font-size: 32px;
                    color: white;
                ">
                    <i class="fas fa-bell"></i>
                </div>

                <h3 style="
                    font-size: 24px;
                    font-weight: 700;
                    color: #1f2937;
                    margin-bottom: 12px;
                ">Enable Notifications</h3>

                <p style="
                    font-size: 16px;
                    color: #6b7280;
                    line-height: 1.6;
                    margin-bottom: 24px;
                ">Get instant alerts when new delivery requests arrive, even when the app is in the background.</p>

                <div style="
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                ">
                    <button class="permission-btn allow" style="
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 12px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">Allow Notifications</button>

                    <button class="permission-btn deny" style="
                        background: #f3f4f6;
                        color: #6b7280;
                        border: 1px solid #d1d5db;
                        padding: 12px 24px;
                        border-radius: 12px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">Not Now</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Animate in
        setTimeout(() => {
            modal.querySelector('div').style.transform = 'scale(1)';
        }, 100);

        // Handle allow button
        const allowBtn = modal.querySelector('.permission-btn.allow');
        allowBtn.addEventListener('click', async () => {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    this.showToast('🎉 Push notifications enabled! You\'ll receive real-time delivery updates even when the app is closed.', 'success');

                    // Setup push subscription after permission is granted
                    await this.setupPushSubscription();
                } else {
                    this.showToast('Notifications disabled. You can enable them in your browser settings.', 'warning');
                }
                modal.remove();
            } catch (error) {
                console.error('Error requesting notification permission:', error);
                this.showToast('Error setting up notifications. Please try again.', 'error');
                modal.remove();
            }
        });

        // Handle deny button
        const denyBtn = modal.querySelector('.permission-btn.deny');
        denyBtn.addEventListener('click', () => {
            modal.remove();
            this.showToast('You can enable notifications later in your browser settings.', 'info');
        });

        // Handle modal close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Add hover effects
        allowBtn.addEventListener('mouseenter', () => {
            allowBtn.style.transform = 'translateY(-2px)';
            allowBtn.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
        });

        allowBtn.addEventListener('mouseleave', () => {
            allowBtn.style.transform = 'translateY(0)';
            allowBtn.style.boxShadow = 'none';
        });

        denyBtn.addEventListener('mouseenter', () => {
            denyBtn.style.transform = 'translateY(-2px)';
            denyBtn.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
        });

        denyBtn.addEventListener('mouseleave', () => {
            denyBtn.style.transform = 'translateY(0)';
            denyBtn.style.boxShadow = 'none';
        });
    }

    // Toggle notification sound
    async toggleNotificationSound() {
        this.isAudioEnabled = !this.isAudioEnabled;
        localStorage.setItem('notificationSound', this.isAudioEnabled.toString());

        // Save to database
        try {
            await this.updateUserSettings({
                notificationSettings: {
                    soundEnabled: this.isAudioEnabled,
                    browserEnabled: 'Notification' in window ? Notification.permission === 'granted' : false
                }
            });

        if (this.isAudioEnabled) {
            this.showToast('Notification sound enabled', 'success');
            this.playNotificationSound(); // Test sound
        } else {
            this.showToast('Notification sound disabled', 'info');
            }
        } catch (error) {
            console.error('Error updating notification settings:', error);
            this.showToast('Sound setting updated locally (database error)', 'warning');

            if (this.isAudioEnabled) {
                this.playNotificationSound(); // Test sound
            }
        }
    }

    // Test different sound types for user feedback
    testSounds() {
        if (!this.isAudioEnabled) {
            this.showToast('Enable sounds first to test them', 'warning');
            return;
        }

        // Play all sound types in sequence
        setTimeout(() => this.playNotificationSound(false), 0);
        setTimeout(() => this.playConfirmationSound(), 800);
        setTimeout(() => this.playWarningSound(), 1600);

        this.showToast('🎵 Playing sound test sequence', 'info');
    }

    // Update sound volume
    updateSoundVolume(volume) {
        this.soundVolume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
        localStorage.setItem('soundVolume', this.soundVolume.toString());

        // Test the new volume with a notification sound
        if (this.isAudioEnabled) {
            this.playNotificationSound(false);
        }
    }

    setupNotificationsMenu() {
        // Create the redesigned notifications menu button and dropdown
        console.log('🔧 Setting up notifications menu...');
        console.log('Current page:', this.currentPage);
        console.log('Notifications loaded:', this.notifications ? this.notifications.length : 'none');
        console.log('Is notifications page visible?', document.getElementById('notifications-page')?.style.display !== 'none');

        // Always create the menu, even if notifications aren't loaded yet (will show 0 counts)
        this.createNotificationsMenu();
        this.bindMenuEvents();

        // If notifications aren't loaded yet, try again after loading
        if (!this.notifications || this.notifications.length === 0) {
            console.log('⏳ Notifications not loaded yet, will refresh menu after loading...');
        }
    }

    updateNotificationsMenuCounts() {
        // Update menu counts without recreating the entire menu (faster and prevents disappearing)
        if (!this.currentMenuContainer) {
            console.log('🔄 No current menu container, creating new menu...');
            this.createNotificationsMenu();
            this.bindMenuEvents();
            return;
        }

        const notifications = this.notifications || [];
        const pendingCount = notifications.filter(n => n && (n.status === 'pending' || !n.status)).length;
        const confirmedCount = notifications.filter(n => n && n.status === 'confirmed').length;

        console.log('🔄 Updating menu counts - Pending:', pendingCount, 'Confirmed:', confirmedCount);

        // Update the dropdown content with new counts
        const quickActionsText = this.currentMenuContainer.querySelector('p');
        if (quickActionsText) {
            quickActionsText.textContent = `${pendingCount} pending • ${confirmedCount} confirmed`;
        }

        // Update confirm button
        const confirmBtn = this.currentMenuContainer.querySelector('#complete-all-notifications');
        if (confirmBtn) {
            const confirmText = confirmBtn.querySelector('div:last-child div:first-child');
            if (confirmText) {
                confirmText.textContent = `Confirm Pending (${pendingCount})`;
            }
            // Update disabled state
            if (pendingCount === 0) {
                confirmBtn.style.opacity = '0.5';
                confirmBtn.style.cursor = 'not-allowed';
            } else {
                confirmBtn.style.opacity = '1';
                confirmBtn.style.cursor = 'pointer';
            }
        }

        // Update delete button
        const deleteBtn = this.currentMenuContainer.querySelector('#delete-all-notifications');
        if (deleteBtn) {
            const deleteText = deleteBtn.querySelector('div:last-child div:first-child');
            if (deleteText) {
                deleteText.textContent = `Delete Confirmed (${confirmedCount})`;
            }
            // Update disabled state
            if (confirmedCount === 0) {
                deleteBtn.style.opacity = '0.5';
                deleteBtn.style.cursor = 'not-allowed';
            } else {
                deleteBtn.style.opacity = '1';
                deleteBtn.style.cursor = 'pointer';
            }
        }
    }

    bindMenuEvents() {
        const menuBtn = document.getElementById('notifications-menu-btn');
        const menu = document.getElementById('notifications-menu');

        if (!menuBtn || !menu) {
            console.log('❌ Menu elements not found, will retry when menu is created');
            // Don't show error, just skip - will be called again when menu is created
            return;
        }

        // Toggle menu with animation
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = menu.classList.contains('show');

            if (isOpen) {
                this.closeNotificationsMenu();
            } else {
                this.openNotificationsMenu();
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && !menuBtn.contains(e.target)) {
                this.closeNotificationsMenu();
            }
        });

        // Refresh notifications
        const refreshBtn = document.getElementById('refresh-notifications');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
                refreshBtn.disabled = true;

                await this.loadNotifications();

                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
                refreshBtn.disabled = false;
                this.closeNotificationsMenu();
            });
        }

        // Complete all pending notifications
        const completeBtn = document.getElementById('complete-all-notifications');
        if (completeBtn) {
            completeBtn.addEventListener('click', () => {
            this.confirmAllNotifications();
                this.closeNotificationsMenu();
            });
        }

        // Delete all confirmed notifications
        const deleteBtn = document.getElementById('delete-all-notifications');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
            this.deleteAllNotifications();
                this.closeNotificationsMenu();
            });
        }
    }

    createNotificationsMenu() {
        // Create modern notifications menu button and dropdown
        console.log('🔧 Starting createNotificationsMenu...');

        // Find the notifications page container (the actual structure created by renderNotifications)
        const notificationsPage = document.getElementById('notifications-page');

        if (!notificationsPage) {
            console.log('❌ Notifications page not found, will retry when page is loaded');
            return;
        }

        // Look for the header area in the actual DOM structure
        let headerArea = notificationsPage.querySelector('.orders-container > div:first-child');

        if (!headerArea) {
            console.log('❌ Header area not found, will retry when notifications are rendered');
            return;
        }

        console.log('📍 Found header area:', !!headerArea);

        // Remove existing menu if any
        const existingMenu = document.getElementById('notifications-menu-container');
        if (existingMenu) {
            existingMenu.remove();
        }

        // Ensure notifications are loaded before counting
        const notifications = this.notifications || [];
        console.log('📊 Creating menu with notifications:', notifications.length, notifications);

        // Get notification counts with better filtering
        const pendingCount = notifications.filter(n => n && (n.status === 'pending' || !n.status)).length;
        const confirmedCount = notifications.filter(n => n && n.status === 'confirmed').length;

        console.log('📊 Notification counts - Pending:', pendingCount, 'Confirmed:', confirmedCount);

        // Create the menu container
        const menuContainer = document.createElement('div');
        menuContainer.id = 'notifications-menu-container';
        menuContainer.style.cssText = `
            position: absolute;
            top: 8px;
            right: 15px;
            z-index: 1000;
        `;

        console.log('✅ Created menu container with fixed positioning');

        menuContainer.innerHTML = `
            <!-- Clean Modern Actions Button - HIDDEN as requested -->
            <button id="notifications-menu-btn" style="
                display: none !important;
                visibility: hidden !important;
                background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
                color: white;
                border: none;
                padding: 10px 16px;
                border-radius: 8px;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                align-items: center;
                gap: 8px;
                box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
                transition: all 0.2s ease;
            " onmouseover="
                this.style.background='linear-gradient(135deg, #f7931e 0%, #e55a2b 100%)';
                this.style.boxShadow='0 4px 12px rgba(255, 107, 53, 0.4)';
            " onmouseout="
                this.style.background='linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)';
                this.style.boxShadow='0 2px 8px rgba(255, 107, 53, 0.3)';
            ">
                <i class="fas fa-cog"></i>
                <span>Actions</span>
                <i class="fas fa-chevron-down" style="font-size: 12px;"></i>
            </button>

            <!-- Modern Dropdown Menu -->
            <div id="notifications-menu" style="
                position: absolute;
                top: 55px;
                right: 0;
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
                min-width: 280px;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-10px) scale(0.95);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border: 1px solid rgba(255, 255, 255, 0.18);
                backdrop-filter: blur(20px);
                overflow: hidden;
            ">
                <!-- Header -->
                <div style="
                    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                    padding: 16px 20px;
                    border-bottom: 1px solid #e2e8f0;
                ">
                    <h4 style="
                        margin: 0;
                        font-size: 16px;
                        color: #1e293b;
                        font-weight: 600;
                    ">Quick Actions</h4>
                    <p style="
                        margin: 4px 0 0 0;
                        font-size: 12px;
                        color: #64748b;
                    ">${pendingCount} pending • ${confirmedCount} confirmed</p>
                </div>

                <!-- Menu Items -->
                <div style="padding: 8px;">
                    <button id="refresh-notifications" style="
                        width: 100%;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 12px 16px;
                        background: none;
                        border: none;
                        border-radius: 12px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        font-size: 14px;
                        color: #475569;
                        text-align: left;
                    " onmouseover="this.style.background='#f1f5f9'; this.style.color='#1e293b'"
                       onmouseout="this.style.background='none'; this.style.color='#475569'">
                        <div style="
                            width: 32px;
                            height: 32px;
                            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                            border-radius: 8px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-size: 12px;
                        ">
                            <i class="fas fa-sync-alt"></i>
                        </div>
                        <div>
                            <div style="font-weight: 500;">Refresh</div>
                            <div style="font-size: 12px; color: #64748b;">Reload all notifications</div>
                        </div>
                    </button>

                    <button id="complete-all-notifications" style="
                        width: 100%;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 12px 16px;
                        background: none;
                        border: none;
                        border-radius: 12px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        font-size: 14px;
                        color: #475569;
                        text-align: left;
                        ${pendingCount === 0 ? 'opacity: 0.5; cursor: not-allowed;' : ''}
                    " onmouseover="if(${pendingCount} > 0) { this.style.background='#f0fdf4'; this.style.color='#15803d'; }"
                       onmouseout="this.style.background='none'; this.style.color='#475569';">
                        <div style="
                            width: 32px;
                            height: 32px;
                            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                            border-radius: 8px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-size: 12px;
                        ">
                            <i class="fas fa-check-double"></i>
                        </div>
                        <div>
                            <div style="font-weight: 500;">Confirm Pending (${pendingCount})</div>
                            <div style="font-size: 12px; color: #64748b;">Confirm all pending orders</div>
                        </div>
                    </button>

                    <button id="delete-all-notifications" style="
                        width: 100%;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 12px 16px;
                        background: none;
                        border: none;
                        border-radius: 12px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        font-size: 14px;
                        color: #475569;
                        text-align: left;
                        ${confirmedCount === 0 ? 'opacity: 0.5; cursor: not-allowed;' : ''}
                    " onmouseover="if(${confirmedCount} > 0) { this.style.background='#fef2f2'; this.style.color='#dc2626'; }"
                       onmouseout="this.style.background='none'; this.style.color='#475569';">
                        <div style="
                            width: 32px;
                            height: 32px;
                            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                            border-radius: 8px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-size: 12px;
                        ">
                            <i class="fas fa-trash-alt"></i>
                        </div>
                        <div>
                            <div style="font-weight: 500;">Delete Confirmed (${confirmedCount})</div>
                            <div style="font-size: 12px; color: #64748b;">Remove completed orders</div>
                        </div>
                    </button>
                </div>
            </div>
        `;

        // Insert into the header area (after the title and description)
        headerArea.appendChild(menuContainer);
        console.log('✅ Menu container added to header area');

        console.log('📍 Header element:', headerArea);
        console.log('📍 Menu container:', menuContainer);

        // Store reference for live updates
        this.currentMenuContainer = menuContainer;
    }

    openNotificationsMenu() {
        const menu = document.getElementById('notifications-menu');
        const btn = document.getElementById('notifications-menu-btn');
        const chevron = btn?.querySelector('.fa-chevron-down');

        if (menu) {
            menu.style.opacity = '1';
            menu.style.visibility = 'visible';
            menu.style.transform = 'translateY(0) scale(1)';
            menu.classList.add('show');
        }

        if (chevron) {
            chevron.style.transform = 'rotate(180deg)';
        }
    }

    closeNotificationsMenu() {
        const menu = document.getElementById('notifications-menu');
        const btn = document.getElementById('notifications-menu-btn');
        const chevron = btn?.querySelector('.fa-chevron-down');

        if (menu) {
            menu.style.opacity = '0';
            menu.style.visibility = 'hidden';
            menu.style.transform = 'translateY(-10px) scale(0.95)';
            menu.classList.remove('show');
        }

        if (chevron) {
            chevron.style.transform = 'rotate(0deg)';
        }
    }

    // Add or ensure this method exists in the class
    renderSingleNotification(notification) {
        const element = document.querySelector(`[data-notification-id="${notification.id}"]`);
        if (element) {
            const statusEl = element.querySelector('.notification-status');
            if (statusEl) {
                statusEl.textContent = notification.status;
            }
            element.classList.remove('unread');
            element.classList.add('confirmed');
        }
    }

    // Add or ensure this method exists in the class
    async deleteNotification(notificationId) {
        try {
            if (!this.currentUser || !this.currentUser.id) {
                console.error('No user ID available');
                return;
            }

            this.showLoadingOverlay('Deleting notification...');

            // Call API to delete notification from database
            const response = await fetch(`/api/driver/${this.currentUser.id}/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Failed to delete notification from server');
            }

            // Remove from local array and update UI
            this.notifications = this.notifications.filter(n => n.id !== notificationId);
            this.renderNotifications(this.notifications);
            this.updateNotificationBadge(this.notifications.filter(n => !n.is_read).length);

            // Close any open modals
            const modal = document.getElementById('delete-notification-modal');
            if (modal) {
                modal.remove();
                document.body.style.overflow = 'auto';
            }

            this.showToast('Notification deleted successfully!', 'success');
            this.hideLoadingOverlay();
        } catch (error) {
            this.hideLoadingOverlay();

            // Close any open modals
            const modal = document.getElementById('delete-notification-modal');
            if (modal) {
                modal.remove();
                document.body.style.overflow = 'auto';
            }

            console.error('Error deleting notification:', error);
            this.showToast('Failed to delete notification: ' + error.message, 'error');
        }
    }

    // Confirm only pending notifications
    async confirmAllNotifications() {
        try {
            if (!this.currentUser || !this.currentUser.id) {
                console.error('No user ID available');
                return;
            }

            // Filter only pending notifications
            const pendingNotifications = this.notifications.filter(n => n.status === 'pending');

            if (pendingNotifications.length === 0) {
                this.showToast('No pending notifications to confirm', 'info');
                return;
            }

            if (!confirm(`Are you sure you want to confirm ${pendingNotifications.length} pending notifications?`)) {
                return;
            }

            this.showLoadingOverlay(`Processing ${pendingNotifications.length} notifications...`);

            // Fast batch processing - update all locally first
            pendingNotifications.forEach(notification => {
                const localNotification = this.notifications.find(n => n.id === notification.id);
                if (localNotification) {
                    localNotification.status = 'confirmed';
                    localNotification.confirmed_at = new Date().toISOString();
                }
            });

            // Send batch request to server (if endpoint exists) or individual quick requests
            let successCount = pendingNotifications.length;

            try {
                // Quick individual requests without waiting for each one
                const confirmPromises = pendingNotifications.map(notification =>
                    fetch(`/api/driver/${this.currentUser.id}/notifications/${notification.id}/confirm`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' }
                    }).catch(err => console.log('Quick confirm error:', err))
                );

                // Don't wait for all to complete - optimistic update
                Promise.all(confirmPromises);

            } catch (error) {
                console.log('Batch confirm error:', error);
            }

            this.hideLoadingOverlay();

            // Single success message
            this.showModernToast(`✅ Mass Confirmation Complete - ${successCount} notifications confirmed`, 'success');
            await this.playConfirmationSound();

            // Refresh the notifications display
            this.renderNotifications(this.notifications);

            // Update menu with new counts (faster than recreating)
            setTimeout(() => {
                this.updateNotificationsMenuCounts();
            }, 100);

        } catch (error) {
            this.hideLoadingOverlay();
            console.error('Error confirming all notifications:', error);
            this.showToast('Failed to confirm notifications', 'error');
        }
    }

    // Delete only confirmed notifications
    async deleteAllNotifications() {
        try {
            if (!this.currentUser || !this.currentUser.id) {
                console.error('No user ID available');
                return;
            }

            // Filter only confirmed notifications
            const confirmedNotifications = this.notifications.filter(n => n.status === 'confirmed');

            if (confirmedNotifications.length === 0) {
                this.showToast('No confirmed notifications to delete', 'info');
                return;
            }

            if (!confirm(`Are you sure you want to delete ${confirmedNotifications.length} confirmed notifications? This action cannot be undone.`)) {
                return;
            }

            this.showLoadingOverlay(`Processing ${confirmedNotifications.length} notifications...`);

            let successCount = confirmedNotifications.length;

            // Fast batch processing - remove all locally first
            this.notifications = this.notifications.filter(n => n.status !== 'confirmed');

            try {
                // Quick individual requests without waiting for each one
                const deletePromises = confirmedNotifications.map(notification =>
                    fetch(`/api/driver/${this.currentUser.id}/notifications/${notification.id}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' }
                    }).catch(err => console.log('Quick delete error:', err))
                );

                // Don't wait for all to complete - optimistic update
                Promise.all(deletePromises);

                } catch (error) {
                console.log('Batch delete error:', error);
            }

            this.hideLoadingOverlay();

            // Single success message
            this.showModernToast(`🗑️ Mass Deletion Complete - ${successCount} notifications removed`, 'success');

            // Refresh the notifications display
            this.renderNotifications(this.notifications);

            // Update menu with new counts (faster than recreating)
            setTimeout(() => {
                this.updateNotificationsMenuCounts();
            }, 100);

        } catch (error) {
            this.hideLoadingOverlay();
            console.error('Error deleting all notifications:', error);
            this.showToast('Failed to delete notifications', 'error');
        }
    }

    // Add or ensure this method exists in the class
    showLoadingOverlay(message = 'Processing...') {
        let overlay = document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-spinner"></div>
                <div id="loading-overlay-message" class="loading-message"></div>
            `;
            document.body.appendChild(overlay);
        }
        document.getElementById('loading-overlay-message').textContent = message;
        overlay.style.display = 'flex';
    }
    hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    async initNotificationSound() {
        try {
            // Create audio context and load notification sound
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const response = await fetch('/assets/notification-sound.mp3');
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.notificationAudio = audioBuffer;
        } catch (error) {
            console.error('Error initializing notification sound:', error);
            // Fallback to basic Audio API if Web Audio API fails
            this.notificationAudio = new Audio('/assets/notification-sound.mp3');
        }
    }

    // Add new methods for edit and delete confirmation modals
    showEditNotificationModal(notificationId) {
        console.log('=== EDIT NOTIFICATION MODAL START ===');
        console.log('Showing edit notification modal for ID:', notificationId);

        // Find the notification
        const notification = this.notifications.find(n => n.id == notificationId);
        if (!notification) {
            console.error('Notification not found in local data:', notificationId);
            console.log('Current notifications array:', this.notifications);
            this.showToast('Notification not found', 'error');
            return;
        }

        console.log('Found notification to edit:', notification);

        // Remove existing modal if any
        const existingEditModal = document.getElementById('edit-notification-modal');
        if (existingEditModal) {
            existingEditModal.remove();
        }

        // Create modal with direct HTML insertion - simplest approach
        const modalHTML = `
        <div id="edit-notification-modal" style="
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background: rgba(0, 0, 0, 0.7) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 999999 !important;
            padding: 20px !important;
        ">
            <div style="
                background: white !important;
                border-radius: 16px !important;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
                width: 100% !important;
                max-width: 380px !important;
                position: relative !important;
                overflow: hidden !important;
                margin: 0 auto !important;
            ">
                <!-- Header -->
                <div style="
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    padding: 24px;
                    text-align: center;
                    color: white;
                ">
                    <div style="
                        width: 48px;
                        height: 48px;
                        background: rgba(255, 255, 255, 0.2);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 12px auto;
                        backdrop-filter: blur(10px);
                    ">
                        <i class="fas fa-edit" style="font-size: 20px;"></i>
                    </div>
                    <h3 style="
                        margin: 0;
                        font-size: 18px;
                        font-weight: 600;
                    ">Edit Notification</h3>

                    <!-- Close Button -->
                    <button id="edit-notification-close" style="
                        position: absolute;
                        top: 20px;
                        right: 20px;
                        width: 32px;
                        height: 32px;
                        background: rgba(255, 255, 255, 0.2);
                        border: none;
                        border-radius: 50%;
                        color: white;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 18px;
                        font-weight: bold;
                        transition: background-color 0.2s ease;
                        z-index: 1;
                    " onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">
                        ×
                    </button>
                </div>

                <!-- Content -->
                <div style="padding: 24px;">
                    <div style="margin-bottom: 20px;">
                        <label style="
                            display: block;
                            font-size: 14px;
                            font-weight: 500;
                            color: #4b5563;
                            margin-bottom: 8px;
                        ">
                            Message:
                        </label>
                        <textarea id="edit-notification-message" style="
                            width: 100%;
                            padding: 12px;
                            border: 1px solid #d1d5db;
                            border-radius: 8px;
                            font-size: 15px;
                            min-height: 100px;
                            resize: vertical;
                        " placeholder="Enter notification message">${this.escapeHTML(notification.message)}</textarea>
                    </div>
                </div>

                <!-- Actions -->
                <div style="
                    display: flex;
                    gap: 12px;
                    padding: 0 24px 24px;
                ">
                    <button id="edit-notification-cancel" style="
                        flex: 1;
                        padding: 12px 16px;
                        border: 1px solid #e2e8f0;
                        background: white;
                        color: #64748b;
                        border-radius: 10px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: all 0.2s ease;
                    ">
                        Cancel
                    </button>
                    <button id="edit-notification-save" style="
                        flex: 2;
                        padding: 12px 16px;
                        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                        color: white;
                        border: none;
                        border-radius: 10px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        transition: all 0.2s ease;
                        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                    ">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                </div>
            </div>
        </div>
        `;

        // Insert the modal HTML directly into the body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.body.style.overflow = 'hidden';

        console.log('Edit modal added to DOM with ID: edit-notification-modal');

        // Get references to the modal and buttons
        const modal = document.getElementById('edit-notification-modal');
        const cancelBtn = document.getElementById('edit-notification-cancel');
        const saveBtn = document.getElementById('edit-notification-save');
        const closeBtn = document.getElementById('edit-notification-close');

        console.log('Cancel button found:', !!cancelBtn);
        console.log('Save button found:', !!saveBtn);
        console.log('Close button found:', !!closeBtn);

        // Function to close modal
        const closeModal = () => {
            modal.remove();
            document.body.style.overflow = 'auto';
        };

        // Bind events to the modal buttons
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Cancel button clicked');
                closeModal();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Close button clicked');
                closeModal();
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Save button clicked');
                const newMessage = document.getElementById('edit-notification-message').value.trim();
                if (!newMessage) {
                    this.showToast('Message cannot be empty', 'error');
                    return;
                }
                this.updateNotificationMessage(notificationId, newMessage);
                closeModal();
            });
        }

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                console.log('Background clicked, closing modal');
                closeModal();
            }
        });

        // Focus on textarea
        setTimeout(() => {
            const textarea = document.getElementById('edit-notification-message');
            if (textarea) {
                textarea.focus();
                // Position cursor at end of text
                textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
            }

            // Debug modal visibility
            this.debugModalVisibility('edit-notification-modal');
        }, 100);
    }

    async updateNotificationMessage(notificationId, newMessage) {
        try {
            if (!this.currentUser || !this.currentUser.id) {
                console.error('No user ID available');
                return;
            }

            this.showLoadingOverlay('Updating notification...');

            // Call API to update notification
            const response = await fetch(`/api/driver/${this.currentUser.id}/notifications/${notificationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: newMessage })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Failed to update notification');
            }

            // Update local notification
            this.notifications = this.notifications.map(n => {
                if (n.id == notificationId) {
                    return { ...n, message: newMessage };
                }
                return n;
            });

            // Update UI
            this.renderNotifications(this.notifications);

            // Send WebSocket message to broadcast the update
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'notification_update',
                    action: 'edited',
                    notificationId: notificationId,
                    data: {
                        message: newMessage,
                        updated_at: new Date().toISOString()
                    }
                }));
            }

            this.showToast('Notification updated successfully', 'success');
            this.hideLoadingOverlay();

            // Modal is already closed in the click handler
        } catch (error) {
            this.hideLoadingOverlay();
            console.error('Error updating notification:', error);
            this.showToast('Failed to update notification: ' + error.message, 'error');
        }
    }

    showDeleteConfirmationModal(notificationId) {
        console.log('=== DELETE CONFIRMATION MODAL START ===');
        console.log('Showing delete confirmation modal for ID:', notificationId);

        // Find the notification
        const notification = this.notifications.find(n => n.id == notificationId);
        if (!notification) {
            console.error('Notification not found in local data for deletion:', notificationId);
            console.log('Current notifications array:', this.notifications);
            this.showToast('Notification not found', 'error');
            return;
        }

        console.log('Found notification to delete:', notification);

        // Remove existing modal if any
        const existingDeleteModal = document.getElementById('delete-notification-modal');
        if (existingDeleteModal) {
            existingDeleteModal.remove();
        }

        // Create modal with direct HTML insertion - simplest approach
        const modalHTML = `
        <div id="delete-notification-modal" style="
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background: rgba(0, 0, 0, 0.7) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 999999 !important;
            padding: 20px !important;
        ">
            <div style="
                background: white !important;
                border-radius: 16px !important;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
                width: 100% !important;
                max-width: 380px !important;
                position: relative !important;
                overflow: hidden !important;
                margin: 0 auto !important;
            ">
                <!-- Header -->
                <div style="
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    padding: 24px;
                    text-align: center;
                    color: white;
                ">
                    <div style="
                        width: 48px;
                        height: 48px;
                        background: rgba(255, 255, 255, 0.2);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 12px auto;
                        backdrop-filter: blur(10px);
                    ">
                        <i class="fas fa-trash-alt" style="font-size: 20px;"></i>
                    </div>
                    <h3 style="
                        margin: 0;
                        font-size: 18px;
                        font-weight: 600;
                    ">Delete Notification</h3>
                </div>

                <!-- Content -->
                <div style="padding: 24px; text-align: center;">
                    <div style="
                        background: #f8fafc;
                        padding: 16px;
                        border-radius: 12px;
                        margin-bottom: 24px;
                        border: 1px solid #e2e8f0;
                    ">
                        <div style="
                            font-size: 14px;
                            color: #64748b;
                            margin-bottom: 8px;
                            font-weight: 500;
                        ">
                            <i class="fas fa-store" style="margin-right: 8px; color: #64748b;"></i>
                            ${this.escapeHTML(notification.shop?.name || 'Unknown Shop')}
                        </div>
                        <div style="
                            color: #1e293b;
                            font-size: 15px;
                            line-height: 1.5;
                            font-style: italic;
                        ">
                            "${this.unescapeHTML(notification.message)}"
                        </div>
                    </div>

                    <p style="
                        color: #64748b;
                        font-size: 14px;
                        margin: 0 0 24px 0;
                        line-height: 1.4;
                    ">
                        Are you sure you want to delete this notification? This action cannot be undone.
                    </p>
                </div>

                <!-- Actions -->
                <div style="
                    display: flex;
                    gap: 12px;
                    padding: 0 24px 24px;
                ">
                    <button id="delete-notification-cancel" style="
                        flex: 1;
                        padding: 12px 16px;
                        border: 1px solid #e2e8f0;
                        background: white;
                        color: #64748b;
                        border-radius: 10px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: all 0.2s ease;
                    ">
                        Cancel
                    </button>
                    <button id="delete-notification-confirm" style="
                        flex: 1;
                        padding: 12px 16px;
                        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                        color: white;
                        border: none;
                        border-radius: 10px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        transition: all 0.2s ease;
                        box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
                    ">
                        <i class="fas fa-trash-alt"></i> Yes, Delete
                    </button>
                </div>
            </div>
        </div>
        `;

        // Insert the modal HTML directly into the body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.body.style.overflow = 'hidden';

        console.log('Delete modal added to DOM with ID: delete-notification-modal');

        // Get references to the modal and buttons
        const modal = document.getElementById('delete-notification-modal');
        const cancelBtn = document.getElementById('delete-notification-cancel');
        const deleteBtn = document.getElementById('delete-notification-confirm');

        console.log('Cancel button found:', !!cancelBtn);
        console.log('Delete button found:', !!deleteBtn);

        // Bind events to the modal buttons
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Cancel button clicked');
                modal.remove();
                document.body.style.overflow = 'auto';
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Delete button clicked');
                this.deleteNotification(notificationId);
            });
        }

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                console.log('Background clicked, closing delete modal');
                modal.remove();
                document.body.style.overflow = 'auto';
            }
        });

        // Debug modal visibility
        setTimeout(() => {
            this.debugModalVisibility('delete-notification-modal');
        }, 100);
    }

    handlePaymentMethodChange() {
        const paymentMethod = document.getElementById('edit-order-payment')?.value;
        const priceInput = document.getElementById('edit-order-price');
        const priceContainer = priceInput?.parentElement;

        if (priceInput && priceContainer) {
            const existingInfo = priceContainer.querySelector('small');

            if (paymentMethod === 'paid') {
                // Disable price editing for paid orders
                priceInput.disabled = true;
                priceInput.style.backgroundColor = '#f3f4f6';
                priceInput.style.cursor = 'not-allowed';

                // Clear placeholder when paid is selected
                priceInput.placeholder = '';

                // If price is currently empty, set it to 0 for paid orders
                if (!priceInput.value || priceInput.value.trim() === '') {
                    priceInput.value = '0.00';
                }

                // Add info message if not already present
                if (!existingInfo) {
                    const infoMessage = document.createElement('small');
                    infoMessage.style.cssText = 'color: #6b7280; font-size: 12px; margin-top: 4px; display: block;';
                    infoMessage.innerHTML = '<i class="fas fa-info-circle"></i> Price is locked when payment is marked as "Paid" - order is already settled';
                    priceContainer.appendChild(infoMessage);
                }
            } else {
                // Enable price editing for cash orders
                priceInput.disabled = false;
                priceInput.style.backgroundColor = 'white';
                priceInput.style.cursor = 'text';

                // Restore placeholder for cash orders
                priceInput.placeholder = 'Enter order price';

                // Clear 0.00 if it was set automatically and restore to empty for cash
                if (priceInput.value === '0.00') {
                    priceInput.value = '';
                }

                // Remove info message if present
                if (existingInfo) {
                    existingInfo.remove();
                }
            }
        }
    }



    handleOrderUpdate(data) {
        const { action, order } = data;
        if (!order || !order.id) return;
        const idx = this.orders.findIndex(o => o.id === order.id);
        if (action === 'edit') {
            if (idx !== -1) {
                this.orders[idx] = { ...this.orders[idx], ...order };
            } else {
                this.orders.unshift(order);
            }
            this.showToast('Order updated in real time', 'info');
        } else if (action === 'delete') {
            if (idx !== -1) {
                this.orders.splice(idx, 1);
                this.showToast('Order deleted in real time', 'warning');
            }
        } else if (action === 'confirm') {
            if (idx !== -1) {
                this.orders[idx].status = 'confirmed';
                this.showToast('Order confirmed in real time', 'success');
            }
        }
        if (this.currentPage === 'home') {
            this.renderOrders();
        }
    }

    // Initialize translation system
    async initTranslations() {
        if (window.i18n) {
            // Initialize translation manager
            await window.i18n.init();

            // Add observer for language changes
            window.i18n.addObserver((language) => {
                this.onLanguageChange(language);
            });

            // Apply initial translations
            this.applyTranslations();
        }
    }

    // Handle language change
    onLanguageChange(language) {
        console.log('Language changed to:', language);

        // Update current language display
        const currentLangDisplay = document.getElementById('current-language-display');
        if (currentLangDisplay) {
            currentLangDisplay.textContent = language === 'en' ? 'English' : 'Ελληνικά';
        }

        // Update language button states
        const langButtons = document.querySelectorAll('.language-btn');
        langButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.id === `lang-${language}`) {
                btn.classList.add('active');
            }
        });

        // Apply translations to all elements
        this.applyTranslations();

        // Refresh current page to apply translations
        this.refreshCurrentPage();

        // Show success message
        this.showToast(window.t('languageChanged'), 'success');
    }

    // Apply translations to all elements
    applyTranslations() {
        if (window.i18n) {
            window.i18n.applyTranslations();
        }

        // Update dynamic content that can't use data-translate attributes
        this.updateDynamicTranslations();
    }

    // Update dynamic content translations
    updateDynamicTranslations() {
        // Navigation labels come directly from HTML data-translate attributes; no override needed here.

        // Update page titles
        const pageHeaders = document.querySelectorAll('.page-header h2');
        pageHeaders.forEach(header => {
            const page = header.closest('.page');
            if (page && window.t) {
                switch (page.id) {
                    case 'home-page':
                        header.textContent = window.t('driverDashboard');
                        break;
                    case 'orders-page':
                        header.textContent = window.t('allOrders');
                        break;
                    case 'notifications-page':
                        header.textContent = window.t('allNotifications');
                        break;
                    case 'settings-page':
                        header.textContent = window.t('settingsTitle');
                        break;
                    case 'profile-page':
                        header.textContent = window.t('profileTitle');
                        break;
                }
            }
        });

        // Floating button removed

        // Update stats labels
        const statsLabels = document.querySelectorAll('.stat-content p');
        const statTranslations = ['totalEarnings', 'totalOrders', 'todaysOrders'];
        statsLabels.forEach((label, index) => {
            if (statTranslations[index] && window.t) {
                label.textContent = window.t(statTranslations[index]);
            }
        });

        // Update any existing error/success messages
        this.updateMessageElements();

        // Update time formatting
        this.updateTimeDisplays();
    }

    // Update message elements (toasts, notifications, etc.)
    updateMessageElements() {
        // Update any visible toasts
        const toasts = document.querySelectorAll('.toast');
        toasts.forEach(toast => {
            const messageEl = toast.querySelector('.toast-message');
            if (messageEl && window.i18n) {
                const currentText = messageEl.textContent;
                const translatedText = window.i18n.translateText(currentText);
                if (translatedText !== currentText) {
                    messageEl.textContent = translatedText;
                }
            }
        });

        // Update notification items
        const notificationItems = document.querySelectorAll('.notification-item');
        notificationItems.forEach(item => {
            const timeEl = item.querySelector('.notification-time');
            if (timeEl) {
                const originalTime = timeEl.getAttribute('data-original-time');
                if (originalTime) {
                    timeEl.textContent = this.formatTimeAgo(originalTime);
                }
            }
        });


	}


    // === Driver Announcements Page ===
    loadDriverAnnouncementsPage() {
        const container = document.getElementById('driver-announcements-list');
        if (!container) return;
        const announcements = JSON.parse(localStorage.getItem('driver_announcements') || '[]')
            .sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));
        if (announcements.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:24px; color:#6b7280;">
                    <i class="fas fa-inbox" style="font-size:28px; margin-bottom:8px;"></i>
                    <div>No announcements yet</div>
                </div>`;
        } else {
            const viewsMap = JSON.parse(localStorage.getItem('driver_announcement_views') || '{}');
            container.innerHTML = announcements.map(a => {
                const created = new Date(a.created_at);
                const date = created.toLocaleDateString();
                const time = created.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                const icon = { high: 'exclamation-triangle', medium: 'info-circle', low: 'info' }[a.importance] || 'info';
                const seen = !!(viewsMap[a.id] && viewsMap[a.id][this.userId]);
                return `
                    <div class="announcement-card ${a.importance}" style="background:#fff; border:1px solid #eee; border-radius:12px; padding:12px; margin:10px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="font-weight:600; color:#111827;">${seen ? '' : '<span style=\"color:#ef4444; font-size:12px;\">NEW</span>'}</div>
                            <div style="font-size:12px; color:#6b7280;">${date} ${time}</div>
                        </div>
                        <div style="margin:8px 0; color:#374151;">${a.message}</div>
                        <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:#6b7280;">
                            <i class="fas fa-${icon}"></i>
                            <span>${a.importance.charAt(0).toUpperCase() + a.importance.slice(1)} importance</span>
                        </div>
                    </div>`;
            }).join('');
        }
        // Mark viewed
        try {
            const views = JSON.parse(localStorage.getItem('driver_announcement_views') || '{}');
            for (const a of announcements) {
                views[a.id] = views[a.id] || {};
                if (!views[a.id][this.userId]) {
                    views[a.id][this.userId] = new Date().toISOString();
                }
            }
            localStorage.setItem('driver_announcement_views', JSON.stringify(views));
            try { new BroadcastChannel('driver_announcements_channel').postMessage({ type: 'views-updated' }); } catch (_) {}
        } catch (e) { console.warn('Failed to mark driver announcements viewed', e); }

        // Subscribe for updates while on this page
        this.subscribeDriverAnnouncements();
    }

    subscribeDriverAnnouncements() {
        if (this._driverAnnSub) return;
        try {
            const bc = new BroadcastChannel('driver_announcements_channel');
            bc.onmessage = (ev) => {
                if (this.currentPage === 'driver-announcements') {
                    this.loadDriverAnnouncementsPage();
                }
            };
            this._driverAnnSub = bc;
        } catch (_) {}
        window.addEventListener('storage', (e) => {
            if ((e.key === 'driver_announcements' || e.key === 'driver_announcement_views') && this.currentPage === 'driver-announcements') {
                this.loadDriverAnnouncementsPage();
            }
        });
    }

    // === Driver Analytics Page ===
    renderDriverAnalyticsPage() {
        const controls = document.getElementById('driver-analytics-controls');
        const summary = document.getElementById('driver-analytics-summary');
        if (!controls || !summary) return;
        const today = (() => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
        const ym = (() => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; })();
        const view = this.driverAnalyticsView || 'daily';
        const dateVal = this.driverAnalyticsDate || today;
        const monthVal = this.driverAnalyticsMonth || ym;
        controls.innerHTML = `
            <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap; padding:10px;">
                <label style="font-weight:600; color:#111827;">View:</label>
                <select id="drv-analytics-view" style="padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px;">
                    <option value="daily" ${view==='daily'?'selected':''}>Daily</option>
                    <option value="monthly" ${view==='monthly'?'selected':''}>Monthly Report</option>
                </select>
                ${view==='monthly'
                    ? `<input id="drv-analytics-month" type="month" value="${monthVal}" style="padding:8px; border:1px solid #e5e7eb; border-radius:8px;" />`
                    : `<input id="drv-analytics-date" type="date" value="${dateVal}" style="padding:8px; border:1px solid #e5e7eb; border-radius:8px;" />`
                }
                <button id="drv-analytics-refresh" class="btn primary" style="padding:8px 12px; border-radius:8px;">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
            </div>`;
        const bind = () => {
            const viewSel = document.getElementById('drv-analytics-view');
            viewSel.onchange = () => { this.driverAnalyticsView = viewSel.value; this.renderDriverAnalyticsPage(); };
            const refresh = async () => {
                if ((this.driverAnalyticsView||'daily') === 'monthly') {
                    const m = document.getElementById('drv-analytics-month').value;
                    this.driverAnalyticsMonth = m;
                    await this.loadDriverMonthlyAnalytics(m);
                    await this.loadDriverAnalyticsOrders(true);
                } else {
                    const d = document.getElementById('drv-analytics-date').value;
                    this.driverAnalyticsDate = d;
                    await this.loadDriverAnalytics(d);
                    await this.loadDriverAnalyticsOrders(true);
                }
            };
            const btn = document.getElementById('drv-analytics-refresh');
            btn.onclick = refresh;
        };
        bind();
        // initial load
        if (view === 'monthly') {
            this.loadDriverMonthlyAnalytics(monthVal);
        } else {
            this.loadDriverAnalytics(dateVal);
        }

        // Ensure orders section exists below the summary
        const summaryParent = summary.parentElement;
        if (summaryParent && !document.getElementById('driver-analytics-orders-section')) {
            const section = document.createElement('div');
            section.id = 'driver-analytics-orders-section';
            section.innerHTML = `
                <div style="margin-top: 14px; display:flex; align-items:center; justify-content:space-between;">
                    <h3 style="margin:0; font-size:16px; color:#111827;"><i class="fas fa-list" style="margin-right:8px;"></i> Orders</h3>
                    <button id="drv-analytics-orders-refresh" class="btn secondary" style="padding:6px 10px; border-radius:8px; font-size:12px;">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
                <div id="driver-analytics-orders-list" style="margin-top:10px; display:flex; flex-direction:column; gap:8px;"></div>
                <div style="display:flex; justify-content:center; margin-top:10px;">
                    <button id="driver-analytics-load-more" class="btn primary" style="padding:8px 12px; border-radius:8px; min-width:160px;">Load more</button>
                </div>`;
            summaryParent.appendChild(section);
        }

        // Initialize pagination state
        if (this.driverAnalyticsPageSize == null) this.driverAnalyticsPageSize = 20;
        if (this.driverAnalyticsOrders == null) this.driverAnalyticsOrders = [];
        if (this.driverAnalyticsOffset == null) this.driverAnalyticsOffset = 0;

        // Bind refresh and load more
        const refreshBtn = document.getElementById('drv-analytics-orders-refresh');
        const loadMoreBtn = document.getElementById('driver-analytics-load-more');
        if (refreshBtn) refreshBtn.onclick = () => this.loadDriverAnalyticsOrders(true);
        if (loadMoreBtn) loadMoreBtn.onclick = () => this.loadDriverAnalyticsOrders(false);

        // Load first page
        this.loadDriverAnalyticsOrders(true);

    }

    async loadDriverAnalytics(date) {
        const summaryEl = document.getElementById('driver-analytics-summary');
        if (!summaryEl) return;
        summaryEl.innerHTML = '<div style="padding:16px; color:#6b7280;">Loading...</div>';
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (this.sessionToken) headers['Authorization'] = `Bearer ${this.sessionToken}`;
            const resp = await fetch(`/api/driver/${this.userId}/analytics?date=${encodeURIComponent(date)}`, { headers });
            if (!resp.ok) throw new Error(await resp.text());
            const { summary } = await resp.json();
            this.renderDriverAnalyticsSummary(summary);
        } catch (e) {
            console.error('Driver analytics load error:', e);
            summaryEl.innerHTML = '<div style="padding:16px; color:#ef4444;">Failed to load analytics</div>';
        }
    }

    async loadDriverMonthlyAnalytics(month) {
        const summaryEl = document.getElementById('driver-analytics-summary');
        if (!summaryEl) return;
        summaryEl.innerHTML = '<div style="padding:16px; color:#6b7280;">Loading...</div>';
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (this.sessionToken) headers['Authorization'] = `Bearer ${this.sessionToken}`;
            const resp = await fetch(`/api/driver/${this.userId}/analytics/monthly?month=${encodeURIComponent(month)}`, { headers });
            if (!resp.ok) throw new Error(await resp.text());
            const { summary } = await resp.json();
            this.renderDriverMonthlyAnalyticsSummary(summary);
        } catch (e) {
            console.error('Driver monthly analytics load error:', e);
            summaryEl.innerHTML = '<div style="padding:16px; color:#ef4444;">Failed to load analytics</div>';
        }
    }

        // Paginated orders under analytics
        async loadDriverAnalyticsOrders(reset = false) {
            try {
                const listEl = document.getElementById('driver-analytics-orders-list');
                const loadMoreBtn = document.getElementById('driver-analytics-load-more');
                if (!listEl) return;

                if (reset) {
                    this.driverAnalyticsOrders = [];
                    this.driverAnalyticsOffset = 0;
                    listEl.innerHTML = '<div style="padding:12px; color:#6b7280;">Loading orders...</div>';
                    if (loadMoreBtn) loadMoreBtn.disabled = true;
                } else {
                    if (loadMoreBtn) {
                        loadMoreBtn.disabled = true;
                        loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
                    }
                }

                const headers = { 'Content-Type': 'application/json' };
                if (this.sessionToken) headers['Authorization'] = `Bearer ${this.sessionToken}`;
                const limit = this.driverAnalyticsPageSize || 20;
                const offset = this.driverAnalyticsOffset || 0;
                const todayStr = (() => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
                const dateParam = (this.driverAnalyticsView || 'daily') === 'daily' ? (this.driverAnalyticsDate || todayStr) : null;
                const url = `/api/driver/${this.userId}/accepted-orders?limit=${limit}&offset=${offset}` + (dateParam ? `&date=${encodeURIComponent(dateParam)}` : '');
                const resp = await fetch(url, { headers });
                if (!resp.ok) throw new Error(await resp.text());
                const json = await resp.json();
                const batch = json.orders || [];

                if (reset) listEl.innerHTML = '';
                this.driverAnalyticsOrders = (this.driverAnalyticsOrders || []).concat(batch);
                this.driverAnalyticsOffset = offset + batch.length;

                this.renderDriverAnalyticsOrders(batch, !reset, offset);

                // Toggle Load More
                if (loadMoreBtn) {
                    if (batch.length < limit) {
                        loadMoreBtn.style.display = 'none';
                    } else {
                        loadMoreBtn.style.display = 'inline-block';
                        loadMoreBtn.disabled = false;
                        loadMoreBtn.innerHTML = 'Load more';
                    }
                }
            } catch (e) {
                console.error('Driver analytics orders load error:', e);
                const listEl = document.getElementById('driver-analytics-orders-list');
                if (listEl && (!this.driverAnalyticsOrders || this.driverAnalyticsOrders.length === 0)) {
                    listEl.innerHTML = '<div style="padding:12px; color:#ef4444;">Failed to load orders</div>';
                }
                const loadMoreBtn = document.getElementById('driver-analytics-load-more');
                if (loadMoreBtn) {
                    loadMoreBtn.disabled = false;
                    loadMoreBtn.innerHTML = 'Load more';
                }
            }
        }

        renderDriverAnalyticsOrders(batch, append = false, baseIndex = 0) {
            const listEl = document.getElementById('driver-analytics-orders-list');
            if (!listEl) return;
            const html = (batch || [])
                .filter(o => o && o.id && o.created_at)
                .map((o, i) => { try { return this.createRecentOrderCard({ ...o, _displayIndex: baseIndex + i + 1 }); } catch (_) { return ''; } })
                .join('');
            if (append) {
                listEl.insertAdjacentHTML('beforeend', html);
            } else {
                listEl.innerHTML = html;
            }
            // If nothing yet
            if (!listEl.innerHTML.trim()) {
                listEl.innerHTML = '<div style="padding:12px; color:#6b7280;">No orders yet</div>';
            }
        }


    renderDriverAnalyticsSummary(summary) {
        const el = document.getElementById('driver-analytics-summary');
        if (!el) return;
        const kp = (label, val, color) => `<div style="flex:1; min-width:180px; background:#fff; border:1px solid #eee; border-radius:12px; padding:14px;">
            <div style="font-size:12px; color:#6b7280;">${label}</div>
            <div style="font-size:22px; font-weight:700; color:${color};">${val}</div>
        </div>`;
        const peak = (h => h===null? '—' : `${h}:00 - ${h}:59`)(summary.peak_hour);
        const topShop = summary.top_shop ? `${summary.top_shop.name} (${summary.top_shop.count})` : '—';
        el.innerHTML = `<div style="display:flex; gap:12px; flex-wrap:wrap; padding:10px;">
            ${kp('Total Deliveries', summary.total_orders, '#111827')}
            ${kp('Earnings (€)', Number(summary.total_earnings).toFixed(2), '#10b981')}
            ${kp('Peak Hour', peak, '#8b5cf6')}
            ${kp('Top Shop', topShop, '#ef4444')}
        </div>`;
    }

    renderDriverMonthlyAnalyticsSummary(summary) {
        const el = document.getElementById('driver-analytics-summary');
        if (!el) return;
        const kp = (label, val, color) => `<div style="flex:1; min-width:180px; background:#fff; border:1px solid #eee; border-radius:12px; padding:14px;">
            <div style="font-size:12px; color:#6b7280;">${label}</div>
            <div style="font-size:22px; font-weight:700; color:${color};">${val}</div>
        </div>`;
        const peak = summary.peak_day ? `${summary.peak_day} (${summary.peak_day_count} deliveries)` : '—';
        const topShop = summary.top_shop ? `${summary.top_shop.name} (${summary.top_shop.count})` : '—';
        el.innerHTML = `<div style="display:flex; gap:12px; flex-wrap:wrap; padding:10px;">
            ${kp('Total Deliveries (Month)', summary.total_orders, '#111827')}
            ${kp('Earnings (€) (Month)', Number(summary.total_earnings).toFixed(2), '#10b981')}
            ${kp('Peak Day', peak, '#8b5cf6')}
            ${kp('Top Shop', topShop, '#ef4444')}
        </div>`;
    }


    // Update time displays
    updateTimeDisplays() {
        // Update notification times
        const timeElements = document.querySelectorAll('.notification-time, .time-ago');
        timeElements.forEach(element => {
            const originalTime = element.getAttribute('data-original-time');
            if (originalTime) {
                element.textContent = this.formatTimeAgo(originalTime);
            }
        });
    }

    // Refresh current page to apply translations
    refreshCurrentPage() {
        const currentPage = this.currentPage;

        // Re-render current page content
        switch (currentPage) {
            case 'home':
                this.updateUI();
                break;
            case 'orders':
                this.renderOrders();
                break;
            case 'notifications':
                this.loadNotifications();
                break;
            case 'settings':
                this.renderSettingsPage();
                break;
            case 'profile':
                this.loadProfileData();
                break;
        }
    }

    // Setup language settings listeners
    setupLanguageSettingsListeners() {
        const langEnBtn = document.getElementById('lang-en');
        const langGrBtn = document.getElementById('lang-gr');

        if (langEnBtn) {
            langEnBtn.addEventListener('click', async () => {
                await this.changeLanguage('en');
            });
        }

        if (langGrBtn) {
            langGrBtn.addEventListener('click', async () => {
                await this.changeLanguage('gr');
            });
        }
    }

    // Change language
    async changeLanguage(language) {
        if (window.i18n) {
            try {
                const success = await window.i18n.setLanguage(language);
                if (success) {
                    console.log(`Language changed to: ${language}`);
                } else {
                    console.error(`Failed to change language to: ${language}`);
                    this.showToast(window.t('errorOccurred'), 'error');
                }
            } catch (error) {
                console.error('Error changing language:', error);
                this.showToast(window.t('errorOccurred'), 'error');
            }
        }
    }
}

// Make app available globally and initialize
let deliveryApp;

// Initialize the delivery app
document.addEventListener('DOMContentLoaded', () => {
    deliveryApp = new DeliveryApp();
    // Also make it available on window for onclick handlers
    window.deliveryApp = deliveryApp;
});