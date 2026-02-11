/**
 * Shared Brand Email Layout
 *
 * All email templates should use brandWrap() for consistent branding.
 *
 * Brand colors:
 * - Neon:    #CCFF00
 * - Magenta: #FF2DCE
 * - Purple:  #6F00D8
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.empoweredsportscamp.com'

// Brand color constants
export const BRAND = {
  neon: '#CCFF00',
  magenta: '#FF2DCE',
  purple: '#6F00D8',
  black: '#000000',
  container: '#0a0a0a',
  borderSubtle: 'rgba(255,255,255,0.08)',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.75)',
  textMuted: 'rgba(255,255,255,0.45)',
  textFaint: 'rgba(255,255,255,0.25)',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
} as const

export const LOGO_URL = `${APP_URL}/images/logo.png`
export { APP_URL }

/**
 * Wrap email body content in the branded dark layout with logo,
 * gradient accent bar, Poppins font, and footer.
 *
 * @param bodyContent - The inner HTML content of the email
 * @param options - Optional overrides
 */
export function brandWrap(
  bodyContent: string,
  options?: { accentColor?: string }
): string {
  const accent = options?.accentColor || BRAND.neon

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Empowered Sports Camp</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.black}; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND.black}; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: ${BRAND.container}; border: 1px solid ${BRAND.borderSubtle}; border-radius: 8px; overflow: hidden;">

          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding: 36px 40px 24px; background: linear-gradient(135deg, rgba(204,255,0,0.06) 0%, rgba(111,0,216,0.06) 100%);">
              <img src="${LOGO_URL}" alt="Empowered Sports Camp" width="180" style="display: block; max-width: 180px; height: auto;" />
            </td>
          </tr>

          <!-- Gradient Accent Bar -->
          <tr>
            <td style="height: 3px; background: linear-gradient(90deg, ${BRAND.neon}, ${BRAND.magenta}, ${BRAND.purple});"></td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 40px;">
              ${bodyContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid rgba(255,255,255,0.06); background-color: rgba(0,0,0,0.4);">
              <table cellpadding="0" cellspacing="0" style="width: 100%;">
                <tr>
                  <td align="center" style="padding: 0 0 12px;">
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: ${BRAND.textFaint}; font-family: 'Poppins', Arial, sans-serif;">
                      Unleash Your Inner Champion
                    </span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 0 0 8px;">
                    <a href="${APP_URL}" style="color: ${BRAND.neon}; text-decoration: none; font-size: 12px; font-family: 'Poppins', Arial, sans-serif;">Website</a>
                    <span style="color: ${BRAND.textFaint}; margin: 0 8px;">|</span>
                    <a href="${APP_URL}/camps" style="color: ${BRAND.neon}; text-decoration: none; font-size: 12px; font-family: 'Poppins', Arial, sans-serif;">Browse Camps</a>
                    <span style="color: ${BRAND.textFaint}; margin: 0 8px;">|</span>
                    <a href="${APP_URL}/privacy" style="color: ${BRAND.textFaint}; text-decoration: none; font-size: 12px; font-family: 'Poppins', Arial, sans-serif;">Privacy</a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; color: ${BRAND.textFaint}; font-size: 11px; font-family: 'Poppins', Arial, sans-serif;">
                      &copy; ${new Date().getFullYear()} Empowered Sports Camp. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()
}

// ============================================================================
// Reusable HTML snippets for email content blocks
// ============================================================================

const F = `font-family: 'Poppins', Arial, sans-serif;`

/** Small uppercase label */
export function emailLabel(text: string, color: string = BRAND.magenta): string {
  return `<p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; color: ${color}; ${F}">${text}</p>`
}

/** Section heading */
export function emailHeading(text: string, color: string = BRAND.textPrimary): string {
  return `<h1 style="margin: 0 0 24px; color: ${color}; font-size: 26px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; line-height: 1.2; ${F}">${text}</h1>`
}

/** Sub-heading */
export function emailSubheading(text: string): string {
  return `<h2 style="margin: 24px 0 12px; color: ${BRAND.textPrimary}; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; ${F}">${text}</h2>`
}

