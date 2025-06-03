const express = require('express');
const path = require('path');
const fs = require('fs');
const debug = require('debug')('server');
const debugData = require('debug')('server:data');
const debugError = require('debug')('server:error');
const serverless = require('serverless-http');

// Month names for default date handling
const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const app = express();

// Data directory resolution
function getDataDir() {
  // Always use src/data for consistency
  const dataDir = path.join(__dirname, 'src/data');
  
  // Create the directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    console.log(`Creating data directory: ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  console.log(`Using data directory: ${dataDir}`);
  return dataDir;
}

const DATA_DIR = getDataDir();
console.log('Final data directory:', DATA_DIR);
console.log('Directory contents:', fs.readdirSync(DATA_DIR));

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
  console.log('Search request received:', req.query);
  console.log('Using data directory:', DATA_DIR);
  
  // Set default to current month and day if not provided
  const now = new Date();
  const month = (req.query.month || months[now.getMonth()]).toLowerCase();
  const day = req.query.day || now.getDate().toString();
  
  console.log('Using search parameters - month:', month, 'day:', day);
  
  try {
    // Find the correct month directory case-insensitively
    const monthDir = findCaseInsensitiveDir(DATA_DIR, month);
    console.log('Looking for month directory:', monthDir || 'Not found');
    
    if (!monthDir) {
      return res.status(404).json({ 
        error: `Month directory not found: ${month}`,
        searchedPath: DATA_DIR,
        available: fs.readdirSync(DATA_DIR, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(d => d.name)
      });
    }
    
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
    const monthFiles = fs.readdirSync(monthDir, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && !dirent.name.startsWith('.'))
      .map(dirent => ({
        name: dirent.name,
        path: path.join(monthDir, dirent.name),
        size: fs.statSync(path.join(monthDir, dirent.name)).size
      }));
    
    console.log(`Found ${monthFiles.length} files in ${monthDir}:`, monthFiles.map(f => f.name));
    
    // Create a list of loaded files for the UI
    const loadedFiles = monthFiles.map(file => ({
      name: file.name,
      size: file.size,
      path: file.path.replace(process.cwd(), '') // Make path relative
    }));

    const results = [];
    
    for (const { name: fileName, path: filePath } of monthFiles) {
      console.log(`\n--- Processing file: ${fileName} (${filePath}) ---`);
      
      try {
        // Log file stats
        const stats = fs.statSync(filePath);
        console.log(`File size: ${stats.size} bytes`);
        
        // Read file content with explicit encoding
        const content = fs.readFileSync(filePath, 'utf-8');
        console.log(`File content length: ${content.length} characters`);
        
        // Log first 100 chars for debugging
        console.log(`First 100 chars: ${content.substring(0, 100).replace(/\n/g, '\\n')}...`);
        
        // Prepare search patterns
        const monthName = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
        const dayNum = parseInt(day, 10);
        const dayPatterns = [
          new RegExp(`^${monthName}\\s+${dayNum}:`, 'i'),  // May 1:
          new RegExp(`^${monthName}\\s+0?${dayNum}:`, 'i')   // May 01:
        ];
        
        console.log(`Searching for patterns:`, dayPatterns.map(p => p.toString()));
        
        // Process each line
        const lines = content.split('\n');
        console.log(`File has ${lines.length} lines`);
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          for (const pattern of dayPatterns) {
            if (pattern.test(line)) {
              const match = line.replace(new RegExp(`^${monthName}\\s+\\d+:\\s*`, 'i'), '').trim();
              console.log(`Found match on line ${i + 1}:`, { line, match });
              results.push({ 
                file: fileName, 
                matches: [match],
                lineNumber: i + 1,
                lineContent: line
              });
              break;
            }
          }
        }
        
        if (results.length === 0) {
          console.log(`No matches found in ${fileName} for day ${day}`);
        }
      } catch (fileError) {
        console.error(`Error processing file ${fileName}:`, fileError);
      }
    }

    // Include loaded files and month directory in the response
    res.json({ 
      success: true, 
      results,
      loadedFiles: monthFiles.map(file => ({
        name: file.name,
        size: file.size,
        path: file.path.replace(process.cwd(), '') // Make path relative
      })),
      monthDir: monthDir.replace(process.cwd(), '') // Make path relative
    });
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
