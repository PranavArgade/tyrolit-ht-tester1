/* =========================================
   FIREBASE & STATE INITIALIZATION
   ========================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getDatabase, ref, onValue, get, off } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyB_3hC0BFKGMxzqd5ByK3PbBZb4F3IrTPI",
    authDomain: "raspberry-pi-iot-f7707.firebaseapp.com",
    databaseURL: "https://raspberry-pi-iot-f7707-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "raspberry-pi-iot-f7707",
    storageBucket: "raspberry-pi-iot-f7707.firebasestorage.app",
    messagingSenderId: "679880318889",
    appId: "1:679880318889:web:f0014e5cdac0098172aeb8"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const dataRef = ref(database, "labs");

let DEVICE_IDS = [];
let allData = [];
let notifiedAlerts = new Set(); // Track alert timestamps to avoid spamming the same alert
// Load previous session data if it exists to maintain history across logouts
const cachedData = localStorage.getItem('tyrolit_history');
if (cachedData) {
    try {
        allData = JSON.parse(cachedData);
        // Clean out data older than 24 hours (86400000 ms) to prevent infinite bloat
        const now = Date.now();
        allData = allData.filter(d => (now - d.timestamp) < 86400000);
    } catch (e) {
        console.error("Could not parse cached data", e);
    }
}

let filteredData = [];
let chartInstance = null;
let firebaseListenerActive = false;

// History Mode State
let isHistoryMode = false;
let historyDateStr = null;

/* =========================================
   DOM ELEMENTS
   ========================================= */
const DOM = {
    loader: document.getElementById('global-loader'),

    // Login
    loginContainer: document.getElementById('login-container'),
    loginForm: document.getElementById('login-form'),
    emailInput: document.getElementById('email'),
    passwordInput: document.getElementById('password'),
    loginError: document.getElementById('login-error'),

    // Dashboard
    dashboardContainer: document.getElementById('dashboard-container'),
    logoutBtn: document.getElementById('logout-btn'),
    deviceFilter: document.getElementById('device-filter'),
    exportBtn: document.getElementById('export-btn'),
    historyDateInput: document.getElementById('history-date'),
    searchHistoryBtn: document.getElementById('search-history-btn'),
    liveModeBtn: document.getElementById('live-mode-btn'),

    // Cards
    latestTemp: document.getElementById('latest-temp'),
    latestHumidity: document.getElementById('latest-humidity'),
    labStatus: document.getElementById('lab-status'),

    // Chart
    chartCanvas: document.getElementById('trendsChart'),
    chartEmptyState: document.getElementById('chart-empty-state'),

    // Table
    tableBody: document.getElementById('table-body'),
    tableEmptyState: document.getElementById('table-empty-state'),
    dataTable: document.getElementById('data-table'),

    // Comparison Table
    comparisonTableBody: document.getElementById('comparison-table-body'),
    comparisonEmptyState: document.getElementById('comparison-empty-state'),
    comparisonTable: document.getElementById('comparison-table'),

    // Toasts
    toastContainer: document.getElementById('toast-container')
};

/* =========================================
   AUTHENTICATION
   ========================================= */
function handleLogin(e) {
    e.preventDefault();

    const email = DOM.emailInput.value.trim();
    const password = DOM.passwordInput.value.trim();

    DOM.loginError.classList.add('hidden');

    // Show loader for simulated network request
    showLoader();

    setTimeout(() => {
        if (email === 'tyrolit@gmail.com' && password === 'tyrolit@123') {
            // Success
            login();
        } else {
            // Error
            hideLoader();
            DOM.loginError.classList.remove('hidden');
            // Shake animation for error
            DOM.loginForm.parentElement.animate([
                { transform: 'translateX(0)' },
                { transform: 'translateX(-10px)' },
                { transform: 'translateX(10px)' },
                { transform: 'translateX(-10px)' },
                { transform: 'translateX(10px)' },
                { transform: 'translateX(0)' }
            ], { duration: 400, easing: 'ease-in-out' });
        }
    }, 800);
}

