/**
 * Camps API Routes
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  fetchPublicCamps,
  fetchCampBySlug,
  fetchCampById,
  fetchFeaturedCamps,
  fetchCampsByLocation,
  fetchCampCities,
  fetchCampStates,
  fetchProgramTypes,
  fetchUpcomingCampsForDirector,
  fetchActiveCamps,
  fetchCampsForDirector,
} from '@/lib/services/camps'

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'list'
  const slug = request.nextUrl.searchParams.get('slug')
  const id = request.nextUrl.searchParams.get('id')
  const limit = request.nextUrl.searchParams.get('limit')

  // Filter params for public camps
  const city = request.nextUrl.searchParams.get('city')
  const state = request.nextUrl.searchParams.get('state')
  const programType = request.nextUrl.searchParams.get('programType')
  const startDate = request.nextUrl.searchParams.get('startDate')
  const endDate = request.nextUrl.searchParams.get('endDate')
  const minAge = request.nextUrl.searchParams.get('minAge')
  const maxAge = request.nextUrl.searchParams.get('maxAge')
  const search = request.nextUrl.searchParams.get('search')
  const page = request.nextUrl.searchParams.get('page')
  const perPage = request.nextUrl.searchParams.get('perPage')

  try {
    switch (action) {
      case 'list': {
        const filters = {
          city: city || undefined,
          state: state || undefined,
          program_type: programType || undefined,
          start_date_from: startDate || undefined,
          start_date_to: endDate || undefined,
          min_age: minAge ? parseInt(minAge) : undefined,
          max_age: maxAge ? parseInt(maxAge) : undefined,
          search: search || undefined,
        }
        const options = {
          page: page ? parseInt(page) : 1,
          pageSize: perPage ? parseInt(perPage) : 12,
        }
        const result = await fetchPublicCamps(filters, options)
        return NextResponse.json({ data: result })
      }

      case 'bySlug': {
        if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })
        // Returns PublicCampCard | null directly
        const data = await fetchCampBySlug(slug)
        return NextResponse.json({ data })
      }

      case 'byId': {
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        // Returns PublicCampCard | null directly
        const data = await fetchCampById(id)
        return NextResponse.json({ data })
      }

      case 'featured': {
        // Returns PublicCampCard[] directly
        const data = await fetchFeaturedCamps(limit ? parseInt(limit) : undefined)
        return NextResponse.json({ data })
      }

      case 'byLocation': {
        // Returns PublicCampCard[] directly
        const locationParam = { city: city || undefined, state: state || undefined }
        const data = await fetchCampsByLocation(locationParam, limit ? parseInt(limit) : undefined)
        return NextResponse.json({ data })
      }

      case 'cities': {
        // Returns string[] directly
        const data = await fetchCampCities()
        return NextResponse.json({ data })
      }

      case 'states': {
        // Returns string[] directly
        const data = await fetchCampStates()
        return NextResponse.json({ data })
      }

      case 'programTypes': {
        // Returns string[] directly
        const data = await fetchProgramTypes()
        return NextResponse.json({ data })
      }

      case 'upcomingForDirector': {
        // Returns { data, error } pattern
        const { data, error } = await fetchUpcomingCampsForDirector(limit ? parseInt(limit) : undefined)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'active': {
        // Returns { data, error } pattern
        const { data, error } = await fetchActiveCamps()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'forDirector': {
        // Returns { data, error } pattern
        const { data, error } = await fetchCampsForDirector()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
