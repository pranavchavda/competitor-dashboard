import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const brand = await prisma.brand.findUnique({
      where: { id }
    })
    
    if (!brand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      )
    }
    
    // Get violation statistics for this brand
    const violationStats = await prisma.productMatch.aggregate({
      where: {
        competitorProduct: {
          vendor: {
            equals: brand.displayName
          }
        },
        isMapViolation: true
      },
      _count: {
        id: true
      },
      _sum: {
        violationAmount: true
      }
    })
    
    return NextResponse.json({
      ...brand,
      violations: {
        count: violationStats._count.id || 0,
        totalAmount: violationStats._sum.violationAmount || 0
      }
    })
  } catch (error) {
    console.error('Error fetching brand:', error)
    return NextResponse.json(
      { error: 'Failed to fetch brand' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const {
      displayName,
      isActive,
      enableMonitoring,
      alertThreshold,
      priorityLevel,
      enforcementLevel,
      gracePerioHours,
      contactEmail,
      escalationEmail
    } = body
    
    const brand = await prisma.brand.update({
      where: { id },
      data: {
        displayName,
        isActive,
        enableMonitoring,
        alertThreshold,
        priorityLevel,
        enforcementLevel,
        gracePerioHours,
        contactEmail,
        escalationEmail,
        updatedAt: new Date()
      }
    })
    
    return NextResponse.json(brand)
  } catch (error) {
    console.error('Error updating brand:', error)
    return NextResponse.json(
      { error: 'Failed to update brand' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    await prisma.brand.delete({
      where: { id }
    })
    
    return NextResponse.json({ message: 'Brand deleted successfully' })
  } catch (error) {
    console.error('Error deleting brand:', error)
    return NextResponse.json(
      { error: 'Failed to delete brand' },
      { status: 500 }
    )
  }
}