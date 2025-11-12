import express, { Request, Response } from "express";
import request from "supertest";

jest.mock("../../../controllers/reportController", () => ({
  submitReport: jest.fn((req: Request, res: Response) =>
    res.status(201).json({ route: "submitReport", body: req.body }),
  ),
}));

import reportRouter from "../../../routes/reportRouter";
import { submitReport } from "../../../controllers/reportController";

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api", reportRouter);
  return app;
};

describe("reportRouter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/reports", () => {
    it("routes to reportController.submitReport and returns 201", async () => {
      const app = makeApp();
      const payload = { any: "thing" }; // the controller in app ignores body; here we just check wiring

      const res = await request(app).post("/api/reports").send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ route: "submitReport", body: payload });
      expect(submitReport).toHaveBeenCalledTimes(1);
    });
  });
});
