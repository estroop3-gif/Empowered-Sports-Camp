'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, AlertCircle, CheckCircle2, User, Heart, Phone, UserPlus, Users, Pencil, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCheckout, type ExistingAthlete, type ParentProfile } from '@/lib/checkout/context'
import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/button'
import type { CamperFormData, CampSession } from '@/types/registration'

/**
 * CamperForm
 *
 * DESIGN NOTES:
 * - Athlete selector: choose existing athlete or add new
 * - Accordion-style cards for each camper
 * - Inline validation with neon success / red error states
 * - Add/remove camper functionality
 * - Parent guardian section auto-filled from profile
 * - Progress indicators for completion
 */

interface CamperFormProps {
  campSession: CampSession | null
  onContinue: () => void
  onBack?: () => void
}

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

// Athlete Selector Component
interface AthleteSelectorProps {
  existingAthletes: ExistingAthlete[]
  selectedAthleteId: string | null
  isNewAthlete: boolean
  usedAthleteIds: string[]
  onSelectExisting: (athlete: ExistingAthlete) => void
  onSelectNew: () => void
}

function AthleteSelector({
  existingAthletes,
  selectedAthleteId,
  isNewAthlete,
  usedAthleteIds,
  onSelectExisting,
  onSelectNew,
}: AthleteSelectorProps) {
  // Filter out athletes that are already selected for other campers
  const availableAthletes = existingAthletes.filter(
    (a) => !usedAthleteIds.includes(a.id) || a.id === selectedAthleteId
  )

  if (existingAthletes.length === 0) {
    return null // No athletes to choose from, just show new athlete form
  }

  return (
    <div className="mb-6">
      <label className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-3 block">
        Select Athlete
      </label>
      <div className="grid grid-cols-1 gap-3">
        {/* Existing Athletes */}
        {availableAthletes.map((athlete) => (
          <button
            key={athlete.id}
            type="button"
            onClick={() => onSelectExisting(athlete)}
            className={cn(
              'flex items-center gap-3 p-4 border transition-all text-left',
              selectedAthleteId === athlete.id && !isNewAthlete
                ? 'border-neon bg-neon/10'
                : 'border-white/10 hover:border-white/30 bg-white/[0.02]'
            )}
          >
            <div
              className={cn(
                'h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm',
                selectedAthleteId === athlete.id && !isNewAthlete
                  ? 'bg-neon text-black'
                  : 'bg-white/10 text-white/60'
              )}
            >
              {athlete.first_name.charAt(0)}
              {athlete.last_name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">
                  {athlete.first_name} {athlete.last_name}
                </span>
                {selectedAthleteId === athlete.id && !isNewAthlete && (
                  <CheckCircle2 className="h-4 w-4 text-neon" />
                )}
              </div>
              <p className="text-xs text-white/50">
                {athlete.grade || 'Grade not set'} • Born {athlete.date_of_birth}
              </p>
            </div>
            <Users className="h-5 w-5 text-white/30" />
          </button>
        ))}

        {/* Add New Athlete Option */}
        <button
          type="button"
          onClick={onSelectNew}
          className={cn(
            'flex items-center gap-3 p-4 border transition-all text-left',
            isNewAthlete
              ? 'border-neon bg-neon/10'
              : 'border-dashed border-white/20 hover:border-neon hover:bg-white/[0.02]'
          )}
        >
          <div
            className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center',
              isNewAthlete ? 'bg-neon text-black' : 'bg-white/10 text-white/60'
            )}
          >
            <UserPlus className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">Add New Athlete</span>
              {isNewAthlete && <CheckCircle2 className="h-4 w-4 text-neon" />}
            </div>
            <p className="text-xs text-white/50">Register a new athlete for this camp</p>
          </div>
        </button>
      </div>
    </div>
  )
}

interface CamperCardProps {
  camper: CamperFormData
  index: number
  total: number
  campSession: CampSession | null
  existingAthletes: ExistingAthlete[]
  usedAthleteIds: string[]
  onUpdate: (data: Partial<CamperFormData>) => void
  onSelectExisting: (athlete: ExistingAthlete) => void
  onSelectNew: () => void
  onRemove: () => void
}

