'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { 
  Plus, 
  X, 
  Trash2, 
  Users, 
  Edit3, 
  ArrowRightLeft,
  Heart,
  Baby,
  Crown,
  UserPlus,
  Search,
  Filter
} from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const directRelationshipSchema = z.object({
  fatherId: z.string().optional(),
  motherId: z.string().optional(),
  spouseId: z.string().optional(),
});

type RelationshipFormData = z.infer<typeof relationshipSchema>;
type DirectRelationshipFormData = z.infer<typeof directRelationshipSchema>;

interface EnhancedRelationshipEditorProps {
  person: Person;
  onClose: () => void;
}

export function EnhancedRelationshipEditor({ person, onClose }: EnhancedRelationshipEditorProps) {
  const [activeTab, setActiveTab] = useState('direct');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isAddingRelationship, setIsAddingRelationship] = useState(false);
  const [editingDirectRelations, setEditingDirectRelations] = useState(false);
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
    register: registerRelationship,
    handleSubmit: handleSubmitRelationship,
    setValue: setValueRelationship,
    watch: watchRelationship,
    reset: resetRelationship,
    formState: { errors: relationshipErrors },
  } = useForm<RelationshipFormData>({
    resolver: zodResolver(relationshipSchema),
  });

  const {
    register: registerDirect,
    handleSubmit: handleSubmitDirect,
    setValue: setValueDirect,
    watch: watchDirect,
    formState: { errors: directErrors },
  } = useForm<DirectRelationshipFormData>({
    defaultValues: {
      fatherId: person.fatherId || undefined,
      motherId: person.motherId || undefined,
      spouseId: person.spouseId || undefined,
    },
  });

  const watchedType = watchRelationship('type');
  const watchedRelatedPersonId = watchRelationship('relatedPersonId');

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
      resetRelationship();
      setIsAddingRelationship(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add relationship');
    },
  });

  const updateDirectRelationsMutation = useMutation({
    mutationFn: async (data: DirectRelationshipFormData) => {
      const response = await axios.put(`/api/persons/${person.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      queryClient.invalidateQueries({ queryKey: ['relationships', person.id] });
      toast.success('Direct relationships updated successfully!');
      setEditingDirectRelations(false);
    },
    onError: () => {
      toast.error('Failed to update direct relationships');
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

  const onSubmitRelationship = (data: RelationshipFormData) => {
    createRelationshipMutation.mutate(data);
  };

  const onSubmitDirect = (data: DirectRelationshipFormData) => {
    updateDirectRelationsMutation.mutate(data);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getAvailablePersons = () => {
    const existingRelationshipPersonIds = relationships.map(rel => 
      rel.personFromId === person.id ? rel.personToId : rel.personFromId
    );
    
    let availablePersons = allPersons.filter(p => 
      p.id !== person.id && 
      !existingRelationshipPersonIds.includes(p.id) &&
      p.id !== person.fatherId &&
      p.id !== person.motherId &&
      p.id !== person.spouseId
    );

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      availablePersons = availablePersons.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchLower) ||
        p.location?.toLowerCase().includes(searchLower)
      );
    }

    return availablePersons;
  };

  const getDirectRelationPersons = (excludeType?: 'father' | 'mother' | 'spouse') => {
    return allPersons.filter(p => {
      if (p.id === person.id) return false;
      
      // For spouse, exclude current spouse
      if (excludeType === 'spouse' && p.id === person.spouseId) return false;
      
      // For parents, exclude current parents
      if (excludeType === 'father' && p.id === person.fatherId) return false;
      if (excludeType === 'mother' && p.id === person.motherId) return false;
      
      return true;
    });
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

  const filteredRelationships = relationships.filter(rel => {
    if (filterCategory === 'all') return true;
    const info = getRelationshipDisplayInfo(rel);
    return info.category === filterCategory;
  });

  const groupedRelationships = filteredRelationships.reduce((acc, rel) => {
    const info = getRelationshipDisplayInfo(rel);
    if (!acc[info.category]) {
      acc[info.category] = [];
    }
    acc[info.category].push({ ...rel, displayInfo: info });
    return acc;
  }, {} as Record<string, Array<Relationship & { displayInfo: any }>>);

  const relationshipCategories = Object.keys(getRelationshipsByCategory());

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Relationship Editor - {person.firstName} {person.lastName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Person Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  {person.profilePhoto ? (
                    <AvatarImage src={person.profilePhoto} alt="Profile" className="object-cover" />
                  ) : (
                    <AvatarFallback style={{ backgroundColor: person.avatarColor }}>
                      <span className="text-white font-medium text-lg">
                        {getInitials(person.firstName, person.lastName)}
                      </span>
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{person.firstName} {person.lastName}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="capitalize">{person.gender.toLowerCase()}</Badge>
                    {person.profilePhoto && <Badge variant="secondary">Has Photo</Badge>}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{person.location}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for Different Relationship Types */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="direct" className="flex items-center space-x-2">
                <Heart className="h-4 w-4" />
                <span>Direct Family</span>
              </TabsTrigger>
              <TabsTrigger value="extended" className="flex items-center space-x-2">
                <Crown className="h-4 w-4" />
                <span>Extended Relations</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Analytics</span>
              </TabsTrigger>
            </TabsList>

            {/* Direct Family Relationships */}
            <TabsContent value="direct" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Direct Family Relationships</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingDirectRelations(!editingDirectRelations)}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      {editingDirectRelations ? 'Cancel' : 'Edit'}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {editingDirectRelations ? (
                    <form onSubmit={handleSubmitDirect(onSubmitDirect)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Father */}
                        <div>
                          <Label>Father</Label>
                          <Select
                            value={watchDirect('fatherId') || 'none'}
                            onValueChange={(value) => setValueDirect('fatherId', value === 'none' ? undefined : value)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select father" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No father selected</SelectItem>
                              {getDirectRelationPersons('father')
                                .filter(p => p.gender === 'MALE' || p.gender === 'UNKNOWN')
                                .map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  <div className="flex items-center space-x-2">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: p.avatarColor }}
                                    />
                                    <span>{p.firstName} {p.lastName}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Mother */}
                        <div>
                          <Label>Mother</Label>
                          <Select
                            value={watchDirect('motherId') || 'none'}
                            onValueChange={(value) => setValueDirect('motherId', value === 'none' ? undefined : value)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select mother" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No mother selected</SelectItem>
                              {getDirectRelationPersons('mother')
                                .filter(p => p.gender === 'FEMALE' || p.gender === 'UNKNOWN')
                                .map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  <div className="flex items-center space-x-2">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: p.avatarColor }}
                                    />
                                    <span>{p.firstName} {p.lastName}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Spouse */}
                        <div>
                          <Label>Spouse</Label>
                          <Select
                            value={watchDirect('spouseId') || 'none'}
                            onValueChange={(value) => setValueDirect('spouseId', value === 'none' ? undefined : value)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select spouse" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No spouse selected</SelectItem>
                              {getDirectRelationPersons('spouse').map((p) => (
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
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setEditingDirectRelations(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={updateDirectRelationsMutation.isPending}
                        >
                          Update Relationships
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Current Father */}
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium text-blue-700 mb-2">Father</h4>
                        {person.father ? (
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-blue-500 text-white text-xs">
                                {getInitials(person.father.firstName, person.father.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {person.father.firstName} {person.father.lastName}
                            </span>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No father assigned</p>
                        )}
                      </div>

                      {/* Current Mother */}
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium text-pink-700 mb-2">Mother</h4>
                        {person.mother ? (
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-pink-500 text-white text-xs">
                                {getInitials(person.mother.firstName, person.mother.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {person.mother.firstName} {person.mother.lastName}
                            </span>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No mother assigned</p>
                        )}
                      </div>

                      {/* Current Spouse */}
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium text-red-700 mb-2">Spouse</h4>
                        {person.spouse ? (
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-red-500 text-white text-xs">
                                {getInitials(person.spouse.firstName, person.spouse.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {person.spouse.firstName} {person.spouse.lastName}
                            </span>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No spouse assigned</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Children Display */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Baby className="h-5 w-5 mr-2" />
                    Children
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const allChildren = [
                      ...(person.fatherChildren || []),
                      ...(person.motherChildren || [])
                    ].filter((child, index, arr) => 
                      arr.findIndex(c => c.id === child.id) === index
                    );

                    return allChildren.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {allChildren.map((child) => (
                          <div key={child.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-green-500 text-white text-xs">
                                {getInitials(child.firstName, child.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {child.firstName} {child.lastName}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No children recorded</p>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Extended Relationships */}
            <TabsContent value="extended" className="space-y-4">
              {/* Add New Relationship */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Extended Relationships</span>
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
                    <form onSubmit={handleSubmitRelationship(onSubmitRelationship)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Relationship Type</Label>
                          <Select 
                            value={watchedType} 
                            onValueChange={(value) => setValueRelationship('type', value)}
                          >
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
                          {relationshipErrors.type && (
                            <p className="text-sm text-red-600 mt-1">{relationshipErrors.type.message}</p>
                          )}
                        </div>

                        <div>
                          <Label>Select Person</Label>
                          <div className="space-y-2">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                placeholder="Search for a person..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                              />
                            </div>
                            <Select 
                              value={watchedRelatedPersonId || 'none'}
                              onValueChange={(value) => setValueRelationship('relatedPersonId', value === 'none' ? '' : value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a person" />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                <SelectItem value="none">Select a person</SelectItem>
                                {getAvailablePersons().map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    <div className="flex items-center space-x-2">
                                      <Avatar className="h-6 w-6">
                                        {p.profilePhoto ? (
                                          <AvatarImage src={p.profilePhoto} alt="Profile" className="object-cover" />
                                        ) : (
                                          <AvatarFallback 
                                            style={{ backgroundColor: p.avatarColor }}
                                            className="text-white text-xs"
                                          >
                                            {getInitials(p.firstName, p.lastName)}
                                          </AvatarFallback>
                                        )}
                                      </Avatar>
                                      <span>{p.firstName} {p.lastName}</span>
                                      <span className="text-xs text-gray-500">
                                        ({p.gender.toLowerCase()})
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {relationshipErrors.relatedPersonId && (
                            <p className="text-sm text-red-600 mt-1">{relationshipErrors.relatedPersonId.message}</p>
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

              {/* Filter Relationships */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Current Relationships ({relationships.length})</span>
                    <div className="flex items-center space-x-2">
                      <Filter className="h-4 w-4" />
                      <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {relationshipCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {getCategoryInfo(category)?.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredRelationships.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>{filterCategory === 'all' ? 'No relationships added yet' : `No ${getCategoryInfo(filterCategory)?.label.toLowerCase()} relationships`}</p>
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
                              <span className="text-sm text-gray-500">
                                ({categoryRelationships.length})
                              </span>
                            </div>
                            
                            <div className="space-y-2 ml-4">
                              {categoryRelationships.map((relationship) => (
                                <div 
                                  key={relationship.id}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                  <div className="flex items-center space-x-3">
                                    <Avatar className="h-10 w-10">
                                      {relationship.displayInfo.person?.profilePhoto ? (
                                        <AvatarImage 
                                          src={relationship.displayInfo.person.profilePhoto} 
                                          alt="Profile" 
                                          className="object-cover" 
                                        />
                                      ) : (
                                        <AvatarFallback 
                                          style={{ backgroundColor: relationship.displayInfo.person?.avatarColor }}
                                          className="text-white text-sm font-medium"
                                        >
                                          {relationship.displayInfo.person ? 
                                            getInitials(relationship.displayInfo.person.firstName, relationship.displayInfo.person.lastName) : 
                                            '?'
                                          }
                                        </AvatarFallback>
                                      )}
                                    </Avatar>
                                    <div>
                                      <p className="font-medium">
                                        {relationship.displayInfo.person?.firstName} {relationship.displayInfo.person?.lastName}
                                      </p>
                                      <div className="flex items-center space-x-2">
                                        <p className="text-sm text-gray-600">
                                          {relationship.displayInfo.label}
                                        </p>
                                        <ArrowRightLeft className="h-3 w-3 text-gray-400" />
                                        <p className="text-xs text-gray-500">
                                          {relationship.displayInfo.description}
                                        </p>
                                      </div>
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
                                          Are you sure you want to remove the {relationship.displayInfo.label.toLowerCase()} relationship between {person.firstName} {person.lastName} and {relationship.displayInfo.person?.firstName} {relationship.displayInfo.person?.lastName}?
                                          <br /><br />
                                          This will also remove the reverse relationship if it exists.
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
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Direct Family Stats */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-blue-700">Direct Family</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Parents</span>
                      <span className="font-medium">
                        {(person.father ? 1 : 0) + (person.mother ? 1 : 0)}/2
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Spouse</span>
                      <span className="font-medium">{person.spouse ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Children</span>
                      <span className="font-medium">
                        {(() => {
                          const allChildren = [
                            ...(person.fatherChildren || []),
                            ...(person.motherChildren || [])
                          ].filter((child, index, arr) => 
                            arr.findIndex(c => c.id === child.id) === index
                          );
                          return allChildren.length;
                        })()}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Extended Family Stats */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-green-700">Extended Family</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Relationships</span>
                      <span className="font-medium">{relationships.length}</span>
                    </div>
                    {relationshipCategories.map(category => {
                      const count = relationships.filter(rel => {
                        const info = getRelationshipDisplayInfo(rel);
                        return info.category === category;
                      }).length;
                      return count > 0 ? (
                        <div key={category} className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            {getCategoryInfo(category)?.label}
                          </span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ) : null;
                    })}
                  </CardContent>
                </Card>

                {/* Relationship Health */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-purple-700">Profile Completeness</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Has Photo</span>
                      <span className="font-medium">{person.profilePhoto ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Birth Info</span>
                      <span className="font-medium">
                        {person.dateOfBirth || person.birthYear ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Location</span>
                      <span className="font-medium">{person.location ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Family Connections</span>
                      <span className="font-medium">
                        {relationships.length + 
                         (person.father ? 1 : 0) + 
                         (person.mother ? 1 : 0) + 
                         (person.spouse ? 1 : 0)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Relationship Network Visualization */}
              <Card>
                <CardHeader>
                  <CardTitle>Relationship Network</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-600 mb-2">Network visualization coming soon</p>
                    <p className="text-sm text-gray-500">
                      This will show a visual network of all relationships for {person.firstName}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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