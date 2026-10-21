/**
 * Sanitizes and transforms raw developer errors, network exceptions, or server stack traces
 * into polite, customer-friendly, professional messages for user-facing UI.
 */
export function getFriendlyErrorMessage(
  error: any,
  defaultFallback: string = 'An unexpected issue occurred. Please try again or reach out to our 24/7 support team.'
): string {
  if (!error) return defaultFallback;

  const rawMsg = String(error?.message || error?.error || error || '').trim();
  const lower = rawMsg.toLowerCase();

  // Network / Connection drop issues
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('connection refused') ||
    lower.includes('econnrefused') ||
    lower.includes('und_err_connect_timeout') ||
    lower.includes('abort')
  ) {
    return 'Unable to reach the server. Please check your internet connection or try again in a few moments.';
  }

  // 500 / 502 / 503 / Server Error
  if (
    lower.includes('500') ||
    lower.includes('502') ||
    lower.includes('503') ||
    lower.includes('504') ||
    lower.includes('internal server error') ||
    lower.includes('service unavailable') ||
    lower.includes('server error') ||
    lower.includes('bad gateway')
  ) {
    return 'Our systems are experiencing a brief maintenance update. Please try again shortly or contact our 24/7 support team.';
  }

  // JS runtime / syntax crashes
  if (
    lower.includes('cannot read properties') ||
    lower.includes('null (reading') ||
    lower.includes('undefined') ||
    lower.includes('typeerror') ||
    lower.includes('referenceerror') ||
    lower.includes('syntaxerror')
  ) {
    return 'We encountered a momentary glitch processing your request. Please refresh the page or contact our support team.';
  }

  // Permissions / Auth session expiration
  if (
    lower.includes('missing or insufficient permissions') ||
    lower.includes('insufficient permissions') ||
    lower.includes('permission-denied') ||
    lower.includes('permission denied')
  ) {
    return 'Your session has expired or requires sign-in. Please log in again to complete your request.';
  }

  // Raw API / DB credentials or Whitelist exposure
  if (
    lower.includes('whitelist') ||
    lower.includes('not authorized') ||
    lower.includes('auth_failed') ||
    lower.includes('circuit breaker active') ||
    lower.includes('credential') ||
    lower.includes('api_key')
  ) {
    return 'The domain registry is temporarily busy. Please try again in a few moments or contact our domain specialist team.';
  }

  // If message is clean, user-facing and doesn't look like code or a stack trace
  if (
    rawMsg.length > 0 &&
    rawMsg.length <= 150 &&
    !rawMsg.includes('at ') &&
    !rawMsg.includes('http://') &&
    !rawMsg.includes('https://') &&
    !rawMsg.includes('{') &&
    !rawMsg.includes('}')
  ) {
    return rawMsg;
  }

  return defaultFallback;
}