function CamperCard({
  camper,
  index,
  total,
  campSession,
  existingAthletes,
  usedAthleteIds,
  onUpdate,
  onSelectExisting,
  onSelectNew,
  onRemove,
}: CamperCardProps) {
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
      <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 flex-1 text-left"
        >
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
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              {camper.firstName || `Camper ${index + 1}`}
              {camper.lastName && ` ${camper.lastName}`}
            </h3>
            <p className="text-xs text-white/50">
              {camper.existingAthleteId ? (
                <span className="text-purple">Existing Athlete</span>
              ) : camper.isNewAthlete && camper.firstName ? (
                <span className="text-magenta">New Athlete</span>
              ) : null}
              {camper.age && (
                <>
                  {(camper.existingAthleteId || (camper.isNewAthlete && camper.firstName)) && ' • '}
                  {camper.age} years old
                </>
              )}
              {camper.isEligible && (
                <span className="text-neon ml-2">Eligible</span>
              )}
            </p>
          </div>
        </button>
        {total > 1 && (
          <button
            onClick={onRemove}
            className="p-2 text-white/40 hover:text-red-500 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Card Body */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-6">
          {/* Athlete Selector */}
          <AthleteSelector
            existingAthletes={existingAthletes}
            selectedAthleteId={camper.existingAthleteId}
            isNewAthlete={camper.isNewAthlete}
            usedAthleteIds={usedAthleteIds}
            onSelectExisting={onSelectExisting}
            onSelectNew={onSelectNew}
          />

          {/* Basic Info - Show if new athlete or if editing existing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="First Name"
              required
              value={camper.firstName}
              onChange={(e) => onUpdate({ firstName: e.target.value })}
              placeholder="First name"
              success={!!camper.firstName}
              disabled={!camper.isNewAthlete && !!camper.existingAthleteId}
            />
            <FormInput
              label="Last Name"
              required
              value={camper.lastName}
              onChange={(e) => onUpdate({ lastName: e.target.value })}
              placeholder="Last name"
              success={!!camper.lastName}
              disabled={!camper.isNewAthlete && !!camper.existingAthleteId}
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
              disabled={!camper.isNewAthlete && !!camper.existingAthleteId}
            />
            <FormSelect
              label="Grade (Fall 2025)"
              required
              value={camper.grade}
              onChange={(e) => onUpdate({ grade: e.target.value })}
              options={GRADES.map((g) => ({ value: g, label: g }))}
            />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Sex
              </label>
              <div className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white/60 cursor-not-allowed">
                Female (Females-Only)
              </div>
            </div>
          </div>

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

export function CamperForm({ campSession, onContinue, onBack }: CamperFormProps) {
  const { user } = useAuth()
  const {
    state,
    addCamper,
    removeCamper,
    updateCamper,
    selectExistingAthlete,
    setNewAthleteMode,
    updateParent,
    setParentFromProfile,
    canProceed,
  } = useCheckout()

  const [existingAthletes, setExistingAthletes] = useState<ExistingAthlete[]>([])
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [isEditingParent, setIsEditingParent] = useState(false)
  // Track if emergency contact has been explicitly saved (not just filled)
  const [emergencyContactSaved, setEmergencyContactSaved] = useState(false)

  // Fetch user profile and athletes on mount
  useEffect(() => {
    async function loadProfileWithAthletes() {
      if (!user?.id) {
        setIsLoadingProfile(false)
        return
      }

      try {
        const response = await fetch('/api/profiles?action=withAthletes')
        if (response.ok) {
          const { data } = await response.json()
          if (data) {
            // Set existing athletes
            if (data.athletes && data.athletes.length > 0) {
              setExistingAthletes(data.athletes)
            }

            // Auto-fill parent info from profile (only once)
            if (!profileLoaded) {
              const profile: ParentProfile = {
                first_name: data.first_name,
                last_name: data.last_name,
                email: data.email,
                phone: data.phone,
                address_line_1: data.address_line_1,
                address_line_2: data.address_line_2,
                city: data.city,
                state: data.state,
                zip_code: data.zip_code,
                emergency_contact_name: data.emergency_contact_name,
                emergency_contact_phone: data.emergency_contact_phone,
                emergency_contact_relationship: data.emergency_contact_relationship,
              }
              setParentFromProfile(profile)
              setProfileLoaded(true)
              // If emergency contact is already filled from profile, mark as saved
              if (data.emergency_contact_name && data.emergency_contact_phone && data.emergency_contact_relationship) {
                setEmergencyContactSaved(true)
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to load profile:', error)
      } finally {
        setIsLoadingProfile(false)
      }
    }

    loadProfileWithAthletes()
  }, [user?.id, profileLoaded, setParentFromProfile])

  // Track which athletes are already selected
  const usedAthleteIds = state.campers
    .filter((c) => c.existingAthleteId)
    .map((c) => c.existingAthleteId as string)

  // Check if parent info is filled
  const hasParentInfo =
    state.parentInfo.firstName &&
    state.parentInfo.lastName &&
    state.parentInfo.email &&
    state.parentInfo.phone

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-neon animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
          Camper Information
        </h1>
        <p className="mt-2 text-white/60">
          {existingAthletes.length > 0
            ? 'Select an existing athlete or add a new one for this camp.'
            : 'Tell us about your future champion' + (state.campers.length > 1 ? 's' : '') + '.'}
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
            existingAthletes={existingAthletes}
            usedAthleteIds={usedAthleteIds}
            onUpdate={(data) => updateCamper(camper.id, data)}
            onSelectExisting={(athlete) => selectExistingAthlete(camper.id, athlete)}
            onSelectNew={() => setNewAthleteMode(camper.id)}
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-neon" />
            <h2 className="text-xl font-bold uppercase tracking-wider text-white">
              Parent / Guardian
            </h2>
          </div>
          {hasParentInfo && !isEditingParent && (
            <button
              onClick={() => setIsEditingParent(true)}
              className="flex items-center gap-1 text-sm text-white/60 hover:text-neon transition-colors"
            >
              <Pencil className="h-4 w-4" />
              <span>Edit</span>
            </button>
          )}
        </div>

        {/* Show auto-filled info in read-only mode, with forms for missing fields */}
        {hasParentInfo && !isEditingParent ? (
          <div className="space-y-6">
            {/* Read-only auto-filled info */}
            <div className="bg-white/5 border border-white/10 p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Name</p>
                  <p className="text-white font-medium">
                    {state.parentInfo.firstName} {state.parentInfo.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Email</p>
                  <p className="text-white font-medium">{state.parentInfo.email}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Phone</p>
                  <p className="text-white font-medium">{state.parentInfo.phone}</p>
                </div>
                {/* Show address if already filled */}
                {state.parentInfo.addressLine1 && state.parentInfo.city && state.parentInfo.state && state.parentInfo.zipCode && (
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Billing Address</p>
                    <p className="text-white font-medium">
                      {state.parentInfo.addressLine1}
                      {state.parentInfo.addressLine2 && `, ${state.parentInfo.addressLine2}`}
                      <br />
                      {state.parentInfo.city}, {state.parentInfo.state} {state.parentInfo.zipCode}
                    </p>
                  </div>
                )}
              </div>
              {/* Show emergency contact if saved */}
              {emergencyContactSaved && state.parentInfo.emergencyContactName && state.parentInfo.emergencyContactPhone && (
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-white/50 uppercase tracking-wider">Emergency Contact</p>
                    <button
                      onClick={() => setEmergencyContactSaved(false)}
                      className="flex items-center gap-1 text-xs text-white/60 hover:text-neon transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                  <p className="text-white font-medium">
                    {state.parentInfo.emergencyContactName} ({state.parentInfo.emergencyContactRelationship})
                    <br />
                    <span className="text-white/60">{state.parentInfo.emergencyContactPhone}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Emergency Contact - show form if not saved yet */}
            {!emergencyContactSaved && (
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <Phone className="h-4 w-4 text-magenta" />
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
                    Emergency Contact
                  </h4>
                  <span className="text-xs text-magenta">(Required)</span>
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
                {/* Save button - only show if all fields are filled */}
                {state.parentInfo.emergencyContactName && state.parentInfo.emergencyContactPhone && state.parentInfo.emergencyContactRelationship && (
                  <div className="mt-4">
                    <Button
                      variant="outline-white"
                      size="sm"
                      onClick={() => setEmergencyContactSaved(true)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Save Emergency Contact
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Billing Address - show form if not filled */}
            {(!state.parentInfo.addressLine1 || !state.parentInfo.city || !state.parentInfo.state || !state.parentInfo.zipCode) && (
              <div className="pt-4 border-t border-white/10">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-1">
                  Billing Address
                </h4>
                <p className="text-xs text-magenta mb-4">(Required)</p>
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
            )}
          </div>
        ) : (
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

            {isEditingParent && (
              <div className="pt-4">
                <Button
                  variant="outline-white"
                  onClick={() => setIsEditingParent(false)}
                  className="w-full"
                >
                  Done Editing
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="pt-6 space-y-4">
        <div className="flex gap-4">
          {onBack && (
            <Button
              variant="outline-neon"
              size="lg"
              className="flex-1"
              onClick={onBack}
            >
              Back
            </Button>
          )}
          <Button
            variant="neon"
            size="lg"
            className={onBack ? "flex-1" : "w-full"}
            onClick={onContinue}
            disabled={!canProceed()}
          >
            Continue to Her Squad
          </Button>
        </div>
        {!canProceed() && (
          <p className="text-xs text-white/40 text-center">
            Please complete all required fields marked with *
          </p>
        )}
      </div>
    </div>
  )
}
