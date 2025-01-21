import express from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import userRoutes from "./user.routes";

const router = express.Router();

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Fabric Degree API - TypeScript",
      version: "1.0.0",
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
  apis: ["./src/routes/*.ts"], // Adjust the path as necessary
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger Documentation Route
router.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Use other route files
router.use(userRoutes);

export default router;
