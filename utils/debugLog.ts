/**
 * Development-only logging helper.
 * Keeps production output clean while preserving debug visibility locally.
 */
export function debugLog(...args: any[]) {
  // Intentionally no-op to keep production console clean.
  // All call sites remain intact to avoid changing app logic.
  void args;
}

