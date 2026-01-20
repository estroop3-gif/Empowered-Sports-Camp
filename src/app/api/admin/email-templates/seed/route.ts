/**
 * Seed Default Email Templates
 *
 * POST /api/admin/email-templates/seed
 * Creates all default email templates in the database
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getAuthUser } from '@/lib/auth/server'
import { EmailType } from '@/generated/prisma'
import { invalidateTemplateCache } from '@/lib/services/email'

// Default templates with full HTML content
const DEFAULT_TEMPLATES: {
  emailType: EmailType
  name: string
  description: string
  availableVars: string[]
  subject: string
  bodyHtml: string
}[] = [
  {
    emailType: 'registration_confirmation',
    name: 'Registration Confirmation',
    description: 'Sent after successful payment to confirm camp registration',
    availableVars: ['parentName', 'athleteName', 'campName', 'campDates', 'campLocation', 'campTime', 'totalPaid'],
    subject: "You're Registered! {{athleteName}} is Going to {{campName}}",
    bodyHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #1a1a1a; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #2a2a2a; border: 1px solid #333;">
          <tr>
            <td style="padding: 30px; text-align: center; border-bottom: 2px solid #CCFF00;">
              <h1 style="margin: 0; color: #CCFF00; font-size: 28px; font-weight: 900; text-transform: uppercase;">
                Empowered Sports Camp
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #CCFF00; font-size: 24px;">🎉 You're Registered!</h2>
              <p style="color: #ffffff; font-size: 16px; line-height: 1.6;">
                Hi {{parentName}},
              </p>
              <p style="color: #cccccc; font-size: 16px; line-height: 1.6;">
                Great news! <strong style="color: #ffffff;">{{athleteName}}</strong> is officially registered for <strong style="color: #CCFF00;">{{campName}}</strong>!
              </p>
              <div style="margin: 30px 0; padding: 20px; background: #1a1a1a; border-left: 3px solid #FF2DCE;">
                <p style="margin: 0 0 10px; color: #FF2DCE; font-size: 12px; text-transform: uppercase;">Camp Details</p>
                <p style="margin: 5px 0; color: #ffffff;"><strong>Dates:</strong> {{campDates}}</p>
                <p style="margin: 5px 0; color: #ffffff;"><strong>Time:</strong> {{campTime}}</p>
                <p style="margin: 5px 0; color: #ffffff;"><strong>Location:</strong> {{campLocation}}</p>
                <p style="margin: 5px 0; color: #ffffff;"><strong>Amount Paid:</strong> {{totalPaid}}</p>
              </div>
              <p style="color: #cccccc; font-size: 16px; line-height: 1.6;">
                We'll send you a reminder email 2 weeks before camp with everything you need to prepare!
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; text-align: center; background: #1a1a1a; border-top: 1px solid #333;">
              <p style="margin: 0; color: #666; font-size: 12px;">
                © 2024 Empowered Sports Camp. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    emailType: 'camp_two_weeks_out',
    name: '2 Weeks Out Reminder',
    description: 'Sent 2 weeks before camp starts with preparation tips',
    availableVars: ['parentName', 'athleteName', 'campName', 'campDates', 'campLocation', 'daysUntilCamp'],
    subject: "2 Weeks Until {{campName}}! Let's Get Ready",
    bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #1a1a1a; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #2a2a2a; border: 1px solid #333;">
          <tr>
            <td style="padding: 30px; text-align: center; border-bottom: 2px solid #CCFF00;">
              <h1 style="margin: 0; color: #CCFF00; font-size: 28px; font-weight: 900;">EMPOWERED SPORTS CAMP</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #CCFF00; font-size: 24px;">⏰ 2 Weeks Until Camp!</h2>
              <p style="color: #ffffff; font-size: 16px; line-height: 1.6;">Hi {{parentName}},</p>
              <p style="color: #cccccc; font-size: 16px; line-height: 1.6;">
                {{athleteName}}'s adventure at <strong style="color: #CCFF00;">{{campName}}</strong> starts in just {{daysUntilCamp}} days!
              </p>
              <div style="margin: 30px 0; padding: 20px; background: #1a1a1a; border-left: 3px solid #FF2DCE;">
                <p style="margin: 0 0 15px; color: #FF2DCE; font-size: 14px; text-transform: uppercase;">What to Pack</p>
                <ul style="color: #cccccc; margin: 0; padding-left: 20px;">
                  <li>Athletic clothes & shoes</li>
                  <li>Water bottle (labeled with name)</li>
                  <li>Sunscreen</li>
                  <li>Healthy snacks</li>
                  <li>Positive attitude! 💪</li>
                </ul>
              </div>
              <p style="color: #cccccc; font-size: 16px;">
                <strong>Camp Dates:</strong> {{campDates}}<br>
                <strong>Location:</strong> {{campLocation}}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; text-align: center; background: #1a1a1a;">
              <p style="margin: 0; color: #666; font-size: 12px;">© 2024 Empowered Sports Camp</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    emailType: 'camp_two_days_before',
    name: '2 Days Before Reminder',
    description: 'Sent 2 days before camp with final checklist',
    availableVars: ['parentName', 'athleteName', 'campName', 'campDates', 'campLocation', 'campTime', 'checkInInfo'],
    subject: "{{campName}} Starts in 2 Days! Final Checklist",
    bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #1a1a1a; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #2a2a2a; border: 1px solid #333;">
          <tr>
            <td style="padding: 30px; text-align: center; border-bottom: 2px solid #CCFF00;">
              <h1 style="margin: 0; color: #CCFF00; font-size: 28px; font-weight: 900;">EMPOWERED SPORTS CAMP</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #CCFF00; font-size: 24px;">🚀 Almost Time!</h2>
              <p style="color: #ffffff; font-size: 16px; line-height: 1.6;">Hi {{parentName}},</p>
              <p style="color: #cccccc; font-size: 16px; line-height: 1.6;">
                <strong style="color: #CCFF00;">{{campName}}</strong> starts in just 2 days! Here's your final checklist:
              </p>
              <div style="margin: 30px 0; padding: 20px; background: #1a1a1a; border-left: 3px solid #CCFF00;">
                <p style="margin: 0 0 10px; color: #CCFF00; font-size: 14px; text-transform: uppercase;">Check-In Details</p>
                <p style="margin: 5px 0; color: #ffffff;"><strong>Date:</strong> {{campDates}}</p>
                <p style="margin: 5px 0; color: #ffffff;"><strong>Time:</strong> {{campTime}}</p>
                <p style="margin: 5px 0; color: #ffffff;"><strong>Location:</strong> {{campLocation}}</p>
              </div>
              <p style="color: #cccccc; font-size: 16px;">
                {{checkInInfo}}
              </p>
              <p style="color: #cccccc; font-size: 16px;">
                We can't wait to see {{athleteName}}! 🎉
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; text-align: center; background: #1a1a1a;">
              <p style="margin: 0; color: #666; font-size: 12px;">© 2024 Empowered Sports Camp</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    emailType: 'camp_daily_recap',
    name: 'Daily Recap',
    description: 'Sent at end of each camp day with highlights',
    availableVars: ['parentName', 'athleteName', 'campName', 'dayNumber', 'dayTheme', 'wordOfTheDay', 'primarySport', 'secondarySport', 'guestSpeaker', 'tomorrowPreview'],
    subject: 'Day {{dayNumber}} Recap: {{athleteName}} at {{campName}}',
    bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #1a1a1a; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #2a2a2a; border: 1px solid #333;">
          <tr>
            <td style="padding: 30px; text-align: center; border-bottom: 2px solid #CCFF00;">
              <h1 style="margin: 0; color: #CCFF00; font-size: 28px; font-weight: 900;">EMPOWERED SPORTS CAMP</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #CCFF00; font-size: 24px;">📋 Day {{dayNumber}} Recap</h2>
              <p style="color: #ffffff; font-size: 16px; line-height: 1.6;">Hi {{parentName}},</p>
              <p style="color: #cccccc; font-size: 16px; line-height: 1.6;">
                Here's what {{athleteName}} experienced today at <strong style="color: #CCFF00;">{{campName}}</strong>!
              </p>
              <div style="margin: 30px 0; padding: 20px; background: #1a1a1a; border-left: 3px solid #FF2DCE;">
                <p style="margin: 0 0 10px; color: #FF2DCE; font-size: 14px; text-transform: uppercase;">Today's Theme: {{dayTheme}}</p>
                <p style="margin: 10px 0; color: #ffffff;"><strong>Word of the Day:</strong> {{wordOfTheDay}}</p>
                <p style="margin: 10px 0; color: #ffffff;"><strong>Sports:</strong> {{primarySport}}, {{secondarySport}}</p>
                {{guestSpeaker}}
              </div>
              <div style="margin: 20px 0; padding: 20px; background: #1a1a1a; border-left: 3px solid #CCFF00;">
                <p style="margin: 0; color: #CCFF00; font-size: 14px; text-transform: uppercase;">Tomorrow's Preview</p>
                <p style="margin: 10px 0 0; color: #cccccc;">{{tomorrowPreview}}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; text-align: center; background: #1a1a1a;">
              <p style="margin: 0; color: #666; font-size: 12px;">© 2024 Empowered Sports Camp</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    emailType: 'camp_session_recap',
    name: 'Session Recap',
    description: 'Sent after camp week ends with full summary',
    availableVars: ['parentName', 'athleteName', 'campName', 'campDates', 'totalDays', 'sportsLearned', 'feedbackUrl'],
    subject: "What an Amazing Week! {{athleteName}}'s {{campName}} Journey",
    bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #1a1a1a; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #2a2a2a; border: 1px solid #333;">
          <tr>
            <td style="padding: 30px; text-align: center; border-bottom: 2px solid #CCFF00;">
              <h1 style="margin: 0; color: #CCFF00; font-size: 28px; font-weight: 900;">EMPOWERED SPORTS CAMP</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #CCFF00; font-size: 24px;">🏆 What an Amazing Week!</h2>
              <p style="color: #ffffff; font-size: 16px; line-height: 1.6;">Hi {{parentName}},</p>
              <p style="color: #cccccc; font-size: 16px; line-height: 1.6;">
                {{athleteName}} just completed an incredible {{totalDays}} days at <strong style="color: #CCFF00;">{{campName}}</strong>!
              </p>
              <div style="margin: 30px 0; padding: 20px; background: #1a1a1a; border-left: 3px solid #FF2DCE;">
                <p style="margin: 0 0 15px; color: #FF2DCE; font-size: 14px; text-transform: uppercase;">Week Highlights</p>
                <p style="margin: 10px 0; color: #ffffff;"><strong>Sports Explored:</strong> {{sportsLearned}}</p>
                <p style="margin: 10px 0; color: #ffffff;"><strong>Camp Dates:</strong> {{campDates}}</p>
              </div>
              <p style="color: #cccccc; font-size: 16px; line-height: 1.6;">
                We'd love to hear your feedback! Please take a moment to share your experience.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{feedbackUrl}}" style="display: inline-block; padding: 15px 30px; background: #CCFF00; color: #000; text-decoration: none; font-weight: bold; text-transform: uppercase;">Share Feedback</a>
              </div>
              <p style="color: #cccccc; font-size: 16px;">
                Thank you for being part of the Empowered family! 💚
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; text-align: center; background: #1a1a1a;">
              <p style="margin: 0; color: #666; font-size: 12px;">© 2024 Empowered Sports Camp</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    emailType: 'season_followup_jan',
    name: 'January Follow-up',
    description: 'New year re-engagement campaign',
    availableVars: ['parentName', 'year', 'registrationUrl', 'earlyBirdCode'],
    subject: 'New Year, New Goals - Camp Registration Opens Soon!',
    bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #1a1a1a; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #2a2a2a; border: 1px solid #333;">
          <tr>
            <td style="padding: 30px; text-align: center; border-bottom: 2px solid #CCFF00;">
              <h1 style="margin: 0; color: #CCFF00; font-size: 28px; font-weight: 900;">EMPOWERED SPORTS CAMP</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #CCFF00; font-size: 24px;">🎯 New Year, New Goals!</h2>
              <p style="color: #ffffff; font-size: 16px; line-height: 1.6;">Hi {{parentName}},</p>
              <p style="color: #cccccc; font-size: 16px; line-height: 1.6;">
                Happy {{year}}! Registration for summer camp is opening soon, and we want YOU to be first in line!
              </p>
              <div style="margin: 30px 0; padding: 20px; background: #1a1a1a; border-left: 3px solid #CCFF00;">
                <p style="margin: 0; color: #CCFF00; font-size: 14px; text-transform: uppercase;">Early Bird Special</p>
                <p style="margin: 10px 0 0; color: #ffffff;">Use code <strong>{{earlyBirdCode}}</strong> for exclusive early access!</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{registrationUrl}}" style="display: inline-block; padding: 15px 30px; background: #CCFF00; color: #000; text-decoration: none; font-weight: bold; text-transform: uppercase;">View Camps</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; text-align: center; background: #1a1a1a;">
              <p style="margin: 0; color: #666; font-size: 12px;">© {{year}} Empowered Sports Camp</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    emailType: 'season_followup_feb',
    name: 'February Follow-up',
    description: "Valentine's Day themed sibling referral",
    availableVars: ['parentName', 'year', 'registrationUrl', 'referralCode'],
    subject: 'Share the Love - Bring a Friend to Camp!',
    bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #1a1a1a; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #2a2a2a; border: 1px solid #333;">
          <tr>
            <td style="padding: 30px; text-align: center; border-bottom: 2px solid #FF2DCE;">
              <h1 style="margin: 0; color: #FF2DCE; font-size: 28px; font-weight: 900;">EMPOWERED SPORTS CAMP</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #FF2DCE; font-size: 24px;">💝 Share the Love!</h2>
              <p style="color: #ffffff; font-size: 16px; line-height: 1.6;">Hi {{parentName}},</p>
              <p style="color: #cccccc; font-size: 16px; line-height: 1.6;">
                This Valentine's season, give the gift of confidence! Refer a friend and you BOTH get a discount.
              </p>
              <div style="margin: 30px 0; padding: 20px; background: #1a1a1a; border-left: 3px solid #FF2DCE;">
                <p style="margin: 0; color: #FF2DCE; font-size: 14px; text-transform: uppercase;">Referral Reward</p>
                <p style="margin: 10px 0 0; color: #ffffff;">Share code <strong>{{referralCode}}</strong> - you both save!</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{registrationUrl}}" style="display: inline-block; padding: 15px 30px; background: #FF2DCE; color: #fff; text-decoration: none; font-weight: bold; text-transform: uppercase;">Register Now</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; text-align: center; background: #1a1a1a;">
              <p style="margin: 0; color: #666; font-size: 12px;">© {{year}} Empowered Sports Camp</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    emailType: 'season_followup_mar',
    name: 'March Follow-up',
    description: 'Spring training / early bird deadline',
    availableVars: ['parentName', 'year', 'registrationUrl', 'earlyBirdDeadline', 'earlyBirdCode'],
    subject: 'Spring Training Starts Here - Early Bird Deadline Approaching!',
    bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #1a1a1a; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #2a2a2a; border: 1px solid #333;">
          <tr>
            <td style="padding: 30px; text-align: center; border-bottom: 2px solid #CCFF00;">
              <h1 style="margin: 0; color: #CCFF00; font-size: 28px; font-weight: 900;">EMPOWERED SPORTS CAMP</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #CCFF00; font-size: 24px;">🌱 Spring Training Starts Here!</h2>
              <p style="color: #ffffff; font-size: 16px; line-height: 1.6;">Hi {{parentName}},</p>
              <p style="color: #cccccc; font-size: 16px; line-height: 1.6;">
                Early bird pricing ends <strong style="color: #CCFF00;">{{earlyBirdDeadline}}</strong>! Don't miss out on the best rates.
              </p>
              <div style="margin: 30px 0; padding: 20px; background: #1a1a1a; border-left: 3px solid #CCFF00;">
                <p style="margin: 0; color: #CCFF00; font-size: 14px; text-transform: uppercase;">Save with Early Bird</p>
                <p style="margin: 10px 0 0; color: #ffffff;">Use code <strong>{{earlyBirdCode}}</strong> before {{earlyBirdDeadline}}</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{registrationUrl}}" style="display: inline-block; padding: 15px 30px; background: #CCFF00; color: #000; text-decoration: none; font-weight: bold; text-transform: uppercase;">Register Now</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; text-align: center; background: #1a1a1a;">
              <p style="margin: 0; color: #666; font-size: 12px;">© {{year}} Empowered Sports Camp</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    emailType: 'season_followup_apr',
    name: 'April Follow-up',
    description: 'Earth day / outdoor camp highlights',
    availableVars: ['parentName', 'year', 'registrationUrl', 'campHighlights'],
    subject: 'Get Outside This Summer - Camp Spots Filling Up!',
    bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #1a1a1a; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #2a2a2a; border: 1px solid #333;">
          <tr>
            <td style="padding: 30px; text-align: center; border-bottom: 2px solid #CCFF00;">
              <h1 style="margin: 0; color: #CCFF00; font-size: 28px; font-weight: 900;">EMPOWERED SPORTS CAMP</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #CCFF00; font-size: 24px;">🌍 Get Outside This Summer!</h2>
              <p style="color: #ffffff; font-size: 16px; line-height: 1.6;">Hi {{parentName}},</p>
              <p style="color: #cccccc; font-size: 16px; line-height: 1.6;">
                Camp spots are filling up fast! Give your athlete an unforgettable summer of sports, friends, and growth.
              </p>
              <div style="margin: 30px 0; padding: 20px; background: #1a1a1a; border-left: 3px solid #CCFF00;">
                <p style="margin: 0; color: #CCFF00; font-size: 14px; text-transform: uppercase;">Camp Highlights</p>
                <p style="margin: 10px 0 0; color: #ffffff;">{{campHighlights}}</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{registrationUrl}}" style="display: inline-block; padding: 15px 30px; background: #CCFF00; color: #000; text-decoration: none; font-weight: bold; text-transform: uppercase;">View Available Camps</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; text-align: center; background: #1a1a1a;">
              <p style="margin: 0; color: #666; font-size: 12px;">© {{year}} Empowered Sports Camp</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    emailType: 'season_followup_may',
    name: 'May Follow-up',
    description: 'Final countdown / last chance to register',
    availableVars: ['parentName', 'year', 'registrationUrl', 'spotsRemaining'],
    subject: 'Last Chance! Summer Camp Registration Closes Soon',
    bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #1a1a1a; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #2a2a2a; border: 1px solid #333;">
          <tr>
            <td style="padding: 30px; text-align: center; border-bottom: 2px solid #FF2DCE;">
              <h1 style="margin: 0; color: #FF2DCE; font-size: 28px; font-weight: 900;">EMPOWERED SPORTS CAMP</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #FF2DCE; font-size: 24px;">⚡ Last Chance!</h2>
              <p style="color: #ffffff; font-size: 16px; line-height: 1.6;">Hi {{parentName}},</p>
              <p style="color: #cccccc; font-size: 16px; line-height: 1.6;">
                Summer is almost here and spots are nearly gone! Only <strong style="color: #FF2DCE;">{{spotsRemaining}} spots</strong> remaining.
              </p>
              <div style="margin: 30px 0; padding: 20px; background: #1a1a1a; border-left: 3px solid #FF2DCE;">
                <p style="margin: 0; color: #FF2DCE; font-size: 14px; text-transform: uppercase;">Don't Miss Out!</p>
                <p style="margin: 10px 0 0; color: #ffffff;">Registration closes soon. Secure your spot today!</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{registrationUrl}}" style="display: inline-block; padding: 15px 30px; background: #FF2DCE; color: #fff; text-decoration: none; font-weight: bold; text-transform: uppercase;">Register Now</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; text-align: center; background: #1a1a1a;">
              <p style="margin: 0; color: #666; font-size: 12px;">© {{year}} Empowered Sports Camp</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
]

export async function POST(request: NextRequest) {
  try {
    // In development, allow seeding without auth for initial setup
    const isDev = process.env.NODE_ENV !== 'production'
    let userId: string | null = null

    if (!isDev) {
      const user = await getAuthUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = user.id
    }

    const results = { created: 0, skipped: 0, errors: [] as string[] }

    for (const template of DEFAULT_TEMPLATES) {
      try {
        // Check if template already exists
        const existing = await prisma.emailTemplate.findFirst({
          where: {
            emailType: template.emailType,
            tenantId: null, // Global templates
          },
        })

        if (existing) {
          results.skipped++
          continue
        }

        // Create template
        await prisma.emailTemplate.create({
          data: {
            emailType: template.emailType,
            name: template.name,
            subject: template.subject,
            bodyHtml: template.bodyHtml,
            description: template.description,
            availableVars: template.availableVars,
            tenantId: null, // Global template
            createdBy: userId,
            updatedBy: userId,
          },
        })

        results.created++
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error'
        results.errors.push(`${template.emailType}: ${errMsg}`)
      }
    }

    // Invalidate cache so new templates are used
    if (results.created > 0) {
      invalidateTemplateCache()
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Created ${results.created} templates, skipped ${results.skipped} existing`,
    })
  } catch (error) {
    console.error('[API] Seed email templates error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
