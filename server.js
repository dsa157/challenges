const express = require('express');
const path = require('path');
const fs = require('fs');
const debug = require('debug')('server');
const debugData = require('debug')('server:data');
const debugError = require('debug')('server:error');
const serverless = require('serverless-http');

const app = express();
const DATA_DIR = path.join(__dirname, 'public/data');

// Middleware
app.use(express.static(path.join(__dirname, 'public')));

// Ensure all responses are JSON
app.use((req, res, next) => {
  res.set('Content-Type', 'application/json');
  next();
});

// Test file endpoint
app.get('/test-file', (req, res) => {
  const testFile = path.join(__dirname, 'public/data/May/mermay.txt');
  debug('Testing file: %s', testFile);
  
  try {
    if (!fs.existsSync(testFile)) {
      debugError('File not found: %s', testFile);
      return res.status(404).json({ 
        error: 'File not found',
        path: testFile
      });
    }
    
    const content = fs.readFileSync(testFile, 'utf8');
    res.json({ content });
  } catch (e) {
    debugError('Error reading file %s: %o', testFile, e);
    res.status(500).json({
      error: e.message,
      path: testFile
    });
  }
});

// Simple test endpoint
app.get('/test', (req, res) => {
  const testFile = path.join(__dirname, 'public/data/May/mermay.txt');
  
  try {
    if (!fs.existsSync(testFile)) {
      debugError('Test file not found: %s', testFile);
      return res.status(404).json({
        error: 'Test file not found',
        path: testFile
      });
    }
    
    const content = fs.readFileSync(testFile, 'utf8');
    res.json({ content });
  } catch (e) {
    debugError('Error reading file %s: %o', testFile, e);
    res.status(500).json({
      error: 'File read error',
      message: e.message
    });
  }
});

// Debug endpoint
app.get('/debug-file', (req, res) => {
  const filePath = path.join(DATA_DIR, 'May/mermay.txt');
  debugData('Reading file: %s', filePath);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ content });
  } catch (e) {
    debugError('Error reading file %s: %o', filePath, e);
    res.status(500).json({
      error: 'File read failed',
      path: filePath,
      message: e.message
    });
  }
});

// Deployment verification endpoint
app.get('/api/deployment-check', (req, res) => {
  try {
    const months = fs.readdirSync(DATA_DIR).filter(f => {
      return fs.statSync(path.join(DATA_DIR, f)).isDirectory();
    });
    
    const checks = months.map(month => ({
      month,
      path: path.join(DATA_DIR, month),
      fileCount: fs.readdirSync(path.join(DATA_DIR, month)).filter(f => f.endsWith('.txt')).length
    }));
    
    res.json({
      status: 'ok',
      dataDir: DATA_DIR,
      months: checks
    });
  } catch (e) {
    res.status(500).json({
      status: 'error',
      error: e.message
    });
  }
});

// Version endpoint
app.get('/api/version', (req, res) => {
  try {
    const versionInfo = require('./version.json');
    res.json(versionInfo);
  } catch {
    res.json({
      version: new Date().toISOString(),
      message: 'Fallback version (version.json not found)'
    });
  }
});

// Ensure all API endpoints return JSON
app.use('/api', (req, res, next) => {
  res.type('json');
  next();
});

// Error handler for API routes
app.use('/api', (err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Search endpoint
app.get('/api/search', (req, res) => {
  const month = req.query.month?.toLowerCase();
  const day = req.query.day;
  
  debug('New request for month: %s, day: %s', month, day);
  
  if (!month || !day) {
    debugError('Missing month or day parameter');
    return res.status(400).json({ error: 'Both month and day parameters are required' });
  }
  
  const dayNum = parseInt(day);
  if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
    debugError('Invalid day parameter: %s', day);
    return res.status(400).json({ error: 'Day must be between 1 and 31' });
  }
  
  debug('Processing %s request (normalized)', month.toLowerCase());
  
  const dataDir = path.join(__dirname, 'public/data');
  debugData('Data directory contents: %o', fs.readdirSync(dataDir));
  
  try {
    const monthDirs = fs.readdirSync(dataDir).filter(f => {
      const fullPath = path.join(dataDir, f);
      return fs.statSync(fullPath).isDirectory() && 
             f.toLowerCase() === month;
    });
    
    if (monthDirs.length === 0) {
      debug('No challenges found for month: %s', month);
      return res.json({ results: [] });
    }
    
    const monthDir = path.join(dataDir, monthDirs[0]);
    debugData('Using month directory: %s', monthDir);
    
    const files = fs.readdirSync(monthDir);
    debugData('Files in directory: %o', files);
    
    const txtFiles = files.filter(f => f.endsWith('.txt'));
    debug('Found %d text files', txtFiles.length);
    
    if (txtFiles.length === 0) {
      debug('No .txt files found in %s directory', monthDirs[0]);
      return res.json({ results: [] });
    }
    
    const results = [];
    
    txtFiles.forEach(file => {
      const filePath = path.join(monthDir, file);
      debugData('Reading file: %s', filePath);
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const patternStr = `^${monthDirs[0]} ${day.toString().padStart(2, '0')}(:|\\s|$)`;
        const pattern = new RegExp(patternStr, 'i');
        debugData('Searching with pattern: %s', patternStr);
        
        for (const line of lines) {
          debugData('Testing line: %s', line);
          if (pattern.test(line)) {
            debugData('Matched line: %s', line);
            const challenge = line.replace(new RegExp(`^${monthDirs[0]} ${day.toString().padStart(2, '0')}(:|\\s)+`, 'i'), '').trim();
            
            results.push({
              source: path.basename(file, '.txt'),
              date: `${monthDirs[0]} ${day}`,
              challenge
            });
            break;
          }
        }
      } catch (e) {
        debugError('Error reading file %s: %o', filePath, e);
      }
    });
    
    debug('Returning %d results', results.length);
    res.json({ results });
    
  } catch (error) {
    debugError('Server error: %o', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3000, () => {
  debug('Server started');
  debugData('Data directory: %s', DATA_DIR);
});

module.exports = app;
module.exports.handler = serverless(app);
