<!DOCTYPE html>
<html lang="id" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>Kode verifikasi reset password Therapedia</title>
    <style>
        body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table { border-collapse: collapse; }
        img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
        @media only screen and (max-width: 620px) {
            .container { width: 100% !important; }
            .px { padding-left: 22px !important; padding-right: 22px !important; }
            .digit { width: 40px !important; height: 52px !important; font-size: 26px !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#eef2f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#0f172a;">

{{-- Teks pratinjau di daftar inbox (disembunyikan di badan email) --}}
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">
    Kode OTP Anda {{ $otp }}. Berlaku {{ $ttlMinutes }} menit. Jangan bagikan kepada siapa pun.
    &#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f6;">
    <tr>
        <td align="center" style="padding:32px 12px;">

            <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;">

                {{-- Header: logo + nama --}}
                <tr>
                    <td align="center" style="padding:0 0 20px 0;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td valign="middle" style="padding-right:12px;">
                                    <img src="{{ isset($message) ? $message->embed($logoPath) : 'data:image/png;base64,'.base64_encode(file_get_contents($logoPath)) }}"
                                         width="48" height="48" alt="Therapedia" style="display:block;width:48px;height:48px;">
                                </td>
                                <td valign="middle" align="left">
                                    <div style="font-size:22px;line-height:24px;font-weight:800;letter-spacing:-0.3px;color:#0f172a;">Therapedia</div>
                                    <div style="font-size:11px;line-height:16px;font-weight:600;letter-spacing:1.4px;text-transform:uppercase;color:#808080;">Developmental Center</div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                {{-- Kartu utama --}}
                <tr>
                    <td style="background-color:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

                            <tr><td style="height:5px;line-height:5px;font-size:0;background-color:#00AEEF;">&nbsp;</td></tr>

                            <tr>
                                <td class="px" style="padding:36px 40px 8px 40px;">
                                    <div style="font-size:12px;line-height:16px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#0090c8;">Verifikasi Keamanan</div>
                                    <h1 style="margin:8px 0 0 0;font-size:24px;line-height:32px;font-weight:800;letter-spacing:-0.4px;color:#0f172a;">Reset password akun Anda</h1>
                                </td>
                            </tr>

                            <tr>
                                <td class="px" style="padding:12px 40px 0 40px;font-size:15px;line-height:24px;color:#334155;">
                                    <p style="margin:0 0 12px 0;">Halo <strong style="color:#0f172a;">{{ $name }}</strong>,</p>
                                    <p style="margin:0;">Kami menerima permintaan untuk mengatur ulang password akun Therapedia Anda. Masukkan kode verifikasi berikut di halaman <em>Lupa Password</em> untuk melanjutkan.</p>
                                </td>
                            </tr>

                            {{-- Kode OTP --}}
                            <tr>
                                <td class="px" align="center" style="padding:28px 40px 8px 40px;">
                                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f9ff;border:1px solid #bae6fd;border-radius:14px;">
                                        <tr>
                                            <td align="center" style="padding:20px 22px 8px 22px;font-size:12px;line-height:16px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#0369a1;">
                                                Kode OTP Anda
                                            </td>
                                        </tr>
                                        <tr>
                                            <td align="center" style="padding:6px 18px 22px 18px;">
                                                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                                    <tr>
                                                        @foreach ($digits as $digit)
                                                            <td style="padding:0 3px;">
                                                                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                                                    <tr>
                                                                        <td class="digit" align="center" valign="middle" width="46" height="58"
                                                                            style="width:46px;height:58px;background-color:#ffffff;border:1px solid #7dd3fc;border-radius:10px;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:30px;line-height:58px;font-weight:800;color:#0086bf;">
                                                                            {{ $digit }}
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        @endforeach
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <tr>
                                <td class="px" align="center" style="padding:8px 40px 0 40px;font-size:14px;line-height:22px;color:#475569;">
                                    Kode berlaku selama <strong style="color:#0f172a;">{{ $ttlMinutes }} menit</strong> dan hanya dapat digunakan satu kali.
                                </td>
                            </tr>

                            {{-- Peringatan keamanan --}}
                            <tr>
                                <td class="px" style="padding:28px 40px 0 40px;">
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:12px;">
                                        <tr>
                                            <td style="padding:14px 18px;font-size:13px;line-height:20px;color:#78350f;">
                                                <strong style="color:#92400e;">Jaga kerahasiaan kode ini.</strong>
                                                Jangan bagikan kepada siapa pun, termasuk tim Therapedia. Kami tidak pernah meminta kode OTP melalui telepon, WhatsApp, atau email.
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <tr>
                                <td class="px" style="padding:20px 40px 0 40px;font-size:14px;line-height:22px;color:#475569;">
                                    Bukan Anda yang meminta? Abaikan email ini, password Anda tidak akan berubah. Bila khawatir akun Anda disalahgunakan, hubungi Master Director klinik.
                                </td>
                            </tr>

                            {{-- Detail permintaan --}}
                            <tr>
                                <td class="px" style="padding:24px 40px 36px 40px;">
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e2e8f0;">
                                        <tr>
                                            <td style="padding-top:16px;font-size:12px;line-height:20px;color:#64748b;">
                                                <span style="color:#94a3b8;">Waktu permintaan</span>&nbsp;&nbsp;<strong style="color:#475569;">{{ $requestedAt }}</strong>
                                                @if ($requestIp)
                                                    <br><span style="color:#94a3b8;">Alamat IP</span>&nbsp;&nbsp;<strong style="color:#475569;">{{ $requestIp }}</strong>
                                                @endif
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>

                {{-- Footer --}}
                <tr>
                    <td align="center" style="padding:24px 16px 0 16px;font-size:12px;line-height:19px;color:#94a3b8;">
                        <strong style="color:#64748b;">Therapedia Developmental Center</strong><br>
                        One Gate Integrated Clinic System &middot; Surabaya (East &middot; Citraland &middot; West)<br>
                        <span style="color:#a8b3c2;">Email ini dikirim otomatis, mohon tidak membalas pesan ini.</span>
                    </td>
                </tr>

            </table>

        </td>
    </tr>
</table>
</body>
</html>
