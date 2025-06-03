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

// Function to find directory case-insensitively
function findCaseInsensitiveDir(basePath, dirName) {
  try {
    const entries = fs.readdirSync(basePath, { withFileTypes: true });
    const found = entries.find(entry => 
      entry.isDirectory() && entry.name.toLowerCase() === dirName.toLowerCase()
    );
    return found ? path.join(basePath, found.name) : null;
  } catch (err) {
    return null;
  }
}

// Function to read directory contents case-insensitively
function readDirCaseInsensitive(dirPath) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (err) {
    // If directory doesn't exist, try to find a case-insensitive match
    const dirName = path.basename(dirPath);
    const parentDir = path.dirname(dirPath);
    const foundDir = findCaseInsensitiveDir(parentDir, dirName);
    return foundDir ? fs.readdirSync(foundDir, { withFileTypes: true }) : [];
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

// Debug endpoint to list all files
app.get('/api/debug/files', (req, res) => {
  try {
    const dataDirs = [
      path.join(__dirname, 'public/data'),
      path.join(__dirname, 'data'),
      path.join(__dirname, 'src/data')
    ];
    
    let months = [];
    for (const dir of dataDirs) {
      if (fs.existsSync(dir)) {
        months = fs.readdirSync(dir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
          .map(dirent => ({
            name: dirent.name,
            path: path.join(dir, dirent.name),
            files: fs.readdirSync(path.join(dir, dirent.name))
          }));
        break;
      }
    }
    
    res.json({ dataDirs, months });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: 'Debug error', details: error.message });
  }
});

// Search endpoint
app.get('/api/search', (req, res) => {
  console.log('Search request:', req.query);
  const { month, day } = req.query;
  if (!month || !day) {
    return res.status(400).json({ error: 'Month and day parameters are required' });
  }

  try {
    // Define possible data directories to check
    const possibleDirs = [
      path.join(__dirname, 'public/data'),
      path.join(__dirname, 'data'),
      path.join(__dirname, 'src/data')
    ];
    
    // Find the first existing data directory
    let dataDir = '';
    for (const dir of possibleDirs) {
      if (fs.existsSync(dir)) {
        dataDir = dir;
        break;
      }
    }
    
    if (!dataDir) {
      return res.status(500).json({ 
        error: 'No data directory found',
        searchedDirs: possibleDirs
      });
    }
    
    console.log('Using data directory:', dataDir);
    
    // Find the correct month directory case-insensitively
    const monthDir = findCaseInsensitiveDir(dataDir, month) || path.join(dataDir, month);
    console.log('Using month directory:', monthDir);
    
    if (!fs.existsSync(monthDir)) {
      return res.status(404).json({ 
        error: `Month directory not found: ${month}`,
        searchedPath: dataDir,
        available: fs.readdirSync(dataDir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(d => d.name)
      });
    }

    // Read all files in the month directory
    const files = fs.readdirSync(monthDir, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && !dirent.name.startsWith('.'))
      .map(dirent => dirent.name);
    
    console.log(`Found ${files.length} files in ${monthDir}:`, files);

    const results = [];
    
    for (const file of files) {
      try {
        const filePath = path.join(monthDir, file);
        console.log(`Processing file: ${filePath}`);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Try both formats: "May 01:" and "May 1:"
        const dayNum = parseInt(day, 10);
        const dayPatterns = [
          new RegExp(`^${month}\\s+${dayNum}:`, 'i'),  // May 1:
          new RegExp(`^${month}\\s+0?${dayNum}:`, 'i')  // May 01:
        ];
        
        const lines = content.split('\n');
        console.log(`File has ${lines.length} lines`);
        
        for (const line of lines) {
          for (const pattern of dayPatterns) {
            if (pattern.test(line)) {
              const match = line.replace(new RegExp(`^${month}\\s+\\d+:\\s*`, 'i'), '');
              console.log(`Found match in ${file}:`, { line, match });
              results.push({ file, matches: [match] });
              break;
            }
          }
        }
      } catch (fileError) {
        console.error(`Error processing file ${file}:`, fileError);
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.listen(3000, () => {
  debug('Server started');
  debugData('Data directory: %s', DATA_DIR);
});

module.exports = app;
module.exports.handler = serverless(app);
