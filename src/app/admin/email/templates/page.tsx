'use client'

/**
 * Email Templates Admin Page
 *
 * Admin view for managing email templates with inline editing.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  Mail,
  FileText,
  History,
  Edit2,
  Save,
  X,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  Code,
  AlertCircle,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const SECTION_TABS = [
  { value: 'logs', label: 'Email Logs', href: '/admin/email', icon: History },
  { value: 'templates', label: 'Templates', href: '/admin/email/templates', icon: FileText },
]

interface EmailTemplate {
  emailType: string
  name: string
  description: string
  availableVars: string[]
  defaultSubject: string
  id: string | null
  subject: string
  bodyHtml: string | null
  bodyText: string | null
  isActive: boolean
  tenantId: string | null
  tenantName: string | null
  isCustomized: boolean
  updatedAt: string | null
}

const EMAIL_TYPE_CATEGORIES = {
  'Registration & Reminders': ['registration_confirmation', 'camp_two_weeks_out', 'camp_two_days_before'],
  'Camp Recaps': ['camp_daily_recap', 'camp_session_recap'],
  'Seasonal Campaigns': ['season_followup_jan', 'season_followup_feb', 'season_followup_mar', 'season_followup_apr', 'season_followup_may'],
}

export default function EmailTemplatesPage() {
  const { user } = useAuth()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    subject: string
    bodyHtml: string
  }>({ subject: '', bodyHtml: '' })
  const [saving, setSaving] = useState(false)
  const [previewMode, setPreviewMode] = useState<'html' | 'code'>('html')

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  const loadTemplates = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/email-templates')
      const result = await res.json()

      if (!res.ok || result.error) {
        setError(result.error || `HTTP ${res.status}`)
        console.error('Error loading templates:', result.error)
      } else {
        setTemplates(result.data || [])
      }
    } catch (err) {
      console.error('Error loading templates:', err)
      setError('Failed to load templates')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const startEditing = (template: EmailTemplate) => {
    setEditingTemplate(template.emailType)
    setEditForm({
      subject: template.subject || template.defaultSubject,
      bodyHtml: template.bodyHtml || getDefaultHtmlTemplate(template),
    })
    setExpandedTemplate(template.emailType)
  }

  const cancelEditing = () => {
    setEditingTemplate(null)
    setEditForm({ subject: '', bodyHtml: '' })
  }

  const saveTemplate = async (template: EmailTemplate) => {
    setSaving(true)
    try {
      if (template.id) {
        // Update existing
        const res = await fetch(`/api/admin/email-templates/${template.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: editForm.subject,
            bodyHtml: editForm.bodyHtml,
          }),
        })
        const { error } = await res.json()
        if (error) throw new Error(error)
      } else {
        // Create new
        const res = await fetch('/api/admin/email-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailType: template.emailType,
            name: template.name,
            subject: editForm.subject,
            bodyHtml: editForm.bodyHtml,
            description: template.description,
            availableVars: template.availableVars,
          }),
        })
        const { error } = await res.json()
        if (error) throw new Error(error)
      }

      await loadTemplates()
      setEditingTemplate(null)
      setEditForm({ subject: '', bodyHtml: '' })
    } catch (err) {
      console.error('Error saving template:', err)
      alert('Failed to save template')
    }
    setSaving(false)
  }

  const getDefaultHtmlTemplate = (template: EmailTemplate): string => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #1a1a1a; font-family: 'Poppins', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #2a2a2a; border: 1px solid #333;">
          <!-- Header -->
          <tr>
            <td style="padding: 30px; text-align: center; border-bottom: 2px solid #CCFF00;">
              <h1 style="margin: 0; color: #CCFF00; font-size: 28px; font-weight: 900; text-transform: uppercase;">
                Empowered Sports Camp
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 700;">
                ${template.name}
              </h2>
              <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
                Hello {{parentName}},
              </p>
              <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
                <!-- Add your content here -->
                This is the ${template.name.toLowerCase()} email template.
              </p>

              <!-- Available Variables -->
              <div style="margin-top: 30px; padding: 20px; background: #1a1a1a; border-left: 3px solid #FF2DCE;">
                <p style="margin: 0; color: #FF2DCE; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                  Available Variables:
                </p>
                <p style="margin: 10px 0 0; color: #888; font-size: 14px;">
                  ${template.availableVars.map(v => `{{${v}}}`).join(', ')}
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; text-align: center; background: #1a1a1a; border-top: 1px solid #333;">
              <p style="margin: 0; color: #666; font-size: 12px;">
                &copy; ${new Date().getFullYear()} Empowered Sports Camp. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  }

  const formatEmailType = (type: string): string => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  const getCategoryForType = (type: string): string => {
    for (const [category, types] of Object.entries(EMAIL_TYPE_CATEGORIES)) {
      if (types.includes(type)) return category
    }
    return 'Other'
  }

  const groupedTemplates = templates.reduce((acc, template) => {
    const category = getCategoryForType(template.emailType)
    if (!acc[category]) acc[category] = []
    acc[category].push(template)
    return acc
  }, {} as Record<string, EmailTemplate[]>)

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <PageHeader
        title="Automated Email"
        description="Monitor sent emails and manage email templates"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Automated Email', href: '/admin/email' },
          { label: 'Templates' },
        ]}
      />

      {/* Section Tabs */}
      <div className="flex gap-1 mb-6 bg-dark-100 border border-white/10 p-1 w-fit">
        {SECTION_TABS.map(tab => {
          const Icon = tab.icon
          const isActive = tab.value === 'templates'
          return (
            <Link
              key={tab.value}
              href={tab.href}
              className={cn(
                'flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors',
                isActive
                  ? 'bg-purple text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple" />
        </div>
      ) : error ? (
        <ContentCard>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <p className="text-lg font-bold text-white">Error Loading Templates</p>
            <p className="text-sm text-white/60 mt-2">{error}</p>
            <button
              onClick={loadTemplates}
              className="mt-4 px-4 py-2 bg-purple hover:bg-purple/80 text-white text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        </ContentCard>
      ) : templates.length === 0 ? (
        <ContentCard>
          <div className="text-center py-12">
            <Mail className="h-12 w-12 text-white/20 mx-auto mb-3" />
            <p className="text-lg font-bold text-white/60">No Templates Found</p>
            <p className="text-sm text-white/40 mt-1">
              Templates will appear here once configured.
            </p>
          </div>
        </ContentCard>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
            <div key={category}>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Mail className="h-5 w-5 text-neon" />
                {category}
              </h2>

              <div className="space-y-4">
                {categoryTemplates.map(template => (
                  <ContentCard key={template.emailType}>
                    {/* Template Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-white">{template.name}</h3>
                          {template.isCustomized && (
                            <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-neon/10 text-neon border border-neon/30">
                              Customized
                            </span>
                          )}
                          {!template.isActive && (
                            <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/30">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white/60 mb-3">{template.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {template.availableVars.slice(0, 5).map(v => (
                            <code key={v} className="px-2 py-0.5 text-xs bg-purple/10 text-purple border border-purple/30">
                              {`{{${v}}}`}
                            </code>
                          ))}
                          {template.availableVars.length > 5 && (
                            <span className="text-xs text-white/40">+{template.availableVars.length - 5} more</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {editingTemplate !== template.emailType && (
                          <button
                            onClick={() => startEditing(template)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple hover:bg-purple/80 text-white text-sm font-medium transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => setExpandedTemplate(expandedTemplate === template.emailType ? null : template.emailType)}
                          className="p-2 text-white/40 hover:text-white transition-colors"
                        >
                          {expandedTemplate === template.emailType ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {expandedTemplate === template.emailType && (
                      <div className="mt-6 pt-6 border-t border-white/10">
                        {editingTemplate === template.emailType ? (
                          /* Edit Mode */
                          <div className="space-y-6">
                            {/* Subject */}
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                                Subject Line
                              </label>
                              <Input
                                value={editForm.subject}
                                onChange={(e) => setEditForm(prev => ({ ...prev, subject: e.target.value }))}
                                placeholder="Email subject..."
                                className="font-medium"
                              />
                              <p className="mt-1 text-xs text-white/40">
                                Use {`{{variableName}}`} to insert dynamic content
                              </p>
                            </div>

                            {/* Body HTML */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-white/40">
                                  Email Body (HTML)
                                </label>
                                <div className="flex gap-1 bg-dark-100 p-0.5">
                                  <button
                                    onClick={() => setPreviewMode('code')}
                                    className={cn(
                                      'px-3 py-1 text-xs font-medium transition-colors',
                                      previewMode === 'code' ? 'bg-purple text-white' : 'text-white/40 hover:text-white'
                                    )}
                                  >
                                    <Code className="h-3 w-3 inline mr-1" />
                                    Code
                                  </button>
                                  <button
                                    onClick={() => setPreviewMode('html')}
                                    className={cn(
                                      'px-3 py-1 text-xs font-medium transition-colors',
                                      previewMode === 'html' ? 'bg-purple text-white' : 'text-white/40 hover:text-white'
                                    )}
                                  >
                                    <Eye className="h-3 w-3 inline mr-1" />
                                    Preview
                                  </button>
                                </div>
                              </div>

                              {previewMode === 'code' ? (
                                <textarea
                                  value={editForm.bodyHtml}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, bodyHtml: e.target.value }))}
                                  placeholder="<!DOCTYPE html>..."
                                  rows={20}
                                  className="w-full bg-dark-100 border border-white/10 p-4 text-sm text-white font-mono focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon/30"
                                />
                              ) : (
                                <div className="border border-white/10 bg-white p-4 rounded">
                                  <iframe
                                    srcDoc={editForm.bodyHtml}
                                    className="w-full h-[500px] border-0"
                                    title="Email Preview"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                              <button
                                onClick={() => saveTemplate(template)}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-3 bg-neon hover:bg-neon/90 text-black font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                              >
                                {saving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4" />
                                )}
                                Save Template
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="flex items-center gap-2 px-6 py-3 bg-dark-100 hover:bg-white/10 text-white/60 hover:text-white font-medium transition-colors"
                              >
                                <X className="h-4 w-4" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Preview Mode */
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                                Subject Line
                              </label>
                              <p className="text-white font-medium">{template.subject || template.defaultSubject}</p>
                            </div>

                            {template.bodyHtml ? (
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                                  Email Preview
                                </label>
                                <div className="border border-white/10 bg-white p-4 rounded">
                                  <iframe
                                    srcDoc={template.bodyHtml}
                                    className="w-full h-[400px] border-0"
                                    title="Email Preview"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 p-4 bg-purple/10 border border-purple/30">
                                <AlertCircle className="h-5 w-5 text-purple" />
                                <p className="text-sm text-white/80">
                                  Using default template. Click "Edit" to customize this email.
                                </p>
                              </div>
                            )}

                            {template.updatedAt && (
                              <p className="text-xs text-white/40">
                                Last updated: {new Date(template.updatedAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </ContentCard>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
