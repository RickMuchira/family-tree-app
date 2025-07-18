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
  profilePhoto?: string; // Base64 encoded image
  fatherId?: string;
  motherId?: string;
  spouseId?: string;
  
  // Direct relations
  father?: PersonBasic;
  mother?: PersonBasic;
  spouse?: PersonBasic;
  fatherChildren?: PersonBasic[];
  motherChildren?: PersonBasic[];
  
  // Extended relationships
  relationshipsFrom?: Relationship[];
  relationshipsTo?: Relationship[];
  
  createdAt: string;
  updatedAt: string;
}

export interface PersonBasic {
  id: string;
  firstName: string;
  lastName: string;
  gender?: 'MALE' | 'FEMALE' | 'UNKNOWN';
  avatarColor?: string;
  profilePhoto?: string; // Base64 encoded image
}

export interface Relationship {
  id: string;
  type: RelationshipType;
  personFromId: string;
  personToId: string;
  personFrom?: PersonBasic;
  personTo?: PersonBasic;
  createdAt: string;
  updatedAt: string;
}

export type RelationshipType = 
  // Sibling relationships
  | 'SIBLING'
  | 'HALF_SIBLING'
  | 'STEP_SIBLING'
  
  // Grandparent relationships
  | 'GRANDPARENT'
  | 'GRANDCHILD'
  
  // Extended family
  | 'AUNT_UNCLE'
  | 'NIECE_NEPHEW'
  
  // Cousin relationships
  | 'FIRST_COUSIN'
  | 'SECOND_COUSIN'
  
  // In-law relationships
  | 'PARENT_IN_LAW'
  | 'CHILD_IN_LAW'
  | 'SIBLING_IN_LAW'
  
  // Step relationships
  | 'STEP_PARENT'
  | 'STEP_CHILD'
  
  // Godparent relationships
  | 'GODPARENT'
  | 'GODCHILD'
  
  // Adoptive relationships
  | 'ADOPTIVE_PARENT'
  | 'ADOPTIVE_CHILD'
  
  // Guardian relationships
  | 'GUARDIAN'
  | 'WARD'
  
  // Friend/Close relationships
  | 'CLOSE_FRIEND'
  | 'FAMILY_FRIEND';

export interface CreatePersonData {
  firstName: string;
  lastName: string;
  gender?: 'MALE' | 'FEMALE' | 'UNKNOWN';
  birthYear?: number;
  deathYear?: number;
  dateOfBirth?: string; // ISO date string
  dateOfDeath?: string; // ISO date string
  location?: string;
  profilePhoto?: string; // Base64 encoded image
  fatherId?: string;
  motherId?: string;
  spouseId?: string;
}

export interface CreateRelationshipData {
  type: RelationshipType;
  personFromId: string;
  personToId: string;
}

export interface TreeNode {
  id: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  avatarColor: string;
  profilePhoto?: string; // Base64 encoded image
  birthYear?: number;
  deathYear?: number;
  dateOfBirth?: string;
  dateOfDeath?: string;
  x: number;
  y: number;
  children: TreeNode[];
  spouse?: TreeNode;
  level: number;
  relationships?: Relationship[];
}

export interface FamilyRelationship {
  id: string;
  type: 'parent' | 'child' | 'spouse' | 'sibling' | RelationshipType;
  personId: string;
  relatedPersonId: string;
  createdAt: string;
}

// Helper interface for relationship display
export interface RelationshipInfo {
  type: RelationshipType;
  label: string;
  description: string;
  category: 'immediate' | 'extended' | 'step' | 'adoptive' | 'in-law' | 'friend';
  isMutual: boolean; // Whether the relationship is automatically mutual
  reverseType?: RelationshipType; // What the reverse relationship should be
}

// Enhanced filter and export types
export interface TreeFilterOptions {
  searchTerm: string;
  focusPersonId: string | null;
  showGenerations: number[];
  showLiving: boolean;
  showDeceased: boolean;
  showWithPhotos: boolean;
  maxGenerations: number;
  showOnlyDirectFamily?: boolean;
  birthYearRange?: { min?: number; max?: number };
  deathYearRange?: { min?: number; max?: number };
  locationFilter?: string;
}

export interface ExportOptions {
  format: 'PNG' | 'SVG' | 'JSON' | 'PDF';
  includePhotos: boolean;
  includeExtendedInfo: boolean;
  resolution?: 'low' | 'medium' | 'high';
  paperSize?: 'A4' | 'A3' | 'Letter' | 'Legal';
}

export interface TreeStatistics {
  totalMembers: number;
  visibleMembers: number;
  generations: number;
  maxDepth: number;
  familyBranches: number;
  livingMembers: number;
  deceasedMembers: number;
  membersWithPhotos: number;
  averageAge: number;
  oldestMember?: PersonBasic;
  youngestMember?: PersonBasic;
  mostRecentBirth?: PersonBasic;
  mostRecentDeath?: PersonBasic;
}

// Enhanced interaction types for tree view
export interface PersonInteraction {
  type: 'click' | 'hover' | 'contextmenu' | 'doubleclick';
  person: Person;
  position: { x: number; y: number };
  event: MouseEvent | TouchEvent;
}

export interface TreeInteractionOptions {
  enableHover: boolean;
  enableContextMenu: boolean;
  enableDoubleClick: boolean;
  enableKeyboardNavigation: boolean;
  showTooltips: boolean;
  highlightRelationships: boolean;
}

// Migration and data management types
export interface ImportData {
  persons: CreatePersonData[];
  relationships: CreateRelationshipData[];
  metadata?: {
    source: string;
    importDate: string;
    version: string;
  };
}

export interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  statistics: {
    personsProcessed: number;
    relationshipsProcessed: number;
    duplicatesFound: number;
    orphanedRecords: number;
  };
}