import { RelationshipType, RelationshipInfo } from '@/types';

export const RELATIONSHIP_CATEGORIES = {
  immediate: {
    label: 'Immediate Family',
    color: 'bg-blue-100 text-blue-800',
    icon: '👨‍👩‍👧‍👦',
  },
  extended: {
    label: 'Extended Family',
    color: 'bg-green-100 text-green-800',
    icon: '🌳',
  },
  step: {
    label: 'Step Family',
    color: 'bg-purple-100 text-purple-800',
    icon: '👥',
  },
  adoptive: {
    label: 'Adoptive Family',
    color: 'bg-pink-100 text-pink-800',
    icon: '💝',
  },
  'in-law': {
    label: 'In-Laws',
    color: 'bg-orange-100 text-orange-800',
    icon: '💒',
  },
  friend: {
    label: 'Friends & Close Relations',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '🤝',
  },
};

export const RELATIONSHIP_DEFINITIONS: Record<RelationshipType, RelationshipInfo> = {
  // Sibling relationships
  SIBLING: {
    type: 'SIBLING',
    label: 'Sibling',
    description: 'Brother or sister (same parents)',
    category: 'immediate',
    isMutual: true,
  },
  HALF_SIBLING: {
    type: 'HALF_SIBLING',
    label: 'Half Sibling',
    description: 'Brother or sister (one shared parent)',
    category: 'immediate',
    isMutual: true,
  },
  STEP_SIBLING: {
    type: 'STEP_SIBLING',
    label: 'Step Sibling',
    description: 'Step brother or sister',
    category: 'step',
    isMutual: true,
  },

  // Grandparent relationships
  GRANDPARENT: {
    type: 'GRANDPARENT',
    label: 'Grandparent',
    description: 'Grandmother or grandfather',
    category: 'extended',
    isMutual: false,
    reverseType: 'GRANDCHILD',
  },
  GRANDCHILD: {
    type: 'GRANDCHILD',
    label: 'Grandchild',
    description: 'Grandson or granddaughter',
    category: 'extended',
    isMutual: false,
    reverseType: 'GRANDPARENT',
  },

  // Extended family
  AUNT_UNCLE: {
    type: 'AUNT_UNCLE',
    label: 'Aunt/Uncle',
    description: 'Aunt or uncle',
    category: 'extended',
    isMutual: false,
    reverseType: 'NIECE_NEPHEW',
  },
  NIECE_NEPHEW: {
    type: 'NIECE_NEPHEW',
    label: 'Niece/Nephew',
    description: 'Niece or nephew',
    category: 'extended',
    isMutual: false,
    reverseType: 'AUNT_UNCLE',
  },

  // Cousin relationships
  FIRST_COUSIN: {
    type: 'FIRST_COUSIN',
    label: 'First Cousin',
    description: 'First cousin',
    category: 'extended',
    isMutual: true,
  },
  SECOND_COUSIN: {
    type: 'SECOND_COUSIN',
    label: 'Second Cousin',
    description: 'Second cousin',
    category: 'extended',
    isMutual: true,
  },

  // In-law relationships
  PARENT_IN_LAW: {
    type: 'PARENT_IN_LAW',
    label: 'Parent-in-Law',
    description: 'Mother-in-law or father-in-law',
    category: 'in-law',
    isMutual: false,
    reverseType: 'CHILD_IN_LAW',
  },
  CHILD_IN_LAW: {
    type: 'CHILD_IN_LAW',
    label: 'Child-in-Law',
    description: 'Son-in-law or daughter-in-law',
    category: 'in-law',
    isMutual: false,
    reverseType: 'PARENT_IN_LAW',
  },
  SIBLING_IN_LAW: {
    type: 'SIBLING_IN_LAW',
    label: 'Sibling-in-Law',
    description: 'Brother-in-law or sister-in-law',
    category: 'in-law',
    isMutual: true,
  },

  // Step relationships
  STEP_PARENT: {
    type: 'STEP_PARENT',
    label: 'Step Parent',
    description: 'Step mother or step father',
    category: 'step',
    isMutual: false,
    reverseType: 'STEP_CHILD',
  },
  STEP_CHILD: {
    type: 'STEP_CHILD',
    label: 'Step Child',
    description: 'Step son or step daughter',
    category: 'step',
    isMutual: false,
    reverseType: 'STEP_PARENT',
  },

  // Godparent relationships
  GODPARENT: {
    type: 'GODPARENT',
    label: 'Godparent',
    description: 'Godmother or godfather',
    category: 'friend',
    isMutual: false,
    reverseType: 'GODCHILD',
  },
  GODCHILD: {
    type: 'GODCHILD',
    label: 'Godchild',
    description: 'Godson or goddaughter',
    category: 'friend',
    isMutual: false,
    reverseType: 'GODPARENT',
  },

  // Adoptive relationships
  ADOPTIVE_PARENT: {
    type: 'ADOPTIVE_PARENT',
    label: 'Adoptive Parent',
    description: 'Adoptive mother or father',
    category: 'adoptive',
    isMutual: false,
    reverseType: 'ADOPTIVE_CHILD',
  },
  ADOPTIVE_CHILD: {
    type: 'ADOPTIVE_CHILD',
    label: 'Adoptive Child',
    description: 'Adopted son or daughter',
    category: 'adoptive',
    isMutual: false,
    reverseType: 'ADOPTIVE_PARENT',
  },

  // Guardian relationships
  GUARDIAN: {
    type: 'GUARDIAN',
    label: 'Guardian',
    description: 'Legal guardian',
    category: 'friend',
    isMutual: false,
    reverseType: 'WARD',
  },
  WARD: {
    type: 'WARD',
    label: 'Ward',
    description: 'Legal ward',
    category: 'friend',
    isMutual: false,
    reverseType: 'GUARDIAN',
  },

  // Friend relationships
  CLOSE_FRIEND: {
    type: 'CLOSE_FRIEND',
    label: 'Close Friend',
    description: 'Close personal friend',
    category: 'friend',
    isMutual: true,
  },
  FAMILY_FRIEND: {
    type: 'FAMILY_FRIEND',
    label: 'Family Friend',
    description: 'Family friend',
    category: 'friend',
    isMutual: true,
  },
};

