import { removeNullAttributes } from "@utils";
import type { AnyUserDto, BaseUserDto } from "@dto/userDto";

/**
 * Create payload for a message
 */
export interface CreateMessageDto {
  title: string;
  content: string;
  userId: number;
  municipalityUserId: number;
  sentByMunicipality?: boolean;
  sentAt?: Date;
}

/**
 * Message DTO (full)
 */
export interface MessageDto {
  id: number;
  title: string;
  content: string;
  sentAt: Date;
  readAt: Date | null;
  user: BaseUserDto;
  municipalityUser: BaseUserDto;
  sentByMunicipality: boolean;
}

/**
 * Build MessageDto from arbitrary JSON (snake_case or camelCase)
 */
export function MessageFromJSON(json: any): MessageDto | null {
  if (json == null) return null;
  const sentAt = json.sent_at ?? json.sentAt;
  const readAt = json.read_at ?? json.readAt;
  return {
    id: json.id,
    title: json.title,
    content: json.content,
    sentAt: sentAt ? new Date(sentAt) : new Date(),
    readAt: readAt ? new Date(readAt) : null,
    user: json.user as BaseUserDto,
    municipalityUser:
      json.municipality_user ?? (json.municipalityUser as BaseUserDto),
    sentByMunicipality:
      json.sent_by_municipality ?? json.sentByMunicipality ?? true,
  };
}

/**
 * Build a MessageDto, removing null attributes and normalizing nested objects.
 */
export function buildMessageDto(data: MessageDto): MessageDto {
  return removeNullAttributes({
    id: data.id,
    title: data.title,
    content: data.content,
    sentAt: data.sentAt,
    readAt: data.readAt,
    user: removeNullAttributes(data.user),
    municipalityUser: removeNullAttributes(data.municipalityUser),
    sentByMunicipality: data.sentByMunicipality,
  }) as MessageDto;
}

/**
 * Map a Prisma message row (with included user and municipality_user relations) to MessageDto.
 */
export function mapPrismaMessageToDto(row: any): MessageDto | null {
  if (!row) return null;
  const sentAt = row.sent_at ?? row.sentAt;
  const readAt = row.read_at ?? row.readAt;
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    sentAt: sentAt ? new Date(sentAt) : new Date(),
    readAt: readAt ? new Date(readAt) : null,
    user: row.user as AnyUserDto,
    municipalityUser:
      row.municipality_user ?? (row.municipalityUser as AnyUserDto),
    sentByMunicipality:
      row.sent_by_municipality ?? row.sentByMunicipality ?? true,
  };
}
