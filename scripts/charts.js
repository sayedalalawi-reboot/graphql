// XP Progress Chart (Line/Area Chart)
const createXPChart = (transactions) => {
    const container = document.getElementById('xp-chart');
    
    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">No XP data available</p>';
        return;
    }

    // Sort transactions by date
    const sortedTransactions = [...transactions].sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
    );

    // Chart dimensions
    const width = 600;
    const height = 300;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Calculate max XP for scaling
    const maxXP = Math.max(...sortedTransactions.map(t => t.amount));

    // Create points
    const points = sortedTransactions.map((t, i) => ({
        x: padding.left + (i / (sortedTransactions.length - 1)) * chartWidth,
        y: padding.top + chartHeight - (t.amount / maxXP) * chartHeight,
        amount: t.amount,
        date: new Date(t.createdAt).toLocaleDateString(),
        path: t.path
    }));

    // Create path data for line
    const pathData = points.map((p, i) => 
        `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ');

    // Create path data for area
    const areaData = `${pathData} L ${points[points.length - 1].x} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;

    // Create SVG
    let svg = `
        <svg viewBox="0 0 ${width} ${height}" style="width: 100%; max-width: 100%;">
            <defs>
                <linearGradient id="xpGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#6366f1" stop-opacity="0.4" />
                    <stop offset="100%" stop-color="#6366f1" stop-opacity="0.05" />
                </linearGradient>
            </defs>
    `;

    // Grid lines
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight / 4) * i;
        svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e5e7eb" stroke-width="1" />`;
        
        // Y-axis labels
        const value = Math.round(maxXP - (maxXP / 4) * i);
        svg += `<text x="${padding.left - 10}" y="${y + 5}" text-anchor="end" font-size="12" fill="#6b7280">${value}</text>`;
    }

    // Area
    svg += `<path d="${areaData}" fill="url(#xpGradient)" />`;

    // Line
    svg += `<path d="${pathData}" fill="none" stroke="#6366f1" stroke-width="3" />`;

    // Points
    points.forEach((p, i) => {
        svg += `
            <circle 
                cx="${p.x}" 
                cy="${p.y}" 
                r="4" 
                fill="#6366f1"
                class="chart-point"
                data-index="${i}"
                style="cursor: pointer; transition: r 0.2s;"
                onmouseenter="this.setAttribute('r', '6')"
                onmouseleave="this.setAttribute('r', '4')"
            />
            <title>${p.amount} XP - ${p.date}</title>
        `;
    });

    // Axis labels
    svg += `
        <text x="${width / 2}" y="${height - 5}" text-anchor="middle" font-size="12" fill="#6b7280" font-weight="600">Timeline</text>
        <text x="15" y="${height / 2}" text-anchor="middle" font-size="12" fill="#6b7280" font-weight="600" transform="rotate(-90, 15, ${height / 2})">XP Amount</text>
    `;

    svg += '</svg>';
    container.innerHTML = svg;
};

// Pass/Fail Ratio Chart (Donut Chart)
const createPassFailChart = (results) => {
    const container = document.getElementById('passfail-chart');
    
    if (!results || results.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">No project data available</p>';
        return;
    }

    // Calculate pass/fail
    const passed = results.filter(r => r.grade >= 1).length;
    const failed = results.filter(r => r.grade === 0).length;
    const total = passed + failed;

    if (total === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">No graded projects</p>';
        return;
    }

    const passPercentage = (passed / total) * 100;
    const failPercentage = (failed / total) * 100;

    // Chart dimensions
    const size = 300;
    const center = size / 2;
    const radius = 100;
    const innerRadius = 60;

    // Helper function to convert polar to cartesian
    const polarToCartesian = (cx, cy, r, angle) => {
        const rad = (angle - 90) * Math.PI / 180;
        return {
            x: cx + r * Math.cos(rad),
            y: cy + r * Math.sin(rad)
        };
    };

    // Helper function to create arc path
    const createArc = (startAngle, endAngle, outerR, innerR) => {
        const start = polarToCartesian(center, center, outerR, endAngle);
        const end = polarToCartesian(center, center, outerR, startAngle);
        const innerStart = polarToCartesian(center, center, innerR, endAngle);
        const innerEnd = polarToCartesian(center, center, innerR, startAngle);
        const largeArc = endAngle - startAngle <= 180 ? '0' : '1';

        return `M ${start.x} ${start.y} A ${outerR} ${outerR} 0 ${largeArc} 0 ${end.x} ${end.y} L ${innerEnd.x} ${innerEnd.y} A ${innerR} ${innerR} 0 ${largeArc} 1 ${innerStart.x} ${innerStart.y} Z`;
    };

    const passAngle = (passPercentage / 100) * 360;

    // Create SVG
    let svg = `
        <div style="display: flex; flex-direction: column; align-items: center;">
            <svg viewBox="0 0 ${size} ${size}" style="width: 100%; max-width: 20rem;">
                <!-- Pass segment -->
                <path 
                    d="${createArc(0, passAngle, radius, innerRadius)}" 
                    fill="#10b981"
                    style="cursor: pointer; transition: all 0.2s;"
                    onmouseenter="this.setAttribute('d', '${createArc(0, passAngle, radius + 5, innerRadius)}')"
                    onmouseleave="this.setAttribute('d', '${createArc(0, passAngle, radius, innerRadius)}')"
                >
                    <title>Passed: ${passed} (${passPercentage.toFixed(1)}%)</title>
                </path>
                
                <!-- Fail segment -->
                <path 
                    d="${createArc(passAngle, 360, radius, innerRadius)}" 
                    fill="#ef4444"
                    style="cursor: pointer; transition: all 0.2s;"
                    onmouseenter="this.setAttribute('d', '${createArc(passAngle, 360, radius + 5, innerRadius)}')"
                    onmouseleave="this.setAttribute('d', '${createArc(passAngle, 360, radius, innerRadius)}')"
                >
                    <title>Failed: ${failed} (${failPercentage.toFixed(1)}%)</title>
                </path>

                <!-- Center text -->
                <text x="${center}" y="${center - 10}" text-anchor="middle" font-size="32" font-weight="bold" fill="#1f2937">
                    ${passPercentage.toFixed(0)}%
                </text>
                <text x="${center}" y="${center + 15}" text-anchor="middle" font-size="14" fill="#6b7280">
                    Success Rate
                </text>
            </svg>

            <div style="margin-top: 1.5rem; width: 100%; display: flex; flex-direction: column; gap: 0.75rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background-color: #d1fae5; border-radius: 0.5rem;">
                    <div style="display: flex; align-items: center;">
                        <div style="width: 1rem; height: 1rem; background-color: #10b981; border-radius: 0.25rem; margin-right: 0.75rem;"></div>
                        <span style="color: #374151; font-weight: 500;">Passed</span>
                    </div>
                    <span style="color: #111827; font-weight: 700;">${passed} (${passPercentage.toFixed(1)}%)</span>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background-color: #fee; border-radius: 0.5rem;">
                    <div style="display: flex; align-items: center;">
                        <div style="width: 1rem; height: 1rem; background-color: #ef4444; border-radius: 0.25rem; margin-right: 0.75rem;"></div>
                        <span style="color: #374151; font-weight: 500;">Failed</span>
                    </div>
                    <span style="color: #111827; font-weight: 700;">${failed} (${failPercentage.toFixed(1)}%)</span>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = svg;
};