function handleLogout() {
    showLoader();
    setTimeout(() => {
        DOM.dashboardContainer.classList.add('hidden');
        DOM.loginContainer.classList.remove('hidden');

        // Reset form and errors
        DOM.loginForm.reset();
        DOM.loginError.classList.add('hidden');
        hideLoader();
    }, 500);
}

function login() {
    // Init data first
    initDashboardData();

    // Transition UI
    DOM.loginContainer.classList.add('hidden');
    DOM.dashboardContainer.classList.remove('hidden');

    // Set default date input
    const today = new Date();
    DOM.historyDateInput.value = today.toISOString().split('T')[0];

    hideLoader();

    // Resize chart once visible
    setTimeout(() => {
        if (chartInstance) {
            chartInstance.resize();
        }
    }, 100);
}

/* =========================================
   DASHBOARD LOGIC & FIREBASE
   ========================================= */
function initDashboardData() {
    if (!firebaseListenerActive) {
        firebaseListenerActive = true;

        onValue(dataRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Keep track of the previously selected filter to avoid jarring UI resets
                let currentFilter = 'ALL';
                if (DOM.deviceFilter && DOM.deviceFilter.value) {
                    currentFilter = DOM.deviceFilter.value;
                }

                // Get fresh device IDs from Firebase
                const newDeviceIds = Object.keys(data);

                // Merge with any devices we already know about from Cache
                DEVICE_IDS = [...new Set([...DEVICE_IDS, ...newDeviceIds])];

                populateDeviceFilter(currentFilter);

                // Process all Labs in the map dynamically
                DEVICE_IDS.forEach(labId => {
                    const record = data[labId];
                    if (!record) return;

                    // Handle New Format: { humidity, temperature, timestamp } directly under LAB ID
                    if (record.temperature !== undefined) {
                        let timestamp = Date.now();
                        if (record.timestamp) {
                            timestamp = new Date(record.timestamp.replace(' ', 'T')).getTime();
                            if (isNaN(timestamp)) timestamp = new Date(record.timestamp).getTime();
                        }

                        // Check if we already have this record to prevent duplicate entries from multiple snapshot fires
                        const isDuplicate = allData.some(d => d.device_id === labId && d.timestamp === timestamp);
                        if (!isDuplicate) {
                            allData.push({
                                pushId: timestamp.toString(),
                                id: '',
                                device_id: labId,
                                timestamp: timestamp || Date.now(),
                                temperature: parseFloat(record.temperature),
                                humidity: parseFloat(record.humidity)
                            });
                        }
                    }
                    // Handle Old Format (Fall back): { "-pushID": { ... }, "-pushID2": { ... } }
                    else {
                        const labEntries = Object.entries(record);
                        labEntries.forEach(([pushId, rec]) => {
                            if (!rec || rec.temperature === undefined) return;

                            let timestamp = Date.now();
                            if (rec.timestamp) {
                                timestamp = new Date(rec.timestamp.replace(' ', 'T')).getTime();
                                if (isNaN(timestamp)) timestamp = new Date(rec.timestamp).getTime();
                            }

                            // Filter legacy duplicate data
                            const dateObj = new Date(timestamp);
                            if (dateObj.getFullYear() === 2026 && dateObj.getMonth() === 2 && dateObj.getDate() === 8) {
                                const hour = dateObj.getHours(), min = dateObj.getMinutes();
                                if (hour === 5 || (hour === 10 && min <= 35) || (hour === 16 && min <= 35)) return;
                            }

                            const isDuplicate = allData.some(d => d.device_id === labId && d.pushId === pushId);
                            if (!isDuplicate) {
                                allData.push({
                                    pushId: pushId,
                                    id: '',
                                    device_id: labId,
                                    timestamp: timestamp || Date.now(),
                                    temperature: parseFloat(rec.temperature),
                                    humidity: parseFloat(rec.humidity)
                                });
                            }
                        });
                    }
                });

                // Sort descending (newest first) by timestamp (fallback to Push ID if dates match)
                allData.sort((a, b) => {
                    if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
                    if (a.pushId > b.pushId) return -1;
                    if (a.pushId < b.pushId) return 1;
                    return 0;
                });

                // We no longer cap the records array so that all 24-hours remain accessible
                // while the dashboard stays open. If memory issues arise, this should be capped
                // at ~10,000 records instead of 400.
                if (allData.length > 20000) {
                    allData = allData.slice(0, 20000);
                }

                // Assign Sequential visual IDs based on accumulation size
                allData.forEach((rec, index) => {
                    rec.id = `REC-${String(allData.length - index).padStart(4, '0')}`;
                });

                // FORCE SAVE: Save the accumulated memory array to LocalStorage
                // so it survives logouts and page refreshes.
                if (!isHistoryMode) {
                    try {
                        localStorage.setItem('tyrolit_history', JSON.stringify(allData));
                    } catch (e) {
                        console.error("Local storage quota exceeded or failed", e);
                    }

                    // CHECK ALERTS: Check for temperatures > 40 on the newest data
                    if (allData.length > 0) {
                        const latest = allData[0];
                        if (latest.temperature > 40) {
                            // Create a unique key for this specific incident (lab + time)
                            const alertKey = `${latest.device_id}_${latest.timestamp}`;

                            if (!notifiedAlerts.has(alertKey)) {
                                notifiedAlerts.add(alertKey);
                                showToast(
                                    "CRITICAL TEMPERATURE",
                                    `${latest.device_id} has exceeded safe limits: ${latest.temperature}°C`
                                );
                            }
                        }
                    }
                }

                handleFilterChange(); // Refresh dashboard
            }
        });
    } else {
        // If re-logging in and listener already active, just refresh
        if (!isHistoryMode) {
            handleFilterChange();
        }
    }
}

