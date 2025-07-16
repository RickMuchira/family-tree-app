'use client';

import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { 
  X, 
  Edit, 
  Trash2, 
  MapPin, 
  Calendar, 
  Users, 
  Heart,
  Baby,
  UserCheck,
  Clock,
  CalendarDays,
  UserPlus,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
import { Person, Relationship } from '@/types';
import { RelationshipManager } from '@/components/RelationshipManager';
import { 
  getCategoryInfo, 
  getRelationshipInfo, 
  getGenderSpecificLabel 
} from '@/lib/relationship-utils';
import axios from 'axios';

interface PersonDetailProps {
  person: Person;
  onEdit: (person: Person) => void;
  onClose: () => void;
}

export function PersonDetail({ person, onEdit, onClose }: PersonDetailProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showRelationshipManager, setShowRelationshipManager] = useState(false);
  const queryClient = useQueryClient();

  const { data: relationships = [] } = useQuery({
    queryKey: ['relationships', person.id],
    queryFn: async () => {
      const response = await axios.get(`/api/relationships?personId=${person.id}`);
      return response.data as Relationship[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await axios.delete(`/api/persons/${person.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      toast.success('Family member deleted successfully');
      onClose();
    },
    onError: () => {
      toast.error('Failed to delete family member');
      setIsDeleting(false);
    },
  });

  const handleDelete = () => {
    setIsDeleting(true);
    deleteMutation.mutate();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const getDetailedAgeInfo = () => {
    const birthInfo = {
      hasExactDate: !!person.dateOfBirth,
      date: person.dateOfBirth ? new Date(person.dateOfBirth) : null,
      year: person.birthYear,
      display: person.dateOfBirth ? formatDate(person.dateOfBirth) : person.birthYear?.toString()
    };

    const deathInfo = {
      hasExactDate: !!person.dateOfDeath,
      date: person.dateOfDeath ? new Date(person.dateOfDeath) : null,
      year: person.deathYear,
      display: person.dateOfDeath ? formatDate(person.dateOfDeath) : person.deathYear?.toString()
    };

    const isDeceased = !!(person.dateOfDeath || person.deathYear);

    let ageInfo = {
      current: null as number | null,
      atDeath: null as number | null,
      display: '' as string
    };

    if (birthInfo.date || birthInfo.year) {
      const birthYear = birthInfo.date ? birthInfo.date.getFullYear() : birthInfo.year!;
      const currentYear = new Date().getFullYear();
      
      if (isDeceased) {
        const deathYear = deathInfo.date ? deathInfo.date.getFullYear() : deathInfo.year!;
        ageInfo.atDeath = deathYear - birthYear;
        
        if (birthInfo.date && deathInfo.date) {
          // Calculate exact age
          let age = deathInfo.date.getFullYear() - birthInfo.date.getFullYear();
          if (deathInfo.date < new Date(birthInfo.date.setFullYear(deathInfo.date.getFullYear()))) {
            age--;
          }
          ageInfo.atDeath = age;
        }
        
        ageInfo.display = `Died at ${ageInfo.atDeath} years old`;
      } else {
        ageInfo.current = currentYear - birthYear;
        
        if (birthInfo.date) {
          // Calculate exact current age
          const today = new Date();
          let age = today.getFullYear() - birthInfo.date.getFullYear();
          if (today < new Date(birthInfo.date.setFullYear(today.getFullYear()))) {
            age--;
          }
          ageInfo.current = age;
        }
        
        ageInfo.display = `${ageInfo.current} years old`;
      }
    }

    return { birthInfo, deathInfo, ageInfo, isDeceased };
  };

  const getAllChildren = () => {
    const children = [
      ...(person.fatherChildren || []),
      ...(person.motherChildren || [])
    ];
    
    // Remove duplicates based on id
    const uniqueChildren = children.filter((child, index, arr) => 
      arr.findIndex(c => c.id === child.id) === index
    );
    
    return uniqueChildren;
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

  const allChildren = getAllChildren();
  const { birthInfo, deathInfo, ageInfo, isDeceased } = getDetailedAgeInfo();

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Family Member Details</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Profile Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback 
                  style={{ backgroundColor: person.avatarColor }}
                >
                  <span className="text-white font-semibold text-lg">
                    {getInitials(person.firstName, person.lastName)}
                  </span>
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-semibold text-gray-900">
                  {person.firstName} {person.lastName}
                </h1>
                
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline" className="capitalize">
                    {person.gender.toLowerCase()}
                  </Badge>
                  {isDeceased && (
                    <Badge variant="secondary">Deceased</Badge>
                  )}
                </div>

                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  {ageInfo.display && (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      {ageInfo.display}
                    </div>
                  )}
                  
                  {person.location && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      {person.location}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Date Information */}
        {(birthInfo.display || deathInfo.display) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-sm font-medium">
                <CalendarDays className="h-4 w-4 mr-2" />
                Life Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {birthInfo.display && (
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-green-700">Born</p>
                    <p className="text-sm text-gray-900">{birthInfo.display}</p>
                    {birthInfo.hasExactDate && birthInfo.year && (
                      <p className="text-xs text-gray-500">Year: {birthInfo.year}</p>
                    )}
                  </div>
                </div>
              )}

              {deathInfo.display && (
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-700">Died</p>
                    <p className="text-sm text-gray-900">{deathInfo.display}</p>
                    {deathInfo.hasExactDate && deathInfo.year && (
                      <p className="text-xs text-gray-500">Year: {deathInfo.year}</p>
                    )}
                  </div>
                </div>
              )}

              {ageInfo.current !== null && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Currently {ageInfo.current} years old
                  </p>
                </div>
              )}

              {ageInfo.atDeath !== null && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    Lived {ageInfo.atDeath} years
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Immediate Family Relationships */}
        <div className="space-y-4">
          {/* Parents */}
          {(person.father || person.mother) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-sm font-medium">
                  <Users className="h-4 w-4 mr-2" />
                  Parents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {person.father && (
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-500">
                        <span className="text-white text-xs">
                          {getInitials(person.father.firstName, person.father.lastName)}
                        </span>
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {person.father.firstName} {person.father.lastName}
                      </p>
                      <p className="text-xs text-gray-500">Father</p>
                    </div>
                  </div>
                )}
                
                {person.mother && (
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-pink-500">
                        <span className="text-white text-xs">
                          {getInitials(person.mother.firstName, person.mother.lastName)}
                        </span>
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {person.mother.firstName} {person.mother.lastName}
                      </p>
                      <p className="text-xs text-gray-500">Mother</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Spouse */}
          {person.spouse && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-sm font-medium">
                  <Heart className="h-4 w-4 mr-2" />
                  Spouse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-red-500">
                      <span className="text-white text-xs">
                        {getInitials(person.spouse.firstName, person.spouse.lastName)}
                      </span>
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">
                      {person.spouse.firstName} {person.spouse.lastName}
                    </p>
                    <p className="text-xs text-gray-500">Spouse</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Children */}
          {allChildren.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-sm font-medium">
                  <Baby className="h-4 w-4 mr-2" />
                  Children ({allChildren.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {allChildren.map((child) => (
                  <div key={child.id} className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-green-500">
                        <span className="text-white text-xs">
                          {getInitials(child.firstName, child.lastName)}
                        </span>
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {child.firstName} {child.lastName}
                      </p>
                      <p className="text-xs text-gray-500">Child</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Extended Relationships */}
        {relationships.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm font-medium">
                <div className="flex items-center">
                  <Crown className="h-4 w-4 mr-2" />
                  Extended Relationships ({relationships.length})
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowRelationshipManager(true)}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Manage
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-4">
                  {Object.entries(groupedRelationships).map(([category, categoryRelationships]) => (
                    <div key={category}>
                      <Badge className={`${getCategoryInfo(category)?.color} mb-2`}>
                        {getCategoryInfo(category)?.icon} {getCategoryInfo(category)?.label}
                      </Badge>
                      
                      <div className="space-y-2 ml-4">
                        {categoryRelationships.map((relationship) => (
                          <div key={relationship.id} className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback 
                                style={{ backgroundColor: relationship.displayInfo.person?.avatarColor }}
                              >
                                <span className="text-white text-xs">
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
                              <p className="text-xs text-gray-500">
                                {relationship.displayInfo.label}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Add Relationships Button (if no extended relationships) */}
        {relationships.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <Crown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Extended Relationships
              </h3>
              <p className="text-gray-600 mb-4">
                Add relationships like siblings, grandparents, cousins, and more
              </p>
              <Button onClick={() => setShowRelationshipManager(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Relationships
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Family Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-sm font-medium">
              <UserCheck className="h-4 w-4 mr-2" />
              Family Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <div className="flex items-center justify-center mb-1">
                  <Users className="h-4 w-4 text-gray-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {(person.father || person.mother) ? 'Yes' : 'No'}
                </p>
                <p className="text-xs text-gray-500">Has Parents</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <div className="flex items-center justify-center mb-1">
                  <Heart className="h-4 w-4 text-gray-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {person.spouse ? 'Yes' : 'No'}
                </p>
                <p className="text-xs text-gray-500">Married</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <div className="flex items-center justify-center mb-1">
                  <Baby className="h-4 w-4 text-gray-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {allChildren.length}
                </p>
                <p className="text-xs text-gray-500">Children</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <div className="flex items-center justify-center mb-1">
                  <Crown className="h-4 w-4 text-gray-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {relationships.length}
                </p>
                <p className="text-xs text-gray-500">Extended</p>
              </div>
            </div>
            
            {ageInfo.display && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-center">
                <p className="text-sm font-medium text-blue-900">{ageInfo.display}</p>
                <p className="text-xs text-blue-600">Age Information</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex space-x-2">
          <Button 
            onClick={() => onEdit(person)}
            className="flex-1"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Details
          </Button>
          
          <Button 
            onClick={() => setShowRelationshipManager(true)}
            variant="outline"
            className="flex-1"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Manage Relationships
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Family Member</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {person.firstName} {person.lastName}? 
                  This will remove them from the family tree and cannot be undone.
                  All relationships with this person will also be removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Relationship Manager Modal */}
      {showRelationshipManager && (
        <RelationshipManager
          person={person}
          onClose={() => setShowRelationshipManager(false)}
        />
      )}
    </div>
  );
}