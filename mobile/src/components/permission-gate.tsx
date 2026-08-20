export interface PermissionGateProps {
  /** Capability flag returned by the API — the component never decides on its own. */
  allowed: boolean | undefined;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Renders children only when the API says the current user may do this.
 * Authorisation itself stays on the backend; this is presentation only.
 */
export function PermissionGate({ allowed, children, fallback = null }: PermissionGateProps) {
  return allowed === true ? children : fallback;
}
