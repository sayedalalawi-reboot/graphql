// API Endpoints
const API_AUTH = 'https://learn.reboot01.com/api/auth/signin';

// DOM Elements
const identifierInput = document.getElementById('identifier');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const errorMessage = document.getElementById('error-message');

// Check if already logged in
const checkAuth = () => {
    const jwt = localStorage.getItem('jwt');
    if (jwt) {
        // Verify JWT is valid before redirecting
        try {
            // Basic JWT validation - should have 3 parts separated by dots
            const parts = jwt.split('.');
            if (parts.length === 3) {
                window.location.href = 'profile.html';
            } else {
                // Invalid JWT, clear it
                localStorage.removeItem('jwt');
            }
        } catch (e) {
            localStorage.removeItem('jwt');
        }
    }
};

// Show error message
const showError = (message) => {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
};

// Hide error message
const hideError = () => {
    errorMessage.textContent = '';
    errorMessage.classList.add('hidden');
};

// Handle login
const handleLogin = async () => {
    const identifier = identifierInput.value.trim();
    const password = passwordInput.value.trim();

    // Validation
    if (!identifier || !password) {
        showError('Please enter both username/email and password');
        return;
    }

    // Disable button and show loading
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';
    hideError();

    try {
        // Encode credentials in base64
        const credentials = btoa(`${identifier}:${password}`);

        // Make API request
        const response = await fetch(API_AUTH, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error('Invalid credentials. Please check your username/email and password.');
            }
            throw new Error(`Authentication failed with status: ${response.status}`);
        }

        // Get the raw response text first
        const responseText = await response.text();
        
        console.log('Raw response:', responseText);
        
        // Clean the JWT token
        let jwt = responseText.trim();
        
        // Remove any quotes if present (sometimes APIs return "token" instead of token)
        if (jwt.startsWith('"') && jwt.endsWith('"')) {
            jwt = jwt.slice(1, -1);
        }
        
        // Remove any JSON wrapper if present
        try {
            const parsed = JSON.parse(responseText);
            if (typeof parsed === 'string') {
                jwt = parsed.trim();
            } else if (parsed.token) {
                jwt = parsed.token.trim();
            } else if (parsed.jwt) {
                jwt = parsed.jwt.trim();
            }
        } catch (e) {
            // Not JSON, use the trimmed text
            jwt = responseText.trim();
        }

        // Validate JWT format (should have 3 parts: header.payload.signature)
        const parts = jwt.split('.');
        if (parts.length !== 3) {
            console.error('Invalid JWT format. Parts:', parts.length);
            console.error('JWT:', jwt);
            throw new Error('Invalid token format received from server');
        }

        // Additional validation: check if each part is valid base64
        try {
            parts.forEach((part, index) => {
                // Replace URL-safe base64 characters
                const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
                // Try to decode
                atob(base64);
            });
        } catch (e) {
            console.error('JWT contains invalid base64:', e);
            throw new Error('Token contains invalid characters');
        }

        // Store JWT in localStorage
        localStorage.setItem('jwt', jwt);

        console.log('✅ Login successful!');
        console.log('JWT stored:', jwt.substring(0, 20) + '...');

        // Redirect to profile page
        window.location.href = 'profile.html';

    } catch (error) {
        console.error('Login error:', error);
        showError(error.message);
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
    }
};

// Event Listeners
loginBtn.addEventListener('click', handleLogin);

// Allow Enter key to submit
identifierInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleLogin();
    }
});

passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleLogin();
    }
});

// Clear error on input
identifierInput.addEventListener('input', hideError);
passwordInput.addEventListener('input', hideError);

// Check auth on page load
checkAuth();