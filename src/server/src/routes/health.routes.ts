import axios from 'axios';
import { Request, Response, Router } from 'express';

const router = Router();
const FABRIC_CONNECTION =
  process.env.FABRIC_CONNECTION || process.env.EC2_IP || 'network.legitifyapp.com';
const RESOURCE_SERVER_PORT = process.env.RESOURCE_SERVER_PORT || 8080;
const RESOURCE_SERVER_URL = `http://${FABRIC_CONNECTION}:${RESOURCE_SERVER_PORT}`;

/**
 * @route GET /health
 * @desc Check server health status
 * @access Public
 */
router.get('/backend', (req: Request, res: Response) => {
  try {
    // Return basic health check for the backend server
    res.status(200).json({
      online: true,
      service: 'backend',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      online: false,
      service: 'backend',
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route GET /ledger/status
 * @desc Check hyperledger fabric network status
 * @access Public
 */
router.get('/ledger', async (req: Request, res: Response) => {
  try {
    // Try to connect to the Fabric resource server
    const response = await axios.get(`${RESOURCE_SERVER_URL}/health`, {
      timeout: 5000, // 5 second timeout
    });

    res.status(200).json({
      online: true,
      service: 'ledger',
      details: response.data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Ledger health check error:', error);
    res.status(200).json({
      online: false,
      service: 'ledger',
      error: 'Failed to connect to the ledger network',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
