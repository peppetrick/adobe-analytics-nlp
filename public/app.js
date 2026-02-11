// Adobe Analytics NLU - Frontend Application

// State management
const state = {
    accessToken: null,
    hasConfig: false,
    currentChart: null
};

// API Base URL
const API_BASE = window.location.origin + '/api';

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginLoading = document.getElementById('login-loading');
const configFile = document.getElementById('config-file');
const configUploadArea = document.getElementById('config-upload-area');
const configLoadedArea = document.getElementById('config-loaded-area');
const configStatus = document.getElementById('config-status');
const changeConfigBtn = document.getElementById('change-config-btn');
const queryInput = document.getElementById('query-input');
const sendQueryBtn = document.getElementById('send-query-btn');
const queryInputReport = document.getElementById('query-input-report');
const sendQueryReportBtn = document.getElementById('send-query-report-btn');
const chatContainer = document.getElementById('chat-container');
const reportContainer = document.getElementById('report-container');
const metricsCount = document.getElementById('metrics-count');
const dimensionsCount = document.getElementById('dimensions-count');
const closeReportBtn = document.getElementById('close-report-btn');
const mainContentWrapper = document.getElementById('main-content-wrapper');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    loginBtn.addEventListener('click', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    configFile.addEventListener('change', handleConfigUpload);
    changeConfigBtn.addEventListener('click', () => {
        configUploadArea.classList.remove('d-none');
        configLoadedArea.classList.add('d-none');
        state.hasConfig = false;
        queryInput.disabled = true;
        sendQueryBtn.disabled = true;
    });
    sendQueryBtn.addEventListener('click', handleSendQuery);
    queryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendQuery();
    });
    sendQueryReportBtn.addEventListener('click', handleSendQueryFromReport);
    queryInputReport.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendQueryFromReport();
    });
    closeReportBtn.addEventListener('click', () => {
        reportContainer.classList.add('d-none');
        mainContentWrapper.classList.remove('d-none');
    });

    // Example queries
    document.querySelectorAll('.example-query').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            if (!state.hasConfig) return;
            queryInput.value = el.textContent;
            handleSendQuery();
        });
    });
}

// Check if user is already authenticated
function checkAuthStatus() {
    const token = localStorage.getItem('adobe_access_token');
    if (token) {
        state.accessToken = token;
        showMainApp();
        addSystemMessage('Benvenuto! Carica la configurazione per iniziare.');
    }
}

// Start OAuth login
async function handleLogin() {
    loginBtn.disabled = true;
    loginLoading.classList.remove('d-none');

    try {
        const response = await fetch(`${API_BASE}/auth/login`);
        const data = await response.json();
        
        if (data.authUrl) {
            // Redirect to Adobe OAuth
            window.location.href = data.authUrl;
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Errore durante il login. Riprova.');
        loginBtn.disabled = false;
        loginLoading.classList.add('d-none');
    }
}

// Logout
function handleLogout() {
    state.accessToken = null;
    state.hasConfig = false;
    localStorage.removeItem('adobe_access_token');
    localStorage.removeItem('adobe_token_expires');
    localStorage.removeItem('adobe_refresh_token');
    
    loginScreen.classList.remove('d-none');
    mainApp.classList.add('d-none');
    chatContainer.innerHTML = '';
}

// Show main application
function showMainApp() {
    loginScreen.classList.add('d-none');
    mainApp.classList.remove('d-none');
}

// Handle config file upload
async function handleConfigUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const config = JSON.parse(text);

        // Upload to server
        const response = await fetch(`${API_BASE}/query/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.accessToken}`
            },
            body: JSON.stringify({ config })
        });

        const data = await response.json();

        if (data.success) {
            state.hasConfig = true;
            configUploadArea.classList.add('d-none');
            configLoadedArea.classList.remove('d-none');
            configStatus.classList.remove('d-none');
            
            metricsCount.textContent = data.metrics;
            dimensionsCount.textContent = data.dimensions;

            queryInput.disabled = false;
            sendQueryBtn.disabled = false;

            addSystemMessage(`Configurazione caricata: ${data.metrics} metriche, ${data.dimensions} dimensioni.`);
        } else {
            showError('Errore nel caricamento della configurazione.');
        }
    } catch (error) {
        console.error('Config upload error:', error);
        showError('Errore nel parsing del file JSON.');
    }
}

// Send query
async function handleSendQuery() {
    await sendQuery(queryInput);
}

// Send query from report view
async function handleSendQueryFromReport() {
    await sendQuery(queryInputReport);
}

