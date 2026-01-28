import { Request, Response, Router } from 'express';
import { testFabricConnection } from '../utils/fabric-helpers';

const router = Router();

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
    // If mock, return true
    if (process.env.MOCK_LEDGER === 'true') {
      res.status(200).json({
        online: true,
        service: 'ledger',
        details: 'Mocked Fabric Network',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Test Fabric connection using our fabric-helpers
    const connectionResult = await testFabricConnection('orgissuer');

    if (connectionResult.connected) {
      res.status(200).json({
        online: true,
        service: 'ledger',
        details: 'Hyperledger Fabric network is connected',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(200).json({
        online: false,
        service: 'ledger',
        error: connectionResult.error || 'Failed to connect to the ledger network',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Ledger health check error:', error);
    res.status(200).json({
      online: false,
      service: 'ledger',
      error: error instanceof Error ? error.message : 'Failed to connect to the ledger network',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
