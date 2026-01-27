// ============================================
// LOGIN PAGE HANDLER
// Manages login form and user interaction
// ============================================

// Check if already logged in - only if auth module is loaded
if (window.auth) {
    window.auth.redirectIfAuthenticated();
}

// Get DOM elements
const loginForm = document.getElementById('loginForm');
const identifierInput = document.getElementById('identifier');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('errorMessage');
const loginBtn = loginForm.querySelector('button[type="submit"]');

// ============================================
// UI FUNCTIONS
// ============================================

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    errorMessage.style.display = 'block';
}

/**
 * Hide error message
 */
function hideError() {
    errorMessage.classList.remove('show');
    errorMessage.style.display = 'none';
}

/**
 * Set loading state on login button
 * @param {boolean} loading - True to show loading state
 */
function setLoading(loading) {
    if (loading) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span>Signing in...</span>';
    } else {
        loginBtn.disabled = false;
        loginBtn.innerHTML = `
            <span>Sign In</span>
            <svg class="btn-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
        `;
    }
}

// ============================================
// EVENT HANDLERS
// ============================================

/**
 * Handle form submission
 */
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const identifier = identifierInput.value.trim();
    const password = passwordInput.value.trim();
    
    // Validate inputs
    if (!identifier || !password) {
        showError('Please enter both username/email and password');
        return;
    }
    
    // Hide previous errors
    hideError();
    
    // Set loading state
    setLoading(true);
    
    try {
        // Attempt login
        await window.auth.login(identifier, password);
        
        // Success! Redirect to dashboard
        console.log('✅ Redirecting to dashboard...');
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        // Show error to user
        console.error('Login failed:', error);
        showError(error.message || 'Login failed. Please try again.');
        setLoading(false);
    }
});

/**
 * Hide error when user starts typing
 */
identifierInput.addEventListener('input', hideError);
passwordInput.addEventListener('input', hideError);

/**
 * Allow Enter key in password field
 */
identifierInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        passwordInput.focus();
    }
});

// ============================================
// INITIALIZATION
// ============================================

console.log('🔐 Login page ready');
console.log('📍 API Domain:', 'learn.reboot01.com');