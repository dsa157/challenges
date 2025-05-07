document.addEventListener('DOMContentLoaded', () => {
  const dayInput = document.getElementById('dayInput');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const resultsDiv = document.getElementById('results');
  
  // Set default to current day
  const currentDay = new Date().getDate();
  dayInput.value = currentDay;
  
  // Handle prev/next button clicks
  prevBtn.addEventListener('click', () => {
    const currentVal = parseInt(dayInput.value);
    if (currentVal > 1) {
      dayInput.value = currentVal - 1;
      searchDay();
    }
  });
  
  nextBtn.addEventListener('click', () => {
    const currentVal = parseInt(dayInput.value);
    if (currentVal < 31) {
      dayInput.value = currentVal + 1;
      searchDay();
    }
  });
  
  // Handle direct input changes
  dayInput.addEventListener('change', searchDay);
  
  function searchDay() {
    const day = parseInt(dayInput.value);
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    
    fetch(`/search?day=${dayStr}`)
      .then(response => response.json())
      .then(data => {
        resultsDiv.textContent = data.results.join('\n');
      })
      .catch(error => {
        console.error('Error:', error);
        resultsDiv.textContent = 'Error fetching results';
      });
  }
  
  // Initial search
  searchDay();
});
