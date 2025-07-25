import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      orderBy: { name: 'asc' }
    })
    
    return NextResponse.json({
      brands,
      total: brands.length,
      active: brands.filter((b: any) => b.isActive).length,
      monitored: brands.filter((b: any) => b.enableMonitoring).length
    })
  } catch (error) {
    console.error('Error fetching brands:', error)
    return NextResponse.json(
      { error: 'Failed to fetch brands' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      displayName,
      isActive = true,
      enableMonitoring = true,
      alertThreshold,
      priorityLevel = 'medium',
      enforcementLevel = 'standard',
      gracePerioHours,
      contactEmail,
      escalationEmail
    } = body
    
    if (!name || !displayName) {
      return NextResponse.json(
        { error: 'Name and displayName are required' },
        { status: 400 }
      )
    }
    
    // Check if brand already exists
    const existingBrand = await prisma.brand.findUnique({
      where: { name: name.toLowerCase() }
    })
    
    if (existingBrand) {
      return NextResponse.json(
        { error: 'Brand already exists' },
        { status: 409 }
      )
    }
    
    const brand = await prisma.brand.create({
      data: {
        name: name.toLowerCase(),
        displayName,
        isActive,
        enableMonitoring,
        alertThreshold,
        priorityLevel,
        enforcementLevel,
        gracePerioHours,
        contactEmail,
        escalationEmail
      }
    })
    
    return NextResponse.json(brand, { status: 201 })
  } catch (error) {
    console.error('Error creating brand:', error)
    return NextResponse.json(
      { error: 'Failed to create brand' },
      { status: 500 }
    )
  }
}