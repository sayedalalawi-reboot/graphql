// API Endpoint
const API_GRAPHQL = 'https://learn.reboot01.com/api/graphql-engine/v1/graphql';

// Get JWT from localStorage
const getJWT = () => {
    const jwt = localStorage.getItem('jwt');
    if (!jwt) {
        console.error('No JWT found in localStorage');
        return null;
    }
    
    // Clean and validate JWT
    const cleanJWT = jwt.trim();
    
    // Validate JWT format
    const parts = cleanJWT.split('.');
    if (parts.length !== 3) {
        console.error('Invalid JWT format. Expected 3 parts, got:', parts.length);
        console.error('JWT:', cleanJWT);
        localStorage.removeItem('jwt');
        return null;
    }
    
    console.log('✅ JWT loaded successfully');
    return cleanJWT;
};

// Check if user is authenticated
const checkAuthentication = () => {
    const jwt = getJWT();
    if (!jwt) {
        console.log('No valid JWT found, redirecting to login...');
        window.location.href = 'index.html';
        return false;
    }
    return true;
};

// Generic GraphQL query function
const graphqlQuery = async (query) => {
    const jwt = getJWT();
    
    if (!jwt) {
        throw new Error('Not authenticated');
    }

    console.log('🔍 Making GraphQL query...');
    console.log('Query:', query.substring(0, 100) + '...');

    try {
        const response = await fetch(API_GRAPHQL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwt}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error:', errorText);
            
            if (response.status === 401) {
                // Token expired or invalid
                console.error('Authentication failed - clearing JWT');
                localStorage.removeItem('jwt');
                window.location.href = 'index.html';
                throw new Error('Session expired. Please login again.');
            }
            throw new Error(`GraphQL request failed with status ${response.status}`);
        }

        const result = await response.json();
        
        console.log('GraphQL response:', result);
        
        if (result.errors) {
            console.error('GraphQL errors:', result.errors);
            throw new Error(result.errors[0].message);
        }

        console.log('✅ Query successful');
        return result.data;
    } catch (error) {
        console.error('GraphQL Error:', error);
        throw error;
    }
};

// Fetch user information
const fetchUserInfo = async () => {
    console.log('📊 Fetching user info...');
    const query = `{
        user {
            id
            login
            attrs
            createdAt
        }
    }`;
    
    const data = await graphqlQuery(query);
    console.log('User data received:', data);
    
    const user = data.user[0];
    
    // Extract email from attrs if it exists
    if (user && user.attrs && typeof user.attrs === 'object') {
        user.email = user.attrs.email || null;
    }
    
    return user;
};

// Fetch XP transactions
const fetchXPTransactions = async () => {
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
    console.log('XP transactions received:', data.transaction.length);
    return data.transaction;
};

// Fetch project results (with nested object query)
const fetchProjectResults = async () => {
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
            object {
                name
                type
            }
        }
    }`;
    
    const data = await graphqlQuery(query);
    console.log('Project results received:', data.progress.length);
    return data.progress;
};

// Fetch audit ratio
const fetchAuditRatio = async () => {
    console.log('📊 Fetching audit ratio...');
    const query = `{
        transaction_aggregate(where: { type: { _eq: "up" } }) {
            aggregate {
                sum {
                    amount
                }
            }
        }
        downTransactions: transaction_aggregate(where: { type: { _eq: "down" } }) {
            aggregate {
                sum {
                    amount
                }
            }
        }
    }`;
    
    const data = await graphqlQuery(query);
    const totalUp = data.transaction_aggregate?.aggregate?.sum?.amount || 0;
    const totalDown = data.downTransactions?.aggregate?.sum?.amount || 0;
    
    const auditRatio = totalDown > 0 ? totalUp / totalDown : 0;
    
    console.log('Audit ratio calculated:', auditRatio);
    
    return {
        auditRatio: auditRatio,
        totalUp: totalUp,
        totalDown: totalDown
    };
};

// Fetch progress data
const fetchProgress = async () => {
    console.log('📊 Fetching progress...');
    const query = `{
        progress(order_by: { createdAt: desc }, limit: 50) {
            id
            grade
            path
            createdAt
            updatedAt
        }
    }`;
    
    const data = await graphqlQuery(query);
    return data.progress;
};

// Fetch specific object by ID (query with arguments)
const fetchObjectById = async (objectId) => {
    console.log('📊 Fetching object by ID:', objectId);
    const query = `{
        object(where: { id: { _eq: ${objectId} } }) {
            id
            name
            type
            attrs
        }
    }`;
    
    const data = await graphqlQuery(query);
    return data.object[0];
};

// Fetch user skills
const fetchUserSkills = async () => {
    console.log('📊 Fetching user skills...');
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
            object {
                name
                type
            }
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
    
    // Convert to array and sort by amount
    const skills = Object.entries(skillsMap)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);
    
    console.log('Skills received:', skills.length);
    return skills;
};

// Fetch all user data at once
const fetchAllUserData = async () => {
    console.log('🚀 Fetching all user data...');
    try {
        const [user, xpTransactions, projectResults, auditData, skills] = await Promise.all([
            fetchUserInfo(),
            fetchXPTransactions(),
            fetchProjectResults(),
            fetchAuditRatio(),
            fetchUserSkills()
        ]);

        console.log('✅ All data fetched successfully');

        return {
            user,
            xpTransactions,
            projectResults,
            auditData,
            skills
        };
    } catch (error) {
        console.error('❌ Error fetching user data:', error);
        throw error;
    }
};