/**
 * Authentication Module
 * Handles JWT authentication for the GraphQL Profile application
 */

const AUTH_API_URL = 'https://learn.reboot01.com/api/auth/signin';
const TOKEN_KEY = 'jwt';

/**
 * Clean JWT token from various formats
 * Handles plain string, quoted string, and JSON wrapped formats
 */
function cleanToken(token) {
    if (!token) return null;
    
    // Remove whitespace
    token = token.trim();
    
    // Try to parse as JSON if it looks like JSON
    if (token.startsWith('{')) {
        try {
            const parsed = JSON.parse(token);
            token = parsed.token || parsed.jwt || token;
        } catch (e) {
            // Not JSON, continue
        }
    }
    
    // Remove quotes
    if (token.startsWith('"') && token.endsWith('"')) {
        token = token.slice(1, -1);
    }
    
    return token;
}

/**
 * Validate JWT token format
 * A valid JWT has 3 parts separated by dots
 */
function validateToken(token) {
    if (!token) return false;
    
    const parts = token.split('.');
    return parts.length === 3;
}

/**
 * Login with username and password
 * Uses Basic Authentication
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<string>} JWT token
 */
async function login(username, password) {
    console.log('🔐 Attempting login...');
    
    try {
        // Encode credentials in Base64
        const credentials = btoa(`${username}:${password}`);
        
        const response = await fetch(AUTH_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Invalid username or password');
            }
            throw new Error(`Authentication failed: ${response.status}`);
        }
        
        // Get token from response (can be plain text or JSON)
        const text = await response.text();
        let token = cleanToken(text);
        
        if (!validateToken(token)) {
            throw new Error('Invalid token format received');
        }
        
        // Store token
        localStorage.setItem(TOKEN_KEY, token);
        
        console.log('✅ Login successful!');
        return token;
        
    } catch (error) {
        console.error('❌ Login failed:', error.message);
        throw error;
    }
}

/**
 * Logout user
 * Clears token and redirects to login page
 */
function logout() {
    console.log('🔓 Logging out...');
    localStorage.removeItem(TOKEN_KEY);
    window.location.replace('index.html');
}

/**
 * Get stored JWT token
 * @returns {string|null} JWT token or null if not found
 */
function getToken() {
    const token = localStorage.getItem(TOKEN_KEY);
    return token ? cleanToken(token) : null;
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if valid token exists
 */
function isAuthenticated() {
    const token = getToken();
    return validateToken(token);
}

/**
 * Require authentication
 * Redirects to login page if not authenticated
 */
function requireAuth() {
    if (!isAuthenticated()) {
        console.log('⚠️ Authentication required, redirecting to login...');
        window.location.replace('index.html');
    }
}

/**
 * Redirect if already authenticated
 * Used on login page to prevent accessing it when already logged in
 */
function redirectIfAuthenticated() {
    if (isAuthenticated()) {
        console.log('ℹ️ Already authenticated, redirecting to dashboard...');
        window.location.replace('dashboard.html');
    }
}

// Export functions via window object
window.auth = {
    login,
    logout,
    getToken,
    isAuthenticated,
    requireAuth,
    redirectIfAuthenticated
};
