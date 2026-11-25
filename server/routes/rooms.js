import express from "express";
import Room from "../models/Room.js";
import User from "../models/User.js";
import auth from "../middleware/auth.js";

const router = express.Router();
router.use(auth);

function getMemberRole(room, userId) {
  const member = (room.members || []).find((item) => {
    if (item?.user) return item.user.toString() === userId;
    return item?.toString?.() === userId;
  });
  if (!member) return null;
  if (member?.role) return member.role;
  return room.createdBy?.toString?.() === userId ? "owner" : "editor";
}

function normalizeRoomResponse(room, userId) {
  return {
    ...room.toObject(),
    currentUserRole: getMemberRole(room, userId),
  };
}

function generateRoomIdCandidate() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function generateUniqueRoomId() {
  // Keep trying until we find a value that isn't already used.
  for (let i = 0; i < 20; i++) {
    const roomId = generateRoomIdCandidate();
    const exists = await Room.exists({ roomId });
    if (!exists) return roomId;
  }
  throw new Error("Failed to generate a unique roomId");
}

router.post("/create", async (req, res) => {
  try {
    const { name } = req.body || {};

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const roomId = await generateUniqueRoomId();

    const room = await Room.create({
      roomId,
      name,
      createdBy: req.user.id,
      members: [{ user: req.user.id, role: "owner" }],
    });

    return res.json(normalizeRoomResponse(room, req.user.id));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/join", async (req, res) => {
  try {
    const { roomId } = req.body || {};
    if (!roomId) {
      return res.status(400).json({ error: "roomId is required" });
    }

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const userId = req.user.id;
    const alreadyMember = room.members.some((item) => {
      if (item?.user) return item.user.toString() === userId;
      return item?.toString?.() === userId;
    });
    if (!alreadyMember) {
      room.members.push({ user: userId, role: "viewer" });
      await room.save();
    }

    return res.json(normalizeRoomResponse(room, req.user.id));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});


router.get("/my", async (req, res) => {
  try {
    const rooms = await Room.find({
      "members.user": req.user.id
    });

    return res.json(
      rooms.map((room) => normalizeRoomResponse(room, req.user.id))
    );

  } catch (err) {
    console.error("GET MY ROOMS ERROR:", err);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
});


router.get("/members", async (req, res) => {
  try {
    const { roomId } = req.query || {};
    if (!roomId) {
      return res.status(400).json({ error: "roomId is required" });
    }

    const room = await Room.findOne({ roomId }).populate("members.user", "name email").lean();
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const currentUserId = req.user.id;
    const isMember = (room.members || []).some((item) => item?.user?._id?.toString() === currentUserId);
    if (!isMember) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.json({
      roomId: room.roomId,
      currentUserRole: getMemberRole(room, currentUserId),
      members: (room.members || []).map((member) => ({
        userId: member?.user?._id?.toString?.() || "",
        name: member?.user?.name || "User",
        email: member?.user?.email || "",
        role: member?.role || "viewer",
      })),
    });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/member-role", async (req, res) => {
  try {
    const { roomId, memberUserId, role } = req.body || {};
    if (!roomId || !memberUserId || !role) {
      return res.status(400).json({ error: "roomId, memberUserId and role are required" });
    }
    if (!["owner", "editor", "viewer"].includes(String(role))) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const requesterRole = getMemberRole(room, req.user.id);
    if (requesterRole !== "owner") {
      return res.status(403).json({ error: "Only owner can change roles" });
    }

    const targetMember = room.members.find(
      (member) => member?.user?.toString?.() === String(memberUserId)
    );
    if (!targetMember) {
      return res.status(404).json({ error: "Member not found" });
    }

    if (targetMember.user.toString() === req.user.id && role !== "owner") {
      return res.status(400).json({ error: "Owner cannot remove own owner role" });
    }

    if (role === "owner") {
      const targetExists = await User.exists({ _id: memberUserId });
      if (!targetExists) {
        return res.status(404).json({ error: "Target user not found" });
      }
      room.members = room.members.map((member) => ({
        user: member.user,
        role: member.user.toString() === String(memberUserId) ? "owner" : "editor",
      }));
      room.createdBy = memberUserId;
    } else {
      targetMember.role = role;
    }

    await room.save();
    const updated = await Room.findOne({ roomId }).populate("members.user", "name email").lean();
    return res.json({
      success: true,
      currentUserRole: getMemberRole(updated, req.user.id),
      members: (updated?.members || []).map((member) => ({
        userId: member?.user?._id?.toString?.() || "",
        name: member?.user?.name || "User",
        email: member?.user?.email || "",
        role: member?.role || "viewer",
      })),
    });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

