// Reports page JavaScript
// Fix for exports error in browser
if (typeof exports === 'undefined') {
    var exports = {};
}

let reportPeriod = 30;
let charts = {};
let reportData = {};

// Color schemes for professional charts
const colorSchemes = {
    primary: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#43e97b'],
    success: ['#56ab2f', '#a8e6cf', '#88d8a3', '#4dd0e1', '#26a69a'],
    warning: ['#f093fb', '#f5576c', '#fd746c', '#ff9068', '#ffa726'],
    info: ['#4facfe', '#00f2fe', '#43e97b', '#00d2ff', '#3a8bfd'],
    status: {
        'Open': '#ff6b6b',
        'In Progress': '#4ecdc4', 
        'Resolved': '#45b7d1',
        'Closed': '#96ceb4'
    },
    priority: {
        'Low': '#95e1d3',
        'Medium': '#fce38a',
        'High': '#f38181',
        'Urgent': '#c44569'
    }
};

// Initialize reports page
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname === '/reports') {
        initializeReports();
        setupEventListeners();
    }
});

async function initializeReports() {
    try {
        showLoadingState();
        await loadAllReportData();
        renderAllCharts();
        hideLoadingState();
    } catch (error) {
        console.error('Error initializing reports:', error);
        showError('Errore nel caricamento dei report');
    }
}

function setupEventListeners() {
    // Period selector
    document.getElementById('reportPeriod')?.addEventListener('change', updateReportPeriod);
    
    // Chart type buttons
    document.querySelectorAll('.chart-type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const chartContainer = this.closest('.report-card');
            const chartId = chartContainer.querySelector('canvas').id;
            const chartType = this.querySelector('i').classList.contains('fa-chart-line') ? 'line' : 'bar';
            switchChartType(chartId.replace('Chart', ''), chartType);
            
            // Update active state
            chartContainer.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Performance metric selector
    document.getElementById('performanceMetric')?.addEventListener('change', updateAgentPerformance);
    
    // Category type selector
    document.getElementById('categoryType')?.addEventListener('change', updateCategoryAnalysis);
}

async function loadAllReportData() {
    try {
        const [kpiData, trendsData, statsData, ticketsData, agentsData] = await Promise.all([
            fetchWithAuth(`/api/reports/kpi?period=${reportPeriod}`).then(r => r.json()).catch(() => generateMockKPIData()),
            fetchWithAuth(`/api/reports/ticket-trends?period=${reportPeriod}`).then(r => r.json()).catch(() => generateMockTrendsData()),
            fetchWithAuth('/api/stats').then(r => r.json()).catch(() => ({})),
            fetchWithAuth('/api/tickets').then(r => r.json()).catch(() => []),
            fetchWithAuth('/api/agents').then(r => r.json()).catch(() => [])
        ]);

        reportData = {
            kpi: kpiData,
            trends: trendsData,
            stats: statsData,
            tickets: ticketsData,
            agents: agentsData
        };

        // Update KPI cards
        updateKPICards(kpiData);
        
    } catch (error) {
        console.error('Error loading report data:', error);
        throw error;
    }
}

function renderAllCharts() {
    renderTicketTrendsChart();
    renderStatusDistributionChart();
    renderPriorityAnalysisChart();
    renderAgentPerformanceChart();
    renderCustomerActivityChart();
    renderResponseTimeChart();
    renderCategoryAnalysisChart();
    renderWorkloadHeatmap();
    renderTopAgentsTable();
    renderRecurringIssuesTable();
}

function generateMockKPIData() {
    return {
        avgResolutionTime: '2.5h',
        resolutionTrend: '+15%',
        customerSatisfaction: '4.8/5',
        satisfactionTrend: '+5%',
        firstContactResolution: '78%',
        fcrTrend: '+12%',
        ticketVolume: '1,247',
        volumeTrend: '+23%'
    };
}

function generateMockTrendsData() {
    const labels = [];
    const created = [];
    const resolved = [];
    const inProgress = [];
    
    for (let i = reportPeriod - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }));
        
        const createdCount = Math.floor(Math.random() * 10) + 5;
        const resolvedCount = Math.floor(createdCount * 0.8);
        const progressCount = Math.floor(createdCount * 0.3);
        
        created.push(createdCount);
        resolved.push(resolvedCount);
        inProgress.push(progressCount);
    }
    
    return { labels, created, resolved, inProgress };
}

