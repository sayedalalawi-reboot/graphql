// DOM Elements
const loadingContainer = document.getElementById('loading');
const errorContainer = document.getElementById('error-container');
const errorText = document.getElementById('error-text');
const mainContent = document.getElementById('main-content');
const logoutBtn = document.getElementById('logout-btn');

// User Info Elements
const welcomeMessage = document.getElementById('welcome-message');
const userLogin = document.getElementById('user-login');
const userId = document.getElementById('user-id');
const userEmail = document.getElementById('user-email');
const emailContainer = document.getElementById('email-container');

// Stats Elements
const totalXPElement = document.getElementById('total-xp');
const totalProjectsElement = document.getElementById('total-projects');
const auditRatioElement = document.getElementById('audit-ratio');
const memberSinceElement = document.getElementById('member-since');

// Show loading state
const showLoading = () => {
    loadingContainer.classList.remove('hidden');
    errorContainer.classList.add('hidden');
    mainContent.classList.add('hidden');
};

// Show error state
const showError = (message) => {
    loadingContainer.classList.add('hidden');
    errorContainer.classList.remove('hidden');
    mainContent.classList.add('hidden');
    errorText.textContent = message;
};

// Show main content
const showContent = () => {
    loadingContainer.classList.add('hidden');
    errorContainer.classList.add('hidden');
    mainContent.classList.remove('hidden');
};

// Format number with commas
const formatNumber = (num) => {
    return num.toLocaleString();
};

// Format date
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
};

// Update user information
const updateUserInfo = (user) => {
    if (!user) return;

    welcomeMessage.textContent = `Welcome, ${user.login}!`;
    userLogin.textContent = user.login || 'N/A';
    userId.textContent = user.id || 'N/A';
    
    if (user.email) {
        userEmail.textContent = user.email;
        emailContainer.style.display = 'flex';
    } else {
        emailContainer.style.display = 'none';
    }

    memberSinceElement.textContent = formatDate(user.createdAt);
};

// Update statistics
const updateStats = (xpTransactions, projectResults, auditData) => {
    // Calculate total XP
    const totalXP = xpTransactions.reduce((sum, t) => sum + t.amount, 0);
    totalXPElement.textContent = formatNumber(totalXP);

    // Total projects
    totalProjectsElement.textContent = projectResults.length;

    // Audit ratio
    if (auditData && auditData.auditRatio !== null && auditData.auditRatio !== undefined) {
        auditRatioElement.textContent = auditData.auditRatio.toFixed(2);
    } else {
        auditRatioElement.textContent = 'N/A';
    }
};

// Handle logout
const handleLogout = () => {
    localStorage.removeItem('jwt');
    window.location.href = 'index.html';
};

// Load profile data
const loadProfileData = async () => {
    try {
        // Check authentication
        if (!checkAuthentication()) {
            return;
        }

        showLoading();

        // Fetch all data
        const data = await fetchAllUserData();

        // Update UI with user data
        updateUserInfo(data.user);
        updateStats(data.xpTransactions, data.projectResults, data.auditData);

        // Create charts
        createXPChart(data.xpTransactions);
        createPassFailChart(data.projectResults);

        // Show content
        showContent();

    } catch (error) {
        console.error('Error loading profile:', error);
        showError(error.message || 'Failed to load profile data. Please try again.');
    }
};

// Event Listeners
logoutBtn.addEventListener('click', handleLogout);

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadProfileData();
});