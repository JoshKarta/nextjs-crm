// Structured domain errors, per PRD §13. The API layer (a later phase) is
// responsible for mapping these to HTTP status codes / response shapes.
// Domain and service code should never throw plain Error or return
// human-readable strings for control flow.

export type DomainErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "CONFLICT"
  | "INVALID_INVOICE_STATE"
  | "INVALID_PAYMENT_STATE"
  | "DUPLICATE_CONTACT"
  | "DUPLICATE_SKU"
  | "PAYMENT_EXCEEDS_BALANCE";

export interface DomainErrorDetails {
  [key: string]: unknown;
}

export class DomainError extends Error {
  public readonly code: DomainErrorCode;
  public readonly details?: DomainErrorDetails;

  constructor(code: DomainErrorCode, message: string, details?: DomainErrorDetails) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: DomainErrorDetails) {
    super("VALIDATION_ERROR", message, details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super("NOT_FOUND", `${entity} with id "${id}" was not found`, { entity, id });
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "You do not have permission to perform this action") {
    super("FORBIDDEN", message);
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, details?: DomainErrorDetails) {
    super("CONFLICT", message, details);
    this.name = "ConflictError";
  }
}

export class DuplicateContactError extends DomainError {
  constructor(matchedOn: Array<"email" | "phone" | "companyName">, details?: DomainErrorDetails) {
    super(
      "DUPLICATE_CONTACT",
      `A contact with a matching ${matchedOn.join(", ")} may already exist`,
      { matchedOn, ...details }
    );
    this.name = "DuplicateContactError";
  }
}

export class DuplicateSkuError extends DomainError {
  constructor(sku: string) {
    super("DUPLICATE_SKU", `A product with SKU "${sku}" already exists`, { sku });
    this.name = "DuplicateSkuError";
  }
}

export function isDomainError(err: unknown): err is DomainError {
  return err instanceof DomainError;
}

export class InvalidInvoiceStateError extends DomainError {
  constructor(message: string, details?: DomainErrorDetails) {
    super("INVALID_INVOICE_STATE", message, details);
    this.name = "InvalidInvoiceStateError";
  }
}