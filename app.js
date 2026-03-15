/* =========================================
   FIREBASE & STATE INITIALIZATION
   ========================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
<<<<<<< HEAD
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app-check.js";

const firebaseConfig = {
    apiKey: "AIzaSyB_3hCOBFKGMxzqd5ByK3PbBZb4F3IrTPI",
=======
import { getDatabase, ref, onValue, get, off } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyB_3hC0BFKGMxzqd5ByK3PbBZb4F3IrTPI",
>>>>>>> d1c3ead52b4416c6a20ad3d772f79fac5222a0bb
    authDomain: "raspberry-pi-iot-f7707.firebaseapp.com",
    databaseURL: "https://raspberry-pi-iot-f7707-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "raspberry-pi-iot-f7707",
    storageBucket: "raspberry-pi-iot-f7707.firebasestorage.app",
    messagingSenderId: "679880318889",
    appId: "1:679880318889:web:f0014e5cdac0098172aeb8"
};

const app = initializeApp(firebaseConfig);
<<<<<<< HEAD

const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('6Ld29ocsAAAAANthT-xuQ-7kpfhxIOHtY2Kj7DhE'),
    isTokenAutoRefreshEnabled: true
});

const database = getDatabase(app);

const BUILDINGS = ['Building 1', 'Building 2', 'Building 3'];
let allData = [];
let filteredData = [];
let firebaseListenerActive = false;

=======
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

>>>>>>> d1c3ead52b4416c6a20ad3d772f79fac5222a0bb
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
<<<<<<< HEAD

    // Cards
    // Cards & Table
    liveDataSection: document.getElementById('live-data-section'),
    liveCardContainer: document.getElementById('live-card-container'),
    tableBody: document.getElementById('table-body'),
    tableEmptyState: document.getElementById('table-empty-state'),
    emptyMessage: document.getElementById('empty-message'),
    dataTable: document.getElementById('data-table')
=======
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
>>>>>>> d1c3ead52b4416c6a20ad3d772f79fac5222a0bb
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
<<<<<<< HEAD
    hideLoader();
=======

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
>>>>>>> d1c3ead52b4416c6a20ad3d772f79fac5222a0bb
}

/* =========================================
   DASHBOARD LOGIC & FIREBASE
   ========================================= */
function initDashboardData() {
    if (!firebaseListenerActive) {
        firebaseListenerActive = true;

<<<<<<< HEAD
        const dataRef = ref(database, 'labs');
        onValue(dataRef, (snapshot) => {
            const data = snapshot.val();
            allData = [];

            if (data) {
                // Parse the new structure
                // labs -> keys -> areas
                const records = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }));

                records.forEach(record => {
                    const areas = record.areas || {};
                    
                    const bArea = areas["B Area"] || {};
                    const dArea = areas["D Area"] || {};
                    const fArea = areas["F Area"] || {};

                    // Extract temps
                    const bTemp = parseFloat(bArea.temperature);
                    const dTemp = parseFloat(dArea.temperature);
                    const fTemp = parseFloat(fArea.temperature);
                    const temps = [bTemp, dTemp, fTemp].filter(t => !isNaN(t));
                    
                    // Extract hums
                    const bHum = parseFloat(bArea.humidity);
                    const dHum = parseFloat(dArea.humidity);
                    const fHum = parseFloat(fArea.humidity);
                    const hums = [bHum, dHum, fHum].filter(h => !isNaN(h));

                    // Use precalculated min/max if present, else calculate
                    const maxTemp = record.max_temperature !== undefined ? parseFloat(record.max_temperature) : (temps.length > 0 ? Math.max(...temps) : NaN);
                    const minTemp = record.min_temperature !== undefined ? parseFloat(record.min_temperature) : (temps.length > 0 ? Math.min(...temps) : NaN);
                    const maxHum = record.max_humidity !== undefined ? parseFloat(record.max_humidity) : (hums.length > 0 ? Math.max(...hums) : NaN);
                    const minHum = record.min_humidity !== undefined ? parseFloat(record.min_humidity) : (hums.length > 0 ? Math.min(...hums) : NaN);

                    // Only push if there's at least one sensible reading or min/max overrides exist
                    if (temps.length > 0 || hums.length > 0 || !isNaN(maxTemp)) {
                        let ts = Date.now();
                        if (record.timestamp) {
                            // If timestamp is like "2026-03-12 10:00:00", Date.parse might handle it or we use number
                            const parsedDate = new Date(record.timestamp);
                            if (!isNaN(parsedDate.getTime())) {
                                ts = parsedDate.getTime();
                            }
                        }
                        
                        allData.push({
                            id: record.id,
                            timestamp: ts,
                            bTemp: isNaN(bTemp) ? 'N/A' : bTemp, 
                            dTemp: isNaN(dTemp) ? 'N/A' : dTemp, 
                            fTemp: isNaN(fTemp) ? 'N/A' : fTemp,
                            maxTemp: isNaN(maxTemp) ? 'N/A' : maxTemp.toFixed(2),
                            minTemp: isNaN(minTemp) ? 'N/A' : minTemp.toFixed(2),
                            bHum: isNaN(bHum) ? 'N/A' : bHum, 
                            dHum: isNaN(dHum) ? 'N/A' : dHum, 
                            fHum: isNaN(fHum) ? 'N/A' : fHum,
                            maxHum: isNaN(maxHum) ? 'N/A' : maxHum.toFixed(2),
                            minHum: isNaN(minHum) ? 'N/A' : minHum.toFixed(2),
                            timestampOriginal: record.timestamp
=======
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
>>>>>>> d1c3ead52b4416c6a20ad3d772f79fac5222a0bb
                        });
                    }
                });

<<<<<<< HEAD
                // Sort descending (newest first)
                allData.sort((a, b) => b.timestamp - a.timestamp);
            }

            handleFilterChange(); // Refresh dashboard
        });
    } else {
        // If re-logging in and listener already active, just refresh
        handleFilterChange();
=======
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
>>>>>>> d1c3ead52b4416c6a20ad3d772f79fac5222a0bb
    }
}

