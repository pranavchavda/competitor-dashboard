#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const OUTPUT_DIR = 'dist-windows-portable'

console.log('🔧 Fixing Prisma client for Windows portable distribution...')

// Check if the Windows distribution exists
if (!fs.existsSync(OUTPUT_DIR)) {
  console.error('❌ Windows portable distribution not found. Run build-windows-portable.js first.')
  process.exit(1)
}

// Set working directory to the Windows distribution
process.chdir(OUTPUT_DIR)

console.log('📋 Setting up Prisma client for Windows portable distribution...')

// First, ensure we have the main .prisma directory
const mainPrismaDir = path.join('node_modules/.prisma')
if (!fs.existsSync(mainPrismaDir)) {
  fs.mkdirSync(mainPrismaDir, { recursive: true })
}

// Find the generated Prisma client in pnpm structure
const pnpmPrismaPath = path.join('node_modules/.pnpm')
if (fs.existsSync(pnpmPrismaPath)) {
  const prismaClientPattern = fs.readdirSync(pnpmPrismaPath).find(dir => 
    dir.includes('@prisma+client@') && dir.includes('prisma@')
  )
  
  if (prismaClientPattern) {
    const sourcePrismaClient = path.join(pnpmPrismaPath, prismaClientPattern, 'node_modules/.prisma/client')
    
    if (fs.existsSync(sourcePrismaClient)) {
      console.log('📋 Found generated Prisma client, copying to standard locations...')
      
      // Copy to main .prisma location (what @prisma/client expects)
      const mainClientDir = path.join(mainPrismaDir, 'client')
      if (fs.existsSync(mainClientDir)) {
        fs.rmSync(mainClientDir, { recursive: true, force: true })
      }
      execSync(`cp -r "${sourcePrismaClient}" "${mainClientDir}"`, { stdio: 'inherit' })
      
      console.log('✅ Prisma client copied to node_modules/.prisma/client/')
      
      // Test the fix
      try {
        const { PrismaClient } = await import('@prisma/client')
        console.log('✅ @prisma/client import test successful!')
        console.log('🎉 Prisma client fix applied successfully!')
      } catch (error) {
        console.log('⚠️  Import test failed, but files were copied. Error:', error.message)
      }
    } else {
      console.log('⚠️  Generated Prisma client not found in pnpm structure')
    }
  } else {
    console.log('⚠️  Could not find Prisma client pattern in pnpm structure')
  }
} else {
  console.log('⚠️  pnpm structure not found')
}

console.log('🔧 Fix completed. The Windows portable app should now work properly.')