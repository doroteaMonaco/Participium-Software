// Utility functions
import { ConflictError } from "@errors/ConflictError";
import { NotFoundError } from "@errors/NotFoundError";
import { BadRequestError } from "@errors/BadRequestError";

import { logInfo } from "@services/loggingService";

export function removeNullAttributes<T>(dto: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(dto as any).filter(
      ([_, value]) => !check_var_invalid(value),
    ),
  ) as Partial<T>;
}

export function findOrThrowNotFound<T>(
  array: T[],
  predicate: (item: T) => boolean,
  errorMessage: string,
): T {
  const item = array.find(predicate);
  if (!item) {
    throw new NotFoundError(errorMessage);
  }
  return item;
}

export function throwConflictIfFound<T>(
  array: T[],
  predicate: (item: T) => boolean,
  errorMessage: string,
): void {
  if (array.find(predicate)) {
    throw new ConflictError(errorMessage);
  }
}

export function throwBadRequestIfMissing<T>(
  array: T[],
  predicate: (item: T) => boolean,
  errorMessage: (param: T) => string,
): void {
  const invalidParam = array.find(predicate);
  if (invalidParam) {
    logInfo(`[throwBadRequestIfMissing] Invalid data: ${invalidParam}`);
    throw new BadRequestError(errorMessage(invalidParam));
  }
}

/**
 * Checks if a variable is invalid (undefined, null, empty string, or empty array).
 * @param value
 * @returns true if the variable is invalid, false otherwise.
 */
export function check_var_invalid(value: any) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.length === 0) ||
    (Array.isArray(value) && value.length === 0)
  );
}

/**
 * Throws a BadRequestError if any property of the given object is null or undefined.
 * @param obj
 */
export function throwBadRequestIfMissingObject<T extends object>(obj: T): void {
  throwBadRequestIfMissing(
    Object.entries(obj) as [keyof T, any],
    ([, value]) => check_var_invalid(value),
    ([key]) => `Parameter '${String(key)}' is required`,
  );
}

/**
 * Builds an object containing all required parameters and only the optional
 * parameters that are defined (not null or undefined).
 * This is useful for building parameter objects for functions or API calls
 * where some parameters are optional.
 * @param required
 * @param optional
 * @returns
 */
export function buildParamsObject<R extends object, O extends object>(
  required: R,
  optional: O,
): R & Partial<O> {
  const result: Partial<R & O> = { ...required };

  for (const [key, value] of Object.entries(optional)) {
    if (!check_var_invalid(value)) {
      result[key as keyof (R & O)] = value;
    }
  }

  return result as R & Partial<O>;
}
