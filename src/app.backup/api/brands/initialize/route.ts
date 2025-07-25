import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const DEFAULT_BRANDS = [
  {
    name: 'eureka',
    displayName: 'Eureka',
    priorityLevel: 'high',
    alertThreshold: 5.0, // 5% threshold
    enforcementLevel: 'strict'
  },
  {
    name: 'ecm',
    displayName: 'ECM',
    priorityLevel: 'high',
    alertThreshold: 3.0, // 3% threshold
    enforcementLevel: 'strict'
  },
  {
    name: 'profitec',
    displayName: 'Profitec',
    priorityLevel: 'high',
    alertThreshold: 3.0,
    enforcementLevel: 'strict'
  },
  {
    name: 'rocket',
    displayName: 'Rocket Espresso',
    priorityLevel: 'high',
    alertThreshold: 5.0,
    enforcementLevel: 'strict'
  },
  {
    name: 'breville',
    displayName: 'Breville',
    priorityLevel: 'medium',
    alertThreshold: 10.0,
    enforcementLevel: 'standard'
  },
  {
    name: 'delonghi',
    displayName: 'De\'Longhi',
    priorityLevel: 'medium',
    alertThreshold: 10.0,
    enforcementLevel: 'standard'
  },
  {
    name: 'gaggia',
    displayName: 'Gaggia',
    priorityLevel: 'medium',
    alertThreshold: 8.0,
    enforcementLevel: 'standard'
  },
  {
    name: 'rancilio',
    displayName: 'Rancilio',
    priorityLevel: 'high',
    alertThreshold: 5.0,
    enforcementLevel: 'strict'
  },
  {
    name: 'lelit',
    displayName: 'Lelit',
    priorityLevel: 'medium',
    alertThreshold: 7.0,
    enforcementLevel: 'standard'
  },
  {
    name: 'bezzera',
    displayName: 'Bezzera',
    priorityLevel: 'high',
    alertThreshold: 4.0,
    enforcementLevel: 'strict'
  }
]

export async function POST() {
  try {
    const results = []
    
    for (const brandData of DEFAULT_BRANDS) {
      try {
        // Check if brand already exists
        const existingBrand = await prisma.brand.findUnique({
          where: { name: brandData.name }
        })
        
        if (existingBrand) {
          results.push({
            brand: brandData.name,
            status: 'exists',
            message: 'Brand already exists'
          })
          continue
        }
        
        // Create brand
        const brand = await prisma.brand.create({
          data: {
            name: brandData.name,
            displayName: brandData.displayName,
            isActive: true,
            enableMonitoring: true,
            alertThreshold: brandData.alertThreshold,
            priorityLevel: brandData.priorityLevel,
            enforcementLevel: brandData.enforcementLevel,
            gracePerioHours: 24 // Default 24 hour grace period
          }
        })
        
        results.push({
          brand: brandData.name,
          status: 'created',
          id: brand.id
        })
      } catch (error) {
        results.push({
          brand: brandData.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    const created = results.filter(r => r.status === 'created').length
    const existing = results.filter(r => r.status === 'exists').length
    const errors = results.filter(r => r.status === 'error').length
    
    return NextResponse.json({
      message: `Initialized brands: ${created} created, ${existing} existing, ${errors} errors`,
      summary: { created, existing, errors },
      results
    })
  } catch (error) {
    console.error('Error initializing brands:', error)
    return NextResponse.json(
      { error: 'Failed to initialize brands' },
      { status: 500 }
    )
  }
}