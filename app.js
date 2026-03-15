/* =========================================
   FIREBASE & STATE INITIALIZATION
   ========================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app-check.js";

const firebaseConfig = {
    apiKey: "AIzaSyB_3hCOBFKGMxzqd5ByK3PbBZb4F3IrTPI",
    authDomain: "raspberry-pi-iot-f7707.firebaseapp.com",
    databaseURL: "https://raspberry-pi-iot-f7707-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "raspberry-pi-iot-f7707",
    storageBucket: "raspberry-pi-iot-f7707.firebasestorage.app",
    messagingSenderId: "679880318889",
    appId: "1:679880318889:web:f0014e5cdac0098172aeb8"
};

const app = initializeApp(firebaseConfig);

const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('6LehCYssAAAAAEqhs40WZbE-Qvi1ii1QaNdq-TGi'),
    isTokenAutoRefreshEnabled: true
});

const database = getDatabase(app);

const BUILDINGS = ['Building 1', 'Building 2', 'Building 3'];
let allData = [];
let filteredData = [];
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

    // Date Filters
    startDateInput: document.getElementById('start-date'),
    endDateInput: document.getElementById('end-date'),
    applyFilterBtn: document.getElementById('apply-filter-btn'),
    resetFilterBtn: document.getElementById('reset-filter-btn'),

    // Cards & Table
    liveDataSection: document.getElementById('live-data-section'),
    liveCardContainer: document.getElementById('live-card-container'),
    tableBody: document.getElementById('table-body'),
    tableEmptyState: document.getElementById('table-empty-state'),
    emptyMessage: document.getElementById('empty-message'),
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
        // Reset form and errors
        DOM.loginForm.reset();
        DOM.loginError.classList.add('hidden');
        hideLoader();
        navigateTo('/login');
    }, 500);
}

function login() {
    hideLoader();
    navigateTo('/dashboard');
}

/* =========================================
   ROUTING
   ========================================= */
function navigateTo(path) {
    if (window.location.pathname !== path) {
        history.pushState(null, '', path);
    }
    handleRoute();
}

function handleRoute() {
    let path = window.location.pathname;
    
    // Normalize trailing slash
    if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
    }

    if (path === '/dashboard') {
        DOM.loginContainer.classList.add('hidden');
        DOM.dashboardContainer.classList.remove('hidden');
        initDashboardData();
    } else {
        // Default to login
        DOM.dashboardContainer.classList.add('hidden');
        DOM.loginContainer.classList.remove('hidden');
        if (path !== '/login' && path !== '/') {
            history.replaceState(null, '', '/login');
        }
    }
}

/* =========================================
   DASHBOARD LOGIC & FIREBASE
   ========================================= */
function initDashboardData() {
    if (!firebaseListenerActive) {
        firebaseListenerActive = true;

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
                        });
                    }
                });

                // Sort descending (newest first)
                allData.sort((a, b) => b.timestamp - a.timestamp);
            }

            handleFilterChange(); // Refresh dashboard
        });
    } else {
        // If re-logging in and listener already active, just refresh
        handleFilterChange();
    }
}

function handleFilterChange() {
    const selectedBuilding = DOM.deviceFilter.value;

    if (selectedBuilding === 'Building 1') {
        filteredData = [...allData];
    } else {
        filteredData = [];
    }

    // Apply Date Filtering
    applyDateFilter();
}

function applyDateFilter() {
    const startDateStr = DOM.startDateInput.value;
    const endDateStr = DOM.endDateInput.value;

    if (startDateStr && endDateStr) {
        // Create Date objects in local timezone, but force 00:00:00 and 23:59:59 boundaries
        const startParts = startDateStr.split('-');
        const endParts = endDateStr.split('-');
        
        // Year, Month (0-indexed), Day
        const startTime = new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0, 0).getTime();
        const endTime = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59, 999).getTime();

        filteredData = filteredData.filter(row => {
            return row.timestamp >= startTime && row.timestamp <= endTime;
        });
    }

    updateDashboard();
}

function resetDateFilter() {
    DOM.startDateInput.value = '';
    DOM.endDateInput.value = '';
    handleFilterChange();
}

function updateDashboard() {
    updateTable();
}

