import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const UpdatePersonSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'UNKNOWN']).optional(),
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
    if (data.profilePhoto !== undefined) {
      if (data.profilePhoto === null || data.profilePhoto === '') {
        return true; // Allow removal of photo
      }
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

// GET single person
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
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
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const body = await request.json();
    const validatedData = UpdatePersonSchema.parse(body);
    
    // Update avatar color if gender changed
    let updateData: Prisma.PersonUpdateInput = { ...validatedData };
    if (validatedData.gender) {
      updateData.avatarColor = validatedData.gender === 'MALE' ? '#3B82F6' : 
                              validatedData.gender === 'FEMALE' ? '#EC4899' : '#6B7280';
    }
    
    // Handle profile photo removal
    if (validatedData.profilePhoto === null || validatedData.profilePhoto === '') {
      updateData.profilePhoto = null;
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
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
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