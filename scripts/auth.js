// ============================================
// AUTHENTICATION MODULE
// Handles login, logout, and JWT management
// ============================================

// API Configuration
const AUTH_CONFIG = {
    domain: 'learn.reboot01.com',
    signinEndpoint: 'https://learn.reboot01.com/api/auth/signin'
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Encode credentials to Base64 for Basic Authentication
 * @param {string} identifier - Username or email
 * @param {string} password - User password
 * @returns {string} Base64 encoded credentials
 */
function encodeCredentials(identifier, password) {
    return btoa(`${identifier}:${password}`);
}

/**
 * Validate JWT format
 * @param {string} token - JWT token to validate
 * @returns {boolean} True if valid format
 */
function isValidJWT(token) {
    if (!token || typeof token !== 'string') {
        return false;
    }
    
    const parts = token.trim().split('.');
    return parts.length === 3;
}

/**
 * Decode JWT payload (without verification)
 * @param {string} token - JWT token
 * @returns {object|null} Decoded payload or null if invalid
 */
function decodeJWT(token) {
    try {
        if (!isValidJWT(token)) {
            return null;
        }
        
        const parts = token.split('.');
        const payload = parts[1];
        
        // Decode base64
        const decoded = atob(payload);
        return JSON.parse(decoded);
    } catch (error) {
        console.error('Error decoding JWT:', error);
        return null;
    }
}

/**
 * Clean JWT token (remove quotes, whitespace, JSON wrapping)
 * @param {string} rawToken - Raw token from API
 * @returns {string} Cleaned token
 */
function cleanJWT(rawToken) {
    let token = rawToken.trim();
    
    // Remove surrounding quotes if present
    if (token.startsWith('"') && token.endsWith('"')) {
        token = token.slice(1, -1);
    }
    
    // Try to parse as JSON in case it's wrapped
    try {
        const parsed = JSON.parse(rawToken);
        if (typeof parsed === 'string') {
            token = parsed.trim();
        } else if (parsed.token) {
            token = parsed.token.trim();
        } else if (parsed.jwt) {
            token = parsed.jwt.trim();
        }
    } catch (e) {
        // Not JSON, use trimmed token
    }
    
    return token;
}

// ============================================
// STORAGE FUNCTIONS
// ============================================

/**
 * Store JWT token in localStorage
 * @param {string} token - JWT token to store
 */
function storeToken(token) {
    localStorage.setItem('jwt', token);
    console.log('✅ Token stored successfully');
}

/**
 * Get JWT token from localStorage
 * @returns {string|null} JWT token or null
 */
function getToken() {
    const token = localStorage.getItem('jwt');
    
    if (!token) {
        console.warn('⚠️ No token found in localStorage');
        return null;
    }
    
    if (!isValidJWT(token)) {
        console.error('❌ Invalid token format in storage');
        clearToken();
        return null;
    }
    
    return token;
}

/**
 * Clear JWT token from localStorage
 */
function clearToken() {
    localStorage.removeItem('jwt');
    console.log('🗑️ Token cleared from storage');
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if valid token exists
 */
function isAuthenticated() {
    const token = getToken();
    return token !== null;
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Login user with credentials
 * @param {string} identifier - Username or email
 * @param {string} password - User password
 * @returns {Promise<string>} JWT token on success
 * @throws {Error} On authentication failure
 */
async function login(identifier, password) {
    console.log('🔐 Attempting login...');
    
    // Validate inputs
    if (!identifier || !password) {
        throw new Error('Username/email and password are required');
    }
    
    // Encode credentials
    const credentials = encodeCredentials(identifier, password);
    
    try {
        // Make request to signin endpoint
        const response = await fetch(AUTH_CONFIG.signinEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`
            }
        });
        
        console.log(`📡 Response status: ${response.status}`);
        
        // Handle different response statuses
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Invalid credentials. Please check your username/email and password.');
            } else if (response.status === 403) {
                throw new Error('Access forbidden. Please verify your credentials.');
            } else if (response.status === 404) {
                throw new Error('Authentication endpoint not found. Please check the domain.');
            } else {
                const errorText = await response.text();
                throw new Error(`Authentication failed (${response.status}): ${errorText}`);
            }
        }
        
        // Get response text
        const rawToken = await response.text();
        console.log('📥 Received token from server');
        
        // Clean the token
        const token = cleanJWT(rawToken);
        
        // Validate token format
        if (!isValidJWT(token)) {
            console.error('❌ Invalid token format received');
            console.error('Token:', token.substring(0, 50) + '...');
            throw new Error('Received invalid token from server');
        }
        
        // Decode and log token info
        const decoded = decodeJWT(token);
        if (decoded) {
            console.log('✅ Token decoded successfully');
            console.log('User ID:', decoded.sub || decoded.userId || 'Unknown');
        }
        
        // Store token
        storeToken(token);
        
        console.log('✅ Login successful!');
        return token;
        
    } catch (error) {
        console.error('❌ Login error:', error);
        
        // Handle network errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Network error. Please check your connection and API domain.');
        }
        
        throw error;
    }
}

/**
 * Logout user
 */
function logout() {
    console.log('👋 Logging out...');
    clearToken();
    window.location.href = 'index.html';
}

/**
 * Check authentication and redirect if not logged in
 * Call this at the start of protected pages
 */
function requireAuth() {
    const token = localStorage.getItem('jwt');
    
    if (!token) {
        console.warn('⚠️ No token found, redirecting to login');
        window.location.replace('index.html');
        return false;
    }
    
    if (!isValidJWT(token)) {
        console.error('❌ Invalid token format, redirecting to login');
        clearToken();
        window.location.replace('index.html');
        return false;
    }
    
    console.log('✅ User authenticated');
    return true;
}

/**
 * Check if already logged in and redirect to dashboard
 * Call this on login page
 */
function redirectIfAuthenticated() {
    const token = localStorage.getItem('jwt');
    
    // Only redirect if token exists and is valid format
    if (token && isValidJWT(token)) {
        console.log('✅ User already authenticated, redirecting to dashboard');
        // Use replace to avoid back button issues
        window.location.replace('dashboard.html');
    } else if (token && !isValidJWT(token)) {
        // Clear invalid token
        console.warn('⚠️ Invalid token found, clearing...');
        clearToken();
    }
}

// ============================================
// EXPORT FOR USE IN OTHER MODULES
// ============================================

// Make functions available globally
window.auth = {
    login,
    logout,
    getToken,
    isAuthenticated,
    requireAuth,
    redirectIfAuthenticated,
    decodeJWT
};