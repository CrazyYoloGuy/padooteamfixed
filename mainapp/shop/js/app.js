class ShopApp {
    constructor() {
        this.currentPage = 'profile';
        this.sessionToken = null;
        this.currentShop = null;
        this.notifications = [];
        this.selectedDrivers = [];
        this.searchResults = [];
        this.currentSearchTerm = '';
        this.currentSearchPage = 1;
        this.currentOrdersFilter = 'pending'; // Default to pending orders
        this.currentDashboardFilter = 'pending'; // Default dashboard filter
        this.orders = [];
        this.ws = null;
        this.audioContext = null;
        this.notificationAudio = null;
        this.isAudioEnabled = localStorage.getItem('notificationSound') !== 'false';
        this.soundVolume = parseFloat(localStorage.getItem('soundVolume')) || 0.5; // Default 50% volume
        this.userId = localStorage.getItem('userId');
        this.shopId = localStorage.getItem('shopId');

        // Add caching and loading state management
        this.teamMembersCache = null;
        this.teamMembersCacheTime = null;
        this.isLoadingTeamMembers = false;
        this.loadingPromises = new Map(); // Prevent duplicate API calls

        this.driverSearchCache = {};
        this.driverSearchDebounce = null;

        // Real-time timestamp updates
        this.timestampUpdateInterval = null;

        this.init();
    }

    async init() {
        console.log('Shop app initializing...');

        // Check if shop is logged in
        if (!this.checkAuthStatus()) {
            console.log('No valid session found, redirecting to login...');
            window.location.href = '/';
            return;
        }

        // Prevent back navigation; require explicit Logout button
        this.preventBackNavigation();

        // Initialize app components
        this.bindEvents();
        this.updateCurrentDate();
        await this.loadShopData();

        // Initialize real-time features
        this.initializeAudio();
        this.connectWebSocket();

        // Subscribe to admin announcements (localStorage/BroadcastChannel)
        this.subscribeAnnouncements();

        // Request notification permission
        this.requestNotificationPermission();
        // If permission already granted, ensure push subscription is registered
        if ('Notification' in window && Notification.permission === 'granted') {
            try { await this.setupShopPushSubscription(); } catch (e) { console.warn('Shop push subscription setup failed:', e); }
        }


        // Preload team members for better performance
        this.preloadTeamMembers();

        // Navigate to alerts page
        this.navigateToPage('alerts');

        // Add cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.stopTimestampUpdates();
        });

        console.log('Shop app initialized successfully');
    }

    // Add preload method for better performance
    async preloadTeamMembers() {
        try {
            console.log('🚀 Preloading team members for better performance...');
            await this.loadSelectedDriversOptimized();
        } catch (error) {
            console.warn('⚠️ Preload failed, team members will load on demand:', error.message);
        }
    }

    // Optimized version of loadSelectedDrivers with caching and error handling
    async loadSelectedDriversOptimized(forceRefresh = false) {
        const cacheKey = `selectedDrivers-${this.currentShop?.id}`;

        // Check if already loading to prevent duplicate calls
        if (this.loadingPromises.has(cacheKey)) {
            console.log('⏳ Team members already loading, waiting for existing request...');
            return await this.loadingPromises.get(cacheKey);
        }

        // Check cache first (5 minutes cache)
        const now = Date.now();
        const cacheAge = this.teamMembersCacheTime ? now - this.teamMembersCacheTime : Infinity;
        const cacheValid = cacheAge < 5 * 60 * 1000; // 5 minutes

        if (!forceRefresh && cacheValid && this.teamMembersCache) {
            console.log('✅ Using cached team members');
            this.selectedDrivers = [...this.teamMembersCache];
            return this.selectedDrivers;
        }

        // Create loading promise
        const loadingPromise = this.fetchTeamMembers();
        this.loadingPromises.set(cacheKey, loadingPromise);

        try {
            const result = await loadingPromise;
            return result;
        } finally {
            // Clean up loading promise
            this.loadingPromises.delete(cacheKey);
        }
    }

    // Separate fetch method for cleaner code
    async fetchTeamMembers() {
        try {
            const shopId = this.currentShop?.id;

            if (!shopId) {
                throw new Error('No shop ID available');
            }

            console.log(`🔄 Fetching team members for shop: ${shopId}`);
            this.isLoadingTeamMembers = true;

            // Add timeout for reliability
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(`/api/shop/${shopId}/selected-drivers`, {
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Failed to load team members');
            }

            // Update cache
            this.teamMembersCache = [...result.selectedDrivers];
            this.teamMembersCacheTime = Date.now();
            this.selectedDrivers = [...result.selectedDrivers];

            console.log(`✅ Successfully loaded ${this.selectedDrivers.length} team members`);

            return this.selectedDrivers;

        } catch (error) {
            console.error('❌ Error fetching team members:', error);

            // If we have cached data, use it as fallback
            if (this.teamMembersCache) {
                console.log('📦 Using cached team members as fallback');
                this.selectedDrivers = [...this.teamMembersCache];
                return this.selectedDrivers;
            }

            // Otherwise set empty array
            this.selectedDrivers = [];
            throw error;
        } finally {
            this.isLoadingTeamMembers = false;
        }
    }

    // Enhanced version of loadDeliveryTeam with better loading states
    async loadDeliveryTeam() {
        try {
            console.log('🏗️ Loading delivery team for alerts page...');

            // Show loading state immediately
            this.renderDeliveryTeamLoading();

            // Load team members with optimization
            await this.loadSelectedDriversOptimized();

            // Render the actual team
            this.renderDeliveryTeamForAlerts();

        } catch (error) {
            console.error('❌ Error loading delivery team:', error);
            this.renderDeliveryTeamError(error.message);
        }
    }

    // Add loading state renderer
    renderDeliveryTeamLoading() {
        const container = document.getElementById('delivery-team-container');
        const countElement = document.getElementById('team-count');

        if (countElement) {
            countElement.textContent = '...';
        }

        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                    <p>Loading team members...</p>
                </div>
            `;
        }
    }

    // Add error state renderer
    renderDeliveryTeamError(errorMessage) {
        const container = document.getElementById('delivery-team-container');
        const countElement = document.getElementById('team-count');

        if (countElement) {
            countElement.textContent = '!';
        }

        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h4>Failed to load team members</h4>
                    <p>${errorMessage}</p>
                    <button class="retry-btn" onclick="shopApp.refreshTeamMembers()">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            `;
        }
    }

    // Add refresh method that users can trigger
    async refreshTeamMembers() {
        try {
            console.log('🔄 Manually refreshing team members...');
            this.showToast('Refreshing team members...', 'info');

            // Clear cache and force refresh
            this.teamMembersCache = null;
            this.teamMembersCacheTime = null;

            await this.loadDeliveryTeam();
            this.showToast('Team members refreshed successfully!', 'success');

        } catch (error) {
            console.error('Error refreshing team members:', error);
            this.showToast('Failed to refresh team members', 'error');
        }
    }

    // Update the original loadSelectedDrivers to use the optimized version
    async loadSelectedDrivers() {
        return await this.loadSelectedDriversOptimized();
    }

    // Enhanced renderDeliveryTeamForAlerts with better performance
    renderDeliveryTeamForAlerts() {
        const container = document.getElementById('delivery-team-container');
        const countElement = document.getElementById('team-count');

        if (!container) {
            console.warn('Delivery team container not found');
            return;
        }

        // Update count with current data
        const teamCount = this.selectedDrivers?.length || 0;
        if (countElement) {
            countElement.textContent = teamCount;
        }

        // Handle empty state
        if (teamCount === 0) {
            container.innerHTML = `
                <div class="empty-team">
                    <div class="empty-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <h4>No team members yet</h4>
                    <p>Add drivers to your delivery team to get started</p>
                    <button class="add-team-btn" onclick="shopApp.navigateToPage('settings')">
                        <i class="fas fa-plus"></i> Add Team Members
                    </button>
                </div>
            `;
            return;
        }

        // Create optimized team list with virtual scrolling for large teams
        const teamHTML = this.selectedDrivers.map((driver, index) => `
            <div class="team-member-card" data-driver-id="${driver.id}" style="animation-delay: ${index * 50}ms">
                <div class="team-member-avatar">
                    <i class="fas fa-user"></i>
                    <div class="status-indicator online"></div>
                </div>
                <div class="team-member-info">
                    <div class="team-member-name">${driver.email}</div>
                    <div class="team-member-meta">
                        <span class="join-date">
                            <i class="fas fa-calendar"></i>
                            ${this.formatDate(driver.created_at)}
                        </span>
                    </div>
                </div>
                <div class="team-member-actions">
                    <button class="micro-btn remove" onclick="shopApp.removeDriver('${driver.id}')" title="Remove from team">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="team-members-grid">
                ${teamHTML}
            </div>
            <div class="my-team-actions">
                <button class="btn btn-primary" onclick="shopApp.refreshTeamMembers()">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
                <button class="btn btn-secondary" onclick="shopApp.navigateToPage('settings')">
                    <i class="fas fa-cog"></i> Manage Team
                </button>
            </div>
        `;

        console.log(`✅ Rendered ${teamCount} team members`);
    }

    checkAuthStatus() {
        const tokenPattern = /^session_([^_]+)_(driver|shop)_(\d{10,})$/;
        // 1) Prefer dedicated shop session if present
        const storedShopSession = localStorage.getItem('shopSession');
        if (storedShopSession) {
            try {
                const sessionData = JSON.parse(storedShopSession);
                const m = tokenPattern.exec(sessionData.sessionToken || '');
                if (!m || m[2] !== 'shop') throw new Error('Invalid or wrong-type token in shopSession');
                const tokenUserId = m[1];
                const issuedAt = parseInt(m[3], 10);
                if (!sessionData.shop || String(sessionData.shop.id) !== String(tokenUserId)) throw new Error('Token/user mismatch');
                const now = Date.now();
                const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
                const exp = sessionData.expiresAt ? new Date(sessionData.expiresAt).getTime() : (issuedAt + sevenDaysMs);
                if (now > exp) throw new Error('Expired shopSession');

                // Sliding window extend
                try {
                    sessionData.expiresAt = new Date(now + sevenDaysMs).toISOString();
                    localStorage.setItem('shopSession', JSON.stringify(sessionData));
                } catch (_) {}

                this.currentShop = sessionData.shop;
                this.sessionToken = sessionData.sessionToken;
                this.shopId = this.currentShop.id;
                console.log('✅ Shop authenticated (shopSession):', this.currentShop.shop_name || this.currentShop.email);
                return true;
            } catch (error) {
                console.warn('Clearing invalid shopSession:', error);
                localStorage.removeItem('shopSession');
            }
        }

        // 2) Support unified userSession if it represents a shop and is not expired
        const userSession = localStorage.getItem('userSession');
        if (userSession) {
            try {
                const s = JSON.parse(userSession);
                const m = tokenPattern.exec(s.sessionToken || '');
                if (!m || m[2] !== 'shop') throw new Error('Invalid or wrong-type token in userSession for shop');
                const tokenUserId = m[1];
                const issuedAt = parseInt(m[3], 10);
                if (s.userType !== 'shop' || !s.user || String(s.user.id) !== String(tokenUserId)) throw new Error('Token/user mismatch in userSession');
                const now = Date.now();
                const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
                const exp = s.expiresAt ? new Date(s.expiresAt).getTime() : (issuedAt + sevenDaysMs);
                if (now > exp) throw new Error('Expired userSession');

                // Extend expiry
                try {
                    s.expiresAt = new Date(now + sevenDaysMs).toISOString();
                    localStorage.setItem('userSession', JSON.stringify(s));
                } catch (_) {}

                this.currentShop = s.user;
                this.sessionToken = s.sessionToken;
                this.shopId = this.currentShop.id;
                console.log('✅ Shop authenticated (userSession):', this.currentShop.shop_name || this.currentShop.email);
                return true;
            } catch (e) {
                console.warn('Shop userSession invalid for shop app:', e);
            }
        }

        // 3) Fallback: legacy keys (must match SHOP token)
        const storedShop = localStorage.getItem('deliveryAppShop');
        const storedSession = localStorage.getItem('deliveryAppShopSession');
        if (storedShop && storedSession) {
            try {
                const m = tokenPattern.exec(storedSession || '');
                if (!m || m[2] !== 'shop') throw new Error('Legacy token invalid for shop');
                const shop = JSON.parse(storedShop);
                if (String(shop.id) !== String(m[1])) throw new Error('Legacy token user mismatch');
                this.currentShop = shop;
                this.sessionToken = storedSession;
                this.shopId = this.currentShop.id;
                console.log('✅ Shop authenticated (legacy):', this.currentShop.shop_name || this.currentShop.email);
                return true;
            } catch (error) {
                console.warn('Legacy shop session invalid, clearing:', error);
                localStorage.removeItem('deliveryAppShop');
                localStorage.removeItem('deliveryAppShopSession');
            }
        }

        console.log('❌ Shop not authenticated');
        return false;
    }

    bindEvents() {
        console.log('Binding events');




        // Bottom Navigation - use proper event delegation
        document.querySelectorAll('.nav-item').forEach(navItem => {
            navItem.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.currentTarget.dataset.page;
                if (page) {
                    console.log('Navigation clicked:', page);
                    this.navigateToPage(page);
                }
            });
        });

        // Navigation (if any top nav exists)
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.dataset.page;
                if (page) {
                    this.navigateToPage(page);
                }
            });
        });

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // Logout button in profile page
        const profileLogoutBtn = document.querySelector('.logout-btn');
        if (profileLogoutBtn) {
            profileLogoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // Change password button
        const changePasswordBtn = document.getElementById('change-password-btn');
        if (changePasswordBtn) {
            console.log('Found change password button, binding click event');
            changePasswordBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Change password button clicked');
                this.showPasswordModal();
            });
        } else {
            console.warn('Change password button not found in the DOM');
        }

        // Global click handler for dynamic elements
        document.addEventListener('click', (e) => {
            // Prevent handling if in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Handle clicks on driver cards to show details
            if (e.target.closest('.driver-card')) {
                const driverId = e.target.closest('.driver-card').dataset.id;
                if (driverId) {
                    this.showDriverDetails(driverId);
                }
                return;
            }

            // Handle modal close buttons
            if (e.target.classList.contains('close-btn') || e.target.closest('.close-btn')) {
                this.closeModal();
                return;
            }
        });
    }

    navigateToPage(page) {
        console.log('Navigating to page:', page);

        // Update active navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        const activeNavItem = document.querySelector(`[data-page="${page}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }

        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        // Show selected page
        const targetPage = document.getElementById(`${page}-page`);



        if (targetPage) {
            targetPage.classList.add('active');
        }

        this.currentPage = page;

        // Handle page-specific logic with optimized loading
        switch(page) {
            case 'dashboard':
                this.stopTimestampUpdates();
                this.loadDashboardData();
                break;
            case 'orders':
                this.stopTimestampUpdates();
                this.renderOrdersPage();
                break;
            case 'alerts':
                this.stopTimestampUpdates();
                this.loadNotifications(); // This will call loadDeliveryTeamFast
                break;
            case 'notifications':
                this.loadNotificationsPage();
                // Timestamp updates are already started in loadNotificationsPage()
                break;
            case 'settings':
                this.stopTimestampUpdates();
                this.loadSettingsPage();
                // Preload team members for settings page too
                this.loadSelectedDriversOptimized();
                break;
            case 'profile':
                this.stopTimestampUpdates();
                this.loadProfileData();
                break;
            case 'announcements':
                this.stopTimestampUpdates();
                this.loadAnnouncementsPage();
                break;
            case 'analytics':
                this.stopTimestampUpdates();
                this.renderAnalyticsPage();
                break;
        }
    }

    loadPageData(page) {
        switch (page) {
            case 'alerts':
                this.loadNotifications();
                break;
            case 'orders':
                this.renderOrdersPage();
                break;
            case 'settings':
                this.loadShopSettings();
                break;
            case 'profile':
                this.loadShopProfile();
                break;
        }
    }

    async loadShopData() {
        console.log('Loading shop data...');
        this.updateProfileDisplay();
    }

    // Prevent back navigation and show message; allow explicit logout flow
    preventBackNavigation() {
        try {
            this._exitingViaLogout = false;
            // Seed history to trap back
            window.history.replaceState({ trap: true }, document.title, window.location.href);
            window.history.pushState({ trap: true }, document.title, window.location.href);
            window.addEventListener('popstate', () => {
                if (this._exitingViaLogout) return; // allow during explicit logout
                // Immediately re-push current state to prevent navigating away
                window.history.pushState({ trap: true }, document.title, window.location.href);
                try { this.showToast('You can only log out only using your log out button', 'info'); } catch (e) {}
            });
            // Block unloads unless logging out explicitly
            window.addEventListener('beforeunload', (e) => {
                if (this._exitingViaLogout) return;
                e.preventDefault();
                e.returnValue = '';
                try { this.showToast('You can only log out only using your log out button', 'info'); } catch (e2) {}
            });
        } catch (e) { console.warn('Back prevention setup failed', e); }
    }

    updateProfileDisplay() {
        if (!this.currentShop) return;

        const shopNameEl = document.getElementById('profile-shop-name');
        const emailEl = document.getElementById('profile-email');

        if (shopNameEl) {
            shopNameEl.textContent = this.currentShop.shop_name || this.currentShop.name || 'Shop Name';
        }
        if (emailEl) {
            emailEl.textContent = this.currentShop.email;
        }
    }

    loadNotifications() {
        console.log('Loading notifications and delivery team...');

        const alertsContainer = document.getElementById('alerts-page');
        if (!alertsContainer) return;

        // Add delivery team section to alerts page with immediate loading state
        alertsContainer.innerHTML = `
            <div class="alerts-container">
                <div class="alerts-header">
                    <h2><i class="fas fa-bell"></i> Alerts & Team Management</h2>
                    <p>Manage your delivery team and send broadcast messages</p>
                </div>

                <!-- Delivery Team Section -->
                <div class="team-section">
                    <div class="section-header slim">
                        <div class="section-title">
                            <i class="fas fa-users"></i>
                            <h3>My Team <span id="team-count" class="count-badge">...</span></h3>
                        </div>
                        <div class="section-actions">
                            <button class="slim-button" id="broadcast-notification-btn">
                                <i class="fas fa-bullhorn"></i> Broadcast Message
                            </button>
                            <button class="slim-button" onclick="shopApp.navigateToPage('settings')">
                                <i class="fas fa-cog"></i> Manage Team
                            </button>
                        </div>
                    </div>

                    <div id="delivery-team-container" class="team-container">
                        <div class="loading-state">
                            <div class="loading-spinner">
                                <i class="fas fa-spinner fa-spin"></i>
                            </div>
                            <p>Loading team members...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Bind notification events first
        this.bindNotificationEvents();

        // Load delivery team immediately with aggressive loading
        this.loadDeliveryTeamFast();
    }

    // Fast loading method that tries multiple strategies
    async loadDeliveryTeamFast() {
        try {
            console.log('🚀 Fast-loading delivery team...');

            // Strategy 1: Use cache if available and recent (even if older than 5 minutes)
            if (this.teamMembersCache && this.selectedDrivers.length === 0) {
                console.log('📦 Using cached team members for immediate display');
                this.selectedDrivers = [...this.teamMembersCache];
                this.renderDeliveryTeamForAlerts();
            }

            // Strategy 2: Load from server in parallel
            const loadPromise = this.loadSelectedDriversOptimized();

            // Strategy 3: Race with timeout to ensure something shows quickly
            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => {
                    if (this.selectedDrivers.length === 0) {
                        console.log('⏰ Timeout reached, showing empty state');
                        this.renderDeliveryTeamForAlerts();
                    }
                    resolve();
                }, 2000); // Show something after 2 seconds max
            });

            // Wait for either data load or timeout
            await Promise.race([loadPromise, timeoutPromise]);

            // Final render with whatever data we have
            this.renderDeliveryTeamForAlerts();

        } catch (error) {
            console.error('❌ Error in fast delivery team loading:', error);
            this.renderDeliveryTeamError(error.message);
        }
    }

    loadShopSettings() {
        console.log('Loading shop settings...');
        // Placeholder for future settings loading
    }

    loadShopProfile() {
        console.log('Loading shop profile...');
        this.updateProfileDisplay();
    }

    loadAnnouncementsPage() {
        console.log('Loading announcements page...');
        const pageRoot = document.getElementById('announcements-page');
        if (!pageRoot) return;
        const content = pageRoot.querySelector('.announcements-content');
        if (!content) return;

        // Preserve original empty-state markup to restore when needed
        if (!this._announcementsEmptyHTML) {
            this._announcementsEmptyHTML = content.innerHTML;
        }

        let announcements = [];
        try {
            announcements = JSON.parse(localStorage.getItem('announcements') || '[]');
        } catch (e) {
            announcements = [];
        }
        // Newest first
        announcements.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Remove big white wrapper styling when we have real items
        if (!announcements.length) {
            content.style.background = '';
            content.style.border = '';
            content.style.boxShadow = '';
            content.style.padding = '';
            content.innerHTML = this._announcementsEmptyHTML;
            return;
        }
        content.style.background = 'transparent';
        content.style.border = 'none';
        content.style.boxShadow = 'none';
        content.style.padding = '0 8px 24px';

        const itemHTML = (a) => {
            const d = new Date(a.created_at);
            const date = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
            const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            const color = a.importance === 'high' ? '#ef4444' : a.importance === 'medium' ? '#f59e0b' : '#10b981';
            const label = a.importance?.[0]?.toUpperCase() + a.importance?.slice(1) + ' Importance';
            return `
                <div style="background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:16px 16px 14px; box-shadow:0 2px 12px rgba(0,0,0,.06);">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:8px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:34px; height:34px; border-radius:8px; background:${color}1A; color:${color}; display:flex; align-items:center; justify-content:center;">
                                <i class="fas fa-bullhorn"></i>
                            </div>
                            <div style="font-weight:600; color:#111827;">Announcement</div>
                        </div>
                        <span style="font-size:12px; color:#6b7280;">${date} ${time}</span>
                    </div>
                    <div style="color:#111827; font-size:14px; line-height:1.5;">${a.message}</div>
                    <div style="margin-top:10px; font-size:12px; color:${color}; display:inline-flex; align-items:center; gap:6px; background:${color}0F; padding:6px 10px; border-radius:999px;">
                        <i class="fas fa-circle" style="font-size:6px;"></i>
                        ${label}
                    </div>
                </div>`;
        };

        content.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:14px;">${announcements.map(itemHTML).join('')}</div>
        `;

        // Mark as viewed for this shop and broadcast
        this.markAnnouncementsViewed(announcements);
    }

    subscribeAnnouncements() {
        // Live updates via BroadcastChannel and storage events
        try {
            if (window.BroadcastChannel) {
                this._annBC = new BroadcastChannel('announcements');
                this._annBC.onmessage = (ev) => {
                    if (ev?.data?.type === 'updated' && this.currentPage === 'announcements') {
                        this.loadAnnouncementsPage();
                    }
                };
            }
        } catch (e) {
            console.warn('BroadcastChannel unavailable', e);
        }

        window.addEventListener('storage', (e) => {
            if ((e.key === 'announcements' || e.key === 'announcements_updated_at') && this.currentPage === 'announcements') {
                this.loadAnnouncementsPage();
            }
        });
    }

    markAnnouncementsViewed(announcements) {
        try {
            const shopId = this.currentShop?.id || this.shopId || 'unknown';
            if (!shopId) return;
            let views = {};
            try { views = JSON.parse(localStorage.getItem('announcement_views') || '{}'); } catch (_) {}
            let changed = false;
            announcements.forEach(a => {
                const id = a.id;
                if (!views[id]) views[id] = {};
                if (!views[id][shopId]) {
                    views[id][shopId] = { ts: Date.now() };
                    changed = true;
                }
            });
            if (changed) {
                localStorage.setItem('announcement_views', JSON.stringify(views));
                localStorage.setItem('announcement_views_updated_at', String(Date.now()));
                try {
                    if (window.BroadcastChannel) {
                        const bc = new BroadcastChannel('announcement_views');
                        bc.postMessage({ type: 'updated' });
                        bc.close();
                    }
                } catch (_) {}
            }
        } catch (e) {
            console.warn('Failed to mark announcements viewed', e);
        }
    }

    loadOrdersData() {
        console.log('Loading orders data...');
        // Placeholder for future orders functionality
        // This will be implemented when the orders system is developed
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

    async logout() {
        console.log('Shop logging out...');
        this._exitingViaLogout = true; // allow navigation/unload

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

        // Clear stored data
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

        // Stop timestamp updates
        this.stopTimestampUpdates();

        // Show logout message
        this.showToast('Logged out successfully', 'success');

        // Redirect to login after delay
        setTimeout(() => {
            window.location.href = '/login';
        }, 1000);
    }

    closeModal() {
        console.log('Closing modal');
        const modal = document.querySelector('.modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    }

    showToast(message, type = 'success') {
        // Use the new modern notification style for all toasts
        this.showModernToast(message, type);
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

    // Update loadSettingsPage to remove Your Delivery Team section but keep driver management
    loadSettingsPage() {
        console.log('Loading settings page...');

        const settingsPage = document.getElementById('settings-page');
        if (!settingsPage) return;

        settingsPage.innerHTML = `
            <div class="settings-container">
                <div class="settings-header">
                    <h2><i class="fas fa-cog"></i> Shop Settings</h2>
                    <p>Manage your shop preferences and delivery team</p>
                </div>


                <!-- Delivery Team Management -->
                <div class="settings-section">
                    <div class="section-header">
                        <h3><i class="fas fa-truck"></i> Delivery Team Management</h3>
                        <p>Find and add delivery drivers to your team</p>
                    </div>

                    <!-- Search and Filters -->
                    <div class="search-controls">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" id="driver-search" placeholder="Search drivers by email...">
                        </div>
                        <div class="filter-controls">
                            <span class="results-count" id="results-count">Loading...</span>
                        </div>
                    </div>

                    <!-- Available Drivers -->
                    <div class="drivers-section">
                        <h4>Available Drivers</h4>
                        <div id="drivers-list" class="drivers-grid">
                            <div class="loading">
                                <i class="fas fa-spinner fa-spin"></i>
                                Loading drivers...
                            </div>
                        </div>

                        <!-- Pagination -->
                        <div id="pagination" class="pagination-controls">
                            <!-- Pagination will be rendered here -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Initialize delivery management
        setTimeout(() => {
            this.initDeliveryManagement();
        }, 100);
    }

    // Add delivery management functionality
    async initDeliveryManagement() {
        console.log('Initializing delivery management...');

        this.currentPage = 1;
        this.driversPerPage = 10;
        this.searchTerm = '';
        this.selectedDrivers = [];
        this.totalPages = 1;

        this.bindSettingsEvents();

        // Load selected drivers first, then load available drivers
        // This ensures proper filtering
        try {
            await this.loadSelectedDrivers();
            console.log('✅ Selected drivers loaded, now loading available drivers');
        } catch (error) {
            console.warn('⚠️ Failed to load selected drivers, proceeding with empty list:', error);
            this.selectedDrivers = [];
        }

        // Now load available drivers with proper filtering
        this.loadDrivers();
    }

    bindSettingsEvents() {
        // Search functionality with debounce
        const searchInput = document.getElementById('driver-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.driverSearchDebounce);
                this.searchTerm = e.target.value;
                this.currentPage = 1;

                // Show/hide clear search button
                const clearSearchBtn = document.getElementById('clear-search');
                if (clearSearchBtn) {
                    clearSearchBtn.style.display = e.target.value ? 'block' : 'none';
                }

                this.driverSearchDebounce = setTimeout(() => {
                this.loadDrivers();
                }, 250); // 250ms debounce
            });
        }

        // Clear search button
        const clearSearchBtn = document.getElementById('clear-search');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    this.searchTerm = '';
                    this.currentPage = 1;
                    clearSearchBtn.style.display = 'none';
                    this.loadDrivers();
                }
            });
        }

        // Refresh drivers button
        const refreshBtn = document.getElementById('refresh-drivers');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadDrivers();
            });
        }

        // Send team notification button
        const sendTeamNotificationBtn = document.getElementById('send-team-notification');
        if (sendTeamNotificationBtn) {
            sendTeamNotificationBtn.addEventListener('click', () => {
                this.sendBroadcastNotification();
            });
        }

        // Notification button
        const notificationBtn = document.getElementById('send-notification-btn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => {
                this.sendNotification();
            });
        }
    }

        // Open language selection modal (like driver side)
        openLanguageModal() {
            // Remove any existing modal
            const existing = document.getElementById('language-modal');
            if (existing) existing.remove();

            const currentLang = (window.i18n && typeof window.i18n.getCurrentLanguage === 'function')
                ? window.i18n.getCurrentLanguage()
                : (localStorage.getItem('app_language') || 'en');
            let selectedLang = currentLang;

            const t = (key, fallback) => (window.t ? window.t(key) : fallback);

            const modalHTML = `
                <div id="language-modal" style="
                    position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center;
                    background: rgba(0,0,0,0.4);
                ">
                    <div style="
                        width: min(520px, 92vw); max-width: 520px; background: #fff; border-radius: 16px; overflow: hidden;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.15);
                    ">
                        <div style="padding: 18px 20px; border-bottom: 1px solid #f3f4f6; display:flex; align-items:center; justify-content: space-between;">
                            <h3 style="margin:0; font-size: 18px; font-weight: 700; color: #111827;" data-translate="languageModal">${t('languageModal','Language Selection')}</h3>
                            <button onclick=\"document.getElementById('language-modal').remove()\" style=\"background:none;border:none;font-size:18px;color:#9ca3af;cursor:pointer;\">×</button>
                        </div>

                        <div style="padding: 16px 20px;">
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <button id="lang-opt-en" type="button" style="
                                    border: 2px solid ${selectedLang==='en' ? '#ff6b35' : '#e5e7eb'}; border-radius: 12px; padding: 14px; cursor: pointer; text-align: left;
                                    background: ${selectedLang==='en' ? '#fff7ed' : '#fff'}; transition: all .2s;
                                ">
                                    <div style="display:flex; align-items:center; gap:10px;">
                                        <div style="width:34px;height:34px;border-radius:10px;background:#f3f4f6;display:grid;place-items:center;">
                                            <i class="fas fa-flag-usa" style="color:#6b7280;"></i>
                                        </div>
                                        <div>
                                            <div style="font-weight:600;color:#111827;" data-translate="english">${t('english','English')}</div>
                                            <div style="font-size:12px;color:#6b7280;">EN</div>
                                        </div>
                                    </div>
                                </button>
                                <button id="lang-opt-gr" type="button" style="
                                    border: 2px solid ${selectedLang==='gr' ? '#ff6b35' : '#e5e7eb'}; border-radius: 12px; padding: 14px; cursor: pointer; text-align: left;
                                    background: ${selectedLang==='gr' ? '#fff7ed' : '#fff'}; transition: all .2s;
                                ">
                                    <div style="display:flex; align-items:center; gap:10px;">
                                        <div style="width:34px;height:34px;border-radius:10px;background:#f3f4f6;display:grid;place-items:center;">
                                            <i class="fas fa-flag" style="color:#6b7280;"></i>
                                        </div>
                                        <div>
                                            <div style="font-weight:600;color:#111827;" data-translate="greek">${t('greek','Greek')}</div>
                                            <div style="font-size:12px;color:#6b7280;">GR</div>
                                        </div>
                                    </div>
                                </button>
                            </div>

                            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
                                <button id="lang-cancel" class="btn secondary" style="padding:10px 14px; border-radius:10px; border:1px solid #e5e7eb; background:#fff; color:#374151;">
                                    ${t('cancel','Cancel')}
                                </button>
                                <button id="lang-save" class="btn primary" style="padding:10px 14px; border-radius:10px; background:#ff6b35; color:#fff; border:none;">
                                    ${t('saveSettings','Save Settings')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;

            document.body.insertAdjacentHTML('beforeend', modalHTML);
            const modal = document.getElementById('language-modal');
            const optEn = document.getElementById('lang-opt-en');
            const optGr = document.getElementById('lang-opt-gr');
            const saveBtn = document.getElementById('lang-save');
            const cancelBtn = document.getElementById('lang-cancel');

            const updateStyles = () => {
                if (!optEn || !optGr) return;
                optEn.style.borderColor = (selectedLang==='en') ? '#ff6b35' : '#e5e7eb';
                optEn.style.background = (selectedLang==='en') ? '#fff7ed' : '#fff';
                optGr.style.borderColor = (selectedLang==='gr') ? '#ff6b35' : '#e5e7eb';
                optGr.style.background = (selectedLang==='gr') ? '#fff7ed' : '#fff';
            };

            if (optEn) optEn.addEventListener('click', () => { selectedLang = 'en'; updateStyles(); });
            if (optGr) optGr.addEventListener('click', () => { selectedLang = 'gr'; updateStyles(); });

            if (cancelBtn) cancelBtn.addEventListener('click', () => modal.remove());

            if (saveBtn) saveBtn.addEventListener('click', async () => {
                try {
                    if (window.i18n && typeof window.i18n.setLanguage === 'function') {
                        const ok = await window.i18n.setLanguage(selectedLang);
                        if (ok) {
                            this.showToast(t('settingsSaved','Settings saved successfully'), 'success');
                        } else {
                            this.showToast(t('failedToSaveSettings','Failed to save settings'), 'error');
                        }
                    } else {
                        // Fallback local only
                        localStorage.setItem('app_language', selectedLang);
                        this.showToast(t('settingsSaved','Settings saved successfully'), 'success');
                    }
                } catch (e) {
                    console.error('Language save failed', e);
                    this.showToast(t('failedToSaveSettings','Failed to save settings'), 'error');
                } finally {
                    modal.remove();
                }
            });

            // Close when clicking backdrop
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        }


        // Fixing tools: show modal, list stale pending orders (>2m), allow fix
        openFixingModal() {
            try {
                const existing = document.getElementById('fixing-modal');
                if (existing) existing.remove();
                const t = (k,f)=> (window.t ? window.t(k) : f);
                const modal = document.createElement('div');
                modal.id = 'fixing-modal';
                modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4)';
                modal.innerHTML = `
                    <div style="width:min(720px,95vw);background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.15)">
                        <div style="padding:16px 18px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;justify-content:space-between;">
                            <h3 style="margin:0;font-size:18px;font-weight:700;color:#111827;" data-translate="fixOrder">Fix Order</h3>
                            <button class="close-fixing" style="background:none;border:none;font-size:18px;color:#9ca3af;cursor:pointer;">×</button>
                        </div>
                        <div style="padding:14px 18px;color:#6b7280;font-size:13px;" data-translate="fixOrdersHelper">Shows pending orders older than 2 minutes. Select one to re-send to your team so it appears to drivers.</div>
                        <div id="fixing-list" style="max-height:56vh;overflow:auto;padding:6px 18px 18px 18px;">
                            <div style="padding:16px;text-align:center;color:#9ca3af;">
                                <i class="fas fa-spinner fa-spin"></i> Loading...
                            </div>
                        </div>
                        <div style="padding:12px 18px;border-top:1px solid #f3f4f6;display:flex;gap:8px;justify-content:flex-end;">
                            <button class="close-fixing" style="padding:10px 14px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;color:#374151;" data-translate="cancel">Cancel</button>
                            <button id="fix-selected-order" disabled style="padding:10px 14px;border-radius:10px;background:#06b6d4;color:#fff;border:none;opacity:.6;" data-translate="fixSelectedOrder">Fix Selected</button>
                        </div>
                    </div>`;
                document.body.appendChild(modal);
                const closeEls = modal.querySelectorAll('.close-fixing');
                closeEls.forEach(el=> el.addEventListener('click', ()=> modal.remove()));
                modal.addEventListener('click', (e)=> { if(e.target===modal) modal.remove(); });

                const listEl = modal.querySelector('#fixing-list');
                const fixBtn = modal.querySelector('#fix-selected-order');
                let selectedId = null;

                const renderList = (orders)=>{
                    if (!orders || orders.length===0) {
                        listEl.innerHTML = `<div style="padding:16px;text-align:center;color:#9ca3af;">No pending orders older than 2 minutes.</div>`;
                        return;
                    }
                    listEl.innerHTML = orders.map(o=>{
                        const created = new Date(o.created_at);
                        const mins = Math.max(0, Math.floor((Date.now()-created.getTime())/60000));
                        const prep = parseInt(o.preparation_time)||0;
                        const remaining = Math.max(0, prep - mins);
                        return `
                        <label style="display:flex;gap:12px;align-items:flex-start;border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin:8px 0;cursor:pointer;">
                            <input type="radio" name="fix-order" value="${o.id}" style="margin-top:4px;" />
                            <div style="flex:1;">
                                <div style="display:flex;align-items:center;gap:8px;">
                                    <div style="font-weight:600;color:#111827;">#${o.id}</div>
                                    <div style="font-size:12px;color:#6b7280;">${created.toLocaleString()}</div>
                                </div>
                                <div style="font-size:13px;color:#374151;margin-top:6px;">${o.delivery_address || ''}</div>
                                <div style="font-size:12px;color:#6b7280;margin-top:4px;">⏰ ${remaining===0?'Ready Now':`Ready in ${remaining} minutes`} • €${parseFloat(o.order_amount||0).toFixed(2)}</div>
                            </div>
                        </label>`;
                    }).join('');

                    // bind selection
                    listEl.querySelectorAll('input[name="fix-order"]').forEach(input=>{
                        input.addEventListener('change', ()=>{
                            selectedId = input.value;
                            fixBtn.disabled = !selectedId;
                            fixBtn.style.opacity = selectedId ? '1' : '.6';
                        });
                    });
                };

                // Load list
                this.fetchStalePendingOrders().then(renderList).catch(err=>{
                    console.error('Fix list load failed', err);
                    listEl.innerHTML = `<div style="padding:16px;text-align:center;color:#ef4444;">Failed to load. Try again later.</div>`;
                });

                // Handle fix
                fixBtn.addEventListener('click', async ()=>{
                    if (!selectedId || !this.currentShop || !this.currentShop.id) return;
                    try {
                        fixBtn.disabled = true; fixBtn.style.opacity = '.6';
                        this.showToast('Fixing order...', 'info');
                        const resp = await fetch(`/api/shop/${this.currentShop.id}/orders/${selectedId}/fix`, { method: 'POST' });
                        const result = await resp.json();
                        if (result.success) {
                            this.showToast(`Order #${selectedId} re-sent to drivers`, 'success');
                            modal.remove();
                        } else {
                            throw new Error(result.message || 'Fix failed');
                        }
                    } catch (e) {
                        console.error('Fix order failed', e);
                        this.showToast('Failed to fix order', 'error');
                        fixBtn.disabled = false; fixBtn.style.opacity = '1';
                    }
                });
            } catch (e) {
                console.error('Open fixing modal failed', e);
                this.showToast('Failed to open fixing tools', 'error');
            }
        }

        async fetchStalePendingOrders(minMinutes = 2) {
            if (!this.currentShop || !this.currentShop.id) throw new Error('No shop');
            const primaryUrl = `/api/shop/${this.currentShop.id}/pending-orders-stale?minMinutes=${minMinutes}`;
            try {
                const resp = await fetch(primaryUrl);
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const ct = resp.headers.get('content-type') || '';
                if (!ct.includes('application/json')) throw new Error('Non-JSON response');
                const json = await resp.json();
                if (!json.success) throw new Error(json.message || 'Load failed');
                return Array.isArray(json.orders) ? json.orders : [];
            } catch (err) {
                console.warn('Primary stale-pending endpoint failed, using fallback:', err?.message || err);
                // Fallback: fetch pending orders and filter on client by age
                const fbResp = await fetch(`/api/shop/${this.currentShop.id}/orders?status=pending&limit=200`);
                if (!fbResp.ok) throw new Error(`Fallback HTTP ${fbResp.status}`);
                const fbJson = await fbResp.json();
                if (!fbJson.success) throw new Error(fbJson.message || 'Fallback failed');
                const cutoff = Date.now() - (minMinutes * 60 * 1000);
                const pendingOld = (fbJson.orders || []).filter(o => {
                    const ts = new Date(o.created_at).getTime();
                    return Number.isFinite(ts) && ts <= cutoff && (o.status === 'pending' || !o.status);
                });
                return pendingOld;
            }
        }


    async loadDrivers() {
        try {
            // Show loading state immediately
            const container = document.getElementById('drivers-list');
            if (container && !container.querySelector('.loading')) {
                container.innerHTML = `
                    <div class="loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        Loading drivers...
                    </div>
                `;
            }

            // If no search term, only load 5 random drivers (no pagination)
            const isSearch = !!this.searchTerm;

            // Create cache key
            const cacheKey = `${this.searchTerm || 'default'}_${isSearch ? this.currentPage : 1}_${isSearch ? this.driversPerPage : 5}`;

            // Check cache first (cache for 30 seconds)
            if (this.driverSearchCache && this.driverSearchCache[cacheKey]) {
                const cached = this.driverSearchCache[cacheKey];
                const now = Date.now();
                if (now - cached.timestamp < 30000) { // 30 seconds cache
                    console.log('🚀 Using cached drivers data');
                    this.renderCachedDrivers(cached.data, isSearch);
                    return;
                }
            }

            const params = new URLSearchParams({
                page: isSearch ? this.currentPage : 1,
                limit: isSearch ? this.driversPerPage : 5,
                search: this.searchTerm || ''
            });

            const response = await fetch(`/api/shop/delivery-drivers?${params}`);
            const result = await response.json();

            if (result.success) {
                // Cache the result
                if (!this.driverSearchCache) this.driverSearchCache = {};
                this.driverSearchCache[cacheKey] = {
                    timestamp: Date.now(),
                    data: result
                };

                this.renderCachedDrivers(result, isSearch);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error loading drivers:', error);
            this.showToast('Failed to load drivers', 'error');

            // Show error state
            const container = document.getElementById('drivers-list');
            if (container) {
                container.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to load drivers</p>
                        <button onclick="shopApp.loadDrivers()" class="retry-btn">Retry</button>
                    </div>
                `;
            }
        }
    }

    async renderCachedDrivers(result, isSearch) {
        // Ensure we have the latest selected drivers before filtering
        if (!this.selectedDrivers || this.selectedDrivers.length === 0) {
            try {
                console.log('🔄 Refreshing selected drivers for accurate filtering...');
                await this.loadSelectedDriversOptimized();
            } catch (error) {
                console.warn('⚠️ Could not refresh selected drivers, using current list:', error);
            }
        }

        // Double-check filtering with both ID and email to be extra safe
        const filteredDrivers = result.drivers.filter(driver => {
            const isAlreadySelected = this.selectedDrivers.some(selected =>
                selected.id === driver.id ||
                selected.email === driver.email ||
                selected.id.toString() === driver.id.toString()
            );
            return !isAlreadySelected;
        });

        console.log(`🔍 Filtered ${result.drivers.length} drivers to ${filteredDrivers.length} (excluded ${result.drivers.length - filteredDrivers.length} already selected)`);

        // If not searching, do not paginate, just show the 5 random drivers
        if (!isSearch) {
            this.renderDrivers(filteredDrivers);
            this.renderPagination({ totalPages: 1, currentPage: 1, hasNext: false, hasPrevious: false });
            this.updateResultsCount(filteredDrivers.length);
            this.totalPages = 1;
        } else {
            const filteredTotalCount = Math.max(0, result.pagination.totalCount - this.selectedDrivers.length);
            const filteredTotalPages = Math.max(1, Math.ceil(filteredTotalCount / this.driversPerPage));
            const pagination = {
                ...result.pagination,
                totalCount: filteredTotalCount,
                totalPages: filteredTotalPages
            };
            this.renderDrivers(filteredDrivers);
            this.renderPagination(pagination);
            this.updateResultsCount(filteredTotalCount);
            this.totalPages = filteredTotalPages;
        }
    }

    renderDrivers(drivers) {
        const container = document.getElementById('drivers-list');
        if (!container) return;

        if (drivers.length === 0) {
            container.innerHTML = `
                <div class="empty-state-modern">
                    <i class="fas fa-search"></i>
                    <h4>No drivers found</h4>
                    <p>Try adjusting your search terms</p>
                </div>
            `;
            return;
        }

        const driversHTML = drivers.map(driver => `
            <div class="driver-card-modern" data-driver-id="${driver.id}">
                <div class="driver-info-modern">
                    <div class="driver-email-modern">${driver.email}</div>
                    <div class="driver-meta-modern">
                        <i class="fas fa-calendar"></i>
                        Joined ${this.formatDate(driver.created_at)}
                    </div>
                </div>
                <div class="driver-actions-modern">
                    <button class="add-driver-btn-modern" onclick="shopApp.addDriver('${driver.id}', '${driver.email}')">
                        <i class="fas fa-plus"></i>
                        Add to Team
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = driversHTML;
    }

    renderPagination(pagination) {
        const container = document.getElementById('pagination');
        if (!container) return;

        if (pagination.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <button class="pagination-btn-modern" ${!pagination.hasPrevious ? 'disabled' : ''}
                    onclick="shopApp.changePage(${pagination.currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;

        // Page numbers
        const startPage = Math.max(1, pagination.currentPage - 2);
        const endPage = Math.min(pagination.totalPages, pagination.currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn-modern ${i === pagination.currentPage ? 'active' : ''}"
                        onclick="shopApp.changePage(${i})">
                    ${i}
                </button>
            `;
        }

        // Next button
        paginationHTML += `
            <button class="pagination-btn-modern" ${!pagination.hasNext ? 'disabled' : ''}
                    onclick="shopApp.changePage(${pagination.currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        // Page info
        paginationHTML += `
            <span class="page-info-modern">
                Page ${pagination.currentPage} of ${pagination.totalPages}
            </span>
        `;

        container.innerHTML = paginationHTML;
    }

    renderSelectedDrivers() {
        const container = document.getElementById('selected-drivers');
        const countElement = document.getElementById('selected-count');

        if (countElement) {
            countElement.textContent = this.selectedDrivers.length;
        }

        if (!container) return;

        if (this.selectedDrivers.length === 0) {
            container.innerHTML = `
                <div class="empty-state-modern">
                    <i class="fas fa-users"></i>
                    <h4>No drivers selected</h4>
                    <p>Add drivers to your delivery team to get started</p>
                </div>
            `;
            return;
        }

        // Use modern card style for selected drivers
        const selectedHTML = this.selectedDrivers.map(driver => `
            <div class="selected-driver-card-modern" data-driver-id="${driver.id}">
                <div class="selected-driver-info-modern">
                    <div class="driver-details-modern">
                        <div class="driver-name-modern">${driver.email}</div>
                        <div class="driver-email-modern-selected">
                            <i class="fas fa-user"></i> Team Member
                        </div>
                    </div>
                    <div class="driver-actions-modern">
                        <button class="notify-driver-btn" onclick="shopApp.notifyDriver('${driver.id}')" style="margin-right: 8px;">
                            <i class="fas fa-bell"></i> Notify
                        </button>
                        <button class="remove-driver-btn-modern" onclick="shopApp.removeDriver('${driver.id}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = selectedHTML;
    }

    updateResultsCount(count) {
        const element = document.getElementById('results-count');
        if (element) {
            element.textContent = `${count} driver${count !== 1 ? 's' : ''} found`;
        }
    }

    updateNotificationCount() {
        const element = document.getElementById('notification-count');
        if (element) {
            element.textContent = this.selectedDrivers.length;
        }
    }

    changePage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.loadDrivers();
        }
    }

    async addDriver(driverId, driverEmail) {
        try {
            // Get shop ID from the current shop object
            const shopId = this.currentShop.id;

            if (!shopId) {
                console.error('No shop ID available');
                return;
            }

            console.log(`Adding driver ${driverId} to shop ${shopId}`);

            // Show loading feedback
            this.showToast('Adding driver to team...', 'info');

            const response = await fetch(`/api/shop/${shopId}/add-driver`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ driverId })
            });

            const result = await response.json();

            // Handle duplicate driver error gracefully
            const isDuplicate = result.code === '23505' || (result.message && result.message.toLowerCase().includes('duplicate key'));
            if (result.success || isDuplicate) {
                if (isDuplicate) {
                    this.showToast('Driver is already in your team.', 'info');
                } else {
                this.showToast('Driver added to your team successfully!', 'success');
                }
                // Clear cache to ensure fresh data
                this.teamMembersCache = null;
                this.teamMembersCacheTime = null;
                // Optimistically add to current list for immediate UI update
                const newDriver = {
                    id: driverId,
                    email: driverEmail,
                    created_at: new Date().toISOString()
                };
                if (!this.selectedDrivers.find(d => d.id === driverId)) {
                    this.selectedDrivers.push(newDriver);
                }
                // Clear all driver cache to ensure fresh data
                this.driverSearchCache = {};
                console.log('🗑️ Cleared driver cache after adding driver');

                // Re-render the drivers list for the current page
                this.loadDrivers();
                // Update UI everywhere else
                    this.renderSelectedDrivers();
                    this.updateNotificationCount();
                    this.renderDeliveryTeamForAlerts();
                // Refresh data in background to ensure accuracy
                setTimeout(() => {
                    this.loadSelectedDriversOptimized(true);
                }, 500);
            } else {
                throw new Error(result.message || 'Failed to add driver to team');
            }
        } catch (error) {
            // If error is duplicate, handle gracefully
            if (error && error.message && error.message.toLowerCase().includes('duplicate key')) {
                this.showToast('Driver is already in your team.', 'info');
                if (!this.selectedDrivers.find(d => d.id === driverId)) {
                    this.selectedDrivers.push({ id: driverId, email: driverEmail, created_at: new Date().toISOString() });
                }
                // Clear driver cache to ensure fresh data
                this.driverSearchCache = {};
                console.log('🗑️ Cleared driver cache after duplicate driver detection');

                this.loadDrivers();
                this.renderSelectedDrivers();
                this.updateNotificationCount();
                this.renderDeliveryTeamForAlerts();
                setTimeout(() => {
                    this.loadSelectedDriversOptimized(true);
                }, 500);
            } else {
            console.error('Error adding driver:', error);
            this.showToast(`Failed to add driver: ${error.message}`, 'error');
            }
        }
    }

    async removeDriver(driverId) {
        // Show custom modal instead of confirm()
        const modalId = `remove-driver-modal-${driverId}`;
        if (document.getElementById(modalId)) return; // Prevent duplicate modals
        const driver = this.selectedDrivers.find(d => d.id === driverId);
        const driverEmail = driver ? driver.email : '';
        const modalHTML = `
            <div id="${modalId}" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-user-times"></i> Remove Driver</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Are you sure you want to remove <strong>${this.escapeHTML(driverEmail)}</strong> from your team?</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn secondary close-modal">Cancel</button>
                        <button class="btn danger" id="confirm-remove-driver-btn-${driverId}">
                            <i class="fas fa-user-times"></i> Remove
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = document.getElementById(modalId);
        // Close modal on click
        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });
        // Confirm remove
        document.getElementById(`confirm-remove-driver-btn-${driverId}`).addEventListener('click', async () => {
            modal.remove();
            try {
            // Get shop ID from the current shop object
            const shopId = this.currentShop.id;
            if (!shopId) {
                console.error('No shop ID available');
                return;
            }
            this.showToast('Removing driver from team...', 'info');
            const response = await fetch(`/api/shop/${shopId}/remove-driver/${driverId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const result = await response.json();
            if (result.success) {
                this.showToast('Driver removed from your team successfully!', 'success');
                this.teamMembersCache = null;
                this.teamMembersCacheTime = null;

                // Clear driver cache to ensure fresh data
                this.driverSearchCache = {};
                console.log('🗑️ Cleared driver cache after removing driver');

                this.selectedDrivers = this.selectedDrivers.filter(d => d.id !== driverId);
                this.renderSelectedDrivers();
                this.updateNotificationCount();
                this.renderDeliveryTeamForAlerts();
                this.loadDrivers();
                setTimeout(() => {
                    this.loadSelectedDriversOptimized(true);
                }, 500);
            } else {
                throw new Error(result.message || 'Failed to remove driver from team');
            }
        } catch (error) {
            console.error('Error removing driver:', error);
            this.showToast(`Failed to remove driver: ${error.message}`, 'error');
        }
        });
    }

    async notifyDriver(driverId) {
        try {
            const driver = this.selectedDrivers.find(d => d.id === driverId);
            if (!driver) {
                this.showToast('Driver not found', 'error');
                return;
            }

            // Open notification modal
            const modalHTML = `
                <div id="notify-driver-modal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3><i class="fas fa-paper-plane"></i> Send Notification</h3>
                            <button class="close-modal">&times;</button>
                        </div>
                        <div class="modal-body">
                            <p>Send a notification to <strong>${driver.email}</strong></p>
                            <textarea id="driver-notification-message" placeholder="Type your message here..."></textarea>
                        </div>
                        <div class="modal-footer">
                            <button class="btn secondary close-modal">Cancel</button>
                            <button class="btn primary" id="send-driver-notification-btn">
                                <i class="fas fa-paper-plane"></i> Send
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);

            // Bind events
            const modal = document.getElementById('notify-driver-modal');
            const closeButtons = modal.querySelectorAll('.close-modal');
            const sendButton = document.getElementById('send-driver-notification-btn');

            closeButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    modal.remove();
                });
            });

            sendButton.addEventListener('click', async () => {
                // Disable button immediately to prevent duplicates
                sendButton.disabled = true;
                sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

                // Get message from textarea
                const message = document.getElementById('driver-notification-message').value.trim();
                if (!message) {
                    this.showToast('Please enter a message', 'error');
                    // Re-enable button
                    sendButton.disabled = false;
                    sendButton.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
                    return;
                }

                // Get shop ID from the current shop object
                const shopId = this.currentShop.id;

                if (!shopId) {
                    this.showToast('Shop ID not available', 'error');
                    // Re-enable button
                    sendButton.disabled = false;
                    sendButton.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
                    return;
                }

                // Send notification
                try {
                    const response = await fetch(`/api/shop/${shopId}/notify-driver/${driverId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ message })
                    });

                    const result = await response.json();

                    if (result.success) {
                        // Play confirmation sound for successful notification send
                        this.playConfirmationSound();
                        this.showToast(result.message, 'success');
                        modal.remove();
                    } else {
                        throw new Error(result.message || 'Failed to send notification');
                    }
                } catch (error) {
                    console.error('Error sending notification:', error);
                    this.showToast('Failed to send notification', 'error');
                    // Re-enable button on error
                    sendButton.disabled = false;
                    sendButton.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
                }
            });

            // Focus textarea
            setTimeout(() => {
                document.getElementById('driver-notification-message').focus();
            }, 100);
        } catch (error) {
            console.error('Error preparing notification:', error);
            this.showToast('Failed to prepare notification', 'error');
        }
    }

    async sendBroadcastNotification() {
        try {
            if (!this.selectedDrivers || this.selectedDrivers.length === 0) {
                this.showToast('No drivers in your team to notify', 'error');
                return;
            }

            // Create a broadcast modal
            const modalHTML = `
                <div id="broadcast-modal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3><i class="fas fa-paper-plane"></i> Send Team Notification</h3>
                            <button class="close-modal">&times;</button>
                        </div>
                        <div class="modal-body">
                            <p>Send a notification to all ${this.selectedDrivers.length} team members</p>
                            <textarea id="broadcast-message" placeholder="Type your message here..."></textarea>
                        </div>
                        <div class="modal-footer">
                            <button class="btn secondary close-modal">Cancel</button>
                            <button class="btn primary" id="send-broadcast-btn">
                                <i class="fas fa-paper-plane"></i> Send to All
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);

            // Bind events
            const modal = document.getElementById('broadcast-modal');
            const closeButtons = modal.querySelectorAll('.close-modal');
            const sendButton = document.getElementById('send-broadcast-btn');

            closeButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    modal.remove();
                });
            });

            sendButton.addEventListener('click', async () => {
                // Disable button immediately to prevent duplicates
                sendButton.disabled = true;
                sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

                // Get message from textarea
                const message = document.getElementById('broadcast-message').value.trim();
                if (!message) {
                    this.showToast('Please enter a message', 'error');
                    // Re-enable button
                    sendButton.disabled = false;
                    sendButton.innerHTML = '<i class="fas fa-paper-plane"></i> Send to All';
                    return;
                }

                // Get shop ID from the current shop object
                const shopId = this.currentShop.id;

                if (!shopId) {
                    this.showToast('Shop ID not available', 'error');
                    // Re-enable button
                    sendButton.disabled = false;
                    sendButton.innerHTML = '<i class="fas fa-paper-plane"></i> Send to All';
                    return;
                }

                // Send broadcast notification
                try {
                    const response = await fetch(`/api/shop/${shopId}/notify-team`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ message })
                    });

                    const result = await response.json();

                    if (result.success) {
                        // Play confirmation sound for successful broadcast send
                        this.playConfirmationSound();
                        this.showToast(result.message, 'success');
                        modal.remove();
                    } else {
                        throw new Error(result.message || 'Failed to send team notification');
                    }
                } catch (error) {
                    console.error('Error sending team notification:', error);
                    this.showToast('Failed to send team notification', 'error');
                    // Re-enable button on error
                    sendButton.disabled = false;
                    sendButton.innerHTML = '<i class="fas fa-paper-plane"></i> Send to All';
                }
            });

            // Focus textarea
            setTimeout(() => {
                document.getElementById('broadcast-message').focus();
            }, 100);
        } catch (error) {
            console.error('Error preparing broadcast notification:', error);
            this.showToast('Failed to prepare broadcast notification', 'error');
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('el-GR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: 'Europe/Athens'
        });
    }

    // Utilities: format day as YYYY-MM-DD
    getTodayYMD() {
        const d = new Date();
        return this.formatYMD(d);
    }
    formatYMD(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }


    timeAgo(date) {
        // Simple, reliable Greek time display
        const notificationDate = new Date(date);
        const now = new Date();
        const diffInSeconds = Math.floor((now - notificationDate) / 1000);

        // For very recent notifications (less than 30 seconds), show "Τώρα"
        if (diffInSeconds < 30) {
            return 'Τώρα';
        }

        // Show Greek time with proper formatting based on age
        const greekFormatter = new Intl.DateTimeFormat('el-GR', {
            timeZone: 'Europe/Athens'
        });

        const notificationInGreece = greekFormatter.format(notificationDate);
        const nowInGreece = greekFormatter.format(now);

        // Check if it's today in Greek timezone
        if (notificationInGreece === nowInGreece) {
            return new Intl.DateTimeFormat('el-GR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Athens'
            }).format(notificationDate);
        }

        // For yesterday
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayInGreece = greekFormatter.format(yesterday);

        if (notificationInGreece === yesterdayInGreece) {
            const timeStr = new Intl.DateTimeFormat('el-GR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Athens'
            }).format(notificationDate);
            return `Χθες ${timeStr}`;
        }

        // For older notifications, show date and time in Greek
        return new Intl.DateTimeFormat('el-GR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Athens'
        }).format(notificationDate);
    }

    // Real-time timestamp update methods
    startTimestampUpdates() {
        // Clear any existing interval
        this.stopTimestampUpdates();

        // Update timestamps every 30 seconds
        this.timestampUpdateInterval = setInterval(() => {
            this.updateAllTimestamps();
        }, 30000);

        console.log('✅ Started real-time timestamp updates');
    }

    stopTimestampUpdates() {
        if (this.timestampUpdateInterval) {
            clearInterval(this.timestampUpdateInterval);
            this.timestampUpdateInterval = null;
            console.log('⏹️ Stopped real-time timestamp updates');
        }
    }

    updateAllTimestamps() {
        // Update timestamps in notification cards
        const timestampElements = document.querySelectorAll('.notification-time-simple, .notification-timestamp, .notification-time-widget, .time-mini');

        timestampElements.forEach(element => {
            const notificationCard = element.closest('[data-created-at]');
            if (notificationCard) {
                const createdAt = notificationCard.getAttribute('data-created-at');
                if (createdAt) {
                    const newTime = this.timeAgo(new Date(createdAt));
                    if (element.textContent !== newTime) {
                        element.textContent = newTime;
                    }
                }
            }
        });

        // Update timestamps in team member cards (join dates)
        const joinDateElements = document.querySelectorAll('.join-date');
        joinDateElements.forEach(element => {
            const teamCard = element.closest('[data-created-at]');
            if (teamCard) {
                const createdAt = teamCard.getAttribute('data-created-at');
                if (createdAt) {
                    const newTime = this.formatDate(createdAt);
                    const timeSpan = element.querySelector('span:last-child');
                    if (timeSpan && timeSpan.textContent !== newTime) {
                        timeSpan.textContent = newTime;
                    }
                }
            }
        });
    }

    // Add method to load delivery team on alerts page
    async loadDeliveryTeam() {
        try {
            // If we don't have selected drivers yet, initialize them
            if (!this.selectedDrivers) {
                this.selectedDrivers = [];
                await this.loadSelectedDrivers();
            }

            // Render delivery team on alerts page
            this.renderDeliveryTeamForAlerts();
        } catch (error) {
            console.error('Error loading delivery team:', error);
        }
    }

    // Add changePassword functionality
    showPasswordModal() {
        console.log('Opening password change modal');

        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'modal password-modal active';

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-key"></i> Change Password</h3>
                    <button class="close-btn" onclick="shopApp.closePasswordModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="password-form">
                        <div class="form-group">
                            <label for="new-password">New Password</label>
                            <input type="password" id="new-password" class="form-control"
                                   placeholder="Enter new password" required minlength="6">
                            <small>Password must be at least 6 characters long</small>
                        </div>
                        <div class="form-group">
                            <label for="confirm-password">Confirm Password</label>
                            <input type="password" id="confirm-password" class="form-control"
                                   placeholder="Confirm new password" required>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="shopApp.closePasswordModal()">
                                Cancel
                            </button>
                            <button type="submit" id="update-password-btn" class="btn btn-primary">
                                Update Password
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Set up form submission
        const form = document.getElementById('password-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Show loading state on button
            const button = document.getElementById('update-password-btn');
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            button.disabled = true;

            try {
                await this.updatePassword();
            } catch (error) {
                console.error('Error in password update:', error);
                // Reset button state
                button.innerHTML = originalText;
                button.disabled = false;
            }
        });
    }

    async updatePassword() {
        try {
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            // Validate passwords
            if (!newPassword || !confirmPassword) {
                this.showToast('Please fill all password fields', 'error');
                return;
            }

            if (newPassword.length < 6) {
                this.showToast('Password must be at least 6 characters long', 'error');
                return;
            }

            if (newPassword !== confirmPassword) {
                this.showToast('Passwords do not match', 'error');
                return;
            }

            console.log('Attempting to update password for shop...');
            console.log('Shop ID from currentShop:', this.currentShop.id);

            // Make sure we have a shop ID
            if (!this.currentShop || !this.currentShop.id) {
                this.showToast('Unable to update password: Shop ID not found', 'error');
                console.error('Shop ID not found in currentShop:', this.currentShop);
                return;
            }

            // Convert the shop ID to a string to ensure proper format
            const shopId = String(this.currentShop.id);
            console.log('Using shop ID for API call:', shopId);

            const response = await fetch(`/api/admin/shop-accounts/${shopId}/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    password: newPassword
                })
            });

            // Log the response status for debugging
            console.log('Password update API response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server error response:', errorText);
                throw new Error(`Server error (${response.status}): ${errorText}`);
            }

            const data = await response.json();

            if (data.success) {
                this.showToast('Password updated successfully', 'success');
                this.closePasswordModal();
                console.log('Password updated successfully for shop ID:', shopId);
            } else {
                throw new Error(data.message || 'Failed to update password');
            }
        } catch (error) {
            console.error('Error updating password:', error);
            this.showToast(`Failed to update password: ${error.message}`, 'error');
        }
    }

    loadProfileData() {
        console.log('Loading profile data...');

        if (!this.currentShop) {
            console.error('Shop data not available');
            this.showToast('Unable to load shop profile', 'error');
            return;
        }

        console.log('Current shop data:', this.currentShop);

        // Load notifications data for the widget first
        this.loadNotificationsForProfile().then(() => {
        // Create enhanced profile layout
        this.createEnhancedProfile();
        });

        // Log the shop ID for debugging
        console.log('Shop ID in profile:', this.currentShop.id);
    }

    // Add method to load notifications specifically for profile widget
    async loadNotificationsForProfile() {
        try {
            if (!this.currentShop || !this.currentShop.id) {
                console.warn('No shop ID available for loading notifications');
                return;
            }

            // Only load if we don't have recent data (cache for 30 seconds on profile)
            const now = Date.now();
            const lastLoadTime = this.notificationsLastLoadTime || 0;

            if (this.allNotifications && (now - lastLoadTime) < 30000) {
                console.log('Using cached notifications for profile widget');
                return;
            }

            console.log('Loading notifications for profile widget...');

            const response = await fetch(`/api/shop/${this.currentShop.id}/all-notifications`);
            const result = await response.json();

            if (result.success) {
                this.allNotifications = result.notifications || [];
                this.notificationsLastLoadTime = now;
                console.log(`Loaded ${this.allNotifications.length} notifications for profile widget`);
            } else {
                console.warn('Failed to load notifications for profile:', result.message);
                this.allNotifications = this.allNotifications || [];
            }
        } catch (error) {
            console.warn('Error loading notifications for profile widget:', error);
            this.allNotifications = this.allNotifications || [];
        }
    }

    createEnhancedProfile() {
        const profileContainer = document.querySelector('#profile-page .profile-container');
        if (!profileContainer) return;

        // Calculate statistics
        const totalNotifications = this.allNotifications ? this.allNotifications.length : 0;
        const totalDrivers = this.selectedDrivers ? this.selectedDrivers.length : 0;
        const pendingNotifications = this.allNotifications ?
                                  this.allNotifications.filter(n => n.status === 'pending').length : 0;

        // Get join date (use created_at if available, otherwise estimate)
        const joinDate = this.currentShop.created_at ?
                        new Date(this.currentShop.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }) : 'Recently';

        // Get recent notifications for the widget (max 3)
        const recentNotifications = this.allNotifications ?
                                   this.allNotifications
                                       .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                       .slice(0, 3) : [];

        // Create exact copy of driver profile UI
        const displayName = this.currentShop.shop_name || this.currentShop.name || 'Shop Name';
        const userEmail = this.currentShop.email || 'Not available';
        const shopId = this.currentShop.id || 'N/A';

        const enhancedProfile = `
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
                        <i class="fas fa-store" style="font-size: 36px; color: white;"></i>
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
                        ">Restaurant Partner</p>
                        <div style="
                            font-size: 13px;
                            color: #9ca3af;
                            background: #f3f4f6;
                            padding: 4px 8px;
                            border-radius: 6px;
                            display: inline-block;
                            font-weight: 500;
                        ">ID: ${shopId}</div>
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
                        ">${totalNotifications}</div>
                        <div style="
                            font-size: 13px;
                            color: #6b7280;
                            font-weight: 500;
                        ">Notifications</div>
                    </div>

                    <div style="text-align: center;">
                        <div style="
                            font-size: 20px;
                            font-weight: 700;
                            color: #111827;
                            margin-bottom: 2px;
                        ">${totalDrivers}</div>
                        <div style="
                            font-size: 13px;
                            color: #6b7280;
                            font-weight: 500;
                        ">Team Drivers</div>
                    </div>

                    <div style="text-align: center;">
                        <div style="
                            font-size: 20px;
                            font-weight: 700;
                            color: #111827;
                            margin-bottom: 2px;
                        ">${pendingNotifications}</div>
                        <div style="
                            font-size: 13px;
                            color: #6b7280;
                            font-weight: 500;
                        ">Pending</div>
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
                    ">Account</div>

                    <!-- Announcements -->
                    <div onclick="shopApp.navigateToPage('announcements')" style="
                        display: flex;
                        align-items: center;
                        padding: 16px 20px;
                        cursor: pointer;
                        transition: background-color 0.2s;
                    " onmouseover="this.style.backgroundColor='#f9fafb'" onmouseout="this.style.backgroundColor='transparent'">
                        <div style="
                            width: 40px;
                            height: 40px;
                            background: #fef3c7;
                            border-radius: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-right: 16px;
                        ">
                            <i class="fas fa-bullhorn" style="color: #f59e0b; font-size: 18px;"></i>
                        </div>
                        <div style="flex: 1;">
                            <div style="
                                font-size: 16px;
                                font-weight: 500;
                                color: #111827;
                                margin-bottom: 2px;" data-translate="announcementsTitle">Announcements</div>
                            <div style="
                                font-size: 13px;
                                color: #6b7280;" data-translate="announcementsDesc">Important updates from admins</div>
                        </div>
                        <i class="fas fa-chevron-right" style="color: #d1d5db; font-size: 14px;"></i>
                    </div>

                        <!-- Analytics (placeholder) -->
                        <div onclick="shopApp.navigateToPage('analytics')" style="
                            display: flex;
                            align-items: center;
                            padding: 16px 20px;
                            cursor: pointer;
                            transition: background-color 0.2s;
                        " onmouseover="this.style.backgroundColor='#f9fafb'" onmouseout="this.style.backgroundColor='transparent'">
                            <div style="
                                width: 40px;
                                height: 40px;
                                background: #e0f2fe;
                                border-radius: 10px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                margin-right: 16px;
                            ">
                                <i class="fas fa-chart-line" style="color: #0ea5e9; font-size: 18px;"></i>
                            </div>
                            <div style="flex: 1;">
                                <div style="
                                    font-size: 16px;
                                    font-weight: 500;
                                    color: #111827;
                                    margin-bottom: 2px;" data-translate="analytics">Analytics</div>
                                <div style="
                                    font-size: 13px;
                                    color: #6b7280;" data-translate="analyticsDesc">Insights and metrics (coming soon)</div>
                            </div>
                            <i class="fas fa-chevron-right" style="color: #d1d5db; font-size: 14px;"></i>
                        </div>

                        <!-- Language (under Analytics) -->
                        <div onclick="shopApp.openLanguageModal()" style="
                            display: flex;
                            align-items: center;
                            padding: 16px 20px;
                            cursor: pointer;
                            transition: background-color 0.2s;
                        " onmouseover="this.style.backgroundColor='#f9fafb'" onmouseout="this.style.backgroundColor='transparent'">
                            <div style="
                                width: 40px;
                                height: 40px;
                                background: #eef2ff;
                                border-radius: 10px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                margin-right: 16px;
                            ">
                                <i class="fas fa-language" style="color: #6366f1; font-size: 18px;"></i>
                            </div>
                            <div style="flex: 1;">
                                <div style="
                                    font-size: 16px;
                                    font-weight: 500;
                                    color: #111827;
                                    margin-bottom: 2px;" data-translate="languageSettings">Language</div>
                                <div style="font-size: 13px; color: #6b7280;" data-translate="languageSettingsDesc">Choose your preferred language</div>
                            </div>
                            <i class="fas fa-chevron-right" style="color: #d1d5db; font-size: 14px;"></i>
                        </div>

                        <!-- Fixing Tools -->
                        <div onclick="shopApp.openFixingModal()" style="
                            display: flex;
                            align-items: center;
                            padding: 16px 20px;
                            cursor: pointer;
                            transition: background-color 0.2s; border-top: 1px solid #f3f4f6;"
                            onmouseover="this.style.backgroundColor='#f9fafb'" onmouseout="this.style.backgroundColor='transparent'">
                            <div style="width: 40px; height: 40px; background: #ecfeff; border-radius: 10px; display:flex; align-items:center; justify-content:center; margin-right:16px;">
                                <i class="fas fa-tools" style="color:#06b6d4; font-size:18px;"></i>
                            </div>
                            <div style="flex:1;">
                                <div style="font-size:16px; font-weight:500; color:#111827; margin-bottom:2px;" data-translate="fixing">Fixing</div>
                                <div style="font-size:13px; color:#6b7280;" data-translate="fixingDesc">Find and fix pending orders not shown to drivers</div>
                            </div>
                            <i class="fas fa-chevron-right" style="color:#d1d5db; font-size:14px;"></i>
                        </div>

                    <!-- Settings -->
                    <div onclick="shopApp.showPasswordModal()" style="
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
                                margin-bottom: 2px;" data-translate="settings">Settings</div>
                            <div style="
                                font-size: 13px;
                                color: #6b7280;" data-translate="accountAndPreferences">Account and preferences</div>
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
                                margin-bottom: 2px;" data-translate="accountInfo">Account Information</div>
                            <div style="
                                font-size: 13px;
                                color: #6b7280;
                            ">${userEmail}</div>
                        </div>
                    </div>
                </div>

                <!-- Actions Section -->
                <div style="padding: 8px 0;">
                    <div style="
                        padding: 0 20px 8px;
                        font-size: 13px;
                        font-weight: 600;
                        color: #9ca3af;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    ">Actions</div>

                    <!-- Logout -->
                    <div onclick="shopApp.logout()" style="
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
                            <i class="fas fa-sign-out-alt" style="color: #dc2626; font-size: 18px;"></i>
                        </div>
                        <div style="flex: 1;">
                            <div style="
                                font-size: 16px;
                                font-weight: 500;
                                color: #dc2626;
                                margin-bottom: 2px;
                            ">Logout</div>
                            <div style="
                                font-size: 13px;
                                color: #6b7280;
                            ">Sign out of your account</div>
                        </div>
                        <i class="fas fa-chevron-right" style="color: #d1d5db; font-size: 14px;"></i>
                    </div>
                </div>
            </div>
        `;

        profileContainer.innerHTML = enhancedProfile;


        // Apply translations to newly injected profile markup
        if (window.i18n) {
            try {
                window.i18n.applyTranslations && window.i18n.applyTranslations();
                if (typeof window.i18n.translatePlaceholders === 'function') {
                    window.i18n.translatePlaceholders();
                }
            } catch (e) { console.warn('i18n apply on profile error', e); }
        }

        console.log('Enhanced profile created with notifications widget:', {
            totalNotifications,
            totalDrivers,
            pendingNotifications,
            recentNotifications: recentNotifications.length
        });
    }

    // Add method to render recent notifications widget
    renderRecentNotificationsWidget(notifications) {
        if (!notifications || notifications.length === 0) {
            return `
                <div class="widget-empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-bell-slash"></i>
                    </div>
                    <p>No recent notifications</p>
                    <button class="quick-action-btn" onclick="shopApp.navigateToPage('alerts')">
                        <i class="fas fa-paper-plane"></i>
                        Send Message to Team
                    </button>
                </div>
            `;
        }

        return `
            <div class="widget-notifications-list">
                ${notifications.map(notification => `
                    <div class="widget-notification-item ${notification.status}"
                         onclick="shopApp.openNotificationDetails('${notification.id}')">
                        <div class="notification-indicator">
                            <i class="fas ${notification.status === 'pending' ? 'fa-clock' : 'fa-check-circle'}"></i>
                        </div>
                        <div class="notification-details">
                            <div class="notification-driver">
                                <i class="fas fa-user"></i>
                                ${this.escapeHTML(notification.driver_email || 'Unknown Driver')}
                            </div>
                            <div class="notification-preview">
                                ${this.truncateText(notification.message || 'No message', 50)}
                            </div>



                            <div class="notification-time-widget">
                                <i class="fas fa-clock"></i>
                                ${this.timeAgo(new Date(notification.created_at))}
                            </div>
                        </div>
                        <div class="notification-status-indicator ${notification.status}">
                            ${notification.status === 'pending' ? 'Waiting' : 'Confirmed'}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Add utility method to truncate text
    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // Placeholder: open Analytics option from Profile
    openAnalytics() {
        try {
            this.showToast('Analytics coming soon. I will wire this up once you confirm details.', 'info');
        } catch (_) {
            alert('Analytics coming soon');
        }
    }


    // Add method to open notification details
    openNotificationDetails(notificationId) {
        // Navigate to notifications page and highlight the specific notification
        this.navigateToPage('notifications');

        // After a short delay, scroll to and highlight the notification
        setTimeout(() => {
            const notificationElement = document.querySelector(`[data-id="${notificationId}"]`);
            if (notificationElement) {
                notificationElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                notificationElement.classList.add('highlighted');

                // Remove highlight after 3 seconds
                setTimeout(() => {
                    notificationElement.classList.remove('highlighted');
                }, 3000);
            }
        }, 300);
    }

    closePasswordModal() {
        console.log('Closing password modal');
        // First try to find and close a modal with ID
        const modal = document.querySelector('.password-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        } else {
            // Fall back to the generic closeModal method
            this.closeModal();
        }
    }

    bindNotificationEvents() {
        // Broadcast notification button
        const broadcastBtn = document.getElementById('broadcast-notification-btn');
        if (broadcastBtn) {
            broadcastBtn.addEventListener('click', () => {
                this.sendBroadcastNotification();
            });
        }
    }

    // Updated method for loading orders page (formerly notifications)
    loadNotificationsPage() {
        console.log('Loading orders page...');

        const notificationsContainer = document.getElementById('notifications-page');
        if (!notificationsContainer) return;

        notificationsContainer.innerHTML = `
            <div class="orders-container" style="padding: 20px; max-width: 100%; margin: 0 auto;">
                <!-- Clean Content Area -->

                    <!-- Stats Under Header -->
                    <div style="
                        background: #ffffff;
                        border: 1px solid #e5e7eb;
                        border-radius: 12px;
                        padding: 16px 20px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                    ">
                        <div style="text-align: center; flex: 1;">
                            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 4px;">
                                <div style="
                                    width: 8px;
                                    height: 8px;
                                    background: #f59e0b;
                                    border-radius: 50%;
                                "></div>
                                <span style="font-size: 20px; font-weight: 700; color: #f59e0b;">0</span>
                            </div>
                            <div style="font-size: 12px; color: #6b7280; font-weight: 500;">Pending</div>
                        </div>

                        <div style="width: 1px; height: 32px; background: #e5e7eb;"></div>

                        <div style="text-align: center; flex: 1;">
                            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 4px;">
                                <div style="
                                    width: 8px;
                                    height: 8px;
                                    background: #3b82f6;
                                    border-radius: 50%;
                                "></div>
                                <span style="font-size: 20px; font-weight: 700; color: #3b82f6;">0</span>
                            </div>
                            <div style="font-size: 12px; color: #6b7280; font-weight: 500;">Active</div>
                        </div>

                        <div style="width: 1px; height: 32px; background: #e5e7eb;"></div>

                        <div style="text-align: center; flex: 1;">
                            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 4px;">
                                <div style="
                                    width: 8px;
                                    height: 8px;
                                    background: #10b981;
                                    border-radius: 50%;
                                "></div>
                                <span style="font-size: 20px; font-weight: 700; color: #10b981;">0</span>
                            </div>
                            <div style="font-size: 12px; color: #6b7280; font-weight: 500;">Done</div>
                        </div>
                    </div>
                </div>

                <!-- Create Order Section -->
                <div style="margin-bottom: 32px;">
                    <h2 style="
                        margin: 0 0 16px 0;
                        font-size: 20px;
                        font-weight: 600;
                        color: #111827;
                    "><span data-translate="addOrder">Create Order</span></h2>

                    <!-- Dashed Border Create Order Area -->
                    <div class="create-order-btn" id="create-order-btn" style="
                    border: 2px dashed #d1d5db;
                    border-radius: 16px;
                    padding: 32px 24px;
                    margin-bottom: 32px;
                    background: transparent;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                " onmouseover="
                    this.style.borderColor='#ff6b35';
                    this.style.background='#fff7ed';
                    this.querySelector('.fas').style.color='#ff6b35';

                    this.querySelector('p').style.color='#6b7280';
                    this.querySelector('div div').style.borderColor='#ff6b35';
                " onmouseout="
                    this.style.borderColor='#d1d5db';
                    this.style.background='transparent';
                    this.querySelector('.fas').style.color='#9ca3af';

                    this.querySelector('p').style.color='#9ca3af';
                    this.querySelector('div div').style.borderColor='#d1d5db';
                "
>
                    <div style="
                        width: 56px;
                        height: 56px;
                        background: transparent;
                        border: 2px dashed #d1d5db;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 16px;
                        transition: all 0.3s ease;
                    ">
                        <i class="fas fa-plus" style="color: #9ca3af; font-size: 20px; transition: color 0.3s ease;"></i>
                    </div>
                        <p style="
                            margin: 0;
                            color: #9ca3af;
                            font-size: 16px;
                            line-height: 1.4;
                            transition: color 0.3s ease;
                        "><span data-translate="clickToCreateOrder">Click to create order</span></p>
                    </div>
                </div>



                <!-- Enhanced Recent Orders Section -->
                <div>
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        margin-bottom: 20px;
                    ">
                        <div style="
                            width: 40px;
                            height: 40px;
                            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                            border-radius: 12px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">
                            <i class="fas fa-history" style="color: white; font-size: 16px;"></i>
                        </div>
                        <div>
                            <h3 style="margin: 0; font-size: 20px; font-weight: 600; color: #111827;"><span data-translate="recentOrders">Recent Orders</span></h3>
                            <p style="margin: 0; color: #6b7280; font-size: 14px;"><span data-translate="yourLatestOrders">Your latest delivery orders</span></p>
                        </div>
                    </div>

                    <div style="
                        background: #ffffff;
                        border: 2px dashed #d1d5db;
                        border-radius: 16px;
                        padding: 40px 20px;
                        text-align: center;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.borderColor='#9ca3af'; this.style.background='#fafafa'" onmouseout="this.style.borderColor='#d1d5db'; this.style.background='#ffffff'">
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
                        <h4 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #374151;">No orders yet</h4>
                        <p style="margin: 0; color: #6b7280; font-size: 15px; line-height: 1.4;">Your delivery orders will appear here once you create them</p>
                    </div>
                </div>
            </div>
        `;

        // Bind create order button event
        this.bindCreateOrderEvents();
    }

    bindCreateOrderEvents() {
        const createOrderBtn = document.getElementById('create-order-btn');
        if (createOrderBtn) {
            createOrderBtn.addEventListener('click', () => {
                this.openCreateOrderModal();
            });
        }
    }

    openCreateOrderModal() {
        console.log('Opening create order modal...');

        // Remove existing modal if any
        const existingModal = document.getElementById('create-order-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'create-order-modal';
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: flex-end;
            justify-content: center;
            z-index: 10000;
            padding: 0;
            overflow: hidden;
        `;

        // Add slide-up animation CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideUp {
                from {
                    transform: translateY(100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            @keyframes slideDown {
                from {
                    transform: translateY(0);
                    opacity: 1;
                }
                to {
                    transform: translateY(100%);
                    opacity: 0;
                }
            }

            .modal-slide-down {
                animation: slideDown 0.3s ease-in forwards;
            }

            /* Desktop overrides: center modal, constrain size */
            @media (min-width: 768px) {
                #create-order-modal {
                    align-items: center !important;
                    padding: 24px !important;
                }
                #create-order-modal .modal-content {
                    position: relative !important;
                    max-width: 520px !important;
                    width: 100% !important;
                    height: auto !important;
                    max-height: 90vh !important;
                    border-radius: 16px !important;
                    left: auto !important;
                    right: auto !important;
                    top: auto !important;
                    bottom: auto !important;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15) !important;
                }
                #create-order-modal .modal-header {
                    padding: 20px 24px !important;
                }
                /* Hide mobile handle on desktop */
                #create-order-modal .modal-content > div[style*="width: 40px"][style*="height: 4px"] {
                    display: none !important;
                }
            }
        `;
        document.head.appendChild(style);

        modal.innerHTML = `
            <div class="modal-content" style="
                background: #ffffff;
                border-radius: 24px 24px 0 0;
                width: 100%;
                max-width: 100%;
                height: auto;
                max-height: 90vh;
                overflow: hidden;
                box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.12);
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                animation: slideUp 0.3s ease-out;
                display: flex;
                flex-direction: column;
            ">
                <!-- Modal Handle -->
                <div style="
                    width: 40px;
                    height: 4px;
                    background: #d1d5db;
                    border-radius: 2px;
                    margin: 12px auto 0;
                "></div>

                <!-- Simple Header -->
                <div class="modal-header" style="
                    padding: 16px 20px;
                    border-bottom: 1px solid #f3f4f6;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                ">
                    <h2 style="
                        margin: 0;
                        font-size: 20px;
                        font-weight: 600;
                        color: #111827;
                    "><span data-translate="addOrder">Create Order</span></h2>
                    <button class="close-modal" style="
                        background: none;
                        border: none;
                        color: #9ca3af;
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        cursor: pointer;
                        font-size: 18px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.color='#6b7280'" onmouseout="this.style.color='#9ca3af'">&times;</button>
                </div>

                <!-- Form Content -->
                <div style="
                    padding: 20px;
                    flex: 1;
                    overflow-y: auto;
                    -webkit-overflow-scrolling: touch;
                    min-height: 0;
                ">
                    <form id="create-order-form">
                        <!-- Payment Method -->
                        <div style="margin-bottom: 20px;">
                            <label style="
                                display: block;
                                font-weight: 600;
                                color: #374151;
                                margin-bottom: 8px;
                                font-size: 14px;
                            "><span data-translate="paymentMethod">Payment Method</span> *</label>
                            <div class="payment-methods" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                <label class="payment-option" style="
                                    padding: 12px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 8px;
                                    cursor: pointer;
                                    text-align: center;
                                    transition: all 0.2s ease;
                                    background: #ffffff;
                                ">
                                    <input type="radio" name="payment-method" value="cash" style="display: none;" checked>
                                    <i class="fas fa-money-bill-wave" style="color: #10b981; font-size: 18px; margin-bottom: 4px;"></i>
                                    <div style="font-weight: 600; font-size: 14px; color: #111827;"><span data-translate="cash">Cash</span></div>
                                </label>
                                <label class="payment-option" style="
                                    padding: 12px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 8px;
                                    cursor: pointer;
                                    text-align: center;
                                    transition: all 0.2s ease;
                                    background: #ffffff;
                                ">
                                    <input type="radio" name="payment-method" value="paid" style="display: none;">
                                    <i class="fas fa-credit-card" style="color: #3b82f6; font-size: 18px; margin-bottom: 4px;"></i>
                                    <div style="font-weight: 600; font-size: 14px; color: #111827;"><span data-translate="paid">Paid</span></div>
                                </label>
                            </div>
                        </div>

                        <!-- Order Price -->
                        <div id="order-price-group" style="margin-bottom: 20px;">
                            <label for="order-amount" style="
                                display: block;
                                font-weight: 600;
                                color: #374151;
                                margin-bottom: 8px;
                                font-size: 14px;
                            "><span data-translate="orderAmount">Order Amount</span></label>
                            <input type="number" id="order-amount" name="price" step="0.01" min="0" placeholder="Enter price" style="
                                width: 100%;
                                padding: 12px;
                                border: 2px solid #e5e7eb;
                                border-radius: 8px;
                                font-size: 16px;
                                background: #ffffff;
                                transition: all 0.2s ease;
                                -webkit-appearance: none;
                                -moz-appearance: textfield;
                            ">
                        </div>

                        <!-- Delivery Address -->
                        <div style="margin-bottom: 20px;">
                            <label for="delivery-address" style="
                                display: block;
                                font-weight: 600;
                                color: #374151;
                                margin-bottom: 8px;
                                font-size: 14px;
                            "><span data-translate="deliveryAddress">Delivery Address</span> *</label>
                            <textarea id="delivery-address" name="address" rows="3" placeholder="Enter delivery address" required style="
                                width: 100%;
                                padding: 12px;
                                border: 2px solid #e5e7eb;
                                border-radius: 8px;
                                font-size: 16px;
                                background: #ffffff;
                                resize: none;
                                transition: all 0.2s ease;
                                font-family: inherit;
                            "></textarea>
                        </div>

                        <!-- Phone Number -->
                        <div style="margin-bottom: 20px;">
                            <label for="customer-phone" style="
                                display: block;
                                font-weight: 600;
                                color: #374151;
                                margin-bottom: 8px;
                                font-size: 14px;
                            "><span data-translate="phone">Phone</span> *</label>
                            <input type="tel" id="customer-phone" name="phone" placeholder="Enter phone number" required style="
                                width: 100%;
                                padding: 12px;
                                border: 2px solid #e5e7eb;
                                border-radius: 8px;
                                font-size: 16px;
                                background: #ffffff;
                                transition: all 0.2s ease;
                            ">
                        </div>

                        <!-- Preparation Time -->
                        <div style="margin-bottom: 20px;">
                            <label style="
                                display: block;
                                font-weight: 600;
                                color: #374151;
                                margin-bottom: 8px;
                                font-size: 14px;
                            ">Preparation Time *</label>
                            <div class="preparation-time-options" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                                <label class="prep-time-option" style="
                                    padding: 12px 8px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 8px;
                                    cursor: pointer;
                                    text-align: center;
                                    transition: all 0.2s ease;
                                    background: #ffffff;
                                ">
                                    <input type="radio" name="preparation-time" value="0" style="display: none;" checked>
                                    <i class="fas fa-bolt" style="color: #10b981; font-size: 16px; margin-bottom: 4px;"></i>
                                    <div style="font-weight: 600; font-size: 12px; color: #111827;">Now</div>
                                    <div style="font-size: 10px; color: #6b7280;">0 min</div>
                                </label>
                                <label class="prep-time-option" style="
                                    padding: 12px 8px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 8px;
                                    cursor: pointer;
                                    text-align: center;
                                    transition: all 0.2s ease;
                                    background: #ffffff;
                                ">
                                    <input type="radio" name="preparation-time" value="5" style="display: none;">
                                    <i class="fas fa-clock" style="color: #f59e0b; font-size: 16px; margin-bottom: 4px;"></i>
                                    <div style="font-weight: 600; font-size: 12px; color: #111827;">Soon</div>
                                    <div style="font-size: 10px; color: #6b7280;">5 min</div>
                                </label>
                                <label class="prep-time-option" style="
                                    padding: 12px 8px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 8px;
                                    cursor: pointer;
                                    text-align: center;
                                    transition: all 0.2s ease;
                                    background: #ffffff;
                                ">
                                    <input type="radio" name="preparation-time" value="10" style="display: none;">
                                    <i class="fas fa-hourglass-half" style="color: #3b82f6; font-size: 16px; margin-bottom: 4px;"></i>
                                    <div style="font-weight: 600; font-size: 12px; color: #111827;">Wait</div>
                                    <div style="font-size: 10px; color: #6b7280;">10 min</div>
                                </label>
                                <label class="prep-time-option" style="
                                    padding: 12px 8px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 8px;
                                    cursor: pointer;
                                    text-align: center;
                                    transition: all 0.2s ease;
                                    background: #ffffff;
                                ">
                                    <input type="radio" name="preparation-time" value="15" style="display: none;">
                                    <i class="fas fa-pause-circle" style="color: #ef4444; font-size: 16px; margin-bottom: 4px;"></i>
                                    <div style="font-weight: 600; font-size: 12px; color: #111827;">Later</div>
                                    <div style="font-size: 10px; color: #6b7280;">15 min</div>
                                </label>
                            </div>
                        </div>

                        <!-- Notes -->
                        <div style="margin-bottom: 24px;">
                            <label for="order-notes" style="
                                display: block;
                                font-weight: 600;
                                color: #374151;
                                margin-bottom: 8px;
                                font-size: 14px;
                            "><span data-translate="notes">Notes</span> (optional)</label>
                            <textarea id="order-notes" name="notes" rows="2" placeholder="Add notes..." style="
                                width: 100%;
                                padding: 12px;
                                border: 2px solid #e5e7eb;
                                border-radius: 8px;
                                font-size: 16px;
                                background: #ffffff;
                                resize: none;
                                transition: all 0.2s ease;
                                font-family: inherit;
                            "></textarea>
                        </div>
                    </form>
                </div>

                <!-- Simple Bottom Actions -->
                <div style="
                    padding: 16px 20px 20px 20px;
                    background: #ffffff;
                    border-top: 1px solid #f3f4f6;
                    flex-shrink: 0;
                    margin-top: auto;
                ">
                    <div style="display: flex; gap: 12px;">
                        <button type="button" class="cancel-btn" style="
                            flex: 1;
                            padding: 12px;
                            background: #f9fafb;
                            color: #6b7280;
                            border: 1px solid #e5e7eb;
                            border-radius: 8px;
                            font-weight: 500;
                            font-size: 16px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        "><span data-translate="cancel">Cancel</span></button>
                        <button type="submit" class="submit-btn" form="create-order-form" style="
                            flex: 2;
                            padding: 12px;
                            background: #ff6b35;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            font-weight: 600;
                            font-size: 16px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        "><span data-translate="addOrder">Create Order</span></button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (window.i18n) { try { window.i18n.applyTranslations(); window.i18n.translatePlaceholders && window.i18n.translatePlaceholders(); } catch (e) { console.warn('i18n modal apply error', e); } }

        document.body.style.overflow = 'hidden';

        // Bind modal events
        this.bindCreateOrderModalEvents(modal);

        // Focus first input
        setTimeout(() => {
            const firstInput = modal.querySelector('#delivery-address');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }

    bindCreateOrderModalEvents(modal) {
        // Close modal events
        const closeBtn = modal.querySelector('.close-modal');
        const cancelBtn = modal.querySelector('.cancel-btn');

        closeBtn.addEventListener('click', () => this.closeCreateOrderModal(modal));
        cancelBtn.addEventListener('click', () => this.closeCreateOrderModal(modal));

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeCreateOrderModal(modal);
            }
        });

        // Payment method selection with enhanced mobile UI
        const paymentOptions = modal.querySelectorAll('.payment-option');
        const orderPriceGroup = modal.querySelector('#order-price-group');
        const orderPriceInput = modal.querySelector('#order-price');

        paymentOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Simple visual selection
                paymentOptions.forEach(opt => {
                    opt.style.borderColor = '#e5e7eb';
                    opt.style.backgroundColor = '#ffffff';
                });

                option.style.borderColor = '#ff6b35';
                option.style.backgroundColor = '#fff7ed';

                // Check the radio button
                const radio = option.querySelector('input[type="radio"]');
                radio.checked = true;

                // Show/hide price field with smooth animation
                if (radio.value === 'cash') {
                    orderPriceGroup.style.display = 'block';
                    orderPriceGroup.style.opacity = '0';
                    orderPriceGroup.style.transform = 'translateY(-10px)';
                    setTimeout(() => {
                        orderPriceGroup.style.transition = 'all 0.3s ease';
                        orderPriceGroup.style.opacity = '1';
                        orderPriceGroup.style.transform = 'translateY(0)';
                    }, 10);
                    orderPriceInput.required = true;
                } else {
                    orderPriceGroup.style.transition = 'all 0.3s ease';
                    orderPriceGroup.style.opacity = '0';
                    orderPriceGroup.style.transform = 'translateY(-10px)';
                    setTimeout(() => {
                        orderPriceGroup.style.display = 'none';
                    }, 300);
                    orderPriceInput.required = false;
                    orderPriceInput.value = '';
                }
            });
        });

        // Initialize payment method selection
        const defaultOption = modal.querySelector('.payment-option');
        if (defaultOption) {
            defaultOption.click();
        }

        // Form submission
        const form = modal.querySelector('#create-order-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this._creatingOrder) return; // prevent double-submit
            this.handleCreateOrderSubmit(modal);
        });

        // Simple input focus effects
        const inputs = modal.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                input.style.borderColor = '#ff6b35';
            });

            input.addEventListener('blur', () => {
                input.style.borderColor = '#e5e7eb';
            });
        });

        // Preparation time selection
        const prepTimeOptions = modal.querySelectorAll('.prep-time-option');
        prepTimeOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Reset all options
                prepTimeOptions.forEach(opt => {
                    opt.style.borderColor = '#e5e7eb';
                    opt.style.backgroundColor = '#ffffff';
                });

                // Highlight selected option
                option.style.borderColor = '#ff6b35';
                option.style.backgroundColor = '#fff7ed';

                // Check the radio button
                const radio = option.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                }
            });
        });
    }

    async handleCreateOrderSubmit(modal) {
        const form = modal.querySelector('#create-order-form');

        // Get form data
        const formData = new FormData(form);
        const paymentMethod = formData.get('payment-method');
        const price = formData.get('price');
        const address = formData.get('address');
        const phone = formData.get('phone');
        // Prevent duplicate submissions and show loading state
        if (this._creatingOrder) return;
        this._creatingOrder = true;
        const submitBtn = modal.querySelector('.submit-btn');
        const originalBtnText = submitBtn ? submitBtn.innerHTML : null;
        if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = 'Creating...'; }

        const notes = formData.get('notes');
        const preparationTime = formData.get('preparation-time');

        // Validation
        if (!address.trim()) {
            this.showToast('Please enter a delivery address', 'error');
            return;
        }
        if (!phone.trim()) {
            this.showToast('Please enter a phone number', 'error');
            return;
        }
        if (paymentMethod === 'cash' && (!price || price <= 0)) {
            this.showToast('Please enter a valid order price for cash orders', 'error');
            return;
        }

        // Get current shop ID from session
        try {
            const shopId = this.currentShop?.id || this.shopId;
            if (!shopId) {
                console.error('Shop ID not found. Current shop:', this.currentShop);
                throw new Error('Shop ID not found');
            }

            // Prepare order data
            // Idempotency key (prevents duplicates if user taps multiple times)
            const idemKey = this._activeIdempotencyKey || `shop-${shopId}-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
            this._activeIdempotencyKey = idemKey;

            const orderData = {
                order_amount: paymentMethod === 'cash' ? parseFloat(price) : 0,
                customer_name: '',
                customer_phone: phone,
                delivery_address: address,
                notes: notes || '',
                payment_method: paymentMethod,
                preparation_time: parseInt(preparationTime) || 0
            };

            // Optimistic UX: close immediately and show feedback
            this.closeCreateOrderModal(modal);
            this.showToast('Creating order...', 'info');

            // Call the API with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);

            const response = await fetch(`/api/shop/${shopId}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`,
                    'Idempotency-Key': idemKey
                },
                body: JSON.stringify(orderData),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Failed to create order');
            }

            // Success feedback (handle queued fast-response)
            if (result.queued) {
                this.showToast('✅ Order created; notifying your team', 'success');
            } else if (typeof result.notifications_sent === 'number') {
                this.showToast(`✅ Order created and sent to ${result.notifications_sent} drivers!`, 'success');
            } else {
                this.showToast('✅ Order created!', 'success');
            }

            // Clear idempotency/lock flags and restore button
            this._creatingOrder = false;
            this._activeIdempotencyKey = null;
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalBtnText || 'Create Order'; }

            // Optimistically update local cache so Pending shows instantly
            if (result.order) {
                this._ordersCache = this._ordersCache || { time: Date.now(), data: [] };
                this._ordersCache.data = [result.order, ...((this._ordersCache.data) || [])];
                this._ordersCache.time = Date.now();
            }

            // Fast UI update without waiting for network
            if (this.currentPage === 'dashboard') {
                const orders = (this._ordersCache && this._ordersCache.data) ? this._ordersCache.data : [];
                this.renderDashboardOrders(orders, true);
                // Refresh in background to reconcile with server
                this.refreshDashboardOrdersBackground();
            }
            if (this.currentPage === 'orders') {
                // Orders page shows completed history; nothing to update here
            }
        } catch (error) {
            console.error('Error creating order:', error);
            if (error.name === 'AbortError') {
                this.showToast('Order creation timed out. Please try again.', 'error');
            } else {
                this.showToast(`Failed to create order: ${error.message}`, 'error');
            }
        }
    }

    // Helper method to optimistically add order to cache
    addOrderToCache(newOrder) {
        if (this._ordersCache && this._ordersCache.data) {
            // Add to beginning of cached orders
            this._ordersCache.data.unshift(newOrder);
            console.log('Added new order to cache for instant UI update');
        }
    }


    closeCreateOrderModal(modal) {
        const modalContent = modal.querySelector('.modal-content');
        modalContent.classList.add('modal-slide-down');

        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = 'auto';
        }, 300);
    }

    bindNotificationsPageEvents() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update active filter
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.closest('.filter-btn').classList.add('active');

                // Filter notifications
                const filter = e.target.closest('.filter-btn').dataset.filter;
                this.filterNotifications(filter);
            });
        });

        // Refresh button
        const refreshBtn = document.getElementById('refresh-all-notifications-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadAllNotifications();
            });
        }
    }

    async loadAllNotifications() {
        try {
            if (!this.currentShop || !this.currentShop.id) {
                console.error('No shop ID available to load notifications');
                return;
            }

            console.log('Loading all shop notifications...');

            const response = await fetch(`/api/shop/${this.currentShop.id}/all-notifications`);
            const result = await response.json();

            console.log('Raw API response:', result);

            if (result.success) {
                this.allNotifications = result.notifications || [];
                // Keep main notifications array in sync for live updates
                this.notifications = [...this.allNotifications];
                console.log('Loaded notifications:', this.allNotifications);
                console.log('First notification structure:', this.allNotifications[0]);

                // Log all notification properties for debugging
                if (this.allNotifications.length > 0) {
                    const firstNotification = this.allNotifications[0];
                    console.log('Notification properties:', Object.keys(firstNotification));
                    console.log('Message content type:', typeof firstNotification.message);
                    console.log('Message content value:', firstNotification.message);
                    console.log('Message length:', firstNotification.message ? firstNotification.message.length : 'undefined');
                }

                this.updateNotificationsStats();
                this.renderAllNotifications(this.allNotifications);
            } else {
                throw new Error(result.message || 'Failed to load notifications');
            }
        } catch (error) {
            console.error('Error loading all notifications:', error);
            this.showAllNotificationsError('Failed to load notifications');
        }
    }

    updateNotificationsStats() {
        if (!this.allNotifications) return;

        const pendingCount = this.allNotifications.filter(n => n.status === 'pending').length;
        const confirmedCount = this.allNotifications.filter(n => n.status === 'confirmed').length;
        const totalCount = this.allNotifications.length;

        const pendingEl = document.getElementById('pending-count');
        const confirmedEl = document.getElementById('confirmed-count');
        const totalEl = document.getElementById('total-notifications-count');

        if (pendingEl) pendingEl.textContent = pendingCount;
        if (confirmedEl) confirmedEl.textContent = confirmedCount;
        if (totalEl) totalEl.textContent = totalCount;
    }

    renderAllNotifications(notifications) {
        const container = document.getElementById('all-notifications-container');
        if (!container) return;
        if (!notifications || notifications.length === 0) {
            container.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <h4>No notifications sent yet</h4>
                    <p>Notifications you send to drivers will appear here</p>
                </div>
            `;
            return;
        }
        // Sort by date (newest first)
        const sortedNotifications = [...notifications].sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        );
        const notificationsHtml = sortedNotifications.map((notification, index) => {
            try {
                const notificationId = notification.id || `temp-${index}`;
                const status = notification.status || 'pending';
                const driverEmail = notification.driver_email || notification.email || 'Unknown Driver';
                const message = notification.message || 'No message available';
                // Check if this is a very recent notification (less than 2 minutes old)
                const notificationTime = new Date(notification.created_at || new Date());
                const now = new Date();
                const diffInSeconds = Math.floor((now - notificationTime) / 1000);

                // If notification is very recent (likely just received), use current timestamp for display
                const createdAt = diffInSeconds < 120 ? new Date().toISOString() : (notification.created_at || new Date().toISOString());
                return `
                    <div class="notification-card simple" data-id="${notificationId}" data-created-at="${createdAt}">
                        <div class="notification-header-simple">
                            <div class="notification-status-badge ${status}">
                                <i class="fas ${status === 'pending' ? 'fa-clock' : 'fa-check'}"></i>
                                ${status.charAt(0).toUpperCase() + status.slice(1)}
                            </div>
                            <div class="notification-time-simple">
                                ${this.timeAgo(new Date(createdAt))}
                            </div>
                        </div>
                        <div class="notification-body-simple">
                            <div class="driver-info-simple">
                                <i class="fas fa-user"></i>
                                <strong>${this.escapeHTML(driverEmail)}</strong>
                            </div>
                            <div class="message-content-simple">
                                ${this.escapeHTML(message)}
                            </div>
                        </div>
                        ${status === 'pending' ? `
                            <div class="notification-actions-simple">
                                <button class="delete-btn-simple" onclick="shopApp.deleteNotification('${notificationId}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                                <button class="edit-btn-simple" onclick="shopApp.showEditNotificationModal('${notificationId}')">
                                    <i class='fas fa-edit'></i> Edit
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `;
            } catch (error) {
                console.error('Error rendering notification:', error, notification);
                return `
                    <div class="notification-card error">
                        <div class="notification-error">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>Error displaying notification</span>
                        </div>
                    </div>
                `;
            }
        }).join('');
        container.innerHTML = `
            <div class="notifications-list-simple">
                ${notificationsHtml}
            </div>
        `;
    }

    // Add HTML escaping method if it doesn't exist
    escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    filterNotifications(filter) {
        if (!this.allNotifications) return;

        let filteredNotifications = this.allNotifications;

        if (filter === 'pending') {
            filteredNotifications = this.allNotifications.filter(n => n.status === 'pending');
        } else if (filter === 'confirmed') {
            filteredNotifications = this.allNotifications.filter(n => n.status === 'confirmed');
        }

        this.renderAllNotifications(filteredNotifications);
    }

    async deleteNotification(notificationId) {
        // Show custom modal instead of confirm()
        const modalId = `delete-notification-modal-${notificationId}`;
        if (document.getElementById(modalId)) return; // Prevent duplicate modals
        const modalHTML = `
            <div id="${modalId}" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-trash"></i> Delete Notification</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Are you sure you want to delete this notification? This action cannot be undone.</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn secondary close-modal">Cancel</button>
                        <button class="btn danger" id="confirm-delete-notification-btn-${notificationId}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = document.getElementById(modalId);
        // Close modal on click
        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });
        // Confirm delete
        document.getElementById(`confirm-delete-notification-btn-${notificationId}`).addEventListener('click', async () => {
            modal.remove();
        try {
            if (!this.currentShop || !this.currentShop.id) {
                console.error('No shop ID available');
                return;
            }
            const response = await fetch(`/api/shop/${this.currentShop.id}/notifications/${notificationId}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (result.success) {
                if (this.allNotifications) {
                    this.allNotifications = this.allNotifications.filter(n => n.id !== notificationId);
                    this.updateNotificationsStats();
                    const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
                    this.filterNotifications(activeFilter);
                }

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

                this.showToast('Notification deleted successfully', 'success');
            } else {
                throw new Error(result.message || 'Failed to delete notification');
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            this.showToast('Failed to delete notification', 'error');
        }
        });
    }

    showAllNotificationsError(message) {
        const container = document.getElementById('all-notifications-container');
        if (container) {
            container.innerHTML = `
                <div class="notifications-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Error Loading Notifications</h4>
                    <p>${message}</p>
                    <button class="retry-btn" onclick="shopApp.loadAllNotifications()">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            `;
        }
    }

    async markNotificationAsRead(notificationId) {
        try {
            if (!this.currentShop || !this.currentShop.id) {
                console.error('No shop ID available');
                return;
            }

            console.log('Marking notification as read:', notificationId);

            const response = await fetch(`/api/shop/${this.currentShop.id}/notifications/${notificationId}/read`, {
                method: 'PUT'
            });

            const result = await response.json();

            if (result.success) {
                // Update local data
                if (this.allNotifications) {
                    const notification = this.allNotifications.find(n => n.id === notificationId);
                    if (notification) {
                        notification.is_read = true;
                    }
                }

                // Update UI
                const notificationElement = document.querySelector(`.notification-card[data-id="${notificationId}"]`);
                if (notificationElement) {
                    const button = notificationElement.querySelector('.action-btn.mark-read');
                    if (button) {
                        button.innerHTML = '<i class="fas fa-check"></i> Read';
                        button.classList.remove('unread');
                        button.classList.add('read');
                        button.disabled = true;
                    }
                }

                this.showToast('Notification marked as read', 'success');
            } else {
                throw new Error(result.message || 'Failed to mark notification as read');
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
            this.showToast('Failed to mark notification as read', 'error');
        }
    }

    // Initialize WebSocket and audio
    connectWebSocket() {
        // Use shopId or fallback to currentShop.id
        const shopId = this.shopId || this.currentShop?.id;

        if (!shopId) {
            console.warn('⚠️ No shop ID found, cannot connect to WebSocket');
            return;
        }

        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;

            console.log('🔌 Connecting to WebSocket:', wsUrl);
            console.log('🆔 Using Shop ID:', shopId);

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
                    userId: shopId,
                    userType: 'shop',
                    shopId: shopId,
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
                    const currentShopId = this.shopId || this.currentShop?.id;
                    if (currentShopId) {
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
                        userId: shopId
                    }));
                }
            }, 30000);

        } catch (error) {
            console.error('❌ Failed to connect to WebSocket:', error);
        }
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'authenticated':
                console.log('👤 WebSocket authentication successful');
                break;

            case 'notification':
                console.log('🔔 Real-time notification received:', data.data);
                this.handleRealtimeNotification(data.data);
                break;

            case 'notification_count':
                console.log('🔢 Notification count update:', data.count);
                this.updateNotificationBadge(data.count);
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
                break;

            case 'order_accepted':
                this.handleOrderAccepted(data);
                break;

            default:
                console.log('📨 Unknown WebSocket message type:', data.type);
        }
    }

    // Initialize audio
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

                // Different tone for shop notifications
                oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
                oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime + 0.1);

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

    // Handle real-time notification update
    handleNotificationUpdate(data) {
        console.log('🔄 Shop received notification update:', data);
        const { action, notificationId, data: updateData } = data;

        // Handle different notification arrays
        const updateNotificationInArray = (array) => {
            const idx = array.findIndex(n => n.id === notificationId);
            if (idx !== -1) {
                if (action === 'confirmed') {
                    // Update the array first
                    array[idx] = {
                        ...array[idx],
                        status: 'confirmed',
                        confirmed_at: updateData?.confirmed_at
                    };
                    // Play confirmation sound and show browser notification
                    this.playConfirmationSound();
                    this.showBrowserNotification({
                        ...array[idx],
                        message: array[idx].message || 'A delivery was confirmed',
                        confirmed_at: updateData?.confirmed_at,
                        action: 'confirmed'
                    });
                    // Log confirmation with shop info (robust)
                    const shopInfo = array[idx].shop_name || array[idx].shop || array[idx].shop_email || array[idx].shopId || array[idx].shop_id || 'Unknown Shop';
                    console.log(`✅ Order confirmed! Notification ID: ${notificationId}, Shop: ${shopInfo}`);
                } else if (action === 'deleted') {
                    // Play warning sound and show browser notification for delete
                    this.playWarningSound();
                    this.showBrowserNotification({
                        ...array[idx],
                        message: array[idx].message || 'A notification was deleted',
                        action: 'deleted'
                    });
                    array.splice(idx, 1);
                } else if (action === 'edited') {
                    // Play regular notification sound and show browser notification for edit
                    this.playNotificationSound(false);
                    this.showBrowserNotification({
                        ...array[idx],
                        ...updateData,
                        action: 'edited'
                    });
                    array[idx] = {
                        ...array[idx],
                        ...updateData
                    };
                }
                return true;
            }
            return false;
        };

        // Update in notifications array
        const notificationsUpdated = updateNotificationInArray(this.notifications);

        // Update in allNotifications array
        const allNotificationsUpdated = this.allNotifications ? updateNotificationInArray(this.allNotifications) : false;

        // Show appropriate toast only for non-confirmation actions
        if (action === 'deleted') {
            this.showToast('🗑️ Notification deleted', 'info');
        } else if (action === 'edited') {
            this.showToast('✏️ Notification updated', 'info');
        }

        // If neither array was updated, force reload from server and handle updates
        if (!notificationsUpdated && !allNotificationsUpdated) {
            console.log('🔄 Notification not found in arrays, forcing reload from server...');

            // Play appropriate sound for the action
            if (action === 'confirmed') {
                this.playConfirmationSound();
                console.log(`✅ Order confirmed! Notification ID: ${notificationId}, Shop: Unknown (not in array)`);
            } else if (action === 'deleted') {
                this.playWarningSound();
            } else if (action === 'edited') {
                this.playNotificationSound(false);
            }

            // Force reload and update UI based on current page
            if (this.currentPage === 'notifications') {
                this.loadAllNotifications().then(() => {
                    // After reload, update stats and re-render with current filter
                    this.updateNotificationsStats();
                    const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
                    this.filterNotifications(activeFilter);
                });
            } else if (this.currentPage === 'alerts') {
                this.loadNotificationsPage();
            } else if (this.currentPage === 'profile') {
                this.updateProfileNotificationsWidget();
            }
        } else {
            // Arrays were updated, just refresh the UI
            if (this.currentPage === 'notifications') {
                this.updateNotificationsStats();
                const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
                this.filterNotifications(activeFilter);
            } else if (this.currentPage === 'alerts') {
                this.loadNotificationsPage();
            } else if (this.currentPage === 'profile') {
                this.updateProfileNotificationsWidget();
            }
        }

        // Update notification count
        this.updateNotificationBadge(this.notifications.filter(n => !n.is_read).length);

        console.log(`🔄 Notification update processed: ${action} for ID ${notificationId}`);
    }

    // Handle notification deleted
    handleNotificationDeleted(notificationId) {
        // Remove from notifications array
        if (this.notifications) {
            const notificationIndex = this.notifications.findIndex(n => n.id === notificationId);
            if (notificationIndex !== -1) {
                this.notifications.splice(notificationIndex, 1);
            }
        }

        // Remove from allNotifications array
        if (this.allNotifications) {
            const allNotificationIndex = this.allNotifications.findIndex(n => n.id === notificationId);
            if (allNotificationIndex !== -1) {
                this.allNotifications.splice(allNotificationIndex, 1);
            }
        }

        // Update UI based on current page
        if (this.currentPage === 'alerts') {
            this.loadNotificationsPage();
        } else if (this.currentPage === 'notifications') {
            this.loadAllNotifications();
        } else if (this.currentPage === 'profile') {
            this.updateProfileNotificationsWidget();
        }

        this.showToast('Notification deleted', 'info');
    }

    // Handle notification edited
    handleNotificationEdited(notificationId, data) {
        // Update in notifications array
        if (this.notifications) {
            const notificationIndex = this.notifications.findIndex(n => n.id === notificationId);
            if (notificationIndex !== -1) {
                this.notifications[notificationIndex] = {
                    ...this.notifications[notificationIndex],
                    ...data
                };
            }
        }

        // Update in allNotifications array
        if (this.allNotifications) {
            const allNotificationIndex = this.allNotifications.findIndex(n => n.id === notificationId);
            if (allNotificationIndex !== -1) {
                this.allNotifications[allNotificationIndex] = {
                    ...this.allNotifications[allNotificationIndex],
                    ...data
                };
            }
        }

        // Update UI based on current page
        if (this.currentPage === 'alerts') {
            this.loadNotificationsPage();
        } else if (this.currentPage === 'notifications') {
            this.loadAllNotifications();
        } else if (this.currentPage === 'profile') {
            this.updateProfileNotificationsWidget();
        }

        this.showToast('Notification updated', 'info');
    }

    // Handle real-time notification
    handleRealtimeNotification(notification) {
        console.log('🔔 Shop received real-time notification:', notification);

        // Route order acceptance to dedicated handler for instant UI update
        if (notification && notification.type === 'order_accepted') {
            try { this.handleOrderAccepted(notification); } catch (e) { console.error('handleOrderAccepted failed:', e); }
            return;
        }

        // Check if notification already exists (for updates)
        const existingIndex = this.notifications.findIndex(n => n.id === notification.id);
        if (existingIndex !== -1) {
            // Update existing notification
            this.notifications[existingIndex] = {
                ...this.notifications[existingIndex],
                ...notification
            };
            console.log('🔄 Updated existing notification');
        } else {
            // Add new notification
            this.notifications.unshift(notification);
            console.log('➕ Added new notification');
            // Play strong notification sound for new notifications (awaited)
            if (typeof this.playNotificationSound === 'function') {
                Promise.resolve(this.playNotificationSound(true));
            }
        }

        // Update allNotifications array if it exists
        if (this.allNotifications) {
            const allExistingIndex = this.allNotifications.findIndex(n => n.id === notification.id);
            if (allExistingIndex !== -1) {
                this.allNotifications[allExistingIndex] = {
                    ...this.allNotifications[allExistingIndex],
                    ...notification
                };
            } else {
                this.allNotifications.unshift(notification);
            }
        }

        // Show single modern notification popup (no duplicates)
        this.showBrowserNotification(notification);

        // Update UI based on current page
        if (this.currentPage === 'alerts') {
            this.loadNotifications();
        } else if (this.currentPage === 'notifications') {
            // Force refresh the notifications page with updated data
            this.loadAllNotifications();
            // Ensure timestamp updates are running
            if (!this.timestampUpdateInterval) {
                this.startTimestampUpdates();
            }
        } else if (this.currentPage === 'profile') {
            // Update the profile notifications widget in real-time
            this.updateProfileNotificationsWidget();
        }

        // Update notification count
        this.updateNotificationBadge(this.notifications.filter(n => !n.is_read).length);
    }

    // Add method to update profile notifications widget in real-time
    updateProfileNotificationsWidget() {
        const widgetContainer = document.getElementById('recent-notifications-widget');
        const pendingBadge = document.querySelector('.pending-badge');

        if (widgetContainer && this.allNotifications) {
            // Update the widget content
            const recentNotifications = this.allNotifications
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 3);

            widgetContainer.innerHTML = this.renderRecentNotificationsWidget(recentNotifications);

            // Update the pending badge
            const pendingCount = this.allNotifications.filter(n => n.status === 'pending').length;
            const widgetTitle = document.querySelector('.widget-title');

            if (widgetTitle && pendingBadge) {
                if (pendingCount > 0) {
                    pendingBadge.textContent = `${pendingCount} pending`;
                    pendingBadge.style.display = 'inline-block';
                } else {
                    pendingBadge.style.display = 'none';
                }
            } else if (widgetTitle && pendingCount > 0) {
                // Add pending badge if it doesn't exist
                const newPendingBadge = document.createElement('span');
                newPendingBadge.className = 'pending-badge';
                newPendingBadge.textContent = `${pendingCount} pending`;
                widgetTitle.appendChild(newPendingBadge);
            }

            // Update stats in profile if they exist
            this.updateProfileStats();

            console.log('Profile notifications widget updated in real-time');
        }
    }

    // Add method to update profile stats
    updateProfileStats() {
        if (!this.allNotifications) return;

        const totalNotifications = this.allNotifications.length;
        const pendingNotifications = this.allNotifications.filter(n => n.status === 'pending').length;

        // Update stat numbers
        const statNumbers = document.querySelectorAll('.stat-number');
        if (statNumbers.length >= 3) {
            statNumbers[0].textContent = totalNotifications; // Notifications count
            statNumbers[2].textContent = pendingNotifications; // Pending count
        }
    }

    // Request notification permission
    requestNotificationPermission() {
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                // Show a custom permission request modal
                this.showNotificationPermissionModal();
            } else if (Notification.permission === 'denied') {
                this.showToast('Notifications are blocked. Please enable them in your browser settings to receive updates.', 'warning');
            }
        }
    }


        // ===== Real push subscription (Shop) =====
        getApplicationServerKey() {
            // Must match server VAPID public key and sw.js
            return 'BG_qTrWFr2qESzBzbog1Ajx_6r79bf4WheyZD2jgdzz_o68TzMkzR4Fd-WS0Y-G2gJK7xQcD0HvQ259UgQk4kM8';
        }

        urlBase64ToUint8Array(base64String) {
            const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
            const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
                outputArray[i] = rawData.charCodeAt(i);
            }
            return outputArray;
        }

        async setupShopPushSubscription() {
            try {
                if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                    console.warn('Push not supported in this browser');
                    return false;
                }
                const registration = await navigator.serviceWorker.ready;
                let subscription = await registration.pushManager.getSubscription();
                if (!subscription) {
                    const vapid = this.getApplicationServerKey();
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: this.urlBase64ToUint8Array(vapid)
                    });
                }
                // Send subscription to server for this shop
                // Prefer shop UUID from currentShop; fall back to localStorage only if it looks like a UUID
                const preferId = this.currentShop?.id || null;
                const fallbackId = this.shopId || null;
                const isUUID = (v) => typeof v === 'string' && /^[0-9a-fA-F-]{36}$/.test(v);
                const userId = isUUID(preferId) ? preferId : (isUUID(fallbackId) ? fallbackId : null);
                if (!userId) {
                    console.warn('Shop UUID not available; skipping push subscription registration');
                    return false;
                }
                const body = {
                    subscription,
                    userId,
                    userType: 'shop'
                };
                const resp = await fetch('/api/push/subscription', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(this.sessionToken ? { 'Authorization': `Bearer ${this.sessionToken}` } : {})
                    },
                    body: JSON.stringify(body)
                });
                if (!resp.ok) {
                    console.warn('Failed to save shop push subscription:', await resp.text());
                    return false;
                }
                console.log('✅ Shop push subscription saved');
                return true;
            } catch (e) {
                console.warn('Shop push subscription error:', e);
                return false;
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
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
                ">Get instant alerts when drivers confirm your delivery requests, even when the app is in the background.</p>

                <div style="
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                ">
                    <button class="permission-btn allow" style="
                        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.showToast('🎉 Notifications enabled! You\'ll receive real-time driver confirmations.', 'success');
                try { await this.setupShopPushSubscription(); } catch (e) { console.warn('Shop push setup failed:', e); }
            } else {
                this.showToast('Notifications disabled. You can enable them in your browser settings.', 'warning');
            }
            modal.remove();
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
            allowBtn.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.4)';
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
        const action = notification.action || 'confirmed';
        let accentColor, iconClass, message;

        switch (action) {
            case 'confirmed':
                accentColor = '#10b981';
                iconClass = 'fas fa-check-circle';
                message = '✅ Order confirmed';
                break;
            case 'accepted':
                accentColor = '#3b82f6';
                iconClass = 'fas fa-handshake';
                message = '🚗 Order accepted';
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
                accentColor = '#8b5cf6';
                iconClass = 'fas fa-bell';
                message = '🔔 New notification';
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
                        ${notification.driver_email || 'Driver'}
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

        // Handle click on notification (navigate to alerts)
        toast.addEventListener('click', () => {
            this.navigateToPage('alerts');
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

    // Update notification badge
    updateNotificationBadge(count) {
        const badge = document.querySelector('.notification-count');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
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
        localStorage.removeItem('shopSession');
        localStorage.removeItem('deliveryAppShop');
        localStorage.removeItem('deliveryAppShopSession');
        console.log('🗑️ Shop session data cleared');
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
                    <button class="btn primary" onclick="window.location.href='/login'" style="width: 100%; padding: 12px; font-size: 16px; font-weight: 600;">
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

    // Toggle notification sound
    toggleNotificationSound() {
        this.isAudioEnabled = !this.isAudioEnabled;
        localStorage.setItem('notificationSound', this.isAudioEnabled.toString());

        if (this.isAudioEnabled) {
            this.showToast('Notification sound enabled', 'success');
            this.playNotificationSound(); // Test sound
        } else {
            this.showToast('Notification sound disabled', 'info');
        }
    }

    showEditNotificationModal(notificationId) {
        const notification = (this.allNotifications || []).find(n => n.id == notificationId);
        if (!notification) {
            this.showToast('Notification not found', 'error');
            return;
        }
        const modalId = `edit-notification-modal-${notificationId}`;
        if (document.getElementById(modalId)) return;
        const modalHTML = `
            <div id="${modalId}" class="modal">
                <div class="modal-content" style="max-width: 500px; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);">
                    <div class="modal-header" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 20px 24px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 40px; height: 40px; background: rgba(255, 255, 255, 0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-edit" style="font-size: 18px; color: white;"></i>
                    </div>
                            <div>
                                <h3 style="margin: 0; font-size: 20px; font-weight: 600;">Edit Notification</h3>
                                <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Update your notification message</p>
                    </div>
                        </div>
                        <button class="close-modal" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 8px; border-radius: 50%; transition: background-color 0.2s ease;">&times;</button>
                    </div>
                    <div class="modal-body" style="padding: 24px;">
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Notification Message</label>
                            <textarea id="edit-notification-message-${notificationId}"
                                style="width: 100%; min-height: 120px; padding: 16px; border-radius: 12px; border: 2px solid #e5e7eb; font-size: 15px; font-family: inherit; resize: vertical; transition: border-color 0.3s ease; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);"
                                placeholder="Enter your notification message here..."
                            >${this.escapeHTML(notification.message)}</textarea>
                        </div>
                        <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                            <small style="color: #64748b;">
                                <i class="fas fa-info-circle"></i>
                                This will update the message sent to your delivery team.
                            </small>
                        </div>
                    </div>
                    <div class="modal-footer" style="padding: 20px 24px; border-top: 1px solid #e5e7eb; display: flex; gap: 12px; justify-content: flex-end;">
                        <button class="btn secondary close-modal" style="padding: 12px 20px; border-radius: 8px; font-weight: 500;">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button class="btn primary" id="save-edit-notification-btn-${notificationId}"
                            style="padding: 12px 24px; border-radius: 8px; font-weight: 600; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = document.getElementById(modalId);
        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });
        document.getElementById(`save-edit-notification-btn-${notificationId}`).addEventListener('click', async () => {
            const newMessage = document.getElementById(`edit-notification-message-${notificationId}`).value.trim();
            if (!newMessage) {
                this.showToast('Message cannot be empty', 'error');
                return;
            }
            try {
                if (!this.currentShop || !this.currentShop.id) {
                    this.showToast('Shop ID not available', 'error');
                    return;
                }
                const response = await fetch(`/api/shop/${this.currentShop.id}/notifications/${notificationId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: newMessage })
                });
                const result = await response.json();
                if (result.success) {
                    // Update local data
                    if (this.allNotifications) {
                        this.allNotifications = this.allNotifications.map(n => n.id == notificationId ? { ...n, message: newMessage } : n);
                        this.updateNotificationsStats();
                        const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
                        this.filterNotifications(activeFilter);
                    }

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
                    modal.remove();
                } else {
                    throw new Error(result.message || 'Failed to update notification');
                }
            } catch (error) {
                this.showToast('Failed to update notification', 'error');
            }
        });
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
        } else if (action === 'completed' || action === 'delivered') {
            // Move/update into delivered state and invalidate completed cache so History refreshes
            if (idx !== -1) {
                this.orders[idx] = { ...this.orders[idx], ...order, status: 'delivered' };
            } else {
                this.orders.unshift({ ...order, status: 'delivered' });
            }
            this._completedOrdersCache = null; // bust cache for History page
            this.showToast('Order completed', 'success');
        }

        if (this.currentPage === 'alerts' || this.currentPage === 'orders') {
            // If on History page, refresh content; renderOrdersPage will call loadOrdersContent()
            this.renderOrdersPage();
        }
    }

    // Handle order accepted by driver (live move Pending -> Accepted + notify)
    handleOrderAccepted(data) {
        try {
            const orderId = data.orderId || data.order_id || data.order?.id;
            const driverId = data.driverId || data.accepted_by || data.order?.driver_id;
            if (!orderId) return;

            const driverName = (data.driver && (data.driver.name || data.driver.email))
                || (data.order && data.order.users && (data.order.users.name || data.order.users.email))
                || (data.order && (data.order.driver_name || data.order.driver_email))
                || 'Driver';
            const driverEmail = (data.driver && data.driver.email)
                || (data.order && data.order.users && data.order.users.email)
                || data.order?.driver_email
                || '';

            // Update cached orders so filters reflect new state instantly
            if (this._ordersCache && this._ordersCache.data) {
                const idx = this._ordersCache.data.findIndex(o => String(o.id) === String(orderId));
                if (idx !== -1) {
                    const current = this._ordersCache.data[idx];
                    const updated = {
                        ...current,
                        status: 'assigned',
                        driver_id: driverId || current.driver_id,
                        updated_at: new Date().toISOString()
                    };
                    if (driverId && (data.driver || data.order?.users)) {
                        updated.users = data.driver || data.order?.users;
                    }
                    this._ordersCache.data[idx] = updated;
                } else if (data.order && data.order.id) {
                    // If server sent the full order, add it to cache (already assigned)
                    this._ordersCache.data.unshift(data.order);
                }
            }

            // Optimistic removal from any visible Pending list card
            const card = document.querySelector(`[data-order-id="${orderId}"]`);
            if (card) {
                card.style.transition = 'opacity 120ms ease, height 150ms ease, margin 150ms ease, padding 150ms ease';
                card.style.opacity = '0';
                card.style.height = '0px';
                card.style.margin = '0';
                card.style.padding = '0';
                setTimeout(() => card.remove(), 180);
            }

            // If dashboard is visible, do NOT auto-switch tabs. Just re-render with current filter.
            if (this.currentPage === 'dashboard') {
                const orders = this._ordersCache?.data || [];
                this.renderDashboardOrders(orders, true);
            }

            // If Orders page is visible, re-render
            if (this.currentPage === 'orders') {
                this.renderOrdersPage();
            }

            // Push a modern in-app notification with driver name
            if (typeof this.playConfirmationSound === 'function') {
                try { this.playConfirmationSound(); } catch (_) {}
            }
            this.showBrowserNotification({
                action: 'accepted',
                driver_email: driverEmail || driverName,
                message: `Order #${orderId} accepted by ${driverName}`,
                id: `accept-${orderId}-${Date.now()}`
            });

        } catch (e) {
            console.error('Error handling order_accepted:', e);
        }
    }


    async playNotificationSound(strong = false) {
        if (!this.isAudioEnabled) return;
        try {
            const ctx = this.audioContext || new (window.AudioContext || window.webkitAudioContext)();
            if (strong) {
                // Multi-tone, urgent alert sound
                const gain = ctx.createGain();
                gain.gain.value = 0.7;
                gain.connect(ctx.destination);
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                osc1.type = 'square';
                osc2.type = 'triangle';
                osc1.frequency.setValueAtTime(1040, ctx.currentTime);
                osc2.frequency.setValueAtTime(660, ctx.currentTime);
                osc1.connect(gain);
                osc2.connect(gain);
                osc1.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.25);
                osc2.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.25);
                osc1.stop(ctx.currentTime + 0.5);
                osc2.stop(ctx.currentTime + 0.5);
                osc1.onended = () => gain.disconnect();
            } else if (this.notificationAudio) {
                this.notificationAudio();
            }
        } catch (error) {
            console.warn('⚠️ Could not play notification sound:', error);
        }
    }

    // Advanced melodic chime for confirmation
    playConfirmationSound() {
        if (!this.audioContext || !this.isAudioEnabled) return;
        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            // Melodic chime: C5, E5, G5
            const notes = [523.25, 659.25, 783.99];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + i * 0.12);
                gain.gain.setValueAtTime(0.25, now + i * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12 + i * 0.12);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + i * 0.12);
                osc.stop(now + 0.12 + i * 0.12);
            });
        } catch (error) {
            console.warn('⚠️ Could not play confirmation sound:', error);
        }
    }

    // Dashboard Methods
    async loadDashboardData() {
        console.log('Loading dashboard data...');

        const container = document.querySelector('#dashboard-page .page-content');
        if (!container) {
            console.error('Dashboard container not found');
            return;
        }

        // Initialize dashboard filter if not set
        if (!this.currentDashboardFilter) {
            this.currentDashboardFilter = 'pending';
        }

        try {
            container.innerHTML = `


                <!-- Create Order Section -->
                <div style="
                    background: #ffffff;
                    border: 2px dashed #d1d5db;
                    border-radius: 16px;
                    padding: 32px 20px;
                    text-align: center;
                    margin-bottom: 24px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                " onclick="shopApp.openCreateOrderModal()" onmouseover="this.style.borderColor='#ff6b35'; this.style.background='#fef7f0'" onmouseout="this.style.borderColor='#d1d5db'; this.style.background='#ffffff'">
                    <div style="
                        width: 64px;
                        height: 64px;
                        background: #f3f4f6;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 16px;
                        transition: all 0.3s ease;
                    ">
                        <i class="fas fa-plus" style="color: #9ca3af; font-size: 24px;"></i>
                    </div>
                    <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #374151;"><span data-translate="addOrder">Create Order</span></h3>
                    <p style="margin: 0; color: #6b7280; font-size: 15px; line-height: 1.4;"><span data-translate="clickToCreateOrder">Click to create order</span></p>
                </div>

                <!-- Orders Section -->
                <div style="
                    background: #ffffff;
                    border-radius: 12px;
                    border: 1px solid #e5e7eb;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                    overflow: hidden;
                ">
                    <!-- Simple Header -->
                    <div style="
                        padding: 20px 20px 16px;
                        border-bottom: 1px solid #e5e7eb;
                    ">
                        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #111827;"><span data-translate="orders">Orders</span></h3>
                    </div>

                    <!-- Modern Filter Tabs -->
                    <div style="
                        padding: 16px 20px 0;
                        background: #ffffff;
                    ">
                        <div style="
                            display: flex;
                            background: #f8fafc;
                            border-radius: 12px;
                            padding: 4px;
                            border: 1px solid #e5e7eb;
                        ">
                            <button
                                id="dashboard-pending-tab"
                                onclick="shopApp.switchDashboardFilter('pending')"
                                style="
                                    flex: 1;
                                    padding: 12px 16px;
                                    border: none;
                                    background: ${this.currentDashboardFilter === 'pending' ? '#ffffff' : 'transparent'};
                                    color: ${this.currentDashboardFilter === 'pending' ? '#111827' : '#6b7280'};
                                    border-radius: 8px;
                                    font-size: 14px;
                                    font-weight: 600;
                                    cursor: pointer;
                                    transition: all 0.2s ease;
                                    box-shadow: ${this.currentDashboardFilter === 'pending' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'};
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    gap: 8px;
                                "
                            >
                                <div style="
                                    width: 8px;
                                    height: 8px;
                                    background: #f59e0b;
                                    border-radius: 50%;
                                "></div>
                                <span data-translate="pending">Pending</span>
                            </button>
                            <button
                                id="dashboard-accepted-tab"
                                onclick="shopApp.switchDashboardFilter('accepted')"
                                style="
                                    flex: 1;
                                    padding: 12px 16px;
                                    border: none;
                                    background: ${this.currentDashboardFilter === 'accepted' ? '#ffffff' : 'transparent'};
                                    color: ${this.currentDashboardFilter === 'accepted' ? '#111827' : '#6b7280'};
                                    border-radius: 8px;
                                    font-size: 14px;
                                    font-weight: 600;
                                    cursor: pointer;
                                    transition: all 0.2s ease;
                                    box-shadow: ${this.currentDashboardFilter === 'accepted' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'};
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    gap: 8px;
                                "
                            >
                                <div style="
                                    width: 8px;
                                    height: 8px;
                                    background: #3b82f6;
                                    border-radius: 50%;
                                "></div>
                                <span data-translate="accepted">Accepted</span>
                            </button>
                        </div>
                    </div>

                    <!-- Orders Content -->
                    <div id="dashboard-orders-content" style="padding: 20px;">
                        <!-- Orders will be loaded here -->
                    </div>
                </div>
            `;

                // Apply translations to dashboard static UI
                if (window.i18n) {
                    try {
                        window.i18n.applyTranslations && window.i18n.applyTranslations();
                        if (typeof window.i18n.translatePlaceholders === 'function') {
                            window.i18n.translatePlaceholders();
                        }
                    } catch (e) { console.warn('i18n apply on dashboard error', e); }
                }


            // Load the orders content
            await this.loadDashboardOrdersContentFast();

        } catch (error) {
            console.error('Error loading dashboard:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #ef4444;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <h3 style="margin: 0 0 8px 0; font-size: 18px;">Failed to load dashboard</h3>
                    <p style="margin: 0 0 16px 0; font-size: 14px;">Please try again</p>
                    <button onclick="shopApp.loadDashboardData()" style="
                        background: #ff6b35; color: white; border: none; padding: 8px 16px;
                        border-radius: 6px; cursor: pointer; font-size: 14px;
                    ">Retry</button>
                </div>
            `;
        }
    }

    // Switch between Pending and Accepted filters on dashboard
    async switchDashboardFilter(filter) {
        console.log('Switching dashboard filter to:', filter);
        this.currentDashboardFilter = filter;

        // Update tab styles immediately for instant feedback
        const pendingTab = document.getElementById('dashboard-pending-tab');
        const acceptedTab = document.getElementById('dashboard-accepted-tab');

        if (pendingTab && acceptedTab) {
            if (filter === 'pending') {
                pendingTab.style.background = '#ff6b35';
                pendingTab.style.color = 'white';
                acceptedTab.style.background = 'transparent';
                acceptedTab.style.color = '#6b7280';
            } else {
                acceptedTab.style.background = '#ff6b35';
                acceptedTab.style.color = 'white';
                pendingTab.style.background = 'transparent';
                pendingTab.style.color = '#6b7280';
            }
        }

        // Show loading state immediately
        const contentArea = document.getElementById('dashboard-orders-content');
        if (contentArea) {
            contentArea.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #6b7280;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 16px;"></i>
                    <p style="margin: 0; font-size: 14px;">Loading ${filter} orders...</p>
                </div>
            `;
        }

        // Load content for the selected filter (use cached data if available)
        this.loadDashboardOrdersContentFast();
    }

    // Load orders content for dashboard
    async loadDashboardOrdersContent() {
        const contentArea = document.getElementById('dashboard-orders-content');
        if (!contentArea) return;

        try {
            // Load orders from server
            const orders = await this.loadShopOrders();

            // Filter orders based on current filter
            let filteredOrders;
            if (this.currentDashboardFilter === 'pending') {
                filteredOrders = orders.filter(order => order.status === 'pending');
            } else {
                // Accepted tab shows only assigned and picked_up orders (not delivered)
                filteredOrders = orders.filter(order =>
                    order.status === 'assigned' ||
                    order.status === 'picked_up'
                );
            }

            if (filteredOrders.length === 0) {
                const emptyMessage = this.currentDashboardFilter === 'pending'
                    ? 'No pending orders'
                    : 'No accepted orders';
                const emptyDescription = this.currentDashboardFilter === 'pending'
                    ? 'Orders you create will appear here'
                    : 'Orders accepted by drivers will appear here';

                contentArea.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px; color: #6b7280;">
                        <i class="fas fa-shopping-bag" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                        <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #374151;">${emptyMessage}</h3>
                        <p style="margin: 0; font-size: 14px;">${emptyDescription}</p>
                    </div>
                `;
                return;
            }

            // Decide how many to show before expanding
            if (!this._dashboardShowAll) this._dashboardShowAll = { pending: false, accepted: false };
            const showAll = !!this._dashboardShowAll[this.currentDashboardFilter];
            const previewLimit = (this.currentDashboardFilter === 'accepted') ? 5 : 3;

            const displayOrders = showAll ? filteredOrders : filteredOrders.slice(0, previewLimit);
            const ordersHTML = displayOrders.map(order => this.createOrderCard(order)).join('');

            let viewAllButton = '';
            if (!showAll && filteredOrders.length > previewLimit) {
                viewAllButton = `
                    <div style=\"text-align: center; padding: 16px 0 0 0;\">
                        <button onclick=\"shopApp._dashboardShowAll = shopApp._dashboardShowAll || { pending: false, accepted: false }; shopApp._dashboardShowAll[shopApp.currentDashboardFilter] = true; (function(){ const o=(shopApp._ordersCache && shopApp._ordersCache.data) ? shopApp._ordersCache.data : []; shopApp.renderDashboardOrders(o, false); })();\" style=\"
                            background: transparent;
                            color: #ff6b35;
                            border: 1px solid #ff6b35;
                            padding: 8px 16px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                        \">
                            Load all ${filteredOrders.length} orders
                        </button>
                    </div>
                `;
            }

            contentArea.innerHTML = ordersHTML + viewAllButton;

            // Set up click listeners for order cards
            this.setupShopOrderCardClickListeners();

            // Initialize delivery timers for orders with delivery times
            this.initializeShopDeliveryTimers(displayOrders);

        } catch (error) {
            console.error('Error loading dashboard orders:', error);
            contentArea.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #ef4444;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <h3 style="margin: 0 0 8px 0; font-size: 18px;">Failed to load orders</h3>
                    <p style="margin: 0 0 16px 0; font-size: 14px;">Please try again</p>
                    <button onclick="shopApp.loadDashboardOrdersContentFast()" style="
                        background: #ff6b35; color: white; border: none; padding: 8px 16px;
                        border-radius: 6px; cursor: pointer; font-size: 14px;
                    ">Retry</button>
                </div>
            `;
        }
    }

    // Fast loading with cached data
    async loadDashboardOrdersContentFast() {
        const contentArea = document.getElementById('dashboard-orders-content');
        if (!contentArea) return;

        try {
            // Use cached orders if available for instant display
            let orders = this._ordersCache?.data;
            let fromCache = false;

            if (orders && this._ordersCache?.time && (Date.now() - this._ordersCache.time < 120000)) {
                fromCache = true;
                console.log('🚀 Using cached orders for instant filter switch');
            } else {
                // Load fresh orders
                orders = await this.loadShopOrders();
            }

            this.renderDashboardOrders(orders, fromCache);

            // If we used cache, refresh in background
            if (fromCache) {
                this.refreshDashboardOrdersBackground();
            }

        } catch (error) {
            console.error('Error loading dashboard orders:', error);
            contentArea.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #ef4444;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <h3 style="margin: 0 0 8px 0; font-size: 18px;">Failed to load orders</h3>
                    <p style="margin: 0 0 16px 0; font-size: 14px;">Please try again</p>
                    <button onclick="shopApp.loadDashboardOrdersContentFast()" style="
                        background: #ff6b35; color: white; border: none; padding: 8px 16px;
                        border-radius: 6px; cursor: pointer; font-size: 14px;
                    ">Retry</button>
                </div>
            `;
        }
    }

    // Render dashboard orders with filtering
    renderDashboardOrders(orders, fromCache = false) {
        const contentArea = document.getElementById('dashboard-orders-content');
        if (!contentArea) return;

        // Filter orders based on current filter
        let filteredOrders;
        if (this.currentDashboardFilter === 'pending') {
            filteredOrders = orders.filter(order => order.status === 'pending');
        } else {
            // Accepted tab shows only assigned and picked_up orders (not delivered)
            filteredOrders = orders.filter(order =>
                order.status === 'assigned' ||
                order.status === 'picked_up'
            );
        }

        if (filteredOrders.length === 0) {
            const emptyMessage = this.currentDashboardFilter === 'pending'
                ? 'No pending orders'
                : 'No accepted orders';
            const emptyDescription = this.currentDashboardFilter === 'pending'
                ? 'Orders you create will appear here'
                : 'Orders accepted by drivers will appear here';

            contentArea.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #6b7280;">
                    <i class="fas fa-shopping-bag" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                    <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #374151;">${emptyMessage}</h3>
                    <p style="margin: 0; font-size: 14px;">${emptyDescription}</p>
                    ${fromCache ? '<small style="color: #9ca3af; font-size: 12px;">⚡ Cached</small>' : ''}
                </div>
            `;
            return;
        }

        // Decide how many to show before expanding
        if (!this._dashboardShowAll) this._dashboardShowAll = { pending: false, accepted: false };
        const showAll = !!this._dashboardShowAll[this.currentDashboardFilter];
        const previewLimit = (this.currentDashboardFilter === 'accepted') ? 5 : 3;

        const displayOrders = showAll ? filteredOrders : filteredOrders.slice(0, previewLimit);
        const ordersHTML = displayOrders.map(order => this.createOrderCard(order)).join('');

        let viewAllButton = '';
        if (!showAll && filteredOrders.length > previewLimit) {
            viewAllButton = `
                <div style="text-align: center; padding: 16px 0 0 0;">
                    <button onclick="shopApp._dashboardShowAll = shopApp._dashboardShowAll || { pending: false, accepted: false }; shopApp._dashboardShowAll[shopApp.currentDashboardFilter] = true; (function(){ const o=(shopApp._ordersCache && shopApp._ordersCache.data) ? shopApp._ordersCache.data : []; shopApp.renderDashboardOrders(o, false); })();" style="
                        background: transparent; color: #ff6b35; border: 1px solid #ff6b35;
                        padding: 8px 16px; border-radius: 6px; cursor: pointer;
                        font-size: 14px; font-weight: 600;
                    ">
                        Load all ${filteredOrders.length} orders
                    </button>
                </div>
            `;
        }

        const cacheIndicator = fromCache ? '<div style="text-align: center; margin-bottom: 8px;"><small style="color: #9ca3af; font-size: 11px;">⚡ Instant</small></div>' : '';
        contentArea.innerHTML = cacheIndicator + ordersHTML + viewAllButton;

        // Set up click listeners for order cards
        this.setupShopOrderCardClickListeners();

        // Initialize delivery timers for orders with delivery times
        this.initializeShopDeliveryTimers(displayOrders);
    }

    // Background refresh for dashboard orders
    async refreshDashboardOrdersBackground() {



        try {
            const orders = await this.loadShopOrders();
            this.renderDashboardOrders(orders, false);
            console.log('Dashboard orders refreshed in background');
        } catch (error) {
            console.log('Background dashboard refresh failed:', error);
        }
    }

    // Orders Management Methods
    async renderOrdersPage() {
        console.log('Rendering orders page...');

        // Set up event listeners
        this.setupOrdersEventListeners();

        // Load orders content
        await this.loadOrdersContent();



    }

    setupOrdersEventListeners() {
        // History page - no filters needed, just load completed orders
        console.log('History page loaded - loading completed orders');
    }

    // Load orders content - OPTIMIZED for History page (completed orders)
    async loadOrdersContent() {
        const contentArea = document.getElementById('shop-orders-content');
        if (!contentArea) return;


        try {
            // For History page, load completed orders with optimization
            const completedOrders = await this.loadCompletedOrdersOptimized();

            console.log('🏪 Shop completed orders loaded:', completedOrders.length);

            if (completedOrders.length === 0) {
                contentArea.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px; color: #6b7280;">
                        <i class="fas fa-history" style="font-size: 48px; margin-bottom: 16px; color: #d1d5db;"></i>
                        <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #374151;"><span data-translate="noCompletedOrders">No Completed Orders</span></h3>
                        <p style="margin: 0; font-size: 14px;"><span data-translate="deliveredOrdersAppear">Delivered orders will appear here</span></p>
                    </div>
                `;
                if (window.i18n) { try { window.i18n.applyTranslations && window.i18n.applyTranslations(); } catch(_){} }
                return;
            }

            // Ultra-fast rendering with progressive loading

    /* Analytics Page (moved below)
    async renderAnalyticsPage() {
        const controls = document.getElementById('analytics-controls');
        const summaryEl = document.getElementById('analytics-summary');
        const ordersEl = document.getElementById('analytics-orders');
        if (!controls || !summaryEl || !ordersEl) return;

        const selected = this.analyticsDate || this.getTodayYMD();
        controls.innerHTML = `
            <div style="display:flex; gap:12px; align-items:center; flex-wrap: wrap;">
                <label style="font-weight:600; color:#111827;">Select day:</label>
                <input id="analytics-date-input" type="date" value="${selected}" style="
                    padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px; font-size:14px;" />
                <button id="analytics-refresh-btn" style="
                    background:#10b981; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">
                    Refresh
                </button>
            </div>`;

        document.getElementById('analytics-date-input').addEventListener('change', (e) => {
            this.analyticsDate = e.target.value;
        });
        document.getElementById('analytics-refresh-btn').addEventListener('click', () => {
            const d = (document.getElementById('analytics-date-input').value) || this.getTodayYMD();
            this.loadAnalytics(d, 20, 0);
        });

        summaryEl.innerHTML = '<div style="padding:12px; color:#6b7280;">Loading summary…</div>';
        ordersEl.innerHTML = '<div style="padding:12px; color:#6b7280;">Loading orders…</div>';

        await this.loadAnalytics(selected, 20, 0);
    }

    async loadAnalytics(dateYMD, limit = 20, offset = 0) {
        if (!this.currentShop || !this.currentShop.id) return;
        const summaryEl = document.getElementById('analytics-summary');
        const ordersEl = document.getElementById('analytics-orders');
        try {
            const url = `/api/shop/${this.currentShop.id}/analytics?date=${encodeURIComponent(dateYMD)}&limit=${limit}&offset=${offset}`;
            const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${this.sessionToken}` } });
            if (!resp.ok) throw new Error('Failed to load analytics');
            const { summary, orders, nextOffset, hasMore } = await resp.json();
            this.analyticsDate = dateYMD;

            this.renderAnalyticsSummary(summary);
            this.renderAnalyticsOrders(orders, offset > 0);

            // Load more button
            let loadMore = document.getElementById('analytics-load-more');
            if (loadMore) loadMore.remove();
            if (hasMore) {
                loadMore = document.createElement('button');
                loadMore.id = 'analytics-load-more';
                loadMore.textContent = 'Load more';
                loadMore.style.cssText = 'margin:12px auto; display:block; padding:8px 12px; border:1px solid #e5e7eb; border-radius:8px; background:white; cursor:pointer;';
                loadMore.addEventListener('click', () => {
                    loadMore.disabled = true; loadMore.textContent = 'Loading…';
                    this.loadAnalytics(dateYMD, limit, nextOffset);
                });
                ordersEl.appendChild(loadMore);
            }
        } catch (e) {
            console.error('Analytics load error', e);
            summaryEl.innerHTML = '<div style="padding:12px; color:#ef4444;">Failed to load analytics</div>';
            ordersEl.innerHTML = '';
        }
    }

    renderAnalyticsSummary(summary) {
        const el = document.getElementById('analytics-summary');
        if (!el || !summary) return;
        const kpi = (label, value, color) => `<div style="flex:1; min-width:140px; background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:12px;">
            <div style="font-size:12px; color:#6b7280;">${label}</div>
            <div style="font-size:20px; font-weight:700; color:${color}">${value}</div>
        </div>`;

        // Simple per-hour bar chart
        const bars = (summary.per_hour || []).map((c, i) => {
            const h = Math.min(80, c * 8);
            return `<div style=\"display:flex; flex-direction:column; align-items:center; gap:6px;\">
                        <div style=\"width:16px; height:${h}px; background:#93c5fd; border-radius:6px;\"></div>
                        <div style=\"font-size:10px; color:#6b7280;\">${i}</div>
                    </div>`;
        }).join('');

        const topDriver = summary.top_driver ? `${summary.top_driver.name || 'Driver'} (${summary.top_driver.delivered})` : '—';

        el.innerHTML = `
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
                ${kpi('Total Orders', summary.total_orders, '#111827')}
                ${kpi('Revenue (€)', summary.total_revenue.toFixed(2), '#10b981')}
                ${kpi('Driver Earnings (€)', summary.total_driver_earnings.toFixed(2), '#3b82f6')}
                ${kpi('Top Driver', topDriver, '#ef4444')}
            </div>
            <div style="margin-top:16px; background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:12px;">
                <div style="font-weight:600; color:#111827; margin-bottom:8px;">Orders per hour</div>
                <div style="display:grid; grid-template-columns: repeat(24, minmax(0, 1fr)); align-items:end; gap:6px;">
                    ${bars}
                </div>
            </div>`;
    }

    renderAnalyticsOrders(orders, append = false) {
        const el = document.getElementById('analytics-orders');
        if (!el) return;
        const html = (orders || []).map(o => this.createCompletedOrderCard(o)).join('');
        if (append) el.insertAdjacentHTML('beforeend', html);
        else el.innerHTML = html;
        // Reattach card listeners
        this.setupShopOrderCardClickListeners && this.setupShopOrderCardClickListeners();
    }
    */


            this.renderCompletedOrdersOptimized(contentArea, completedOrders);

            // Apply translations to Orders (History) page UI labels
            if (window.i18n) {
                try {
                    window.i18n.applyTranslations && window.i18n.applyTranslations();
                    if (typeof window.i18n.translatePlaceholders === 'function') {
                        window.i18n.translatePlaceholders();
                    }
                } catch (e) { console.warn('i18n apply on orders page error', e); }
            }


        } catch (error) {
            console.error('Error loading completed orders:', error);
            contentArea.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #ef4444;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <h3 style="margin: 0 0 8px 0; font-size: 18px;"><span data-translate="failedToLoadCompletedOrders">Failed to load completed orders</span></h3>
                    <p style="margin: 0 0 16px 0; font-size: 14px;"><span data-translate="pleaseTryAgain">Please try again</span></p>
                    <button onclick="shopApp.loadOrdersContent()" style="
                        background: #ff6b35; color: white; border: none; padding: 8px 16px;
                        border-radius: 6px; cursor: pointer; font-size: 14px;
                    "><span data-translate="retry">Retry</span></button>
                </div>
            `;
        }
    }
    // Load completed orders with caching and optimization
    async loadCompletedOrdersOptimized() {
        if (!this.currentShop || !this.currentShop.id) {
            throw new Error('No shop ID available');
        }

        const now = Date.now();
        const cacheFreshMs = 2 * 60 * 1000; // 2 minute client cache




        const dateYMD = this.getTodayYMD();

        // Check client cache first (per-date)
        if (this._completedOrdersCache && (now - this._completedOrdersCache.time < cacheFreshMs) && this._completedOrdersCache.date === dateYMD) {
            console.log('Using cached completed orders (today)');
            return this._completedOrdersCache.data;
        }

        console.log('Fetching fresh completed orders for shop:', this.currentShop.id, 'date:', dateYMD);

        const response = await fetch(`/api/shop/${this.currentShop.id}/completed-orders?date=${encodeURIComponent(dateYMD)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.sessionToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Failed to fetch completed orders:', response.status, response.statusText);

            // If server is unavailable, return empty array instead of crashing
            if (response.status === 503 || response.status === 500) {
                console.warn('Server unavailable for completed orders, returning empty array');
                return [];
            }

            throw new Error('Failed to fetch completed orders');
        }

        const result = await response.json();
        const orders = result.orders || [];

        // Debug: Log the structure of the first order
        if (orders.length > 0) {
            console.log('Sample completed order structure:', orders[0]);
        }

        // Cache the results (per-date)
        this._completedOrdersCache = { time: now, date: dateYMD, data: orders };

        return orders;
    }

    // Optimized rendering for completed orders
    renderCompletedOrdersOptimized(container, orders) {
        // Show skeleton loading first
        container.innerHTML = this.createCompletedOrdersSkeleton();

        // Render first 8 orders immediately for instant feedback
        requestAnimationFrame(() => {
            // Build per-day index (1,2,3...) based on creation time ascending
            const asc = [...(orders || [])].sort((a,b)=> new Date(a.created_at) - new Date(b.created_at));
            const indexMap = new Map(); asc.forEach((o,i)=> indexMap.set(o.id, i+1));

            const firstBatch = orders.slice(0, 8);
            const firstHTML = firstBatch.map(order => this.createCompletedOrderCard({ ...order, _displayIndex: indexMap.get(order.id) })).join('');
            container.innerHTML = firstHTML;

            // Render remaining orders in chunks
            if (orders.length > 8) {
                this.renderRemainingOrdersChunked(container, orders.slice(8), indexMap);
            }

            // Set up click listeners
            this.setupShopOrderCardClickListeners();
        });
    }

    // Render remaining orders in chunks to keep UI responsive
    async renderRemainingOrdersChunked(container, remainingOrders, indexMap) {
        const chunkSize = 10;
        for (let i = 0; i < remainingOrders.length; i += chunkSize) {
            await new Promise(requestAnimationFrame);
            const chunk = remainingOrders.slice(i, i + chunkSize);
            const html = chunk.map(order => this.createCompletedOrderCard({ ...order, _displayIndex: indexMap?.get(order.id) })).join('');
            container.insertAdjacentHTML('beforeend', html);
        }
    }

    // Create skeleton loading for completed orders
    createCompletedOrdersSkeleton() {
        const skeletonCard = `
            <div style="
                margin-bottom: 12px;
                background: #ffffff;
                border-radius: 12px;
                border: 1px solid #e5e7eb;
                padding: 16px;
            ">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <div style="
                        width: 100px;
                        height: 20px;
                        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                        background-size: 200% 100%;
                        animation: shimmer 1.5s infinite;
                        border-radius: 4px;
                    "></div>
                    <div style="
                        width: 80px;
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
                                width: 60px;
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
            ${Array(6).fill(skeletonCard).join('')}
        `;
    }

    // Create completed order card (similar to regular order card but shows driver info)
    createCompletedOrderCard(order) {
        const timeAgo = this.formatTimeAgo(order.created_at);
        const orderPrice = parseFloat(order.order_amount || 0).toFixed(2);
        const orderId = order.id ? String(order.id).slice(-6) : 'N/A';

        return `
            <div class="order-card" data-order-id="${order.id || ''}" style="
                margin-bottom: 12px;
                background: #ffffff;
                border-radius: 12px;
                border: 1px solid #e5e7eb;
                overflow: hidden;
                cursor: pointer;
                transition: all 0.2s ease;
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'"
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">

                <div style="padding: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div style="
                                width: 28px;
                                height: 28px;
                                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                                border-radius: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                ${order._displayIndex != null ? `<span style='color: white; font-weight: 800; font-size: 13px;'>${order._displayIndex}</span>` : `<i class=\"fas fa-shopping-bag\" style=\"color: white; font-size: 14px;\"></i>`}
                            </div>
                            <div style="font-weight: 600; color: #111827; font-size: 16px;">
                                Order #${orderId}
                            </div>
                        </div>
                        <div style="
                            background: #dcfce7;
                            color: #166534;
                            padding: 4px 12px;
                            border-radius: 20px;
                            font-size: 12px;
                            font-weight: 600;
                            display: flex;
                            align-items: center;
                            gap: 4px;
                        ">
                            <i class="fas fa-check-circle" style="font-size: 10px;"></i>
                            Delivered
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                        <!-- Price -->
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
                                <i class="fas fa-dollar-sign" style="color: #d97706; font-size: 13px;"></i>
                            </div>
                            <div>
                                <div style="font-weight: 600; color: #111827; font-size: 13px; line-height: 1.2;">$${orderPrice}</div>
                                <div style="color: #6b7280; font-size: 11px;">Total</div>
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
                                <div style="font-weight: 600; color: #111827; font-size: 13px; line-height: 1.2;">
                                    ${this.getDriverDisplayName(order)}
                                </div>
                                <div style="color: #6b7280; font-size: 11px;">Driver</div>
                            </div>
                        </div>

                        <!-- Phone -->
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="
                                width: 32px;
                                height: 32px;
                                background: #dcfce7;
                                border-radius: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <i class="fas fa-phone" style="color: #16a34a; font-size: 13px;"></i>
                            </div>
                            <div>
                                <div style="font-weight: 600; color: #111827; font-size: 13px; line-height: 1.2;">${order.customer_phone || 'N/A'}</div>
                                <div style="color: #6b7280; font-size: 11px;">Customer</div>
                            </div>
                        </div>

                        <!-- Time -->
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="
                                width: 32px;
                                height: 32px;
                                background: #f3e8ff;
                                border-radius: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <i class="fas fa-clock" style="color: #9333ea; font-size: 13px;"></i>
                            </div>
                            <div>
                                <div style="font-weight: 600; color: #111827; font-size: 13px; line-height: 1.2;">${timeAgo}</div>
                                <div style="color: #6b7280; font-size: 11px;">Completed</div>
                            </div>
                        </div>
                    </div>

                    <!-- Address -->
                    <div style="
                        background: #f9fafb;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        padding: 12px;
                        margin-bottom: 12px;
                    ">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <i class="fas fa-map-marker-alt" style="color: #ef4444; font-size: 12px;"></i>
                            <span style="font-weight: 600; color: #374151; font-size: 12px;">Delivery Address</span>
                        </div>
                        <div style="color: #6b7280; font-size: 13px; line-height: 1.4;">
                            ${order.delivery_address || 'Address not available'}
                        </div>
                    </div>

                    <!-- Notes -->
                    <div style="
                        background: #fffbeb;
                        border: 1px solid #fed7aa;
                        border-radius: 8px;
                        padding: 12px;
                    ">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <i class="fas fa-sticky-note" style="color: #d97706; font-size: 12px;"></i>
                            <span style="font-weight: 600; color: #92400e; font-size: 12px;">Notes</span>
                        </div>
                        <div style="color: #92400e; font-size: 13px; line-height: 1.4;">
                            ${order.notes || 'No special instructions'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Load shop orders from server
    async loadShopOrders() {
        if (!this.currentShop || !this.currentShop.id) {
            throw new Error('No shop ID available');
        }

        console.log('Loading shop orders for shop:', this.currentShop.id);
        console.log('Session token:', this.sessionToken ? 'Present' : 'Missing');

        try {
            const response = await fetch(`/api/shop/${this.currentShop.id}/orders`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Response status:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server response error:', errorText);

                // If 503 or 500, try to return empty array instead of crashing
                if (response.status === 503 || response.status === 500) {
                    console.warn('Server unavailable, returning empty orders array');
                    return [];
                }

                throw new Error(`Failed to load orders: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Orders response:', data);

            if (!data.success) {
                throw new Error(data.message || 'Failed to load orders');
            }

            const orders = data.orders || [];

            // Cache the orders for fast filtering
            this._ordersCache = {
                time: Date.now(),
                data: orders
            };

            console.log('Orders loaded successfully:', orders.length);
            return orders;
        } catch (error) {
            console.error('Error in loadShopOrders:', error);
            throw error;
        }
    }

    // Create order card HTML (matching driver UI style)
    createOrderCard(order) {
        const statusColor = order.status === 'pending' ? '#f59e0b' :
                          order.status === 'assigned' ? '#3b82f6' :
                          order.status === 'picked_up' ? '#8b5cf6' :
                          order.status === 'delivered' ? '#10b981' : '#6b7280';

        const statusText = order.status === 'pending' ? 'Pending' :
                         order.status === 'assigned' ? 'Assigned' :
                         order.status === 'picked_up' ? 'Picked Up' :
                         order.status === 'delivered' ? 'Delivered' : 'Unknown';

        const timeAgo = this.formatTimeAgo(order.created_at);
        const orderPrice = parseFloat(order.order_amount || 0).toFixed(2);

        // Driver info section (for accepted orders)
        const driverDisplayName = this.getDriverDisplayName(order);
        const hasDriverAssigned = !!(order.driver_id || (order.users && (order.users.name || order.users.email)) || order.driver_name);
        const driverInfo = hasDriverAssigned ? `
            <div style="
                background: #f0f9ff;
                border: 1px solid #e0f2fe;
                border-radius: 8px;
                padding: 8px 12px;
                margin-top: 8px;
                border-left: 3px solid #3b82f6;
            ">
                <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px; text-transform: uppercase; font-weight: 600;">Assigned Driver</div>
                <div style="font-size: 13px; font-weight: 600; color: #1e40af;">
                    <i class="fas fa-user" style="margin-right: 6px; font-size: 11px;"></i>
                    ${driverDisplayName}
                </div>
            </div>
        ` : '';

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
                                <i class="fas fa-shopping-bag" style="color: white; font-size: 14px;"></i>
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
                        <div style="text-align: right;">
                            <div style="
                                font-size: 20px;
                                font-weight: 700;
                                color: ${statusColor};
                                line-height: 1;
                            ">€${orderPrice}</div>
                            <span style="
                                background: ${statusColor};
                                color: white;
                                padding: 2px 8px;
                                border-radius: 12px;
                                font-size: 10px;
                                font-weight: 600;
                                margin-top: 4px;
                                display: inline-block;
                            ">${statusText}</span>
                        </div>
                    </div>
                </div>

                <!-- Content -->
                <div style="padding: 16px;">
                    <!-- Order Details Grid (2x2) -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px;">
                        <!-- Customer Phone -->
                        <div>
                            <div style="
                                font-size: 11px;
                                color: #6b7280;
                                margin-bottom: 4px;
                                text-transform: uppercase;
                                font-weight: 600;
                                letter-spacing: 0.5px;
                            ">Customer Phone</div>
                            <div style="
                                font-size: 14px;
                                font-weight: 600;
                                color: #111827;
                                display: flex;
                                align-items: center;
                                gap: 6px;
                            ">
                                <i class="fas fa-phone" style="color: ${statusColor}; font-size: 12px;"></i>
                                ${order.customer_phone || 'Not provided'}
                            </div>
                        </div>

                        <!-- Payment Method -->
                        <div>
                            <div style="
                                font-size: 11px;
                                color: #6b7280;
                                margin-bottom: 4px;
                                text-transform: uppercase;
                                font-weight: 600;
                                letter-spacing: 0.5px;
                            ">Payment</div>
                            <div style="
                                font-size: 14px;
                                font-weight: 600;
                                color: #111827;
                                display: flex;
                                align-items: center;
                                gap: 6px;
                            ">
                                <i class="fas ${order.payment_method === 'cash' ? 'fa-money-bill' : 'fa-credit-card'}" style="color: ${statusColor}; font-size: 12px;"></i>
                                ${order.payment_method === 'cash' ? 'Cash' : 'Card'}
                            </div>
                        </div>

                        <!-- Delivery Address -->
                        <div>
                            <div style="
                                font-size: 11px;
                                color: #6b7280;
                                margin-bottom: 4px;
                                text-transform: uppercase;
                                font-weight: 600;
                                letter-spacing: 0.5px;
                            ">Delivery Address</div>
                            <div style="
                                font-size: 14px;
                                font-weight: 500;
                                color: #374151;
                                display: flex;
                                align-items: flex-start;
                                gap: 6px;
                                line-height: 1.4;
                            ">
                                <i class="fas fa-map-marker-alt" style="color: ${statusColor}; font-size: 12px; margin-top: 2px;"></i>
                                ${order.delivery_address || 'Not provided'}
                            </div>
                        </div>

                        <!-- Driver Info -->
                        <div>
                            <div style="
                                font-size: 11px;
                                color: #6b7280;
                                margin-bottom: 4px;
                                text-transform: uppercase;
                                font-weight: 600;
                                letter-spacing: 0.5px;
                            ">Driver</div>
                            <div style="
                                font-size: 14px;
                                font-weight: 600;
                                color: #111827;
                                display: flex;
                                align-items: center;
                                gap: 6px;
                            ">
                                ${(order.driver_id || order.users) ? `
                                    <i class="fas fa-user" style="color: ${statusColor}; font-size: 12px;"></i>
                                    ${this.getDriverDisplayName(order)}
                                ` : `
                                    <i class="fas fa-user-slash" style="color: #6b7280; font-size: 12px;"></i>
                                    <span style="color: #6b7280;">None</span>
                                `}
                            </div>
                        </div>
                    </div>






                </div>
            </div>
        `;
    }

    // Setup click listeners for shop order cards
    setupShopOrderCardClickListeners() {
        const orderCards = document.querySelectorAll('.order-card-clickable');
        console.log('🎯 Setting up click listeners for', orderCards.length, 'shop order cards');

        orderCards.forEach(card => {
            card.addEventListener('click', () => {
                const orderId = card.getAttribute('data-order-id');
                console.log('🎯 Shop order card clicked, ID:', orderId);
                this.openShopOrderDetailsModal(orderId);
            });
        });
    }

    // Open order details modal for shop (view-only, no action buttons)
    async openShopOrderDetailsModal(orderId) {
        console.log('🔍 Opening shop order details modal for order:', orderId);

        try {
            // Find the order in our current orders data
            const orders = await this.loadShopOrders();
            const order = orders.find(o => o.id.toString() === orderId.toString());

            if (!order) {
                this.showToast('Order not found', 'error');
                return;
            }

            // Create modal
            const modal = document.createElement('div');
            modal.id = 'shop-order-details-modal';
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

            const statusColor = order.status === 'pending' ? '#f59e0b' :
                              order.status === 'assigned' ? '#3b82f6' :
                              order.status === 'picked_up' ? '#8b5cf6' :
                              order.status === 'delivered' ? '#10b981' : '#6b7280';

            const statusText = order.status === 'pending' ? 'Pending' :
                             order.status === 'assigned' ? 'Assigned' :
                             order.status === 'picked_up' ? 'Picked Up' :
                             order.status === 'delivered' ? 'Delivered' : 'Unknown';

            const orderPrice = parseFloat(order.order_amount || 0).toFixed(2);
            const timeAgo = this.formatTimeAgo(order.created_at);

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
                        background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%);
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
                        ">${statusText}</div>
                        <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">Order #${order.id}</h2>
                        <p style="margin: 0; opacity: 0.9; font-size: 16px;">€${orderPrice}</p>
                    </div>

                    <!-- Content -->
                    <div style="padding: 24px;">
                        <!-- Order Info -->
                        <div style="margin-bottom: 20px;">
                            <div style="
                                font-size: 12px;
                                color: #6b7280;
                                margin-bottom: 8px;
                                text-transform: uppercase;
                                font-weight: 600;
                                letter-spacing: 0.5px;
                            ">Order Information</div>

                            <div style="display: grid; gap: 12px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="color: #6b7280; font-size: 14px;">Created</span>
                                    <span style="font-weight: 600; color: #111827; font-size: 14px;">${timeAgo}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="color: #6b7280; font-size: 14px;">Payment Method</span>
                                    <span style="font-weight: 600; color: #111827; font-size: 14px;">${order.payment_method === 'cash' ? 'Cash' : 'Card'}</span>
                                </div>
                                ${order.preparation_time ? `
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span style="color: #6b7280; font-size: 14px;">Preparation Time</span>
                                        <span style="font-weight: 600; color: #111827; font-size: 14px;">
                                            <i class="fas fa-clock" style="color: ${statusColor}; margin-right: 4px; font-size: 12px;"></i>
                                            ${order.preparation_time} minutes
                                        </span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Customer Info -->
                        <div style="margin-bottom: 20px;">
                            <div style="
                                font-size: 12px;
                                color: #6b7280;
                                margin-bottom: 8px;
                                text-transform: uppercase;
                                font-weight: 600;
                                letter-spacing: 0.5px;
                            ">Customer Details</div>

                            <div style="display: grid; gap: 12px;">
                                <div>
                                    <div style="color: #6b7280; font-size: 12px; margin-bottom: 2px;">Phone Number</div>
                                    <div style="font-weight: 600; color: #111827; font-size: 14px;">
                                        <i class="fas fa-phone" style="color: ${statusColor}; margin-right: 6px; font-size: 12px;"></i>
                                        ${order.customer_phone || 'Not provided'}
                                    </div>
                                </div>
                                <div>
                                    <div style="color: #6b7280; font-size: 12px; margin-bottom: 2px;">Delivery Address</div>
                                    <div style="font-weight: 500; color: #111827; font-size: 14px; line-height: 1.4;">
                                        <i class="fas fa-map-marker-alt" style="color: ${statusColor}; margin-right: 6px; font-size: 12px;"></i>
                                        ${order.delivery_address || 'Not provided'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Driver Info (if assigned) -->
                        ${(order.users && order.users.email) ? `
                            <div style="margin-bottom: 20px;">
                                <div style="
                                    font-size: 12px;
                                    color: #6b7280;
                                    margin-bottom: 8px;
                                    text-transform: uppercase;
                                    font-weight: 600;
                                    letter-spacing: 0.5px;
                                ">Assigned Driver</div>

                                <div style="
                                    background: #f0f9ff;
                                    border: 1px solid #e0f2fe;
                                    border-radius: 8px;
                                    padding: 12px;
                                    border-left: 3px solid #3b82f6;
                                ">
                                    <div style="font-weight: 600; color: #1e40af; font-size: 14px;">
                                        <i class="fas fa-user" style="margin-right: 6px; font-size: 12px;"></i>
                                        ${order.users.name || order.users.email || 'Driver'}
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Notes (if any) -->
                        ${order.notes ? `
                            <div style="margin-bottom: 20px;">
                                <div style="
                                    font-size: 12px;
                                    color: #6b7280;
                                    margin-bottom: 8px;
                                    text-transform: uppercase;
                                    font-weight: 600;
                                    letter-spacing: 0.5px;
                                ">Notes</div>

                                <div style="
                                    background: rgba(255, 107, 53, 0.1);
                                    border: 1px solid rgba(255, 107, 53, 0.2);
                                    border-radius: 8px;
                                    padding: 12px;
                                    border-left: 3px solid #ff6b35;
                                ">
                                    <div style="
                                        font-style: italic;
                                        color: #374151;
                                        font-size: 14px;
                                        line-height: 1.4;
                                    ">"${order.notes}"</div>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Close Button -->
                        <button onclick="shopApp.closeShopOrderDetailsModal()" style="
                            width: 100%;
                            background: #f3f4f6;
                            color: #374151;
                            border: none;
                            padding: 12px;
                            border-radius: 8px;
                            font-size: 14px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        " onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">
                            Close
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden';

            // Close on backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeShopOrderDetailsModal();
                }
            });

        } catch (error) {
            console.error('Error opening order details:', error);
            this.showToast('Failed to load order details', 'error');
        }
    }

    // Close shop order details modal
    closeShopOrderDetailsModal() {
        const modal = document.getElementById('shop-order-details-modal');
        if (modal) {
            modal.remove();
            document.body.style.overflow = 'auto';
        }
    }

    // Setup click listeners for shop order cards
    setupShopOrderCardClickListeners() {
        const orderCards = document.querySelectorAll('.order-card-clickable');
        console.log('🎯 Setting up click listeners for', orderCards.length, 'shop order cards');

        orderCards.forEach(card => {
            card.addEventListener('click', () => {
                const orderId = card.getAttribute('data-order-id');
                console.log('🎯 Shop order card clicked, ID:', orderId);
                this.openShopOrderDetailsModal(orderId);
            });
        });
    }

    // Open order details modal for shop (view-only, no action buttons)
    async openShopOrderDetailsModal(orderId) {
        console.log('🔍 Opening shop order details modal for order:', orderId);

        try {
            // Find the order in our current orders data
            const orders = await this.loadShopOrders();
            const order = orders.find(o => o.id.toString() === orderId.toString());

            if (!order) {
                this.showToast('Order not found', 'error');
                return;
            }

            // Create modal
            const modal = document.createElement('div');
            modal.id = 'shop-order-details-modal';
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

            const statusColor = order.status === 'pending' ? '#f59e0b' :
                              order.status === 'assigned' ? '#3b82f6' :
                              order.status === 'picked_up' ? '#8b5cf6' :
                              order.status === 'delivered' ? '#10b981' : '#6b7280';

            const statusText = order.status === 'pending' ? 'Pending' :
                             order.status === 'assigned' ? 'Assigned' :
                             order.status === 'picked_up' ? 'Picked Up' :
                             order.status === 'delivered' ? 'Delivered' : 'Unknown';

            const orderPrice = parseFloat(order.order_amount || 0).toFixed(2);
            const timeAgo = this.formatTimeAgo(order.created_at);

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
                        background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%);
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
                        ">${statusText}</div>
                        <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">Order #${order.id}</h2>
                        <p style="margin: 0; opacity: 0.9; font-size: 16px;">€${orderPrice}</p>
                    </div>

                    <!-- Content -->
                    <div style="padding: 24px;">
                        <!-- Order Info -->
                        <div style="margin-bottom: 20px;">
                            <div style="
                                font-size: 12px;
                                color: #6b7280;
                                margin-bottom: 8px;
                                text-transform: uppercase;
                                font-weight: 600;
                                letter-spacing: 0.5px;
                            ">Order Information</div>

                            <div style="display: grid; gap: 12px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="color: #6b7280; font-size: 14px;">Created</span>
                                    <span style="font-weight: 600; color: #111827; font-size: 14px;">${timeAgo}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="color: #6b7280; font-size: 14px;">Payment Method</span>
                                    <span style="font-weight: 600; color: #111827; font-size: 14px;">${order.payment_method === 'cash' ? 'Cash' : 'Card'}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Customer Info -->
                        <div style="margin-bottom: 20px;">
                            <div style="
                                font-size: 12px;
                                color: #6b7280;
                                margin-bottom: 8px;
                                text-transform: uppercase;
                                font-weight: 600;
                                letter-spacing: 0.5px;
                            ">Customer Details</div>

                            <div style="display: grid; gap: 12px;">
                                <div>
                                    <div style="color: #6b7280; font-size: 12px; margin-bottom: 2px;">Phone Number</div>
                                    <div style="font-weight: 600; color: #111827; font-size: 14px;">
                                        <i class="fas fa-phone" style="color: ${statusColor}; margin-right: 6px; font-size: 12px;"></i>
                                        ${order.customer_phone || 'Not provided'}
                                    </div>
                                </div>
                                <div>
                                    <div style="color: #6b7280; font-size: 12px; margin-bottom: 2px;">Delivery Address</div>
                                    <div style="font-weight: 500; color: #111827; font-size: 14px; line-height: 1.4;">
                                        <i class="fas fa-map-marker-alt" style="color: ${statusColor}; margin-right: 6px; font-size: 12px;"></i>
                                        ${order.delivery_address || 'Not provided'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Driver Info (if assigned) -->
                        ${(order.users && order.users.email) ? `
                            <div style="margin-bottom: 20px;">
                                <div style="
                                    font-size: 12px;
                                    color: #6b7280;
                                    margin-bottom: 8px;
                                    text-transform: uppercase;
                                    font-weight: 600;
                                    letter-spacing: 0.5px;
                                ">Assigned Driver</div>

                                <div style="
                                    background: #f0f9ff;
                                    border: 1px solid #e0f2fe;
                                    border-radius: 8px;
                                    padding: 12px;
                                    border-left: 3px solid #3b82f6;
                                ">
                                    <div style="font-weight: 600; color: #1e40af; font-size: 14px;">
                                        <i class="fas fa-user" style="margin-right: 6px; font-size: 12px;"></i>
                                        ${order.users.name || order.users.email || 'Driver'}
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Notes (if any) -->
                        ${order.notes ? `
                            <div style="margin-bottom: 20px;">
                                <div style="
                                    font-size: 12px;
                                    color: #6b7280;
                                    margin-bottom: 8px;
                                    text-transform: uppercase;
                                    font-weight: 600;
                                    letter-spacing: 0.5px;
                                ">Notes</div>

                                <div style="
                                    background: rgba(255, 107, 53, 0.1);
                                    border: 1px solid rgba(255, 107, 53, 0.2);
                                    border-radius: 8px;
                                    padding: 12px;
                                    border-left: 3px solid #ff6b35;
                                ">
                                    <div style="
                                        font-style: italic;
                                        color: #374151;
                                        font-size: 14px;
                                        line-height: 1.4;
                                    ">"${order.notes}"</div>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Close Button -->
                        <button onclick="shopApp.closeShopOrderDetailsModal()" style="
                            width: 100%;
                            background: #f3f4f6;
                            color: #374151;
                            border: none;
                            padding: 12px;
                            border-radius: 8px;
                            font-size: 14px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        " onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">
                            Close
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden';

            // Close on backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeShopOrderDetailsModal();
                }
            });

        } catch (error) {
            console.error('Error opening order details:', error);
            this.showToast('Failed to load order details', 'error');
        }
    }

    // Close shop order details modal
    closeShopOrderDetailsModal() {
        const modal = document.getElementById('shop-order-details-modal');
        if (modal) {
            modal.remove();
            document.body.style.overflow = 'auto';
        }
    }

    // Format time ago helper
    formatTimeAgo(dateString) {
        if (!dateString) return 'Unknown';

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Unknown';

        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }


    // Prefer driver's real name; avoid showing raw UUIDs
    getDriverDisplayName(order) {
        try {
            const u = order && order.users ? order.users : {};
            // 1) Real name first (supports various fields)
            const nameParts = [];
            if (u.first_name) nameParts.push(u.first_name);
            if (u.last_name) nameParts.push(u.last_name);
            const composed = nameParts.join(' ').trim();
            const candidate = u.name || u.full_name || composed || order.driver_name;
            if (candidate && String(candidate).trim().length > 0) return String(candidate).trim();
            // 2) Email local-part as a very last resort (not great, but better than UUID)
            const email = u.email || order.driver_email;
            if (email && String(email).includes('@')) return String(email).split('@')[0];
            // 3) If we only have an ID, show it only when it's short numeric (not UUIDs)
            if (order && order.driver_id != null) {
                const idStr = String(order.driver_id);
                const isNumeric = /^[0-9]+$/.test(idStr);
                const isUuidLike = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i.test(idStr);
                if (isNumeric && idStr.length <= 6) return `Driver #${idStr}`;
                if (!isUuidLike && idStr.length <= 8) return `Driver #${idStr}`; // short non-UUID fallback
            }
            // 4) Generic fallback
            return 'Driver';
        } catch (_) {
            return 'Driver';
        }
    }

    // Initialize delivery timers for shop orders that have delivery times set
    initializeShopDeliveryTimers(orders) {
        if (!orders) return;

        // Use setTimeout to avoid blocking the UI
        setTimeout(() => {
            orders.forEach(order => {
                if (order.delivery_time && order.status === 'picked_up') {
                    const deliveryTime = new Date(order.delivery_time);
                    const now = new Date();

                    // Start if in future, otherwise show Ended immediately
                    if (deliveryTime > now) {
                        console.log(`🔄 Shop: Resuming countdown for order ${order.id}`);
                        this.startShopDeliveryCountdown(order.id, deliveryTime);
                    } else {
                        this.updateShopCountdownDisplay(order.id, 0, true);
                    }
                }
            });
        }, 100); // Small delay to let UI render first
    }

    // Start countdown timer for an order (shop view)
    startShopDeliveryCountdown(orderId, deliveryTime) {
        console.log(`⏰ Shop: Starting countdown for order ${orderId} until ${deliveryTime}`);

        // Clear any existing timer for this order
        if (this.shopDeliveryTimers && this.shopDeliveryTimers[orderId]) {
            clearInterval(this.shopDeliveryTimers[orderId]);
        }

        // Initialize timers object if not exists
        if (!this.shopDeliveryTimers) {
            this.shopDeliveryTimers = {};
        }

        // Start countdown
        this.shopDeliveryTimers[orderId] = setInterval(() => {
            const now = new Date();
            const timeLeft = deliveryTime.getTime() - now.getTime();

            if (timeLeft <= 0) {
                // Time's up - clear timer and update display
                console.log(`⏰ Shop: Timer expired for order ${orderId}`);
                clearInterval(this.shopDeliveryTimers[orderId]);
                delete this.shopDeliveryTimers[orderId];

                // Update display to show completed
                this.updateShopCountdownDisplay(orderId, 0, true);
            } else {
                // Update countdown display
                this.updateShopCountdownDisplay(orderId, timeLeft, false);
            }
        }, 1000); // Update every second

        // Immediately show the countdown timer
        const now = new Date();
        const timeLeft = deliveryTime.getTime() - now.getTime();
        if (timeLeft > 0) {
            this.updateShopCountdownDisplay(orderId, timeLeft, false);
        }
    }

    // Update countdown display in shop order card
    updateShopCountdownDisplay(orderId, timeLeft, isExpired) {
        // Find the order card and update countdown
        const orderCard = document.querySelector(`[data-order-id="${orderId}"]`);
        if (orderCard) {
            let countdownElement = orderCard.querySelector('.shop-countdown-timer');
            if (!countdownElement) {
                // Create countdown element below the order details
                const orderDetailsArea = orderCard.querySelector('div[style*="padding: 16px"]');
                if (orderDetailsArea) {
                    countdownElement = document.createElement('div');
                    countdownElement.className = 'shop-countdown-timer';
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

            if (countdownElement) {
                if (isExpired) {
                    countdownElement.innerHTML = '<i class="fas fa-exclamation-circle" style="font-size: 12px;"></i> Deliver Time: Ended';
                    countdownElement.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                    countdownElement.style.boxShadow = '0 2px 4px rgba(220, 38, 38, 0.2)';
                } else {
                    const minutes = Math.floor(timeLeft / (1000 * 60));
                    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    countdownElement.innerHTML = `<i class=\"fas fa-clock\" style=\"font-size: 12px;\"></i> Delivery in ${timeString}`;
                }
            }
        }


                }
    // Analytics Page (final)
    async renderAnalyticsPage() {
        const controls = document.getElementById('analytics-controls');
        const summaryEl = document.getElementById('analytics-summary');
        const ordersEl = document.getElementById('analytics-orders');
        if (!controls || !summaryEl || !ordersEl) return;

        const viewMode = this.analyticsViewMode || 'daily';
        const selectedDay = this.analyticsDate || this.getTodayYMD();
        const selectedMonth = this.analyticsMonth || (new Date().toISOString().slice(0,7));

        const viewSelect = `
            <label style="font-weight:600; color:#111827;">View:</label>
            <select id="analytics-view" style="padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px; font-size:14px;">
                <option value="daily" ${viewMode==='daily'?'selected':''}>Daily</option>
                <option value="monthly" ${viewMode==='monthly'?'selected':''}>Monthly Report</option>
            </select>`;

        const inputHtml = viewMode === 'monthly'
            ? `<label style="font-weight:600; color:#111827;">Select month:</label>
               <input id="analytics-month-input" type="month" value="${selectedMonth}" style="padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px; font-size:14px;" />`
            : `<label style="font-weight:600; color:#111827;">Select day:</label>
               <input id="analytics-date-input" type="date" value="${selectedDay}" style="padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px; font-size:14px;" />`;

        controls.innerHTML = `
            <div style="display:flex; gap:12px; align-items:center; flex-wrap: wrap;">
                ${viewSelect}
                ${inputHtml}
                <button id="analytics-refresh-btn" style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">Refresh</button>
            </div>`;

        const viewEl = document.getElementById('analytics-view');
        viewEl && viewEl.addEventListener('change', (e) => {
            this.analyticsViewMode = e.target.value;
            // Re-render controls to swap input type and keep UX consistent
            this.renderAnalyticsPage();
        });

        if (viewMode === 'monthly') {
            const mi = document.getElementById('analytics-month-input');
            mi && mi.addEventListener('change', (e) => { this.analyticsMonth = e.target.value; });
        } else {
            const di = document.getElementById('analytics-date-input');
            di && di.addEventListener('change', (e) => { this.analyticsDate = e.target.value; });
        }

        document.getElementById('analytics-refresh-btn').addEventListener('click', async () => {
            if ((this.analyticsViewMode || 'daily') === 'monthly') {
                const m = (document.getElementById('analytics-month-input').value) || (new Date().toISOString().slice(0,7));
                summaryEl.innerHTML = '<div style="padding:12px; color:#6b7280;">Loading monthly report…</div>';
                ordersEl.innerHTML = '';
                await this.loadMonthlyAnalytics(m);
            } else {
                const d = (document.getElementById('analytics-date-input').value) || this.getTodayYMD();
                summaryEl.innerHTML = '<div style="padding:12px; color:#6b7280;">Loading summary…</div>';
                ordersEl.innerHTML = '<div style="padding:12px; color:#6b7280;">Loading orders…</div>';
                await this.loadAnalytics(d, 20, 0);
            }
        });

        if (viewMode === 'monthly') {
            summaryEl.innerHTML = '<div style="padding:12px; color:#6b7280;">Loading monthly report…</div>';
            ordersEl.innerHTML = '';
            await this.loadMonthlyAnalytics(selectedMonth);
        } else {
            summaryEl.innerHTML = '<div style="padding:12px; color:#6b7280;">Loading summary…</div>';
            ordersEl.innerHTML = '<div style="padding:12px; color:#6b7280;">Loading orders…</div>';
            await this.loadAnalytics(selectedDay, 20, 0);
        }
    }

    async loadAnalytics(dateYMD, limit = 20, offset = 0) {
        if (!this.currentShop || !this.currentShop.id) return;
        const summaryEl = document.getElementById('analytics-summary');
        const ordersEl = document.getElementById('analytics-orders');
        try {
            const url = `/api/shop/${this.currentShop.id}/analytics?date=${encodeURIComponent(dateYMD)}&limit=${limit}&offset=${offset}`;
            const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${this.sessionToken}` } });
            if (!resp.ok) throw new Error('Failed to load analytics');
            const { summary, orders, nextOffset, hasMore } = await resp.json();
            this.analyticsDate = dateYMD;
            this._analyticsLastSummary = summary;

            this.renderAnalyticsSummary(summary);
            this.renderAnalyticsOrders(orders, offset > 0);

            // Load more button
            let loadMore = document.getElementById('analytics-load-more');
            if (loadMore) loadMore.remove();
            if (hasMore) {
                loadMore = document.createElement('button');
                loadMore.id = 'analytics-load-more';
                loadMore.textContent = 'Load more';
                loadMore.style.cssText = 'margin:12px auto; display:block; padding:8px 12px; border:1px solid #e5e7eb; border-radius:8px; background:white; cursor:pointer;';
                loadMore.addEventListener('click', () => {
                    loadMore.disabled = true; loadMore.textContent = 'Loading…';
                    this.loadAnalytics(dateYMD, limit, nextOffset);
                });
                ordersEl.appendChild(loadMore);
            }
        } catch (e) {
            console.error('Analytics load error', e);
            summaryEl.innerHTML = '<div style="padding:12px; color:#ef4444;">Failed to load analytics</div>';
            ordersEl.innerHTML = '';
        }
    }



    async loadMonthlyAnalytics(monthStr) {
        if (!this.currentShop || !this.currentShop.id) return;
        const summaryEl = document.getElementById('analytics-summary');
        const ordersEl = document.getElementById('analytics-orders');
        try {
            const url = `/api/shop/${this.currentShop.id}/analytics/monthly?month=${encodeURIComponent(monthStr)}`;
            const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${this.sessionToken}` } });
            if (!resp.ok) throw new Error('Failed to load monthly analytics');
            const { summary } = await resp.json();
            this.analyticsMonth = monthStr;
            this._analyticsLastMonthlySummary = summary;
            this.renderMonthlySummary(summary);
            // Monthly report does not list orders
            ordersEl.innerHTML = '';
        } catch (e) {
            console.error('Monthly analytics load error', e);
            summaryEl.innerHTML = '<div style="padding:12px; color:#ef4444;">Failed to load monthly report</div>';
            ordersEl.innerHTML = '';
        }
    }

    renderMonthlySummary(summary) {
        const el = document.getElementById('analytics-summary');
        if (!el || !summary) return;
        const kpi = (label, value, color) => `<div style="flex:1; min-width:160px; background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:12px;">
            <div style="font-size:12px; color:#6b7280;">${label}</div>
            <div style="font-size:20px; font-weight:700; color:${color}">${value}</div>
        </div>`;

        const topDriver = summary.top_driver ? `${summary.top_driver.name || 'Driver'} (${summary.top_driver.delivered})` : '—';
        const peakDayLabel = summary.peak_day ? `${summary.peak_day}${summary.peak_day_count ? ` (${summary.peak_day_count} orders)` : ''}` : '—';

        el.innerHTML = `
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
                ${kpi('Total Orders (Month)', summary.total_orders, '#111827')}
                ${kpi('Revenue (€) (Month)', Number(summary.total_revenue).toFixed(2), '#10b981')}
                ${kpi('Peak Day', peakDayLabel, '#8b5cf6')}
                ${kpi('Top Driver', topDriver, '#ef4444')}
            </div>`;
    }


    renderAnalyticsSummary(summary) {
        const el = document.getElementById('analytics-summary');
        if (!el || !summary) return;
        const kpi = (label, value, color) => `<div style="flex:1; min-width:140px; background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:12px;">
            <div style="font-size:12px; color:#6b7280;">${label}</div>
            <div style="font-size:20px; font-weight:700; color:${color}">${value}</div>
        </div>`;

        // Compute peak hour (1-hour grouping)
        const perHour = Array.isArray(summary.per_hour) ? summary.per_hour : new Array(24).fill(0);
        let peakIdx = 0, peakVal = perHour[0] || 0;
        for (let i = 1; i < perHour.length; i++) {
            if ((perHour[i] || 0) > peakVal) { peakVal = perHour[i] || 0; peakIdx = i; }
        }
        const timeOfDayLabel = (h) => {
            if (h >= 6 && h < 12) return 'Morning';
            if (h >= 12 && h < 18) return 'Afternoon';
            if (h >= 18 && h < 24) return 'Evening';
            return 'Night';
        };
        const peakHourLabel = peakVal > 0 ? `${peakIdx} - ${Math.min(24, peakIdx + 1)} ${timeOfDayLabel(peakIdx)}` : '—';

        const topDriver = summary.top_driver ? `${summary.top_driver.name || 'Driver'} (${summary.top_driver.delivered})` : '—';

        // KPIs only; removed "Orders by time" chart
        el.innerHTML = `
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
                ${kpi('Total Orders', summary.total_orders, '#111827')}
                ${kpi('Revenue (€)', Number(summary.total_revenue).toFixed(2), '#10b981')}
                ${kpi('Peak Hour', peakHourLabel, '#8b5cf6')}
                ${kpi('Top Driver', topDriver, '#ef4444')}
            </div>`;
    }

    renderAnalyticsOrders(orders, append = false) {
        const el = document.getElementById('analytics-orders');
        if (!el) return;
        const html = (orders || []).map(o => this.createCompletedOrderCard(o)).join('');
        if (append) el.insertAdjacentHTML('beforeend', html);
        else el.innerHTML = html;
        // Reattach card listeners
        this.setupShopOrderCardClickListeners && this.setupShopOrderCardClickListeners();
    }

}

// Make app available globally
let shopApp;

// Initialize the shop app
document.addEventListener('DOMContentLoaded', () => {
    shopApp = new ShopApp();
    // Expose globally so translations.js can access sessionToken
    window.shopApp = shopApp;

    // Initialize i18n and ensure translations apply on change
    if (window.i18n) {
        try {
            window.i18n.addObserver(() => {
                try {
                    window.i18n.applyTranslations();
                    if (typeof window.i18n.translatePlaceholders === 'function') {
                        window.i18n.translatePlaceholders();
                    }
                } catch (e) { console.warn('i18n apply error', e); }
            });
            // Load user language and apply initial translations
            if (typeof window.i18n.init === 'function') {
                window.i18n.init();
            } else {
                // Fallback if init not present
                window.i18n.applyTranslations && window.i18n.applyTranslations();
            }
        } catch (e) {
            console.warn('i18n init error', e);
        }
    }
});