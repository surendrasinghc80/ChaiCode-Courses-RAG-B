import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api/course';

async function makeRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    console.log(`${options.method || 'GET'} ${endpoint}:`, response.status);
    if (response.status >= 400) {
      console.log('  Error:', data.message);
    } else {
      console.log('  Success:', data.message || 'OK');
    }
    return { status: response.status, data };
  } catch (error) {
    console.error(`Error ${options.method || 'GET'} ${endpoint}:`, error.message);
    return { error: error.message };
  }
}

async function testBasicFunctionality() {
  console.log('🧪 Testing Basic Course Functionality...\n');

  // 1. Create a new user
  const newUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'test123',
    age: 25,
    city: 'Test City'
  };

  console.log('1. Creating new user...');
  const userResult = await makeRequest('/signup', {
    method: 'POST',
    body: JSON.stringify(newUser)
  });

  if (userResult.status === 201) {
    const userToken = userResult.data.data.token;
    const userId = userResult.data.data.user.id;
    
    // 2. Test askQuestion without course access (should fail)
    console.log('\n2. Testing askQuestion without course access...');
    await makeRequest('/ask', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        question: 'What is Node.js?'
      })
    });

    // 3. Try to get courses (should work but return empty)
    console.log('\n3. Getting courses list...');
    await makeRequest('/courses', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    // 4. Try to get user courses (should work but return empty)
    console.log('\n4. Getting user courses...');
    await makeRequest('/user-courses', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    console.log('\n✅ Basic functionality tests completed!');
    console.log(`\n📝 Created user ID: ${userId}`);
    console.log(`📝 User token: ${userToken.substring(0, 20)}...`);
  }
}

testBasicFunctionality().catch(console.error);