function updateKPICards(data) {
    document.getElementById('avgResolutionTime').textContent = data.avgResolutionTime || '2.5h';
    document.getElementById('resolutionTrend').textContent = data.resolutionTrend || '+12%';
    document.getElementById('resolutionTrend').className = 'trend positive';

    document.getElementById('customerSatisfaction').textContent = data.customerSatisfaction || '4.8/5';
    document.getElementById('satisfactionTrend').textContent = data.satisfactionTrend || '+8%';
    document.getElementById('satisfactionTrend').className = 'trend positive';

    document.getElementById('firstContactResolution').textContent = data.firstContactResolution || '78%';
    document.getElementById('fcrTrend').textContent = data.fcrTrend || '+15%';
    document.getElementById('fcrTrend').className = 'trend positive';

    document.getElementById('ticketVolume').textContent = data.ticketVolume || '1,247';
    document.getElementById('volumeTrend').textContent = data.volumeTrend || '+23%';
    document.getElementById('volumeTrend').className = 'trend positive';
}

function renderTicketTrendsChart() {
    const canvas = document.getElementById('ticketTrendsChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = reportData.trends || generateMockTrendsData();
    
    if (charts.ticketTrends) {
        charts.ticketTrends.destroy();
    }

    charts.ticketTrends = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Creati',
                data: data.created,
                borderColor: colorSchemes.primary[0],
                backgroundColor: colorSchemes.primary[0] + '20',
                fill: true,
                tension: 0.4
            }, {
                label: 'Risolti',
                data: data.resolved,
                borderColor: colorSchemes.success[0],
                backgroundColor: colorSchemes.success[0] + '20',
                fill: true,
                tension: 0.4
            }, {
                label: 'In Corso',
                data: data.inProgress,
                borderColor: colorSchemes.warning[0],
                backgroundColor: colorSchemes.warning[0] + '20',
                fill: true,
                tension: 0.4
            }]
        },
        options: getDefaultChartOptions()
    });
}

function renderStatusDistributionChart() {
    const canvas = document.getElementById('statusDistributionChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tickets = reportData.tickets || [];
    const statusCount = {};
    
    tickets.forEach(ticket => {
        statusCount[ticket.status] = (statusCount[ticket.status] || 0) + 1;
    });

    if (charts.statusDistribution) {
        charts.statusDistribution.destroy();
    }

    charts.statusDistribution = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCount),
            datasets: [{
                data: Object.values(statusCount),
                backgroundColor: Object.keys(statusCount).map(status => colorSchemes.status[status] || colorSchemes.primary[0]),
                borderWidth: 0
            }]
        },
        options: {
            ...getDefaultChartOptions(),
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function renderPriorityAnalysisChart() {
    const canvas = document.getElementById('priorityAnalysisChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tickets = reportData.tickets || [];
    const priorityCount = {};
    
    tickets.forEach(ticket => {
        priorityCount[ticket.priority] = (priorityCount[ticket.priority] || 0) + 1;
    });

    if (charts.priorityAnalysis) {
        charts.priorityAnalysis.destroy();
    }

    charts.priorityAnalysis = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(priorityCount),
            datasets: [{
                data: Object.values(priorityCount),
                backgroundColor: Object.keys(priorityCount).map(priority => colorSchemes.priority[priority] || colorSchemes.primary[0]),
                borderWidth: 0
            }]
        },
        options: {
            ...getDefaultChartOptions(),
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function renderAgentPerformanceChart() {
    const canvas = document.getElementById('agentPerformanceChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const agents = reportData.agents || [];
    const tickets = reportData.tickets || [];
    const metric = document.getElementById('performanceMetric')?.value || 'resolved';

    const agentData = agents.map(agent => {
        const agentTickets = tickets.filter(t => t.assigned_to === agent.name);
        const resolvedTickets = agentTickets.filter(t => t.status === 'Resolved' || t.status === 'Closed');
        
        let value;
        switch(metric) {
            case 'resolved':
                value = resolvedTickets.length;
                break;
            case 'avg_time':
                value = Math.round(Math.random() * 8 + 2); // Mock data
                break;
            case 'customer_rating':
                value = Math.round((Math.random() * 1 + 4) * 10) / 10; // Mock data
                break;
            default:
                value = resolvedTickets.length;
        }
        
        return {
            name: agent.name,
            value: value
        };
    });

    if (charts.agentPerformance) {
        charts.agentPerformance.destroy();
    }

    charts.agentPerformance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: agentData.map(a => a.name),
            datasets: [{
                label: getMetricLabel(metric),
                data: agentData.map(a => a.value),
                backgroundColor: createGradient(ctx, colorSchemes.primary[0]),
                borderColor: colorSchemes.primary[0],
                borderWidth: 1
            }]
        },
        options: {
            ...getDefaultChartOptions(),
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true
                }
            }
        }
    });
}

