// Check if already logged in
if (localStorage.getItem('isLoggedIn') === 'true') {
    window.location.href = 'dashboard.html';
}

// Get form elements
const loginForm = document.getElementById('loginForm');
const identifier = document.getElementById('identifier');
const password = document.getElementById('password');
const errorMessage = document.getElementById('errorMessage');
const loginBtn = document.getElementById('loginBtn');

// Handle form submission
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

    // Simulate API call
    setTimeout(() => {
        // For demo purposes, accept any credentials
        // In real implementation, this will call the GraphQL signin endpoint
        if (usernameValue && passwordValue) {
            // Store login state
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('username', usernameValue);
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } else {
            showError('Invalid credentials. Please try again.');
            loginBtn.disabled = false;
            loginBtn.innerHTML = `
                <span>Sign In</span>
                <svg class="btn-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
            `;
        }
    }, 1000);
});

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    errorMessage.style.display = 'block';
    
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 3000);
}

// Hide error on input
identifier.addEventListener('input', () => {
    errorMessage.style.display = 'none';
});

password.addEventListener('input', () => {
    errorMessage.style.display = 'none';
});