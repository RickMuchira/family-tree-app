'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Plus, X, Trash2, Users, Heart, Baby, Crown, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Person, RelationshipType, Relationship } from '@/types';
import { 
  getRelationshipsByCategory, 
  getCategoryInfo, 
  getRelationshipInfo,
  getGenderSpecificLabel 
} from '@/lib/relationship-utils';
import axios from 'axios';

const relationshipSchema = z.object({
  type: z.string().min(1, 'Please select a relationship type'),
  relatedPersonId: z.string().min(1, 'Please select a person'),
});

type RelationshipFormData = z.infer<typeof relationshipSchema>;

interface RelationshipManagerProps {
  person: Person;
  onClose: () => void;
}

export function RelationshipManager({ person, onClose }: RelationshipManagerProps) {
  const [isAddingRelationship, setIsAddingRelationship] = useState(false);
  const queryClient = useQueryClient();

  const { data: allPersons = [] } = useQuery({
    queryKey: ['persons'],
    queryFn: async () => {
      const response = await axios.get('/api/persons');
      return response.data as Person[];
    },
  });

  const { data: relationships = [] } = useQuery({
    queryKey: ['relationships', person.id],
    queryFn: async () => {
      const response = await axios.get(`/api/relationships?personId=${person.id}`);
      return response.data as Relationship[];
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RelationshipFormData>({
    resolver: zodResolver(relationshipSchema),
  });

  const watchedType = watch('type');
  const watchedRelatedPersonId = watch('relatedPersonId');

  const createRelationshipMutation = useMutation({
    mutationFn: async (data: RelationshipFormData) => {
      const response = await axios.post('/api/relationships', {
        type: data.type,
        personFromId: person.id,
        personToId: data.relatedPersonId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationships', person.id] });
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      toast.success('Relationship added successfully!');
      reset();
      setIsAddingRelationship(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add relationship');
    },
  });

  const deleteRelationshipMutation = useMutation({
    mutationFn: async (relationshipId: string) => {
      await axios.delete(`/api/relationships?id=${relationshipId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationships', person.id] });
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      toast.success('Relationship removed successfully!');
    },
    onError: () => {
      toast.error('Failed to remove relationship');
    },
  });

  const onSubmit = (data: RelationshipFormData) => {
    createRelationshipMutation.mutate(data);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getAvailablePersons = () => {
    // Filter out the current person and any person already in a relationship
    const existingRelationshipPersonIds = relationships.map(rel => 
      rel.personFromId === person.id ? rel.personToId : rel.personFromId
    );
    
    return allPersons.filter(p => 
      p.id !== person.id && 
      !existingRelationshipPersonIds.includes(p.id)
    );
  };

  const getRelationshipDisplayInfo = (relationship: Relationship) => {
    const isFrom = relationship.personFromId === person.id;
    const relatedPerson = isFrom ? relationship.personTo : relationship.personFrom;
    const relationshipInfo = getRelationshipInfo(relationship.type);
    
    let displayLabel = relationshipInfo.label;
    if (relatedPerson) {
      displayLabel = getGenderSpecificLabel(relationshipInfo, relatedPerson.gender || 'UNKNOWN');
    }
    
    return {
      person: relatedPerson,
      label: displayLabel,
      category: relationshipInfo.category,
      description: relationshipInfo.description,
    };
  };

  const groupedRelationships = relationships.reduce((acc, rel) => {
    const info = getRelationshipDisplayInfo(rel);
    if (!acc[info.category]) {
      acc[info.category] = [];
    }
    acc[info.category].push({ ...rel, displayInfo: info });
    return acc;
  }, {} as Record<string, Array<Relationship & { displayInfo: any }>>);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Manage Relationships - {person.firstName} {person.lastName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Person Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback style={{ backgroundColor: person.avatarColor }}>
                    <span className="text-white font-medium">
                      {getInitials(person.firstName, person.lastName)}
                    </span>
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{person.firstName} {person.lastName}</h3>
                  <p className="text-sm text-gray-600 capitalize">{person.gender.toLowerCase()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add Relationship */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Add New Relationship</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingRelationship(!isAddingRelationship)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Relationship
                </Button>
              </CardTitle>
            </CardHeader>
            
            {isAddingRelationship && (
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Relationship Type</Label>
                      <Select value={watchedType} onValueChange={(value) => setValue('type', value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select relationship type" />
                        </SelectTrigger>
                        <SelectContent className="max-h-96">
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
                      {errors.type && (
                        <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>
                      )}
                    </div>

                    <div>
                      <Label>Select Person</Label>
                      <Select 
                        value={watchedRelatedPersonId} 
                        onValueChange={(value) => setValue('relatedPersonId', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Choose a person" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailablePersons().map((p) => (
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
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsAddingRelationship(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createRelationshipMutation.isPending}
                    >
                      Add Relationship
                    </Button>
                  </div>
                </form>
              </CardContent>
            )}
          </Card>

          {/* Existing Relationships */}
          <Card>
            <CardHeader>
              <CardTitle>Current Relationships ({relationships.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {relationships.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No relationships added yet</p>
                  <p className="text-sm">Click "Add Relationship" to get started</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {Object.entries(groupedRelationships).map(([category, categoryRelationships]) => (
                      <div key={category}>
                        <div className="flex items-center space-x-2 mb-3">
                          <Badge className={getCategoryInfo(category)?.color}>
                            {getCategoryInfo(category)?.icon} {getCategoryInfo(category)?.label}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 ml-4">
                          {categoryRelationships.map((relationship) => (
                            <div 
                              key={relationship.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback 
                                    style={{ backgroundColor: relationship.displayInfo.person?.avatarColor }}
                                  >
                                    <span className="text-white text-xs font-medium">
                                      {relationship.displayInfo.person ? 
                                        getInitials(relationship.displayInfo.person.firstName, relationship.displayInfo.person.lastName) : 
                                        '?'
                                      }
                                    </span>
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">
                                    {relationship.displayInfo.person?.firstName} {relationship.displayInfo.person?.lastName}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {relationship.displayInfo.label}
                                  </p>
                                </div>
                              </div>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Relationship</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to remove the relationship between {person.firstName} {person.lastName} and {relationship.displayInfo.person?.firstName} {relationship.displayInfo.person?.lastName}?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteRelationshipMutation.mutate(relationship.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Remove
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}