// Reports page JavaScript
let reportPeriod = 30;
let charts = {};

// Initialize reports page
document.addEventListener('DOMContentLoaded', function() {
    loadReports();
    setupAutoRefresh();
});

// Load all reports data
async function loadReports() {
    try {
        showLoadingState();
        
        // Load data in parallel
        const [
            kpiData,
            ticketTrends,
            statusDistribution,
            priorityData,
            agentPerformance,
            customerActivity,
            responseTime,
            categoryData,
            workloadData,
            topAgents,
            recurringIssues
        ] = await Promise.all([
            loadKPIData(),
            loadTicketTrends(),
            loadStatusDistribution(),
            loadPriorityAnalysis(),
            loadAgentPerformance(),
            loadCustomerActivity(),
            loadResponseTime(),
            loadCategoryAnalysis(),
            loadWorkloadData(),
            loadTopAgents(),
            loadRecurringIssues()
        ]);

        // Update KPIs
        updateKPICards(kpiData);
        
        // Create charts
        createTicketTrendsChart(ticketTrends);
        createStatusDistributionChart(statusDistribution);
        createPriorityAnalysisChart(priorityData);
        createAgentPerformanceChart(agentPerformance);
        createCustomerActivityChart(customerActivity);
        createResponseTimeChart(responseTime);
        createCategoryAnalysisChart(categoryData);
        createWorkloadHeatmap(workloadData);
        
        // Update tables
        updateTopAgentsTable(topAgents);
        updateRecurringIssuesTable(recurringIssues);
        
        hideLoadingState();
    } catch (error) {
        console.error('Error loading reports:', error);
        showError('Errore nel caricamento dei report');
    }
}

// Load KPI data
async function loadKPIData() {
    try {
        const response = await fetch(`/api/reports/kpi?period=${reportPeriod}`);
        if (!response.ok) {
            // Return mock data if API doesn't exist yet
            return {
                avgResolutionTime: '2.5 ore',
                resolutionTrend: '+15%',
                customerSatisfaction: '4.8/5',
                satisfactionTrend: '+5%',
                firstContactResolution: '78%',
                fcrTrend: '+12%',
                ticketVolume: '1,247',
                volumeTrend: '+23%'
            };
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading KPI data:', error);
        // Return mock data
        return {
            avgResolutionTime: '2.5 ore',
            resolutionTrend: '+15%',
            customerSatisfaction: '4.8/5',
            satisfactionTrend: '+5%',
            firstContactResolution: '78%',
            fcrTrend: '+12%',
            ticketVolume: '1,247',
            volumeTrend: '+23%'
        };
    }
}

// Load ticket trends data
async function loadTicketTrends() {
    try {
        const response = await fetch(`/api/reports/ticket-trends?period=${reportPeriod}`);
        if (!response.ok) {
            // Generate mock data
            return generateMockTicketTrends();
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading ticket trends:', error);
        return generateMockTicketTrends();
    }
}

// Generate mock ticket trends data
function generateMockTicketTrends() {
    const days = reportPeriod;
    const labels = [];
    const created = [];
    const resolved = [];
    const inProgress = [];
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('it-IT', { month: 'short', day: 'numeric' }));
        
        // Generate realistic data with some variance
        const baseCreated = Math.floor(Math.random() * 20) + 10;
        const baseResolved = Math.floor(baseCreated * (0.7 + Math.random() * 0.3));
        const baseInProgress = Math.floor(Math.random() * 15) + 5;
        
        created.push(baseCreated);
        resolved.push(baseResolved);
        inProgress.push(baseInProgress);
    }
    
    return { labels, created, resolved, inProgress };
}

// Load other data functions (similar pattern)
async function loadStatusDistribution() {
    return {
        labels: ['Aperto', 'In Corso', 'In Attesa', 'Risolto', 'Chiuso'],
        data: [45, 78, 23, 156, 234],
        colors: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#a8e6cf']
    };
}

async function loadPriorityAnalysis() {
    return {
        labels: ['Bassa', 'Media', 'Alta', 'Urgente'],
        data: [125, 234, 89, 34],
        colors: ['#95e1d3', '#ffe66d', '#ffb347', '#ff6b6b']
    };
}

async function loadAgentPerformance() {
    return {
        labels: ['Mario Rossi', 'Anna Verdi', 'Luca Blu', 'Sara Neri', 'Paolo Bianchi'],
        resolved: [45, 67, 34, 56, 42],
        avgTime: [2.3, 1.8, 3.1, 2.1, 2.7],
        rating: [4.8, 4.9, 4.5, 4.7, 4.6]
    };
}