function handleFilterChange() {
<<<<<<< HEAD
    const selectedBuilding = DOM.deviceFilter.value;

    if (selectedBuilding === 'Building 1') {
        filteredData = [...allData];
    } else {
        filteredData = [];
=======
    const selectedDevice = DOM.deviceFilter.value;

    if (selectedDevice === 'ALL') {
        filteredData = [...allData];
    } else {
        filteredData = allData.filter(d => d.device_id === selectedDevice);
>>>>>>> d1c3ead52b4416c6a20ad3d772f79fac5222a0bb
    }

    updateDashboard();
}

function updateDashboard() {
<<<<<<< HEAD
    updateTable();
=======
    if (isHistoryMode) {
        updateHistoryCards();
    } else {
        updateLiveCards();
    }
    updateChart();
    updateTable();
    updateComparisonTable();
>>>>>>> d1c3ead52b4416c6a20ad3d772f79fac5222a0bb
}

/* =========================================
   UI UPDATES
   ========================================= */
<<<<<<< HEAD
function updateTable() {
    DOM.tableBody.innerHTML = '';
    
    const selectedBuilding = DOM.deviceFilter.value;

    if (selectedBuilding !== 'Building 1') {
        DOM.dataTable.parentElement.classList.add('hidden');
        DOM.tableEmptyState.classList.remove('hidden');
        DOM.emptyMessage.textContent = 'No sensors installed in this building.';
        DOM.liveDataSection.classList.remove('hidden'); // MUST BE VISIBLE
        renderLatestCard(null); // Explicitly show N/A card
        return;
    }

    if (filteredData.length === 0) {
        DOM.dataTable.parentElement.classList.add('hidden');
        DOM.tableEmptyState.classList.remove('hidden');
        DOM.emptyMessage.textContent = 'No data available.';
        DOM.liveDataSection.classList.remove('hidden'); // MUST BE VISIBLE
        renderLatestCard(null); // Explicitly show N/A card
=======
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
>>>>>>> d1c3ead52b4416c6a20ad3d772f79fac5222a0bb
        return;
    }

    DOM.dataTable.parentElement.classList.remove('hidden');
    DOM.tableEmptyState.classList.add('hidden');
<<<<<<< HEAD
    
    // Process all data for the table
    filteredData.forEach(row => {
        const tr = document.createElement('tr');

        // Formatted to exactly match prompt
        let dateStr = "";
        if (row.timestampOriginal) {
             dateStr = row.timestampOriginal;
        } else {
             dateStr = new Date(row.timestamp).toLocaleString();
        }

        tr.innerHTML = `
            <td>${dateStr}</td>
            <td>${row.bTemp}</td>
            <td>${row.dTemp}</td>
            <td>${row.fTemp}</td>
            <td>${row.maxTemp}</td>
            <td>${row.minTemp}</td>
            <td>${row.maxHum}</td>
            <td>${row.minHum}</td>
=======

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
>>>>>>> d1c3ead52b4416c6a20ad3d772f79fac5222a0bb
        `;

        DOM.tableBody.appendChild(tr);
    });
<<<<<<< HEAD

    // Process the latest reading for the card view
    DOM.liveDataSection.classList.remove('hidden');
    if (filteredData.length > 0) {
        renderLatestCard(filteredData[0]);
    } else {
        renderLatestCard(null); // Show N/A card
    }
}

function renderLatestCard(row) {
    DOM.liveCardContainer.innerHTML = '';
    
    // If no data, render an N/A card
    if (!row) {
        const nullCardHTML = `
            <div class="history-card live-card">
                <div class="history-card-header">
                    <span class="history-timestamp" style="color: var(--text-muted);">🕒 No recent reading</span>
                </div>
                <div class="history-areas">
                    <div class="area-block">
                        <div class="area-title">B Area</div>
                        <div class="area-metric">
                            <span class="area-metric-label">Temp</span>
                            <span class="area-metric-val">N/A</span>
                        </div>
                        <div class="area-metric">
                            <span class="area-metric-label">Hum</span>
                            <span class="area-metric-val">N/A</span>
                        </div>
                    </div>
                    <div class="area-block">
                        <div class="area-title">D Area</div>
                        <div class="area-metric">
                            <span class="area-metric-label">Temp</span>
                            <span class="area-metric-val">N/A</span>
                        </div>
                        <div class="area-metric">
                            <span class="area-metric-label">Hum</span>
                            <span class="area-metric-val">N/A</span>
                        </div>
                    </div>
                    <div class="area-block">
                        <div class="area-title">F Area</div>
                        <div class="area-metric">
                            <span class="area-metric-label">Temp</span>
                            <span class="area-metric-val">N/A</span>
                        </div>
                        <div class="area-metric">
                            <span class="area-metric-label">Hum</span>
                            <span class="area-metric-val">N/A</span>
                        </div>
                    </div>
                </div>
                <div class="history-footer">
                    <div class="minmax-block">
                        <div class="minmax-title">Temperature</div>
                        <div class="minmax-row">
                            <span class="minmax-label">Max:</span>
                            <span class="minmax-val">N/A</span>
                        </div>
                        <div class="minmax-row">
                            <span class="minmax-label">Min:</span>
                            <span class="minmax-val">N/A</span>
                        </div>
                    </div>
                    <div class="minmax-block">
                        <div class="minmax-title">Humidity</div>
                        <div class="minmax-row">
                            <span class="minmax-label">Max:</span>
                            <span class="minmax-val">N/A</span>
                        </div>
                        <div class="minmax-row">
                            <span class="minmax-label">Min:</span>
                            <span class="minmax-val">N/A</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        DOM.liveCardContainer.innerHTML = nullCardHTML;
        return;
    }

    let dateStr = "";
    if (row.timestampOriginal) {
         dateStr = row.timestampOriginal;
    } else {
         dateStr = new Date(row.timestamp).toLocaleString();
    }

    const getTempClass = (temp) => {
        if (temp === 'N/A') return '';
        if (temp > 40) return 'text-danger';
        if (temp >= 30) return 'text-warning';
        return 'text-good';
    };

    const cardHTML = `
        <div class="history-card live-card">
            <div class="history-card-header">
                <span class="history-timestamp">🕒 ${dateStr}</span>
            </div>
            <div class="history-areas">
                <div class="area-block">
                    <div class="area-title">B Area</div>
                    <div class="area-metric">
                        <span class="area-metric-label">Temp</span>
                        <span class="area-metric-val ${getTempClass(row.bTemp)}">${row.bTemp} ${row.bTemp === 'N/A' ? '' : '°C'}</span>
                    </div>
                    <div class="area-metric">
                        <span class="area-metric-label">Hum</span>
                        <span class="area-metric-val">${row.bHum} ${row.bHum === 'N/A' ? '' : '%'}</span>
                    </div>
                </div>
                <div class="area-block">
                    <div class="area-title">D Area</div>
                    <div class="area-metric">
                        <span class="area-metric-label">Temp</span>
                        <span class="area-metric-val ${getTempClass(row.dTemp)}">${row.dTemp} ${row.dTemp === 'N/A' ? '' : '°C'}</span>
                    </div>
                    <div class="area-metric">
                        <span class="area-metric-label">Hum</span>
                        <span class="area-metric-val">${row.dHum} ${row.dHum === 'N/A' ? '' : '%'}</span>
                    </div>
                </div>
                <div class="area-block">
                    <div class="area-title">F Area</div>
                    <div class="area-metric">
                        <span class="area-metric-label">Temp</span>
                        <span class="area-metric-val ${getTempClass(row.fTemp)}">${row.fTemp} ${row.fTemp === 'N/A' ? '' : '°C'}</span>
                    </div>
                    <div class="area-metric">
                        <span class="area-metric-label">Hum</span>
                        <span class="area-metric-val">${row.fHum} ${row.fHum === 'N/A' ? '' : '%'}</span>
                    </div>
                </div>
            </div>
            <div class="history-footer">
                <div class="minmax-block">
                    <div class="minmax-title">Temperature</div>
                    <div class="minmax-row">
                        <span class="minmax-label">Max:</span>
                        <span class="minmax-val ${getTempClass(row.maxTemp)}">${row.maxTemp} ${row.maxTemp === 'N/A' ? '' : '°C'}</span>
                    </div>
                    <div class="minmax-row">
                        <span class="minmax-label">Min:</span>
                        <span class="minmax-val ${getTempClass(row.minTemp)}">${row.minTemp} ${row.minTemp === 'N/A' ? '' : '°C'}</span>
                    </div>
                </div>
                <div class="minmax-block">
                    <div class="minmax-title">Humidity</div>
                    <div class="minmax-row">
                        <span class="minmax-label">Max:</span>
                        <span class="minmax-val">${row.maxHum} ${row.maxHum === 'N/A' ? '' : '%'}</span>
                    </div>
                    <div class="minmax-row">
                        <span class="minmax-label">Min:</span>
                        <span class="minmax-val">${row.minHum} ${row.minHum === 'N/A' ? '' : '%'}</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    DOM.liveCardContainer.innerHTML = cardHTML;
}

function exportCsv() {
    if (filteredData.length === 0) {
=======
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
>>>>>>> d1c3ead52b4416c6a20ad3d772f79fac5222a0bb
        alert("No data to export.");
        return;
    }

<<<<<<< HEAD
    // Create CSV header
    const headers = ['Timestamp_ISO', 'Timestamp_Local', 'B_Temp', 'D_Temp', 'F_Temp', 'Max_Temp', 'Min_Temp', 'B_Hum', 'D_Hum', 'F_Hum', 'Max_Hum', 'Min_Hum'];
    let csvContent = headers.join(',') + '\n';

    // Add rows
    filteredData.forEach(row => {
        const date = new Date(row.timestamp);
        const rowData = [
            date.toISOString(),
            date.toLocaleString().replace(/,/g, ''), // remove commas to protect CSV structure
            row.bTemp,
            row.dTemp,
            row.fTemp,
            row.maxTemp,
            row.minTemp,
            row.bHum,
            row.dHum,
            row.fHum,
            row.maxHum,
            row.minHum
=======
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
>>>>>>> d1c3ead52b4416c6a20ad3d772f79fac5222a0bb
        ];
        csvContent += rowData.join(',') + '\n';
    });

<<<<<<< HEAD
    // Download via Blob
=======
    // Download via Blob as CSV
>>>>>>> d1c3ead52b4416c6a20ad3d772f79fac5222a0bb
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
<<<<<<< HEAD
    link.setAttribute('download', `tyrolit_export_${new Date().getTime()}.csv`);
=======
    const fileNameDate = isHistoryMode ? historyDateStr : new Date().toISOString().split('T')[0];
    link.setAttribute('download', `Tyrolit_Log_${fileNameDate}.csv`);
>>>>>>> d1c3ead52b4416c6a20ad3d772f79fac5222a0bb
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

<<<<<<< HEAD
=======
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

>>>>>>> d1c3ead52b4416c6a20ad3d772f79fac5222a0bb
/* =========================================
   EVENT LISTENERS
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    DOM.loginForm.addEventListener('submit', handleLogin);
    DOM.logoutBtn.addEventListener('click', handleLogout);
    DOM.deviceFilter.addEventListener('change', handleFilterChange);
    DOM.exportBtn.addEventListener('click', exportCsv);
<<<<<<< HEAD
=======
    DOM.searchHistoryBtn.addEventListener('click', handleSearchHistory);
    DOM.liveModeBtn.addEventListener('click', handleBackToLive);
>>>>>>> d1c3ead52b4416c6a20ad3d772f79fac5222a0bb
});
