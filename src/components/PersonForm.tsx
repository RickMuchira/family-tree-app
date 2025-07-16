'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { X, Save, User, Calendar, Heart, Users, Baby, UserPlus, Crown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Person, CreatePersonData, RelationshipType } from '@/types';
import { getRelationshipsByCategory, getCategoryInfo, getRelationshipInfo } from '@/lib/relationship-utils';
import axios from 'axios';

const personSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  gender: z.enum(['MALE', 'FEMALE', 'UNKNOWN']).default('UNKNOWN'),
  birthYear: z.union([z.number().min(1900).max(new Date().getFullYear()), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  deathYear: z.union([z.number().min(1900).max(new Date().getFullYear()), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  dateOfBirth: z.string().optional(),
  dateOfDeath: z.string().optional(),
  location: z.string().optional(),
  relationshipType: z.enum([
    'none', 'child', 'spouse', 'parent',
    'SIBLING', 'HALF_SIBLING', 'STEP_SIBLING',
    'GRANDPARENT', 'GRANDCHILD',
    'AUNT_UNCLE', 'NIECE_NEPHEW',
    'FIRST_COUSIN', 'SECOND_COUSIN',
    'PARENT_IN_LAW', 'CHILD_IN_LAW', 'SIBLING_IN_LAW',
    'STEP_PARENT', 'STEP_CHILD',
    'GODPARENT', 'GODCHILD',
    'ADOPTIVE_PARENT', 'ADOPTIVE_CHILD',
    'GUARDIAN', 'WARD',
    'CLOSE_FRIEND', 'FAMILY_FRIEND'
  ]).default('none'),
  relatedPersonId: z.string().optional(),
}).refine(
  (data) => {
    // Death year must be equal to or greater than birth year (only if both are provided)
    if (
      typeof data.birthYear === 'number' &&
      typeof data.deathYear === 'number' &&
      !isNaN(data.birthYear) &&
      !isNaN(data.deathYear)
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
).refine(
  (data) => {
    // If relationship type is not 'none', relatedPersonId is required
    if (data.relationshipType !== 'none' && !data.relatedPersonId) {
      return false;
    }
    return true;
  },
  {
    message: 'Please select a person for this relationship',
    path: ['relatedPersonId'],
  }
);

type PersonFormData = z.infer<typeof personSchema>;

interface PersonFormProps {
  person?: Person | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function PersonForm({ person, onClose, onSuccess }: PersonFormProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(person);

  const { data: allPersons = [] } = useQuery({
    queryKey: ['persons'],
    queryFn: async () => {
      const response = await axios.get('/api/persons');
      return response.data as Person[];
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PersonFormData>({
    resolver: zodResolver(personSchema),
    defaultValues: person ? {
      firstName: person.firstName,
      lastName: person.lastName,
      gender: person.gender,
      birthYear: person.birthYear || undefined,
      deathYear: person.deathYear || undefined,
      dateOfBirth: person.dateOfBirth || undefined,
      dateOfDeath: person.dateOfDeath || undefined,
      location: person.location || undefined,
      relationshipType: 'none',
      relatedPersonId: undefined,
    } : {
      gender: 'UNKNOWN',
      relationshipType: 'none',
    },
  });

  const watchedGender = watch('gender');
  const watchedFirstName = watch('firstName');
  const watchedLastName = watch('lastName');
  const watchedRelationshipType = watch('relationshipType');
  const watchedRelatedPersonId = watch('relatedPersonId');

  const createMutation = useMutation({
    mutationFn: async (data: CreatePersonData & { relationshipType?: string; relatedPersonId?: string }) => {
      // Create the person first
      const { relationshipType, relatedPersonId, ...personData } = data;
      const response = await axios.post('/api/persons', personData);
      const newPerson = response.data;

      // Handle relationship creation
      if (relationshipType && relationshipType !== 'none' && relatedPersonId) {
        await handleRelationshipCreation(newPerson.id, relationshipType, relatedPersonId);
      }

      return newPerson;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      toast.success('Family member added successfully!');
      onSuccess();
    },
    onError: () => {
      toast.error('Failed to add family member');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CreatePersonData) => {
      const { relationshipType, relatedPersonId, ...personData } = data as any;
      const response = await axios.put(`/api/persons/${person!.id}`, personData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      toast.success('Family member updated successfully!');
      onSuccess();
    },
    onError: () => {
      toast.error('Failed to update family member');
    },
  });

  const handleRelationshipCreation = async (newPersonId: string, relationshipType: string, relatedPersonId: string) => {
    try {
      const relatedPerson = allPersons.find(p => p.id === relatedPersonId);
      if (!relatedPerson) return;

      // Handle basic relationships (parent, child, spouse)
      if (['child', 'parent', 'spouse'].includes(relationshipType)) {
        let updateData: any = {};

        switch (relationshipType) {
          case 'child':
            // New person is a child of the related person
            if (relatedPerson.gender === 'MALE') {
              updateData.fatherId = relatedPersonId;
            } else if (relatedPerson.gender === 'FEMALE') {
              updateData.motherId = relatedPersonId;
            }
            break;
          
          case 'parent':
            // New person is a parent of the related person
            if (watchedGender === 'MALE') {
              await axios.put(`/api/persons/${relatedPersonId}`, { fatherId: newPersonId });
            } else if (watchedGender === 'FEMALE') {
              await axios.put(`/api/persons/${relatedPersonId}`, { motherId: newPersonId });
            }
            break;
          
          case 'spouse':
            // Mutual spouse relationship
            updateData.spouseId = relatedPersonId;
            await axios.put(`/api/persons/${relatedPersonId}`, { spouseId: newPersonId });
            break;
        }

        if (Object.keys(updateData).length > 0) {
          await axios.put(`/api/persons/${newPersonId}`, updateData);
        }
      } else {
        // Handle extended relationships through the relationships API
        await axios.post('/api/relationships', {
          type: relationshipType,
          personFromId: newPersonId,
          personToId: relatedPersonId,
        });
      }
    } catch (error) {
      console.error('Failed to create relationship:', error);
    }
  };

  const onSubmit = (data: PersonFormData) => {
    const submitData: CreatePersonData & { relationshipType?: string; relatedPersonId?: string } = {
      firstName: data.firstName,
      lastName: data.lastName,
      gender: data.gender,
      birthYear: data.birthYear || undefined,
      deathYear: data.deathYear || undefined,
      dateOfBirth: data.dateOfBirth || undefined,
      dateOfDeath: data.dateOfDeath || undefined,
      location: data.location || undefined,
      relationshipType: data.relationshipType,
      relatedPersonId: data.relatedPersonId,
    };

    if (isEditing) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const getGenderColor = (gender: string) => {
    switch (gender) {
      case 'MALE': return '#3B82F6';
      case 'FEMALE': return '#EC4899';
      default: return '#6B7280';
    }
  };

  const getAvailablePersonsForRelationship = () => {
    const excludeCurrentPerson = allPersons.filter(p => p.id !== person?.id);
    
    switch (watchedRelationshipType) {
      case 'parent':
        // Anyone can be a parent
        return excludeCurrentPerson;
      case 'child':
        // Anyone can be a child
        return excludeCurrentPerson;
      case 'spouse':
        // Anyone can be a spouse (though typically opposite gender)
        return excludeCurrentPerson;
      default:
        return excludeCurrentPerson;
    }
  };

  const getRelationshipDescription = () => {
    const relatedPerson = allPersons.find(p => p.id === watchedRelatedPersonId);
    if (!relatedPerson || watchedRelationshipType === 'none') return '';

    const newPersonName = `${watchedFirstName || 'This person'} ${watchedLastName || ''}`.trim();
    const relatedPersonName = `${relatedPerson.firstName} ${relatedPerson.lastName}`;

    // Handle basic relationships
    switch (watchedRelationshipType) {
      case 'child':
        return `${newPersonName} will be a child of ${relatedPersonName}`;
      case 'parent':
        return `${newPersonName} will be a parent of ${relatedPersonName}`;
      case 'spouse':
        return `${newPersonName} will be married to ${relatedPersonName}`;
    }

    // Handle extended relationships
    const relationshipInfo = getRelationshipInfo(watchedRelationshipType as RelationshipType);
    if (relationshipInfo) {
      return `${newPersonName} will be a ${relationshipInfo.label.toLowerCase()} of ${relatedPersonName}`;
    }

    return '';
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName || !lastName) return '?';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>{isEditing ? 'Edit Family Member' : 'Add Family Member'}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Preview */}
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback 
                  style={{ backgroundColor: getGenderColor(watchedGender) }}
                >
                  <span className="text-white font-medium text-lg">
                    {getInitials(watchedFirstName, watchedLastName)}
                  </span>
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  {watchedFirstName || 'First'} {watchedLastName || 'Last'}
                </h3>
                <p className="text-sm text-gray-600 capitalize">
                  {watchedGender.toLowerCase()}
                </p>
                {getRelationshipDescription() && (
                  <p className="text-sm text-blue-600 mt-1">
                    {getRelationshipDescription()}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center">
              <User className="h-5 w-5 mr-2" />
              Basic Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  {...register('firstName')}
                  placeholder="Enter first name"
                  className="mt-1"
                />
                {errors.firstName && (
                  <p className="text-sm text-red-600 mt-1">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  {...register('lastName')}
                  placeholder="Enter last name"
                  className="mt-1"
                />
                {errors.lastName && (
                  <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Gender</Label>
                <Select
                  value={watchedGender}
                  onValueChange={(value) => setValue('gender', value as any)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="UNKNOWN">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  {...register('location')}
                  placeholder="e.g. New York, USA"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Dates Section - Updated to remove year fields */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Important Dates
            </h3>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Birth Information */}
              <div className="space-y-3">
                <h4 className="font-medium text-green-700">Birth Information</h4>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="birthYear">Birth Year *</Label>
                    <Input
                      id="birthYear"
                      type="number"
                      {...register('birthYear', { 
                        valueAsNumber: true,
                        setValueAs: (value) => value === '' ? undefined : Number(value)
                      })}
                      placeholder="e.g. 1990"
                      className="mt-1"
                    />
                    {errors.birthYear && (
                      <p className="text-sm text-red-600 mt-1">{errors.birthYear.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="dateOfBirth">Full Date of Birth (Optional)</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      {...register('dateOfBirth')}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty if you only know the birth year
                    </p>
                    {errors.dateOfBirth && (
                      <p className="text-sm text-red-600 mt-1">{errors.dateOfBirth.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Death Information */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Death Information (Optional)</h4>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="deathYear">Death Year</Label>
                    <Input
                      id="deathYear"
                      type="number"
                      {...register('deathYear', { 
                        valueAsNumber: true,
                        setValueAs: (value) => value === '' ? undefined : Number(value)
                      })}
                      placeholder="Leave empty if alive"
                      className="mt-1"
                    />
                    {errors.deathYear && (
                      <p className="text-sm text-red-600 mt-1">{errors.deathYear.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="dateOfDeath">Full Date of Death (Optional)</Label>
                    <Input
                      id="dateOfDeath"
                      type="date"
                      {...register('dateOfDeath')}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty if you only know the death year
                    </p>
                    {errors.dateOfDeath && (
                      <p className="text-sm text-red-600 mt-1">{errors.dateOfDeath.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Relationships - Only show for new persons */}
          {!isEditing && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center">
                <Heart className="h-5 w-5 mr-2" />
                Family Relationship
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Relationship Type</Label>
                  <Select
                    value={watchedRelationshipType}
                    onValueChange={(value) => {
                      setValue('relationshipType', value as any);
                      setValue('relatedPersonId', undefined);
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-96">
                      <SelectItem value="none">No relationship now</SelectItem>
                      
                      {/* Basic Relationships */}
                      <SelectItem value="child">
                        <div className="flex items-center">
                          <Baby className="h-4 w-4 mr-2" />
                          Child of someone
                        </div>
                      </SelectItem>
                      <SelectItem value="parent">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          Parent of someone
                        </div>
                      </SelectItem>
                      <SelectItem value="spouse">
                        <div className="flex items-center">
                          <Heart className="h-4 w-4 mr-2" />
                          Married to someone
                        </div>
                      </SelectItem>
                      
                      {/* Extended Relationships by Category */}
                      {Object.entries(getRelationshipsByCategory()).map(([category, relationships]) => (
                        <div key={category}>
                          <div className="px-2 py-1.5 text-xs font-medium text-gray-500 bg-gray-50">
                            {getCategoryInfo(category)?.icon} {getCategoryInfo(category)?.label}
                          </div>
                          {relationships.map((relationship) => (
                            <SelectItem key={relationship.type} value={relationship.type}>
                              <div className="flex items-center">
                                <span className="text-sm">{relationship.label}</span>
                                <span className="text-xs text-gray-500 ml-2">
                                  {relationship.description}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {watchedRelationshipType !== 'none' && (
                  <div>
                    <Label>Select Person</Label>
                    <Select
                      value={watchedRelatedPersonId || 'none'}
                      onValueChange={(value) => setValue('relatedPersonId', value === 'none' ? undefined : value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choose a person" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select a person</SelectItem>
                        {getAvailablePersonsForRelationship().map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: p.avatarColor }}
                              />
                              <span>{p.firstName} {p.lastName}</span>
                              <span className="text-xs text-gray-500">
                                ({p.gender.toLowerCase()})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.relatedPersonId && (
                      <p className="text-sm text-red-600 mt-1">{errors.relatedPersonId.message}</p>
                    )}
                  </div>
                )}
              </div>

              {getRelationshipDescription() && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">{getRelationshipDescription()}</p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || updateMutation.isPending}
              className="min-w-[120px]"
            >
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? 'Update' : 'Add'} Member
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}