/* =========================================
   UI UPDATES
   ========================================= */
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
        return;
    }

    DOM.dataTable.parentElement.classList.remove('hidden');
    DOM.tableEmptyState.classList.add('hidden');
    
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
        `;

        DOM.tableBody.appendChild(tr);
    });

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

function exportExcel() {
    if (filteredData.length === 0) {
        alert("No data to export.");
        return;
    }

    // 1. Prepare Columns (Issue 1 & 6)
    const headers = [
        'Timestamp', 
        'B Area Temperature', 'D Area Temperature', 'F Area Temperature', 
        'Max Temperature', 'Min Temperature', 
        'B Area Humidity', 'D Area Humidity', 'F Area Humidity', 
        'Max Humidity', 'Min Humidity'
    ];

    const exportData = [headers];

    filteredData.forEach(row => {
        let tsStr = "";
        if (row.timestampOriginal) {
            tsStr = row.timestampOriginal;
        } else {
            tsStr = new Date(row.timestamp).toLocaleString();
        }

        const parseNum = (val) => val === 'N/A' || isNaN(parseFloat(val)) ? 'N/A' : parseFloat(val);

        exportData.push([
            tsStr,
            parseNum(row.bTemp),
            parseNum(row.dTemp),
            parseNum(row.fTemp),
            parseNum(row.maxTemp),
            parseNum(row.minTemp),
            parseNum(row.bHum),
            parseNum(row.dHum),
            parseNum(row.fHum),
            parseNum(row.maxHum),
            parseNum(row.minHum)
        ]);
    });

    // 2. Create Workbook and Worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(exportData);

    // 3. Styling & Formatting (Issue 3)
    const headerStyle = {
        font: { bold: true, color: { rgb: "000000" } },
        fill: { fgColor: { rgb: "D9EAD3" } }, // Light green/blue
        alignment: { horizontal: "center", vertical: "center" }
    };

    const dataStyle = {
        alignment: { horizontal: "right" },
        numFmt: "0.00" // 2 decimal places
    };
    
    const tsStyle = {
        alignment: { horizontal: "center" }
    };

    // Apply styles to cells
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[cellRef]) continue;

            if (R === 0) {
                // Header row
                ws[cellRef].s = headerStyle;
            } else {
                // Data rows
                if (C === 0) { // Timestamp column
                    ws[cellRef].s = tsStyle;
                } else if (ws[cellRef].v !== 'N/A') { // Numeric columns
                    ws[cellRef].t = 'n'; // Force Number type
                    ws[cellRef].s = dataStyle;
                } else {
                    ws[cellRef].s = { alignment: { horizontal: "center" } };
                }
            }
        }
    }

    // 4. Auto Column Padding (Issue 2 & 4)
    ws['!cols'] = [
        { wch: 25 }, // Timestamp
        { wch: 18 }, // B Temp
        { wch: 18 }, // D Temp
        { wch: 18 }, // F Temp
        { wch: 16 }, // Max Temp
        { wch: 16 }, // Min Temp
        { wch: 18 }, // B Hum
        { wch: 18 }, // D Hum
        { wch: 18 }, // F Hum
        { wch: 16 }, // Max Hum
        { wch: 16 }  // Min Hum
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Historical Data");

    // 5. Dynamic Filename (Issue 5)
    let filename = 'Tyrolit_Building1_Readings';
    const startDateStr = DOM.startDateInput.value;
    const endDateStr = DOM.endDateInput.value;

    if (startDateStr && endDateStr) {
        const formatForFilename = (dateStr) => {
            const parts = dateStr.split('-');
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        };
        const sDate = formatForFilename(startDateStr);
        const eDate = formatForFilename(endDateStr);
        
        if (sDate === eDate) {
            filename += `_${sDate}.xlsx`;
        } else {
            filename += `_${sDate}_to_${eDate}.xlsx`;
        }
    } else {
        const today = new Date();
        const ddStr = String(today.getDate()).padStart(2, '0');
        const mmStr = String(today.getMonth() + 1).padStart(2, '0');
        const yyStr = today.getFullYear();
        filename += `_${ddStr}-${mmStr}-${yyStr}.xlsx`;
    }

    // Save File
    XLSX.writeFile(wb, filename);
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
    DOM.exportBtn.addEventListener('click', exportExcel);
    DOM.applyFilterBtn.addEventListener('click', handleFilterChange);
    DOM.resetFilterBtn.addEventListener('click', resetDateFilter);

    // Initialize routing
    window.addEventListener('popstate', handleRoute);
    handleRoute();
});
