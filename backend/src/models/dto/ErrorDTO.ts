import { removeNullAttributes } from "@utils";

export interface ErrorDTO {
  /**
   * HTTP code of the error
   * @type {number}
   * @memberof Error
   */
  code: number;
  /**
   * Name of the error
   * @type {string}
   * @memberof Error
   */
  error?: string;
  /**
   * Message describing the type and the cause of the error
   * @type {string}
   * @memberof Error
   */
  message?: string;
}

/**
 * Check if a given object implements the Error interface.
 */
export function instanceOfError(value: object): value is ErrorDTO {
  if (!("code" in value) || value["code"] === undefined) return false;
  return true;
}

export function ErrorFromJSON(json: any): ErrorDTO {
  if (json == null) {
    return json;
  }
  return {
    code: json["code"],
    error: json["error"] == null ? undefined : json["error"],
    message: json["message"] == null ? undefined : json["message"],
  };
}

export function ErrorToJSON(json: ErrorDTO): any {
  if (json == null) {
    return json;
  }

  return {
    // code: json["code"],
    error: json["error"],
    message: json["message"],
  };
}

export function createErrorDTO(
  code: number,
  error?: string,
  message?: string,
): ErrorDTO {
  return removeNullAttributes({
    code,
    error,
    message,
  }) as ErrorDTO;
}
