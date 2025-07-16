import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const UpdatePersonSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'UNKNOWN']).optional(),
  birthYear: z.number().min(1900).max(new Date().getFullYear()).optional(),
  deathYear: z.number().min(1900).max(new Date().getFullYear()).optional(),
  dateOfBirth: z.string().optional(),
  dateOfDeath: z.string().optional(),
  location: z.string().optional(),
  fatherId: z.string().optional(),
  motherId: z.string().optional(),
  spouseId: z.string().optional(),
}).refine(
  (data) => {
    // Death year must be equal to or greater than birth year
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
    // If both dateOfBirth and dateOfDeath are provided, death date must be after birth date
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
);

// GET single person
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const person = await prisma.person.findUnique({
      where: { id: params.id },
      include: {
        father: { select: { id: true, firstName: true, lastName: true } },
        mother: { select: { id: true, firstName: true, lastName: true } },
        spouse: { select: { id: true, firstName: true, lastName: true } },
        fatherChildren: { select: { id: true, firstName: true, lastName: true } },
        motherChildren: { select: { id: true, firstName: true, lastName: true } },
      }
    });
    
    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }
    
    return NextResponse.json(person);
  } catch (error) {
    console.error('Error fetching person:', error);
    return NextResponse.json({ error: 'Failed to fetch person' }, { status: 500 });
  }
}

// PUT update person
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validatedData = UpdatePersonSchema.parse(body);
    
    // Update avatar color if gender changed
    let updateData = { ...validatedData };
    if (validatedData.gender) {
      updateData.avatarColor = validatedData.gender === 'MALE' ? '#3B82F6' : 
                              validatedData.gender === 'FEMALE' ? '#EC4899' : '#6B7280';
    }
    
    const person = await prisma.person.update({
      where: { id: params.id },
      data: updateData,
      include: {
        father: { select: { id: true, firstName: true, lastName: true } },
        mother: { select: { id: true, firstName: true, lastName: true } },
        spouse: { select: { id: true, firstName: true, lastName: true } },
      }
    });
    
    return NextResponse.json(person);
  } catch (error) {
    console.error('Error updating person:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update person' }, { status: 500 });
  }
}

// DELETE person
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // First, remove relationships pointing to this person
    await prisma.person.updateMany({
      where: { 
        OR: [
          { fatherId: params.id },
          { motherId: params.id },
          { spouseId: params.id }
        ]
      },
      data: {
        fatherId: null,
        motherId: null,
        spouseId: null,
      }
    });
    
    // Then delete the person
    await prisma.person.delete({
      where: { id: params.id }
    });
    
    return NextResponse.json({ message: 'Person deleted successfully' });
  } catch (error) {
    console.error('Error deleting person:', error);
    return NextResponse.json({ error: 'Failed to delete person' }, { status: 500 });
  }
}