async function loadHistoryForDate(dateString) {
    showLoader();
    isHistoryMode = true;
    historyDateStr = dateString;

    // Turn off live listener
    if (firebaseListenerActive) {
        off(dataRef);
        firebaseListenerActive = false;
    }

    // Toggle Buttons
    DOM.searchHistoryBtn.style.display = 'none';
    DOM.liveModeBtn.style.display = 'inline-flex';
    DOM.dashboardContainer.classList.add('history-active'); // For potential CSS hooks

    try {
        // Fetch all data (This assumes Firebase structure isn't perfectly indexed by date yet)
        // If data gets huge, this query needs to be strictly constrained by orderByKey and limitToLast
        const snapshot = await get(dataRef);
        const data = snapshot.val();

        allData = []; // Clear array for history

        if (data) {
            const currentFilter = DOM.deviceFilter.value;
            DEVICE_IDS = Object.keys(data);
            populateDeviceFilter(currentFilter);

            const targetTimestampStart = new Date(dateString + 'T00:00:00').getTime();
            const targetTimestampEnd = new Date(dateString + 'T23:59:59.999').getTime();

            DEVICE_IDS.forEach(labId => {
                const record = data[labId];
                if (!record) return;

                // Handle nested structure {"-pushID": {...}}
                const labEntries = Object.entries(record);
                labEntries.forEach(([pushId, rec]) => {
                    if (!rec || rec.temperature === undefined) return;

                    let timestamp = Date.now();
                    if (rec.timestamp) {
                        timestamp = new Date(rec.timestamp.replace(' ', 'T')).getTime();
                        if (isNaN(timestamp)) timestamp = new Date(rec.timestamp).getTime();
                    }

                    // Only include if timestamp falls within the selected date
                    if (timestamp >= targetTimestampStart && timestamp <= targetTimestampEnd) {
                        allData.push({
                            pushId: pushId,
                            id: '',
                            device_id: labId,
                            timestamp: timestamp,
                            temperature: parseFloat(rec.temperature),
                            humidity: parseFloat(rec.humidity)
                        });
                    }
                });
            });

            // Sort descending (newest at top of table)
            allData.sort((a, b) => b.timestamp - a.timestamp);

            // Assign Sequential visual IDs
            allData.forEach((rec, index) => {
                rec.id = `REC-${String(allData.length - index).padStart(4, '0')}`;
            });
        }

        handleFilterChange();

    } catch (error) {
        console.error("Error fetching history:", error);
        alert("Failed to fetch historical data.");
    } finally {
        hideLoader();
    }
}

