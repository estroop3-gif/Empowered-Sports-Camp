// Centralized location constants for international country support

export interface Country {
  code: string
  name: string
  regionLabel: string // What to call the region (State, Province, etc.)
  hasRegions: boolean // Whether pre-defined regions exist for dropdown selection
}

export interface Region {
  code: string
  name: string
}

// Supported countries (sorted alphabetically by name)
export const COUNTRIES: Country[] = [
  { code: 'AR', name: 'Argentina', regionLabel: 'Province', hasRegions: false },
  { code: 'AU', name: 'Australia', regionLabel: 'State/Territory', hasRegions: true },
  { code: 'AT', name: 'Austria', regionLabel: 'State', hasRegions: false },
  { code: 'BE', name: 'Belgium', regionLabel: 'Region', hasRegions: false },
  { code: 'BR', name: 'Brazil', regionLabel: 'State', hasRegions: false },
  { code: 'CA', name: 'Canada', regionLabel: 'Province', hasRegions: true },
  { code: 'CL', name: 'Chile', regionLabel: 'Region', hasRegions: false },
  { code: 'CN', name: 'China', regionLabel: 'Province', hasRegions: false },
  { code: 'CO', name: 'Colombia', regionLabel: 'Department', hasRegions: false },
  { code: 'CR', name: 'Costa Rica', regionLabel: 'Province', hasRegions: true },
  { code: 'CZ', name: 'Czech Republic', regionLabel: 'Region', hasRegions: false },
  { code: 'DK', name: 'Denmark', regionLabel: 'Region', hasRegions: false },
  { code: 'DO', name: 'Dominican Republic', regionLabel: 'Province', hasRegions: false },
  { code: 'EC', name: 'Ecuador', regionLabel: 'Province', hasRegions: false },
  { code: 'EG', name: 'Egypt', regionLabel: 'Governorate', hasRegions: false },
  { code: 'FI', name: 'Finland', regionLabel: 'Region', hasRegions: false },
  { code: 'FR', name: 'France', regionLabel: 'Region', hasRegions: false },
  { code: 'DE', name: 'Germany', regionLabel: 'State', hasRegions: false },
  { code: 'GH', name: 'Ghana', regionLabel: 'Region', hasRegions: false },
  { code: 'GR', name: 'Greece', regionLabel: 'Region', hasRegions: false },
  { code: 'GT', name: 'Guatemala', regionLabel: 'Department', hasRegions: false },
  { code: 'HN', name: 'Honduras', regionLabel: 'Department', hasRegions: false },
  { code: 'HK', name: 'Hong Kong', regionLabel: 'District', hasRegions: false },
  { code: 'HU', name: 'Hungary', regionLabel: 'County', hasRegions: false },
  { code: 'IN', name: 'India', regionLabel: 'State', hasRegions: false },
  { code: 'ID', name: 'Indonesia', regionLabel: 'Province', hasRegions: false },
  { code: 'IE', name: 'Ireland', regionLabel: 'County', hasRegions: false },
  { code: 'IL', name: 'Israel', regionLabel: 'District', hasRegions: false },
  { code: 'IT', name: 'Italy', regionLabel: 'Region', hasRegions: false },
  { code: 'JM', name: 'Jamaica', regionLabel: 'Parish', hasRegions: false },
  { code: 'JP', name: 'Japan', regionLabel: 'Prefecture', hasRegions: false },
  { code: 'KE', name: 'Kenya', regionLabel: 'County', hasRegions: false },
  { code: 'MY', name: 'Malaysia', regionLabel: 'State', hasRegions: false },
  { code: 'MX', name: 'Mexico', regionLabel: 'State', hasRegions: true },
  { code: 'MA', name: 'Morocco', regionLabel: 'Region', hasRegions: false },
  { code: 'NL', name: 'Netherlands', regionLabel: 'Province', hasRegions: false },
  { code: 'NZ', name: 'New Zealand', regionLabel: 'Region', hasRegions: false },
  { code: 'NG', name: 'Nigeria', regionLabel: 'State', hasRegions: false },
  { code: 'NO', name: 'Norway', regionLabel: 'County', hasRegions: false },
  { code: 'PA', name: 'Panama', regionLabel: 'Province', hasRegions: false },
  { code: 'PE', name: 'Peru', regionLabel: 'Region', hasRegions: false },
  { code: 'PH', name: 'Philippines', regionLabel: 'Region', hasRegions: false },
  { code: 'PL', name: 'Poland', regionLabel: 'Voivodeship', hasRegions: false },
  { code: 'PT', name: 'Portugal', regionLabel: 'District', hasRegions: false },
  { code: 'PR', name: 'Puerto Rico', regionLabel: 'Municipality', hasRegions: false },
  { code: 'RO', name: 'Romania', regionLabel: 'County', hasRegions: false },
  { code: 'SA', name: 'Saudi Arabia', regionLabel: 'Region', hasRegions: false },
  { code: 'SG', name: 'Singapore', regionLabel: 'Region', hasRegions: false },
  { code: 'ZA', name: 'South Africa', regionLabel: 'Province', hasRegions: false },
  { code: 'KR', name: 'South Korea', regionLabel: 'Province', hasRegions: false },
  { code: 'ES', name: 'Spain', regionLabel: 'Community', hasRegions: false },
  { code: 'SE', name: 'Sweden', regionLabel: 'County', hasRegions: false },
  { code: 'CH', name: 'Switzerland', regionLabel: 'Canton', hasRegions: false },
  { code: 'TW', name: 'Taiwan', regionLabel: 'County/City', hasRegions: false },
  { code: 'TH', name: 'Thailand', regionLabel: 'Province', hasRegions: false },
  { code: 'TT', name: 'Trinidad and Tobago', regionLabel: 'Region', hasRegions: false },
  { code: 'AE', name: 'United Arab Emirates', regionLabel: 'Emirate', hasRegions: false },
  { code: 'UK', name: 'United Kingdom', regionLabel: 'Region', hasRegions: true },
  { code: 'US', name: 'United States', regionLabel: 'State', hasRegions: true },
  { code: 'VE', name: 'Venezuela', regionLabel: 'State', hasRegions: false },
  { code: 'VN', name: 'Vietnam', regionLabel: 'Province', hasRegions: false },
]