function renderCustomerActivityChart() {
    const canvas = document.getElementById('customerActivityChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Generate mock customer activity data
    const labels = [];
    const data = [];
    
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }));
        data.push(Math.floor(Math.random() * 50) + 10);
    }

    if (charts.customerActivity) {
        charts.customerActivity.destroy();
    }

    charts.customerActivity = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Clienti Attivi',
                data: data,
                borderColor: colorSchemes.info[0],
                backgroundColor: colorSchemes.info[0] + '20',
                fill: true,
                tension: 0.4
            }]
        },
        options: getDefaultChartOptions()
    });
}

function renderResponseTimeChart() {
    const canvas = document.getElementById('responseTimeChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Generate mock response time data
    const labels = [];
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('it-IT', { weekday: 'short' }));
        data.push(Math.floor(Math.random() * 4) + 1);
    }

    if (charts.responseTime) {
        charts.responseTime.destroy();
    }

    charts.responseTime = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Tempo Medio (ore)',
                data: data,
                borderColor: colorSchemes.warning[0],
                backgroundColor: colorSchemes.warning[0] + '20',
                fill: true,
                tension: 0.4
            }]
        },
        options: getDefaultChartOptions()
    });
}

function renderCategoryAnalysisChart() {
    const canvas = document.getElementById('categoryAnalysisChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tickets = reportData.tickets || [];
    const categoryType = document.getElementById('categoryType')?.value || 'software';
    const categoryData = {};

    tickets.forEach(ticket => {
        const category = ticket[categoryType] || 'Non specificato';
        categoryData[category] = (categoryData[category] || 0) + 1;
    });

    if (charts.categoryAnalysis) {
        charts.categoryAnalysis.destroy();
    }

    charts.categoryAnalysis = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(categoryData),
            datasets: [{
                label: 'Numero Ticket',
                data: Object.values(categoryData),
                backgroundColor: colorSchemes.primary.slice(0, Object.keys(categoryData).length),
                borderWidth: 0
            }]
        },
        options: getDefaultChartOptions()
    });
}

