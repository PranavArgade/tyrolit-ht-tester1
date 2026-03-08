/* =========================================
   FIREBASE & STATE INITIALIZATION
   ========================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";

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
let filteredData = [];
let chartInstance = null;
let firebaseListenerActive = false;

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
    dataTable: document.getElementById('data-table')
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
                const currentFilter = DOM.deviceFilter.value;

                // Update available device IDs dynamically based on the keys available in "labs/"
                DEVICE_IDS = Object.keys(data);
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

                // Keep only last 400 records to prevent memory issues 
                if (allData.length > 400) {
                    allData = allData.slice(0, 400);
                }

                // Assign Sequential visual IDs based on accumulation size
                allData.forEach((rec, index) => {
                    rec.id = `REC-${String(allData.length - index).padStart(4, '0')}`;
                });

                handleFilterChange(); // Refresh dashboard
            }
        });
    } else {
        // If re-logging in and listener already active, just refresh
        handleFilterChange();
    }
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
    updateLiveCards();
    updateChart();
    updateTable();
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
    // Limit to latest 15 points to avoid clutter
    const displayData = chartData.slice(-15);

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

function exportCsv() {
    if (filteredData.length === 0) {
        alert("No data to export.");
        return;
    }

    // Create CSV header
    const headers = ['ID', 'Device_ID', 'Timestamp_ISO', 'Timestamp_Local', 'Temperature', 'Humidity'];
    let csvContent = headers.join(',') + '\n';

    // Add rows
    filteredData.forEach(row => {
        const date = new Date(row.timestamp);
        const rowData = [
            row.id,
            row.device_id,
            date.toISOString(),
            date.toLocaleString().replace(/,/g, ''), // remove commas to protect CSV structure
            row.temperature,
            row.humidity
        ];
        csvContent += rowData.join(',') + '\n';
    });

    // Download via Blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tyrolit_export_${new Date().getTime()}.csv`);
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

/* =========================================
   EVENT LISTENERS
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    DOM.loginForm.addEventListener('submit', handleLogin);
    DOM.logoutBtn.addEventListener('click', handleLogout);
    DOM.deviceFilter.addEventListener('change', handleFilterChange);
    DOM.exportBtn.addEventListener('click', exportCsv);
});
