<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Email OTP lupa password (HTML + teks). Logo di-embed (CID) dari resources/images/therapedia-logo-email.png;
 * saat dirender di luar pengiriman (preview) view memakai data URI.
 */
class PasswordOtpMail extends Mailable
{
    public function __construct(
        public string $name,
        public string $otp,
        public int $ttlMinutes = 10,
        public ?string $requestIp = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Kode verifikasi reset password Therapedia');
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.password-otp',
            text: 'emails.password-otp-text',
            with: [
                'digits' => str_split($this->otp),
                'requestedAt' => now('Asia/Jakarta')->locale('id')->translatedFormat('d F Y, H:i').' WIB',
                'logoPath' => resource_path('images/therapedia-logo-email.png'),
                'appName' => config('app.name') === 'Laravel' ? 'Therapedia' : config('app.name'),
            ],
        );
    }
}
