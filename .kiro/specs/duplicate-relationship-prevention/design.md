# Design Document

## Overview

The duplicate relationship prevention feature will enhance the existing family tree application by implementing comprehensive duplicate detection and prevention mechanisms. The current system has basic duplicate checking in the API but lacks comprehensive validation that considers bidirectional relationships and relationship semantics. This design addresses the root causes of duplicate relationships and provides both preventive measures and cleanup capabilities.

## Architecture

### Current System Analysis

The existing system has these components:
- **Frontend**: `RelationshipManager.tsx` component for managing relationships
- **API**: `/api/relationships` route with basic duplicate checking
- **Database**: Prisma schema with unique constraint on `[personFromId, personToId, type]`
- **Utils**: `relationship-utils.ts` with relationship definitions and logic

### Problem Identification

1. **Incomplete Duplicate Detection**: Current system only checks exact matches (same personFromId, personToId, type)
2. **Bidirectional Relationship Issues**: Doesn't properly handle cases where A->B relationship exists but B->A is attempted
3. **Semantic Relationship Conflicts**: Doesn't detect conflicting relationship types between same people
4. **UI Filtering Issues**: Frontend filtering doesn't account for all relationship scenarios

## Components and Interfaces

### 1. Enhanced Duplicate Detection Service

**Location**: `src/lib/duplicate-detection.ts`

```typescript
interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingRelationship?: Relationship;
  conflictType: 'EXACT_MATCH' | 'BIDIRECTIONAL_CONFLICT' | 'SEMANTIC_CONFLICT' | 'NONE';
  suggestedAction: 'PREVENT' | 'EDIT_EXISTING' | 'REPLACE_EXISTING';
  message: string;
}

interface RelationshipConflictRule {
  relationshipType: RelationshipType;
  conflictsWith: RelationshipType[];
  resolution: 'PREVENT' | 'REPLACE' | 'ALLOW_MULTIPLE';
}
```

### 2. Enhanced API Validation

**Location**: `src/app/api/relationships/route.ts` (modifications)

- Comprehensive duplicate checking before creation
- Bidirectional relationship validation
- Semantic conflict detection
- Enhanced error responses with suggested actions

### 3. Frontend Relationship Manager Enhancements

**Location**: `src/components/RelationshipManager.tsx` (modifications)

- Real-time duplicate detection during form input
- Enhanced error handling with actionable suggestions
- Edit existing relationship functionality
- Duplicate cleanup interface

### 4. Database Cleanup Utilities

**Location**: `src/lib/relationship-cleanup.ts`

```typescript
interface CleanupResult {
  duplicatesFound: number;
  duplicatesRemoved: number;
  conflictsResolved: number;
  errors: string[];
}
```

## Data Models

### Enhanced Relationship Validation

The existing Prisma schema already has a unique constraint, but we'll enhance the validation logic:

```prisma
// Existing constraint is good:
@@unique([personFromId, personToId, type])
```

### New Validation Rules

1. **Bidirectional Validation**: Check both directions for mutual relationships
2. **Semantic Validation**: Prevent conflicting relationship types
3. **Temporal Validation**: Consider relationship hierarchy and logic

## Error Handling

### Enhanced Error Types

```typescript
enum RelationshipErrorType {
  EXACT_DUPLICATE = 'EXACT_DUPLICATE',
  BIDIRECTIONAL_CONFLICT = 'BIDIRECTIONAL_CONFLICT', 
  SEMANTIC_CONFLICT = 'SEMANTIC_CONFLICT',
  INVALID_RELATIONSHIP = 'INVALID_RELATIONSHIP'
}

interface RelationshipError {
  type: RelationshipErrorType;
  message: string;
  existingRelationship?: Relationship;
  suggestedActions: RelationshipAction[];
}

interface RelationshipAction {
  type: 'EDIT_EXISTING' | 'REMOVE_EXISTING' | 'CANCEL';
  label: string;
  description: string;
}
```

### User-Friendly Error Messages

- **Exact Duplicate**: "A [relationship type] relationship already exists between [Person A] and [Person B]"
- **Bidirectional Conflict**: "[Person B] is already marked as [Person A]'s [relationship]. Would you like to edit this relationship instead?"
- **Semantic Conflict**: "Cannot add [new relationship] because [Person A] and [Person B] already have a [existing relationship] relationship"

## Testing Strategy

### Unit Tests

1. **Duplicate Detection Logic**
   - Test all duplicate scenarios (exact, bidirectional, semantic)
   - Test relationship conflict rules
   - Test cleanup algorithms

2. **API Validation**
   - Test enhanced POST endpoint validation
   - Test error response formats
   - Test edge cases and boundary conditions

3. **Frontend Components**
   - Test form validation and error display
   - Test user interaction flows
   - Test edit existing relationship functionality

### Integration Tests

1. **End-to-End Relationship Creation**
   - Test complete flow from UI to database
   - Test error handling and user feedback
   - Test cleanup operations

2. **Database Consistency**
   - Test relationship integrity after operations
   - Test cleanup doesn't break valid relationships
   - Test concurrent relationship creation

### Manual Testing Scenarios

1. **Duplicate Prevention**
   - Attempt to create exact duplicate relationships
   - Attempt to create bidirectional conflicts
   - Attempt to create semantic conflicts

2. **Cleanup Operations**
   - Test cleanup on database with existing duplicates
   - Verify data integrity after cleanup
   - Test cleanup progress and error reporting

## Implementation Approach

### Phase 1: Enhanced Duplicate Detection
- Create comprehensive duplicate detection service
- Implement relationship conflict rules
- Add semantic validation logic

### Phase 2: API Enhancement
- Enhance POST endpoint with new validation
- Improve error responses with suggested actions
- Add cleanup endpoint for existing duplicates

### Phase 3: Frontend Improvements
- Add real-time duplicate detection to form
- Implement edit existing relationship functionality
- Add duplicate cleanup interface
- Enhance error handling and user feedback

### Phase 4: Database Cleanup
- Create cleanup utilities for existing data
- Implement safe cleanup algorithms
- Add progress reporting and error handling

## Security Considerations

1. **Data Integrity**: Ensure cleanup operations maintain referential integrity
2. **Concurrent Access**: Handle concurrent relationship creation safely
3. **Validation**: Server-side validation cannot be bypassed
4. **Error Information**: Don't expose sensitive data in error messages

## Performance Considerations

1. **Efficient Queries**: Optimize duplicate detection queries
2. **Batch Operations**: Implement efficient cleanup for large datasets
3. **Caching**: Cache relationship rules and validation logic
4. **Progressive Enhancement**: Real-time validation without blocking UI

## Monitoring and Logging

1. **Duplicate Detection Events**: Log when duplicates are prevented
2. **Cleanup Operations**: Log cleanup results and any issues
3. **Error Tracking**: Monitor relationship creation errors
4. **Performance Metrics**: Track validation and cleanup performance