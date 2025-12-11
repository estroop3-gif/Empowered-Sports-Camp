'use client'

import { useState } from 'react'
import { Plus, Trash2, AlertCircle, CheckCircle2, User, Heart, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCheckout } from '@/lib/checkout/context'
import { Button } from '@/components/ui/button'
import type { CamperFormData, TShirtSize, CampSession } from '@/types/registration'

/**
 * CamperForm
 *
 * DESIGN NOTES:
 * - Accordion-style cards for each camper
 * - Inline validation with neon success / red error states
 * - Add/remove camper functionality
 * - Parent guardian section at the bottom
 * - Progress indicators for completion
 */

interface CamperFormProps {
  campSession: CampSession | null
  onContinue: () => void
}

const TSHIRT_SIZES: { value: TShirtSize; label: string }[] = [
  { value: 'YXS', label: 'Youth XS' },
  { value: 'YS', label: 'Youth S' },
  { value: 'YM', label: 'Youth M' },
  { value: 'YL', label: 'Youth L' },
  { value: 'AS', label: 'Adult S' },
  { value: 'AM', label: 'Adult M' },
  { value: 'AL', label: 'Adult L' },
  { value: 'AXL', label: 'Adult XL' },
]

const GRADES = [
  'Pre-K',
  'Kindergarten',
  '1st Grade',
  '2nd Grade',
  '3rd Grade',
  '4th Grade',
  '5th Grade',
  '6th Grade',
  '7th Grade',
  '8th Grade',
  '9th Grade',
  '10th Grade',
  '11th Grade',
  '12th Grade',
]

const PRONOUNS = ['she/her', 'he/him', 'they/them', 'other']

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  success?: boolean
}

