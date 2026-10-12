import { ENV } from "@/config/env";

// Landing dan aplikasi klinik di-deploy terpisah: pindah halaman = navigasi penuh ke URL aplikasi.
export const appUrl = (path = "/") => `${ENV.APP_URL}${path.startsWith("/") ? path : `/${path}`}`;
export const goToApp = (path = "/") => window.location.assign(appUrl(path));
