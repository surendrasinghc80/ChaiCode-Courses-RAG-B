'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Courses', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.STRING,
        comment: 'Unique course identifier (e.g., node101, py101)'
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Course title (e.g., "Introduction to Node.js")'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Course description'
      },
      topic: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Course topic/category (e.g., "node.js", "python", "react.js")'
      },
      difficulty: {
        type: Sequelize.ENUM('beginner', 'intermediate', 'advanced'),
        defaultValue: 'beginner',
        comment: 'Course difficulty level'
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Course duration in minutes'
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.00,
        comment: 'Course price'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Whether the course is active and available'
      },
      vttFileCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of VTT files uploaded for this course'
      },
      vectorCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of vectors stored in Qdrant for this course'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional course metadata'
      },
      createdBy: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Admin user ID who created the course'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('Courses', ['topic']);
    await queryInterface.addIndex('Courses', ['isActive']);
    await queryInterface.addIndex('Courses', ['createdBy']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Courses');
  }
};
