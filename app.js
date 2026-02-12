// Periyar Scale System - Dashboard JavaScript
let ws = null;
let isRecording = false;
let isConnected = false;

// Weight tracking
let currentWeight = 0;
let previousWeight = 0;
let stableWeightTimer = null;
let weightHistory = [];
let lastRecordedWeight = 0;
let isWeightStable = false;
let stableCount = 0;

// Session data
let sessionData = [];
let sessionTotal = 0;
let itemCount = 0;

// Settings (hardcoded defaults)
const STABLE_READINGS_NEEDED = 3; // Need 3 consecutive stable readings
const STABILITY_THRESHOLD = 10; // 10 grams difference
const serverUrl = "wss://backend-server-periyar.onrender.com/ws";

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Periyar Scale System initialized');
    console.log(`Settings: Stable Readings=${STABLE_READINGS_NEEDED}, Threshold=${STABILITY_THRESHOLD}g, Server=${serverUrl}`);
});

// Toggle WebSocket connection
function toggleConnection() {
    if (isConnected) {
        disconnect();
    } else {
        connect();
    }
}

// Connect to WebSocket server
function connect() {
    
    updateStatus('Connecting...', 'measuring');
    
    try {
        ws = new WebSocket(serverUrl);
        
        ws.onopen = function() {
            isConnected = true;
            updateStatus('Connected', 'stable');
            updateConnectionStatus(true);
            
            document.getElementById('connectBtn').textContent = 'Disconnect';
            document.getElementById('connectBtn').classList.remove('btn-primary');
            document.getElementById('connectBtn').classList.add('btn-danger');
            document.getElementById('startBtn').disabled = false;
            
            console.log('✅ Connected to server');
            
            // Register as dashboard client
            ws.send(JSON.stringify({
                type: 'register',
                clientType: 'dashboard',
                scaleId: 1
            }));
        };
        
        ws.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                handleMessage(data);
            } catch (e) {
                console.error('Error parsing message:', e);
            }
        };
        
        ws.onerror = function(error) {
            console.error('WebSocket error:', error);
            updateStatus('Connection error', 'waiting');
        };
        
        ws.onclose = function() {
            isConnected = false;
            updateStatus('Disconnected', 'waiting');
            updateConnectionStatus(false);
            
            document.getElementById('connectBtn').textContent = 'Connect';
            document.getElementById('connectBtn').classList.remove('btn-danger');
            document.getElementById('connectBtn').classList.add('btn-primary');
            document.getElementById('startBtn').disabled = true;
            document.getElementById('stopBtn').disabled = true;
            
            console.log('🔌 Disconnected from server');
            
            // Auto-reconnect after 5 seconds
            setTimeout(function() {
                if (!isConnected) {
                    console.log('Attempting to reconnect...');
                    connect();
                }
            }, 5000);
        };
        
    } catch (error) {
        console.error('Connection failed:', error);
        updateStatus('Connection failed', 'waiting');
    }
}

// Disconnect from server
function disconnect() {
    if (ws) {
        ws.close();
        ws = null;
    }
    
    if (isRecording) {
        stopRecording();
    }
}

// Handle incoming messages
function handleMessage(data) {
    if (data.type === 'welcome') {
        console.log('Welcome message:', data.data.message);
    } else if (data.type === 'weight') {
        handleWeightData(data.data);
    } else if (data.type === 'history') {
        console.log('Received history:', data.data.length, 'records');
    }
}

// Handle weight data
function handleWeightData(data) {
    // Convert to kg
    let weightInKg;
    if (data.unit === 'kg') {
        weightInKg = data.weight;
    } else {
        // Assume grams
        weightInKg = data.weight / 1000;
    }
    
    currentWeight = weightInKg;
    
    // Update display
    document.getElementById('currentWeight').textContent = currentWeight.toFixed(3);
    
    // Check for weight stability if recording
    if (isRecording) {
        checkWeightStability();
    } else {
        updateStatus('Ready to record', 'stable');
    }
}

// Check if weight is stable
function checkWeightStability() {
    const weightDifference = Math.abs((currentWeight - previousWeight) * 1000); // Convert to grams
    
    // Check if weight is stable (not changing much)
    if (weightDifference <= STABILITY_THRESHOLD && currentWeight > 0.010) {
        stableCount++;
        
        // Need multiple stable readings
        if (stableCount >= STABLE_READINGS_NEEDED) {
            if (!isWeightStable) {
                isWeightStable = true;
                updateStatus('✓ Stable - Auto-recording...', 'stable');
                console.log('Weight is now stable:', currentWeight.toFixed(3), 'kg');
                
                // AUTO-RECORD immediately when stable
                recordWeight();
                
                // Reset for next item
                isWeightStable = false;
                stableCount = 0;
            }
        } else {
            updateStatus(`Stabilizing... (${stableCount}/${STABLE_READINGS_NEEDED})`, 'measuring');
        }
    } else {
        // Weight is changing - reset stability
        if (isWeightStable || stableCount > 0) {
            isWeightStable = false;
            stableCount = 0;
            updateStatus('Measuring... Weight changing', 'measuring');
        }
    }
    
    previousWeight = currentWeight;
}

// Manual save function
function saveWeight() {
    if (!isRecording) {
        alert('Please start recording first');
        return;
    }
    
    if (currentWeight <= 0.010) {
        alert('No weight detected');
        return;
    }
    
    if (!isWeightStable) {
        alert('Please wait for weight to stabilize');
        return;
    }
    
    // Record current weight
    recordWeight();
    
    // Reset stability for next item
    isWeightStable = false;
    stableCount = 0;
    updateStatus('Saved! Place next item...', 'stable');
}

