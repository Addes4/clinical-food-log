import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { normalizeFood } from '../src/lib/food-normalization'

const prisma = new PrismaClient()

async function upsertCanonical(name: string): Promise<string> {
  const fc = await prisma.foodCanonical.upsert({
    where: { name },
    create: { name },
    update: {},
  })
  return fc.id
}

async function createFoodItems(
  mealLogId: string,
  foods: Array<{ raw: string; quantity?: number; unit?: string }>
) {
  for (const food of foods) {
    const normalized = normalizeFood(food.raw)
    let canonicalFoodId: string | undefined
    if (normalized.confidence >= 0.5) {
      canonicalFoodId = await upsertCanonical(normalized.canonical)
    }
    await prisma.mealFoodItem.create({
      data: {
        mealLogId,
        rawInput: food.raw,
        canonicalFoodId,
        brand: normalized.brand,
        quantity: food.quantity,
        unit: food.unit,
        confidence: normalized.confidence,
      },
    })
  }
}

function daysAgo(days: number, hour = 8, minute = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, minute, 0, 0)
  return d
}

async function main() {
  console.log('Seeding database...')

  // Clean slate
  await prisma.mealFoodItem.deleteMany()
  await prisma.mealLog.deleteMany()
  await prisma.symptomLog.deleteMany()
  await prisma.contextLog.deleteMany()
  await prisma.clinicianPatientAssignment.deleteMany()
  await prisma.patientProfile.deleteMany()
  await prisma.clinicianProfile.deleteMany()
  await prisma.foodSynonym.deleteMany()
  await prisma.foodCanonical.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash('password', 10)

  // ── Users ──────────────────────────────────────────────────────────────
  const annaUser = await prisma.user.create({
    data: {
      email: 'anna@example.com',
      passwordHash,
      role: 'PATIENT',
      patientProfile: { create: { displayName: 'Anna Lindqvist' } },
    },
    include: { patientProfile: true },
  })

  const bjornUser = await prisma.user.create({
    data: {
      email: 'bjorn@example.com',
      passwordHash,
      role: 'PATIENT',
      patientProfile: { create: { displayName: 'Björn Andersson' } },
    },
    include: { patientProfile: true },
  })

  const doctorUser = await prisma.user.create({
    data: {
      email: 'doctor@example.com',
      passwordHash,
      role: 'CLINICIAN',
      clinicianProfile: { create: { displayName: 'Dr. Maria Holm' } },
    },
    include: { clinicianProfile: true },
  })

  const annaId = annaUser.patientProfile!.id
  const bjornId = bjornUser.patientProfile!.id
  const clinicianId = doctorUser.clinicianProfile!.id

  // Assign both patients to clinician
  await prisma.clinicianPatientAssignment.createMany({
    data: [
      { clinicianId, patientId: annaId },
      { clinicianId, patientId: bjornId },
    ],
  })

  // ── Anna's logs (IBS pattern: pasta + kaffe → high symptoms) ──────────

  // 3 weeks of data
  for (let day = 21; day >= 1; day--) {
    // Breakfast
    const breakfastMeal = await prisma.mealLog.create({
      data: {
        patientId: annaId,
        datetime: daysAgo(day, 8, 0),
        mealType: 'BREAKFAST',
        title: day % 3 === 0 ? 'Havregrynsgröt' : day % 3 === 1 ? 'Knäckebröd med ost' : 'Yoghurt med muesli',
      },
    })
    if (day % 3 === 0) {
      await createFoodItems(breakfastMeal.id, [
        { raw: 'havregrynsgröt', quantity: 200, unit: 'g' },
        { raw: 'mjölk', quantity: 1, unit: 'dl' },
      ])
    } else if (day % 3 === 1) {
      await createFoodItems(breakfastMeal.id, [
        { raw: 'knäckebröd', quantity: 3, unit: 'st' },
        { raw: 'ost', quantity: 40, unit: 'g' },
      ])
    } else {
      await createFoodItems(breakfastMeal.id, [
        { raw: 'yoghurt', quantity: 150, unit: 'g' },
        { raw: 'muesli', quantity: 50, unit: 'g' },
      ])
    }

    // Coffee (triggers!)
    const coffeeSnack = await prisma.mealLog.create({
      data: {
        patientId: annaId,
        datetime: daysAgo(day, 9, 30),
        mealType: 'SNACK',
        title: 'Kaffe',
      },
    })
    await createFoodItems(coffeeSnack.id, [{ raw: 'kaffe', quantity: 1, unit: 'cup' }])

    // Lunch — often pasta (major trigger)
    const hasPasta = day % 2 === 0
    const lunchMeal = await prisma.mealLog.create({
      data: {
        patientId: annaId,
        datetime: daysAgo(day, 12, 0),
        mealType: 'LUNCH',
        title: hasPasta ? 'Pasta bolognese' : 'Falukorv med potatis',
      },
    })
    if (hasPasta) {
      await createFoodItems(lunchMeal.id, [
        { raw: 'pasta', quantity: 200, unit: 'g' },
        { raw: 'köttfärs', quantity: 100, unit: 'g' },
        { raw: 'tomat', quantity: 2, unit: 'st' },
        { raw: 'lök', quantity: 1, unit: 'st' },
      ])
    } else {
      await createFoodItems(lunchMeal.id, [
        { raw: 'falukorv', quantity: 150, unit: 'g' },
        { raw: 'potatis', quantity: 200, unit: 'g' },
        { raw: 'senap', quantity: 1, unit: 'tbsp' },
      ])
    }

    // Dinner
    const dinnerMeal = await prisma.mealLog.create({
      data: {
        patientId: annaId,
        datetime: daysAgo(day, 18, 0),
        mealType: 'DINNER',
        title: day % 4 === 0 ? 'Lax med ris' : day % 4 === 1 ? 'Kyckling med grönsaker' : day % 4 === 2 ? 'Soppa' : 'Pasta pesto',
      },
    })
    if (day % 4 === 0) {
      await createFoodItems(dinnerMeal.id, [
        { raw: 'lax', quantity: 150, unit: 'g' },
        { raw: 'ris', quantity: 150, unit: 'g' },
        { raw: 'broccoli', quantity: 100, unit: 'g' },
      ])
    } else if (day % 4 === 1) {
      await createFoodItems(dinnerMeal.id, [
        { raw: 'kyckling', quantity: 150, unit: 'g' },
        { raw: 'paprika', quantity: 1, unit: 'st' },
        { raw: 'broccoli', quantity: 80, unit: 'g' },
      ])
    } else if (day % 4 === 2) {
      await createFoodItems(dinnerMeal.id, [
        { raw: 'tomatsoppa', quantity: 300, unit: 'ml' },
        { raw: 'bröd', quantity: 2, unit: 'slice' },
      ])
    } else {
      await createFoodItems(dinnerMeal.id, [
        { raw: 'pasta', quantity: 180, unit: 'g' },
        { raw: 'pesto', quantity: 2, unit: 'tbsp' },
        { raw: 'ost', quantity: 30, unit: 'g' },
      ])
    }

    // Symptom logs — high after pasta/coffee days
    const pastaDay = hasPasta
    const painScore = pastaDay ? 6 + Math.floor(Math.random() * 3) : 2 + Math.floor(Math.random() * 3)
    const bloatingScore = pastaDay ? 7 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 3)
    const urgencyScore = pastaDay ? 5 + Math.floor(Math.random() * 4) : 1 + Math.floor(Math.random() * 3)
    const nauseaScore = pastaDay ? 4 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 2)

    await prisma.symptomLog.create({
      data: {
        patientId: annaId,
        datetime: daysAgo(day, 14, 30),
        painScore: Math.min(10, painScore),
        bloatingScore: Math.min(10, bloatingScore),
        urgencyScore: Math.min(10, urgencyScore),
        nauseaScore: Math.min(10, nauseaScore),
        bowelMovement: pastaDay ? '3' : '1',
        bristolScale: pastaDay ? 6 : 4,
        notes: pastaDay ? 'Ont i magen efter lunch' : null,
      },
    })

    // Context logs
    await prisma.contextLog.create({
      data: {
        patientId: annaId,
        datetime: daysAgo(day, 22, 0),
        stressScore: 3 + Math.floor(Math.random() * 5),
        sleepHours: 6 + Math.random() * 2,
        alcohol: day % 7 === 0,
        exercise: ['NONE', 'LIGHT', 'MODERATE', 'NONE', 'LIGHT'][day % 5],
        medicationTaken: day % 3 === 0 ? 'Mebeverine 135mg' : null,
      },
    })
  }

  // ── Björn's logs (more varied diet, lower symptoms) ───────────────────
  const bjornBreakfasts = [
    { title: 'Havregrynsgröt med banan', foods: [{ raw: 'havregrynsgröt', quantity: 180, unit: 'g' }, { raw: 'banan', quantity: 1, unit: 'st' }] },
    { title: 'Filmjölk med müsli', foods: [{ raw: 'filmjölk', quantity: 200, unit: 'ml' }, { raw: 'muesli', quantity: 60, unit: 'g' }] },
    { title: 'Ägg och toast', foods: [{ raw: 'ägg', quantity: 2, unit: 'st' }, { raw: 'bröd', quantity: 2, unit: 'slice' }, { raw: 'smör', quantity: 1, unit: 'tsp' }] },
  ]
  const bjornLunches = [
    { title: 'Laxsallad', foods: [{ raw: 'lax', quantity: 120, unit: 'g' }, { raw: 'sallad', quantity: 80, unit: 'g' }, { raw: 'gurka', quantity: 50, unit: 'g' }] },
    { title: 'Kycklingsoppa', foods: [{ raw: 'kyckling', quantity: 100, unit: 'g' }, { raw: 'soppa', quantity: 300, unit: 'ml' }, { raw: 'morot', quantity: 1, unit: 'st' }] },
    { title: 'Smörgås med skinka', foods: [{ raw: 'smörgås', quantity: 2, unit: 'st' }, { raw: 'skinka', quantity: 80, unit: 'g' }, { raw: 'ost', quantity: 30, unit: 'g' }] },
  ]

  for (let day = 21; day >= 1; day--) {
    const bi = day % 3
    const breakfast = bjornBreakfasts[bi]
    const bMeal = await prisma.mealLog.create({
      data: {
        patientId: bjornId,
        datetime: daysAgo(day, 7, 30),
        mealType: 'BREAKFAST',
        title: breakfast.title,
      },
    })
    await createFoodItems(bMeal.id, breakfast.foods)

    // Björn drinks tea not coffee
    const teaSnack = await prisma.mealLog.create({
      data: {
        patientId: bjornId,
        datetime: daysAgo(day, 10, 0),
        mealType: 'SNACK',
        title: 'Te',
      },
    })
    await createFoodItems(teaSnack.id, [{ raw: 'te', quantity: 1, unit: 'cup' }])

    const li = day % 3
    const lunch = bjornLunches[li]
    const lMeal = await prisma.mealLog.create({
      data: {
        patientId: bjornId,
        datetime: daysAgo(day, 12, 30),
        mealType: 'LUNCH',
        title: lunch.title,
      },
    })
    await createFoodItems(lMeal.id, lunch.foods)

    const dinnerMeal = await prisma.mealLog.create({
      data: {
        patientId: bjornId,
        datetime: daysAgo(day, 18, 30),
        mealType: 'DINNER',
        title: day % 3 === 0 ? 'Ris med kyckling och grönsaker' : day % 3 === 1 ? 'Lax med potatis' : 'Köttbullar med potatis',
      },
    })
    if (day % 3 === 0) {
      await createFoodItems(dinnerMeal.id, [
        { raw: 'ris', quantity: 150, unit: 'g' },
        { raw: 'kyckling', quantity: 150, unit: 'g' },
        { raw: 'broccoli', quantity: 100, unit: 'g' },
      ])
    } else if (day % 3 === 1) {
      await createFoodItems(dinnerMeal.id, [
        { raw: 'lax', quantity: 160, unit: 'g' },
        { raw: 'potatis', quantity: 200, unit: 'g' },
        { raw: 'spenat', quantity: 60, unit: 'g' },
      ])
    } else {
      await createFoodItems(dinnerMeal.id, [
        { raw: 'köttbullar', quantity: 200, unit: 'g' },
        { raw: 'potatis', quantity: 200, unit: 'g' },
        { raw: 'sylt', quantity: 1, unit: 'tbsp' },
      ])
    }

    // Björn has lower, more stable symptoms
    await prisma.symptomLog.create({
      data: {
        patientId: bjornId,
        datetime: daysAgo(day, 20, 0),
        painScore: Math.min(10, 1 + Math.floor(Math.random() * 4)),
        bloatingScore: Math.min(10, 1 + Math.floor(Math.random() * 4)),
        urgencyScore: Math.min(10, 0 + Math.floor(Math.random() * 3)),
        nauseaScore: Math.min(10, 0 + Math.floor(Math.random() * 2)),
        bowelMovement: '1',
        bristolScale: 4,
      },
    })

    await prisma.contextLog.create({
      data: {
        patientId: bjornId,
        datetime: daysAgo(day, 22, 30),
        stressScore: 2 + Math.floor(Math.random() * 3),
        sleepHours: 7 + Math.random() * 1.5,
        alcohol: day % 10 === 0,
        exercise: ['LIGHT', 'MODERATE', 'MODERATE', 'LIGHT', 'INTENSE', 'NONE', 'LIGHT'][day % 7],
      },
    })
  }

  const userCount = await prisma.user.count()
  const mealCount = await prisma.mealLog.count()
  const symptomCount = await prisma.symptomLog.count()
  const foodCount = await prisma.foodCanonical.count()

  console.log(`✓ Users: ${userCount}`)
  console.log(`✓ Meal logs: ${mealCount}`)
  console.log(`✓ Symptom logs: ${symptomCount}`)
  console.log(`✓ Canonical foods: ${foodCount}`)
  console.log('Seed complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