function handleSearchHistory() {
    const selectedDate = DOM.historyDateInput.value;
    if (!selectedDate) {
        alert("Please select a date first.");
        return;
    }
    loadHistoryForDate(selectedDate);
}

function handleBackToLive() {
    isHistoryMode = false;
    historyDateStr = null;
    allData = []; // Clear history data so live rebuilds it

    DOM.searchHistoryBtn.style.display = 'inline-flex';
    DOM.liveModeBtn.style.display = 'none';

    showLoader();
    // Re-init Live Data Stream
    initDashboardData();
    setTimeout(hideLoader, 800); // UI transition fake delay
}

function populateDeviceFilter(currentFilter) {
    DOM.deviceFilter.innerHTML = '<option value="ALL">All Devices</option>';

    DEVICE_IDS.forEach(device => {
        const option = document.createElement('option');
        option.value = device;
        option.textContent = device;
        DOM.deviceFilter.appendChild(option);
    });

    // Restore selection if previously selected filter is still valid
    if (currentFilter && (currentFilter === 'ALL' || DEVICE_IDS.includes(currentFilter))) {
        DOM.deviceFilter.value = currentFilter;
    }
}

function handleFilterChange() {
    const selectedDevice = DOM.deviceFilter.value;

    if (selectedDevice === 'ALL') {
        filteredData = [...allData];
    } else {
        filteredData = allData.filter(d => d.device_id === selectedDevice);
    }

    updateDashboard();
}

function updateDashboard() {
    if (isHistoryMode) {
        updateHistoryCards();
    } else {
        updateLiveCards();
    }
    updateChart();
    updateTable();
    updateComparisonTable();
}

/* =========================================
   UI UPDATES
   ========================================= */
function getStatusClass(temp) {
    if (temp > 40) return 'status-danger';
    if (temp >= 30) return 'status-warning';
    return 'status-good';
}

function getStatusText(temp) {
    if (temp > 40) return 'DANGER';
    if (temp >= 30) return 'WARNING';
    return 'GOOD';
}

function updateLiveCards() {
    if (filteredData.length === 0) {
        DOM.latestTemp.textContent = '--';
        DOM.latestHumidity.textContent = '--';
        DOM.labStatus.className = 'status-indicator status-unknown';
        DOM.labStatus.innerHTML = '<span>UNKNOWN</span>';
        return;
    }

    // Data is sorted newest first, so [0] is the latest
    const latest = filteredData[0];
    const statusClass = getStatusClass(latest.temperature);
    const statusText = getStatusText(latest.temperature);
    const timeStr = `Updated: ${new Date(latest.timestamp).toLocaleTimeString()}`;

    // Animate numbers (simple re-render adds dynamic feel)
    DOM.latestTemp.style.opacity = '0.5';
    DOM.latestHumidity.style.opacity = '0.5';
    DOM.labStatus.style.opacity = '0.5';

    setTimeout(() => {
        DOM.latestTemp.textContent = latest.temperature;
        DOM.latestHumidity.textContent = latest.humidity;

        // Push Realtime Timestamps
        const tempTime = document.getElementById('temp-time');
        const humTime = document.getElementById('hum-time');
        const statTime = document.getElementById('stat-time');
        if (tempTime) tempTime.textContent = timeStr;
        if (humTime) humTime.textContent = timeStr;
        if (statTime) statTime.textContent = timeStr;

        DOM.labStatus.className = `status-indicator ${statusClass}`;
        DOM.labStatus.innerHTML = `<span>${statusText}</span>`;

        DOM.latestTemp.style.opacity = '1';
        DOM.latestHumidity.style.opacity = '1';
        DOM.labStatus.style.opacity = '1';
    }, 150);
}

