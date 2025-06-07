// Edge function to redirect to today's challenge
const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

exports.handler = async (event, context) => {
  try {
    const now = new Date();
    const month = months[now.getMonth()];
    const day = String(now.getDate()).padStart(2, '0');
    
    return {
      statusCode: 302,
      headers: {
        'Location': `/.netlify/functions/server/api/search?month=${month}&day=${day}`,
        'Cache-Control': 'no-cache',
      },
    };
  } catch (error) {
    console.error('Redirect error:', error);
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: false,
        error: 'Failed to redirect to today\'s challenge',
        message: error.message
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }
};
