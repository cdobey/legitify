import express, { Request, Response } from "express";

import cors from "cors";
import dotenv from "dotenv";
import indexRoutes from "./routes/index";
import morgan from "morgan";
import prisma from "./prisma/client";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Basic test route
app.get("/", (req: Request, res: Response) => {
  res.send("TypeScript + Go Chaincode Degree API with Prisma");
});

// Add routes
app.use("/", indexRoutes);

// Start Server
const startServer = async () => {
  try {
    await prisma.$connect();
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Swagger docs available at http://localhost:${PORT}/docs`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
const shutdown = async () => {
  console.log("Shutting down server...");
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export default app;
