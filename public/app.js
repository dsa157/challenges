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
  
  // Set current month and day if not already set
  const now = new Date();
  if (!monthInput.value) monthInput.value = months[now.getMonth()];
  if (!dayInput.value) dayInput.value = now.getDate();
  
  // Event listeners
  prevMonthBtn.addEventListener('click', () => navigateMonth(-1));
  nextMonthBtn.addEventListener('click', () => navigateMonth(1));
  prevDayBtn.addEventListener('click', () => navigateDay(-1));
  nextDayBtn.addEventListener('click', () => navigateDay(1));
  monthInput.addEventListener('change', search);
  dayInput.addEventListener('change', search);
  
  // Initialize debug panel
  initDebugPanel();
  
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
  // Get values from inputs, but don't require them
  const month = monthInput.value ? monthInput.value.toLowerCase() : '';
  const day = dayInput.value || '';
  
  statusDiv.textContent = 'Searching...';
  tbody.innerHTML = '';
  
  try {
    console.log('Making request to:', `/api/search?month=${month}&day=${day}`);
    const response = await fetchWithDebug(`/api/search?month=${month}&day=${day}`);
    console.log('Response status:', response.status);
    console.log('Response headers:', [...response.headers.entries()]);
    const data = await response.json();
    
    // Enhanced logging for debugging
    console.log('API Response:', JSON.stringify({
      hasResults: !!data.results,
      resultsCount: data.results ? data.results.length : 0,
      hasLoadedFiles: !!data.loadedFiles,
      loadedFilesCount: data.loadedFiles ? data.loadedFiles.length : 0,
      monthDir: data.monthDir || 'Not provided',
      success: data.success
    }, null, 2));
    
    if (data.loadedFiles) {
      console.log('Loaded files:', data.loadedFiles);
    }
    
    if (!response.ok) {
      throw new Error(data.error || 'Search failed');
    }
    
    // Clear previous results
    while (resultsTable.rows.length > 1) {
      resultsTable.deleteRow(1);
    }
    
    // Display search results if any
    if (data.results && data.results.length > 0) {
      statusDiv.style.display = 'none';
      resultsTable.style.display = 'table';
      
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
    
    // Always show loaded files information
    const filesInfo = document.createElement('div');
    filesInfo.className = 'files-info';
    filesInfo.style.marginTop = '20px';
    filesInfo.style.padding = '10px';
    filesInfo.style.backgroundColor = '#f5f5f5';
    filesInfo.style.borderRadius = '4px';
    
    if (data.loadedFiles && data.loadedFiles.length > 0) {
      filesInfo.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">Loaded data files (${data.loadedFiles.length}):</div>
        <ul style="margin: 0; padding-left: 20px;">
          ${data.loadedFiles.map(file => 
            `<li>${file.name} (${(file.size / 1024).toFixed(1)} KB) <span style="color: #666; font-size: 0.9em;">${file.path}</span></li>`
          ).join('')}
        </ul>
        <div style="margin-top: 5px; font-size: 0.9em; color: #666;">
          Data directory: ${data.monthDir || 'N/A'}
        </div>
      `;
    } else {
      filesInfo.textContent = 'No data files were loaded for this month.';
      if (data.monthDir) {
        filesInfo.innerHTML += `<div style="margin-top: 5px;">Checked in: ${data.monthDir}</div>`;
      }
    }
    
    // Remove previous files info if it exists
    const existingFilesInfo = document.querySelector('.files-info');
    if (existingFilesInfo) {
      existingFilesInfo.remove();
    }
    
    // Store the search data on the table element for the debug panel
    resultsTable.dataset.lastSearchData = JSON.stringify({
      loadedFiles: data.loadedFiles || [],
      monthDir: data.monthDir || ''
    });
    
    // Update debug panel if it's open
    if (document.getElementById('debug-panel').style.display === 'block') {
      updateDebugContent();
    }
  } catch (error) {
    statusDiv.style.display = 'block';
    statusDiv.textContent = `No challenges found for ${month} ${day}`;
    resultsTable.style.display = 'none';
    console.error('Search error:', error);
  }
}

// Initialize debug panel to show loaded files
function initDebugPanel() {
  const debugToggle = document.getElementById('debug-toggle');
  const debugPanel = document.getElementById('debug-panel');
  const debugContent = document.getElementById('debug-content');
  const debugClose = document.getElementById('debug-close');
  
  if (!debugToggle || !debugPanel || !debugContent || !debugClose) {
    console.error('Debug elements not found');
    return;
  }
  
  // Function to update debug content with loaded files
  function updateDebugContent() {
    // Clear existing content
    debugContent.innerHTML = '';
    
    // Get the most recent search data from the table's data attribute
    const searchData = resultsTable.dataset.lastSearchData ? 
      JSON.parse(resultsTable.dataset.lastSearchData) : null;
    
    if (searchData && searchData.loadedFiles && searchData.loadedFiles.length > 0) {
      const filesInfo = document.createElement('div');
      filesInfo.className = 'files-info';
      
      const filesList = searchData.loadedFiles.map(file => 
        `<li>${file.name} (${(file.size / 1024).toFixed(1)} KB) <span>${file.path}</span></li>`
      ).join('');
      filesInfo.innerHTML = `
      <div class="debug-header">Loaded data files (${searchData.loadedFiles.length}):</div>
      <ul>${filesList}</ul>
      <div class="debug-dir">Data directory: ${searchData.monthDir || 'N/A'}</div>`;
      
      debugContent.appendChild(filesInfo);
    } else {
      debugContent.textContent = 'No files loaded yet. Perform a search first.';
    }
  }
  
  // Toggle debug panel
  function toggleDebugPanel(e) {
    if (e) e.stopPropagation();
    const isVisible = debugPanel.style.display === 'block';
    debugPanel.style.display = isVisible ? 'none' : 'block';
    debugToggle.setAttribute('aria-expanded', !isVisible);
    
    // Update icon based on panel state
    const icon = debugToggle.querySelector('i');
    if (icon) {
      icon.setAttribute('data-lucide', isVisible ? 'bug' : 'x');
      if (window.lucide) {
        lucide.createIcons();
      }
    }
    
    // Update content when opening
    if (!isVisible) {
      updateDebugContent();
    }
    
    // Store preference in localStorage
    localStorage.setItem('debugPanelVisible', !isVisible);
  }
  
  // Set initial state from localStorage
  const debugPanelVisible = localStorage.getItem('debugPanelVisible') === 'true';
  debugPanel.style.display = debugPanelVisible ? 'block' : 'none';
  debugToggle.setAttribute('aria-expanded', debugPanelVisible);
  
  // Initialize icon based on initial state
  const icon = debugToggle.querySelector('i');
  if (icon) {
    icon.setAttribute('data-lucide', debugPanelVisible ? 'x' : 'bug');
  }
  
  // Add event listeners
  debugToggle.addEventListener('click', toggleDebugPanel);
  debugClose.addEventListener('click', toggleDebugPanel);
  
  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    if (debugPanel.style.display === 'block' && 
        !debugPanel.contains(e.target) && 
        e.target !== debugToggle &&
        !debugToggle.contains(e.target)) {
      toggleDebugPanel();
    }
  });
  
  // Update debug content when search completes
  document.addEventListener('searchComplete', updateDebugContent);
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }
  
  // Initialize debug panel
  initDebugPanel();
  
  // Version display
  fetch('/version.json')
    .then(res => res.json())
    .then(data => {
      document.getElementById('version').textContent = `v${data.version} (${data.buildDate})`;
    })
    .catch(err => console.error('Error loading version:', err));
  
  // Initialize the app
  init();
});

init();
