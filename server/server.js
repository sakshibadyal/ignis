import dotenv from "dotenv";
import express from "express";
import http from "http";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";

import connectDB from "./db.js";
import authRoutes from "./routes/auth.js";
import roomsRoutes from "./routes/rooms.js";
import filesRoutes from "./routes/files.js";
import terminalRoutes from "./routes/terminal.js";
import initSockets from "./sockets/index.js";

dotenv.config();

const app = express();
const allowedOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...(process.env.CLIENT_ORIGIN ? [process.env.CLIENT_ORIGIN] : []),
]);

const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser clients (curl/postman) and same-origin requests.
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin) || allowedOriginPattern.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

app.use(
  cors(corsOptions)
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/terminal", terminalRoutes);

const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: corsOptions,
});

initSockets(io);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const start = async () => {
  await connectDB();
  httpServer.listen(PORT, () => {
    console.log(`Ignis server running on port ${PORT}`);
  });
};

start().catch(() => {
  process.exit(1);
});

