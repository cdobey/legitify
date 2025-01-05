"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const testRoute_1 = __importDefault(require("./routes/testRoute"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
// Basic test route
app.get("/", (req, res) => {
    res.send("Hello from the Hyperledger Fabric Express server!");
});
// Add test routes
app.use("/", testRoute_1.default);
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
exports.default = app;
