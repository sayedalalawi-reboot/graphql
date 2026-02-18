// XP Progress Timeline Chart
function createXPChart(data) {
    const container = document.getElementById('xpChart');
    if (!container || !data || data.length === 0) return;

    const width = 600;
    const height = 300;
    const padding = { top: 20, right: 30, bottom: 50, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Find max XP for scaling
    const maxXP = Math.max(...data.map(d => d.xp));
    const minXP = 0;

    // Create points for the line
    const points = data.map((d, i) => {
        const x = padding.left + (i / (data.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - ((d.xp - minXP) / (maxXP - minXP)) * chartHeight;
        return { x, y, xp: d.xp, date: d.date };
    });

    // Create path data
    const pathData = points.map((p, i) =>
        `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ');

    // Create area path
    const areaPath = `${pathData} L ${points[points.length - 1].x} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;

    let svg = `
        <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto;">
            <defs>
                <linearGradient id="xpGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#667eea" stop-opacity="0.3" />
                    <stop offset="100%" stop-color="#667eea" stop-opacity="0.05" />
                </linearGradient>
            </defs>
    `;

    // Grid lines
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        const value = Math.round(maxXP - (maxXP / 5) * i);

        svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#373737" stroke-width="2"/>`;
        svg += `<text x="${padding.left - 10}" y="${y + 5}" text-anchor="end" font-family="VT323" font-size="16" fill="#ffffff">${(value / 1000).toFixed(0)}k</text>`;
    }

    // Area under the line
    svg += `<path d="${areaPath}" fill="#78A7FF20"/>`;

    // Line
    svg += `<path d="${pathData}" fill="none" stroke="#78A7FF" stroke-width="4"/>`;

    // Points
    points.forEach((p, i) => {
        svg += `
            <circle cx="${p.x}" cy="${p.y}" r="5" fill="#667eea" stroke="white" stroke-width="2" style="cursor: pointer;">
                <title>${p.date}: ${formatNumber(p.xp)} XP</title>
            </circle>
        `;
    });

    // X-axis labels (every 3 months)
    data.forEach((d, i) => {
        if (i % 3 === 0) {
            const x = padding.left + (i / (data.length - 1)) * chartWidth;
            svg += `<text x="${x}" y="${height - 20}" text-anchor="middle" font-family="VT323" font-size="14" fill="#ffffff">${d.date}</text>`;
        }
    });

    // Axis labels
    svg += `<text x="${width / 2}" y="${height - 5}" text-anchor="middle" font-family="VT323" font-size="18" fill="#ffffff" font-weight="700">Timeline</text>`;
    svg += `<text x="20" y="${height / 2}" text-anchor="middle" font-family="VT323" font-size="18" fill="#ffffff" font-weight="700" transform="rotate(-90, 20, ${height / 2})">XP</text>`;

    svg += '</svg>';
    container.innerHTML = svg;
}

// Pass/Fail Ratio Donut Chart
function createPassFailChart(data) {
    const container = document.getElementById('passFailChart');
    if (!container || !data) return;

    const { passed, failed } = data;
    const total = passed + failed;
    if (total === 0) return;

    const size = 300;
    const center = size / 2;
    const radius = 100;
    const innerRadius = 65;

    const passPercentage = (passed / total) * 100;
    const passAngle = (passPercentage / 100) * 360;

    // Helper to convert polar to cartesian
    const polarToCartesian = (cx, cy, r, angle) => {
        const rad = (angle - 90) * Math.PI / 180;
        return {
            x: cx + r * Math.cos(rad),
            y: cy + r * Math.sin(rad)
        };
    };

    // Create arc path
    const createArc = (startAngle, endAngle, outerR, innerR) => {
        // Fix for 360 degree arcs (which SVG doesn't render if start/end are identical)
        if (endAngle - startAngle >= 360) {
            endAngle = startAngle + 359.99;
        }

        const start = polarToCartesian(center, center, outerR, endAngle);
        const end = polarToCartesian(center, center, outerR, startAngle);
        const innerStart = polarToCartesian(center, center, innerR, endAngle);
        const innerEnd = polarToCartesian(center, center, innerR, startAngle);
        const largeArc = endAngle - startAngle <= 180 ? '0' : '1';

        return `M ${start.x} ${start.y} A ${outerR} ${outerR} 0 ${largeArc} 0 ${end.x} ${end.y} L ${innerEnd.x} ${innerEnd.y} A ${innerR} ${innerR} 0 ${largeArc} 1 ${innerStart.x} ${innerStart.y} Z`;
    };

    let svg = `
        <svg viewBox="0 0 ${size} ${size}" style="width: 100%; max-width: 300px; margin: 0 auto; display: block;">
            <!-- Pass segment -->
            <path d="${createArc(0, passAngle, radius, innerRadius)}" fill="#10b981">
                <title>Passed: ${passed} (${passPercentage.toFixed(1)}%)</title>
            </path>
            
            <!-- Fail segment -->
            <path d="${createArc(passAngle, 360, radius, innerRadius)}" fill="#ef4444">
                <title>Failed: ${failed} (${((failed / total) * 100).toFixed(1)}%)</title>
            </path>

            <!-- Center text -->
            <text x="${center}" y="${center - 10}" text-anchor="middle" font-family="VT323" font-size="48" font-weight="bold" fill="#ffffff">
                ${passPercentage.toFixed(0)}%
            </text>
            <text x="${center}" y="${center + 20}" text-anchor="middle" font-family="VT323" font-size="20" fill="#ffffff">
                Success Rate
            </text>
        </svg>

        <div style="margin-top: 1.5rem; display: flex; justify-content: center; gap: 2rem;">
            <div style="text-align: center;">
                <div style="font-size: 1.5rem; font-weight: 700; color: #10b981;">${passed}</div>
                <div style="font-size: 0.875rem; color: #6b7280;">Passed</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 1.5rem; font-weight: 700; color: #ef4444;">${failed}</div>
                <div style="font-size: 0.875rem; color: #6b7280;">Failed</div>
            </div>
        </div>
    `;

    container.innerHTML = svg;
}