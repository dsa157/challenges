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

// Perform search
async function search() {
  const month = monthInput.value.toLowerCase();
  const day = dayInput.value;
  
  statusDiv.textContent = 'Searching...';
  tbody.innerHTML = '';
  
  try {
    const response = await fetch(`/search?month=${month}&day=${day}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Search failed');
    }
    
    if (data.results.length === 0) {
      statusDiv.textContent = `No challenges found for ${month} ${day}`;
      resultsTable.style.display = 'none';
    } else {
      statusDiv.textContent = '';
      resultsTable.style.display = 'table';
      data.results.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${item.source}</td>
          <td>${item.date}</td>
          <td>${item.challenge}</td>
        `;
        tbody.appendChild(row);
      });
    }
  } catch (error) {
    statusDiv.textContent = `No challenges found for ${month} ${day}`;
    console.error('Search error:', error);
  }
}

// Start the app
init();
