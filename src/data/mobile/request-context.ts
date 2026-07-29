import { randomUUID } from "node:crypto";

import { validateBootstrapHeaders } from "./bootstrap/bootstrap.validation";
import type { BootstrapRequest } from "./bootstrap/bootstrap.types";

export function readMobileRequestContext(request: Request): BootstrapRequest {
  const requestId = request.headers.get("x-request-id") || randomUUID();
  return validateBootstrapHeaders(request.headers, requestId);
}
