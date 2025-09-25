class LoginApp {
    constructor() {
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.checkAuthStatus();
    }
    
    bindEvents() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
    }
    
    checkAuthStatus() {
        const storedUser = localStorage.getItem('deliveryAppUser');
        const storedSession = localStorage.getItem('deliveryAppSession');
        const userSession = localStorage.getItem('userSession');

        // Prefer new session structure if present and not expired
        if (userSession) {
            try {
                const sessionData = JSON.parse(userSession);
                const expiresAt = sessionData.expiresAt ? new Date(sessionData.expiresAt).getTime() : null;
                const now = Date.now();
                if (expiresAt && now > expiresAt) {
                    // Expired: clear and stay on login
                    localStorage.removeItem('userSession');
                    localStorage.removeItem('deliveryAppUser');
                    localStorage.removeItem('deliveryAppSession');
                    console.warn('Stored session expired; staying on login page');
                    return;
                }

                // Valid session: redirect
                const userType = sessionData.userType || 'driver';

                // Prevent back button navigation
                window.history.replaceState(null, null, window.location.href);
                window.addEventListener('popstate', () => {
                    window.history.pushState(null, null, window.location.href);
                });

                if (userType === 'shop') {
                    window.location.href = '/shop';
                } else {
                    window.location.href = '/app';
                }
                return;
            } catch (e) {
                console.error('Error parsing user session:', e);
                // Fall through to legacy keys check
            }
        }

        // Legacy keys fallback (no expiry info)
        if (storedUser && storedSession) {
            // Prevent back button navigation
            window.history.replaceState(null, null, window.location.href);
            window.addEventListener('popstate', () => {
                window.history.pushState(null, null, window.location.href);
            });

            window.location.href = '/app';
        }
    }
    
    async handleLogin() {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const loginType = 'driver'; // Default to driver for delivery app

        if (!email || !password) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        const submitButton = document.querySelector('.login-btn');
        const originalText = submitButton.innerHTML;
        
        // Show loading state
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
        submitButton.disabled = true;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, loginType })
            });

            const result = await response.json();
            console.log('Login response:', result);

            if (result.success) {
                // Store user data and session with proper session structure
                const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
                const sessionData = {
                    user: result.user,
                    sessionToken: result.sessionToken,
                    userType: result.userType,
                    // Persistent login: expire after 7 days on same device
                    expiresAt: new Date(Date.now() + sevenDaysMs).toISOString()
                };

                localStorage.setItem('userSession', JSON.stringify(sessionData));

                // Also store in legacy format for backward compatibility
                localStorage.setItem('deliveryAppUser', JSON.stringify(result.user));
                localStorage.setItem('deliveryAppSession', result.sessionToken);

                const userName = result.user.name || result.user.email?.split('@')[0] || 'User';
                this.showToast(`Welcome back, ${userName}!`, 'success');

                // Redirect based on user type
                setTimeout(() => {
                    if (result.redirectUrl) {
                        window.location.href = result.redirectUrl;
                    } else if (result.userType === 'driver') {
                        window.location.href = '/app';
                    } else if (result.userType === 'shop') {
                        window.location.href = '/shop';
                    } else {
                        window.location.href = '/app'; // Default to driver app
                    }
                }, 1000);

            } else {
                this.showToast(result.message || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Network error. Please try again.', 'error');
        } finally {
            // Reset button
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }
    }
    
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
        
        toast.innerHTML = `
            <div class="toast-content">
                <i class="${icon}"></i>
                <span>${message}</span>
            </div>
        `;

        container.appendChild(toast);

        // Remove toast after 4 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 4000);
    }
}

// Initialize the login app
document.addEventListener('DOMContentLoaded', () => {
    new LoginApp();
}); 