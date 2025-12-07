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
  password: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Common/shared fields
 */
export interface BaseUserDto {
  id: number;
  username: string;
  email: string;
  password?: string;
  createdAt?: Date;
}

/**
 * Citizen (user) extends BaseUserDto
 */
export interface CitizenDto extends BaseUserDto {
  firstName: string;
  lastName: string;
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
  firstName: string;
  lastName: string;
  municipality_role_id?: number;
  municipality_role?: MunicipalityRoleDto;
  assignedReports?: ReportDto[];
  messages?: MessageDto[];
}

/**
 * Admin extends BaseUser
 */
export interface AdminUserDto extends BaseUserDto {
  firstName: string;
  lastName: string;
}

export interface ExternalMaintainerUserDto extends BaseUserDto {
  firstName: string;
  lastName: string;
  companyName: string;
  category: string;
  assignedReports?: ReportDto[];
}

/**
 * Union type for convenience
 */
export type AnyUserDto = CitizenDto | MunicipalityUserDto | AdminUserDto | ExternalMaintainerUserDto;

const cleanReports = (reports?: ReportDto[]) =>
  reports?.map((report) => removeNullAttributes(report));

const cleanMessages = (messages?: MessageDto[]) =>
  messages?.map((message) => removeNullAttributes(message));

const cleanMunicipalityRole = (role?: MunicipalityRoleDto) =>
  role ? removeNullAttributes(role) : undefined;

/**
 * Check if a given object implements the BaseUserDto interface.
 */
