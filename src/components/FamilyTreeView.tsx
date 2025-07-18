'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  TreePine, 
  Filter, 
  Download, 
  Users, 
  Search,
  X,
  Eye,
  EyeOff,
  Printer,
  FileImage,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Person, TreeNode } from '@/types';
import axios from 'axios';

interface FamilyTreeViewProps {
  onPersonSelect: (person: Person) => void;
  selectedPersonId?: string;
}

interface TreeLayoutNode extends TreeNode {
  level: number;
  index: number;
  subtreeWidth: number;
  parentId?: string;
  nodeType: 'main' | 'spouse';
  isVisible: boolean;
}

interface FilterOptions {
  searchTerm: string;
  focusPersonId: string | null;
  showGenerations: number[];
  showLiving: boolean;
  showDeceased: boolean;
  showWithPhotos: boolean;
  maxGenerations: number;
}

export function FamilyTreeView({ onPersonSelect, selectedPersonId }: FamilyTreeViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(0.8);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    focusPersonId: null,
    showGenerations: [],
    showLiving: true,
    showDeceased: true,
    showWithPhotos: false,
    maxGenerations: 10,
  });

  const { data: persons = [], isLoading } = useQuery({
    queryKey: ['persons'],
    queryFn: async () => {
      const response = await axios.get('/api/persons');
      return response.data as Person[];
    },
  });

  // Enhanced tree building with filtering
  const treeData = useMemo(() => {
    if (persons.length === 0) return { roots: [], stats: { totalNodes: 0, maxDepth: 0, generations: 0, visible: 0 } };

    const buildFilteredTree = (): { roots: TreeLayoutNode[], stats: any } => {
      let allPersons = [...persons];
      
      // Apply person-level filters
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        allPersons = allPersons.filter(person => 
          `${person.firstName} ${person.lastName}`.toLowerCase().includes(searchLower) ||
          person.location?.toLowerCase().includes(searchLower)
        );
      }

      if (!filters.showLiving) {
        allPersons = allPersons.filter(person => person.deathYear || person.dateOfDeath);
      }

      if (!filters.showDeceased) {
        allPersons = allPersons.filter(person => !person.deathYear && !person.dateOfDeath);
      }

      if (filters.showWithPhotos) {
        allPersons = allPersons.filter(person => person.profilePhoto);
      }

      // Focus on specific person and their family
      if (filters.focusPersonId) {
        const focusPerson = persons.find(p => p.id === filters.focusPersonId);
        if (focusPerson) {
          const familyIds = new Set<string>();
          
          familyIds.add(focusPerson.id);
          
          const addAncestors = (person: Person, depth: number = 0) => {
            if (depth >= filters.maxGenerations) return;
            
            if (person.fatherId) {
              const father = persons.find(p => p.id === person.fatherId);
              if (father) {
                familyIds.add(father.id);
                addAncestors(father, depth + 1);
              }
            }
            
            if (person.motherId) {
              const mother = persons.find(p => p.id === person.motherId);
              if (mother) {
                familyIds.add(mother.id);
                addAncestors(mother, depth + 1);
              }
            }
          };
          
          const addDescendants = (person: Person, depth: number = 0) => {
            if (depth >= filters.maxGenerations) return;
            
            const children = persons.filter(p => p.fatherId === person.id || p.motherId === person.id);
            children.forEach(child => {
              familyIds.add(child.id);
              addDescendants(child, depth + 1);
            });
          };
          
          if (focusPerson.spouseId) {
            const spouse = persons.find(p => p.id === focusPerson.spouseId);
            if (spouse) {
              familyIds.add(spouse.id);
              addAncestors(spouse, 1);
              addDescendants(spouse, 1);
            }
          }
          
          const siblings = persons.filter(p => 
            (p.fatherId && p.fatherId === focusPerson.fatherId) ||
            (p.motherId && p.motherId === focusPerson.motherId)
          );
          siblings.forEach(sibling => familyIds.add(sibling.id));
          
          addAncestors(focusPerson);
          addDescendants(focusPerson);
          
          allPersons = allPersons.filter(person => familyIds.has(person.id));
        }
      }

      // Find root nodes
      const roots = allPersons.filter(person => !person.fatherId && !person.motherId);
      
      if (roots.length === 0 && allPersons.length > 0) {
        const oldestPerson = allPersons.reduce((oldest, current) => {
          if (!oldest.birthYear && current.birthYear) return current;
          if (oldest.birthYear && !current.birthYear) return oldest;
          if (oldest.birthYear && current.birthYear) {
            return current.birthYear < oldest.birthYear ? current : oldest;
          }
          return oldest;
        }, allPersons[0]);
        
        roots.push(oldestPerson);
      }

      let totalNodes = 0;
      let visibleNodes = 0;
      let maxDepth = 0;
      const nodeSpacing = { x: 180, y: 120 };
      
      const buildSubtree = (person: Person, level: number, startX: number, parentId?: string, nodeIndex: number = 0): TreeLayoutNode => {
        totalNodes++;
        maxDepth = Math.max(maxDepth, level);
        
        const children = allPersons.filter(p => p.fatherId === person.id || p.motherId === person.id);
        const spouse = person.spouseId ? allPersons.find(p => p.id === person.spouseId) : undefined;
        
        const isVisible = filters.showGenerations.length === 0 || filters.showGenerations.includes(level);
        if (isVisible) visibleNodes++;
        
        let subtreeWidth = Math.max(1, children.length) * nodeSpacing.x;
        
        const nodeKey = parentId ? `${parentId}-child-${nodeIndex}` : `root-${person.id}`;
        
        const treeNode: TreeLayoutNode = {
          id: person.id,
          name: `${person.firstName} ${person.lastName}`,
          gender: person.gender,
          avatarColor: person.avatarColor,
          profilePhoto: person.profilePhoto,
          birthYear: person.birthYear,
          deathYear: person.deathYear,
          dateOfBirth: person.dateOfBirth,
          dateOfDeath: person.dateOfDeath,
          x: startX,
          y: level * nodeSpacing.y,
          level,
          index: nodeIndex,
          subtreeWidth,
          parentId: parentId || undefined,
          nodeType: 'main',
          isVisible,
          children: [],
        };

        // Add spouse
        if (spouse) {
          const spouseVisible = filters.showGenerations.length === 0 || filters.showGenerations.includes(level);
          if (spouseVisible) visibleNodes++;
          
          treeNode.spouse = {
            id: spouse.id,
            name: `${spouse.firstName} ${spouse.lastName}`,
            gender: spouse.gender,
            avatarColor: spouse.avatarColor,
            profilePhoto: spouse.profilePhoto,
            birthYear: spouse.birthYear,
            deathYear: spouse.deathYear,
            dateOfBirth: spouse.dateOfBirth,
            dateOfDeath: spouse.dateOfDeath,
            x: startX + 140,
            y: level * nodeSpacing.y,
            level,
            index: 0,
            subtreeWidth: 0,
            parentId: nodeKey,
            nodeType: 'spouse',
            isVisible: spouseVisible,
            children: [],
          } as TreeLayoutNode;
        }

        // Add children
        if (children.length > 0) {
          const childStartX = startX - (subtreeWidth / 2) + (nodeSpacing.x / 2);
          treeNode.children = children.map((child, index) => 
            buildSubtree(child, level + 1, childStartX + (index * nodeSpacing.x), nodeKey, index)
          );
          
          const childrenWidth = treeNode.children.reduce((sum, child) => sum + child.subtreeWidth, 0);
          treeNode.subtreeWidth = Math.max(subtreeWidth, childrenWidth);
        }

        return treeNode;
      };

      const rootNodes = roots.map((root, index) => {
        const rootX = index * 400 + 200;
        return buildSubtree(root, 0, rootX, undefined, index);
      });

      return {
        roots: rootNodes,
        stats: {
          totalNodes,
          maxDepth,
          generations: maxDepth + 1,
          families: rootNodes.length,
          visible: visibleNodes
        }
      };
    };

    return buildFilteredTree();
  }, [persons, filters]);

  // Export functions
  const exportAsSVG = useCallback(() => {
    if (!svgRef.current) return;
    
    const svgElement = svgRef.current;
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `family-tree-${new Date().toISOString().split('T')[0]}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  }, []);

  const exportAsPNG = useCallback(() => {
    if (!svgRef.current) return;
    
    const svgElement = svgRef.current;
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    canvas.width = 2000;
    canvas.height = 1500;
    
    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = `family-tree-${new Date().toISOString().split('T')[0]}.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);
          }
        });
      }
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  }, []);

  const exportAsJSON = useCallback(() => {
    const data = {
      exportDate: new Date().toISOString(),
      stats: treeData.stats,
      familyTree: treeData.roots,
      filters: filters
    };
    
    const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = jsonUrl;
    downloadLink.download = `family-tree-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(jsonUrl);
  }, [treeData, filters]);

  // Auto-fit functionality
  const handleAutoFit = useCallback(() => {
    if (!svgRef.current || treeData.roots.length === 0) return;

    const svg = svgRef.current;
    const svgRect = svg.getBoundingClientRect();
    
    const allNodes: TreeLayoutNode[] = [];
    const collectNodes = (node: TreeLayoutNode) => {
      if (node.isVisible) {
        allNodes.push(node);
        if (node.spouse && (node.spouse as TreeLayoutNode).isVisible) {
          allNodes.push(node.spouse as TreeLayoutNode);
        }
      }
      node.children.forEach(collectNodes);
    };
    
    treeData.roots.forEach(collectNodes);
    
    if (allNodes.length === 0) return;

    const bounds = {
      minX: Math.min(...allNodes.map(n => n.x)) - 100,
      maxX: Math.max(...allNodes.map(n => n.x)) + 100,
      minY: Math.min(...allNodes.map(n => n.y)) - 100,
      maxY: Math.max(...allNodes.map(n => n.y)) + 100,
    };

    const treeWidth = bounds.maxX - bounds.minX;
    const treeHeight = bounds.maxY - bounds.minY;
    
    const scaleX = svgRect.width / treeWidth;
    const scaleY = svgRect.height / treeHeight;
    const newZoom = Math.min(scaleX, scaleY, 1) * 0.9;

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    
    setZoom(newZoom);
    setPan({
      x: svgRect.width / 2 - centerX * newZoom,
      y: svgRect.height / 2 - centerY * newZoom,
    });
  }, [treeData]);

  useEffect(() => {
    const timer = setTimeout(handleAutoFit, 100);
    return () => clearTimeout(timer);
  }, [handleAutoFit]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.3, 4));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.3, 0.2));
  const handleReset = () => handleAutoFit();

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const getInitials = (name: string) => {
    const names = name.split(' ');
    return names.map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const getPersonAge = (node: TreeLayoutNode) => {
    if (node.dateOfBirth) {
      const birthDate = new Date(node.dateOfBirth);
      const endDate = node.dateOfDeath ? new Date(node.dateOfDeath) : new Date();
      const age = endDate.getFullYear() - birthDate.getFullYear();
      return node.dateOfDeath ? `${age} years` : `${age} years old`;
    }
    
    if (node.birthYear) {
      const endYear = node.deathYear || new Date().getFullYear();
      const age = endYear - node.birthYear;
      return node.deathYear ? `${age} years` : `${age} years old`;
    }
    
    return '';
  };

  const renderPersonNode = useCallback((node: TreeLayoutNode, uniqueKey: string): JSX.Element | null => {
    if (!node.isVisible) return null;
    
    const isSelected = selectedPersonId === node.id;
    const age = getPersonAge(node);
    const hasPhoto = Boolean(node.profilePhoto);
    
    return (
      <g 
        key={uniqueKey}
        transform={`translate(${node.x - 50}, ${node.y - 50})`}
        style={{ cursor: 'pointer' }}
        onClick={(e) => {
          e.stopPropagation();
          const person = persons.find(p => p.id === node.id);
          if (person) onPersonSelect(person);
        }}
      >
        {/* Selection highlight */}
        {isSelected && (
          <rect
            x="-5"
            y="-5"
            width="110"
            height="110"
            rx="12"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            className="animate-pulse"
          />
        )}
        
        {/* Main card */}
        <rect
          x="0"
          y="0"
          width="100"
          height="100"
          rx="8"
          fill="white"
          stroke={isSelected ? '#3b82f6' : '#e5e7eb'}
          strokeWidth={isSelected ? '2' : '1'}
          className="drop-shadow-lg"
        />
        
        {/* Profile photo or avatar circle */}
        <defs>
          <clipPath id={`photo-clip-${uniqueKey}`}>
            <circle cx="50" cy="28" r="18" />
          </clipPath>
        </defs>
        
        {hasPhoto ? (
          <>
            {/* Profile photo */}
            <image
              x="32"
              y="10"
              width="36"
              height="36"
              href={node.profilePhoto}
              clipPath={`url(#photo-clip-${uniqueKey})`}
              preserveAspectRatio="xMidYMid slice"
            />
            {/* Photo border */}
            <circle
              cx="50"
              cy="28"
              r="18"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
            />
          </>
        ) : (
          <>
            {/* Avatar circle */}
            <circle
              cx="50"
              cy="28"
              r="18"
              fill={node.avatarColor}
            />
            {/* Initials */}
            <text
              x="50"
              y="34"
              textAnchor="middle"
              className="fill-white text-sm font-bold"
              style={{ fontSize: '12px' }}
            >
              {getInitials(node.name)}
            </text>
          </>
        )}
        
        {/* Name */}
        <text
          x="50"
          y="56"
          textAnchor="middle"
          className="fill-gray-900 text-xs font-semibold"
          style={{ fontSize: '10px' }}
        >
          {node.name.length > 12 ? `${node.name.slice(0, 12)}...` : node.name}
        </text>
        
        {/* Age */}
        {age && (
          <text
            x="50"
            y="68"
            textAnchor="middle"
            className="fill-gray-600 text-xs"
            style={{ fontSize: '9px' }}
          >
            {age}
          </text>
        )}
        
        {/* Death indicator */}
        {(node.deathYear || node.dateOfDeath) && (
          <circle
            cx="85"
            cy="15"
            r="6"
            fill="#ef4444"
            className="opacity-80"
          />
        )}
        
        {/* Photo indicator */}
        {hasPhoto && (
          <circle
            cx="15"
            cy="85"
            r="6"
            fill="#22c55e"
            className="opacity-80"
          />
        )}
        
        {/* Gender indicator */}
        <rect
          x="5"
          y="5"
          width="12"
          height="8"
          rx="2"
          fill={node.gender === 'MALE' ? '#3b82f6' : node.gender === 'FEMALE' ? '#ec4899' : '#6b7280'}
          className="opacity-70"
        />
      </g>
    );
  }, [selectedPersonId, persons, onPersonSelect]);

  const renderConnections = useCallback((node: TreeLayoutNode, nodeKey: string): JSX.Element[] => {
    const connections: JSX.Element[] = [];

    if (!node.isVisible) return connections;

    // Marriage connection
    if (node.spouse && (node.spouse as TreeLayoutNode).isVisible) {
      connections.push(
        <line
          key={`marriage-${nodeKey}`}
          x1={node.x + 50}
          y1={node.y}
          x2={node.spouse.x - 50}
          y2={node.spouse.y}
          stroke="#ef4444"
          strokeWidth="3"
          strokeDasharray="5,5"
          className="opacity-80"
        />
      );
    }

    // Parent-child connections
    const visibleChildren = node.children.filter(child => child.isVisible);
    if (visibleChildren.length > 0) {
      connections.push(
        <line
          key={`parent-line-${nodeKey}`}
          x1={node.x}
          y1={node.y + 50}
          x2={node.x}
          y2={node.y + 90}
          stroke="#94a3b8"
          strokeWidth="2"
        />
      );

      if (visibleChildren.length > 1) {
        connections.push(
          <line
            key={`children-line-${nodeKey}`}
            x1={visibleChildren[0].x}
            y1={node.y + 90}
            x2={visibleChildren[visibleChildren.length - 1].x}
            y2={node.y + 90}
            stroke="#94a3b8"
            strokeWidth="2"
          />
        );
      }

      visibleChildren.forEach((child, index) => {
        connections.push(
          <line
            key={`child-line-${nodeKey}-${child.id}-${index}`}
            x1={child.x}
            y1={node.y + 90}
            x2={child.x}
            y2={child.y - 50}
            stroke="#94a3b8"
            strokeWidth="2"
          />
        );
      });
    }

    return connections;
  }, []);

  const renderTreeNode = useCallback((node: TreeLayoutNode, path: string = ''): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    const nodeKey = path ? `${path}-${node.id}` : `root-${node.id}-${node.index}`;
    
    elements.push(...renderConnections(node, nodeKey));
    
    const mainElement = renderPersonNode(node, `${nodeKey}-main`);
    if (mainElement) elements.push(mainElement);
    
    if (node.spouse) {
      const spouseElement = renderPersonNode(node.spouse as TreeLayoutNode, `${nodeKey}-spouse`);
      if (spouseElement) elements.push(spouseElement);
    }
    
    node.children.forEach((child, index) => {
      const childPath = `${nodeKey}-child-${index}`;
      elements.push(...renderTreeNode(child, childPath));
    });
    
    return elements;
  }, [renderConnections, renderPersonNode]);

  const resetFilters = () => {
    setFilters({
      searchTerm: '',
      focusPersonId: null,
      showGenerations: [],
      showLiving: true,
      showDeceased: true,
      showWithPhotos: false,
      maxGenerations: 10,
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading family tree...</p>
        </div>
      </div>
    );
  }

  if (persons.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="p-8 text-center max-w-md">
          <TreePine className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            Start Your Family Tree
          </h3>
          <p className="text-gray-600 mb-4">
            Add family members to see their relationships visualized in an interactive tree
          </p>
          <div className="flex justify-center space-x-2">
            <Badge variant="outline">Interactive</Badge>
            <Badge variant="outline">Filterable</Badge>
            <Badge variant="outline">Exportable</Badge>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Enhanced Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleZoomIn} title="Zoom In">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomOut} title="Zoom Out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} title="Fit to Screen">
            <Maximize2 className="h-4 w-4" />
          </Button>
          
          {/* Filter Panel */}
          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" title="Filter Tree">
                <Filter className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-80">
              <SheetHeader>
                <SheetTitle>Filter Family Tree</SheetTitle>
                <SheetDescription>
                  Focus on specific family members or generations
                </SheetDescription>
              </SheetHeader>
              
              <div className="space-y-6 mt-6">
                {/* Search Filter */}
                <div>
                  <Label htmlFor="search">Search Members</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search by name or location..."
                      value={filters.searchTerm}
                      onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Focus Person Filter */}
                <div>
                  <Label>Focus on Family</Label>
                  <Select
                    value={filters.focusPersonId || 'all'}
                    onValueChange={(value) => setFilters(prev => ({ 
                      ...prev, 
                      focusPersonId: value === 'all' ? null : value 
                    }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Show All Families</SelectItem>
                      {persons.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.firstName} {person.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Focus on a specific person and their immediate family
                  </p>
                </div>

                {/* Generation Range */}
                <div>
                  <Label>Maximum Generations</Label>
                  <Select
                    value={filters.maxGenerations.toString()}
                    onValueChange={(value) => setFilters(prev => ({ 
                      ...prev, 
                      maxGenerations: parseInt(value) 
                    }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Generations</SelectItem>
                      <SelectItem value="5">5 Generations</SelectItem>
                      <SelectItem value="7">7 Generations</SelectItem>
                      <SelectItem value="10">10 Generations</SelectItem>
                      <SelectItem value="15">15 Generations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Living/Deceased Filter */}
                <div>
                  <Label>Show Members</Label>
                  <div className="flex flex-col space-y-2 mt-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={filters.showLiving}
                        onChange={(e) => setFilters(prev => ({ 
                          ...prev, 
                          showLiving: e.target.checked 
                        }))}
                        className="rounded"
                      />
                      <span className="text-sm">Living members</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={filters.showDeceased}
                        onChange={(e) => setFilters(prev => ({ 
                          ...prev, 
                          showDeceased: e.target.checked 
                        }))}
                        className="rounded"
                      />
                      <span className="text-sm">Deceased members</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={filters.showWithPhotos}
                        onChange={(e) => setFilters(prev => ({ 
                          ...prev, 
                          showWithPhotos: e.target.checked 
                        }))}
                        className="rounded"
                      />
                      <span className="text-sm">Only members with photos</span>
                    </label>
                  </div>
                </div>

                {/* Generation Visibility */}
                <div>
                  <Label>Show Specific Generations</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {Array.from({ length: Math.min(treeData.stats.generations, 10) }, (_, i) => (
                      <label key={i} className="flex items-center space-x-1">
                        <input
                          type="checkbox"
                          checked={filters.showGenerations.length === 0 || filters.showGenerations.includes(i)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              if (filters.showGenerations.length === 0) {
                                setFilters(prev => ({ ...prev, showGenerations: [i] }));
                              } else {
                                setFilters(prev => ({ 
                                  ...prev, 
                                  showGenerations: [...prev.showGenerations, i].sort()
                                }));
                              }
                            } else {
                              setFilters(prev => ({ 
                                ...prev, 
                                showGenerations: prev.showGenerations.filter(g => g !== i)
                              }));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-xs">Gen {i + 1}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Leave unchecked to show all generations
                  </p>
                </div>

                {/* Filter Actions */}
                <div className="flex space-x-2">
                  <Button onClick={resetFilters} variant="outline" size="sm" className="flex-1">
                    Reset Filters
                  </Button>
                  <Button onClick={() => setShowFilters(false)} size="sm" className="flex-1">
                    Apply
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Export Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" title="Export Tree">
                <Download className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-80">
              <SheetHeader>
                <SheetTitle>Export Family Tree</SheetTitle>
                <SheetDescription>
                  Export your filtered tree in various formats
                </SheetDescription>
              </SheetHeader>
              
              <div className="space-y-4 mt-6">
                <Button onClick={exportAsPNG} className="w-full justify-start">
                  <FileImage className="h-4 w-4 mr-2" />
                  Export as PNG Image
                </Button>
                
                <Button onClick={exportAsSVG} className="w-full justify-start" variant="outline">
                  <FileImage className="h-4 w-4 mr-2" />
                  Export as SVG Vector
                </Button>
                
                <Button onClick={exportAsJSON} className="w-full justify-start" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Export as JSON Data
                </Button>
                
                <Button 
                  onClick={() => window.print()} 
                  className="w-full justify-start" 
                  variant="outline"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Tree
                </Button>
                
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>Current Filter:</strong><br />
                    Showing {treeData.stats.visible} of {treeData.stats.totalNodes} members
                    {filters.focusPersonId && (
                      <><br />Focused on: {persons.find(p => p.id === filters.focusPersonId)?.firstName} {persons.find(p => p.id === filters.focusPersonId)?.lastName}</>
                    )}
                  </p>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        <div className="text-xs text-gray-500 text-center">
          Zoom: {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Enhanced Statistics */}
      <div className="absolute top-4 left-4 z-10">
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <TreePine className="h-4 w-4 text-green-600" />
              <span className="font-medium">Family Statistics</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="font-medium text-gray-900">
                  {treeData.stats.visible}/{treeData.stats.totalNodes}
                </div>
                <div className="text-gray-500">Visible/Total</div>
              </div>
              <div>
                <div className="font-medium text-gray-900">{treeData.stats.generations}</div>
                <div className="text-gray-500">Generations</div>
              </div>
              <div>
                <div className="font-medium text-gray-900">{treeData.stats.families}</div>
                <div className="text-gray-500">Families</div>
              </div>
              <div>
                <div className="font-medium text-gray-900">{treeData.stats.maxDepth}</div>
                <div className="text-gray-500">Max Depth</div>
              </div>
            </div>
            {(filters.searchTerm || filters.focusPersonId || filters.showGenerations.length > 0) && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-600">Filtered</span>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={resetFilters}
                    className="h-6 px-2 text-xs"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-10">
        <Card className="p-3">
          <div className="space-y-2 text-xs text-gray-600">
            <div className="font-medium">Navigation:</div>
            <div>• Click to select a person</div>
            <div>• Drag to pan around</div>
            <div>• Use filters to focus on specific families</div>
            <div>• Export filtered views</div>
          </div>
        </Card>
      </div>

      {/* Enhanced Legend */}
      <div className="absolute bottom-4 right-4 z-10">
        <Card className="p-3">
          <div className="space-y-2 text-xs">
            <div className="font-medium">Legend:</div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-0.5 bg-gray-400"></div>
              <span>Parent-Child</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-0.5 bg-red-500" style={{ borderTop: '2px dashed #ef4444' }}></div>
              <span>Marriage</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Deceased</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Has Photo</span>
            </div>
          </div>
        </Card>
      </div>

      {/* SVG Tree */}
      <div className="flex-1 overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <defs>
            <filter id="drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3"/>
            </filter>
          </defs>
          
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {treeData.roots.map((root, index) => renderTreeNode(root, `root-${index}`)).flat()}
          </g>
        </svg>
      </div>
    </div>
  );
}