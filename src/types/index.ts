export interface Person {
  dateOfBirth?: string;
  id: string;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  birthYear?: number;
  deathYear?: number;
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
  dateOfBirth?: string;
  firstName: string;
  lastName: string;
  gender?: 'MALE' | 'FEMALE' | 'UNKNOWN';
  birthYear?: number;
  deathYear?: number;
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
  x: number;
  y: number;
  children: TreeNode[];
  spouse?: TreeNode;
}