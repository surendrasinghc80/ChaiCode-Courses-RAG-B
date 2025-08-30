import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api/course';

// Test data
const adminCredentials = {
  username: 'admin',
  email: 'admin@example.com',
  password: 'admin123',
  age: 30,
  city: 'New York'
};

const userCredentials = {
  username: 'testuser',
  email: 'user@example.com',
  password: 'user123',
  age: 25,
  city: 'Los Angeles'
};

const testCourse = {
  id: 'nodejs101',
  title: 'Node.js Fundamentals',
  description: 'Learn the basics of Node.js development',
  topic: 'nodejs',
  difficulty: 'beginner',
  duration: 120,
  price: 99.99
};

let adminToken = '';
let userToken = '';
let adminUserId = '';
let userUserId = '';

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
    console.log(`${options.method || 'GET'} ${endpoint}:`, response.status, data);
    return { status: response.status, data };
  } catch (error) {
    console.error(`Error ${options.method || 'GET'} ${endpoint}:`, error.message);
    return { error: error.message };
  }
}

async function testCourseAPIs() {
  console.log('🚀 Starting Course API Tests...\n');

  // 1. Create admin user
  console.log('1. Creating admin user...');
  const adminSignup = await makeRequest('/signup', {
    method: 'POST',
    body: JSON.stringify(adminCredentials)
  });

  if (adminSignup.status === 201) {
    adminToken = adminSignup.data.data.token;
    adminUserId = adminSignup.data.data.user.id;
    
    // Update user role to admin (this would normally be done via database)
    console.log('   Admin user created successfully');
  }

  // 2. Create regular user
  console.log('\n2. Creating regular user...');
  const userSignup = await makeRequest('/signup', {
    method: 'POST',
    body: JSON.stringify(userCredentials)
  });

  if (userSignup.status === 201) {
    userToken = userSignup.data.data.token;
    userUserId = userSignup.data.data.user.id;
    console.log('   Regular user created successfully');
  }

  // 3. Create a course (admin only)
  console.log('\n3. Creating a course (admin)...');
  const createCourse = await makeRequest('/courses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify(testCourse)
  });

  // 4. Get all courses
  console.log('\n4. Getting all courses...');
  await makeRequest('/courses', {
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });

  // 5. Grant course access to user
  console.log('\n5. Granting course access to user...');
  await makeRequest('/grant-access', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      userId: userUserId,
      courseId: testCourse.id,
      accessType: 'granted'
    })
  });

  // 6. Get user's courses
  console.log('\n6. Getting user courses...');
  await makeRequest(`/user-courses/${userUserId}`, {
    headers: {
      'Authorization': `Bearer ${userToken}`
    }
  });

  // 7. Test askQuestion API (should work with course access)
  console.log('\n7. Testing askQuestion API...');
  await makeRequest('/ask', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      question: 'What is Node.js?'
    })
  });

  // 8. Test course update (admin only)
  console.log('\n8. Updating course...');
  await makeRequest(`/courses/${testCourse.id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      title: 'Advanced Node.js Fundamentals',
      price: 149.99
    })
  });

  // 9. Revoke course access
  console.log('\n9. Revoking course access...');
  await makeRequest('/revoke-access', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      userId: userUserId,
      courseId: testCourse.id
    })
  });

  // 10. Test askQuestion API after access revoked (should fail)
  console.log('\n10. Testing askQuestion API after access revoked...');
  await makeRequest('/ask', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      question: 'What is Express.js?'
    })
  });

  console.log('\n✅ Course API tests completed!');
}

// Run tests
testCourseAPIs().catch(console.error);
