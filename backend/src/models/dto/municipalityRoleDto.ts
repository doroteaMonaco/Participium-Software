import { removeNullAttributes } from "@utils";
import type { MunicipalityUserDto } from "@dto/userDto";

/**
 * Payload to create a municipality role
 */
export interface CreateMunicipalityRoleDto {
  name: string;
}

/**
 * Municipality role DTO
 */
export interface MunicipalityRoleDto {
  id: number;
  name: string;
  users?: MunicipalityUserDto[];
}

/**
 * Build MunicipalityRoleDto from arbitrary JSON (accepts snake_case or camelCase)
 */
export function MunicipalityRoleFromJSON(
  json: any,
): MunicipalityRoleDto | null {
  if (json == null) return null;
  return {
    id: json.id,
    name: json.name,
    users: (json.users ?? json.users) as MunicipalityUserDto[] | undefined,
  };
}

/**
 * Build a MunicipalityRoleDto, removing null attributes and normalizing nested users.
 */
export function buildMunicipalityRoleDto(
  data: MunicipalityRoleDto,
): MunicipalityRoleDto {
  return removeNullAttributes({
    id: data.id,
    name: data.name,
    users: data.users
      ? data.users.map((u) => removeNullAttributes(u))
      : undefined,
  }) as MunicipalityRoleDto;
}

/**
 * Map a Prisma municipality_role row (with included users) to MunicipalityRoleDto.
 */
export function mapPrismaMunicipalityRoleToDto(
  row: any,
): MunicipalityRoleDto | null {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    users: (row.users ?? row.users) as MunicipalityUserDto[] | undefined,
  };
}
