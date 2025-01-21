import express, { Request, Response } from "express";

import cors from "cors";
import indexRoutes from "./routes/index";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import userRoutes from "./routes/user.routes";

const app = express();

app.use(cors());
app.use(express.json());

// Swagger setup
const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Fabric Degree API - TypeScript",
      version: "1.0.0",
      description: "API Documentation",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.ts"], // Adjust the path to your route files
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Basic test route
app.get("/", (req: Request, res: Response) => {
  res.send("TypeScript Fabric Degree API Running...");
});

// Add routes
app.use("/", indexRoutes);
app.use("/", userRoutes);

export default app;
