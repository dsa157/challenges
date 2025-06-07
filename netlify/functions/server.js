const express = require('express');
const serverless = require('serverless-http');
const path = require('path');
const fs = require('fs');

// Import template functions
const { getChallenges, getMonthFiles, getAvailableMonths } = require('../../src/functions/data/templates');

// Create Express app
const app = express();

app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, '..', '..', 'public', 'index.html');
  res.sendFile(indexPath);
});

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Helper function to get files for a month
const getFilesForMonth = (month) => {
  const files = getMonthFiles(month);
  return files.map(file => ({
    name: file.name,
    path: file.path,
    content: file.content
  }));
};

// Get available months
app.get('/api/months', (req, res) => {
  try {
    const months = getAvailableMonths();
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

// Search endpoint
app.get('/api/search', (req, res) => {
  try {
    const month = (req.query.month || '').toLowerCase();
    const day = req.query.day || new Date().getDate().toString().padStart(2, '0');
    
    if (!month) {
      return res.status(400).json({
        success: false,
        error: 'Month parameter is required'
      });
    }

    const files = getFilesForMonth(month);
    const results = [];
    const monthAbbr = month.slice(0, 3).toLowerCase();
    
    for (const file of files) {
      const lines = file.content.split('\n').filter(line => line.trim() !== '');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Make month abbreviation matching case-insensitive
        const lineMonthAbbr = line.slice(0, 3).toLowerCase();
        if (lineMonthAbbr === monthAbbr) {
          // Match both single and double-digit days (e.g., '7' or '07')
          const dayMatch = line.match(/^\w+\s+(\d{1,2})/i);
          if (dayMatch && (dayMatch[1] === day || dayMatch[1] === day.replace(/^0+/, ''))) {
            const match = line.replace(/^\w+\s+\d+\s*[-:]?\s*/, '').trim();
            results.push({
              file: file.name,
              matches: [match],
              lineNumber: i + 1,
              lineContent: line
            });
          }
        }
      }
    }
    
    res.json({
      success: true,
      results,
      loadedFiles: files.map(f => f.name),
      monthDir: `in-memory/${month}`,
      availableMonths: getAvailableMonths(),
      dataSource: 'in-memory-templates'
    });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  });
});

// Export the serverless function
module.exports.handler = serverless(app);

// For local development - don't start a server when imported as a module
if (require.main === module && process.env.NETLIFY_DEV) {
  const port = process.env.PORT || 9002;
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}
