'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Edit, Trash2, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Person } from '@/types';
import axios from 'axios';

interface PersonsListProps {
  onPersonSelect: (person: Person) => void;
  onPersonEdit: (person: Person) => void;
  selectedPersonId?: string;
}

export function PersonsList({ onPersonSelect, onPersonEdit, selectedPersonId }: PersonsListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: persons = [], isLoading, error } = useQuery({
    queryKey: ['persons'],
    queryFn: async () => {
      const response = await axios.get('/api/persons');
      return response.data as Person[];
    },
  });

  const filteredPersons = persons.filter(person =>
    `${person.firstName} ${person.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getAgeDisplay = (birthYear?: number, deathYear?: number) => {
    if (!birthYear) return '';
    
    if (deathYear) {
      return `${birthYear}-${deathYear}`;
    }
    
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    return `${age} years old`;
  };

  const getGenderColor = (gender: string) => {
    switch (gender) {
      case 'MALE': return 'bg-blue-500';
      case 'FEMALE': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        Failed to load family members
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search family members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center text-sm text-gray-600">
          <Users className="h-4 w-4 mr-2" />
          {filteredPersons.length} of {persons.length} members
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredPersons.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No matching family members' : 'No family members added yet'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPersons.map((person) => (
                <Card
                  key={person.id}
                  className={`p-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedPersonId === person.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => onPersonSelect(person)}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback 
                        className={getGenderColor(person.gender)}
                        style={{ backgroundColor: person.avatarColor }}
                      >
                        <span className="text-white font-medium">
                          {getInitials(person.firstName, person.lastName)}
                        </span>
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900 truncate">
                          {person.firstName} {person.lastName}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {person.gender.toLowerCase()}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-500 space-y-1">
                        {getAgeDisplay(person.birthYear, person.deathYear) && (
                          <div>{getAgeDisplay(person.birthYear, person.deathYear)}</div>
                        )}
                        {person.location && (
                          <div className="truncate">{person.location}</div>
                        )}
                      </div>

                      {/* Relationships */}
                      <div className="flex items-center space-x-1 mt-1">
                        {person.father && (
                          <Badge variant="secondary" className="text-xs">
                            Child
                          </Badge>
                        )}
                        {person.spouse && (
                          <Badge variant="secondary" className="text-xs">
                            Married
                          </Badge>
                        )}
                        {(person.fatherChildren?.length || person.motherChildren?.length) && (
                          <Badge variant="secondary" className="text-xs">
                            Parent
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPersonEdit(person);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}