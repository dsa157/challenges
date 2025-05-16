const server = require('../../server');
const fs = require('fs');
const path = require('path');

// Enhanced error handler
exports.handler = async (event, context) => {
  try {
    console.log('Function invoked. Environment variables:', process.env);
    console.log('Current working directory:', process.cwd());
    console.log('__dirname:', __dirname);
    
    const response = await server.handler(event, context);
    
    console.log('May directory contents:', fs.readdirSync(path.join(DATA_DIR, 'may')));
    
    // Search all files for May {day} entries
    const files = fs.readdirSync(path.join(DATA_DIR, month));
    const matches = [];

    // Debug first file's content
    if (files.length > 0) {
      const sample = fs.readFileSync(path.join(DATA_DIR, month, files[0]), 'utf-8');
      console.log('First 100 chars of', files[0], ':', sample.substring(0, 100));
      
      // Test search pattern
      console.log('Contains "May 16":', sample.includes(`May ${day}`));
    }

    for (const file of files) {
      const content = fs.readFileSync(path.join(DATA_DIR, month, file), 'utf-8');
      const dayLines = content.split('\n').filter(line => 
        line.includes(`May ${day}:`) || 
        line.includes(`May ${day} `)
      );
      
      if (dayLines.length > 0) {
        matches.push({
          file,
          lines: dayLines
        });
      } else {
        console.log('No matches for May', day, 'in', file);
        console.log('Sample line:', content.split('\n')[0]);
      }
    }

    return {
      success: true,
      month,
      day,
      matches
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
