document.addEventListener('DOMContentLoaded', () => {
  const monthInput = document.getElementById('monthInput');
  const prevMonthBtn = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');
  const dayInput = document.getElementById('dayInput');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const resultsDiv = document.getElementById('results');
  
  // Set defaults to current date
  const now = new Date();
  const currentMonth = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'][now.getMonth()];
  const currentDay = now.getDate();
  
  monthInput.value = currentMonth;
  dayInput.value = currentDay;
  
  // Month navigation
  prevMonthBtn.addEventListener('click', () => navigateMonth(-1));
  nextMonthBtn.addEventListener('click', () => navigateMonth(1));
  monthInput.addEventListener('change', search);
  
  // Day navigation
  prevBtn.addEventListener('click', () => navigateDay(-1));
  nextBtn.addEventListener('click', () => navigateDay(1));
  dayInput.addEventListener('change', search);
  
  // Initial search
  search();
  
  function navigateMonth(offset) {
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const currentIndex = months.indexOf(monthInput.value);
    if (currentIndex !== -1) {
      const newIndex = (currentIndex + offset + 12) % 12;
      monthInput.value = months[newIndex];
      search();
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
    
    fetch(`/search?month=${month}&day=${dayStr}`)
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          resultsDiv.textContent = data.error;
        } else {
          resultsDiv.textContent = data.results.join('\n');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        resultsDiv.textContent = 'Error fetching results';
      });
  }
});
