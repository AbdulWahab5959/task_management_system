<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'    => 'required|string|max:255',
            'email'   => 'required|email|max:255',
            'subject' => 'required|string|max:255',
            'message' => 'required|string|max:5000',
        ]);

        $message = ContactMessage::create([
            'name'    => $validated['name'],
            'email'   => $validated['email'],
            'subject' => $validated['subject'],
            'message' => $validated['message'],
            'status'  => 'new',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Your message has been sent successfully. We will get back to you soon.',
        ], 201);
    }
}