import { isAxiosError } from 'axios';
import { api } from './api';

export type PaymentGateway = 'stripe';

export interface CreateCheckoutPayload {
  plan_id: number;
  gateway: PaymentGateway;
}

export interface CreateCheckoutResponse {
  payment_reference: string;
  checkout_url: string;
}

export interface PaymentStatusResponse {
  reference: string;
  gateway: PaymentGateway;
  status:
    | 'pending'
    | 'paid'
    | 'failed'
    | 'cancelled'
    | 'expired'
    | 'verification_failed';
  amount: string;
  currency: string;
  paid_at: string | null;
}

export type PaymentErrorCode =
  | 'unauthenticated'
  | 'validation'
  | 'network'
  | 'checkout_url_missing'
  | 'server'
  | 'unknown';

export class PaymentServiceError extends Error {
  code: PaymentErrorCode;
  status?: number;

  constructor(message: string, code: PaymentErrorCode, status?: number) {
    super(message);
    this.name = 'PaymentServiceError';
    this.code = code;
    this.status = status;
  }
}

function createPaymentServiceError(error: unknown): PaymentServiceError {
  if (error instanceof PaymentServiceError) {
    return error;
  }

  if (isAxiosError(error)) {
    if (!error.response) {
      return new PaymentServiceError(
        'We could not reach the payment server. Please check your connection and try again.',
        'network',
      );
    }

    const status = error.response.status;

    if (status === 401 || status === 419) {
      return new PaymentServiceError(
        'Please sign in to continue with checkout.',
        'unauthenticated',
        status,
      );
    }

    if (status === 422) {
      return new PaymentServiceError(
        'Please choose a valid plan and try again.',
        'validation',
        status,
      );
    }

    if (status >= 500) {
      return new PaymentServiceError(
        'The payment service is temporarily unavailable. Please try again soon.',
        'server',
        status,
      );
    }
  }

  return new PaymentServiceError(
    'We could not complete the payment request. Please try again.',
    'unknown',
  );
}

export async function createCheckout(
  payload: CreateCheckoutPayload,
): Promise<CreateCheckoutResponse> {
  try {
    const checkoutPayload: CreateCheckoutPayload = {
      plan_id: payload.plan_id,
      gateway: payload.gateway,
    };

    const response = await api.post<CreateCheckoutResponse>(
      '/payments/checkout',
      checkoutPayload,
    );

    if (!response.data.checkout_url) {
      throw new PaymentServiceError(
        'Checkout could not be started. Please try again in a moment.',
        'checkout_url_missing',
      );
    }

    return response.data;
  } catch (error) {
    throw createPaymentServiceError(error);
  }
}

export async function getPaymentStatus(
  reference: string,
): Promise<PaymentStatusResponse> {
  try {
    if (!reference.trim()) {
      throw new PaymentServiceError(
        'We could not find a payment reference for this checkout.',
        'validation',
      );
    }

    const response = await api.get<PaymentStatusResponse>(
      `/payments/${encodeURIComponent(reference)}`,
    );

    return response.data;
  } catch (error) {
    throw createPaymentServiceError(error);
  }
}
