const Project = require("../models/Project");
const User = require("../models/Users");

exports.createProject = async (req, res) => {
  try {
    const {
      name,
      projectManager,
      members = [],
      startDate,
      endDate,
      description,
      status,
    } = req.body;

    const requesterId = req.user?.id;
    if (!requesterId) {
      return res.status(401).json({ message: "Unauthorized or invalid user" });
    }

    const requesterExists = await User.findById(requesterId).lean();
    if (!requesterExists) {
      return res.status(401).json({ message: "User not found" });
    }

    const project = new Project({
      name: name.trim(),
      projectManager: projectManager || undefined,
      members,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      description,
      status,
      createdBy: requesterId,
    });

    await project.save();

    const saved = await Project.findById(project._id)
      .populate("projectManager", "name email")
      .populate("members", "name email")
      .lean();

    res.status(201).location(`/api/projects/${saved._id}`).json(saved);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    if (err.code === 11000) {
      return res.status(409).json({ message: "Duplicate key error" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const requesterId = req.user?.id;

    if (!requesterId) {
      return res.status(401).json({ message: "Unauthorized or invalid user" });
    }

    if (req.user?.role && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Forbidden: admin role required" });
    }

    const project = await Project.findById(projectId).exec();
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    await Project.findByIdAndDelete(projectId).exec();
    return res.status(200).json({ message: "Project deleted successfully" });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid project id" });
    }
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getAllProjects = async (req, res) => {
  try {
    if (!req.user?.role || req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Forbidden: admin role required" });
    }

    // Pagination params expected validated outside controller
    const rawPage = req.query.page;
    const rawLimit = req.query.limit;
    let page = Number(rawPage === undefined ? 1 : Number(rawPage));
    if (!Number.isFinite(page) || page < 1) page = 1;

    let limit = Number(rawLimit === undefined ? 20 : Number(rawLimit));
    if (!Number.isFinite(limit) || limit < 1) limit = 20;
    const MAX_LIMIT = 200;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const skip = (page - 1) * limit;

    const filter = {}; // Placeholder for future filters

    const [total, projects] = await Promise.all([
      Project.countDocuments(filter),
      Project.find(filter)
        .select(
          "name projectManager members startDate endDate status createdBy createdAt updatedAt"
        )
        .populate("projectManager", "firstName lastName email userName")
        .populate("members", "firstName lastName email userName")
        .sort("-createdAt")
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
      meta: {
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    console.error("getAllProjects error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const requesterId = req.user?.id;

    if (!requesterId) {
      return res.status(401).json({ message: "Unauthorized or invalid user" });
    }
    if (req.user?.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Forbidden: admin role required" });
    }

    const requesterExists = await User.findById(requesterId).lean();
    if (!requesterExists) {
      return res.status(401).json({ message: "User not found" });
    }

    const project = await Project.findById(projectId).exec();
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const {
      name,
      projectManager,
      members,
      startDate,
      endDate,
      description,
      status,
    } = req.body;

    const newStartDate = startDate ? new Date(startDate) : project.startDate;
    const newEndDate = endDate ? new Date(endDate) : project.endDate;
    if (newStartDate && newEndDate && newStartDate > newEndDate) {
      return res
        .status(400)
        .json({ message: "startDate must be before or equal to endDate" });
    }

    if (name !== undefined) project.name = name.trim();
    if (projectManager !== undefined) project.projectManager = projectManager;
    if (members !== undefined) project.members = members;
    if (startDate !== undefined) project.startDate = newStartDate;
    if (endDate !== undefined) project.endDate = newEndDate;
    if (description !== undefined) project.description = description;
    if (status !== undefined) project.status = status;

    await project.save();

    const updated = await Project.findById(project._id)
      .populate("projectManager", "name email")
      .populate("members", "name email")
      .lean()
      .exec();

    return res.status(200).json(updated);
  } catch (err) {
    if (err.name === "ValidationError")
      return res.status(400).json({ message: err.message });
    if (err.code === 11000)
      return res.status(409).json({ message: "Duplicate key error" });
    return res.status(500).json({ message: "Server error" });
  }
};

exports.assignUserToProject = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const { userId } = req.body;

    const project = await Project.findById(projectId).exec();
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const user = await User.findOne({ _id: userId, role: "user" }).exec();
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found or not a valid user role" });
    }

    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { $addToSet: { members: userId } },
      { new: true }
    )
      .populate("projectManager", "name email")
      .populate("members", "name email")
      .lean();

    return res
      .status(200)
      .json({ message: "User assigned successfully", project: updatedProject });
  } catch (err) {
    console.error("assignUserToProject error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getProjectsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user?.id;

    if (!requesterId) {
      return res.status(401).json({ message: "Unauthorized or invalid user" });
    }
    const userExists = await User.findById(userId).lean();
    if (!userExists) {
      return res.status(404).json({ message: "User not found" });
    }
    const rawPage = req.query.page;
    const rawLimit = req.query.limit;
    let page = Number(rawPage === undefined ? 1 : Number(rawPage));
    if (!Number.isFinite(page) || page < 1) page = 1;

    let limit = Number(rawLimit === undefined ? 20 : Number(rawLimit));
    if (!Number.isFinite(limit) || limit < 1) limit = 20;
    const MAX_LIMIT = 200;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const skip = (page - 1) * limit;

    const filter = {
      $or: [{ projectManager: userId }, { members: userId }],
    };

    const [total, projects] = await Promise.all([
      Project.countDocuments(filter),
      Project.find(filter)
        .select(
          "name projectManager members startDate endDate status createdBy createdAt updatedAt"
        )
        .populate("projectManager", "firstName lastName email userName")
        .populate("members", "firstName lastName email userName")
        .sort("-createdAt")
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
      meta: {
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    console.error("getProjectsByUserId error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
