const server = require('../../server');
const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(__dirname, '../data');

// Enhanced error handler
exports.handler = async (event, context) => {
  try {
    const { month, day } = event.queryStringParameters || {};
    
    if (!month || !day) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Month and day parameters required' })
      };
    }

    console.log('Searching for:', month, day);
    
    console.log('Function invoked. Environment variables:', process.env);
    console.log('Current working directory:', process.cwd());
    console.log('__dirname:', __dirname);
    
    // Basic directory verification
    console.log('DATA_DIR exists:', fs.existsSync(DATA_DIR));
    console.log('DATA_DIR contents:', fs.readdirSync(DATA_DIR));
    console.log('May directory exists:', fs.existsSync(path.join(DATA_DIR, 'may')));
    console.log('May files:', fs.readdirSync(path.join(DATA_DIR, 'may')));

    // Search logic
    const results = await searchFiles(month, day);
    return {
      statusCode: 200,
      body: JSON.stringify({
        source: results[0].source,
        date: results[0].date,
        challenge: results[0].challenge
      })
    };
  } catch (error) {
    console.error('FUNCTION CRASHED:', error);
    console.error('Stack trace:', error.stack);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal Server Error',
        details: process.env.NETLIFY_DEV ? error.message : 'See logs'
      })
    };
  }
};

function isNetlify() {
  return !!process.env.NETLIFY || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
}

async function searchFiles(month, day) {
  const monthDir = path.join(DATA_DIR, month);
  const files = fs.readdirSync(monthDir);
  
  return files.map(file => {
    const content = fs.readFileSync(path.join(monthDir, file), 'utf8');
    const matches = content.split('\n')
      .filter(line => line.includes(`${month} ${day}:`));
      
    return {
      source: file,
      date: `${month} ${day}`,
      challenge: matches.map(m => m.replace(`${month} ${day}:`, '').trim()).join('\n')
    };
  }).filter(r => r.challenge !== '');
}