async function loadCustomerActivity() {
    return {
        labels: ['Nuovi Clienti', 'Clienti Ricorrenti', 'Clienti VIP'],
        data: [156, 342, 67],
        colors: ['#4ecdc4', '#45b7d1', '#96ceb4']
    };
}

async function loadResponseTime() {
    const labels = [];
    const data = [];
    
    for (let i = 23; i >= 0; i--) {
        labels.push(`${23-i}:00`);
        // Simulate response times with peaks during business hours
        const hour = 23 - i;
        let responseTime;
        if (hour >= 9 && hour <= 17) {
            responseTime = Math.random() * 30 + 15; // 15-45 minutes during business hours
        } else {
            responseTime = Math.random() * 120 + 60; // 1-3 hours outside business hours
        }
        data.push(Math.round(responseTime));
    }
    
    return { labels, data };
}

async function loadCategoryAnalysis() {
    return {
        software: {
            labels: ['Danea EasyFatt', 'Danea Clienti', 'Gestionale Custom', 'Altro'],
            data: [145, 89, 67, 34]
        },
        type: {
            labels: ['Problema Tecnico', 'Installazione', 'Configurazione', 'Formazione', 'Teleassistenza'],
            data: [123, 78, 56, 34, 67]
        },
        group: {
            labels: ['Supporto Tecnico', 'Assistenza Commerciale', 'Amministrazione', 'Sviluppo'],
            data: [234, 78, 45, 23]
        }
    };
}

async function loadWorkloadData() {
    const days = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    const hours = [];
    for (let i = 0; i < 24; i++) {
        hours.push(`${i.toString().padStart(2, '0')}:00`);
    }
    
    const data = [];
    for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
            let value = 0;
            // Simulate realistic workload patterns
            if (d < 5) { // Weekdays
                if (h >= 8 && h <= 18) {
                    value = Math.floor(Math.random() * 10) + 5;
                } else {
                    value = Math.floor(Math.random() * 3);
                }
            } else { // Weekends
                if (h >= 10 && h <= 16) {
                    value = Math.floor(Math.random() * 5) + 1;
                } else {
                    value = Math.floor(Math.random() * 2);
                }
            }
            data.push({
                x: h,
                y: d,
                v: value
            });
        }
    }
    
    return { days, hours, data };
}

async function loadTopAgents() {
    return [
        { name: 'Anna Verdi', resolved: 67, avgTime: '1.8h', rating: 4.9, efficiency: 95 },
        { name: 'Sara Neri', resolved: 56, avgTime: '2.1h', rating: 4.7, efficiency: 88 },
        { name: 'Mario Rossi', resolved: 45, avgTime: '2.3h', rating: 4.8, efficiency: 85 },
        { name: 'Paolo Bianchi', resolved: 42, avgTime: '2.7h', rating: 4.6, efficiency: 78 },
        { name: 'Luca Blu', resolved: 34, avgTime: '3.1h', rating: 4.5, efficiency: 72 }
    ];
}

async function loadRecurringIssues() {
    return [
        { issue: 'Errore di connessione database', occurrences: 23, avgTime: '45min', impact: 'Alto', trend: '+15%' },
        { issue: 'Problema sincronizzazione dati', occurrences: 18, avgTime: '1.2h', impact: 'Medio', trend: '-5%' },
        { issue: 'Errore stampa fatture', occurrences: 15, avgTime: '30min', impact: 'Basso', trend: '+8%' },
        { issue: 'Lentezza sistema', occurrences: 12, avgTime: '2.1h', impact: 'Alto', trend: '-12%' },
        { issue: 'Configurazione email', occurrences: 10, avgTime: '25min', impact: 'Basso', trend: 'Stabile' }
    ];
}

// Update KPI cards
function updateKPICards(data) {
    document.getElementById('avgResolutionTime').textContent = data.avgResolutionTime;
    document.getElementById('resolutionTrend').textContent = data.resolutionTrend;
    document.getElementById('resolutionTrend').className = 'trend ' + (data.resolutionTrend.includes('+') ? 'positive' : 'negative');
    
    document.getElementById('customerSatisfaction').textContent = data.customerSatisfaction;
    document.getElementById('satisfactionTrend').textContent = data.satisfactionTrend;
    document.getElementById('satisfactionTrend').className = 'trend ' + (data.satisfactionTrend.includes('+') ? 'positive' : 'negative');
    
    document.getElementById('firstContactResolution').textContent = data.firstContactResolution;
    document.getElementById('fcrTrend').textContent = data.fcrTrend;
    document.getElementById('fcrTrend').className = 'trend ' + (data.fcrTrend.includes('+') ? 'positive' : 'negative');
    
    document.getElementById('ticketVolume').textContent = data.ticketVolume;
    document.getElementById('volumeTrend').textContent = data.volumeTrend;
    document.getElementById('volumeTrend').className = 'trend ' + (data.volumeTrend.includes('+') ? 'positive' : 'negative');
}

