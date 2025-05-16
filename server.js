const express = require('express');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use('/data', express.static(path.join(__dirname, 'data')));

// Search endpoint
app.get('/search', (req, res) => {
  const month = req.query.month;
  const day = req.query.day;
  const dataDir = path.join(__dirname, 'data', month);

  // Check if month directory exists
  if (!fs.existsSync(dataDir)) {
    return res.json({ error: `No data found for month: ${month}` });
  }
  
  try {
    // Get all files in the data directory
    const files = fs.readdirSync(dataDir);
    const results = [];
    
    // Find longest filename for alignment
    const maxLength = Math.max(...files.map(f => f.length));
    
    // Search each file for the day pattern
    files.forEach(file => {
      try {
        const filePath = path.join(dataDir, file);
        const monthName = month.charAt(0).toUpperCase() + month.slice(1);
        const grepResult = execSync(`grep -i "${monthName} ${day}" ${filePath}`).toString().trim();
        if (grepResult) {
          // Calculate needed tabs (1 tab = 8 spaces)
          const tabsNeeded = Math.max(1, Math.ceil((maxLength - file.length + 4) / 8));
          results.push(`${file}${'\t'.repeat(tabsNeeded)}${grepResult}`);
        }
      } catch (e) {
        // No matches found in this file
      }
    });
    
    res.json({ results });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
