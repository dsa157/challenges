const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const DATA_DIR = path.join(__dirname, 'public/data');

// Middleware
app.use(express.static(path.join(__dirname, 'public')));

// Test file endpoint
app.get('/test-file', (req, res) => {
  const testFile = path.join(__dirname, 'public/data/May/mermay.txt');
  console.log('Testing file:', testFile);
  
  try {
    if (!fs.existsSync(testFile)) {
      return res.status(404).json({ 
        error: 'File not found',
        path: testFile
      });
    }
    
    const content = fs.readFileSync(testFile, 'utf8');
    res.send(`<pre>${content}</pre>`);
  } catch (e) {
    res.status(500).json({
      error: e.message,
      path: testFile
    });
  }
});

// Simple test endpoint
app.get('/test', (req, res) => {
  const testFile = path.join(__dirname, 'public/data/May/mermay.txt');
  
  // Verify file exists
  if (!fs.existsSync(testFile)) {
    return res.status(500).json({
      error: 'Test file not found',
      path: testFile,
      absolutePath: path.resolve(testFile)
    });
  }
  
  // Read and return raw content
  try {
    const content = fs.readFileSync(testFile, 'utf8');
    res.send(`<pre>${content}</pre>`);
  } catch (e) {
    res.status(500).json({
      error: 'File read error',
      message: e.message
    });
  }
});

// Debug endpoint - returns raw file content
app.get('/debug-file', (req, res) => {
  const filePath = path.join(DATA_DIR, 'May/mermay.txt');
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    res.send(`<pre>${content}</pre>`);
  } catch (e) {
    res.status(500).json({
      error: 'File read failed',
      path: filePath,
      message: e.message
    });
  }
});

// Search endpoint
app.get('/search', (req, res) => {
  const month = req.query.month?.toLowerCase();
  const day = req.query.day;
  
  console.log(`\n=== NEW REQUEST ===`);
  console.log(`Requested month: ${month}`);
  console.log(`Requested day: ${day}`);
  
  if (!month || !day) {
    console.log('Missing month or day parameter');
    return res.status(400).json({ error: 'Both month and day parameters are required' });
  }
  
  // Validate day
  const dayNum = parseInt(day);
  if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
    console.log('Invalid day parameter');
    return res.status(400).json({ error: 'Day must be between 1 and 31' });
  }
  
  console.log(`Processing ${month} request`);
  console.log(`Requested month: ${month}, normalized to: ${month.toLowerCase()}`);
  
  // Find matching month directory (case-insensitive)
  const dataDir = path.join(__dirname, 'public/data');
  console.log(`Data directory contents:`, fs.readdirSync(dataDir));
  
  try {
    const monthDirs = fs.readdirSync(dataDir).filter(f => {
      const fullPath = path.join(dataDir, f);
      return fs.statSync(fullPath).isDirectory() && 
             f.toLowerCase() === month.toLowerCase();
    });
    
    if (monthDirs.length === 0) {
      console.log(`No challenges found for month: ${month}`);
      return res.json({ results: [] });
    }
    
    const monthDir = path.join(dataDir, monthDirs[0]);
    console.log(`Using month directory: ${monthDir}`);
    
    try {
      const files = fs.readdirSync(monthDir);
      console.log(`All files in directory:`, files);
      const txtFiles = files.filter(f => f.endsWith('.txt'));
      console.log(`Text files found:`, txtFiles);
      
      if (txtFiles.length === 0) {
        console.log('No .txt files found in directory');
        return res.json({ results: [] });
      }
      
      const results = [];
      
      txtFiles.forEach(file => {
        const filePath = path.join(monthDir, file);
        console.log(`Reading file: ${filePath}`);
        
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          //console.log(`File content sample:`, content.substring(0, 50));
          const lines = content.split('\n');
          
          // Use the actual directory name's case for pattern matching
          const pattern = new RegExp(`^${monthDirs[0]} ${day.toString().padStart(2, '0')}(:|\\s|$)`, 'i');
          console.log(`Matching pattern: ${pattern}`);
          
          for (const line of lines) {
            if (pattern.test(line)) {
              console.log(`Matched line: ${line}`);
              const challenge = line.replace(/^[^:]+:\s*/, '').trim() || line.replace(/^[^\\s]+\\s+[^\\s]+\\s*/, '').trim();
              console.log(`Found data for ${monthDirs[0]} ${day}:`, {
                source: path.basename(file, '.txt'),
                date: `${monthDirs[0]} ${day}`,
                challenge
              });
              results.push({
                source: path.basename(file, '.txt'),
                date: `${monthDirs[0]} ${day}`,
                challenge
              });
              break; // Only take first match per file
            }
          }
        } catch (e) {
          console.error(`Error reading file ${filePath}:`, e);
        }
      });
      
      res.json({ results });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3000, () => {
  console.log('Server started');
  console.log('Data directory:', DATA_DIR);
});