function renderWorkloadHeatmap() {
    const container = document.getElementById('workloadHeatmap');
    if (!container) return;

    // Generate mock heatmap data
    const days = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    const hours = Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`);
    
    let heatmapHTML = '<div class="heatmap-grid">';
    
    // Header with hours
    heatmapHTML += '<div class="heatmap-header">';
    heatmapHTML += '<div class="heatmap-cell empty"></div>';
    hours.forEach(hour => {
        heatmapHTML += `<div class="heatmap-cell hour-label">${hour}</div>`;
    });
    heatmapHTML += '</div>';
    
    // Data rows
    days.forEach(day => {
        heatmapHTML += '<div class="heatmap-row">';
        heatmapHTML += `<div class="heatmap-cell day-label">${day}</div>`;
        hours.forEach(() => {
            const intensity = Math.floor(Math.random() * 5);
            heatmapHTML += `<div class="heatmap-cell data-cell intensity-${intensity}" title="${day} - Carico: ${intensity}"></div>`;
        });
        heatmapHTML += '</div>';
    });
    
    heatmapHTML += '</div>';
    container.innerHTML = heatmapHTML;
}

function renderTopAgentsTable() {
    const tbody = document.getElementById('topAgentsTableBody');
    if (!tbody) return;

    const agents = reportData.agents || [];
    const tickets = reportData.tickets || [];

    const agentStats = agents.map(agent => {
        const agentTickets = tickets.filter(t => t.assigned_to === agent.name);
        const resolvedTickets = agentTickets.filter(t => t.status === 'Resolved' || t.status === 'Closed');
        
        return {
            name: agent.name,
            resolved: resolvedTickets.length,
            avgTime: `${(Math.random() * 4 + 1).toFixed(1)}h`,
            rating: `${(Math.random() * 1 + 4).toFixed(1)}/5`,
            efficiency: `${Math.floor(Math.random() * 30 + 70)}%`
        };
    }).sort((a, b) => b.resolved - a.resolved);

    tbody.innerHTML = agentStats.map(agent => `
        <tr>
            <td>${agent.name}</td>
            <td><span class="metric-badge">${agent.resolved}</span></td>
            <td>${agent.avgTime}</td>
            <td><span class="rating-badge">${agent.rating}</span></td>
            <td><span class="efficiency-badge">${agent.efficiency}</span></td>
        </tr>
    `).join('');
}

function renderRecurringIssuesTable() {
    const tbody = document.getElementById('recurringIssuesTableBody');
    if (!tbody) return;

    const mockIssues = [
        { problem: 'Errore connessione database', count: 15, avgTime: '2.5h', impact: 'Alto', trend: '+12%' },
        { problem: 'Problema installazione software', count: 12, avgTime: '1.8h', impact: 'Medio', trend: '-5%' },
        { problem: 'Richiesta configurazione email', count: 8, avgTime: '0.5h', impact: 'Basso', trend: '+8%' },
        { problem: 'Errore sincronizzazione dati', count: 6, avgTime: '3.2h', impact: 'Alto', trend: '-15%' },
        { problem: 'Problema accesso utente', count: 5, avgTime: '0.8h', impact: 'Medio', trend: '+3%' }
    ];

    tbody.innerHTML = mockIssues.map(issue => `
        <tr>
            <td>${issue.problem}</td>
            <td><span class="count-badge">${issue.count}</span></td>
            <td>${issue.avgTime}</td>
            <td><span class="impact-badge impact-${issue.impact.toLowerCase()}">${issue.impact}</span></td>
            <td><span class="trend-badge ${issue.trend.startsWith('+') ? 'positive' : 'negative'}">${issue.trend}</span></td>
        </tr>
    `).join('');
}

// Event Handlers
async function updateReportPeriod() {
    const newPeriod = parseInt(document.getElementById('reportPeriod').value);
    if (newPeriod !== reportPeriod) {
        reportPeriod = newPeriod;
        showLoadingState();
        try {
            await loadAllReportData();
            renderAllCharts();
        } catch (error) {
            console.error('Error updating period:', error);
            showError('Errore nell\'aggiornamento dei dati');
        } finally {
            hideLoadingState();
        }
    }
}

function switchChartType(chartName, type) {
    if (charts[chartName]) {
        const chartData = charts[chartName].data;
        const chartOptions = charts[chartName].options;
        
        charts[chartName].destroy();
        
        const ctx = document.getElementById(chartName + 'Chart');
        charts[chartName] = new Chart(ctx, {
            type: type,
            data: chartData,
            options: chartOptions
        });
    }
}

function updateAgentPerformance() {
    renderAgentPerformanceChart();
}

function updateCategoryAnalysis() {
    renderCategoryAnalysisChart();
}

async function refreshReports() {
    showLoadingState();
    try {
        await loadAllReportData();
        renderAllCharts();
        showNotification('Report aggiornati con successo', 'success');
    } catch (error) {
        console.error('Error refreshing reports:', error);
        showError('Errore nell\'aggiornamento dei report');
    } finally {
        hideLoadingState();
    }
}

function exportReports() {
    try {
        const exportData = {
            kpi: reportData.kpi,
            period: reportPeriod,
            timestamp: new Date().toISOString(),
            charts: Object.keys(charts).map(key => ({
                name: key,
                image: charts[key].toBase64Image()
            }))
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `report_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        
        showNotification('Report esportato con successo', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showError('Errore nell\'esportazione del report');
    }
}

function exportTable(tableType) {
    try {
        let data = [];
        let filename = '';
        
        if (tableType === 'topAgents') {
            const table = document.getElementById('topAgentsTable');
            filename = 'top_agents';
            data = Array.from(table.querySelectorAll('tbody tr')).map(row => {
                const cells = row.querySelectorAll('td');
                return {
                    Agente: cells[0].textContent,
                    TicketRisolti: cells[1].textContent,
                    TempoMedio: cells[2].textContent,
                    Valutazione: cells[3].textContent,
                    Efficienza: cells[4].textContent
                };
            });
        } else if (tableType === 'recurringIssues') {
            const table = document.getElementById('recurringIssuesTable');
            filename = 'recurring_issues';
            data = Array.from(table.querySelectorAll('tbody tr')).map(row => {
                const cells = row.querySelectorAll('td');
                return {
                    Problema: cells[0].textContent,
                    Occorrenze: cells[1].textContent,
                    TempoMedio: cells[2].textContent,
                    Impatto: cells[3].textContent,
                    Trend: cells[4].textContent
                };
            });
        }

        const csvContent = "data:text/csv;charset=utf-8," 
            + Object.keys(data[0]).join(",") + "\n"
            + data.map(row => Object.values(row).map(val => `"${val}"`).join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Tabella esportata con successo', 'success');
    } catch (error) {
        console.error('Table export error:', error);
        showError('Errore nell\'esportazione della tabella');
    }
}

// Utility Functions
function getDefaultChartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    usePointStyle: true,
                    padding: 20
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: '#667eea',
                borderWidth: 1
            }
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)',
                    borderColor: 'rgba(0, 0, 0, 0.1)'
                }
            },
            y: {
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)',
                    borderColor: 'rgba(0, 0, 0, 0.1)'
                },
                beginAtZero: true
            }
        },
        animation: {
            duration: 1000,
            easing: 'easeInOutCubic'
        }
    };
}