export function instanceOfBaseUser(value: any): value is BaseUserDto {
  if (!value || typeof value !== "object") return false;
  if (!("username" in value) || value["username"] === undefined) return false;
  if (!("email" in value) || value["email"] === undefined) return false;
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
 * Check if a given object implements the ExternalMaintainerUserDto interface.
 */
export function instanceOfExternalMaintainerUserDto(
  value: any,
): value is ExternalMaintainerUserDto {
  if (!instanceOfBaseUser(value)) return false;
  return (
    "companyName" in value ||
    "company_name" in value ||
    "category" in value ||
    "assignedReports" in value
  );
}

/**
 * Check if a given object implements the AdminUserDto interface.
 * Admin is treated as base user without citizen/municipality-specific fields.
 */
export function instanceOfAdminUserDto(value: any): value is AdminUserDto {
  if (!instanceOfBaseUser(value)) return false;
  return (
    !instanceOfCitizenDto(value) &&
    !instanceOfMunicipalityUserDto(value) &&
    !instanceOfExternalMaintainerUserDto(value)
  );
}

/**
 * Check if a given object implements any of the user DTO interfaces.
 */
export function instanceOfAnyUserDto(value: any): value is AnyUserDto {
  return (
    instanceOfCitizenDto(value) ||
    instanceOfMunicipalityUserDto(value) ||
    instanceOfExternalMaintainerUserDto(value) ||
    instanceOfAdminUserDto(value)
  );
}

/**
 * Create user DTO from a plain JSON payload (accepts snake_case or camelCase).
 */
export function UserFromJSON(json: any): AnyUserDto | null {
  if (json == null) return null;

  const resolvedFirstName = json.first_name ?? json.firstName ?? "";
  const resolvedLastName = json.last_name ?? json.lastName ?? "";

  const base: BaseUserDto = removeNullAttributes({
    id: json.id,
    username: json.username,
    email: json.email,
    password: json.password,
    createdAt: json.created_at ?? json.createdAt,
  }) as BaseUserDto;

  // Detect municipality user by presence of municipality role id/field
  if (instanceOfMunicipalityUserDto(json)) {
    return removeNullAttributes({
      ...base,
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
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
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
      profilePhoto: json.profilePhoto,
      telegramUsername: json.telegramUsername,
      notifications: json.notifications,
      reports: json.reports as ReportDto[] | undefined,
      messages: json.messages as MessageDto[] | undefined,
      anonymous: json.anonymous,
    }) as CitizenDto;
  }

  // Detect external maintainer
  if (instanceOfExternalMaintainerUserDto(json)) {
    return removeNullAttributes({
      ...base,
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
      companyName: json.companyName,
      category: json.category,
      assignedReports: json.assignedReports as ReportDto[] | undefined,
    }) as ExternalMaintainerUserDto;
  }

  // Fallback to admin (no extra fields)
  return removeNullAttributes({
    ...base,
    firstName: resolvedFirstName,
    lastName: resolvedLastName,
  }) as AdminUserDto;
}

/**
 * Build a user DTO, removing null attributes and cleaning nested DTOs.
 */
export function buildUserDto(data: AnyUserDto): AnyUserDto | null {
  const base = removeNullAttributes({
    id: data.id,
    username: data.username,
    email: data.email,
    password: data.password,
    createdAt: data.createdAt,
  }) as BaseUserDto;

  // Citizen
  if (instanceOfCitizenDto(data)) {
    const d: CitizenDto = data;
    return removeNullAttributes({
      ...base,
      firstName: d.firstName,
      lastName: d.lastName,
      profilePhoto: d.profilePhoto,
      telegramUsername: d.telegramUsername,
      notifications: d.notifications,
      reports: cleanReports(d.reports),
      messages: cleanMessages(d.messages),
      anonymous: d.anonymous,
    }) as CitizenDto;
  }

  // Municipality user
  if (instanceOfMunicipalityUserDto(data)) {
    const d: MunicipalityUserDto = data;
    return removeNullAttributes({
      ...base,
      firstName: d.firstName,
      lastName: d.lastName,
      municipality_role_id: d.municipality_role_id,
      municipality_role: cleanMunicipalityRole(d.municipality_role),
      assignedReports: cleanReports(d.assignedReports),
      messages: cleanMessages(d.messages),
    }) as MunicipalityUserDto;
  }

  // External maintainer user
  if (instanceOfExternalMaintainerUserDto(data)) {
    const d: ExternalMaintainerUserDto = data;
    return removeNullAttributes({
      ...base,
      firstName: d.firstName,
      lastName: d.lastName,
      companyName: d.companyName,
      category: d.category,
      assignedReports: cleanReports(d.assignedReports),
    }) as ExternalMaintainerUserDto;
  }

  if (instanceOfAdminUserDto(data)) {
    const d: AdminUserDto = data;
    return removeNullAttributes({
      ...base,
      firstName: d.firstName,
      lastName: d.lastName,
    }) as AdminUserDto;
  }

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

  const resolvedFirstName = row.first_name ?? row.firstName;
  const resolvedLastName = row.last_name ?? row.lastName;

  const base: BaseUserDto = removeNullAttributes({
    id: row.id,
    username: row.username,
    email: row.email,
    password: row.password ?? undefined,
    createdAt: row.created_at ?? row.createdAt,
  }) as BaseUserDto;

  const isMunicipality =
    role === roleType.MUNICIPALITY || instanceOfMunicipalityUserDto(row);
  const isCitizen = role === roleType.CITIZEN || instanceOfCitizenDto(row);
  const isExternalMaintainer =
    role === roleType.EXTERNAL_MAINTAINER ||
    instanceOfExternalMaintainerUserDto(row);

  if (isMunicipality) {
    return removeNullAttributes({
      ...base,
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
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
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
      profilePhoto: row.profile_photo ?? row.profilePhoto,
      telegramUsername: row.telegram_username ?? row.telegramUsername,
      notifications: row.notifications,
      reports: (row.reports ?? row.reports) as ReportDto[] | undefined,
      messages: (row.messages ?? row.messages) as MessageDto[] | undefined,
      anonymous: row.anonymous,
    }) as CitizenDto;
  }

  if (isExternalMaintainer) {
    return removeNullAttributes({
      ...base,
      companyName: row.company_name ?? row.companyName,
      category: row.category,
      assignedReports: (row.assignedReports ?? row.assigned_reports) as
        | ReportDto[]
        | undefined,
    }) as ExternalMaintainerUserDto;
  }

  return removeNullAttributes({
    ...base,
    firstName: resolvedFirstName,
    lastName: resolvedLastName,
  }) as AdminUserDto;
}
