'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('UserCourses', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Reference to user ID'
      },
      courseId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'Courses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Reference to course ID'
      },
      accessType: {
        type: Sequelize.ENUM('purchased', 'granted', 'trial'),
        defaultValue: 'purchased',
        comment: 'How the user got access to this course'
      },
      purchaseDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the user purchased/got access to the course'
      },
      expiryDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the access expires (null for lifetime access)'
      },
      progress: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0.00,
        comment: 'Course completion percentage (0.00 to 100.00)'
      },
      lastAccessedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the user last accessed this course'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Whether the user access is active'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional access metadata'
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

    // Add unique constraint to prevent duplicate user-course combinations
    await queryInterface.addIndex('UserCourses', ['userId', 'courseId'], {
      unique: true,
      name: 'unique_user_course'
    });

    // Add indexes for better performance
    await queryInterface.addIndex('UserCourses', ['userId']);
    await queryInterface.addIndex('UserCourses', ['courseId']);
    await queryInterface.addIndex('UserCourses', ['isActive']);
    await queryInterface.addIndex('UserCourses', ['accessType']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('UserCourses');
  }
};
