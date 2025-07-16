export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  birthYear?: number;
  deathYear?: number;
  dateOfBirth?: string; // ISO date string
  dateOfDeath?: string; // ISO date string
  location?: string;
  avatarColor: string;
  fatherId?: string;
  motherId?: string;
  spouseId?: string;
  
  // Relations
  father?: PersonBasic;
  mother?: PersonBasic;
  spouse?: PersonBasic;
  fatherChildren?: PersonBasic[];
  motherChildren?: PersonBasic[];
  
  createdAt: string;
  updatedAt: string;
}

export interface PersonBasic {
  id: string;
  firstName: string;
  lastName: string;
}

export interface CreatePersonData {
  firstName: string;
  lastName: string;
  gender?: 'MALE' | 'FEMALE' | 'UNKNOWN';
  birthYear?: number;
  deathYear?: number;
  dateOfBirth?: string; // ISO date string
  dateOfDeath?: string; // ISO date string
  location?: string;
  fatherId?: string;
  motherId?: string;
  spouseId?: string;
}

export interface TreeNode {
  id: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  avatarColor: string;
  birthYear?: number;
  deathYear?: number;
  dateOfBirth?: string;
  dateOfDeath?: string;
  x: number;
  y: number;
  children: TreeNode[];
  spouse?: TreeNode;
  level: number; // Add level for better tree layout
}

export interface FamilyRelationship {
  id: string;
  type: 'parent' | 'child' | 'spouse' | 'sibling';
  personId: string;
  relatedPersonId: string;
  createdAt: string;
}