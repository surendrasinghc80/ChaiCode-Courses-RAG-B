import { sequelize, testConnection } from "./src/config/database.js";
import User from "./src/models/User.js";
import "./src/models/index.js";

const testRoleBasedAccess = async () => {
  try {
    console.log("🔍 Testing Role-Based Access Control...\n");

    await testConnection();

    // Test 1: Check if admin user was created
    console.log("1. Checking admin user creation:");
    const adminUser = await User.findOne({
      where: { email: "admin@chaicode.com" },
    });
    if (adminUser) {
      console.log("✅ Admin user found:");
      console.log(`   - Username: ${adminUser.username}`);
      console.log(`   - Email: ${adminUser.email}`);
      console.log(`   - Role: ${adminUser.role}`);
      console.log(`   - Active: ${adminUser.isActive}`);
      console.log(`   - Message Count: ${adminUser.messageCount}\n`);
    } else {
      console.log("❌ Admin user not found\n");
    }

    // Test 2: Check existing users have default values
    console.log("2. Checking existing users have role fields:");
    const allUsers = await User.findAll({
      attributes: [
        "id",
        "username",
        "email",
        "role",
        "isActive",
        "messageCount",
      ],
    });

    console.log(`   Found ${allUsers.length} total users:`);
    allUsers.forEach((user) => {
      console.log(
        `   - ${user.username} (${user.email}): role=${user.role}, active=${user.isActive}, messages=${user.messageCount}`
      );
    });
    console.log();

    // Test 3: Verify field constraints
    console.log("3. Testing field constraints:");
    try {
      await User.create({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
        age: 25,
        city: "Test City",
        role: "invalid_role",
      });
      console.log("❌ Role constraint failed - invalid role was accepted");
    } catch (error) {
      console.log("✅ Role constraint working - invalid role rejected");
    }

    console.log("\n🎉 Role-Based Access Control test completed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  } finally {
    await sequelize.close();
  }
};

testRoleBasedAccess();
