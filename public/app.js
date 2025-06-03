// DOM Elements
const monthInput = document.getElementById('monthInput');
let prevMonthBtn = document.getElementById('prevMonth');
let nextMonthBtn = document.getElementById('nextMonth');
const dayInput = document.getElementById('dayInput');
let prevDayBtn = document.getElementById('prevDay');
let nextDayBtn = document.getElementById('nextDay');
const statusDiv = document.getElementById('status');
const resultsTable = document.getElementById('resultsTable');
const tbody = resultsTable.querySelector('tbody');
const debugPanel = document.getElementById('debug-panel');
const debugContent = document.getElementById('debug-content');

// Month names
const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

// Track if we've initialized
let isInitialized = false;

// Initialize UI
function init() {
  // Only initialize once
  if (isInitialized) return;
  isInitialized = true;
  
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
  
  // Remove any existing event listeners first
  const newPrevMonth = prevMonthBtn.cloneNode(true);
  const newNextMonth = nextMonthBtn.cloneNode(true);
  const newPrevDay = prevDayBtn.cloneNode(true);
  const newNextDay = nextDayBtn.cloneNode(true);
  
  // Replace the elements to clear any existing listeners
  prevMonthBtn.parentNode.replaceChild(newPrevMonth, prevMonthBtn);
  nextMonthBtn.parentNode.replaceChild(newNextMonth, nextMonthBtn);
  prevDayBtn.parentNode.replaceChild(newPrevDay, prevDayBtn);
  nextDayBtn.parentNode.replaceChild(newNextDay, nextDayBtn);
  
  // Update our references
  prevMonthBtn = newPrevMonth;
  nextMonthBtn = newNextMonth;
  prevDayBtn = newPrevDay;
  nextDayBtn = newNextDay;
  
  // Add event listeners
  prevMonthBtn.addEventListener('click', () => navigateMonth(-1));
  nextMonthBtn.addEventListener('click', () => navigateMonth(1));
  prevDayBtn.addEventListener('click', () => navigateDay(-1));
  nextDayBtn.addEventListener('click', () => navigateDay(1));
  
  // Input change handlers
  const handleInputChange = () => search();
  monthInput.removeEventListener('change', handleInputChange);
  dayInput.removeEventListener('change', handleInputChange);
  monthInput.addEventListener('change', handleInputChange);
  dayInput.addEventListener('change', handleInputChange);
  
  // Initialize debug panel
  initDebugPanel();
  
  // Initial search
  search();
}

// Navigate months
function navigateMonth(offset) {
  const currentIndex = months.indexOf(monthInput.value.toLowerCase());
  if (currentIndex === -1) return;
  
  const newIndex = currentIndex + offset;
  if (newIndex >= 0 && newIndex < months.length) {
    monthInput.value = months[newIndex];
    // Manually trigger search since programmatic value changes don't trigger 'change' event
    search();
  }
}

// Navigate days
function navigateDay(offset) {
  const currentDay = parseInt(dayInput.value) || 1;
  const newDay = currentDay + offset;
  
  if (newDay >= 1 && newDay <= 31) {
    dayInput.value = newDay;
    // Manually trigger search since programmatic value changes don't trigger 'change' event
    search();
  }
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
  console.log('Initializing debug panel...');
  const debugToggle = document.getElementById('debug-toggle');
  const debugPanel = document.getElementById('debug-panel');
  const debugContent = document.getElementById('debug-content');
  const debugClose = document.getElementById('debug-close');

  if (!debugToggle || !debugPanel || !debugContent || !debugClose) {
    console.error('Debug elements not found:', { debugToggle, debugPanel, debugContent, debugClose });
    return;
  }

  // Function to update debug content
  function updateDebugContent() {
    console.log('Updating debug content...');
    // Clear existing content
    debugContent.innerHTML = '';

    // Get the most recent search data from the table's data attribute
    const searchData = resultsTable && resultsTable.dataset.lastSearchData ? 
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
    console.log('Toggle debug panel called');
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

    // Save state to localStorage
    localStorage.setItem('debugPanelOpen', !isVisible);

    // Update content if opening
    if (!isVisible) {
      updateDebugContent();
    }
  }

  // Remove any existing event listeners
  const newDebugClose = debugClose.cloneNode(true);
  const newDebugToggle = debugToggle.cloneNode(true);
  debugClose.parentNode.replaceChild(newDebugClose, debugClose);
  debugToggle.parentNode.replaceChild(newDebugToggle, debugToggle);

  // Store references to the new elements
  const newCloseBtn = document.getElementById('debug-close');
  const newToggleBtn = document.getElementById('debug-toggle');

  // Close panel when clicking the close button
  newCloseBtn.addEventListener('click', (e) => {
    console.log('Close button clicked');
    e.stopPropagation();
    toggleDebugPanel(e);
  });

  // Toggle panel when clicking the debug button
  newToggleBtn.addEventListener('click', toggleDebugPanel);

  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    if (debugPanel.style.display === 'block' && 
        !debugPanel.contains(e.target) && 
        !newToggleBtn.contains(e.target)) {
      toggleDebugPanel(e);
    }
  });

  // Update debug content when search completes
  document.addEventListener('searchComplete', updateDebugContent);

  console.log('Debug panel initialization complete');
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    // Initialize Lucide icons
    if (window.lucide) {
      lucide.createIcons();
    } else {
      console.error('Lucide icons not loaded');
    }
    
    // Initialize the app
    init();
    
    // Initialize debug panel
    initDebugPanel();
    
    // Initial search
    search();
  } catch (error) {
    console.error('Initialization error:', error);
  }
});

init();
