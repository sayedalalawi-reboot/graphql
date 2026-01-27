/**
 * GraphQL API Module
 * Handles all GraphQL queries and data fetching for the dashboard
 */

const GRAPHQL_API_URL = 'https://learn.reboot01.com/api/graphql-engine/v1/graphql';

/**
 * Execute a GraphQL query
 * @param {string} query - GraphQL query string
 * @returns {Promise<object>} Query result data
 */
async function executeQuery(query) {
    const token = window.auth.getToken();

    if (!token) {
        throw new Error('No authentication token found');
    }

    const response = await fetch(GRAPHQL_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
    });

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            // Token invalid, logout
            window.auth.logout();
            throw new Error('Authentication failed');
        }
        throw new Error(`GraphQL request failed: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
        console.error('GraphQL errors:', result.errors);
        throw new Error('GraphQL query failed: ' + result.errors[0].message);
    }

    return result.data;
}

/**
 * Fetch user information
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

    const data = await executeQuery(query);
    const user = data.user[0];

    return {
        id: user.id,
        login: user.login,
        email: user.attrs?.email || 'N/A',
        createdAt: user.createdAt
    };
}

/**
 * Fetch XP transactions
 */
async function fetchXPTransactions() {
    console.log('📊 Fetching XP transactions...');

    const query = `{
        transaction(
            where: { 
                type: { _eq: "xp" }
                amount: { _gt: 0 }
                eventId: { _eq: 763 }
            }
            order_by: { createdAt: asc }
        ) {
            amount
            createdAt
            path
        }
    }`;

    const data = await executeQuery(query);
    return data.transaction;
}

/**
 * Process XP transactions into progress data
 */
function processXPData(transactions) {
    const monthlyXP = {};
    let totalXP = 0;
    let previousMonthXP = 0;
    let currentMonthXP = 0;

    transactions.forEach(tx => {
        totalXP += tx.amount;
        const date = new Date(tx.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        // Store cumulative XP for this month
        monthlyXP[monthKey] = totalXP;
    });

    // Convert to array format
    const xpProgress = Object.keys(monthlyXP)
        .sort()
        .map(date => ({
            date,
            xp: monthlyXP[date]
        }));

    // Calculate XP growth from previous month
    if (xpProgress.length >= 2) {
        currentMonthXP = xpProgress[xpProgress.length - 1].xp;
        previousMonthXP = xpProgress[xpProgress.length - 2].xp;
    } else if (xpProgress.length === 1) {
        currentMonthXP = xpProgress[0].xp;
        previousMonthXP = 0;
    }

    const xpGrowth = previousMonthXP > 0
        ? ((currentMonthXP - previousMonthXP) / previousMonthXP * 100).toFixed(1)
        : 0;

    return { totalXP, xpProgress, xpGrowth };
}

/**
 * Fetch project results
 */
async function fetchProjects() {
    console.log('📊 Fetching project results...');

    const query = `{
        progress(
            where: { 
                isDone: { _eq: true }
                eventId: { _eq: 763 }
            }
            order_by: { updatedAt: desc }
        ) {
            id
            grade
            path
            updatedAt
            object {
                name
            }
        }
    }`;

    const data = await executeQuery(query);
    return data.progress;
}

/**
 * Fetch XP for specific projects by path
 */
async function fetchProjectXP(paths) {
    if (!paths || paths.length === 0) return {};

    // Create a map to store XP by path
    const xpMap = {};

    // Fetch XP transactions for these specific paths
    const pathConditions = paths.map(p => `{ path: { _eq: "${p}" } }`).join(', ');

    const query = `{
        transaction(
            where: {
                type: { _eq: "xp" }
                eventId: { _eq: 763 }
                _or: [${pathConditions}]
            }
        ) {
            path
            amount
        }
    }`;

    try {
        const data = await executeQuery(query);
        // Sum XP for each path
        data.transaction.forEach(tx => {
            if (!xpMap[tx.path]) {
                xpMap[tx.path] = 0;
            }
            xpMap[tx.path] += tx.amount;
        });
    } catch (e) {
        console.warn('Could not fetch project XP:', e);
    }

    return xpMap;
}

/**
 * Process project data
 */
async function processProjects(projects, projectXPMap) {
    const projectsDone = projects.length;

    let passed = 0;
    let failed = 0;

    const recentProjects = projects.slice(0, 10).map(project => {
        const status = project.grade >= 1 ? 'passed' : 'failed';

        if (status === 'passed') passed++;
        else failed++;

        // Get XP for this project
        const xp = projectXPMap[project.path] || 0;

        return {
            id: project.id,
            name: project.object?.name || 'Unknown Project',
            status: status,
            grade: project.grade,
            xp: xp,  // Include XP amount
            date: project.updatedAt,
            path: project.path
        };
    });

    // Count all projects for pass/fail ratio
    projects.forEach(project => {
        const status = project.grade >= 1 ? 'passed' : 'failed';
        if (status === 'passed' && !recentProjects.find(p => p.id === project.id)) {
            passed++;
        } else if (status === 'failed' && !recentProjects.find(p => p.id === project.id)) {
            failed++;
        }
    });

    const successRate = projectsDone > 0 ? ((passed / projectsDone) * 100).toFixed(0) : 0;

    return {
        projectsDone,
        passFailRatio: {
            passed: passed,
            failed: failed
        },
        recentProjects,
        successRate
    };
}

/**
 * Fetch audit ratio
 */
async function fetchAuditRatio() {
    console.log('📊 Fetching audit ratio...');

    // Try to get audit ratio directly from user
    try {
        const query = `{
            user {
                auditRatio
                totalUp
                totalDown
            }
        }`;

        const data = await executeQuery(query);
        const user = data.user[0];

        if (user.auditRatio !== undefined) {
            return {
                auditRatio: user.auditRatio,
                given: Math.round(user.totalUp / 1000), // Approximate count
                received: Math.round(user.totalDown / 1000)
            };
        }
    } catch (e) {
        console.log('Fallback to transaction-based audit calculation');
    }

    // Fallback: calculate from transactions
    const query = `{
        upTransactions: transaction_aggregate(where: { type: { _eq: "up" } }) {
            aggregate {
                sum { amount }
                count
            }
        }
        downTransactions: transaction_aggregate(where: { type: { _eq: "down" } }) {
            aggregate {
                sum { amount }
                count
            }
        }
    }`;

    const data = await executeQuery(query);

    const totalUp = data.upTransactions.aggregate.sum?.amount || 0;
    const totalDown = data.downTransactions.aggregate.sum?.amount || 0;
    const given = data.upTransactions.aggregate.count || 0;
    const received = data.downTransactions.aggregate.count || 0;

    const auditRatio = totalDown > 0 ? totalUp / totalDown : 0;

    return {
        auditRatio: parseFloat(auditRatio.toFixed(2)),
        given,
        received
    };
}

/**
 * Fetch skills data
 */
async function fetchSkills() {
    console.log('📊 Fetching skills...');

    const query = `{
        transaction(
            where: { 
                type: { _regex: "^skill_" }
                eventId: { _eq: 763 }
            }
        ) {
            amount
            type
        }
    }`;

    const data = await executeQuery(query);
    return data.transaction;
}

/**
 * Process skills data
 */
function processSkills(transactions) {
    const skillMap = {};

    transactions.forEach(tx => {
        // Extract skill name from type (e.g., "skill_go" -> "Go")
        let skillName = tx.type.replace('skill_', '');

        // Clean up skill name
        skillName = skillName.replace(/_/g, ' ');

        // Map common skill names - separate Technologies from Technical Skills
        const skillNameMap = {
            // Technologies (programming languages & tools)
            'go': 'Go',
            'js': 'JavaScript',
            'html': 'HTML',
            'css': 'CSS',
            'sql': 'SQL',
            'unix': 'Unix',
            'docker': 'Docker',
            // Technical Skills (concepts & disciplines)
            'frontend': 'Frontend',
            'backend': 'Backend',
            'front end': 'Frontend',
            'back end': 'Backend',
            'algo': 'Algorithms',
            'algorithms': 'Algorithms',
            'prog': 'Programming',
            'programming': 'Programming',
            'sys admin': 'Sys-admin',
            'sysadmin': 'Sys-admin',
            'script': 'Script'
        };

        const skillKey = skillName.toLowerCase();
        skillName = skillNameMap[skillKey] || skillName
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        if (!skillMap[skillName]) {
            skillMap[skillName] = 0;
        }

        skillMap[skillName] += tx.amount;
    });

    // Convert to array and sort by XP
    const skills = Object.entries(skillMap)
        .map(([name, xp]) => ({ name, xp }))
        .sort((a, b) => b.xp - a.xp);

    // Calculate total for percentage
    const totalAmount = skills.reduce((sum, skill) => sum + skill.xp, 0);

    return skills.slice(0, 8).map(skill => ({
        name: skill.name,
        level: totalAmount > 0 ? Math.round((skill.xp / totalAmount) * 100) : 0,
        xp: skill.xp
    }));
}

/**
 * Fetch all user data
 * This is the main function called by the dashboard
 */
async function fetchAllUserData() {
    console.log('🚀 Starting data fetch...');

    try {
        // Fetch all data in parallel
        const [
            user,
            xpTransactions,
            projects,
            auditData,
            skillsData
        ] = await Promise.all([
            fetchUserInfo(),
            fetchXPTransactions(),
            fetchProjects(),
            fetchAuditRatio(),
            fetchSkills()
        ]);

        // Fetch XP for recent projects
        const projectPaths = projects.slice(0, 10).map(p => p.path);
        const projectXPMap = await fetchProjectXP(projectPaths);

        // Process data
        const { totalXP, xpProgress, xpGrowth } = processXPData(xpTransactions);
        const { projectsDone, passFailRatio, recentProjects, successRate } = await processProjects(projects, projectXPMap);
        const skills = processSkills(skillsData);

        const result = {
            user,
            totalXP,
            projectsDone,
            auditRatio: auditData.auditRatio,
            xpProgress,
            xpGrowth,
            passFailRatio,
            skills,
            recentProjects,
            successRate,
            auditStats: {
                given: auditData.given,
                received: auditData.received
            }
        };

        console.log('✅ All data fetched successfully!');
        console.log('📊 Data summary:', {
            totalXP,
            projectsDone,
            auditRatio: auditData.auditRatio,
            skills: skills.length
        });

        return result;

    } catch (error) {
        console.error('❌ Failed to fetch data:', error);
        throw error;
    }
}

// Export via window object
window.api = {
    fetchAllUserData
};
