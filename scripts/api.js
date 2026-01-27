// ============================================
// GRAPHQL API MODULE
// Handles all GraphQL queries to fetch user data
// ============================================

// API Configuration
const API_CONFIG = {
    graphqlEndpoint: 'https://learn.reboot01.com/api/graphql-engine/v1/graphql'
};

// ============================================
// CORE GRAPHQL FUNCTION
// ============================================

/**
 * Execute GraphQL query
 * @param {string} query - GraphQL query string
 * @returns {Promise<object>} Query result data
 * @throws {Error} On query failure
 */
async function graphqlQuery(query) {
    const token = window.auth.getToken();
    
    if (!token) {
        throw new Error('Not authenticated. Please login.');
    }
    
    console.log('🔍 Executing GraphQL query...');
    
    try {
        const response = await fetch(API_CONFIG.graphqlEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });
        
        console.log(`📡 GraphQL response status: ${response.status}`);
        
        // Handle authentication errors
        if (response.status === 401) {
            console.error('❌ Authentication failed - token may be expired');
            window.auth.logout();
            throw new Error('Session expired. Please login again.');
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ GraphQL request failed:', errorText);
            throw new Error(`GraphQL request failed (${response.status})`);
        }
        
        const result = await response.json();
        
        // Check for GraphQL errors
        if (result.errors) {
            console.error('❌ GraphQL errors:', result.errors);
            throw new Error(result.errors[0].message || 'GraphQL query error');
        }
        
        console.log('✅ Query successful');
        return result.data;
        
    } catch (error) {
        console.error('❌ GraphQL query error:', error);
        throw error;
    }
}

// ============================================
// USER INFORMATION QUERIES
// ============================================

/**
 * Fetch basic user information
 * @returns {Promise<object>} User data
 */
async function fetchUserInfo() {
    console.log('📊 Fetching user information...');
    
    const query = `{
        user {
            id
            login
            attrs
            createdAt
        }
    }`;
    
    const data = await graphqlQuery(query);
    
    if (!data.user || data.user.length === 0) {
        throw new Error('No user data found');
    }
    
    const user = data.user[0];
    
    // Extract email from attrs if exists
    if (user.attrs && typeof user.attrs === 'object') {
        user.email = user.attrs.email || null;
    }
    
    console.log('✅ User info fetched:', user.login);
    return user;
}

// ============================================
// XP QUERIES
// ============================================

/**
 * Fetch all XP transactions
 * @returns {Promise<Array>} Array of XP transactions
 */
async function fetchXPTransactions() {
    console.log('📊 Fetching XP transactions...');
    
    const query = `{
        transaction(
            where: { 
                type: { _eq: "xp" }
                amount: { _gt: 0 }
            }
            order_by: { createdAt: asc }
        ) {
            id
            amount
            createdAt
            path
            object {
                name
            }
        }
    }`;
    
    const data = await graphqlQuery(query);
    console.log(`✅ Fetched ${data.transaction.length} XP transactions`);
    
    return data.transaction;
}

/**
 * Calculate total XP from transactions
 * @param {Array} transactions - XP transactions array
 * @returns {number} Total XP
 */
