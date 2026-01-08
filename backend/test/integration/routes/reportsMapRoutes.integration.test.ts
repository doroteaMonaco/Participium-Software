import request from "supertest";
import app from "@app";
import { getTestPrisma } from "../../setup/test-datasource";

let prisma: any;

describe("GET /api/reports/reports-map (integration)", () => {
  beforeAll(async () => {
    prisma = await getTestPrisma();
  });

  beforeEach(async () => {
    await prisma.comment.deleteMany();
    await prisma.report.deleteMany();
    await prisma.external_maintainer.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.user.deleteMany();
    await prisma.pending_verification_user.deleteMany();
  });

  afterAll(async () => {
    await prisma.comment.deleteMany();
    await prisma.report.deleteMany();
    await prisma.external_maintainer.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.user.deleteMany();
    await prisma.pending_verification_user.deleteMany();
  });

  it("200 returns an array (even empty) suitable for map view", async () => {
    const res = await request(app).get("/api/reports/reports-map").expect(200);

    expect(Array.isArray(res.body)).toBe(true);

    if (res.body.length > 0) {
      const r = res.body[0];
      expect(r).toHaveProperty("id");
      expect(r).toHaveProperty("latitude");
      expect(r).toHaveProperty("longitude");
    }
  });
});