// Generic send query function
async function sendQuery(inputElement) {
    const query = inputElement.value.trim();
    if (!query || !state.hasConfig) return;

    // Disable inputs
    inputElement.disabled = true;
    queryInput.disabled = true;
    queryInputReport.disabled = true;
    sendQueryBtn.disabled = true;
    sendQueryReportBtn.disabled = true;

    // Add user message to chat (if visible)
    if (!mainContentWrapper.classList.contains('d-none')) {
        addUserMessage(query);
    }
    
    // Clear inputs
    inputElement.value = '';

    // Show loading in the appropriate place
    let loadingId;
    if (reportContainer.classList.contains('d-none')) {
        // If report is not visible, show loading in chat
        loadingId = addLoadingMessage();
    } else {
        // If report is visible, show loading indicator on button
        sendQueryReportBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Elaborazione...';
    }

    try {
        const response = await fetch(`${API_BASE}/query/ask`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.accessToken}`
            },
            body: JSON.stringify({ query })
        });

        const data = await response.json();

        // Remove loading
        if (loadingId) {
            removeLoadingMessage(loadingId);
        } else {
            // Restore button
            sendQueryReportBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <line x1="10" y1="14" x2="21" y2="3" />
                    <path d="M21 3l-6.5 18a0.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a0.55 .55 0 0 1 0 -1l18 -6.5" />
                </svg>
                Nuova Query
            `;
        }

        console.log('Query response:', data);

        if (data.needsClarification) {
            // Show in chat if visible
            if (!mainContentWrapper.classList.contains('d-none')) {
                addAssistantMessage(data.message);
                if (data.availableMetrics) {
                    addSystemMessage('Metriche disponibili: ' + data.availableMetrics.join(', '));
                }
            } else {
                // Show alert if in report view
                alert(data.message);
            }
        } else if (data.interpretation && data.data) {
            const { interpretation, data: reportData } = data;
            
            // Add message to chat only if visible
            if (!mainContentWrapper.classList.contains('d-none')) {
                addAssistantMessage(
                    `Ho generato il report per "${interpretation.metric}". Guarda i risultati sotto.`
                );
            }

            // Display report (will switch to full screen)
            displayReport(interpretation, reportData);
        } else {
            console.error('Unexpected response format:', data);
            const errorMsg = 'Si è verificato un errore nel formato della risposta. Riprova.';
            if (!mainContentWrapper.classList.contains('d-none')) {
                addAssistantMessage(errorMsg);
            } else {
                alert(errorMsg);
            }
        }

    } catch (error) {
        console.error('Query error:', error);
        if (loadingId) {
            removeLoadingMessage(loadingId);
        } else {
            sendQueryReportBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <line x1="10" y1="14" x2="21" y2="3" />
                    <path d="M21 3l-6.5 18a0.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a0.55 .55 0 0 1 0 -1l18 -6.5" />
                </svg>
                Nuova Query
            `;
        }
        
        const errorMsg = 'Errore durante l\'elaborazione della query.';
        if (!mainContentWrapper.classList.contains('d-none')) {
            addAssistantMessage(errorMsg);
        } else {
            alert(errorMsg);
        }
    } finally {
        // Re-enable inputs
        queryInput.disabled = false;
        queryInputReport.disabled = false;
        sendQueryBtn.disabled = false;
        sendQueryReportBtn.disabled = false;
        inputElement.focus();
    }
}

// Add messages to chat
function addUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'chat-message user-message mb-3 d-flex justify-content-end';
    div.innerHTML = `
        <div class="bg-primary text-white rounded p-3" style="max-width: 80%;">
            ${escapeHtml(text)}
        </div>
    `;
    chatContainer.appendChild(div);
    scrollToBottom();
}

function addAssistantMessage(text) {
    const div = document.createElement('div');
    div.className = 'chat-message assistant-message mb-3';
    div.innerHTML = `
        <div class="bg-light rounded p-3" style="max-width: 80%;">
            ${escapeHtml(text)}
        </div>
    `;
    chatContainer.appendChild(div);
    scrollToBottom();
}

function addSystemMessage(text) {
    const div = document.createElement('div');
    div.className = 'chat-message system-message mb-3';
    div.innerHTML = `
        <div class="alert alert-info">
            ${escapeHtml(text)}
        </div>
    `;
    chatContainer.appendChild(div);
    scrollToBottom();
}

function addLoadingMessage() {
    const id = 'loading-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'chat-message loading-message mb-3';
    div.innerHTML = `
        <div class="bg-light rounded p-3" style="max-width: 80%;">
            <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
            Elaborazione in corso...
        </div>
    `;
    chatContainer.appendChild(div);
    scrollToBottom();
    return id;
}

function removeLoadingMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Display report
function displayReport(interpretation, data) {
    // Nascondi il contenuto principale
    mainContentWrapper.classList.add('d-none');
    
    // Mostra il report a schermo intero
    reportContainer.classList.remove('d-none');

    // Update title
    document.getElementById('report-title').textContent = 
        `${interpretation.metric}${interpretation.dimension !== 'Date' ? ' per ' + interpretation.dimension : ''}`;
    
    document.getElementById('report-subtitle').textContent = 
        `Periodo: ${formatDateRange(interpretation.dateRange)}`;

    // Update table headers
    document.getElementById('table-header-dim').textContent = interpretation.dimension;
    document.getElementById('table-header-metric').textContent = interpretation.metric;

    // Populate table
    const tbody = document.getElementById('report-table-body');
    tbody.innerHTML = '';
    
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(row.dimension)}</td>
            <td class="text-end"><strong>${formatNumber(row.metric)}</strong></td>
        `;
        tbody.appendChild(tr);
    });

    // Create chart
    createChart(data, interpretation.metric);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Create chart
function createChart(data, metricName) {
    const canvas = document.getElementById('report-chart');
    const ctx = canvas.getContext('2d');

    // Destroy previous chart
    if (state.currentChart) {
        state.currentChart.destroy();
    }

    state.currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.dimension),
            datasets: [{
                label: metricName,
                data: data.map(d => d.metric),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatNumber(num) {
    return new Intl.NumberFormat('it-IT').format(num);
}

function formatDateRange(range) {
    const ranges = {
        'today': 'Oggi',
        'yesterday': 'Ieri',
        'last7days': 'Ultimi 7 giorni',
        'last30days': 'Ultimi 30 giorni',
        'last90days': 'Ultimi 90 giorni'
    };
    return ranges[range] || range;
}

function showError(message) {
    addSystemMessage('⚠️ ' + message);
}
