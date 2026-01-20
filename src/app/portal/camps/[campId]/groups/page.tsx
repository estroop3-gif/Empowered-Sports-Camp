'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { GroupingProvider, useGrouping } from '@/lib/grouping'
import { GroupingBoard } from '@/components/grouping/grouping-board'

// Development mock data (will be replaced with real data from services)
const mockTenant = {
  id: 'mock-tenant-1',
  name: 'Empowered Sports Camp',
  logo_url: null,
  primary_color: '#CCFF00',
  secondary_color: '#FF2DCE',
}

const mockCamps = [
  {
    id: 'mock-camp-1',
    slug: 'summer-2025',
    name: 'Summer Sports Camp 2025',
    start_date: '2025-06-15',
    end_date: '2025-06-20',
    location: { name: 'Main Campus' },
  },
]

/**
 * GROUP ASSIGNMENT PAGE
 *
 * Director interface for viewing and managing camper group assignments
 * for a specific camp session.
 *
 * URL: /portal/camps/[campId]/groups
 *
 * This page:
 * - Loads camp and registration data
 * - Provides the grouping context
 * - Renders the GroupingBoard component
 */

function GroupsPageContent() {
  const params = useParams()
  const campId = params.campId as string
  const { state, initCamp, setRawCampers, runGrouping, rerunGrouping, moveCamper, resolveViolation, finalize, exportReport, printReport } = useGrouping()

  // Load camp data on mount
  useEffect(() => {
    // In production, this would fetch from Supabase
    // For now, use mock data
    const camp = mockCamps.find(c => c.id === campId || c.slug === campId)

    if (camp) {
      initCamp({
        campId: camp.id,
        campName: camp.name,
        campStartDate: new Date(camp.start_date),
        campEndDate: new Date(camp.end_date),
        campLocation: camp.location?.name ?? 'TBD',
        tenantId: mockTenant.id,
        tenantName: mockTenant.name,
        tenantLogo: mockTenant.logo_url ?? null,
        primaryColor: mockTenant.primary_color,
        secondaryColor: mockTenant.secondary_color,
      })

      // Load mock camper data
      // In production, fetch from registrations table
      const mockRawCampers = generateMockCampers(camp.id, 35)
      setRawCampers(mockRawCampers)
    }
  }, [campId, initCamp, setRawCampers])

  if (!state.campId) {
    return (
      <div className="flex items-center justify-center h-screen bg-dark">
        <div className="text-white/50 text-center">
          <div className="animate-pulse mb-4">Loading...</div>
          <div className="text-sm">Fetching camp data</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen">
      <GroupingBoard
        campId={state.campId}
        campName={state.campName}
        campStartDate={state.campStartDate}
        groupingStatus={state.groupingStatus}
        groups={state.groups}
        campers={state.campers}
        friendGroups={state.friendGroups}
        violations={state.violations}
        stats={state.stats}
        config={state.config}
        isLoading={state.isLoading}
        isRunning={state.isRunning}
        onRunGrouping={runGrouping}
        onRerunGrouping={rerunGrouping}
        onMoveCamper={moveCamper}
        onResolveViolation={resolveViolation}
        onFinalize={finalize}
        onExportReport={exportReport}
      />
    </div>
  )
}

export default function GroupsPage() {
  return (
    <GroupingProvider>
      <GroupsPageContent />
    </GroupingProvider>
  )
}

// ============================================================================
// MOCK DATA GENERATION (for development)
// ============================================================================

function generateMockCampers(campId: string, count: number) {
  const firstNames = [
    'Emma', 'Olivia', 'Ava', 'Isabella', 'Sophia', 'Mia', 'Charlotte', 'Amelia',
    'Harper', 'Evelyn', 'Abigail', 'Emily', 'Elizabeth', 'Sofia', 'Avery',
    'Ella', 'Scarlett', 'Grace', 'Chloe', 'Victoria', 'Riley', 'Aria', 'Lily',
    'Aurora', 'Zoey', 'Nora', 'Camila', 'Hannah', 'Lillian', 'Addison',
    'Luna', 'Savannah', 'Brooklyn', 'Leah', 'Zoe', 'Stella', 'Hazel', 'Ellie',
    'Paisley', 'Audrey', 'Skylar', 'Violet', 'Claire', 'Bella', 'Lucy',
  ]

  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
    'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
    'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
    'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
  ]

  const grades = ['Pre-K', 'Kindergarten', '1st', '2nd', '3rd', '4th', '5th', '6th']

  const campers = []

  // Generate friend clusters
  const friendClusters: number[][] = []
  let assigned = new Set<number>()

  // Create 5-8 friend groups of 2-6 members each
  for (let i = 0; i < 7 && assigned.size < count - 5; i++) {
    const clusterSize = Math.floor(Math.random() * 5) + 2 // 2-6 members
    const cluster: number[] = []

    for (let j = 0; j < clusterSize && assigned.size < count - 5; j++) {
      let idx
      do {
        idx = Math.floor(Math.random() * count)
      } while (assigned.has(idx))

      cluster.push(idx)
      assigned.add(idx)
    }

    if (cluster.length >= 2) {
      friendClusters.push(cluster)
    }
  }

  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]

    // Age distribution: mostly 6-12 with some variation
    const baseAge = Math.floor(Math.random() * 7) + 6 // 6-12
    const birthYear = 2025 - baseAge - (Math.random() > 0.5 ? 1 : 0)
    const birthMonth = Math.floor(Math.random() * 12) + 1
    const birthDay = Math.floor(Math.random() * 28) + 1

    const dob = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`

    // Grade roughly aligned with age
    const gradeIndex = Math.min(grades.length - 1, Math.max(0, baseAge - 5 + Math.floor(Math.random() * 2) - 1))

    // Find friends for this camper
    const friendNames: string[] = []
    for (const cluster of friendClusters) {
      if (cluster.includes(i)) {
        for (const friendIdx of cluster) {
          if (friendIdx !== i && friendIdx < i) {
            // Reference already generated campers
            friendNames.push(campers[friendIdx].firstName + ' ' + campers[friendIdx].lastName)
          }
        }
      }
    }

    // Random special considerations
    const hasAllergies = Math.random() < 0.15
    const hasMedicalNotes = Math.random() < 0.1
    const hasSpecialNeeds = Math.random() < 0.08
    const isLeader = Math.random() < 0.1

    campers.push({
      athleteId: `athlete-${i + 1}`,
      registrationId: `reg-${i + 1}`,
      firstName,
      lastName,
      dateOfBirth: dob,
      gradeFromRegistration: grades[gradeIndex],
      friendRequests: friendNames,
      medicalNotes: hasMedicalNotes
        ? ['Asthma - has inhaler', 'Type 1 Diabetes', 'Seizure history'][Math.floor(Math.random() * 3)]
        : null,
      allergies: hasAllergies
        ? ['Peanuts', 'Tree nuts', 'Bee stings', 'Penicillin', 'Dairy'][Math.floor(Math.random() * 5)]
        : null,
      specialConsiderations: hasSpecialNeeds
        ? ['ADHD - may need extra attention', 'Anxiety - prefers smaller groups', 'Hearing aid in left ear'][Math.floor(Math.random() * 3)]
        : null,
      registeredAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
  }

  // Second pass: add forward friend references
  for (const cluster of friendClusters) {
    for (let i = 0; i < cluster.length; i++) {
      const camperIdx = cluster[i]
      for (let j = i + 1; j < cluster.length; j++) {
        const friendIdx = cluster[j]
        if (Math.random() > 0.3) { // 70% chance of mutual request
          const friendName = campers[friendIdx].firstName + ' ' + campers[friendIdx].lastName
          if (!campers[camperIdx].friendRequests.includes(friendName)) {
            campers[camperIdx].friendRequests.push(friendName)
          }
        }
      }
    }
  }

  return campers
}