function calculateTotalXP(transactions) {
    return transactions.reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Group XP by month for timeline chart
 * @param {Array} transactions - XP transactions array
 * @returns {Array} Monthly XP data
 */
function groupXPByMonth(transactions) {
    const monthlyData = {};
    let cumulativeXP = 0;
    
    transactions.forEach(t => {
        const date = new Date(t.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        cumulativeXP += t.amount;
        monthlyData[monthKey] = cumulativeXP;
    });
    
    // Convert to array format
    return Object.entries(monthlyData).map(([date, xp]) => ({
        date,
        xp
    }));
}

// ============================================
// PROJECT QUERIES
// ============================================

/**
 * Fetch project results (progress data)
 * @returns {Promise<Array>} Array of project results
 */
async function fetchProjectResults() {
    console.log('📊 Fetching project results...');
    
    const query = `{
        progress(
            where: { 
                isDone: { _eq: true }
            }
            order_by: { updatedAt: desc }
        ) {
            id
            grade
            path
            updatedAt
            createdAt
            object {
                name
                type
            }
        }
    }`;
    
    const data = await graphqlQuery(query);
    console.log(`✅ Fetched ${data.progress.length} project results`);
    
    return data.progress;
}

/**
 * Calculate pass/fail ratio from projects
 * @param {Array} projects - Project results array
 * @returns {object} Pass/fail counts
 */
function calculatePassFailRatio(projects) {
    const passed = projects.filter(p => p.grade >= 1).length;
    const failed = projects.filter(p => p.grade === 0).length;
    
    return { passed, failed };
}

/**
 * Get recent projects (last 10)
 * @param {Array} projects - Project results array
 * @returns {Array} Recent projects with formatted data
 */
function getRecentProjects(projects) {
    return projects.slice(0, 10).map(p => ({
        id: p.id,
        name: p.object?.name || p.path.split('/').pop(),
        status: p.grade >= 1 ? 'passed' : 'failed',
        grade: p.grade,
        date: p.updatedAt,
        path: p.path
    }));
}

// ============================================
// AUDIT QUERIES
// ============================================

/**
 * Fetch audit statistics
 * @returns {Promise<object>} Audit data
 */
async function fetchAuditData() {
    console.log('📊 Fetching audit data...');
    
    const query = `{
        user {
            auditRatio
            totalUp
            totalDown
        }
    }`;
    
    const data = await graphqlQuery(query);
    
    if (!data.user || data.user.length === 0) {
        throw new Error('No audit data found');
    }
    
    const user = data.user[0];
    
    console.log('✅ Audit data fetched');
    
    return {
        auditRatio: user.auditRatio || 0,
        totalUp: user.totalUp || 0,
        totalDown: user.totalDown || 0
    };
}

/**
 * Fetch audit transactions for detailed stats
 * @returns {Promise<object>} Detailed audit statistics
 */
async function fetchAuditTransactions() {
    console.log('📊 Fetching audit transactions...');
    
    const query = `{
        auditsDone: transaction_aggregate(where: { type: { _eq: "up" } }) {
            aggregate {
                count
            }
        }
        auditsReceived: transaction_aggregate(where: { type: { _eq: "down" } }) {
            aggregate {
                count
            }
        }
    }`;
    
    const data = await graphqlQuery(query);
    
    const auditsDone = data.auditsDone?.aggregate?.count || 0;
    const auditsReceived = data.auditsReceived?.aggregate?.count || 0;
    
    console.log(`✅ Audits: ${auditsDone} done, ${auditsReceived} received`);
    
    return {
        given: auditsDone,
        received: auditsReceived
    };
}

// ============================================
// SKILLS QUERIES
// ============================================

/**
 * Fetch user skills from skill transactions
 * @returns {Promise<Array>} Array of skills with levels
 */
async function fetchSkills() {
    console.log('📊 Fetching skills data...');
    
    const query = `{
        transaction(
            where: { 
                type: { _eq: "skill_up" }
            }
            order_by: { amount: desc }
        ) {
            type
            amount
            path
        }
    }`;
    
    const data = await graphqlQuery(query);
    
    // Group skills by name and sum amounts
    const skillsMap = {};
    
    data.transaction.forEach(t => {
        const skillName = t.path.split('/').pop() || 'Unknown';
        if (!skillsMap[skillName]) {
            skillsMap[skillName] = 0;
        }
        skillsMap[skillName] += t.amount;
    });
    
    // Convert to array and calculate levels (normalize to 0-100)
    const maxSkillValue = Math.max(...Object.values(skillsMap));
    
    const skills = Object.entries(skillsMap)
        .map(([name, amount]) => ({
            name,
            level: Math.round((amount / maxSkillValue) * 100),
            xp: amount
        }))
        .sort((a, b) => b.level - a.level)
        .slice(0, 8); // Top 8 skills
    
    console.log(`✅ Fetched ${skills.length} skills`);
    
    return skills;
}

// ============================================
// COMBINED DATA FETCH
// ============================================

/**
 * Fetch all user data at once
 * @returns {Promise<object>} Complete user data
 */
async function fetchAllUserData() {
    console.log('🚀 Fetching all user data...');
    
    try {
        // Fetch all data in parallel
        const [
            user,
            xpTransactions,
            projectResults,
            auditData,
            auditTransactions,
            skills
        ] = await Promise.all([
            fetchUserInfo(),
            fetchXPTransactions(),
            fetchProjectResults(),
            fetchAuditData(),
            fetchAuditTransactions(),
            fetchSkills()
        ]);
        
        // Process data
        const totalXP = calculateTotalXP(xpTransactions);
        const xpProgress = groupXPByMonth(xpTransactions);
        const passFailRatio = calculatePassFailRatio(projectResults);
        const recentProjects = getRecentProjects(projectResults);
        
        console.log('✅ All data fetched successfully!');
        console.log('📊 Stats:', {
            totalXP,
            projects: projectResults.length,
            auditRatio: auditData.auditRatio
        });
        
        return {
            user,
            totalXP,
            projectsDone: projectResults.length,
            auditRatio: auditData.auditRatio,
            xpProgress,
            passFailRatio,
            skills,
            recentProjects,
            auditStats: auditTransactions
        };
        
    } catch (error) {
        console.error('❌ Error fetching user data:', error);
        throw error;
    }
}

// ============================================
// EXPORT FOR USE IN OTHER MODULES
// ============================================

window.api = {
    fetchAllUserData,
    fetchUserInfo,
    fetchXPTransactions,
    fetchProjectResults,
    fetchAuditData,
    fetchSkills
};