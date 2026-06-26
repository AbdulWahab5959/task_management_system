import { isAxiosError } from 'axios';
import {
  PaymentServiceError,
  type PaymentErrorCode,
} from '../services/payment.service';

const friendlyMessages: Record<PaymentErrorCode, string> = {
  unauthenticated: 'Please sign in to continue with checkout.',
  validation: 'Please choose a valid plan and try again.',
  network: 'We could not reach the payment server. Check your connection and try again.',
  checkout_url_missing: 'Checkout could not be started. Please try again in a moment.',
  server: 'The payment service is temporarily unavailable. Please try again soon.',
  unknown: 'We could not complete your request. Please try again.',
};

type BackendErrorResponse = {
  message?: unknown;
  errors?: Record<string, unknown>;
};

function getBackendMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const response = data as BackendErrorResponse;

  if (typeof response.message === 'string' && response.message.trim()) {
    return response.message;
  }

  if (!response.errors || typeof response.errors !== 'object') {
    return null;
  }

  for (const value of Object.values(response.errors)) {
    if (Array.isArray(value) && typeof value[0] === 'string') {
      return value[0];
    }

    if (typeof value === 'string') {
      return value;
    }
  }

  return null;
}

export function getPaymentErrorMessage(error: unknown): string {
  if (error instanceof PaymentServiceError) {
    return friendlyMessages[error.code];
  }

  if (isAxiosError(error)) {
    const status = error.response?.status;

    if (!error.response) {
      return friendlyMessages.network;
    }

    if (status === 401 || status === 419) {
      return friendlyMessages.unauthenticated;
    }

    const backendMessage = getBackendMessage(error.response.data);

    if (backendMessage && (!status || status < 500 || import.meta.env.DEV)) {
      return backendMessage;
    }

    if (status === 422) {
      return friendlyMessages.validation;
    }

    if (status && status >= 500) {
      return friendlyMessages.server;
    }
  }

  return friendlyMessages.unknown;
}

export function logPaymentError(error: unknown): void {
  if (import.meta.env.DEV) {
    console.error('Payment error:', error);
  }
}
