// Mock User Data
const MOCK_DATA = {
    user: {
        id: 12345,
        login: "johndoe",
        email: "john.doe@student.com",
        createdAt: "2023-01-15T10:30:00Z"
    },

    totalXP: 125750,
    projectsDone: 42,
    auditRatio: 1.35,

    xpProgress: [
        { date: "2023-01", xp: 5200 },
        { date: "2023-02", xp: 8500 },
        { date: "2023-03", xp: 12300 },
        { date: "2023-04", xp: 15800 },
        { date: "2023-05", xp: 21400 },
        { date: "2023-06", xp: 28900 },
        { date: "2023-07", xp: 35200 },
        { date: "2023-08", xp: 42700 },
        { date: "2023-09", xp: 51300 },
        { date: "2023-10", xp: 62100 },
        { date: "2023-11", xp: 75400 },
        { date: "2023-12", xp: 89200 },
        { date: "2024-01", xp: 103500 },
        { date: "2024-02", xp: 115900 },
        { date: "2024-03", xp: 125750 }
    ],

    passFailRatio: {
        passed: 36,
        failed: 6
    },

    skills: [
        { name: "JavaScript", level: 85, xp: 12400 },
        { name: "Go", level: 78, xp: 10200 },
        { name: "SQL", level: 72, xp: 8900 },
        { name: "Docker", level: 68, xp: 7500 },
        { name: "Git", level: 82, xp: 11100 },
        { name: "Linux", level: 75, xp: 9300 },
        { name: "HTML/CSS", level: 90, xp: 13800 },
        { name: "Algorithms", level: 70, xp: 8100 }
    ],

    recentProjects: [
        {
            id: 1,
            name: "graphql",
            status: "passed",
            grade: 1,
            xp: 1500,
            date: "2024-03-15",
            path: "/bahrain/graphql"
        },
        {
            id: 2,
            name: "ascii-art-web",
            status: "passed",
            grade: 1,
            xp: 2200,
            date: "2024-03-10",
            path: "/bahrain/ascii-art-web"
        },
        {
            id: 3,
            name: "groupie-tracker",
            status: "passed",
            grade: 1,
            xp: 1800,
            date: "2024-03-05",
            path: "/bahrain/groupie-tracker"
        },
        {
            id: 4,
            name: "forum",
            status: "passed",
            grade: 1,
            xp: 2500,
            date: "2024-02-28",
            path: "/bahrain/forum"
        },
        {
            id: 5,
            name: "make-your-game",
            status: "failed",
            grade: 0,
            xp: 0,
            date: "2024-02-20",
            path: "/bahrain/make-your-game"
        },
        {
            id: 6,
            name: "net-cat",
            status: "passed",
            grade: 1,
            xp: 1900,
            date: "2024-02-15",
            path: "/bahrain/net-cat"
        }
    ],

    auditStats: {
        given: 45,
        received: 38,
        totalXPGiven: 52300,
        totalXPReceived: 38700
    }
};

// Helper function to get mock data
function getMockData() {
    return MOCK_DATA;
}

// Helper function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Helper function to format number
function formatNumber(num) {
    return num.toLocaleString();
}