function createGradient(ctx, color) {
    if (!ctx || typeof ctx.createLinearGradient !== 'function') {
        return color; // Fallback to solid color if gradient not available
    }
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color + '40');
    return gradient;
}

function getMetricLabel(metric) {
    const labels = {
        'resolved': 'Ticket Risolti',
        'avg_time': 'Tempo Medio (ore)',
        'customer_rating': 'Valutazione Media'
    };
    return labels[metric] || 'Metrica';
}

function showLoadingState() {
    // Add loading overlay or spinner
    const loader = document.createElement('div');
    loader.id = 'reportsLoader';
    loader.className = 'reports-loader';
    loader.innerHTML = '<div class="spinner"></div><p>Caricamento report...</p>';
    document.body.appendChild(loader);
}

function hideLoadingState() {
    const loader = document.getElementById('reportsLoader');
    if (loader) {
        loader.remove();
    }
}

function showError(message) {
    if (typeof showNotification === 'function') {
        showNotification(message, 'error');
    } else {
        alert(message);
    }
}

// Function to make authenticated requests (imported from app.js)
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('user_token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return fetch(url, {
        ...options,
        headers
    });
}

// Auto-refresh reports every 5 minutes
setInterval(refreshReports, 5 * 60 * 1000);

// Show notification function if not available from app.js
if (typeof showNotification === 'undefined') {
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

// Add CSS for reports styling if not already present
if (!document.getElementById('reportsStyles')) {
    const styles = document.createElement('style');
    styles.id = 'reportsStyles';
    styles.textContent = `
        .reports-loader {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.8);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .heatmap-grid {
            display: table;
            font-size: 12px;
        }
        
        .heatmap-header, .heatmap-row {
            display: table-row;
        }
        
        .heatmap-cell {
            display: table-cell;
            width: 20px;
            height: 20px;
            border: 1px solid #e0e0e0;
            text-align: center;
            vertical-align: middle;
            font-size: 10px;
        }
        
        .heatmap-cell.empty {
            border: none;
        }
        
        .heatmap-cell.hour-label, .heatmap-cell.day-label {
            background: #f5f5f5;
            font-weight: bold;
            padding: 2px;
        }
        
        .intensity-0 { background-color: rgba(0, 0, 0, 0.05); }
        .intensity-1 { background-color: rgba(102, 126, 234, 0.2); }
        .intensity-2 { background-color: rgba(102, 126, 234, 0.4); }
        .intensity-3 { background-color: rgba(102, 126, 234, 0.6); }
        .intensity-4 { background-color: rgba(102, 126, 234, 0.8); }
        
        .metric-badge, .count-badge {
            background: #667eea;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
        }
        
        .rating-badge {
            background: #28a745;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
        }
        
        .efficiency-badge {
            background: #17a2b8;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
        }
        
        .impact-badge {
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
            color: white;
        }
        
        .impact-alto { background: #dc3545; }
        .impact-medio { background: #ffc107; color: #000; }
        .impact-basso { background: #28a745; }
        
        .trend-badge {
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
        }
        
        .trend-badge.positive { background: #d4edda; color: #155724; }
        .trend-badge.negative { background: #f8d7da; color: #721c24; }
        
        .chart-type-btn {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            color: #6c757d;
            padding: 5px 8px;
            border-radius: 4px;
            cursor: pointer;
            margin: 0 2px;
        }
        
        .chart-type-btn.active {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }
        
        .chart-type-btn:hover {
            background: #e9ecef;
        }
        
        .chart-type-btn.active:hover {
            background: #5a6fd8;
        }
    `;
    document.head.appendChild(styles);
}