import mongoose from "mongoose";

const FileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["file", "folder"], required: true },
  content: { type: String, default: "" }, // only meaningful for type === 'file'
  language: { type: String, default: "javascript" },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: "File", default: null }, // null = root
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("File", FileSchema);

