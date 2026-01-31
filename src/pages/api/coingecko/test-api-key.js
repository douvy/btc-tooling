/**
 * Endpoint to test CoinGecko API key status
 */

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Content-Type', 'application/json');
  
  const apiKey = process.env.COINGECKO_API_KEY;
  const keyPrefix = apiKey ? apiKey.substring(0, 5) : 'None';
  
  // DIRECT CONNECTION TEST - bypass our proxy
  console.log(`API Key detected: ${apiKey ? 'Yes' : 'No'} (${keyPrefix}...)`);
  console.log(`Full API Key length: ${apiKey?.length || 0} characters`);
  
  // Construct multiple test URLs to try different parameter formats
  const testEndpoint = 'ping';
  const freeBaseUrl = 'https://api.coingecko.com/api/v3';
  const proBaseUrl = 'https://pro-api.coingecko.com/api/v3';
  
  // Test different parameter formats and URLs
  const testUrls = [
    // Primary test: Free API with x_cg_api_key (this should work with our Demo API key)
    {
      name: 'FREE: x_cg_api_key (DEMO)',
      url: `${freeBaseUrl}/${testEndpoint}?x_cg_api_key=${encodeURIComponent(apiKey || '')}&_t=${Date.now()}`
    },
    // Free API URL with different parameter name (likely won't work)
    {
      name: 'FREE: x_cg_pro_api_key',
      url: `${freeBaseUrl}/${testEndpoint}?x_cg_pro_api_key=${encodeURIComponent(apiKey || '')}&_t=${Date.now()}`
    },
    // Pro API URL tests (these won't work with our Demo key)
    {
      name: 'PRO: x_cg_api_key',
      url: `${proBaseUrl}/${testEndpoint}?x_cg_api_key=${encodeURIComponent(apiKey || '')}&_t=${Date.now()}`
    },
    {
      name: 'PRO: x_cg_pro_api_key',
      url: `${proBaseUrl}/${testEndpoint}?x_cg_pro_api_key=${encodeURIComponent(apiKey || '')}&_t=${Date.now()}`
    }
  ];
  
  // Make the request to multiple test URLs
  try {
    console.log(`Testing CoinGecko API key (${keyPrefix}...) with multiple parameter formats`);
    const startTime = Date.now();
    
    // Results for each test
    const testResults = [];
    
    // Try each URL format
    for (const test of testUrls) {
      console.log(`Testing with parameter: ${test.name}`);
      
      try {
        const testStart = Date.now();
        const response = await fetch(test.url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'BTC-Tooling/1.0'
          },
          cache: 'no-store'
        });
        
        const testTime = Date.now() - testStart;
        console.log(`${test.name} test response: ${response.status} in ${testTime}ms`);
        
        // Get all headers
        const headers = Object.fromEntries([...response.headers.entries()]);
        
        // Check for rate limit headers
        const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
        const rateLimitTotal = response.headers.get('x-ratelimit-limit');
        
        // Get response body
        const body = await response.text();
        let parsedBody = {};
        try {
          if (body) parsedBody = JSON.parse(body);
        } catch (e) {
          // Parse error handled silently
        }
        
        testResults.push({
          paramName: test.name,
          status: response.status,
          success: response.ok,
          rateLimitDetected: !!rateLimitTotal,
          rateLimitRemaining,
          rateLimitTotal,
          responseTime: testTime,
          body: parsedBody,
          headers
        });
      } catch (testError) {
        testResults.push({
          paramName: test.name,
          error: testError.message,
          success: false
        });
      }
    }
    
    // Also try with header-based auth as a last resort
    try {
      console.log('Testing with header-based authentication');
      const headerTest = {
        name: 'PRO: Authorization header',
        url: `${proBaseUrl}/${testEndpoint}?_t=${Date.now()}`
      };
      
      const headerTestStart = Date.now();
      const headerResponse = await fetch(headerTest.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'BTC-Tooling/1.0',
          'Authorization': `Bearer ${apiKey || ''}`
        },
        cache: 'no-store'
      });
      
      const headerTestTime = Date.now() - headerTestStart;
      console.log(`Header auth test response: ${headerResponse.status} in ${headerTestTime}ms`);
      
      // Get all headers
      const headers = Object.fromEntries([...headerResponse.headers.entries()]);
      
      // Check for rate limit headers
      const rateLimitRemaining = headerResponse.headers.get('x-ratelimit-remaining');
      const rateLimitTotal = headerResponse.headers.get('x-ratelimit-limit');
      
      // Get response body
      const body = await headerResponse.text();
      let parsedBody = {};
      try {
        if (body) parsedBody = JSON.parse(body);
      } catch (e) {
        // Parse error handled silently
      }
      
      testResults.push({
        paramName: 'Authorization header',
        status: headerResponse.status,
        success: headerResponse.ok,
        rateLimitDetected: !!rateLimitTotal,
        rateLimitRemaining,
        rateLimitTotal,
        responseTime: headerTestTime,
        body: parsedBody,
        headers
      });
    } catch (headerError) {
      testResults.push({
        paramName: 'Authorization header',
        error: headerError.message,
        success: false
      });
    }
    
    // Determine which method worked best
    const workingTest = testResults.find(test => 
      test.success && test.rateLimitDetected && test.rateLimitTotal
    );
    
    // Determine recommended parameter format
    let recommendedParam = 'unknown';
    if (workingTest) {
      recommendedParam = workingTest.paramName;
      console.log(`✅ Found working parameter format: ${recommendedParam}`);
    } else {
      console.log('❌ No working parameter format found');
    }
    
    // Create the result object
    const result = {
      apiKeyPrefix: keyPrefix,
      apiKeyLength: apiKey?.length || 0,
      testResults,
      workingParameter: recommendedParam,
      recommendedConfig: workingTest 
        ? `Use ${recommendedParam} as parameter name` 
        : 'API key might be invalid or expired',
      timestamp: new Date().toISOString(),
      totalTestTime: `${Date.now() - startTime}ms`
    };
    
    // Return the response
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      status: 500,
      success: false,
      apiKeyPrefix: keyPrefix,
      apiKeyStatus: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}