// Record stable weight
function recordWeight() {
    // Don't record if weight is too close to last recorded (duplicate)
    const weightDifference = Math.abs((currentWeight - lastRecordedWeight) * 1000);
    if (weightDifference < STABILITY_THRESHOLD && lastRecordedWeight > 0) {
        console.log('Skipping duplicate weight');
        alert('This weight was already recorded!');
        return;
    }
    
    itemCount++;
    sessionTotal += currentWeight;
    lastRecordedWeight = currentWeight;
    
    // Create record
    const now = new Date();
    const record = {
        sno: itemCount,
        weight: currentWeight,
        date: formatDate(now),
        time: formatTime(now),
        timestamp: now
    };
    
    sessionData.push(record);
    
    // Add to table
    addTableRow(record);
    
    // Update summary
    updateSummary();
    
    console.log('✅ Recorded:', record);
}

// Start recording session
function startRecording() {
    if (!isConnected) {
        alert('Please connect to server first');
        return;
    }
    
    isRecording = true;
    previousWeight = currentWeight;
    isWeightStable = false;
    stableCount = 0;
    lastRecordedWeight = 0; // Reset for new session
    
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    document.getElementById('sessionStatus').textContent = 'Recording';
    document.getElementById('sessionStatus').classList.add('recording');
    
    updateStatus('Place item on scale...', 'measuring');
    
    console.log('🔴 Recording started - Auto-record enabled');
}

// Stop recording session
function stopRecording() {
    isRecording = false;
    isWeightStable = false;
    stableCount = 0;
    
    if (stableWeightTimer) {
        clearTimeout(stableWeightTimer);
        stableWeightTimer = null;
    }
    
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('sessionStatus').textContent = 'Stopped';
    document.getElementById('sessionStatus').classList.remove('recording');
    
    updateStatus('Recording stopped. Total: ' + sessionTotal.toFixed(3) + ' kg', 'stable');
    
    console.log('⏹️ Recording stopped');
    console.log('Session Total:', sessionTotal.toFixed(3), 'kg');
    console.log('Items:', itemCount);
    
    // Show summary alert
    if (itemCount > 0) {
        setTimeout(function() {
            alert(`Session Complete!\n\nTotal Weight: ${sessionTotal.toFixed(3)} kg\nItems Recorded: ${itemCount}`);
        }, 500);
    }
}

// Add row to table
function addTableRow(record) {
    const tbody = document.getElementById('dataTableBody');
    
    // Remove empty row if exists
    const emptyRow = tbody.querySelector('.empty-row');
    if (emptyRow) {
        emptyRow.remove();
    }
    
    // Create new row
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${record.sno}</td>
        <td>${record.weight.toFixed(3)}</td>
        <td>${record.date}</td>
        <td>${record.time}</td>
    `;
    
    // Add to bottom of table (chronological order)
    tbody.appendChild(row);
}

// Update summary
function updateSummary() {
    document.getElementById('sessionTotal').textContent = sessionTotal.toFixed(3) + ' kg';
    document.getElementById('itemCount').textContent = itemCount;
}

// Clear all data
function clearData() {
    if (isRecording) {
        alert('Please stop recording before clearing data');
        return;
    }
    
    if (sessionData.length === 0) {
        return;
    }
    
    if (confirm('Clear all recorded data?')) {
        sessionData = [];
        sessionTotal = 0;
        itemCount = 0;
        lastRecordedWeight = 0;
        
        // Clear table
        const tbody = document.getElementById('dataTableBody');
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="4">No data recorded yet. Click "Start Recording" to begin.</td>
            </tr>
        `;
        
        // Update summary
        updateSummary();
        document.getElementById('sessionStatus').textContent = 'Not Started';
        
        updateStatus('Data cleared', 'waiting');
        
        console.log('🗑️ Data cleared');
    }
}

// Export to CSV
function exportCSV() {
    if (sessionData.length === 0) {
        alert('No data to export');
        return;
    }
    
    // Create CSV content
    let csv = 'S.No,Weight (kg),Date,Time\n';
    
    sessionData.forEach(record => {
        csv += `${record.sno},${record.weight.toFixed(3)},${record.date},${record.time}\n`;
    });
    
    // Add summary
    csv += `\nTotal Weight,${sessionTotal.toFixed(3)} kg\n`;
    csv += `Total Items,${itemCount}\n`;
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `periyar_scale_${formatDateForFile(new Date())}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('💾 Exported', sessionData.length, 'records to CSV');
}

// Update status message
function updateStatus(message, type) {
    const statusText = document.getElementById('statusText');
    const statusIcon = document.querySelector('.status-icon');
    
    statusText.textContent = message;
    statusText.className = 'status-' + type;
    
    // Update icon
    if (type === 'stable') {
        statusIcon.textContent = '🟢';
    } else if (type === 'measuring') {
        statusIcon.textContent = '🟡';
    } else {
        statusIcon.textContent = '⚪';
    }
}

// Update connection status
function updateConnectionStatus(connected) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('connectionStatus');
    
    if (connected) {
        statusDot.classList.add('connected');
        statusText.textContent = 'Connected';
    } else {
        statusDot.classList.remove('connected');
        statusText.textContent = 'Disconnected';
    }
}

// Format date
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// Format time
function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// Format date for filename
function formatDateForFile(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}`;
}

// Log system info
console.log('╔════════════════════════════════════════╗');
console.log('║  PERIYAR SCALE SYSTEM - DASHBOARD     ║');
console.log('╚════════════════════════════════════════╝');
console.log('Version: 1.0.0');
console.log('Ready to connect');