function FormInput({ label, error, success, className, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
        {label}
        {props.required && <span className="text-magenta ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          {...props}
          className={cn(
            'w-full px-4 py-3 bg-white/5 border text-white placeholder-white/30',
            'focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all',
            error
              ? 'border-red-500 focus:ring-red-500/50'
              : success
              ? 'border-neon focus:ring-neon/50'
              : 'border-white/10 focus:border-neon focus:ring-neon/50',
            className
          )}
        />
        {(error || success) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {error ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-neon" />
            )}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: { value: string; label: string }[]
  error?: string
}

function FormSelect({ label, options, error, className, ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
        {label}
        {props.required && <span className="text-magenta ml-1">*</span>}
      </label>
      <select
        {...props}
        className={cn(
          'w-full px-4 py-3 bg-white/5 border text-white',
          'focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all appearance-none',
          'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23666%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E")]',
          'bg-[length:1.5rem] bg-[right_0.5rem_center] bg-no-repeat',
          error
            ? 'border-red-500 focus:ring-red-500/50'
            : 'border-white/10 focus:border-neon focus:ring-neon/50',
          className
        )}
      >
        <option value="" className="bg-black">
          Select...
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-black">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
}

function FormTextArea({ label, className, ...props }: TextAreaProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
        {label}
      </label>
      <textarea
        {...props}
        className={cn(
          'w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/30',
          'focus:outline-none focus:ring-2 focus:ring-neon/50 focus:border-neon transition-all',
          'min-h-[80px] resize-none',
          className
        )}
      />
    </div>
  )
}

interface CamperCardProps {
  camper: CamperFormData
  index: number
  total: number
  campSession: CampSession | null
  onUpdate: (data: Partial<CamperFormData>) => void
  onRemove: () => void
}

function CamperCard({ camper, index, total, campSession, onUpdate, onRemove }: CamperCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const getAgeError = (): string | null => {
    if (!camper.age || !campSession) return null
    if (camper.age < campSession.minAge) {
      return `Must be at least ${campSession.minAge} years old for this camp`
    }
    if (camper.age > campSession.maxAge) {
      return `Must be ${campSession.maxAge} or younger for this camp`
    }
    return null
  }

  const ageError = getAgeError()
  const isComplete =
    camper.firstName &&
    camper.lastName &&
    camper.dateOfBirth &&
    camper.isEligible

  return (
    <div className="border border-white/10 bg-white/[0.02] overflow-hidden">
      {/* Card Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'h-10 w-10 flex items-center justify-center font-bold',
              isComplete
                ? 'bg-neon text-black'
                : 'bg-white/10 text-white/60'
            )}
          >
            {isComplete ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              {camper.firstName || `Camper ${index + 1}`}
              {camper.lastName && ` ${camper.lastName}`}
            </h3>
            {camper.age && (
              <p className="text-xs text-white/50">
                {camper.age} years old
                {camper.isEligible && (
                  <span className="text-neon ml-2">Eligible</span>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {total > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              className="p-2 text-white/40 hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </button>

      {/* Card Body */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="First Name"
              required
              value={camper.firstName}
              onChange={(e) => onUpdate({ firstName: e.target.value })}
              placeholder="First name"
              success={!!camper.firstName}
            />
            <FormInput
              label="Last Name"
              required
              value={camper.lastName}
              onChange={(e) => onUpdate({ lastName: e.target.value })}
              placeholder="Last name"
              success={!!camper.lastName}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormInput
              label="Date of Birth"
              type="date"
              required
              value={camper.dateOfBirth}
              onChange={(e) => onUpdate({ dateOfBirth: e.target.value })}
              error={ageError || undefined}
              success={!!camper.dateOfBirth && !ageError}
            />
            <FormSelect
              label="Grade (Fall 2025)"
              required
              value={camper.grade}
              onChange={(e) => onUpdate({ grade: e.target.value })}
              options={GRADES.map((g) => ({ value: g, label: g }))}
            />
            <FormSelect
              label="Pronouns"
              value={camper.pronouns}
              onChange={(e) => onUpdate({ pronouns: e.target.value })}
              options={PRONOUNS.map((p) => ({ value: p, label: p }))}
            />
          </div>

          <FormSelect
            label="T-Shirt Size"
            required
            value={camper.tshirtSize}
            onChange={(e) => onUpdate({ tshirtSize: e.target.value as TShirtSize })}
            options={TSHIRT_SIZES}
          />

          {/* Medical Info */}
          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-4 w-4 text-magenta" />
              <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
                Health Information
              </h4>
            </div>
            <div className="space-y-4">
              <FormTextArea
                label="Allergies"
                value={camper.allergies}
                onChange={(e) => onUpdate({ allergies: e.target.value })}
                placeholder="List any food or environmental allergies..."
              />
              <FormTextArea
                label="Medical Notes"
                value={camper.medicalNotes}
                onChange={(e) => onUpdate({ medicalNotes: e.target.value })}
                placeholder="Medications, conditions, or anything coaches should know..."
              />
              <FormTextArea
                label="Special Considerations"
                value={camper.specialConsiderations}
                onChange={(e) => onUpdate({ specialConsiderations: e.target.value })}
                placeholder="Learning differences, behavioral notes, or accommodations..."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function CamperForm({ campSession, onContinue }: CamperFormProps) {
  const { state, addCamper, removeCamper, updateCamper, updateParent, canProceed } = useCheckout()

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
          Camper Information
        </h1>
        <p className="mt-2 text-white/60">
          Tell us about your future champion{state.campers.length > 1 ? 's' : ''}.
        </p>
      </div>

      {/* Camper Cards */}
      <div className="space-y-4">
        {state.campers.map((camper, index) => (
          <CamperCard
            key={camper.id}
            camper={camper}
            index={index}
            total={state.campers.length}
            campSession={campSession}
            onUpdate={(data) => updateCamper(camper.id, data)}
            onRemove={() => removeCamper(camper.id)}
          />
        ))}
      </div>

      {/* Add Camper Button */}
      {campSession && state.campers.length < campSession.spotsRemaining && (
        <button
          onClick={addCamper}
          className="w-full flex items-center justify-center gap-2 p-4 border border-dashed border-white/20 text-white/60 hover:border-neon hover:text-neon transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span className="font-semibold uppercase tracking-wider">Add Another Camper</span>
          {campSession.siblingDiscountPercent > 0 && (
            <span className="text-xs text-magenta">
              ({campSession.siblingDiscountPercent}% sibling discount!)
            </span>
          )}
        </button>
      )}

      {/* Parent/Guardian Section */}
      <div className="pt-8 border-t border-white/10">
        <div className="flex items-center gap-2 mb-6">
          <User className="h-5 w-5 text-neon" />
          <h2 className="text-xl font-bold uppercase tracking-wider text-white">
            Parent / Guardian
          </h2>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="First Name"
              required
              value={state.parentInfo.firstName}
              onChange={(e) => updateParent({ firstName: e.target.value })}
              placeholder="Your first name"
              success={!!state.parentInfo.firstName}
            />
            <FormInput
              label="Last Name"
              required
              value={state.parentInfo.lastName}
              onChange={(e) => updateParent({ lastName: e.target.value })}
              placeholder="Your last name"
              success={!!state.parentInfo.lastName}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="Email"
              type="email"
              required
              value={state.parentInfo.email}
              onChange={(e) => updateParent({ email: e.target.value })}
              placeholder="your@email.com"
              success={!!state.parentInfo.email}
            />
            <FormInput
              label="Phone"
              type="tel"
              required
              value={state.parentInfo.phone}
              onChange={(e) => updateParent({ phone: e.target.value })}
              placeholder="(555) 123-4567"
              success={!!state.parentInfo.phone}
            />
          </div>

          {/* Emergency Contact */}
          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="h-4 w-4 text-magenta" />
              <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
                Emergency Contact
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormInput
                label="Name"
                required
                value={state.parentInfo.emergencyContactName}
                onChange={(e) => updateParent({ emergencyContactName: e.target.value })}
                placeholder="Contact name"
              />
              <FormInput
                label="Phone"
                type="tel"
                required
                value={state.parentInfo.emergencyContactPhone}
                onChange={(e) => updateParent({ emergencyContactPhone: e.target.value })}
                placeholder="(555) 123-4567"
              />
              <FormInput
                label="Relationship"
                required
                value={state.parentInfo.emergencyContactRelationship}
                onChange={(e) => updateParent({ emergencyContactRelationship: e.target.value })}
                placeholder="e.g., Grandmother"
              />
            </div>
          </div>

          {/* Address */}
          <div className="pt-4 border-t border-white/10">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Billing Address
            </h4>
            <div className="space-y-4">
              <FormInput
                label="Address Line 1"
                required
                value={state.parentInfo.addressLine1}
                onChange={(e) => updateParent({ addressLine1: e.target.value })}
                placeholder="Street address"
              />
              <FormInput
                label="Address Line 2"
                value={state.parentInfo.addressLine2}
                onChange={(e) => updateParent({ addressLine2: e.target.value })}
                placeholder="Apt, suite, unit (optional)"
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <FormInput
                  label="City"
                  required
                  value={state.parentInfo.city}
                  onChange={(e) => updateParent({ city: e.target.value })}
                  placeholder="City"
                  className="col-span-2"
                />
                <FormInput
                  label="State"
                  required
                  value={state.parentInfo.state}
                  onChange={(e) => updateParent({ state: e.target.value })}
                  placeholder="IL"
                />
                <FormInput
                  label="ZIP"
                  required
                  value={state.parentInfo.zipCode}
                  onChange={(e) => updateParent({ zipCode: e.target.value })}
                  placeholder="60601"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <div className="pt-6">
        <Button
          variant="neon"
          size="lg"
          className="w-full"
          onClick={onContinue}
          disabled={!canProceed()}
        >
          Continue to Add-Ons
        </Button>
        {!canProceed() && (
          <p className="text-xs text-white/40 text-center mt-2">
            Please complete all required fields marked with *
          </p>
        )}
      </div>
    </div>
  )
}
