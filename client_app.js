// client_app.js
document.addEventListener('DOMContentLoaded', () => {
  const monthInput = document.getElementById('monthInput');
  const prevMonthBtn = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');
  const dayInput = document.getElementById('dayInput');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const resultsDiv = document.getElementById('results');
  
  let monthData = {};
  const now = new Date();
  const currentMonth = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'][now.getMonth()];
  const currentDay = now.getDate();
  
  monthInput.value = currentMonth;
  dayInput.value = currentDay;

  // Load initial month data
  loadMonthData(currentMonth);

  // Month navigation
  prevMonthBtn.addEventListener('click', () => navigateMonth(-1));
  nextMonthBtn.addEventListener('click', () => navigateMonth(1));
  monthInput.addEventListener('change', () => loadMonthData(monthInput.value));

  // Day navigation
  prevBtn.addEventListener('click', () => navigateDay(-1));
  nextBtn.addEventListener('click', () => navigateDay(1));
  dayInput.addEventListener('change', search);

  async function loadMonthData(month) {
    try {
      const response = await fetch(`/challenges/load_month.py?month=${month}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        const errorMsg = data.error || "Unknown server error occurred";
        resultsDiv.textContent = `Error: ${errorMsg}`;
        console.error("Server reported:", errorMsg);
        return false;
      }
      
      if (Object.keys(data).length === 0) {
        resultsDiv.textContent = "No data available for this month";
        return false;
      }
      
      monthData = data;
      search();
      return true;
      
    } catch (error) {
      resultsDiv.textContent = `Failed to load data: ${error.message}`;
      console.error("Fetch error:", error);
      return false;
    }
  }

  function navigateMonth(offset) {
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const currentIndex = months.indexOf(monthInput.value);
    if (currentIndex !== -1) {
      const newIndex = (currentIndex + offset + 12) % 12;
      monthInput.value = months[newIndex];
      loadMonthData(monthInput.value);
    }
  }

  function navigateDay(offset) {
    const currentVal = parseInt(dayInput.value);
    const newVal = currentVal + offset;
    if (newVal >= 1 && newVal <= 31) {
      dayInput.value = newVal;
      search();
    }
  }

  function search() {
    const month = monthInput.value.toLowerCase();
    const day = parseInt(dayInput.value);
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const searchPattern = `${month.charAt(0).toUpperCase() + month.slice(1)} ${dayStr}`;

    const results = [];
    Object.entries(monthData).forEach(([filename, lines]) => {
      const matchingLine = lines.find(line => line.includes(searchPattern));
      if (matchingLine) {
        results.push(`${filename}\t${matchingLine}`);
      }
    });

    resultsDiv.textContent = results.join('\n');
  }
});
