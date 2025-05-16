const server = require('../../server');

// Enhanced error handler
exports.handler = async (event, context) => {
  try {
    console.log('Function invoked. Environment variables:', process.env);
    console.log('Current working directory:', process.cwd());
    console.log('__dirname:', __dirname);
    
    const response = await server.handler(event, context);
    
    console.log('Function completed successfully');
    return response;
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
