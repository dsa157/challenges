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
  const day = req.query.day?.padStart(2, '0');
  if (!day) return res.status(400).json({ error: 'Day parameter required', results: [] });

  const monthDir = path.join(DATA_DIR, 'May');
  if (!fs.existsSync(monthDir)) return res.status(404).json({ error: 'May data not found', results: [] });

  const results = [];
  
  // Get all .txt files in May directory
  const files = fs.readdirSync(monthDir).filter(f => f.endsWith('.txt'));
  console.log('Processing files:', files);
  
  files.forEach(file => {
    const filePath = path.join(monthDir, file);
    console.log('Reading file:', filePath);
    
    const content = fs.readFileSync(filePath, 'utf8');
    console.log('Sample content:', content.substring(0, 50));
    
    // Exact match for "May DD: Challenge" pattern
    const pattern = `May ${day}:`;
    
    content.split('\n').forEach(line => {
      if (line.startsWith(pattern)) {
        const challenge = line.slice(pattern.length).trim();
        results.push({
          source: file.replace('.txt', ''),
          date: `May ${day}`,
          challenge
        });
      }
    });
  });
  
  console.log('Final results:', results);
  res.json({ results });
});

app.listen(3000, () => {
  console.log('Server started');
  console.log('Data directory:', DATA_DIR);
});