function updateHistoryCards() {
    if (filteredData.length === 0) {
        DOM.latestTemp.textContent = '--';
        DOM.latestHumidity.textContent = '--';
        DOM.labStatus.className = 'status-indicator status-unknown';
        DOM.labStatus.innerHTML = '<span>UNKNOWN</span>';

        // Update labels to say 'History' instead of logic relying on real time
        const headers = document.querySelectorAll('.data-card h3');
        if (headers.length >= 2) {
            headers[0].textContent = "Avg Temperature";
            headers[1].textContent = "Avg Humidity";
        }
        return;
    }

    // Calculate Averages for the selected history period
    let sumTemp = 0;
    let sumHum = 0;
    filteredData.forEach(d => {
        sumTemp += d.temperature;
        sumHum += d.humidity;
    });

    const avgTemp = (sumTemp / filteredData.length).toFixed(1);
    const avgHum = (sumHum / filteredData.length).toFixed(1);

    const statusClass = getStatusClass(avgTemp);

    // Update labels to show we are looking at averages for history
    const headers = document.querySelectorAll('.data-card h3');
    if (headers.length >= 2) {
        headers[0].textContent = "Daily Avg Temp";
        headers[1].textContent = "Daily Avg Humidity";
    }

    DOM.latestTemp.textContent = avgTemp;
    DOM.latestHumidity.textContent = avgHum;

    const tempTime = document.getElementById('temp-time');
    const humTime = document.getElementById('hum-time');
    const statTime = document.getElementById('stat-time');
    if (tempTime) tempTime.textContent = `Records: ${filteredData.length}`;
    if (humTime) humTime.textContent = `Date: ${historyDateStr}`;
    if (statTime) statTime.textContent = `Status Based on Avg`;

    DOM.labStatus.className = `status-indicator ${statusClass}`;
    DOM.labStatus.innerHTML = `<span>HISTORY VIEW</span>`;
}

function updateChart() {
    if (filteredData.length === 0) {
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
        DOM.chartCanvas.style.display = 'none';
        DOM.chartEmptyState.classList.remove('hidden');
        return;
    }

    DOM.chartCanvas.style.display = 'block';
    DOM.chartEmptyState.classList.add('hidden');

    // Prepare chart data (sort ascending by time for chart)
    const chartData = [...filteredData].sort((a, b) => a.timestamp - b.timestamp);

    // For live tracking, keep it short. For history, we might want to see more nodes
    let displayData = chartData;
    if (!isHistoryMode) {
        // Limit to latest 15 points to avoid clutter in live mode
        displayData = chartData.slice(-15);
    } else {
        // In history mode, if there are thousands of points, sample them evenly
        if (displayData.length > 50) {
            const step = Math.ceil(displayData.length / 50);
            displayData = displayData.filter((_, index) => index % step === 0);
        }
    }

    const labels = displayData.map(d => {
        const date = new Date(d.timestamp);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
    });

    const temps = displayData.map(d => d.temperature);
    const hums = displayData.map(d => d.humidity);

    const config = {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: temps,
                    borderColor: '#ff4b4b',
                    backgroundColor: 'rgba(255, 75, 75, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'Humidity (%)',
                    data: hums,
                    borderColor: '#00d2ff',
                    backgroundColor: 'rgba(0, 210, 255, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 0 // Disable animation to prevent visual bugs when updating fast
            },
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    labels: { color: '#e2e8f0' }
                },
                tooltip: {
                    backgroundColor: 'rgba(18, 24, 38, 0.9)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#e2e8f0',
                    borderColor: '#2a3441',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { color: '#2a3441' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: { color: '#2a3441' },
                    ticks: { color: '#94a3b8' },
                    title: { display: true, text: 'Temperature (°C)', color: '#94a3b8' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#94a3b8' },
                    title: { display: true, text: 'Humidity (%)', color: '#94a3b8' }
                }
            }
        }
    };

    if (chartInstance) {
        chartInstance.data = config.data;
        chartInstance.update();
    } else {
        const ctx = DOM.chartCanvas.getContext('2d');
        // Ensure globals
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.font.family = "'Inter', sans-serif";
        chartInstance = new Chart(ctx, config);
    }
}

