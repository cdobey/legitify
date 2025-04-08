import { Router } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const router = Router();

// Swagger Configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'Legitify API', version: '1.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'Supabase JWT Token',
        },
      },
      schemas: {
        LoginResponse: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'Supabase access token',
            },
          },
        },
        AuthTestResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Success message',
            },
            user: {
              type: 'object',
              properties: {
                uid: { type: 'string' },
                role: { type: 'string' },
                orgName: { type: 'string' },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export default router;
