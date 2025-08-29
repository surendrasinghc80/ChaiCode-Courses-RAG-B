"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "role", {
      type: Sequelize.ENUM("user", "admin"),
      allowNull: false,
      defaultValue: "user",
    });

    await queryInterface.addColumn("users", "isActive", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    await queryInterface.addColumn("users", "messageCount", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("users", "role");
    await queryInterface.removeColumn("users", "isActive");
    await queryInterface.removeColumn("users", "messageCount");
  },
};
