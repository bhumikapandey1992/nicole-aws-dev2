// Test email sending functionality
const testEmailSending = async () => {
  try {
    // Simulate the weekly challenge email logic
    const response = await fetch('http://localhost:5173/wapi/send-weekly-challenge-emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));
    
    if (response.status === 401) {
      console.log('Auth required - this is expected in production');
      
      // Let's try a direct test by calling the endpoint with a test payload
      const testResponse = await fetch('http://localhost:5173/wapi/ping', {
        method: 'GET'
      });
      
      console.log('Ping test:', await testResponse.text());
    }
    
  } catch (error) {
    console.error('Error testing email:', error.message);
  }
};

testEmailSending();
