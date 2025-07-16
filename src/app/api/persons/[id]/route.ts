import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const UpdatePersonSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'UNKNOWN']).optional(),
  birthYear: z.number().optional(),
  deathYear: z.number().optional(),
  location: z.string().optional(),
  fatherId: z.string().optional(),
  motherId: z.string().optional(),
  spouseId: z.string().optional(),
});

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
    return NextResponse.json({ error: 'Failed to delete person' }, { status: 500 });
  }
}