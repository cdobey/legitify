import { Request, Response } from "express";

import app from "../app";
import { getNetwork } from "../fabricGateway";

app.post("/issueDegree", async (req: Request, res: Response) => {
  try {
    const { id, university, recipient, title, issueDate } = req.body;

    const { network, gateway } = await getNetwork();

    const contract = network.getContract("degreeCC");
    const result = await contract.submitTransaction(
      "IssueDegree",
      id,
      university,
      recipient,
      title,
      issueDate
    );

    await gateway.disconnect();

    res.json({ message: "Degree issued", result: result.toString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message });
  }
});
