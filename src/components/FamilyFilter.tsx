// Enhanced FamilyFilter.tsx with improved filtering logic

'use client';

import { useState, useMemo, useEffect } from 'react';
import { Filter, X, Users, Crown, ArrowUp, ArrowDown, Heart, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Person } from '@/types';

interface FamilyFilterProps {
  allPersons: Person[];
  onFilterChange: (filteredPersons: Person[], focusPersonId?: string) => void;
  selectedPersonId?: string;
  onPersonSelect: (person: Person) => void;
  focusPersonId?: string | null;
}

interface FilterSettings {
  focusPersonId: string | null;
  includeSpouses: boolean;
  generationsUp: number;
  generationsDown: number;
  includeSiblings: boolean;
  includeExtendedFamily: boolean; // New option for aunts, uncles, cousins
}

export function FamilyFilter({ 
  allPersons, 
  onFilterChange, 
  selectedPersonId, 
  onPersonSelect,
  focusPersonId,
}: FamilyFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterSettings, setFilterSettings] = useState<FilterSettings>({
    focusPersonId: selectedPersonId || null,
    includeSpouses: true,
    generationsUp: 3,
    generationsDown: 3,
    includeSiblings: true,
    includeExtendedFamily: false,
  });

  // Sync filterSettings.focusPersonId with prop
  useEffect(() => {
    if (focusPersonId && focusPersonId !== filterSettings.focusPersonId) {
      setFilterSettings(prev => ({ ...prev, focusPersonId }));
    }
  }, [focusPersonId]);

  // Calculate filtered family members with improved logic
  const filteredResults = useMemo(() => {
    if (!filterSettings.focusPersonId || allPersons.length === 0) {
      return {
        persons: allPersons,
        stats: {
          total: allPersons.length,
          byRelation: {},
          spousesIncluded: 0,
        }
      };
    }

    const focusPerson = allPersons.find(p => p.id === filterSettings.focusPersonId);
    if (!focusPerson) return { 
      persons: allPersons, 
      stats: { total: allPersons.length, byRelation: {}, spousesIncluded: 0 } 
    };

    const familyMembers = new Map<string, { person: Person, relation: string, generation: number }>();
    const spouses = new Set<string>();

    // Add focus person as the center
    familyMembers.set(focusPerson.id, { 
      person: focusPerson, 
      relation: 'Focus Person', 
      generation: 0 
    });

    // Helper to add person with relationship tracking
    const addFamilyMember = (person: Person, relation: string, generation: number) => {
      if (!familyMembers.has(person.id)) {
        familyMembers.set(person.id, { person, relation, generation });
      }
    };

    // Get ancestors with relationship tracking
    const getAncestors = (person: Person, currentGeneration: number, maxGenerations: number, baseRelation: string = '') => {
      if (currentGeneration >= maxGenerations) return;

      // Add parents
      if (person.fatherId) {
        const father = allPersons.find(p => p.id === person.fatherId);
        if (father) {
          const relation = currentGeneration === 0 ? 'Father' : 
                          currentGeneration === 1 ? 'Grandfather' : 
                          `Great-${'Great-'.repeat(currentGeneration-2)}Grandfather`;
          addFamilyMember(father, relation, currentGeneration + 1);
          
          // Add father's spouse (mother)
          if (filterSettings.includeSpouses && father.spouseId && father.spouseId !== person.motherId) {
            const stepMother = allPersons.find(p => p.id === father.spouseId);
            if (stepMother) {
              spouses.add(stepMother.id);
              addFamilyMember(stepMother, 'Step-mother', currentGeneration + 1);
            }
          }
          
          getAncestors(father, currentGeneration + 1, maxGenerations);
        }
      }
      
      if (person.motherId) {
        const mother = allPersons.find(p => p.id === person.motherId);
        if (mother) {
          const relation = currentGeneration === 0 ? 'Mother' : 
                          currentGeneration === 1 ? 'Grandmother' : 
                          `Great-${'Great-'.repeat(currentGeneration-2)}Grandmother`;
          addFamilyMember(mother, relation, currentGeneration + 1);
          
          // Add mother's spouse (father) - avoid duplicates
          if (filterSettings.includeSpouses && mother.spouseId && mother.spouseId !== person.fatherId) {
            const stepFather = allPersons.find(p => p.id === mother.spouseId);
            if (stepFather) {
              spouses.add(stepFather.id);
              addFamilyMember(stepFather, 'Step-father', currentGeneration + 1);
            }
          }
          
          getAncestors(mother, currentGeneration + 1, maxGenerations);
        }
      }
    };

    // Get descendants with relationship tracking
    const getDescendants = (person: Person, currentGeneration: number, maxGenerations: number) => {
      if (currentGeneration >= maxGenerations) return;

      const children = allPersons.filter(p => p.fatherId === person.id || p.motherId === person.id);
      
      children.forEach(child => {
        const relation = currentGeneration === 0 ? 'Child' : 
                        currentGeneration === 1 ? 'Grandchild' : 
                        `Great-${'Great-'.repeat(currentGeneration-2)}Grandchild`;
        addFamilyMember(child, relation, -(currentGeneration + 1));
        
        // Add child's spouse
        if (filterSettings.includeSpouses && child.spouseId) {
          const childSpouse = allPersons.find(p => p.id === child.spouseId);
          if (childSpouse) {
            spouses.add(childSpouse.id);
            addFamilyMember(childSpouse, `${relation}'s Spouse`, -(currentGeneration + 1));
          }
        }
        
        getDescendants(child, currentGeneration + 1, maxGenerations);
      });
    };

    // Get siblings with relationship tracking
    const getSiblings = (person: Person) => {
      if (!filterSettings.includeSiblings) return;
      
      const siblings = allPersons.filter(p => 
        p.id !== person.id && 
        ((person.fatherId && p.fatherId === person.fatherId) || 
         (person.motherId && p.motherId === person.motherId))
      );
      
      siblings.forEach(sibling => {
        // Determine sibling type
        const isFullSibling = person.fatherId === sibling.fatherId && 
                             person.motherId === sibling.motherId;
        const relation = isFullSibling ? 'Sibling' : 'Half-Sibling';
        
        addFamilyMember(sibling, relation, 0);
        
        // Add sibling's spouse and children if requested
        if (filterSettings.includeSpouses && sibling.spouseId) {
          const siblingSpouse = allPersons.find(p => p.id === sibling.spouseId);
          if (siblingSpouse) {
            spouses.add(siblingSpouse.id);
            addFamilyMember(siblingSpouse, `${relation}'s Spouse`, 0);
          }
        }

        // Add sibling's children (nieces/nephews)
        if (filterSettings.includeExtendedFamily) {
          const niblings = allPersons.filter(p => p.fatherId === sibling.id || p.motherId === sibling.id);
          niblings.forEach(nibling => {
            addFamilyMember(nibling, 'Niece/Nephew', -1);
          });
        }
      });
    };

    // Get extended family (aunts, uncles, cousins)
    const getExtendedFamily = (person: Person) => {
      if (!filterSettings.includeExtendedFamily) return;
      
      // Get aunts and uncles (parent's siblings)
      [person.fatherId, person.motherId].forEach(parentId => {
        if (!parentId) return;
        const parent = allPersons.find(p => p.id === parentId);
        if (!parent) return;
        
        const parentSiblings = allPersons.filter(p => 
          p.id !== parentId && 
          ((parent.fatherId && p.fatherId === parent.fatherId) || 
           (parent.motherId && p.motherId === parent.motherId))
        );
        
        parentSiblings.forEach(auntUncle => {
          addFamilyMember(auntUncle, 'Aunt/Uncle', 1);
          
          // Add their children (cousins)
          const cousins = allPersons.filter(p => p.fatherId === auntUncle.id || p.motherId === auntUncle.id);
          cousins.forEach(cousin => {
            addFamilyMember(cousin, 'Cousin', 0);
          });
        });
      });
    };

    // Add focus person's spouse first
    if (filterSettings.includeSpouses && focusPerson.spouseId) {
      const spouse = allPersons.find(p => p.id === focusPerson.spouseId);
      if (spouse) {
        spouses.add(spouse.id);
        addFamilyMember(spouse, 'Spouse', 0);
      }
    }

    // Execute the filtering
    getAncestors(focusPerson, 0, filterSettings.generationsUp);
    getDescendants(focusPerson, 0, filterSettings.generationsDown);
    getSiblings(focusPerson);
    getExtendedFamily(focusPerson);

    // Convert to array and create stats
    const familyArray = Array.from(familyMembers.values());
    const byRelation: Record<string, number> = {};
    familyArray.forEach(({ relation }) => {
      byRelation[relation] = (byRelation[relation] || 0) + 1;
    });

    return {
      persons: familyArray.map(f => f.person),
      stats: {
        total: familyArray.length,
        byRelation,
        spousesIncluded: spouses.size,
      }
    };
  }, [allPersons, filterSettings]);

  // Apply filter whenever settings change
  useEffect(() => {
    onFilterChange(filteredResults.persons, filterSettings.focusPersonId || undefined);
  }, [filteredResults.persons, filterSettings.focusPersonId, onFilterChange]);

  const resetFilter = () => {
    setFilterSettings({
      focusPersonId: null,
      includeSpouses: true,
      generationsUp: 3,
      generationsDown: 3,
      includeSiblings: true,
      includeExtendedFamily: false,
    });
  };

  const isFiltered = filterSettings.focusPersonId !== null;

  // Quick filter presets
  const applyPreset = (preset: string) => {
    const baseSettings = { ...filterSettings };
    
    switch (preset) {
      case 'immediate':
        setFilterSettings({
          ...baseSettings,
          generationsUp: 1,
          generationsDown: 1,
          includeSiblings: true,
          includeSpouses: true,
          includeExtendedFamily: false,
        });
        break;
      case 'extended':
        setFilterSettings({
          ...baseSettings,
          generationsUp: 2,
          generationsDown: 2,
          includeSiblings: true,
          includeSpouses: true,
          includeExtendedFamily: true,
        });
        break;
      case 'lineage':
        setFilterSettings({
          ...baseSettings,
          generationsUp: 5,
          generationsDown: 5,
          includeSiblings: false,
          includeSpouses: false,
          includeExtendedFamily: false,
        });
        break;
    }
  };

  return (
    <div className="relative">
      {/* Filter Toggle Button */}
      <Button
        variant={isFiltered ? "default" : "outline"}
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={isFiltered ? "bg-blue-600 text-white" : ""}
      >
        <Filter className="h-4 w-4 mr-2" />
        Family Filter
        {isFiltered && (
          <Badge variant="secondary" className="ml-2 bg-white text-blue-600">
            {filteredResults.stats.total}
          </Badge>
        )}
      </Button>

      {/* Filter Panel */}
      {isOpen && (
        <Card className="absolute top-12 left-0 w-[420px] z-50 shadow-lg max-h-[80vh] overflow-y-auto">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Family Filter
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Focus Person Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Focus Person</label>
              <Select
                value={filterSettings.focusPersonId || 'none'}
                onValueChange={(value) => setFilterSettings(prev => ({ 
                  ...prev, 
                  focusPersonId: value === 'none' ? null : value 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a person to focus on" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="none">No filter (show all)</SelectItem>
                  {allPersons.map(person => (
                    <SelectItem key={person.id} value={person.id}>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: person.avatarColor }}
                        />
                        <span>{person.firstName} {person.lastName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filterSettings.focusPersonId && (
              <>
                <Separator />

                {/* Quick Presets */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quick Filters</label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyPreset('immediate')}
                      className="text-xs"
                    >
                      Immediate Family
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyPreset('extended')}
                      className="text-xs"
                    >
                      Extended Family
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyPreset('lineage')}
                      className="text-xs"
                    >
                      Direct Lineage
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Generation Controls */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Generation Depth</label>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs text-gray-600 flex items-center">
                        <ArrowUp className="h-3 w-3 mr-1" />
                        Ancestors
                      </label>
                      <Select
                        value={filterSettings.generationsUp.toString()}
                        onValueChange={(value) => setFilterSettings(prev => ({ 
                          ...prev, 
                          generationsUp: parseInt(value) 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">None</SelectItem>
                          <SelectItem value="1">1 (Parents)</SelectItem>
                          <SelectItem value="2">2 (Grandparents)</SelectItem>
                          <SelectItem value="3">3 (Great-grandparents)</SelectItem>
                          <SelectItem value="4">4 generations</SelectItem>
                          <SelectItem value="5">5 generations</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-gray-600 flex items-center">
                        <ArrowDown className="h-3 w-3 mr-1" />
                        Descendants
                      </label>
                      <Select
                        value={filterSettings.generationsDown.toString()}
                        onValueChange={(value) => setFilterSettings(prev => ({ 
                          ...prev, 
                          generationsDown: parseInt(value) 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">None</SelectItem>
                          <SelectItem value="1">1 (Children)</SelectItem>
                          <SelectItem value="2">2 (Grandchildren)</SelectItem>
                          <SelectItem value="3">3 (Great-grandchildren)</SelectItem>
                          <SelectItem value="4">4 generations</SelectItem>
                          <SelectItem value="5">5 generations</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Include Options */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Include</label>
                  
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterSettings.includeSpouses}
                        onChange={(e) => setFilterSettings(prev => ({ 
                          ...prev, 
                          includeSpouses: e.target.checked 
                        }))}
                        className="rounded"
                      />
                      <Heart className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Spouses</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterSettings.includeSiblings}
                        onChange={(e) => setFilterSettings(prev => ({ 
                          ...prev, 
                          includeSiblings: e.target.checked 
                        }))}
                        className="rounded"
                      />
                      <Users className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Siblings</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterSettings.includeExtendedFamily}
                        onChange={(e) => setFilterSettings(prev => ({ 
                          ...prev, 
                          includeExtendedFamily: e.target.checked 
                        }))}
                        className="rounded"
                      />
                      <Crown className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">Extended Family</span>
                      <span className="text-xs text-gray-500">(aunts, uncles, cousins)</span>
                    </label>
                  </div>
                </div>

                <Separator />

                {/* Filter Results Summary */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Results</label>
                  <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Members:</span>
                      <Badge variant="outline">{filteredResults.stats.total}</Badge>
                    </div>
                    
                    {filteredResults.stats.spousesIncluded > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Spouses:</span>
                        <Badge variant="outline" className="bg-red-50 text-red-600">
                          {filteredResults.stats.spousesIncluded}
                        </Badge>
                      </div>
                    )}

                    {Object.keys(filteredResults.stats.byRelation).length > 0 && (
                      <div className="text-xs text-gray-600">
                        <div className="font-medium mb-1">Relationships:</div>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {Object.entries(filteredResults.stats.byRelation).map(([relation, count]) => (
                            <div key={relation} className="flex justify-between">
                              <span>{relation}:</span>
                              <span>{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilter}
                    className="flex-1"
                  >
                    Show All
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="flex-1"
                  >
                    Apply Filter
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}