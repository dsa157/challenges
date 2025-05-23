const express = require('express');
const path = require('path');
const fs = require('fs');
const debug = require('debug')('server');
const debugData = require('debug')('server:data');
const debugError = require('debug')('server:error');
const serverless = require('serverless-http');

const app = express();

// Flexible Netlify data directory resolution
const DATA_DIR = process.env.AWS_LAMBDA_FUNCTION_NAME
  ? path.join(__dirname, '../data') // /var/task/src/functions/data
  : path.join(__dirname, 'public/data');

// Create directory if missing
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('Created data directory at:', DATA_DIR);
  } catch (err) {
    console.error('Failed to create data directory:', err);
    process.exit(1);
  }
}

console.log('Using data directory:', DATA_DIR);
console.log('Directory contents:', fs.readdirSync(DATA_DIR));

debugData('Using verified data directory: %s', DATA_DIR);

debugData('Using data directory: %s (exists: %s)', DATA_DIR, fs.existsSync(DATA_DIR));

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

// Add debug route
app.get('/api/debug', (req, res) => {
  const dataDir = path.join(__dirname, 'public/data');
  res.setHeader('Content-Type', 'application/json');
  res.json({
    status: 'success',
    data: {
      path: dataDir,
      exists: fs.existsSync(dataDir),
      mayFiles: fs.existsSync(dataDir) ? fs.readdirSync(path.join(dataDir, 'may')) : []
    }
  });
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
  const { month, day } = req.query;
  const dayPattern = new RegExp(`May\\s+${day}:`);
  const dataDir = path.join(__dirname, 'public/data', month);
  
  try {
    const results = fs.readdirSync(dataDir).map(file => {
      const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
      const matches = content.split('\n')
        .filter(line => dayPattern.test(line))
        .map(line => line.replace(/^May\s+\d+:\s*/, ''));
      
      return { file, matches };
    }).filter(result => result.matches.length > 0);

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  debug('Server started');
  debugData('Data directory: %s', DATA_DIR);
});

module.exports = app;
module.exports.handler = serverless(app);
