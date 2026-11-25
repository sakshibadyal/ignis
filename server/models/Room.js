import mongoose from "mongoose";

const RoomMemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["owner", "editor", "viewer"], default: "viewer" },
  },
  { _id: false }
);

const RoomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  members: [RoomMemberSchema],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Room", RoomSchema);

