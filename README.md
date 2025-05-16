# Daily Art Challenges

## Setup
1. Install dependencies: `npm install`
2. Build project: `npm run build`
3. Start server: `npm start`

## Usage
Access API: `GET /search?month=may&day=<day_number>`

## Debugging

Enable debug logging with environment variables:

```bash
# All debug output
DEBUG=server* npm start

# Only core server logs
DEBUG=server npm start

# Only data-related logs
DEBUG=server:data npm start

# Only error logs
DEBUG=server:error npm start
```

## Deployment
Configured in `windsurf_deployment.yaml`

a simple tool to grep out the daily art challenge from one or one sites (listed in test files)
