/**
 * Login Page Handler
 * Manages login form submission and user authentication
 */

// Prevent accessing login page if already authenticated
window.auth.redirectIfAuthenticated();

// Get form elements
const loginForm = document.getElementById('loginForm');
const identifier = document.getElementById('identifier');
const password = document.getElementById('password');
const errorMessage = document.getElementById('errorMessage');
const loginBtn = document.getElementById('loginBtn');

/**
 * Show error message
 */
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    errorMessage.style.display = 'block';

    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 5000);
}

/**
 * Reset button to normal state
 */
function resetButton() {
    loginBtn.disabled = false;
    loginBtn.innerHTML = `
        <span>Sign In</span>
        <svg class="btn-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
    `;
}

/**
 * Handle form submission
 */
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usernameValue = identifier.value.trim();
    const passwordValue = password.value.trim();

    // Validate inputs
    if (!usernameValue || !passwordValue) {
        showError('Please enter both username and password');
        return;
    }

    // Show loading state
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span>Signing in...</span>';
    errorMessage.style.display = 'none';

    try {
        // Attempt login
        await window.auth.login(usernameValue, passwordValue);

        // Success - redirect to dashboard
        console.log('✅ Redirecting to dashboard...');
        window.location.replace('dashboard.html');

    } catch (error) {
        // Show error
        console.error('Login error:', error);
        showError(error.message || 'Login failed. Please check your credentials.');
        resetButton();
    }
});

// Hide error on input
identifier.addEventListener('input', () => {
    errorMessage.style.display = 'none';
});

password.addEventListener('input', () => {
    errorMessage.style.display = 'none';
});
