const { execSync, spawn } = require('child_process');
const path = require('path');

const PORT = 9002;

// Kill any process using the port
function killPort(port) {
  try {
    // For macOS/Linux
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`);
  } catch (error) {
    // Ignore errors if no process is found
  }
  try {
    // For Windows
    execSync(`netstat -ano | findstr :${port} | findstr LISTENING`);
    execSync(`taskkill /F /PID ${port}`);
  } catch (error) {
    // Ignore errors if no process is found
  }
}

// Kill any existing process on the port
killPort(PORT);

// Start the server
const server = spawn('npx', ['netlify', 'dev'], {
  stdio: 'inherit',
  env: { ...process.env, PORT }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Stopping server...');
  server.kill();
  process.exit();
});
