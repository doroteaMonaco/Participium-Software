export type commentAuthorType = "MUNICIPALITY" | "EXTERNAL_MAINTAINER";

export interface createCommentDto {
  reportId: number;
  authorId: number;
  authorType: commentAuthorType;
  content: string;
}

export interface CommentDto {
  id: number;
  reportId: number;
  municipality_user_id: number | null;
  external_maintainer_id: number | null;
  content: string;
  createdAt: Date;
  updatedAt: Date | null;
}