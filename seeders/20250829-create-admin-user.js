import bcrypt from "bcryptjs";

export const up = async (queryInterface, Sequelize) => {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  return queryInterface.bulkInsert("users", [
    {
      username: "admin",
      email: "admin@chaicode.com",
      password: hashedPassword,
      age: 30,
      city: "System",
      role: "admin",
      isActive: true,
      messageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
};

export const down = async (queryInterface, Sequelize) => {
  return queryInterface.bulkDelete("users", {
    email: "admin@chaicode.com",
  });
};
