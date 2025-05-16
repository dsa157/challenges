const server = require('../../server');
const fs = require('fs');
const path = require('path');

// Enhanced error handler
exports.handler = async (event, context) => {
  try {
    console.log('Function invoked. Environment variables:', process.env);
    console.log('Current working directory:', process.cwd());
    console.log('__dirname:', __dirname);
    
    // Basic directory verification
    console.log('DATA_DIR exists:', fs.existsSync(DATA_DIR));
    console.log('DATA_DIR contents:', fs.readdirSync(DATA_DIR));
    console.log('May directory exists:', fs.existsSync(path.join(DATA_DIR, 'may')));
    console.log('May files:', fs.readdirSync(path.join(DATA_DIR, 'may')));

    // Simple response
    return {
      statusCode: 200,
      body: JSON.stringify({
        dataDir: DATA_DIR,
        files: fs.readdirSync(path.join(DATA_DIR, month))
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
