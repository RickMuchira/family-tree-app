'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { X, Save, User } from 'lucide-react';
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
import { toast } from 'sonner';
import { Person, CreatePersonData } from '@/types';
import axios from 'axios';

const personSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  gender: z.enum(['MALE', 'FEMALE', 'UNKNOWN']).default('UNKNOWN'),
  birthYear: z.number().min(1900).max(new Date().getFullYear()).optional(),
  deathYear: z.number().min(1900).max(new Date().getFullYear()).optional(),
  dateOfBirth: z.string().optional(), // New optional field (ISO date string)
  location: z.string().optional(),
  fatherId: z.string().optional(),
  motherId: z.string().optional(),
  spouseId: z.string().optional(),
}).refine(
  (data) => {
    if (
      typeof data.birthYear === 'number' &&
      typeof data.deathYear === 'number'
    ) {
      return data.deathYear >= data.birthYear;
    }
    return true;
  },
  {
    message: 'Year of death must not be less than year of birth',
    path: ['deathYear'],
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
      location: person.location || undefined,
      fatherId: person.fatherId || undefined,
      motherId: person.motherId || undefined,
      spouseId: person.spouseId || undefined,
    } : {
      gender: 'UNKNOWN',
    },
  });

  const watchedGender = watch('gender');
  const watchedFirstName = watch('firstName');
  const watchedLastName = watch('lastName');

  const createMutation = useMutation({
    mutationFn: async (data: CreatePersonData) => {
      const response = await axios.post('/api/persons', data);
      return response.data;
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
      const response = await axios.put(`/api/persons/${person!.id}`, data);
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

  const onSubmit = (data: PersonFormData) => {
    const submitData: CreatePersonData = {
      ...data,
      birthYear: data.birthYear || undefined,
      deathYear: data.deathYear || undefined,
      location: data.location || undefined,
      fatherId: data.fatherId || undefined,
      motherId: data.motherId || undefined,
      spouseId: data.spouseId || undefined,
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

  const getAvailableRelatives = (excludeId?: string) => {
    return allPersons.filter(p => p.id !== excludeId && p.id !== person?.id);
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName || !lastName) return '?';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>{isEditing ? 'Edit Family Member' : 'Add Family Member'}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Preview */}
          <Card className="p-4 bg-gray-50">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback 
                  style={{ backgroundColor: getGenderColor(watchedGender) }}
                >
                  <span className="text-white font-medium">
                    {getInitials(watchedFirstName, watchedLastName)}
                  </span>
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">
                  {watchedFirstName || 'First'} {watchedLastName || 'Last'}
                </h3>
                <p className="text-sm text-gray-600 capitalize">
                  {watchedGender.toLowerCase()}
                </p>
              </div>
            </div>
          </Card>

          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                {...register('firstName')}
                placeholder="Enter first name"
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
              />
              {errors.lastName && (
                <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>
              )}
            </div>
          </div>

           <div className="grid grid-cols-4 gap-4">
            <div>
              <Label>Gender</Label>
              <Select
                value={watchedGender}
                onValueChange={(value) => setValue('gender', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="UNKNOWN">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="birthYear">Birth Year</Label>
              <Input
                id="birthYear"
                type="number"
                {...register('birthYear', { valueAsNumber: true })}
                placeholder="e.g. 1990"
              />
              {errors.birthYear && (
                <p className="text-sm text-red-600 mt-1">{errors.birthYear.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="deathYear">Death Year</Label>
              <Input
                id="deathYear"
                type="number"
                {...register('deathYear', { valueAsNumber: true })}
                placeholder="Leave empty if alive"
              />
              {errors.deathYear && (
                <p className="text-sm text-red-600 mt-1">{errors.deathYear.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                {...register('dateOfBirth')}
                placeholder="YYYY-MM-DD"
              />
              {errors.dateOfBirth && (
                <p className="text-sm text-red-600 mt-1">{errors.dateOfBirth.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              {...register('location')}
              placeholder="e.g. New York, USA"
            />
          </div>

          {/* Relationships */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Family Relationships</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>Father</Label>
                <Select
                  value={watch('fatherId') || 'none'}
                  onValueChange={(value) => setValue('fatherId', value === 'none' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select father" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {getAvailableRelatives().filter(p => p.gender === 'MALE').map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Mother</Label>
                <Select
                  value={watch('motherId') || 'none'}
                  onValueChange={(value) => setValue('motherId', value === 'none' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mother" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {getAvailableRelatives().filter(p => p.gender === 'FEMALE').map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Spouse</Label>
                <Select
                  value={watch('spouseId') || 'none'}
                  onValueChange={(value) => setValue('spouseId', value === 'none' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select spouse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {getAvailableRelatives().map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-1" />
              {isEditing ? 'Update' : 'Add'} Family Member
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}