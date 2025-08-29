import { sequelize, testConnection } from "./src/config/database.js";
import Archive from "./src/models/Archive.js";
import User from "./src/models/User.js";
import "./src/models/index.js";

const testArchiveAPIs = async () => {
  try {
    console.log("🔍 Testing Archive API Functions...\n");

    await testConnection();

    // Test 1: Check if Archive model works
    console.log("1. Testing Archive model:");
    try {
      const archiveCount = await Archive.count();
      console.log(
        `✅ Archive model working - found ${archiveCount} archives\n`
      );
    } catch (error) {
      console.log(`❌ Archive model error: ${error.message}\n`);
    }

    // Test 2: Test getUserArchives query logic
    console.log("2. Testing getUserArchives query:");
    try {
      const testUserId = 1; // Use existing user ID
      const whereConditions = {
        userId: testUserId,
        isActive: true,
      };

      const archives = await Archive.findAndCountAll({
        where: whereConditions,
        order: [["archivedAt", "DESC"]],
        limit: 10,
        offset: 0,
      });

      console.log(
        `✅ getUserArchives query working - found ${archives.count} archives for user ${testUserId}\n`
      );
    } catch (error) {
      console.log(`❌ getUserArchives query error: ${error.message}\n`);
    }

    // Test 3: Test getArchiveStats query logic
    console.log("3. Testing getArchiveStats query:");
    try {
      const testUserId = 1;
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const archivesByMonth = await Archive.findAll({
        where: {
          userId: testUserId,
          isActive: true,
          archivedAt: {
            [sequelize.Sequelize.Op.gte]: sixMonthsAgo,
          },
        },
        attributes: [
          [
            sequelize.fn(
              "DATE_FORMAT",
              sequelize.col("archivedAt"),
              "%Y-%m-01"
            ),
            "month",
          ],
          [sequelize.fn("COUNT", "*"), "count"],
        ],
        group: [
          sequelize.fn("DATE_FORMAT", sequelize.col("archivedAt"), "%Y-%m-01"),
        ],
        order: [
          [
            sequelize.fn(
              "DATE_FORMAT",
              sequelize.col("archivedAt"),
              "%Y-%m-01"
            ),
            "ASC",
          ],
        ],
      });

      console.log(
        `✅ getArchiveStats query working - found ${archivesByMonth.length} monthly records\n`
      );
    } catch (error) {
      console.log(`❌ getArchiveStats query error: ${error.message}\n`);
    }

    console.log("🎉 Archive API test completed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  } finally {
    await sequelize.close();
  }
};

testArchiveAPIs();
