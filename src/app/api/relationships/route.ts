import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const RelationshipSchema = z.object({
  type: z.enum([
    'SIBLING',
    'HALF_SIBLING',
    'STEP_SIBLING',
    'GRANDPARENT',
    'GRANDCHILD',
    'AUNT_UNCLE',
    'NIECE_NEPHEW',
    'FIRST_COUSIN',
    'SECOND_COUSIN',
    'PARENT_IN_LAW',
    'CHILD_IN_LAW',
    'SIBLING_IN_LAW',
    'STEP_PARENT',
    'STEP_CHILD',
    'GODPARENT',
    'GODCHILD',
    'ADOPTIVE_PARENT',
    'ADOPTIVE_CHILD',
    'GUARDIAN',
    'WARD',
    'CLOSE_FRIEND',
    'FAMILY_FRIEND',
  ]),
  personFromId: z.string(),
  personToId: z.string(),
}).refine(
  (data) => data.personFromId !== data.personToId,
  {
    message: 'A person cannot have a relationship with themselves',
    path: ['personToId'],
  }
);

// Relationship mappings - defines mutual relationships
const MUTUAL_RELATIONSHIPS = {
  SIBLING: 'SIBLING',
  HALF_SIBLING: 'HALF_SIBLING',
  STEP_SIBLING: 'STEP_SIBLING',
  FIRST_COUSIN: 'FIRST_COUSIN',
  SECOND_COUSIN: 'SECOND_COUSIN',
  SIBLING_IN_LAW: 'SIBLING_IN_LAW',
  CLOSE_FRIEND: 'CLOSE_FRIEND',
  FAMILY_FRIEND: 'FAMILY_FRIEND',
};

const REVERSE_RELATIONSHIPS = {
  GRANDPARENT: 'GRANDCHILD',
  GRANDCHILD: 'GRANDPARENT',
  AUNT_UNCLE: 'NIECE_NEPHEW',
  NIECE_NEPHEW: 'AUNT_UNCLE',
  PARENT_IN_LAW: 'CHILD_IN_LAW',
  CHILD_IN_LAW: 'PARENT_IN_LAW',
  STEP_PARENT: 'STEP_CHILD',
  STEP_CHILD: 'STEP_PARENT',
  GODPARENT: 'GODCHILD',
  GODCHILD: 'GODPARENT',
  ADOPTIVE_PARENT: 'ADOPTIVE_CHILD',
  ADOPTIVE_CHILD: 'ADOPTIVE_PARENT',
  GUARDIAN: 'WARD',
  WARD: 'GUARDIAN',
};

// GET all relationships
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const personId = searchParams.get('personId');

    if (personId) {
      // Get relationships for a specific person
      const relationships = await prisma.relationship.findMany({
        where: {
          OR: [
            { personFromId: personId },
            { personToId: personId },
          ],
        },
        include: {
          personFrom: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              gender: true,
              avatarColor: true,
            },
          },
          personTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              gender: true,
              avatarColor: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json(relationships);
    }

    // Get all relationships
    const relationships = await prisma.relationship.findMany({
      include: {
        personFrom: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gender: true,
            avatarColor: true,
          },
        },
        personTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gender: true,
            avatarColor: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(relationships);
  } catch (error) {
    console.error('Error fetching relationships:', error);
    return NextResponse.json({ error: 'Failed to fetch relationships' }, { status: 500 });
  }
}

// POST create relationship
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = RelationshipSchema.parse(body);

    // Check if relationship already exists
    const existingRelationship = await prisma.relationship.findFirst({
      where: {
        personFromId: validatedData.personFromId,
        personToId: validatedData.personToId,
        type: validatedData.type,
      },
    });

    if (existingRelationship) {
      return NextResponse.json(
        { error: 'Relationship already exists' },
        { status: 409 }
      );
    }

    // Create the primary relationship
    const relationship = await prisma.relationship.create({
      data: validatedData,
      include: {
        personFrom: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gender: true,
            avatarColor: true,
          },
        },
        personTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gender: true,
            avatarColor: true,
          },
        },
      },
    });

    // Create reverse relationship if needed
    const reverseType = REVERSE_RELATIONSHIPS[validatedData.type] || MUTUAL_RELATIONSHIPS[validatedData.type];
    
    if (reverseType) {
      // Check if reverse relationship already exists
      const existingReverse = await prisma.relationship.findFirst({
        where: {
          personFromId: validatedData.personToId,
          personToId: validatedData.personFromId,
          type: reverseType,
        },
      });

      if (!existingReverse) {
        await prisma.relationship.create({
          data: {
            type: reverseType,
            personFromId: validatedData.personToId,
            personToId: validatedData.personFromId,
          },
        });
      }
    }

    return NextResponse.json(relationship, { status: 201 });
  } catch (error) {
    console.error('Error creating relationship:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create relationship' }, { status: 500 });
  }
}

// DELETE relationship
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const relationshipId = searchParams.get('id');

    if (!relationshipId) {
      return NextResponse.json({ error: 'Relationship ID is required' }, { status: 400 });
    }

    // Get the relationship to find its reverse
    const relationship = await prisma.relationship.findUnique({
      where: { id: relationshipId },
    });

    if (!relationship) {
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 });
    }

    // Delete the primary relationship
    await prisma.relationship.delete({
      where: { id: relationshipId },
    });

    // Delete reverse relationship if it exists
    const reverseType = REVERSE_RELATIONSHIPS[relationship.type] || MUTUAL_RELATIONSHIPS[relationship.type];
    
    if (reverseType) {
      await prisma.relationship.deleteMany({
        where: {
          personFromId: relationship.personToId,
          personToId: relationship.personFromId,
          type: reverseType,
        },
      });
    }

    return NextResponse.json({ message: 'Relationship deleted successfully' });
  } catch (error) {
    console.error('Error deleting relationship:', error);
    return NextResponse.json({ error: 'Failed to delete relationship' }, { status: 500 });
  }
}