import app from "./app";
import db from "./config/db";
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await db.authenticate();
    console.log("Database connected");

    app.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
      console.log(`Swagger at http://localhost:${PORT}/docs`);
    });
  } catch (error) {
    console.error("Unable to start server:", error);
  }
})();