export function getRelationshipInfo(type: RelationshipType): RelationshipInfo {
  return RELATIONSHIP_DEFINITIONS[type];
}

export function getCategoryInfo(category: string) {
  return RELATIONSHIP_CATEGORIES[category as keyof typeof RELATIONSHIP_CATEGORIES];
}

export function getRelationshipsByCategory() {
  const categories: Record<string, RelationshipInfo[]> = {};
  
  Object.values(RELATIONSHIP_DEFINITIONS).forEach(relationship => {
    if (!categories[relationship.category]) {
      categories[relationship.category] = [];
    }
    categories[relationship.category].push(relationship);
  });
  
  return categories;
}

export function getGenderSpecificLabel(relationship: RelationshipInfo, gender: 'MALE' | 'FEMALE' | 'UNKNOWN'): string {
  const genderMap: Record<string, Record<string, string>> = {
    SIBLING: {
      MALE: 'Brother',
      FEMALE: 'Sister',
      UNKNOWN: 'Sibling',
    },
    HALF_SIBLING: {
      MALE: 'Half Brother',
      FEMALE: 'Half Sister',
      UNKNOWN: 'Half Sibling',
    },
    STEP_SIBLING: {
      MALE: 'Step Brother',
      FEMALE: 'Step Sister',
      UNKNOWN: 'Step Sibling',
    },
    GRANDPARENT: {
      MALE: 'Grandfather',
      FEMALE: 'Grandmother',
      UNKNOWN: 'Grandparent',
    },
    GRANDCHILD: {
      MALE: 'Grandson',
      FEMALE: 'Granddaughter',
      UNKNOWN: 'Grandchild',
    },
    AUNT_UNCLE: {
      MALE: 'Uncle',
      FEMALE: 'Aunt',
      UNKNOWN: 'Aunt/Uncle',
    },
    NIECE_NEPHEW: {
      MALE: 'Nephew',
      FEMALE: 'Niece',
      UNKNOWN: 'Niece/Nephew',
    },
    PARENT_IN_LAW: {
      MALE: 'Father-in-Law',
      FEMALE: 'Mother-in-Law',
      UNKNOWN: 'Parent-in-Law',
    },
    CHILD_IN_LAW: {
      MALE: 'Son-in-Law',
      FEMALE: 'Daughter-in-Law',
      UNKNOWN: 'Child-in-Law',
    },
    SIBLING_IN_LAW: {
      MALE: 'Brother-in-Law',
      FEMALE: 'Sister-in-Law',
      UNKNOWN: 'Sibling-in-Law',
    },
    STEP_PARENT: {
      MALE: 'Step Father',
      FEMALE: 'Step Mother',
      UNKNOWN: 'Step Parent',
    },
    STEP_CHILD: {
      MALE: 'Step Son',
      FEMALE: 'Step Daughter',
      UNKNOWN: 'Step Child',
    },
    GODPARENT: {
      MALE: 'Godfather',
      FEMALE: 'Godmother',
      UNKNOWN: 'Godparent',
    },
    GODCHILD: {
      MALE: 'Godson',
      FEMALE: 'Goddaughter',
      UNKNOWN: 'Godchild',
    },
    ADOPTIVE_PARENT: {
      MALE: 'Adoptive Father',
      FEMALE: 'Adoptive Mother',
      UNKNOWN: 'Adoptive Parent',
    },
    ADOPTIVE_CHILD: {
      MALE: 'Adopted Son',
      FEMALE: 'Adopted Daughter',
      UNKNOWN: 'Adopted Child',
    },
  };

  return genderMap[relationship.type]?.[gender] || relationship.label;
}

export function getReverseRelationshipType(type: RelationshipType): RelationshipType | undefined {
  const info = getRelationshipInfo(type);
  return info.reverseType || (info.isMutual ? type : undefined);
}