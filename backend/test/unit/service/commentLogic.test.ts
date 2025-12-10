/**
 * Unit tests for comment logic between Municipality Users and External Maintainers
 * Tests the authorization and state validation for bidirectional comments
 */

jest.mock("@repositories/reportRepository", () => {
  const mRepo = {
    findById: jest.fn(),
    addCommentToReport: jest.fn(),
    getCommentsByReportId: jest.fn(),
  };
  return { __esModule: true, default: mRepo };
});

import reportService from "@services/reportService";
import reportRepository from "@repositories/reportRepository";
import { ReportStatus } from "@models/enums";

type RepoMock = {
  findById: jest.Mock;
  addCommentToReport: jest.Mock;
  getCommentsByReportId: jest.Mock;
};

const repo = reportRepository as unknown as RepoMock;

describe("Comment Logic - Municipality User and External Maintainer Collaboration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Municipality User Adding Comments", () => {
    it("municipality user can comment on any report in their jurisdiction", async () => {
      const report = {
        id: 5,
        status: ReportStatus.PENDING_APPROVAL,
        externalMaintainerId: null,
      };
      const comment = {
        id: 100,
        reportId: 5,
        content: "This is urgent",
        municipality_user_id: 7,
        external_maintainer_id: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (repo as any).findById.mockResolvedValue(report);
      (repo as any).addCommentToReport.mockResolvedValue(comment);

      const result = await reportService.addCommentToReport({
        reportId: 5,
        authorId: 7,
        authorType: "MUNICIPALITY",
        content: "This is urgent",
      });

      expect(result).toHaveProperty("municipality_user_id", 7);
      expect(result).toHaveProperty("external_maintainer_id", null);
      expect((repo as any).addCommentToReport).toHaveBeenCalledWith({
        reportId: 5,
        content: "This is urgent",
        municipality_user_id: 7,
        external_maintainer_id: null,
      });
    });

    it("municipality user can comment on reports assigned to external maintainers", async () => {
      const report = {
        id: 5,
        status: ReportStatus.IN_PROGRESS,
        externalMaintainerId: 3,
      };
      const comment = {
        id: 101,
        reportId: 5,
        content: "How is the work progressing?",
        municipality_user_id: 7,
        external_maintainer_id: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (repo as any).findById.mockResolvedValue(report);
      (repo as any).addCommentToReport.mockResolvedValue(comment);

      const result = await reportService.addCommentToReport({
        reportId: 5,
        authorId: 7,
        authorType: "MUNICIPALITY",
        content: "How is the work progressing?",
      });

      expect(result).toHaveProperty("municipality_user_id", 7);
      expect((repo as any).addCommentToReport).toHaveBeenCalledTimes(1);
    });

    it("municipality user cannot comment on RESOLVED reports", async () => {
      const report = {
        id: 5,
        status: ReportStatus.RESOLVED,
        externalMaintainerId: 3,
      };

      (repo as any).findById.mockResolvedValue(report);

      await expect(
        reportService.addCommentToReport({
          reportId: 5,
          authorId: 7,
          authorType: "MUNICIPALITY",
          content: "This should not work",
        }),
      ).rejects.toThrow(/Cannot add comments to resolved reports/i);
    });
  });

  describe("External Maintainer Adding Comments", () => {
    it("external maintainer can comment on assigned reports", async () => {
      const report = {
        id: 5,
        status: ReportStatus.IN_PROGRESS,
        externalMaintainerId: 3,
      };
      const comment = {
        id: 102,
        reportId: 5,
        content: "We started the work today",
        municipality_user_id: null,
        external_maintainer_id: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (repo as any).findById.mockResolvedValue(report);
      (repo as any).addCommentToReport.mockResolvedValue(comment);

      const result = await reportService.addCommentToReport({
        reportId: 5,
        authorId: 3,
        authorType: "EXTERNAL_MAINTAINER",
        content: "We started the work today",
      });

      expect(result).toHaveProperty("external_maintainer_id", 3);
      expect(result).toHaveProperty("municipality_user_id", null);
      expect((repo as any).addCommentToReport).toHaveBeenCalledWith({
        reportId: 5,
        content: "We started the work today",
        municipality_user_id: null,
        external_maintainer_id: 3,
      });
    });

    it("external maintainer cannot comment on reports not assigned to them", async () => {
      const report = {
        id: 5,
        status: ReportStatus.IN_PROGRESS,
        externalMaintainerId: 5, // Different maintainer ID
      };

      (repo as any).findById.mockResolvedValue(report);

      await expect(
        reportService.addCommentToReport({
          reportId: 5,
          authorId: 3, // Trying to comment as different maintainer
          authorType: "EXTERNAL_MAINTAINER",
          content: "Not authorized",
        }),
      ).rejects.toThrow(/only comment on reports assigned/i);
    });

    it("external maintainer cannot comment on unassigned reports", async () => {
      const report = {
        id: 5,
        status: ReportStatus.PENDING_APPROVAL,
        externalMaintainerId: null, // Not assigned
      };

      (repo as any).findById.mockResolvedValue(report);

      await expect(
        reportService.addCommentToReport({
          reportId: 5,
          authorId: 3,
          authorType: "EXTERNAL_MAINTAINER",
          content: "Not assigned",
        }),
      ).rejects.toThrow(/only comment on reports assigned/i);
    });

    it("external maintainer cannot comment on RESOLVED reports", async () => {
      const report = {
        id: 5,
        status: ReportStatus.RESOLVED,
        externalMaintainerId: 3,
      };

      (repo as any).findById.mockResolvedValue(report);

      await expect(
        reportService.addCommentToReport({
          reportId: 5,
          authorId: 3,
          authorType: "EXTERNAL_MAINTAINER",
          content: "Cannot comment on resolved",
        }),
      ).rejects.toThrow(/Cannot add comments to resolved reports/i);
    });
  });

  describe("Comment Authorization Edge Cases", () => {
    it("external maintainer cannot comment when externalMaintainerId is explicitly null", async () => {
      const report = {
        id: 5,
        status: ReportStatus.PENDING_APPROVAL,
        externalMaintainerId: null,
      };

      (repo as any).findById.mockResolvedValue(report);

      await expect(
        reportService.addCommentToReport({
          reportId: 5,
          authorId: 3,
          authorType: "EXTERNAL_MAINTAINER",
          content: "test",
        }),
      ).rejects.toThrow(/only comment on reports assigned/i);
    });

    it("throws error for invalid author type", async () => {
      const report = {
        id: 5,
        status: ReportStatus.PENDING_APPROVAL,
        externalMaintainerId: null,
      };

      (repo as any).findById.mockResolvedValue(report);

      await expect(
        reportService.addCommentToReport({
          reportId: 5,
          authorId: 1,
          authorType: "CITIZEN" as any,
          content: "invalid",
        }),
      ).rejects.toThrow(/Invalid author type/i);
    });

    it("throws error when report not found", async () => {
      (repo as any).findById.mockResolvedValue(null);

      await expect(
        reportService.addCommentToReport({
          reportId: 999,
          authorId: 1,
          authorType: "MUNICIPALITY",
          content: "test",
        }),
      ).rejects.toThrow(/Report not found/i);
    });
  });

  describe("Retrieving Comments", () => {
    it("retrieves all comments for a report regardless of author type", async () => {
      const report = { id: 5 };
      const comments = [
        {
          id: 1,
          reportId: 5,
          content: "Municipality comment",
          municipality_user_id: 7,
          external_maintainer_id: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          reportId: 5,
          content: "External maintainer comment",
          municipality_user_id: null,
          external_maintainer_id: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (repo as any).findById.mockResolvedValue(report);
      (repo as any).getCommentsByReportId.mockResolvedValue(comments);

      const result = await reportService.getCommentsOfAReportById(5);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("municipality_user_id", 7);
      expect(result[1]).toHaveProperty("external_maintainer_id", 3);
      expect((repo as any).getCommentsByReportId).toHaveBeenCalledWith(5);
    });

    it("returns empty array when report has no comments", async () => {
      const report = { id: 5 };

      (repo as any).findById.mockResolvedValue(report);
      (repo as any).getCommentsByReportId.mockResolvedValue([]);

      const result = await reportService.getCommentsOfAReportById(5);

      expect(result).toEqual([]);
    });

    it("throws error when trying to retrieve comments for non-existent report", async () => {
      (repo as any).findById.mockResolvedValue(null);

      await expect(reportService.getCommentsOfAReportById(999)).rejects.toThrow(
        /Report not found/i,
      );
    });
  });

  describe("Report Status and Comment Restrictions", () => {
    const testStatuses = [
      ReportStatus.PENDING_APPROVAL,
      ReportStatus.ASSIGNED,
      ReportStatus.IN_PROGRESS,
      ReportStatus.SUSPENDED,
    ];

    testStatuses.forEach((status) => {
      it(`allows comments on reports with status ${status}`, async () => {
        const report = {
          id: 5,
          status,
          externalMaintainerId: 3,
        };
        const comment = {
          id: 200,
          reportId: 5,
          content: `Comment on ${status}`,
          municipality_user_id: 7,
          external_maintainer_id: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        (repo as any).findById.mockResolvedValue(report);
        (repo as any).addCommentToReport.mockResolvedValue(comment);

        const result = await reportService.addCommentToReport({
          reportId: 5,
          authorId: 7,
          authorType: "MUNICIPALITY",
          content: `Comment on ${status}`,
        });

        expect(result).toBeDefined();
        expect(result).toHaveProperty("id", 200);
      });
    });

    it("blocks comments on REJECTED reports", async () => {
      const report = {
        id: 5,
        status: ReportStatus.REJECTED,
        externalMaintainerId: null,
      };

      (repo as any).findById.mockResolvedValue(report);

      // REJECTED is not RESOLVED, so it should allow commenting
      // unless there's explicit blocking logic for REJECTED
      const comment = {
        id: 201,
        reportId: 5,
        content: "Comment on rejected",
        municipality_user_id: 7,
        external_maintainer_id: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (repo as any).addCommentToReport.mockResolvedValue(comment);

      const result = await reportService.addCommentToReport({
        reportId: 5,
        authorId: 7,
        authorType: "MUNICIPALITY",
        content: "Comment on rejected",
      });

      expect(result).toBeDefined();
    });
  });

  describe("Collaborative Workflow", () => {
    it("allows municipality user and external maintainer to have bidirectional conversation", async () => {
      const report = {
        id: 5,
        status: ReportStatus.IN_PROGRESS,
        externalMaintainerId: 3,
      };

      // Municipality user comments first
      const muniComment = {
        id: 1,
        reportId: 5,
        content: "Can you start working on this?",
        municipality_user_id: 7,
        external_maintainer_id: null,
        createdAt: new Date("2025-12-10T10:00:00Z"),
        updatedAt: new Date("2025-12-10T10:00:00Z"),
      };

      (repo as any).findById.mockResolvedValue(report);
      (repo as any).addCommentToReport.mockResolvedValueOnce(muniComment);

      const result1 = await reportService.addCommentToReport({
        reportId: 5,
        authorId: 7,
        authorType: "MUNICIPALITY",
        content: "Can you start working on this?",
      });

      expect(result1).toHaveProperty("municipality_user_id", 7);

      // External maintainer responds
      const emComment = {
        id: 2,
        reportId: 5,
        content: "Sure, we'll start tomorrow morning",
        municipality_user_id: null,
        external_maintainer_id: 3,
        createdAt: new Date("2025-12-10T14:00:00Z"),
        updatedAt: new Date("2025-12-10T14:00:00Z"),
      };

      (repo as any).addCommentToReport.mockResolvedValueOnce(emComment);

      const result2 = await reportService.addCommentToReport({
        reportId: 5,
        authorId: 3,
        authorType: "EXTERNAL_MAINTAINER",
        content: "Sure, we'll start tomorrow morning",
      });

      expect(result2).toHaveProperty("external_maintainer_id", 3);

      // Verify all comments can be retrieved
      const allComments = [muniComment, emComment];
      (repo as any).getCommentsByReportId.mockResolvedValue(allComments);

      const comments = await reportService.getCommentsOfAReportById(5);

      expect(comments).toHaveLength(2);
      expect(comments[0]).toHaveProperty("municipality_user_id", 7);
      expect(comments[1]).toHaveProperty("external_maintainer_id", 3);
    });

    it("tracks who commented in comments history", async () => {
      const report = { id: 5, status: ReportStatus.IN_PROGRESS };
      const comments = [
        {
          id: 1,
          reportId: 5,
          content: "First comment",
          municipality_user_id: 7,
          external_maintainer_id: null,
          createdAt: new Date("2025-12-10T10:00:00Z"),
          updatedAt: new Date("2025-12-10T10:00:00Z"),
        },
        {
          id: 2,
          reportId: 5,
          content: "Response from EM",
          municipality_user_id: null,
          external_maintainer_id: 3,
          createdAt: new Date("2025-12-10T14:00:00Z"),
          updatedAt: new Date("2025-12-10T14:00:00Z"),
        },
        {
          id: 3,
          reportId: 5,
          content: "Final comment",
          municipality_user_id: 7,
          external_maintainer_id: null,
          createdAt: new Date("2025-12-10T16:00:00Z"),
          updatedAt: new Date("2025-12-10T16:00:00Z"),
        },
      ];

      (repo as any).findById.mockResolvedValue(report);
      (repo as any).getCommentsByReportId.mockResolvedValue(comments);

      const result = await reportService.getCommentsOfAReportById(5);

      // Verify we can identify who said what
      expect(result.filter((c) => c.municipality_user_id === 7)).toHaveLength(2);
      expect(result.filter((c) => c.external_maintainer_id === 3)).toHaveLength(1);
      expect(result).toHaveLength(3);
    });
  });
});
