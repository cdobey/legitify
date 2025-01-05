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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fabricGateway_1 = require("../fabricGateway");
const router = (0, express_1.Router)();
// Test route that issues a degree and then reads it
router.post("/testIntegration", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { testId } = req.body;
        const { gateway, contract } = yield (0, fabricGateway_1.getNetwork)();
        yield contract.submitTransaction("IssueDegree", testId, "UniversityTest", "Jane Test", "Integration Degree", "2025-12-31");
        const resultBytes = yield contract.evaluateTransaction("ReadDegree", testId);
        const result = JSON.parse(resultBytes.toString());
        yield gateway.disconnect();
        // Send response without returning
        res.json({
            message: "Integration test successful",
            data: result,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}));
exports.default = router;
