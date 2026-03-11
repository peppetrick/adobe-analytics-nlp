// Adobe Analytics NLU - Frontend Application (Secure Session-Based)

// State management
const state = {
    authenticated: false,
    csrfToken: null,
    hasConfig: false,
    currentChart: null,
    queryHistory: []
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
const queryHistoryList = document.getElementById('query-history-list');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const historyEmpty = document.getElementById('history-empty');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await initCSRF();
    loadQueryHistory();
    await checkAuthStatus();
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
            queryInput.value = el.textContent.trim();
            queryInput.focus();
        });
    });

    // Clear history button
    clearHistoryBtn.addEventListener('click', clearQueryHistory);
}

// Initialize CSRF token
async function initCSRF() {
    try {
        const response = await fetch(`${API_BASE}/auth/csrf-token`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            state.csrfToken = data.csrfToken;
            console.log('✅ CSRF token initialized');
        }
    } catch (error) {
        console.warn('⚠️ CSRF token initialization failed:', error);
    }
}

// Check if user is already authenticated (session-based)
async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_BASE}/auth/session`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();

            if (data.authenticated) {
                state.authenticated = true;
                state.hasConfig = true; // Configurazione sempre disponibile (da business logic files)
                showMainApp();
                // Il messaggio di benvenuto è già presente nell'HTML
            }
        }
    } catch (error) {
        console.error('Auth status check failed:', error);
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

// Logout (session-based)
async function handleLogout() {
    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': state.csrfToken
            },
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout error:', error);
    }

    // Reset state
    state.authenticated = false;
    state.hasConfig = false;

    // Show login screen
    loginScreen.classList.remove('d-none');
    mainApp.classList.add('d-none');
    chatContainer.innerHTML = '';
}

// Show main application
function showMainApp() {
    loginScreen.classList.add('d-none');
    mainApp.classList.remove('d-none');

    // Nascondi la sezione di configurazione (non più necessaria)
    configUploadArea.classList.add('d-none');
    configLoadedArea.classList.add('d-none');

    // Abilita direttamente l'input delle query
    queryInput.disabled = false;
    sendQueryBtn.disabled = false;
}

// Handle config file upload
async function handleConfigUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const config = JSON.parse(text);

        // Upload to server (session-based auth)
        const response = await fetch(`${API_BASE}/query/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': state.csrfToken
            },
            credentials: 'include',
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

    // Save query to history
    addToQueryHistory(query);

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
                'X-CSRF-Token': state.csrfToken
            },
            credentials: 'include',
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

        if (data.type === 'info') {
            // Risposta informativa sulla business logic — mostra in chat
            if (mainContentWrapper.classList.contains('d-none')) {
                reportContainer.classList.add('d-none');
                mainContentWrapper.classList.remove('d-none');
            }
            addAssistantMessage(data.answer);
        } else if (data.needsClarification) {
            // Assicurati che la chat sia visibile
            if (!mainContentWrapper.classList.contains('d-none')) {
                addAssistantMessage(data.message);
                if (data.options && data.options.length > 0) {
                    addQuickReplyButtons(data.options);
                }
            } else {
                // Se siamo nella report view, torna alla chat
                reportContainer.classList.add('d-none');
                mainContentWrapper.classList.remove('d-none');
                addAssistantMessage(data.message);
                if (data.options && data.options.length > 0) {
                    addQuickReplyButtons(data.options);
                }
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
            displayReport(interpretation, reportData, interpretation.chartType || 'line');
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
    const rendered = typeof marked !== 'undefined' ? marked.parse(text) : escapeHtml(text);
    div.innerHTML = `
        <div class="bg-light rounded p-3" style="max-width: 80%;">
            <div class="markdown-body">${rendered}</div>
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

function addQuickReplyButtons(options) {
    const div = document.createElement('div');
    div.className = 'quick-reply-buttons mb-3';

    options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-outline-primary btn-sm quick-reply-btn';
        btn.textContent = option;
        btn.addEventListener('click', () => {
            // Disabilita tutti i pulsanti del gruppo
            div.querySelectorAll('button').forEach(b => b.disabled = true);
            // Invia la risposta come query
            queryInput.value = option;
            handleSendQuery();
        });
        div.appendChild(btn);
    });

    chatContainer.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Display report
function displayReport(interpretation, data, chartType = 'line') {
    // Nascondi il contenuto principale
    mainContentWrapper.classList.add('d-none');

    // Mostra il report a schermo intero
    reportContainer.classList.remove('d-none');

    // Update title
    document.getElementById('report-title').textContent =
        `${interpretation.metric}${interpretation.dimension !== 'Date' ? ' per ' + interpretation.dimension : ''}`;

    const subtitle = `Periodo: ${formatDateRange(interpretation.dateRange)}`;
    document.getElementById('report-subtitle').textContent =
        interpretation.limit ? `${subtitle} (Top ${interpretation.limit})` : subtitle;

    // Badge metadati: metrica, dimensione, periodo, id Adobe
    const metaEl = document.getElementById('report-meta');
    const metricLabel = interpretation.metric || '—';
    const metricId = interpretation.metricIds
        ? interpretation.metricIds.join(', ')
        : (interpretation._metricId || '');
    const dimLabel = interpretation.dimension && interpretation.dimension !== 'null' ? interpretation.dimension : '—';
    metaEl.innerHTML = `
        <span class="badge bg-blue-lt text-blue" title="Metrica">
            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-sm me-1" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Metrica: <strong class="ms-1">${escapeHtml(metricLabel)}</strong>
            ${metricId ? `<span class="ms-1 opacity-75 fw-normal">(${escapeHtml(metricId)})</span>` : ''}
        </span>
        <span class="badge bg-green-lt text-green" title="Dimensione">
            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-sm me-1" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            Dimensione: <strong class="ms-1">${escapeHtml(dimLabel)}</strong>
        </span>
        <span class="badge bg-purple-lt text-purple" title="Periodo">
            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-sm me-1" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><rect x="4" y="5" width="16" height="16" rx="2"/><line x1="16" y1="3" x2="16" y2="7"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="4" y1="11" x2="20" y2="11"/></svg>
            Periodo: <strong class="ms-1">${escapeHtml(formatDateRange(interpretation.dateRange))}</strong>
        </span>
    `;

    // Rileva nomi metriche: se multi-metrica usa metricIds, altrimenti singola
    const metricNames = interpretation.metricIds
        ? interpretation.metric.split(' + ')
        : [interpretation.metric];
    const isMultiMetric = metricNames.length > 1;

    // Update table headers
    document.getElementById('table-header-dim').textContent = interpretation.dimension;
    const headerMetric = document.getElementById('table-header-metric');
    if (isMultiMetric) {
        // Sostituisce l'intestazione singola con una per ogni metrica
        headerMetric.textContent = metricNames[0];
        let sibling = headerMetric.nextElementSibling;
        // Rimuovi eventuali header extra precedenti
        while (sibling && sibling.dataset.extraMetric) {
            const next = sibling.nextElementSibling;
            sibling.remove();
            sibling = next;
        }
        metricNames.slice(1).forEach(name => {
            const th = document.createElement('th');
            th.className = 'text-end';
            th.dataset.extraMetric = '1';
            th.textContent = name;
            headerMetric.parentElement.appendChild(th);
        });
    } else {
        headerMetric.textContent = interpretation.metric;
        // Rimuovi eventuali header extra precedenti
        let sibling = headerMetric.nextElementSibling;
        while (sibling && sibling.dataset.extraMetric) {
            const next = sibling.nextElementSibling;
            sibling.remove();
            sibling = next;
        }
    }

    // Populate table
    const tbody = document.getElementById('report-table-body');
    tbody.innerHTML = '';

    data.forEach(row => {
        const tr = document.createElement('tr');
        const metricValues = row.metrics && row.metrics.length > 1 ? row.metrics : [row.metric];
        const metricCells = metricValues
            .map(v => `<td class="text-end"><strong>${formatNumber(v)}</strong></td>`)
            .join('');
        tr.innerHTML = `<td>${escapeHtml(row.dimension)}</td>${metricCells}`;
        tbody.appendChild(tr);
    });

    // Create chart with specified type
    createChart(data, metricNames, chartType);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Create chart
function createChart(data, metricNames, chartType = 'line') {
    const canvas = document.getElementById('report-chart');
    const ctx = canvas.getContext('2d');

    // Destroy previous chart
    if (state.currentChart) {
        state.currentChart.destroy();
    }

    // Normalizza metricNames ad array
    const names = Array.isArray(metricNames) ? metricNames : [metricNames];

    // Configurazione colori
    const colors = [
        'rgb(75, 192, 192)', 'rgb(255, 99, 132)', 'rgb(54, 162, 235)',
        'rgb(255, 206, 86)', 'rgb(153, 102, 255)', 'rgb(255, 159, 64)',
        'rgb(199, 199, 199)', 'rgb(83, 102, 255)', 'rgb(255, 99, 255)',
        'rgb(99, 255, 132)'
    ];

    const isPieChart = chartType === 'pie' || chartType === 'doughnut';

    let datasets;

    if (isPieChart) {
        // Pie/doughnut: un solo dataset, colori per slice
        datasets = [{
            label: names[0],
            data: data.map(d => d.metric),
            borderColor: data.map((_, i) => colors[i % colors.length]),
            backgroundColor: data.map((_, i) => colors[i % colors.length]),
            borderWidth: 1
        }];
    } else {
        // Line/bar: un dataset per metrica
        datasets = names.map((name, idx) => ({
            label: name,
            data: data.map(d => (d.metrics && d.metrics[idx] !== undefined ? d.metrics[idx] : d.metric)),
            borderColor: colors[idx % colors.length],
            backgroundColor: colors[idx % colors.length].replace('rgb(', 'rgba(').replace(')', ', 0.2)'),
            borderWidth: 2,
            tension: chartType === 'line' ? 0.3 : undefined,
            fill: chartType === 'line' && idx === 0
        }));
    }

    const chartConfig = {
        type: chartType,
        data: {
            labels: data.map(d => d.dimension),
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'top' }
            }
        }
    };

    if (!isPieChart) {
        chartConfig.options.scales = { y: { beginAtZero: true } };
    }

    state.currentChart = new Chart(ctx, chartConfig);
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

// Query History Management
function loadQueryHistory() {
    try {
        const stored = localStorage.getItem('queryHistory');
        if (stored) {
            state.queryHistory = JSON.parse(stored);
            updateHistoryUI();
        }
    } catch (error) {
        console.error('Error loading query history:', error);
        state.queryHistory = [];
    }
}

function saveQueryHistory() {
    try {
        localStorage.setItem('queryHistory', JSON.stringify(state.queryHistory));
    } catch (error) {
        console.error('Error saving query history:', error);
    }
}

function addToQueryHistory(query) {
    // Remove duplicates (case insensitive)
    state.queryHistory = state.queryHistory.filter(
        q => q.toLowerCase() !== query.toLowerCase()
    );

    // Add to beginning
    state.queryHistory.unshift(query);

    // Keep only last 10
    if (state.queryHistory.length > 10) {
        state.queryHistory = state.queryHistory.slice(0, 10);
    }

    saveQueryHistory();
    updateHistoryUI();
}

function clearQueryHistory() {
    if (state.queryHistory.length === 0) return;

    if (confirm('Vuoi cancellare tutto lo storico delle query?')) {
        state.queryHistory = [];
        saveQueryHistory();
        updateHistoryUI();
    }
}

function updateHistoryUI() {
    if (state.queryHistory.length === 0) {
        queryHistoryList.innerHTML = '<div class="text-muted text-center py-3" id="history-empty">Nessuna query recente</div>';
        clearHistoryBtn.style.display = 'none';
        return;
    }

    clearHistoryBtn.style.display = 'block';

    let html = '';
    state.queryHistory.forEach((query, index) => {
        const attrSafe = escapeHtml(query).replace(/"/g, '&quot;');
        html += `
            <a href="#" class="list-group-item list-group-item-action history-query-item d-flex justify-content-between align-items-center" data-query="${attrSafe}">
                <span class="text-truncate" style="max-width: 85%;">${escapeHtml(query)}</span>
                <span class="badge bg-secondary">${index + 1}</span>
            </a>
        `;
    });

    queryHistoryList.innerHTML = html;

    // Add click handlers to history items
    document.querySelectorAll('.history-query-item').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const query = el.getAttribute('data-query');

            // Populate the input field based on current view
            if (reportContainer.classList.contains('d-none')) {
                // Main view
                queryInput.value = query;
                queryInput.focus();
            } else {
                // Report view
                queryInputReport.value = query;
                queryInputReport.focus();
            }
        });
    });
}
