const TokenManager = {
    warningShown: false,
    expirationTimeout: null,
    countdownInterval: null,
    
    isTokenExpired() {
        const token = localStorage.getItem('access_token');
        
        if (!token) return true;
        
        try {
            const decoded = JSON.parse(atob(token.split('.')[1]));
            const expirationTime = decoded.exp * 1000;
            return Date.now() > expirationTime;
        } catch (error) {
            console.error('Invalid token format:', error);
            return true;
        }
    },
    
    getTimeUntilExpiration() {
        const token = localStorage.getItem('access_token');
        
        if (!token) return 0;
        
        try {
            const decoded = JSON.parse(atob(token.split('.')[1]));
            const expirationTime = decoded.exp * 1000;
            const timeRemaining = expirationTime - Date.now();
            return Math.max(0, timeRemaining);
        } catch (error) {
            return 0;
        }
    },
    
    checkTokenValidity() {
        if (this.isTokenExpired()) {
            this.logout();
            return false;
        }
        return true;
    },
    
    setupExpirationWarning() {
        // Clear any existing timeouts
        if (this.expirationTimeout) clearTimeout(this.expirationTimeout);
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        
        const timeRemaining = this.getTimeUntilExpiration();
        const warningTime = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        if (timeRemaining <= 0) {
            this.logout();
            return;
        }
        
        // Set timeout to show warning when 5 minutes remain
        const timeUntilWarning = timeRemaining - warningTime;
        
        if (timeUntilWarning > 0) {
            this.expirationTimeout = setTimeout(() => {
                this.showExpirationWarning();
            }, timeUntilWarning);
        } else {
            // Less than 5 minutes remaining, show warning immediately
            this.showExpirationWarning();
        }
    },
    
    showExpirationWarning() {
        if (this.warningShown) return; // Prevent duplicate warnings
        
        this.warningShown = true;
        const overlay = document.getElementById('token-warning-overlay');
        overlay.classList.remove('hidden');
        
        // Start countdown timer
        this.startCountdown();
    },
    
    startCountdown() {
        const countdownElement = document.getElementById('warning-countdown');
        
        const updateCountdown = () => {
            const timeRemaining = this.getTimeUntilExpiration();
            
            if (timeRemaining <= 0) {
                clearInterval(this.countdownInterval);
                this.logout();
                return;
            }
            
            const minutes = Math.floor(timeRemaining / 60000);
            const seconds = Math.floor((timeRemaining % 60000) / 1000);
            countdownElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        };
        
        updateCountdown(); // Initial update
        this.countdownInterval = setInterval(updateCountdown, 1000);
    },
    
    dismissWarning() {
        const overlay = document.getElementById('token-warning-overlay');
        overlay.classList.add('hidden');
        this.warningShown = false;
        
        // Re-setup warning for next check
        this.setupExpirationWarning();
    },
    
    refreshSession() {
        fetch('/auth/api/refresh', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('refresh_token')
                }
            })
            .then(response => response.json())
            .then(data => {
                localStorage.setItem('access_token', data.access_token);
                this.dismissWarning();
                this.setupExpirationWarning();
            })
            .catch(error => {
                console.error('Failed to refresh token:', error);
                this.logout();
            });
    },
    
    logout() {
        if (this.expirationTimeout) clearTimeout(this.expirationTimeout);
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/auth/login';
    }
};

// Setup event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('dismiss-warning').addEventListener('click', () => {
        TokenManager.dismissWarning();
    });
    
    document.getElementById('refresh-session').addEventListener('click', () => {
        TokenManager.refreshSession();
    });
    
    // Close modal when clicking outside
    document.getElementById('token-warning-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'token-warning-overlay') {
            TokenManager.dismissWarning();
        }
    });
    
    // Initialize token checking
    if (TokenManager.checkTokenValidity()) {
        TokenManager.setupExpirationWarning();
    }
});