// United States - 50 states + DC
export const US_STATES: Region[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
]

// Canada - 13 provinces/territories
export const CA_PROVINCES: Region[] = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
]

// United Kingdom - 4 nations
export const UK_REGIONS: Region[] = [
  { code: 'ENG', name: 'England' },
  { code: 'SCT', name: 'Scotland' },
  { code: 'WLS', name: 'Wales' },
  { code: 'NIR', name: 'Northern Ireland' },
]

// Australia - 8 states/territories
export const AU_STATES: Region[] = [
  { code: 'ACT', name: 'Australian Capital Territory' },
  { code: 'NSW', name: 'New South Wales' },
  { code: 'NT', name: 'Northern Territory' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'SA', name: 'South Australia' },
  { code: 'TAS', name: 'Tasmania' },
  { code: 'VIC', name: 'Victoria' },
  { code: 'WA', name: 'Western Australia' },
]

// Mexico - 32 states
export const MX_STATES: Region[] = [
  { code: 'AGU', name: 'Aguascalientes' },
  { code: 'BCN', name: 'Baja California' },
  { code: 'BCS', name: 'Baja California Sur' },
  { code: 'CAM', name: 'Campeche' },
  { code: 'CHP', name: 'Chiapas' },
  { code: 'CHH', name: 'Chihuahua' },
  { code: 'COA', name: 'Coahuila' },
  { code: 'COL', name: 'Colima' },
  { code: 'CMX', name: 'Ciudad de México' },
  { code: 'DUR', name: 'Durango' },
  { code: 'GUA', name: 'Guanajuato' },
  { code: 'GRO', name: 'Guerrero' },
  { code: 'HID', name: 'Hidalgo' },
  { code: 'JAL', name: 'Jalisco' },
  { code: 'MEX', name: 'México' },
  { code: 'MIC', name: 'Michoacán' },
  { code: 'MOR', name: 'Morelos' },
  { code: 'NAY', name: 'Nayarit' },
  { code: 'NLE', name: 'Nuevo León' },
  { code: 'OAX', name: 'Oaxaca' },
  { code: 'PUE', name: 'Puebla' },
  { code: 'QUE', name: 'Querétaro' },
  { code: 'ROO', name: 'Quintana Roo' },
  { code: 'SLP', name: 'San Luis Potosí' },
  { code: 'SIN', name: 'Sinaloa' },
  { code: 'SON', name: 'Sonora' },
  { code: 'TAB', name: 'Tabasco' },
  { code: 'TAM', name: 'Tamaulipas' },
  { code: 'TLA', name: 'Tlaxcala' },
  { code: 'VER', name: 'Veracruz' },
  { code: 'YUC', name: 'Yucatán' },
  { code: 'ZAC', name: 'Zacatecas' },
]

// Costa Rica - 7 provinces
export const CR_PROVINCES: Region[] = [
  { code: 'SJ', name: 'San José' },
  { code: 'A', name: 'Alajuela' },
  { code: 'C', name: 'Cartago' },
  { code: 'H', name: 'Heredia' },
  { code: 'G', name: 'Guanacaste' },
  { code: 'P', name: 'Puntarenas' },
  { code: 'L', name: 'Limón' },
]

// Map of country codes to their regions
const REGIONS_BY_COUNTRY: Record<string, Region[]> = {
  US: US_STATES,
  CA: CA_PROVINCES,
  UK: UK_REGIONS,
  AU: AU_STATES,
  MX: MX_STATES,
  CR: CR_PROVINCES,
}

/**
 * Get the regions (states/provinces) for a given country code
 */
export function getRegionsForCountry(countryCode: string): Region[] {
  return REGIONS_BY_COUNTRY[countryCode] || []
}

/**
 * Get the label for regions in a given country (State, Province, etc.)
 */
export function getRegionLabelForCountry(countryCode: string): string {
  const country = COUNTRIES.find(c => c.code === countryCode)
  return country?.regionLabel || 'State/Region'
}

/**
 * Get country name from code
 */
export function getCountryName(countryCode: string): string {
  const country = COUNTRIES.find(c => c.code === countryCode)
  return country?.name || countryCode
}

/**
 * Get region name from code for a given country
 */
export function getRegionName(countryCode: string, regionCode: string): string {
  const regions = getRegionsForCountry(countryCode)
  const region = regions.find(r => r.code === regionCode)
  return region?.name || regionCode
}

/**
 * Check if a country has pre-defined regions for dropdown selection
 */
export function countryHasRegions(countryCode: string): boolean {
  const country = COUNTRIES.find(c => c.code === countryCode)
  return country?.hasRegions ?? false
}
