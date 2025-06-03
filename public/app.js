// DOM Elements
const monthInput = document.getElementById('monthInput');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const dayInput = document.getElementById('dayInput');
const prevDayBtn = document.getElementById('prevDay');
const nextDayBtn = document.getElementById('nextDay');
const statusDiv = document.getElementById('status');
const resultsTable = document.getElementById('resultsTable');
const tbody = resultsTable.querySelector('tbody');
const debugPanel = document.getElementById('debug-panel');
const debugContent = document.getElementById('debug-content');

// Month names
const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

// Initialize UI
function init() {
  // Verify all required DOM elements exist
  const requiredElements = [
    monthInput, prevMonthBtn, nextMonthBtn,
    dayInput, prevDayBtn, nextDayBtn,
    statusDiv, resultsTable, tbody, debugPanel, debugContent
  ];
  
  if (requiredElements.some(el => !el)) {
    console.error('Critical DOM elements missing');
    return;
  }
  
  // Set current month and day
  const now = new Date();
  monthInput.value = months[now.getMonth()];
  dayInput.value = now.getDate();
  
  // Event listeners
  prevMonthBtn.addEventListener('click', () => navigateMonth(-1));
  nextMonthBtn.addEventListener('click', () => navigateMonth(1));
  prevDayBtn.addEventListener('click', () => navigateDay(-1));
  nextDayBtn.addEventListener('click', () => navigateDay(1));
  monthInput.addEventListener('change', search);
  dayInput.addEventListener('change', search);
  
  // Debug panel toggle
  let debugVisible = false;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'd' && e.ctrlKey) {
      debugVisible = !debugVisible;
      debugPanel.style.display = debugVisible ? 'block' : 'none';
    }
  });
  
  // Initial search
  search();
}

// Navigate months (wrapping around)
function navigateMonth(offset) {
  const currentIndex = months.indexOf(monthInput.value.toLowerCase());
  if (currentIndex === -1) return;
  
  const newIndex = (currentIndex + offset + 12) % 12;
  monthInput.value = months[newIndex];
  search();
}

// Navigate days (clamped to 1-31)
function navigateDay(offset) {
  const currentDay = parseInt(dayInput.value) || 1;
  const newDay = Math.max(1, Math.min(31, currentDay + offset));
  dayInput.value = newDay;
  search();
}

// Update status message
function updateStatus(message, type = 'neutral') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
}

// Debug message handler
function logDebugMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.textContent = `[${new Date().toISOString()}] ${message}`;
  debugContent.appendChild(messageElement);
  debugContent.scrollTop = debugContent.scrollHeight;
}

// Modify fetch calls to log debug info
async function fetchWithDebug(url, options) {
  logDebugMessage(`Requesting: ${url}`);
  try {
    const startTime = Date.now();
    const response = await fetch(url, options);
    const duration = Date.now() - startTime;
    
    logDebugMessage(`Response: ${response.status} (${duration}ms)`);
    if (!response.ok) {
      logDebugMessage(`Error: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    logDebugMessage(`Fetch error: ${error.message}`);
    throw error;
  }
}

// Perform search
async function search() {
  const month = monthInput.value.toLowerCase();
  const day = dayInput.value;
  
  statusDiv.textContent = 'Searching...';
  tbody.innerHTML = '';
  
  try {
    console.log('Making request to:', `/api/search?month=${month}&day=${day}`);
    const response = await fetchWithDebug(`/api/search?month=${month}&day=${day}`);
    console.log('Response status:', response.status);
    console.log('Response headers:', [...response.headers.entries()]);
    const data = await response.json();
    
    console.log('API Response:', data);
    if (data.results) {
      console.log('Results count:', data.results.length);
      console.log('First item:', JSON.stringify(data.results[0]));
    }
    if (!response.ok) {
      throw new Error(data.error || 'Search failed');
    }
    
    if (data.success && data.results.length > 0) {
      statusDiv.style.display = 'none';
      resultsTable.style.display = 'table';
      // Clear previous results
      while (resultsTable.rows.length > 1) {
        resultsTable.deleteRow(1);
      }
      
      data.results.forEach(item => {
        const row = resultsTable.insertRow();
        row.insertCell().textContent = item.file.replace('.txt', '');
        row.insertCell().textContent = `${month} ${day}`;
        row.insertCell().textContent = item.matches.join(', '); 
      });
    } else {
      statusDiv.style.display = 'block';
      statusDiv.textContent = `No challenges found for ${month} ${day}`;
      resultsTable.style.display = 'none';
    }
  } catch (error) {
    statusDiv.style.display = 'block';
    statusDiv.textContent = `No challenges found for ${month} ${day}`;
    resultsTable.style.display = 'none';
    console.error('Search error:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Version display
  fetch('/version.json')
    .then(res => res.json())
    .then(data => {
      const date = new Date(data.version);
      const formatted = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}:${date.getSeconds().toString().padStart(2,'0')}`;
      document.getElementById('version').textContent = `v${formatted}`;
    })
    .catch(() => {
      document.getElementById('version').textContent = 'vLocalDev';
    });
});

init();
