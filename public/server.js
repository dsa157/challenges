const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use('/data', express.static(path.join(__dirname, 'data')));

// Add CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Search endpoint
app.get('/search', (req, res) => {
  console.log(`Search request: month=${req.query.month}, day=${req.query.day}`);
  const month = req.query.month;
  const day = req.query.day;
  const dataDir = path.join(__dirname, 'data', month.toLowerCase());

  // Check if month directory exists
  if (!fs.existsSync(dataDir)) {
    console.log(`Directory not found: ${dataDir}`);
    return res.json({ error: `No data found for month: ${month}` });
  }
  
  try {
    const files = fs.readdirSync(dataDir);
    console.log(`Found ${files.length} files in ${dataDir}`);
    const results = [];
    
    files.forEach(file => {
      try {
        const filePath = path.join(dataDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        // Search patterns
        const monthName = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
        const searchPattern1 = `${monthName} ${day}`; // May 14
        const searchPattern2 = `${monthName} ${day}:`; // May 14:
        const searchPattern3 = `${monthName} ${day} `; // May 14 [space]
        
        for (const line of lines) {
          if (line.includes(searchPattern1) || 
              line.includes(searchPattern2) || 
              line.includes(searchPattern3)) {
            
            // Extract source from filename (remove .txt)
            const source = file.replace('.txt', '');
            
            // Extract challenge text (everything after the date)
            const challenge = line.split(':').slice(1).join(':').trim();
            
            console.log(`Match found in ${file}:`, line.trim());
            results.push({
              source,
              date: `${monthName} ${day}`,
              challenge
            });
            break;
          }
        }
      } catch (e) {
        console.log(`Error processing ${file}: ${e.message}`);
      }
    });
    
    console.log(`Returning ${results.length} results`);
    res.json(results);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Data directory: ${path.join(__dirname, 'data')}`);
});