function updateTable() {
    DOM.tableBody.innerHTML = '';

    if (filteredData.length === 0) {
        DOM.dataTable.parentElement.classList.add('hidden');
        DOM.tableEmptyState.classList.remove('hidden');
        return;
    }

    DOM.dataTable.parentElement.classList.remove('hidden');
    DOM.tableEmptyState.classList.add('hidden');

    filteredData.forEach(row => {
        const tr = document.createElement('tr');

        // Format timestamp safely
        const dateStr = new Date(row.timestamp).toLocaleString();

        // Define temp class based on status
        let tempClass = '';
        if (row.temperature > 40) tempClass = 'text-danger';
        else if (row.temperature >= 30) tempClass = 'text-warning';
        else tempClass = 'text-good';

        // The HTML structure strictly matches the 5 columns with fixed widths
        tr.innerHTML = `
            <td title="${row.id}">${row.id}</td>
            <td title="${row.device_id}">${row.device_id}</td>
            <td title="${dateStr}">${dateStr}</td>
            <td class="${tempClass}" title="${row.temperature}">${row.temperature}</td>
            <td title="${row.humidity}">${row.humidity}</td>
        `;

        DOM.tableBody.appendChild(tr);
    });
}

function updateComparisonTable() {
    DOM.comparisonTableBody.innerHTML = '';

    if (allData.length === 0) {
        DOM.comparisonTable.parentElement.classList.add('hidden');
        DOM.comparisonEmptyState.classList.remove('hidden');
        return;
    }

    DOM.comparisonTable.parentElement.classList.remove('hidden');
    DOM.comparisonEmptyState.classList.add('hidden');

    // Group data by minute
    const grouped = {};

    // We use allData to compare across all labs regardless of the individual device filter
    allData.forEach(d => {
        const dateObj = new Date(d.timestamp);
        // Create a sortable key up to the minute
        const timeKey = `${dateObj.toLocaleDateString()} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;

        if (!grouped[timeKey]) {
            grouped[timeKey] = {
                timestamp: Math.floor(d.timestamp / 60000) * 60000,
                timeStr: timeKey,
                temps: {},
                devices: []
            };
        }

        // Only keep the latest reading for a device within that same minute block
        if (grouped[timeKey].temps[d.device_id] === undefined) {
            grouped[timeKey].temps[d.device_id] = d.temperature;
            grouped[timeKey].devices.push(d.device_id);
        }
    });

    const comparisonRows = Object.values(grouped);

    // Sort descending by timestamp
    comparisonRows.sort((a, b) => b.timestamp - a.timestamp);

    // Limit to 100 recent minutes for performance
    const displayRows = comparisonRows.slice(0, 100);

    displayRows.forEach(row => {
        const tr = document.createElement('tr');

        const temps = Object.values(row.temps);
        if (temps.length === 0) return;

        const maxTemp = Math.max(...temps);
        const minTemp = Math.min(...temps);

        const maxLabs = Object.keys(row.temps).filter(k => row.temps[k] === maxTemp).join(', ');
        const minLabs = Object.keys(row.temps).filter(k => row.temps[k] === minTemp).join(', ');

        let maxClass = maxTemp > 40 ? 'text-danger' : (maxTemp >= 30 ? 'text-warning' : 'text-good');
        let minClass = minTemp > 40 ? 'text-danger' : (minTemp >= 30 ? 'text-warning' : 'text-good');

        tr.innerHTML = `
            <td title="${row.timeStr}">${row.timeStr}</td>
            <td title="${row.devices.join(', ')}">${row.devices.length} Labs <span style="font-size:0.7em; color:#64748b;">(${row.devices.join(', ')})</span></td>
            <td class="${maxClass}" title="Max Temp: ${maxTemp}°C (${maxLabs})">${maxTemp} <span style="font-size:0.7em; color:#64748b;">(${maxLabs})</span></td>
            <td class="${minClass}" title="Min Temp: ${minTemp}°C (${minLabs})">${minTemp} <span style="font-size:0.7em; color:#64748b;">(${minLabs})</span></td>
        `;

        DOM.comparisonTableBody.appendChild(tr);
    });
}

function exportCsv() {
    // Export allData instead of filteredData if they want the whole day's record for all labs.
    // If they want only filtered, we can switch this back, but the request implies 
    // "tracks all day record in the form of excel sheet"
    const dataToExport = isHistoryMode || DOM.deviceFilter.value === 'ALL' ? allData : filteredData;

    if (dataToExport.length === 0) {
        alert("No data to export.");
        return;
    }

    // Force Excel to open CSV correctly with UTF-8 BOM
    const BOM = "\uFEFF";

    // Create Excel-friendly CSV header
    const headers = ['Record ID', 'Lab Device ID', 'Date', 'Time', 'Temperature (°C)', 'Humidity (%)'];
    let csvContent = BOM + headers.join(',') + '\n';

    // Add rows
    // Sort chronologically (oldest to newest) for a standard Excel log sheet look
    const sortedData = [...dataToExport].sort((a, b) => a.timestamp - b.timestamp);

    sortedData.forEach(row => {
        const dateObj = new Date(row.timestamp);

        // Excel-safe date/time formatting (preventing auto-format destruction)
        const dateStr = dateObj.toLocaleDateString();
        // Force time string formatting
        const timeStr = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}:${dateObj.getSeconds().toString().padStart(2, '0')}`;

        const rowData = [
            row.id,
            row.device_id,
            `"${dateStr}"`,  // Quote wrap to prevent comma collision
            `"${timeStr}"`,
            row.temperature,
            row.humidity
        ];
        csvContent += rowData.join(',') + '\n';
    });

    // Download via Blob as CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    const fileNameDate = isHistoryMode ? historyDateStr : new Date().toISOString().split('T')[0];
    link.setAttribute('download', `Tyrolit_Log_${fileNameDate}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/* =========================================
   UTILITIES
   ========================================= */
function showLoader() {
    DOM.loader.classList.remove('hidden');
}

function hideLoader() {
    DOM.loader.classList.add('hidden');
}

function showToast(title, message) {
    if (!DOM.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast';

    toast.innerHTML = `
        <div class="toast-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div class="toast-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
        <button class="toast-close">&times;</button>
    `;

    DOM.toastContainer.appendChild(toast);

    // Fade in
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Setup close button
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));

    // Auto remove after 5 seconds
    setTimeout(() => {
        removeToast(toast);
    }, 5000);
}

function removeToast(toastElement) {
    toastElement.classList.remove('show');
    // Wait for slide-out animation to finish before removing from DOM
    setTimeout(() => {
        if (toastElement.parentNode) {
            toastElement.parentNode.removeChild(toastElement);
        }
    }, 300);
}

/* =========================================
   EVENT LISTENERS
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    DOM.loginForm.addEventListener('submit', handleLogin);
    DOM.logoutBtn.addEventListener('click', handleLogout);
    DOM.deviceFilter.addEventListener('change', handleFilterChange);
    DOM.exportBtn.addEventListener('click', exportCsv);
    DOM.searchHistoryBtn.addEventListener('click', handleSearchHistory);
    DOM.liveModeBtn.addEventListener('click', handleBackToLive);
});
