// Peta endpoint Laravel API (prefix /api/v1 ada di ENV.API_BASE_URL).
// Satu sumber kebenaran URL: store/hook fase API memakai konstanta ini, bukan string literal.
// Detail kontrak & tabel terkait: docs/guide/10-api-migration.md dan schema.md.

export const ENDPOINTS = {
  auth: {
    staffLogin: "/auth/login",
    clientLogin: "/auth/client-login",
    logout: "/auth/logout",
    me: "/auth/me",
  },
  branches: "/branches",
  users: {
    list: "/users",
    detail: (id) => `/users/${id}`,
  },
  roles: {
    list: "/roles",
    detail: (id) => `/roles/${id}`,
    permissions: (id) => `/roles/${id}/permissions`,
    modules: "/access-modules",
  },
  therapists: {
    list: "/therapists",
  },
  clients: {
    list: "/clients",
    detail: (id) => `/clients/${id}`,
    transition: (id) => `/clients/${id}/transition`,
    services: (id) => `/clients/${id}/services`,
    gdriveLinks: (id) => `/clients/${id}/gdrive-links`,
    assessmentCodes: (id) => `/clients/${id}/assessment-codes`,
    assessmentResponses: (id) => `/clients/${id}/assessment-responses`,
    discharge: (id) => `/clients/${id}/discharge`,
    renewals: (id) => `/clients/${id}/renewals`,
    credits: (id) => `/clients/${id}/credits`,
    pipelineLogs: (id) => `/clients/${id}/pipeline-logs`,
  },
  publicAssessment: {
    byCode: (code) => `/public/assessments/${code}`,
    submit: (code) => `/public/assessments/${code}/responses`,
  },
  assessmentCategories: {
    list: "/assessment-categories",
    detail: (id) => `/assessment-categories/${id}`,
  },
  master: {
    services: "/master/services",
    quadrants: "/master/quadrants",
    packages: "/master/packages",
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
  invoices: {
    list: "/invoices",
    detail: (id) => `/invoices/${id}`,
    proof: (id) => `/invoices/${id}/proof`,
    verify: (id) => `/invoices/${id}/verify`,
    void: (id) => `/invoices/${id}/void`,
  },
  creditLedger: "/credit-ledger",
  dashboards: {
    revenue: "/dashboards/revenue",
    inquiry: "/dashboards/inquiry",
    schedule: "/dashboards/schedule",
    branchPerformance: "/dashboards/branch-performance",
    therapistSummary: "/dashboards/therapist-summary",
  },
  auditLogs: {
    list: "/audit-logs",
    forEntity: (type, id) => `/audit-logs/${type}/${id}`,
  },
};
