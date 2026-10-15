// Peta endpoint Laravel API (prefix /api/v1 ada di ENV.API_BASE_URL).
// Satu sumber kebenaran URL: store/hook fase API memakai konstanta ini, bukan string literal.
// Detail kontrak & tabel terkait: docs/guide/10-api-migration.md dan schema.md.

export const ENDPOINTS = {
  auth: {
    staffLogin: "/auth/login",
    clientLogin: "/auth/client-login",
    logout: "/auth/logout",
    me: "/auth/me",
    changePassword: "/auth/change-password",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
  },
  users: {
    list: "/users",
    detail: (id) => `/users/${id}`,
    setActive: (id) => `/users/${id}/active`,
    resetPassword: (id) => `/users/${id}/reset-password`,
  },
  roles: {
    list: "/roles",
    detail: (id) => `/roles/${id}`,
    permissions: (id) => `/roles/${id}/permissions`,
    modules: "/access-modules",
  },
  therapists: {
    list: "/therapists",
    capacity: (id) => `/therapists/${id}/capacity`,
  },
  clients: {
    list: "/clients",
    detail: (id) => `/clients/${id}`,
    transition: (id) => `/clients/${id}/transition`,
    services: (id) => `/clients/${id}/services`,
    gdriveLinks: (id) => `/clients/${id}/gdrive-links`,
    assessmentCodes: (id) => `/clients/${id}/assessment-codes`,
    assessmentResponses: (id) => `/clients/${id}/assessment-responses`,
    renewals: (id) => `/clients/${id}/renewals`,
    credits: (id) => `/clients/${id}/credits`,
  },
  publicAssessment: {
    byCode: (code) => `/public/assessments/${code}`,
    draft: (code) => `/public/assessments/${code}/draft`, // PUT: simpan otomatis (patch jawaban); GET byCode ikut membawa draft
    submit: (code) => `/public/assessments/${code}/responses`,
  },
  assessmentCategories: {
    list: "/assessment-categories",
    detail: (id) => `/assessment-categories/${id}`,
  },
  // Master data kecil (M3). Kunci layanan/kuadran/alasan = `code`; paket = id server.
  master: {
    services: { list: "/master/services", detail: (code) => `/master/services/${code}` },
    quadrants: { list: "/master/quadrants", detail: (code) => `/master/quadrants/${code}` },
    cancelReasons: { list: "/master/cancel-reasons", detail: (code) => `/master/cancel-reasons/${code}` },
    dischargeReasons: { list: "/master/discharge-reasons", detail: (code) => `/master/discharge-reasons/${code}` },
    packages: { list: "/master/packages", detail: (id) => `/master/packages/${id}`, setActive: (id) => `/master/packages/${id}/active` },
  },
  holidays: { list: "/holidays", detail: (id) => `/holidays/${id}` },
  credits: {
    leftoverBalances: "/credits/leftover-balances",
  },
  branches: {
    list: "/branches",
    detail: (id) => `/branches/${id}`,
    setActive: (id) => `/branches/${id}/active`,
    deleteImpact: (id) => `/branches/${id}/delete-impact`,
    bankAccounts: (id) => `/branches/${id}/bank-accounts`,
    bankAccount: (id, accountId) => `/branches/${id}/bank-accounts/${accountId}`,
    bankAccountActive: (id, accountId) => `/branches/${id}/bank-accounts/${accountId}/active`,
  },
  schedules: {
    list: "/schedules",
    bulkCreate: "/schedules/bulk",
    detail: (id) => `/schedules/${id}`,
    report: (id) => `/schedules/${id}/report`,
    complete: (id) => `/schedules/${id}/complete`,
    cancel: (id) => `/schedules/${id}/cancel`,
    reschedule: (id) => `/schedules/${id}/reschedule`,
    markPending: (id) => `/schedules/${id}/mark-pending`,
    dropPending: (id) => `/schedules/${id}/drop-pending`,
    revert: (id) => `/schedules/${id}/revert`,
    bulkAction: (action) => `/schedules/bulk/${action}`,
    conflicts: "/schedules/conflicts",
  },
  // Cuti client (jatah 30 hari/tahun kalender): log Finance + sesi Off; jatah dihitung live
  leaves: {
    list: "/leaves",
    detail: (id) => `/leaves/${id}`,
    end: (id) => `/leaves/${id}/end`,
    void: (id) => `/leaves/${id}/void`,
    quota: (clientId) => `/clients/${clientId}/leave-quota`,
  },
  invoices: {
    list: "/invoices",
    detail: (id) => `/invoices/${id}`,
    proof: (id) => `/invoices/${id}/proof`,
    verify: (id) => `/invoices/${id}/verify`,
    void: (id) => `/invoices/${id}/void`,
    convertPackage: (id) => `/invoices/${id}/convert-package`,
    logs: (id) => `/invoices/${id}/logs`,
  },
  creditLedger: "/credit-ledger",
  dashboards: {
    revenue: "/dashboards/revenue",
    inquiry: "/dashboards/inquiry",
    schedule: "/dashboards/schedule",
    branchPerformance: "/dashboards/branch-performance",
    therapistSummary: "/dashboards/therapist-summary",
  },
};
