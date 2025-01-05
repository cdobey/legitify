"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("../app"));
const fabricGateway_1 = require("../fabricGateway");
app_1.default.post("/issueDegree", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id, university, recipient, title, issueDate } = req.body;
        const { network, gateway } = yield (0, fabricGateway_1.getNetwork)();
        const contract = network.getContract("degreeCC");
        const result = yield contract.submitTransaction("IssueDegree", id, university, recipient, title, issueDate);
        yield gateway.disconnect();
        res.json({ message: "Degree issued", result: result.toString() });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}));
