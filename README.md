# 4 Savings Solutions — Site preview

Static bilingual (EN / PT) lead-generation website. No build step: deploy the folder as is (Vercel preset "Other").

## Pages

| Page | English | Português |
|---|---|---|
| Home | `index.html` | `pt.html` |
| Landing page — Brasileiros nos EUA | — | `brasileiros.html` |
| Product page template — General Liability | `general-liability.html` | — |
| Blog index | `blog.html` | `blog-pt.html` |
| Blog article template | `blog-commercial-auto.html` | `blog-auto-comercial.html` |
| Privacy policy + accessibility statement | `privacy.html` | `privacidade.html` |

## Shared features (`assets/site.js` + `assets/site.css`)

- **Cookie consent (LGPD / privacy):** banner with Accept all / Only necessary / Customize, saved per visitor, with Google Consent Mode v2. Install Google Tag Manager, GA4, Google Ads and the Meta Pixel *after* `assets/site.js` so they respect the visitor's choice.
- **Accessibility:** skip link, keyboard focus, labeled forms, accessibility panel (text size, high contrast, underline links, readable font, stop animations) and VLibras on Portuguese pages. Checked with axe-core (WCAG 2.1 AA): no violations.
- **WhatsApp chat:** floating button that asks name, phone, type of insurance and consent, then opens WhatsApp with the message filled in. Every WhatsApp link on the site opens the chat first.
- **Quote forms:** required name, phone and consent; on submit they open WhatsApp with all the answers.
- Every lead pushes a `generate_lead` event to the `dataLayer` (for Google Ads / GA4 / Meta conversions) and keeps UTM and click ids (gclid, fbclid).

## Before going live

1. In `assets/site.js`, set `CONFIG.whatsapp` to the agency WhatsApp number (digits only, with country code, e.g. `15551234567`).
2. Optional: set `CONFIG.leadWebhook` (Make, Zapier, Google Apps Script or CRM) to also save every lead.
3. Fill the items in [BRACKETS]: phone, email, license number, licensed states, legal business name, address, privacy email, data protection officer and retention period.
4. Have the privacy policy reviewed by a lawyer.

Cover photos: [Unsplash](https://unsplash.com/license) (free license).
