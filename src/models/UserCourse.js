import { DataTypes } from "sequelize";

const UserCourse = (sequelize) => {
  const UserCourseModel = sequelize.define(
    "UserCourse",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Reference to user ID",
      },
      courseId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Reference to course ID",
      },
      accessType: {
        type: DataTypes.ENUM("purchased", "granted", "trial"),
        defaultValue: "purchased",
        comment: "How the user got access to this course",
      },
      purchaseDate: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "When the user purchased/got access to the course",
      },
      expiryDate: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "When the access expires (null for lifetime access)",
      },
      progress: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.0,
        comment: "Course completion percentage (0.00 to 100.00)",
      },
      lastAccessedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "When the user last accessed this course",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: "Whether the user access is active",
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Additional access metadata",
      },
    },
    {
      tableName: "UserCourses",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["userId", "courseId"],
          name: "unique_user_course",
        },
        {
          fields: ["userId"],
        },
        {
          fields: ["courseId"],
        },
        {
          fields: ["isActive"],
        },
        {
          fields: ["accessType"],
        },
      ],
    }
  );

  // Instance methods
  UserCourseModel.prototype.updateLastAccessed = function () {
    return this.update({ lastAccessedAt: new Date() });
  };

  UserCourseModel.prototype.updateProgress = function (progressPercent) {
    return this.update({ progress: Math.min(100, Math.max(0, progressPercent)) });
  };

  UserCourseModel.prototype.isExpired = function () {
    if (!this.expiryDate) return false;
    return new Date() > this.expiryDate;
  };

  UserCourseModel.prototype.hasValidAccess = function () {
    return this.isActive && !this.isExpired();
  };

  // Class methods
  UserCourseModel.findUserCourses = function (userId, options = {}) {
    return this.findAll({
      where: {
        userId,
        isActive: true,
      },
      include: [
        {
          model: sequelize.models.Course,
          as: "course",
          where: { isActive: true },
        },
      ],
      order: [["purchaseDate", "DESC"]],
      ...options,
    });
  };

  UserCourseModel.findActiveCourseIds = function (userId) {
    return this.findAll({
      where: {
        userId,
        isActive: true,
      },
      attributes: ["courseId"],
      include: [
        {
          model: sequelize.models.Course,
          as: "course",
          where: { isActive: true },
          attributes: [],
        },
      ],
    }).then((results) => results.map((r) => r.courseId));
  };

  UserCourseModel.hasAccess = function (userId, courseId) {
    return this.findOne({
      where: {
        userId,
        courseId,
        isActive: true,
      },
      include: [
        {
          model: sequelize.models.Course,
          as: "course",
          where: { isActive: true },
        },
      ],
    }).then((access) => {
      if (!access) return false;
      return access.hasValidAccess();
    });
  };

  UserCourseModel.grantAccess = function (userId, courseId, accessType = "granted", expiryDate = null) {
    return this.upsert({
      userId,
      courseId,
      accessType,
      purchaseDate: new Date(),
      expiryDate,
      isActive: true,
    });
  };

  return UserCourseModel;
};

export default UserCourse;