/** Body paragraph */
export function emailParagraph(text: string): string {
  return `<p style="margin: 0 0 16px; color: ${BRAND.textSecondary}; font-size: 15px; line-height: 1.7; ${F}">${text}</p>`
}

/** CTA button (centered) */
export function emailButton(text: string, href: string, color: string = BRAND.neon): string {
  return `
<table cellpadding="0" cellspacing="0" style="margin: 24px auto; width: 100%;">
  <tr>
    <td align="center">
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="background-color: ${color}; padding: 16px 48px; border-radius: 4px;">
            <a href="${href}" style="color: #000000; text-decoration: none; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; ${F} display: inline-block;">
              ${text}
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
}

/** Details card with label/value rows */
export function emailDetailsCard(
  rows: Array<{ label: string; value: string }>,
  title?: string,
  borderColor: string = BRAND.neon
): string {
  const titleRow = title
    ? `<tr><td colspan="2" style="padding: 0 0 12px; color: ${borderColor}; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; ${F}">${title}</td></tr>`
    : ''

  const dataRows = rows
    .map(
      (r) => `
    <tr>
      <td style="padding: 8px 0; color: ${BRAND.textMuted}; font-size: 14px; ${F} width: 40%;">${r.label}</td>
      <td style="padding: 8px 0; color: ${BRAND.textPrimary}; font-size: 14px; font-weight: 600; ${F} text-align: right;">${r.value}</td>
    </tr>`
    )
    .join('')

  return `
<table cellpadding="0" cellspacing="0" style="margin: 16px 0 24px; width: 100%; border-radius: 6px; overflow: hidden;">
  <tr>
    <td style="background-color: rgba(204,255,0,0.04); border: 1px solid rgba(204,255,0,0.12); border-radius: 6px; padding: 20px 24px;">
      <table cellpadding="0" cellspacing="0" style="width: 100%;">
        ${titleRow}
        ${dataRows}
      </table>
    </td>
  </tr>
</table>`
}

/** Highlight / callout box */
export function emailHighlight(text: string, color: string = BRAND.neon): string {
  return `
<table cellpadding="0" cellspacing="0" style="margin: 20px 0; width: 100%;">
  <tr>
    <td align="center" style="background-color: ${color}; padding: 18px 24px; border-radius: 6px;">
      <span style="color: #000000; font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; ${F}">${text}</span>
    </td>
  </tr>
</table>`
}

/** Info / warning / success callout with left border */
export function emailCallout(
  text: string,
  type: 'info' | 'warning' | 'success' | 'purple' = 'info'
): string {
  const colors: Record<string, { bg: string; border: string }> = {
    info: { bg: 'rgba(204,255,0,0.06)', border: BRAND.neon },
    warning: { bg: 'rgba(245,158,11,0.08)', border: BRAND.warning },
    success: { bg: 'rgba(34,197,94,0.08)', border: BRAND.success },
    purple: { bg: 'rgba(111,0,216,0.08)', border: BRAND.purple },
  }
  const c = colors[type]

  return `
<table cellpadding="0" cellspacing="0" style="margin: 16px 0; width: 100%;">
  <tr>
    <td style="background-color: ${c.bg}; border-left: 3px solid ${c.border}; border-radius: 0 6px 6px 0; padding: 16px 20px;">
      <p style="margin: 0; color: ${BRAND.textSecondary}; font-size: 14px; line-height: 1.6; ${F}">${text}</p>
    </td>
  </tr>
</table>`
}

/** Small muted text link */
export function emailMutedLink(text: string, href: string): string {
  return `<p style="margin: 8px 0; color: ${BRAND.textFaint}; font-size: 12px; ${F}"><a href="${href}" style="color: ${BRAND.neon}; text-decoration: underline;">${text}</a></p>`
}

/** Muted fallback URL */
export function emailFallbackUrl(href: string): string {
  return `
<p style="margin: 0 0 8px; color: ${BRAND.textFaint}; font-size: 12px; ${F}">Or copy and paste this link into your browser:</p>
<p style="margin: 0; font-size: 12px; ${F}"><a href="${href}" style="color: ${BRAND.neon}; text-decoration: underline; word-break: break-all;">${href}</a></p>`
}
