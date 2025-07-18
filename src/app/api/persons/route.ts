import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const PersonSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  gender: z.enum(['MALE', 'FEMALE', 'UNKNOWN']).default('UNKNOWN'),
  birthYear: z.number().min(1).max(new Date().getFullYear()).optional(),
  deathYear: z.number().min(1).max(new Date().getFullYear()).optional(),
  dateOfBirth: z.string().optional(),
  dateOfDeath: z.string().optional(),
  location: z.string().optional(),
  profilePhoto: z.string().optional(), // Base64 encoded image
  fatherId: z.string().optional(),
  motherId: z.string().optional(),
  spouseId: z.string().optional(),
}).refine(
  (data) => {
    // If both birthYear and deathYear are provided, death year must be >= birth year
    if (
      typeof data.birthYear === 'number' &&
      typeof data.deathYear === 'number'
    ) {
      return data.deathYear >= data.birthYear;
    }
    return true;
  },
  {
    message: 'Year of death must be equal to or greater than year of birth',
    path: ['deathYear'],
  }
).refine(
  (data) => {
    // If both full dates are provided, death date must be >= birth date
    if (data.dateOfBirth && data.dateOfDeath) {
      const birthDate = new Date(data.dateOfBirth);
      const deathDate = new Date(data.dateOfDeath);
      return deathDate >= birthDate;
    }
    return true;
  },
  {
    message: 'Date of death must be equal to or after date of birth',
    path: ['dateOfDeath'],
  }
).refine(
  (data) => {
    // If dateOfBirth is provided but no birthYear, extract year from date
    if (data.dateOfBirth && !data.birthYear) {
      const birthYear = new Date(data.dateOfBirth).getFullYear();
      if (data.deathYear && data.deathYear < birthYear) {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Death year must be equal to or greater than birth year (from date)',
    path: ['deathYear'],
  }
).refine(
  (data) => {
    // If dateOfDeath is provided but no deathYear, extract year from date
    if (data.dateOfDeath && !data.deathYear) {
      const deathYear = new Date(data.dateOfDeath).getFullYear();
      if (data.birthYear && deathYear < data.birthYear) {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Date of death must be equal to or after birth year',
    path: ['dateOfDeath'],
  }
).refine(
  (data) => {
    // Validate profile photo if provided (basic base64 validation)
    if (data.profilePhoto) {
      const base64Regex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
      if (!base64Regex.test(data.profilePhoto)) {
        return false;
      }
      // Check size (approximate - base64 is ~33% larger than original)
      const sizeInBytes = (data.profilePhoto.length * 3) / 4;
      if (sizeInBytes > 5 * 1024 * 1024) { // 5MB limit
        return false;
      }
    }
    return true;
  },
  {
    message: 'Profile photo must be a valid base64 image under 5MB',
    path: ['profilePhoto'],
  }
);

// GET all persons
export async function GET() {
  try {
    const persons = await prisma.person.findMany({
      include: {
        father: { select: { id: true, firstName: true, lastName: true } },
        mother: { select: { id: true, firstName: true, lastName: true } },
        spouse: { select: { id: true, firstName: true, lastName: true } },
        fatherChildren: { select: { id: true, firstName: true, lastName: true } },
        motherChildren: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(persons);
  } catch (error) {
    console.error('Error fetching persons:', error);
    return NextResponse.json({ error: 'Failed to fetch persons' }, { status: 500 });
  }
}

// POST new person
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = PersonSchema.parse(body);
    
    const avatarColor = validatedData.gender === 'MALE' ? '#3B82F6' : 
                       validatedData.gender === 'FEMALE' ? '#EC4899' : '#6B7280';
    
    const person = await prisma.person.create({
      data: {
        ...validatedData,
        avatarColor,
      },
      include: {
        father: { select: { id: true, firstName: true, lastName: true } },
        mother: { select: { id: true, firstName: true, lastName: true } },
        spouse: { select: { id: true, firstName: true, lastName: true } },
      }
    });
    
    return NextResponse.json(person, { status: 201 });
  } catch (error) {
    console.error('Error creating person:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create person' }, { status: 500 });
  }
}