// Create ticket trends chart
function createTicketTrendsChart(data) {
    const ctx = document.getElementById('ticketTrendsChart').getContext('2d');
    
    if (charts.ticketTrends) {
        charts.ticketTrends.destroy();
    }
    
    charts.ticketTrends = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Ticket Creati',
                    data: data.created,
                    borderColor: '#4ecdc4',
                    backgroundColor: 'rgba(78, 205, 196, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Ticket Risolti',
                    data: data.resolved,
                    borderColor: '#95e1d3',
                    backgroundColor: 'rgba(149, 225, 211, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'In Corso',
                    data: data.inProgress,
                    borderColor: '#ffe66d',
                    backgroundColor: 'rgba(255, 230, 109, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Data'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Numero Ticket'
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

// Create status distribution chart
function createStatusDistributionChart(data) {
    const ctx = document.getElementById('statusDistributionChart').getContext('2d');
    
    if (charts.statusDistribution) {
        charts.statusDistribution.destroy();
    }
    
    charts.statusDistribution = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.data,
                backgroundColor: data.colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed * 100) / total).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Create priority analysis chart
function createPriorityAnalysisChart(data) {
    const ctx = document.getElementById('priorityAnalysisChart').getContext('2d');
    
    if (charts.priorityAnalysis) {
        charts.priorityAnalysis.destroy();
    }
    
    charts.priorityAnalysis = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Numero Ticket',
                data: data.data,
                backgroundColor: data.colors,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Numero Ticket'
                    }
                }
            }
        }
    });
}

// Create agent performance chart
function createAgentPerformanceChart(data) {
    const ctx = document.getElementById('agentPerformanceChart').getContext('2d');
    
    if (charts.agentPerformance) {
        charts.agentPerformance.destroy();
    }
    
    charts.agentPerformance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Ticket Risolti',
                data: data.resolved,
                backgroundColor: 'rgba(78, 205, 196, 0.8)',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Numero Ticket'
                    }
                }
            }
        }
    });
}

// Create customer activity chart
function createCustomerActivityChart(data) {
    const ctx = document.getElementById('customerActivityChart').getContext('2d');
    
    if (charts.customerActivity) {
        charts.customerActivity.destroy();
    }
    
    charts.customerActivity = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.data,
                backgroundColor: data.colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Create response time chart
function createResponseTimeChart(data) {
    const ctx = document.getElementById('responseTimeChart').getContext('2d');
    
    if (charts.responseTime) {
        charts.responseTime.destroy();
    }
    
    charts.responseTime = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Tempo di Risposta (min)',
                data: data.data,
                borderColor: '#ff6b6b',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Minuti'
                    }
                }
            }
        }
    });
}

// Create category analysis chart
function createCategoryAnalysisChart(data) {
    const ctx = document.getElementById('categoryAnalysisChart').getContext('2d');
    const categoryType = document.getElementById('categoryType').value;
    const categoryData = data[categoryType];
    
    if (charts.categoryAnalysis) {
        charts.categoryAnalysis.destroy();
    }
    
    charts.categoryAnalysis = new Chart(ctx, {
        type: 'horizontalBar',
        data: {
            labels: categoryData.labels,
            datasets: [{
                label: 'Numero Ticket',
                data: categoryData.data,
                backgroundColor: [
                    'rgba(78, 205, 196, 0.8)',
                    'rgba(255, 230, 109, 0.8)',
                    'rgba(255, 179, 71, 0.8)',
                    'rgba(255, 107, 107, 0.8)',
                    'rgba(149, 225, 211, 0.8)'
                ],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Numero Ticket'
                    }
                }
            }
        }
    });
}

