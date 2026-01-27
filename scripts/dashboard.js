// Check authentication
if (localStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = 'index.html';
}

// Get username
const username = localStorage.getItem('username') || 'User';

// Load mock data
const data = getMockData();

// Update page on load
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
});

// Logout handler
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    window.location.href = 'index.html';
});

// Load dashboard data
function loadDashboard() {
    // Update navbar
    document.getElementById('userName').textContent = data.user.login;

    // Update stats
    updateStats();

    // Update user info
    updateUserInfo();

    // Update audit statistics
    updateAuditStats();

    // Create charts
    createXPChart(data.xpProgress);
    createPassFailChart(data.passFailRatio);
    createSkillsChart(data.skills);

    // Load recent projects
    loadRecentProjects();
}

// Update statistics cards
function updateStats() {
    document.getElementById('totalXP').textContent = formatNumber(data.totalXP);
    document.getElementById('projectsDone').textContent = data.projectsDone;
    document.getElementById('auditRatio').textContent = data.auditRatio.toFixed(2);
}

// Update user information
function updateUserInfo() {
    document.getElementById('userLogin').textContent = data.user.login;
    document.getElementById('userId').textContent = data.user.id;
    document.getElementById('userEmail').textContent = data.user.email;
    document.getElementById('memberSince').textContent = formatDate(data.user.createdAt);
}

// Update audit statistics
function updateAuditStats() {
    const { given, received } = data.auditStats;
    const total = given + received;
    
    // Update numbers
    document.getElementById('auditsDone').textContent = given;
    document.getElementById('auditsReceived').textContent = received;
    
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

// Load recent projects
function loadRecentProjects() {
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
                <span class="project-grade">${formatNumber(project.xp)} XP</span>
            </div>
        </div>
    `).join('');

    projectsList.innerHTML = projectsHTML;
}

// Add smooth scroll animations
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