// Netlify Function handler
const express = require('express');
const serverless = require('serverless-http');
const path = require('path');
// Import using path that works in both dev and Netlify
const path = require('path');
const templatesPath = path.join(process.cwd(), 'node_modules/.netlify/functions-internal/data/templates');
const { getChallenges, getMonthFiles, getAvailableMonths } = require(templatesPath);

const app = express();

// Log all requests
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

// Use the imported functions directly
const { getChallenges: getChallengesFromTemplates, 
        getMonthFiles: getMonthFilesFromTemplates, 
        getAvailableMonths: getAvailableMonthsFromTemplates } = require('../../data/templates');

// Handle search requests
async function handleSearch(req, res) {
  const { month, day } = req.query;
  
  if (!month) {
    return res.status(400).json({ 
      error: 'Month parameter is required',
      success: false
    });
  }

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

    // If day is provided, filter results by day
    const results = [];
    
    for (const file of files) {
      try {
        const content = file.content;
        const lines = content.split('\n').filter(line => line.trim() !== '');
        
        if (day) {
          const dayPattern = new RegExp(`^${month} ${day}[^0-9]`, 'i');
          const matchingLines = lines.filter(line => dayPattern.test(line));
          
          if (matchingLines.length > 0) {
            results.push({
              file: file.name,
              matches: matchingLines
            });
          }
        } else {
          // If no day is specified, include all lines
          results.push({
            file: file.name,
            matches: lines
          });
        }
      } catch (err) {
        console.error(`Error processing file ${file.name}:`, err);
        continue;
      }
    }
    
    // Prepare response with additional debug info
    const response = {
      success: true,
      results: results,
      loadedFiles: files.map(f => ({
        name: f.name,
        path: f.path,
        size: Buffer.byteLength(f.content, 'utf8')
      })),
      monthDir: `in-memory/${month}`,
      availableMonths: getAvailableMonthsFromTemplates()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform search',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      availableMonths: getAvailableMonths()
    });
  }
}

// Test endpoint to verify function is working
app.get('/.netlify/functions/server/test', (req, res) => {
  res.json({
    success: true,
    message: 'Function is working',
    timestamp: new Date().toISOString(),
    node_env: process.env.NODE_ENV,
    cwd: process.cwd(),
    __dirname: __dirname,
    dataDir: DATA_DIR,
    dataDirExists: fs.existsSync(DATA_DIR),
    dataDirContents: fs.existsSync(DATA_DIR) ? fs.readdirSync(DATA_DIR) : []
  });
});

// API endpoints
app.get('/.netlify/functions/server/api/search', handleSearch);
app.get('/api/search', handleSearch);

// Catch-all route
app.all('*', (req, res) => {
  console.log('Catch-all route hit:', req.path);
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method
  });
});

// Create and export the serverless handler
const handler = serverless(app);
module.exports.handler = async (event, context) => {
  console.log('--- New Request ---');
  console.log('Event:', JSON.stringify(event, null, 2));
  
  // Add some basic logging for the context
  const contextInfo = {
    functionName: context.functionName,
    functionVersion: context.functionVersion,
    invokedFunctionArn: context.invokedFunctionArn,
    memoryLimitInMB: context.memoryLimitInMB,
    awsRequestId: context.awsRequestId,
    logGroupName: context.logGroupName,
    logStreamName: context.logStreamName
  };
  console.log('Context:', JSON.stringify(contextInfo, null, 2));
  
  try {
    const result = await handler(event, context);
    console.log('Response:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error in handler:', error);
    throw error;
  }
};
