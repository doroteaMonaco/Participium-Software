import { removeNullAttributes } from "@utils";
import { roleType } from "@models/enums";
import { ReportDto } from "@dto/reportDto";
import { MessageDto } from "@dto/messageDto";
import { MunicipalityRoleDto } from "@dto/municipalityRoleDto";

/**
 * DTOs used for creation (password required)
 */
export interface CreateBaseUserDto {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

/**
 * Common/shared fields
 */
export interface BaseUserDto {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  createdAt?: Date;
}

/**
 * Citizen (user) extends BaseUserDto
 */
export interface CitizenDto extends BaseUserDto {
  profilePhoto?: string;
  telegramUsername?: string;
  notifications?: boolean;
  reports?: ReportDto[];
  messages?: MessageDto[];
  anonymous?: boolean;
}

/**
 * Municipality officer extends BaseUser
 */
export interface MunicipalityUserDto extends BaseUserDto {
  municipality_role_id?: number;
  municipality_role?: MunicipalityRoleDto;
  assignedReports?: ReportDto[];
  messages?: MessageDto[];
}

/**
 * Admin extends BaseUser (no extra fields for now)
 */
export interface AdminUserDto extends BaseUserDto {}

/**
 * Union type for convenience
 */
export type AnyUserDto = CitizenDto | MunicipalityUserDto | AdminUserDto;

/**
 * Check if a given object implements the BaseUserDto interface.
 */
export function instanceOfBaseUser(value: any): value is BaseUserDto {
  if (!value || typeof value !== "object") return false;
  if (!("username" in value) || value["username"] === undefined) return false;
  if (!("email" in value) || value["email"] === undefined) return false;
  if (!("firstName" in value) && value["firstName"] === undefined) return false;
  if (!("lastName" in value) && value["lastName"] === undefined) return false;
  return true;
}

/**
 * Check if a given object implements the CitizenDto interface.
 */
export function instanceOfCitizenDto(value: any): value is CitizenDto {
  if (!instanceOfBaseUser(value)) return false;
  return (
    "profilePhoto" in value ||
    "telegramUsername" in value ||
    "notifications" in value ||
    "reports" in value ||
    "messages" in value ||
    "anonymous" in value
  );
}

/**
 * Check if a given object implements the MunicipalityUserDto interface.
 */
export function instanceOfMunicipalityUserDto(
  value: any,
): value is MunicipalityUserDto {
  if (!instanceOfBaseUser(value)) return false;
  return (
    "municipality_role_id" in value ||
    "municipality_role" in value ||
    "assignedReports" in value ||
    "messages" in value
  );
}

/**
 * Check if a given object implements the AdminUserDto interface.
 * Admin is treated as base user without citizen/municipality-specific fields.
 */
export function instanceOfAdminUserDto(value: any): value is AdminUserDto {
  if (!instanceOfBaseUser(value)) return false;
  return !instanceOfCitizenDto(value) && !instanceOfMunicipalityUserDto(value);
}

/**
 * Check if a given object implements any of the user DTO interfaces.
 */
export function instanceOfAnyUserDto(value: any): value is AnyUserDto {
  return (
    instanceOfCitizenDto(value) ||
    instanceOfMunicipalityUserDto(value) ||
    instanceOfAdminUserDto(value)
  );
}

/**
 * Create user DTO from a plain JSON payload (accepts snake_case or camelCase).
 */
export function UserFromJSON(json: any): AnyUserDto | null {
  if (json == null) return null;

  const base: BaseUserDto = {
    id: json.id,
    username: json.username,
    email: json.email,
    firstName: json.first_name ?? json.firstName,
    lastName: json.last_name ?? json.lastName,
    password: json.password,
    createdAt: json.created_at ?? json.createdAt,
  };

  // Detect municipality user by presence of municipality role id/field
  if (instanceOfMunicipalityUserDto(json)) {
    return removeNullAttributes({
      ...base,
      municipality_role_id: json.municipality_role_id,
      municipality_role: json.municipality_role,
      assignedReports: json.assignedReports as ReportDto[] | undefined,
      messages: json.messages as MessageDto[] | undefined,
    }) as MunicipalityUserDto;
  }

  // Detect citizen by presence of citizen-specific fields
  if (instanceOfCitizenDto(json)) {
    return removeNullAttributes({
      ...base,
      profilePhoto: json.profilePhoto,
      telegramUsername: json.telegramUsername,
      notifications: json.notifications,
      reports: json.reports as ReportDto[] | undefined,
      messages: json.messages as MessageDto[] | undefined,
      anonymous: json.anonymous,
    }) as CitizenDto;
  }

  // Fallback to admin (no extra fields)
  return removeNullAttributes(base) as AdminUserDto;
}

/**
 * Build a user DTO, removing null attributes and cleaning nested DTOs.
 */
export function buildUserDto(data: AnyUserDto): AnyUserDto | null {
  const base = {
    id: data.id,
    username: data.username,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    password: data.password,
    createdAt: data.createdAt,
  };

  // Citizen
  if (instanceOfCitizenDto(data)) {
    const d = data as CitizenDto;
    return removeNullAttributes({
      ...base,
      profilePhoto: d.profilePhoto,
      telegramUsername: d.telegramUsername,
      notifications: d.notifications,
      reports: d.reports
        ? d.reports.map((r) => removeNullAttributes(r))
        : undefined,
      messages: d.messages
        ? d.messages.map((m) => removeNullAttributes(m))
        : undefined,
      anonymous: d.anonymous,
    }) as CitizenDto;
  }

  // Municipality user
  if (instanceOfMunicipalityUserDto(data)) {
    const d = data as MunicipalityUserDto;
    return removeNullAttributes({
      ...base,
      municipality_role_id: d.municipality_role_id,
      municipality_role: d.municipality_role
        ? removeNullAttributes(d.municipality_role)
        : undefined,
      assignedReports: d.assignedReports
        ? d.assignedReports.map((r) => removeNullAttributes(r))
        : undefined,
      messages: d.messages
        ? d.messages.map((m) => removeNullAttributes(m))
        : undefined,
    }) as MunicipalityUserDto;
  }

  // Admin
  return removeNullAttributes(base) as AdminUserDto;
}

/**
 * Map a Prisma user row (with included relations) to the DTO.
 * Accepts both snake_case (prisma schema) and camelCase fields.
 */
export function mapPrismaUserToDto(
  row: any,
  role?: roleType,
): AnyUserDto | null {
  if (!row) return null;

  const base: BaseUserDto = {
    id: row.id,
    username: row.username,
    email: row.email,
    firstName: row.first_name ?? row.firstName,
    lastName: row.last_name ?? row.lastName,
    password: row.password ?? undefined,
    createdAt: row.created_at ?? row.createdAt,
  };

  const isMunicipality =
    role === roleType.MUNICIPALITY || instanceOfMunicipalityUserDto(row);
  const isCitizen = role === roleType.CITIZEN || instanceOfCitizenDto(row);

  if (isMunicipality) {
    return removeNullAttributes({
      ...base,
      municipality_role_id:
        row.municipality_role_id ?? row.municipality_role_id,
      municipality_role: row.municipality_role ?? row.municipality_role,
      assignedReports: (row.assignedReports ?? row.assigned_reports) as
        | ReportDto[]
        | undefined,
      messages: (row.messages ?? row.messages) as MessageDto[] | undefined,
    }) as MunicipalityUserDto;
  }

  if (isCitizen) {
    return removeNullAttributes({
      ...base,
      profilePhoto: row.profile_photo ?? row.profilePhoto,
      telegramUsername: row.telegram_username ?? row.telegramUsername,
      notifications: row.notifications,
      reports: (row.reports ?? row.reports) as ReportDto[] | undefined,
      messages: (row.messages ?? row.messages) as MessageDto[] | undefined,
      anonymous: row.anonymous,
    }) as CitizenDto;
  }

  return removeNullAttributes(base) as AdminUserDto;
}
