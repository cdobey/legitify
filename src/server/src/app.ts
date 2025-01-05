import express, { Request, Response } from "express";

import bodyParser from "body-parser";
import cors from "cors";

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// Basic test route
app.get("/", (req: Request, res: Response) => {
  res.send("Hello from the Hyperledger Fabric Express server!");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

export default app;
