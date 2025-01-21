import express, { Request, Response } from "express";

import cors from "cors";
import dotenv from "dotenv";
import indexRoutes from "./routes/index";
import prisma from "./prisma/client";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Basic test route
app.get("/", (req: Request, res: Response) => {
  res.send("TypeScript Fabric Degree API Running...");
});

// Add routes
app.use("/", indexRoutes);

// Start Server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/docs`);
});

// Graceful Shutdown
const shutdown = async () => {
  console.log("Shutting down server...");
  await prisma.$disconnect();
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export default app;
