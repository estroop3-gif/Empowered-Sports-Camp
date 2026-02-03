'use client'

import { getRegionsForCountry, getRegionLabelForCountry, countryHasRegions } from '@/lib/constants/locations'
import { cn } from '@/lib/utils'

interface RegionInputProps {
  countryCode: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  error?: boolean
  className?: string
  disabled?: boolean
  name?: string
}

/**
 * Hybrid region input component.
 * Renders a dropdown for countries with pre-defined regions,
 * or a text input for countries without.
 */
export function RegionInput({
  countryCode,
  value,
  onChange,
  required,
  error,
  className,
  disabled,
  name,
}: RegionInputProps) {
  const regionLabel = getRegionLabelForCountry(countryCode)
  const hasRegions = countryHasRegions(countryCode)

  if (hasRegions) {
    const regions = getRegionsForCountry(countryCode)
    return (
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={cn(className)}
      >
        <option value="">Select {regionLabel.toLowerCase()}...</option>
        {regions.map((region) => (
          <option key={region.code} value={region.code}>
            {region.name}
          </option>
        ))}
      </select>
    )
  }

  return (
    <input
      type="text"
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`Enter ${regionLabel.toLowerCase()} (optional)`}
      required={required}
      disabled={disabled}
      className={cn(className)}
    />
  )
}
