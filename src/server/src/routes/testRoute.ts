import { Router } from "express";
import { getNetwork } from "../fabricGateway";

const router = Router();

// Test route that issues a degree and then reads it
router.post("/testIntegration", async (req, res) => {
  try {
    const { testId } = req.body;

    const { gateway, contract } = await getNetwork();

    await contract.submitTransaction(
      "IssueDegree",
      testId,
      "UniversityTest",
      "Jane Test",
      "Integration Degree",
      "2025-12-31"
    );

    const resultBytes = await contract.evaluateTransaction(
      "ReadDegree",
      testId
    );
    const result = JSON.parse(resultBytes.toString());

    await gateway.disconnect();

    // Send response without returning
    res.json({
      message: "Integration test successful",
      data: result,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