// Create workload heatmap
function createWorkloadHeatmap(data) {
    const container = document.getElementById('workloadHeatmap');
    container.innerHTML = '';
    
    // Create heatmap table
    const table = document.createElement('table');
    table.className = 'heatmap-table';
    
    // Header row with hours
    const headerRow = document.createElement('tr');
    headerRow.appendChild(document.createElement('th')); // Empty corner cell
    
    data.hours.forEach(hour => {
        const th = document.createElement('th');
        th.textContent = hour;
        th.className = 'hour-header';
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);
    
    // Data rows for each day
    data.days.forEach((day, dayIndex) => {
        const row = document.createElement('tr');
        
        // Day label
        const dayCell = document.createElement('th');
        dayCell.textContent = day;
        dayCell.className = 'day-header';
        row.appendChild(dayCell);
        
        // Hour cells
        for (let hour = 0; hour < 24; hour++) {
            const cell = document.createElement('td');
            const dataPoint = data.data.find(d => d.x === hour && d.y === dayIndex);
            const value = dataPoint ? dataPoint.v : 0;
            
            cell.className = 'heatmap-cell';
            cell.style.backgroundColor = getHeatmapColor(value);
            cell.title = `${day} ${data.hours[hour]}: ${value} ticket`;
            cell.textContent = value > 0 ? value : '';
            
            row.appendChild(cell);
        }
        
        table.appendChild(row);
    });
    
    container.appendChild(table);
}

// Get heatmap color based on value
function getHeatmapColor(value) {
    if (value === 0) return 'rgba(0, 0, 0, 0.05)';
    if (value <= 2) return 'rgba(78, 205, 196, 0.3)';
    if (value <= 5) return 'rgba(78, 205, 196, 0.6)';
    if (value <= 8) return 'rgba(78, 205, 196, 0.8)';
    return 'rgba(78, 205, 196, 1)';
}

// Update tables
function updateTopAgentsTable(data) {
    const tbody = document.getElementById('topAgentsTableBody');
    tbody.innerHTML = '';
    
    data.forEach(agent => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${agent.name}</td>
            <td>${agent.resolved}</td>
            <td>${agent.avgTime}</td>
            <td>⭐ ${agent.rating}</td>
            <td>
                <div class="efficiency-bar">
                    <div class="efficiency-fill" style="width: ${agent.efficiency}%"></div>
                    <span>${agent.efficiency}%</span>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateRecurringIssuesTable(data) {
    const tbody = document.getElementById('recurringIssuesTableBody');
    tbody.innerHTML = '';
    
    data.forEach(issue => {
        const row = document.createElement('tr');
        const trendClass = issue.trend.includes('+') ? 'trend-up' : 
                          issue.trend.includes('-') ? 'trend-down' : 'trend-stable';
        
        row.innerHTML = `
            <td>${issue.issue}</td>
            <td>${issue.occurrences}</td>
            <td>${issue.avgTime}</td>
            <td><span class="impact-badge impact-${issue.impact.toLowerCase()}">${issue.impact}</span></td>
            <td><span class="trend-indicator ${trendClass}">${issue.trend}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// Utility functions
function updateReportPeriod() {
    reportPeriod = parseInt(document.getElementById('reportPeriod').value);
    loadReports();
}

function updateAgentPerformance() {
    // Reload agent performance chart with new metric
    // Implementation would depend on the selected metric
    console.log('Updating agent performance with metric:', document.getElementById('performanceMetric').value);
}

function updateCategoryAnalysis() {
    // Reload category analysis chart
    loadCategoryAnalysis().then(data => {
        createCategoryAnalysisChart(data);
    });
}

function switchChartType(chartName, type) {
    // Update chart type
    if (charts[chartName]) {
        charts[chartName].config.type = type;
        charts[chartName].update();
    }
    
    // Update button states
    const buttons = document.querySelectorAll('.chart-type-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.closest('.chart-type-btn').classList.add('active');
}

function refreshReports() {
    loadReports();
}

function exportReports() {
    // Implementation for exporting reports
    alert('Funzione di esportazione in fase di sviluppo');
}

function exportTable(tableId) {
    // Implementation for exporting specific table
    alert(`Esportazione tabella ${tableId} in fase di sviluppo`);
}

function setupAutoRefresh() {
    // Auto-refresh every 5 minutes
    setInterval(() => {
        loadReports();
    }, 5 * 60 * 1000);
}

function showLoadingState() {
    // Show loading indicators
    document.querySelectorAll('.chart-container canvas').forEach(canvas => {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#6c757d';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Caricamento...', canvas.width / 2, canvas.height / 2);
    });
}

function hideLoadingState() {
    // Loading state is automatically hidden when charts are created
}

function showError(message) {
    // Show error message
    console.error(message);
    // You could implement a toast notification here
}