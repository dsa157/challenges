const express = require('express');
const path = require('path');
const debug = require('debug')('server');
const debugData = require('debug')('server:data');
const debugError = require('debug')('server:error');
const serverless = require('serverless-http');
const { getChallenges, getMonthFiles, getAvailableMonths } = require('./src/data/templates');

// Month names for default date handling
const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const app = express();

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: true }));

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  debug(`${req.method} ${req.path}`);
  next();
});

// Get available months from our in-memory data
function getAvailableMonthsFromTemplates() {
  return getAvailableMonths();
}

// Get files for a specific month from our in-memory data
function getMonthFilesFromTemplates(month) {
  return getMonthFiles(month);
}

// Get challenges for a specific month and file from our in-memory data
function getChallengesFromTemplates(month, filename) {
  return getChallenges(month, filename);
}

// Serve static files from the public directory
app.use(express.static('public'));

// API Routes
app.get('/api/months', (req, res) => {
  try {
    const months = getAvailableMonthsFromTemplates();
    res.json(months);
  } catch (error) {
    console.error('Error getting available months:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get available months',
      message: error.message
    });
  }
});

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
  res.json({
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    dataSource: 'in-memory-templates',
    availableMonths: getAvailableMonthsFromTemplates()
  });
});

// Debug endpoint
app.get('/debug-file', (req, res) => {
  try {
    const months = getAvailableMonthsFromTemplates();
    const files = getMonthFilesFromTemplates(months[0]);
    const content = files.length > 0 ? files[0].content : 'No files available';
    res.send(`<pre>${content}</pre>`);
  } catch (e) {
    debugError('Error getting debug data: %o', e);
    res.status(500).send('Error getting debug data');
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
  
  // Set default to current month and day if not provided
  const now = new Date();
  const month = (req.query.month || months[now.getMonth()]).toLowerCase();
  const day = req.query.day || now.getDate().toString().padStart(2, '0');
  
  console.log(`Searching for month: ${month}, day: ${day}`);
  
  try {
    // Get files for the requested month from our in-memory data
    const files = getMonthFilesFromTemplates(month);
    
    if (!files || files.length === 0) {
      return res.status(200).json({
        success: true,
        results: [],
        loadedFiles: [],
        monthDir: `in-memory/${month}`,
        message: `No data found for month: ${month}`,
        availableMonths: getAvailableMonthsFromTemplates()
      });
    }
    
    console.log(`Found ${files.length} files for ${month}`);
    
    const results = [];
    
    for (const file of files) {
      console.log(`\n--- Processing file: ${file.name} ---`);
      
      try {
        const content = file.content;
        console.log(`File content length: ${content.length} characters`);
        
        // Log first 100 chars for debugging
        console.log(`First 100 chars: ${content.substring(0, 100).replace(/\n/g, '\\n')}...`);
        
        // Prepare search patterns
        const monthName = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
        const dayNum = parseInt(day, 10);
        const dayPatterns = [
          new RegExp(`^${monthName}\\s+${dayNum}[^0-9]`, 'i'),  // May 1
          new RegExp(`^${monthName}\\s+0?${dayNum}[^0-9]`, 'i')   // May 01
        ];
        
        console.log(`Searching for patterns:`, dayPatterns.map(p => p.toString()));
        
        // Process each line
        const lines = content.split('\n').filter(line => line.trim() !== '');
        console.log(`File has ${lines.length} lines`);
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          for (const pattern of dayPatterns) {
            if (pattern.test(line)) {
              const match = line.replace(new RegExp(`^${monthName}\\s+\\d+\\s*[-:]?\\s*`, 'i'), '').trim();
              console.log(`Found match on line ${i + 1}:`, { line, match });
              results.push({ 
                file: file.name, 
                matches: [match],
                lineNumber: i + 1,
                lineContent: line
              });
              break;
            }
          }
        }
        
        if (results.length === 0) {
          console.log(`No matches found in ${file.name} for day ${day}`);
        }
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
      }
    }

    // Prepare response with additional debug info
    const response = {
      success: true,
      results: results.map(r => ({
        file: r.file,
        matches: r.matches,
        lineNumber: r.lineNumber,
        lineContent: r.lineContent
      })),
      loadedFiles: files.map(f => ({
        name: f.name,
        path: f.path,
        size: Buffer.byteLength(f.content, 'utf8')
      })),
      monthDir: `in-memory/${month}`,
      availableMonths: getAvailableMonthsFromTemplates(),
      dataSource: 'in-memory-templates'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform search',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      availableMonths: getAvailableMonthsFromTemplates(),
      dataSource: 'in-memory-templates'
    });
  }
});

// Only start the server if this file is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 9002;
  app.listen(PORT, () => {
    debug(`Server started on port ${PORT}`);
    debug('Using in-memory data templates');
  });
}

module.exports = app;
module.exports.handler = serverless(app);
