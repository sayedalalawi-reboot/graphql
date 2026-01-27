/**
 * Dashboard Page
 * Loads and displays user data from GraphQL API
 */

// Require authentication
window.auth.requireAuth();

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
    await loadDashboard();

    // Setup logout handler
    document.getElementById('logoutBtn').addEventListener('click', () => {
        window.auth.logout();
    });
});

/**
 * Load dashboard data
 */
async function loadDashboard() {
    try {
        console.log('📊 Loading dashboard data...');

        // Show loading state
        document.getElementById('userName').textContent = 'Loading...';

        // Fetch all user data from GraphQL API
        const data = await window.api.fetchAllUserData();

        // Update all UI components
        updateNavbar(data);
        updateStats(data);
        updateUserInfo(data);
        updateAuditStats(data);

        // Create charts
        createXPChart(data.xpProgress);
        createPassFailChart(data.passFailRatio);
        // createSkillsChart(data.skills);  // Commented out - technical skills graph disabled

        // Load recent projects
        loadRecentProjects(data);

        // Add smooth scroll animations
        initializeAnimations();

        console.log('✅ Dashboard loaded successfully!');

    } catch (error) {
        console.error('❌ Failed to load dashboard:', error);

        // Show error to user
        const userName = document.getElementById('userName');
        if (userName) {
            userName.textContent = 'Error loading data';
        }

        // If authentication error, logout will happen automatically
        // Otherwise show error message
        alert('Failed to load dashboard data. Please try again.');
    }
}

/**
 * Update navbar with user name
 */
function updateNavbar(data) {
    document.getElementById('userName').textContent = data.user.login;
}

/**
 * Update statistics cards with real stat changes
 */
function updateStats(data) {
    // Update values
    document.getElementById('totalXP').textContent = formatNumber(data.totalXP);
    document.getElementById('projectsDone').textContent = data.projectsDone;
    document.getElementById('auditRatio').textContent = data.auditRatio.toFixed(2);

    // Update stat-change labels with real data
    const xpChangeElem = document.querySelector('.stat-card.stat-primary .stat-change');
    if (xpChangeElem && data.xpGrowth) {
        const growth = parseFloat(data.xpGrowth);
        if (growth > 0) {
            xpChangeElem.textContent = `+${growth}% from last month`;
            xpChangeElem.className = 'stat-change positive';
        } else if (growth < 0) {
            xpChangeElem.textContent = `${growth}% from last month`;
            xpChangeElem.className = 'stat-change negative';
        } else {
            xpChangeElem.textContent = 'No change from last month';
            xpChangeElem.className = 'stat-change neutral';
        }
    }

    // Update success rate
    const successRateElem = document.querySelector('.stat-card.stat-success .stat-change');
    if (successRateElem && data.successRate !== undefined) {
        successRateElem.textContent = `${data.successRate}% success rate`;
        successRateElem.className = 'stat-change positive';
    }

    // Update audit ratio description
    const auditChangeElem = document.querySelector('.stat-card.stat-warning .stat-change');
    if (auditChangeElem) {
        const ratio = data.auditRatio;
        if (ratio >= 0.9 && ratio <= 1.1) {
            auditChangeElem.textContent = 'Balanced performance';
            auditChangeElem.className = 'stat-change neutral';
        } else if (ratio > 1.1) {
            auditChangeElem.textContent = 'Above average performance';
            auditChangeElem.className = 'stat-change positive';
        } else {
            auditChangeElem.textContent = 'Below average performance';
            auditChangeElem.className = 'stat-change negative';
        }
    }
}

/**
 * Update user information section
 */
function updateUserInfo(data) {
    document.getElementById('userLogin').textContent = data.user.login;
    document.getElementById('userId').textContent = data.user.id;
    document.getElementById('userEmail').textContent = data.user.email;
    document.getElementById('memberSince').textContent = formatDate(data.user.createdAt);
}

/**
 * Update audit statistics section with units
 */
function updateAuditStats(data) {
    const { given, received } = data.auditStats;
    const total = given + received;

    // Format with raw numbers (no units) as requested
    document.getElementById('auditsDone').textContent = formatNumber(given);
    document.getElementById('auditsReceived').textContent = formatNumber(received);

    // Calculate percentages
    const donePercent = total > 0 ? (given / total) * 100 : 0;
    const receivedPercent = total > 0 ? (received / total) * 100 : 0;

    // Update bar widths with animation
    setTimeout(() => {
        document.getElementById('auditBarDone').style.width = `${donePercent}%`;
        document.getElementById('auditBarReceived').style.width = `${receivedPercent}%`;

        // Update labels
        document.getElementById('auditDonePercent').textContent = `${donePercent.toFixed(1)}%`;
        document.getElementById('auditReceivedPercent').textContent = `${receivedPercent.toFixed(1)}%`;
    }, 100);
}

/**
 * Load recent projects list with XP in KB format
 */
function loadRecentProjects(data) {
    const projectsList = document.getElementById('projectsList');

    const projectsHTML = data.recentProjects.map(project => `
        <div class="project-item ${project.status}">
            <div class="project-info">
                <h4>${project.name}</h4>
                <p>${project.path} • ${formatDate(project.date)}</p>
            </div>
            <div class="project-status">
                <span class="status-badge ${project.status}">
                    ${project.status.toUpperCase()}
                </span>
                <span class="project-grade">${formatBytes(project.xp)}</span>
            </div>
        </div>
    `).join('');

    projectsList.innerHTML = projectsHTML;
}

/**
 * Initialize smooth scroll animations
 */
function initializeAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateY(20px)';

                setTimeout(() => {
                    entry.target.style.transition = 'all 0.5s ease';
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 100);

                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all sections
    document.querySelectorAll('.stat-card, .info-card, .chart-card, .project-item').forEach(el => {
        observer.observe(el);
    });
}

/**
 * Helper function to format bytes with units
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 KB';

    const k = 1000;
    const kb = bytes / k;

    if (kb < 1000) {
        return kb.toFixed(1) + ' KB';
    } else if (kb < 1000000) {
        return (kb / 1000).toFixed(1) + ' MB';
    } else {
        return (kb / 1000000).toFixed(1) + ' GB';
    }
}

/**
 * Helper function to format date
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Helper function to format number
 */
function formatNumber(num) {
    return num.toLocaleString();
}