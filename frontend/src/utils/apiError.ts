import { isAxiosError } from 'axios';

/**
 * Shared extraction for controlled API errors.
 *
 * Only reads the validation `errors` map and the `message` field that Laravel
 * already returns to the client. No path, SQL, stack trace, or provider payload
 * is rendered.
 */
export const schemaMismatchMessage = 'This workspace database needs the latest project update. An administrator must run the tenant migration workflow.';

export function apiValidationMessage(error: unknown): string | undefined {
  if (!isAxiosError<{ message?: string; errors?: Record<string, string[]> }>(error)) return undefined;
  return Object.values(error.response?.data?.errors ?? {}).flat()[0] ?? error.response?.data?.message;
}

export function projectApiError(error: unknown): string | undefined {
  if (isAxiosError(error) && error.response?.status === 500) return schemaMismatchMessage;
  return apiValidationMessage(error);
}