<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Stripe\StripeClient;
use Throwable;

class InvoiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:paid,pending,failed'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);
        $query = Invoice::query()
            ->visible()
            ->whereHas('subscription', fn ($q) => $q->where('user_id', $request->user()->id))
            ->with('subscription.plan')
            ->orderByDesc('invoice_date')
            ->orderByDesc('id');
        if (! empty($validated['status'])) $query->where('status', $validated['status']);
        if (! empty($validated['from'])) $query->whereDate('invoice_date', '>=', $validated['from']);
        if (! empty($validated['to'])) $query->whereDate('invoice_date', '<=', $validated['to']);
        $invoices = $query->paginate($validated['per_page'] ?? 15)->withQueryString();

        return response()->json([
            'data' => InvoiceResource::collection($invoices->getCollection()),
            'meta' => [
                'current_page' => $invoices->currentPage(),
                'last_page' => $invoices->lastPage(),
                'per_page' => $invoices->perPage(),
                'total' => $invoices->total(),
            ],
        ]);
    }

    public function show(Request $request, Invoice $invoice): InvoiceResource
    {
        $this->authorizeInvoice($request, $invoice);
        return new InvoiceResource($invoice->load('subscription.plan'));
    }

    public function download(Request $request, Invoice $invoice)
    {
        $this->authorizeInvoice($request, $invoice);
        $url = $invoice->invoice_pdf;
        if (! $url && str_starts_with((string) $invoice->stripe_invoice_id, 'in_')) {
            $secret = config('services.stripe.secret');
            if (is_string($secret) && trim($secret) !== '' && $secret !== 'mock_secret') {
                try {
                    $stripeInvoice = (new StripeClient($secret))->invoices->retrieve($invoice->stripe_invoice_id, []);
                    $url = $stripeInvoice->invoice_pdf ?? null;
                    if ($url) $invoice->update(['invoice_pdf' => $url]);
                } catch (Throwable) {
                    $url = null;
                }
            }
        }
        if (! $url) return response()->json(['message' => 'This invoice PDF is not available yet.'], 404);
        $response = Http::timeout(20)->get($url);
        if (! $response->successful()) return response()->json(['message' => 'This invoice PDF could not be downloaded.'], 404);
        return response()->streamDownload(static function () use ($response): void { echo $response->body(); }, "invoice-{$invoice->id}.pdf", ['Content-Type' => 'application/pdf']);
    }

    private function authorizeInvoice(Request $request, Invoice $invoice): void
    {
        abort_unless($invoice->subscription()->where('user_id', $request->user()->id)->exists(), 404);
    }
}
