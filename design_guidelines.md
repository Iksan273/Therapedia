{
  "brand": {
    "name": "Therapedia Developmental Center",
    "attributes": [
      "trustworthy",
      "warm pediatric-healthcare",
      "minimalist",
      "calm + organized",
      "admin-efficient (scan-first)",
      "soft + approachable"
    ],
    "voice": {
      "tone": "clear, supportive, non-judgmental",
      "microcopy_rules": [
        "Prefer action verbs: Review, Schedule, Send, Admit",
        "Avoid blame language; use neutral phrasing: ‘Needs attention’ not ‘Failed’",
        "Always show next step in empty states"
      ]
    }
  },

  "design_tokens": {
    "note": "User-provided tokens are mandatory. Use these CSS variables as the single source of truth. Do not introduce new brand colors; only derive tints via opacity or Tailwind arbitrary values.",

    "css_variables": {
      "--color-primary": "#2FA8E0",
      "--color-primary-dark": "#1C7FB0",
      "--color-primary-light": "#E6F4FB",
      "--color-text": "#333333",
      "--color-text-muted": "#6B7280",
      "--color-border": "#E5E7EB",
      "--color-background": "#FFFFFF",
      "--color-surface": "#F8FAFC",
      "--color-success": "#22C55E",
      "--color-warning": "#F59E0B",
      "--color-danger": "#EF4444",
      "--color-info": "#3B82F6"
    },

    "tailwind_mapping_guidance": {
      "approach": "Use Tailwind arbitrary values to bind to CSS vars so components stay consistent: bg-[var(--color-background)] text-[var(--color-text)] border-[var(--color-border)] etc.",
      "examples": [
        "bg-[var(--color-surface)]",
        "text-[var(--color-text-muted)]",
        "ring-[var(--color-primary)]",
        "hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,white)] (if supported) OR hover:bg-[var(--color-primary-light)]"
      ]
    },

    "semantic_colors": {
      "background": "var(--color-background)",
      "surface": "var(--color-surface)",
      "surfaceElevated": "#FFFFFF",
      "text": "var(--color-text)",
      "textMuted": "var(--color-text-muted)",
      "border": "var(--color-border)",
      "primary": "var(--color-primary)",
      "primaryHover": "var(--color-primary-dark)",
      "primarySoft": "var(--color-primary-light)",
      "success": "var(--color-success)",
      "warning": "var(--color-warning)",
      "danger": "var(--color-danger)",
      "info": "var(--color-info)",
      "focusRing": "rgba(47,168,224,0.35)"
    },

    "radius": {
      "card": "rounded-xl",
      "control": "rounded-lg",
      "pill": "rounded-full"
    },

    "shadow": {
      "card": "shadow-[0_1px_2px_rgba(16,24,40,0.06),0_8px_24px_rgba(16,24,40,0.06)]",
      "popover": "shadow-[0_10px_30px_rgba(16,24,40,0.12)]",
      "focus": "ring-4 ring-[rgba(47,168,224,0.25)]"
    },

    "spacing": {
      "layout_gutters": "px-4 sm:px-6 lg:px-8",
      "section_gap": "gap-6 lg:gap-8",
      "card_padding": "p-4 sm:p-5",
      "dense_row_padding": "py-2.5"
    },

    "texture": {
      "rule": "Use subtle noise only on large backgrounds (surface), never on tables or text-heavy cards.",
      "css_snippet": ".noise-bg{background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.035'/%3E%3C/svg%3E\");}"
    }
  },

  "typography": {
    "font": {
      "family": "Poppins (Google Fonts)",
      "fallback": "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
    },
    "scale": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight",
      "h2": "text-base md:text-lg font-medium text-[var(--color-text-muted)]",
      "h3": "text-lg font-semibold",
      "body": "text-sm sm:text-base",
      "small": "text-xs text-[var(--color-text-muted)]"
    },
    "numbers": {
      "rule": "Use tabular numbers for credits, counts, and times.",
      "class": "tabular-nums"
    }
  },

  "layout": {
    "global": {
      "theme": "Light only",
      "container": "min-h-screen bg-[var(--color-background)] text-[var(--color-text)]",
      "page_shell": "flex",
      "content_area": "flex-1 min-w-0",
      "content_padding": "px-4 sm:px-6 lg:px-8 py-6"
    },

    "sidebar": {
      "position": "fixed left-0 top-0 h-screen w-[280px]",
      "surface": "bg-white border-r border-[var(--color-border)]",
      "logo_area": "h-16 flex items-center gap-3 px-4",
      "nav_item": {
        "base": "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[var(--color-text)]",
        "hover": "hover:bg-[var(--color-primary-light)]",
        "active": "bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]",
        "icon": "text-[var(--color-text-muted)] group-[.active]:text-[var(--color-primary-dark)]"
      },
      "collapse": {
        "optional": true,
        "behavior": "Desktop: allow collapse to icon-only (w-20). Tablet: overlay drawer.",
        "component": "Sheet (shadcn) for mobile/tablet overlay"
      }
    },

    "topbar": {
      "desktop": "sticky top-0 z-20 bg-[rgba(255,255,255,0.85)] backdrop-blur border-b border-[var(--color-border)]",
      "content": "h-16 flex items-center justify-between px-4 sm:px-6",
      "right_actions": [
        "global search (Command)",
        "Reset Demo Data button",
        "role switch (DropdownMenu)"
      ]
    },

    "grid_system": {
      "dashboard": "grid grid-cols-1 lg:grid-cols-12 gap-6",
      "primary_column": "lg:col-span-8",
      "secondary_column": "lg:col-span-4",
      "cards": "Use Card with consistent padding + header row"
    }
  },

  "components": {
    "component_path": {
      "button": "/app/frontend/src/components/ui/button.jsx",
      "badge": "/app/frontend/src/components/ui/badge.jsx",
      "card": "/app/frontend/src/components/ui/card.jsx",
      "tabs": "/app/frontend/src/components/ui/tabs.jsx",
      "table": "/app/frontend/src/components/ui/table.jsx",
      "dialog": "/app/frontend/src/components/ui/dialog.jsx",
      "sheet": "/app/frontend/src/components/ui/sheet.jsx",
      "dropdown_menu": "/app/frontend/src/components/ui/dropdown-menu.jsx",
      "command": "/app/frontend/src/components/ui/command.jsx",
      "input": "/app/frontend/src/components/ui/input.jsx",
      "textarea": "/app/frontend/src/components/ui/textarea.jsx",
      "select": "/app/frontend/src/components/ui/select.jsx",
      "checkbox": "/app/frontend/src/components/ui/checkbox.jsx",
      "progress": "/app/frontend/src/components/ui/progress.jsx",
      "calendar": "/app/frontend/src/components/ui/calendar.jsx",
      "sonner_toast": "/app/frontend/src/components/ui/sonner.jsx",
      "tooltip": "/app/frontend/src/components/ui/tooltip.jsx",
      "scroll_area": "/app/frontend/src/components/ui/scroll-area.jsx",
      "separator": "/app/frontend/src/components/ui/separator.jsx",
      "skeleton": "/app/frontend/src/components/ui/skeleton.jsx"
    },

    "buttons": {
      "variants": {
        "primary": {
          "classes": "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] focus-visible:ring-4 focus-visible:ring-[rgba(47,168,224,0.25)]",
          "use_for": ["Primary CTAs: Save, Create, Schedule, Submit"]
        },
        "secondary": {
          "classes": "bg-white border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface)]",
          "use_for": ["Secondary actions: Cancel, Close, View details"]
        },
        "ghost": {
          "classes": "bg-transparent hover:bg-[var(--color-primary-light)] text-[var(--color-text)]",
          "use_for": ["Toolbar icon buttons, subtle actions"]
        },
        "danger": {
          "classes": "bg-[var(--color-danger)] text-white hover:opacity-90",
          "use_for": ["Discontinue, Reset (confirm), Delete"]
        }
      },
      "sizes": {
        "sm": "h-9 px-3 text-sm",
        "md": "h-10 px-4 text-sm",
        "lg": "h-11 px-5 text-base"
      },
      "motion": {
        "rule": "No transition:all. Use targeted transitions.",
        "classes": "transition-colors duration-150 ease-out active:scale-[0.98]"
      }
    },

    "badges": {
      "shape": "pill",
      "base": "rounded-full px-2.5 py-0.5 text-xs font-medium",
      "status_map": {
        "new": "bg-[rgba(47,168,224,0.12)] text-[var(--color-primary-dark)]",
        "in_progress": "bg-[rgba(59,130,246,0.12)] text-[var(--color-info)]",
        "waiting": "bg-[rgba(245,158,11,0.14)] text-[var(--color-warning)]",
        "success": "bg-[rgba(34,197,94,0.14)] text-[var(--color-success)]",
        "danger": "bg-[rgba(239,68,68,0.14)] text-[var(--color-danger)]",
        "neutral": "bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]"
      },
      "accessibility": "Always pair color with label text (e.g., ‘Overdue’) and optional icon."
    },

    "tables": {
      "header": "bg-[var(--color-surface)] text-[var(--color-text-muted)]",
      "borders": "border border-[var(--color-border)]",
      "row_hover": "hover:bg-[rgba(47,168,224,0.06)]",
      "density": "Default comfortable; allow compact toggle for admin power users.",
      "empty_state": {
        "pattern": "Centered icon + title + one-line guidance + CTA",
        "example": "No active clients yet. Add an inquiry or import demo data."
      }
    },

    "kanban": {
      "use_case": "Inquiry Pipeline (8 statuses)",
      "layout": "Horizontal scroll columns with sticky column headers; each column shows count badge.",
      "column": "w-[280px] shrink-0 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]",
      "card": "rounded-xl bg-white border border-[var(--color-border)] shadow-[0_1px_2px_rgba(16,24,40,0.06)]",
      "micro_interactions": [
        "Card hover: elevate shadow + subtle translateY(-1px)",
        "Column header sticky with blur on scroll"
      ]
    },

    "modals_and_drawers": {
      "default": "Dialog for forms; Sheet for right-side details (keeps context like list/kanban visible).",
      "sizes": {
        "dialog": "max-w-lg",
        "sheet": "w-[420px] sm:w-[520px]"
      },
      "content_structure": [
        "Header: title + status badge + quick actions",
        "Meta grid: 2 columns (Assigned therapist, DOB, Credits)",
        "Body: tabs (Overview / Checklist / Notes / Activity)",
        "Footer: primary + secondary actions"
      ]
    },

    "forms": {
      "pattern": "Label above input, helper text below, errors inline.",
      "focus": "ring-4 ring-[rgba(47,168,224,0.25)] border-[var(--color-primary)]",
      "required": "Use ‘Required’ text + asterisk; don’t rely on color alone.",
      "access_code": "Use InputOTP for assessment access code entry."
    },

    "calendar_grid": {
      "custom_component": "Custom weekly calendar grid (day × time) with therapist filter.",
      "visual": {
        "grid": "border border-[var(--color-border)] rounded-xl overflow-hidden bg-white",
        "time_rail": "bg-[var(--color-surface)] text-[var(--color-text-muted)]",
        "day_header": "sticky top-0 bg-white/90 backdrop-blur border-b border-[var(--color-border)]",
        "slot_hover": "hover:bg-[rgba(47,168,224,0.06)]",
        "session_chip": "rounded-lg px-2 py-1 text-xs border shadow-sm"
      },
      "session_status_styles": {
        "scheduled": "bg-[rgba(47,168,224,0.10)] border-[rgba(47,168,224,0.25)] text-[var(--color-primary-dark)]",
        "completed": "bg-[rgba(34,197,94,0.12)] border-[rgba(34,197,94,0.25)] text-[var(--color-success)]",
        "cancelled": "bg-[rgba(239,68,68,0.10)] border-[rgba(239,68,68,0.22)] text-[var(--color-danger)]",
        "no_show": "bg-[rgba(245,158,11,0.14)] border-[rgba(245,158,11,0.28)] text-[var(--color-warning)]"
      },
      "interactions": [
        "Click empty slot -> Add Schedule Dialog",
        "Click session -> Session Detail Sheet",
        "Drag selection (optional MVP+) -> create multi-slot session",
        "Keyboard: arrow keys move focus cell; Enter opens add dialog"
      ]
    },

    "charts_recharts": {
      "style": {
        "grid": "stroke: rgba(229,231,235,0.9)",
        "axis": "tick fill: var(--color-text-muted)",
        "primary_series": "stroke/fill: var(--color-primary)",
        "success_series": "stroke/fill: var(--color-success)",
        "danger_series": "stroke/fill: var(--color-danger)",
        "tooltip": "Use shadcn Card-like tooltip with border + shadow"
      },
      "recommended_charts": [
        "Monthly discontinued (BarChart)",
        "Session status (Stacked BarChart)",
        "Discharge reasons (PieChart)"
      ],
      "empty_state": "If no data, show Skeleton + ‘No data for selected period’."
    },

    "checklists": {
      "use_case": "Inquiry Client Detail interactive checklist flow",
      "pattern": "Checklist as vertical stepper: each step has status (Not started / In progress / Done) + CTA.",
      "components": ["Checkbox", "Progress", "Badge", "Accordion"],
      "assessment_code": "Show generated code in a monospace chip with copy button + toast confirmation."
    },

    "credit_bars": {
      "pattern": "Progress bar + numeric label + warning/danger badge when thresholds hit.",
      "thresholds": {
        "warning": "<= 3 sessions",
        "danger": "<= 1 session"
      },
      "classes": {
        "bar": "h-2 rounded-full bg-[var(--color-border)]",
        "fill": "bg-[var(--color-success)]",
        "warning_fill": "bg-[var(--color-warning)]",
        "danger_fill": "bg-[var(--color-danger)]"
      }
    }
  },

  "motion": {
    "principles": [
      "Fast UI feedback (150–220ms) for hover/press",
      "Use subtle elevation + color shifts; avoid large bouncy motion in admin areas",
      "Prefer entrance animations only for modals/sheets and kanban cards"
    ],
    "recommended_library": {
      "name": "framer-motion (optional)",
      "install": "npm i framer-motion",
      "usage": "Use for Sheet/Dialog entrance, Kanban card lift, and dashboard card stagger. Keep it subtle."
    },
    "micro_interactions": [
      "Buttons: active:scale-[0.98] + transition-colors",
      "Sidebar items: background fade on hover",
      "Kanban cards: hover shadow intensifies + translate-y-[-1px]",
      "Table rows: hover background only (no movement)",
      "Copy-to-clipboard: toast via Sonner"
    ]
  },

  "accessibility": {
    "contrast": "Ensure text on primary buttons is white; muted text only on light surfaces.",
    "focus": "All interactive elements must have visible focus ring using focus-visible:ring-4 ring-[rgba(47,168,224,0.25)].",
    "keyboard": [
      "Sidebar nav reachable via Tab",
      "Kanban columns scrollable; cards focusable",
      "Calendar grid supports keyboard focus cell"
    ],
    "aria": [
      "Dialogs/Sheets must have titles",
      "Icon-only buttons require aria-label"
    ]
  },

  "testing": {
    "data_testid_rule": "All interactive and key informational elements MUST include data-testid in kebab-case describing role, not appearance.",
    "examples": [
      "data-testid=\"role-select-admin-inquiry-button\"",
      "data-testid=\"sidebar-nav-inquiry-pipeline-link\"",
      "data-testid=\"kanban-column-new-count\"",
      "data-testid=\"client-detail-generate-assessment-code-button\"",
      "data-testid=\"weekly-calendar-add-session-button\"",
      "data-testid=\"reset-demo-data-button\"",
      "data-testid=\"client-credits-remaining-value\""
    ]
  },

  "image_urls": {
    "brand_placeholder": {
      "category": "logo",
      "description": "Use a simple ‘T’ mark + wordmark placeholder; no gradients. Keep it monochrome with primary accent dot.",
      "urls": []
    },
    "role_select_hero": {
      "category": "hero",
      "description": "Warm clinic interior photo for the role-select landing screen side panel (desktop split layout).",
      "urls": [
        "https://images.unsplash.com/photo-1637665759389-41818b867562?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NjV8MHwxfHNlYXJjaHwxfHxwZWRpYXRyaWMlMjBvY2N1cGF0aW9uYWwlMjB0aGVyYXB5JTIwY2xpbmljJTIwd2FpdGluZyUyMHJvb20lMjBicmlnaHQlMjBuYXR1cmFsJTIwbGlnaHR8ZW58MHx8fGJsdWV8MTc4NzA1OTg4OXww&ixlib=rb-4.1.0&q=85"
      ]
    },
    "public_inquiry_header": {
      "category": "public-page",
      "description": "Clean reception-style image for public inquiry form header (optional).",
      "urls": [
        "https://images.pexels.com/photos/38055773/pexels-photo-38055773.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
      ]
    }
  },

  "page_blueprints": {
    "landing_role_select": {
      "layout": "Desktop split-screen: left = brand + role cards; right = photo panel. Mobile = stacked with photo collapsed.",
      "components": ["Card", "Button", "Separator"],
      "role_cards": "4 cards with icon, title, one-line description, primary CTA.",
      "testids": [
        "role-select-admin-inquiry-button",
        "role-select-admin-schedule-button",
        "role-select-therapist-button",
        "role-select-client-login-button"
      ]
    },

    "admin_inquiry_dashboard": {
      "layout": "12-col grid: left analytics + lists, right quick queues.",
      "cards": [
        "Pipeline count cards (8 statuses)",
        "Unfilled assessments list",
        "Monthly discontinued chart"
      ],
      "interaction": "Click list row opens right-side Sheet with details + actions."
    },

    "inquiry_pipeline_kanban": {
      "layout": "Horizontal scroll kanban with sticky headers; top toolbar with filters + search.",
      "toolbar": ["Select therapist", "Status filter", "Search (Command)", "New inquiry button"],
      "interaction": "Click card opens Sheet; move status via DropdownMenu inside Sheet (MVP)."
    },

    "weekly_calendar": {
      "layout": "Top controls row (week picker, therapist filter, legend) + grid.",
      "date_controls": "Use date-fns for week navigation; optional shadcn Calendar in Popover for jump-to-date.",
      "interaction": "Slot click -> Dialog; session click -> Sheet."
    },

    "client_portal_dashboard": {
      "layout": "Friendly but still minimal: credits card + therapy history table + next session card.",
      "visual": "Use more whitespace and slightly larger type for parents."
    }
  },

  "implementation_notes_js": {
    "react_files": "Project uses .js (not .tsx). Keep components in JS and use PropTypes only if already used; otherwise keep simple.",
    "css_setup": [
      "Replace CRA default App.css styles; do not center .App.",
      "In index.css, set body font-family to Poppins and map shadcn tokens to user CSS vars (or override Tailwind classes with CSS vars)."
    ],
    "shadcn_usage": "Always use components from /app/frontend/src/components/ui for dropdowns, dialogs, calendar, tabs, table, etc."
  },

  "instructions_to_main_agent": [
    "Update /app/frontend/src/index.css body font-family to Poppins and set base text color/background using the provided CSS vars.",
    "Remove CRA demo styles from /app/frontend/src/App.css (dark header, spinning logo).",
    "Implement a fixed left sidebar (280px) + sticky topbar; content uses px-4/6/8 and py-6.",
    "Use shadcn Button/Card/Badge/Table/Tabs/Dialog/Sheet/Command/DropdownMenu/Calendar/Progress components; do not use native HTML dropdown/calendar/toast.",
    "Kanban: keep columns 280px, horizontal scroll, sticky headers; open details in Sheet to preserve context.",
    "Calendar: custom grid with sticky day header + time rail; use Dialog for add-session and Sheet for session details.",
    "All interactive and key informational elements must include data-testid attributes (kebab-case).",
    "Persist demo data to localStorage; include a prominent Reset Demo Data button in topbar with confirm dialog."
  ],

  "references": {
    "inspiration": [
      {
        "title": "Pediatric Care Operations Hub (queue-first + right-side drawer pattern)",
        "url": "https://www.picojr.com/work/pediatric-care-operations-hub"
      },
      {
        "title": "ClinicMaster Pediatrics/Child Care template (Poppins + sidebar patterns)",
        "url": "https://themeforest.net/item/clinicmaster-pediatrics-child-care-next-js-template/61755374"
      }
    ]
  },

  "general_ui_ux_design_guidelines": "- You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals."
}
