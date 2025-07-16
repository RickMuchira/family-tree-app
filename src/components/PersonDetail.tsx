'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  X, 
  Edit, 
  Trash2, 
  MapPin, 
  Calendar, 
  Users, 
  Heart,
  Baby,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
import { Person } from '@/types';
import axios from 'axios';

interface PersonDetailProps {
  person: Person;
  onEdit: (person: Person) => void;
  onClose: () => void;
}

export function PersonDetail({ person, onEdit, onClose }: PersonDetailProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await axios.delete(`/api/persons/${person.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] });
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

  const getAgeDisplay = (birthYear?: number, deathYear?: number) => {
    if (!birthYear) return null;
    
    if (deathYear) {
      const age = deathYear - birthYear;
      return `${age} years (${birthYear}-${deathYear})`;
    }
    
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    return `${age} years old (born ${birthYear})`;
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

  const allChildren = getAllChildren();

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
                  {person.deathYear && (
                    <Badge variant="secondary">Deceased</Badge>
                  )}
                </div>

                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  {getAgeDisplay(person.birthYear, person.deathYear) && (
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {getAgeDisplay(person.birthYear, person.deathYear)}
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

        {/* Family Relationships */}
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

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-sm font-medium">
              <UserCheck className="h-4 w-4 mr-2" />
              Family Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-lg font-semibold text-gray-900">
                  {(person.father || person.mother) ? '✓' : '✗'}
                </p>
                <p className="text-xs text-gray-500">Has Parents</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-lg font-semibold text-gray-900">
                  {person.spouse ? '✓' : '✗'}
                </p>
                <p className="text-xs text-gray-500">Married</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-lg font-semibold text-gray-900">
                  {allChildren.length}
                </p>
                <p className="text-xs text-gray-500">Children</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-lg font-semibold text-gray-900">
                  {person.deathYear ? 'No' : 'Yes'}
                </p>
                <p className="text-xs text-gray-500">Living</p>
              </div>
            </div>
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
    </div>
  );
}