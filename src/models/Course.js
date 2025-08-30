import { DataTypes } from "sequelize";

const Course = (sequelize) => {
  const CourseModel = sequelize.define(
    "Course",
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        comment: "Unique course identifier (e.g., node101, py101)",
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Course title (e.g., "Introduction to Node.js")',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Course description",
      },
      topic: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Course topic/category (e.g., "node.js", "python", "react.js")',
      },
      difficulty: {
        type: DataTypes.ENUM("beginner", "intermediate", "advanced"),
        defaultValue: "beginner",
        comment: "Course difficulty level",
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Course duration in minutes",
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
        comment: "Course price",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: "Whether the course is active and available",
      },
      vttFileCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: "Number of VTT files uploaded for this course",
      },
      vectorCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: "Number of vectors stored in Qdrant for this course",
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Additional course metadata",
      },
      createdBy: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Admin user ID who created the course",
      },
    },
    {
      tableName: "Courses",
      timestamps: true,
      indexes: [
        {
          fields: ["topic"],
        },
        {
          fields: ["isActive"],
        },
        {
          fields: ["createdBy"],
        },
      ],
    }
  );

  // Instance methods
  CourseModel.prototype.incrementVttCount = function () {
    return this.increment("vttFileCount");
  };

  CourseModel.prototype.incrementVectorCount = function (count = 1) {
    return this.increment("vectorCount", { by: count });
  };

  CourseModel.prototype.updateProgress = function (vttCount, vectorCount) {
    return this.update({
      vttFileCount: vttCount,
      vectorCount: vectorCount,
    });
  };

  // Class methods
  CourseModel.findActiveCourses = function (options = {}) {
    return this.findAll({
      where: {
        isActive: true,
      },
      order: [["createdAt", "DESC"]],
      ...options,
    });
  };

  CourseModel.findByTopic = function (topic, options = {}) {
    return this.findAll({
      where: {
        topic,
        isActive: true,
      },
      order: [["createdAt", "DESC"]],
      ...options,
    });
  };

  CourseModel.findByCreator = function (createdBy, options = {}) {
    return this.findAll({
      where: {
        createdBy,
      },
      order: [["createdAt", "DESC"]],
      ...options,
    });
  };

  return CourseModel;
};

export default Course;
