import express from "express";
import mongoose from "mongoose";

import auth from "../middleware/auth.js";
import File from "../models/File.js";
import Room from "../models/Room.js";

const router = express.Router();
router.use(auth);

function isValidObjectId(value) {
  return typeof value === "string" && mongoose.Types.ObjectId.isValid(value);
}

async function getRoomRole(roomId, userId) {
  const room = await Room.findById(roomId).select("createdBy members").lean();
  if (!room) return null;
  const member = (room.members || []).find((item) => {
    if (item?.user) return item.user.toString() === userId;
    return item?.toString?.() === userId;
  });
  if (!member) return null;
  if (member?.role) return member.role;
  return room.createdBy?.toString?.() === userId ? "owner" : "editor";
}

router.get("/", async (req, res) => {
  try {
    const { roomId } = req.query || {};
    if (!roomId) {
      return res.status(400).json({ error: "roomId is required" });
    }
    if (!isValidObjectId(roomId)) {
      return res.status(400).json({ error: "Invalid roomId" });
    }

    const files = await File.find({ roomId }).lean();
    files.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1; // folders first
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });

    return res.json(files);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/create", async (req, res) => {
  try {
    const { name, type, content, language, parentId, roomId } = req.body || {};

    if (!name || !type || !roomId) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (type !== "file" && type !== "folder") {
      return res.status(400).json({ error: "Invalid type" });
    }
    if (!isValidObjectId(roomId)) {
      return res.status(400).json({ error: "Invalid roomId" });
    }

    const role = await getRoomRole(roomId, req.user.id);
    if (!role) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (role === "viewer") {
      return res.status(403).json({ error: "Viewer role cannot modify files" });
    }

    const normalizedParentId =
      parentId === undefined || parentId === null ? null : parentId;
    if (normalizedParentId !== null && !isValidObjectId(normalizedParentId)) {
      return res.status(400).json({ error: "Invalid parentId" });
    }

    const normalizedContent =
      type === "file" ? (content === undefined ? "" : String(content)) : "";
    const normalizedLanguage =
      language === undefined || language === null ? "javascript" : String(language);

    const file = await File.create({
      name,
      type,
      content: normalizedContent,
      language: normalizedLanguage,
      parentId: normalizedParentId,
      roomId,
      createdBy: req.user.id,
    });

    return res.json(file);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/update", async (req, res) => {
  try {
    const { fileId, name, content, language } = req.body || {};
    if (!fileId) {
      return res.status(400).json({ error: "fileId is required" });
    }
    if (!isValidObjectId(fileId)) {
      return res.status(400).json({ error: "Invalid fileId" });
    }

    if (name === undefined && content === undefined && language === undefined) {
      return res.status(400).json({ error: "No fields provided for update" });
    }

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const role = await getRoomRole(file.roomId, req.user.id);
    if (!role) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (role === "viewer") {
      return res.status(403).json({ error: "Viewer role cannot edit files" });
    }

    if (name !== undefined) file.name = String(name);
    if (content !== undefined) file.content = String(content);
    if (language !== undefined) file.language = String(language);

    file.updatedAt = Date.now();
    await file.save();

    return res.json(file);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/delete", async (req, res) => {
  try {
    const { fileId } = req.body || {};
    if (!fileId) {
      return res.status(400).json({ error: "fileId is required" });
    }
    if (!isValidObjectId(fileId)) {
      return res.status(400).json({ error: "Invalid fileId" });
    }

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const role = await getRoomRole(file.roomId, req.user.id);
    if (!role) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (role === "viewer") {
      return res.status(403).json({ error: "Viewer role cannot delete files" });
    }

    if (file.type === "folder") {
      const toDeleteIds = new Set([file._id.toString()]);
      const queue = [file._id];

      while (queue.length > 0) {
        const current = queue.pop();
        const children = await File.find({
          roomId: file.roomId,
          parentId: current,
        }).select("_id");

        for (const child of children) {
          const childId = child._id.toString();
          if (!toDeleteIds.has(childId)) {
            toDeleteIds.add(childId);
            queue.push(child._id);
          }
        }
      }

      await File.deleteMany({ _id: { $in: [...toDeleteIds] } });
    } else {
      await File.deleteOne({ _id: file._id });
    }

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

