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

// Month names
const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

// Initialize UI
function init() {
  // Verify all required DOM elements exist
  const requiredElements = [
    monthInput, prevMonthBtn, nextMonthBtn,
    dayInput, prevDayBtn, nextDayBtn,
    statusDiv, resultsTable, tbody
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

// Display search results
function displayResults(results) {
  tbody.innerHTML = '';
  
  if (!results || results.length === 0) {
    resultsTable.style.display = 'none';
    updateStatus('No challenges found for this date', 'neutral');
    return;
  }
  
  resultsTable.style.display = 'table';
  updateStatus(`Found ${results.length} challenges`, 'neutral');
  
  results.forEach(item => {
    const row = document.createElement('tr');
    
    const sourceCell = document.createElement('td');
    sourceCell.textContent = item.source;
    
    const dateCell = document.createElement('td');
    dateCell.textContent = item.date;
    
    const challengeCell = document.createElement('td');
    challengeCell.textContent = item.challenge;
    
    row.append(sourceCell, dateCell, challengeCell);
    tbody.appendChild(row);
  });
}

// Perform search
async function search() {
  const month = monthInput.value.trim().toLowerCase();
  const day = parseInt(dayInput.value);
  
  if (!month || isNaN(day) || day < 1 || day > 31) {
    resultsTable.style.display = 'none';
    updateStatus('Please enter valid month and day (1-31)', 'error');
    return;
  }
  
  const dayStr = day < 10 ? `0${day}` : `${day}`;
  const url = `/search?month=${month}&day=${dayStr}`;
  
  updateStatus('Searching...', 'loading');
  resultsTable.style.display = 'none';
  tbody.innerHTML = '';
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data) {
      throw new Error('No data received');
    }
    
    const results = Array.isArray(data) ? data : data.results || [];
    displayResults(results);
  } catch (error) {
    console.error('Search failed:', error);
    resultsTable.style.display = 'none';
    updateStatus(`Search failed: ${error.message}`, 'error');
  }
}

// Start the app
init();
