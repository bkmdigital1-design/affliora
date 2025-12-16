// Cloudflare Worker to handle ConvertKit API requests
export async function onRequestPost(context) {
  // Enable CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight request
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName = '', tags = [] } = await context.request.json();
    
    // Validate email
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get API key from environment variable
    const API_KEY = context.env.CONVERTKIT_API_KEY;
    const FORM_ID = context.env.CONVERTKIT_FORM_ID;

    if (!API_KEY || !FORM_ID) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Subscribe to ConvertKit
    const response = await fetch(
      `https://api.convertkit.com/v3/forms/${FORM_ID}/subscribe`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          api_key: API_KEY,
          email: email.toLowerCase().trim(),
          first_name: firstName,
          tags: tags
        })
      }
    );

    const data = await response.json();

    if (response.ok) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Successfully subscribed!',
          subscriber: data.subscription
        }),
        { status: 200, headers: corsHeaders }
      );
    } else {
      // Handle ConvertKit errors
      return new Response(
        JSON.stringify({ 
          error: data.message || 'Subscription failed',
          details: data
        }),
        { status: response.status, headers: corsHeaders }
      );
    }

  } catch (error) {
    console.error('ConvertKit API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle OPTIONS request for CORS
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}