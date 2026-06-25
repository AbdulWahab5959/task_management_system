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
