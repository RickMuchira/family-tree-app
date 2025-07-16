'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ZoomIn, ZoomOut, RotateCcw, TreePine, Maximize2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
}

export function FamilyTreeView({ onPersonSelect, selectedPersonId }: FamilyTreeViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(0.8);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [viewBox, setViewBox] = useState({ width: 1200, height: 800 });

  const { data: persons = [], isLoading } = useQuery({
    queryKey: ['persons'],
    queryFn: async () => {
      const response = await axios.get('/api/persons');
      return response.data as Person[];
    },
  });

  // Enhanced tree building with better layout
  const treeData = useMemo(() => {
    if (persons.length === 0) return { roots: [], stats: { totalNodes: 0, maxDepth: 0, generations: 0 } };

    const buildOptimizedTree = (): { roots: TreeLayoutNode[], stats: any } => {
      // Find root nodes (people without parents)
      const roots = persons.filter(person => !person.fatherId && !person.motherId);
      
      if (roots.length === 0 && persons.length > 0) {
        // If no clear roots, find the oldest person or use the first
        const oldestPerson = persons.reduce((oldest, current) => {
          if (!oldest.birthYear && current.birthYear) return current;
          if (oldest.birthYear && !current.birthYear) return oldest;
          if (oldest.birthYear && current.birthYear) {
            return current.birthYear < oldest.birthYear ? current : oldest;
          }
          return oldest;
        }, persons[0]);
        
        roots.push(oldestPerson);
      }

      let totalNodes = 0;
      let maxDepth = 0;
      const nodeSpacing = { x: 180, y: 120 };
      
      const buildSubtree = (person: Person, level: number, startX: number): TreeLayoutNode => {
        totalNodes++;
        maxDepth = Math.max(maxDepth, level);
        
        const children = persons.filter(p => p.fatherId === person.id || p.motherId === person.id);
        const spouse = person.spouseId ? persons.find(p => p.id === person.spouseId) : undefined;
        
        // Calculate subtree width
        let subtreeWidth = Math.max(1, children.length) * nodeSpacing.x;
        
        const treeNode: TreeLayoutNode = {
          id: person.id,
          name: `${person.firstName} ${person.lastName}`,
          gender: person.gender,
          avatarColor: person.avatarColor,
          birthYear: person.birthYear,
          deathYear: person.deathYear,
          dateOfBirth: person.dateOfBirth,
          dateOfDeath: person.dateOfDeath,
          x: startX,
          y: level * nodeSpacing.y,
          level,
          index: 0,
          subtreeWidth,
          children: [],
        };

        // Add spouse
        if (spouse) {
          treeNode.spouse = {
            id: spouse.id,
            name: `${spouse.firstName} ${spouse.lastName}`,
            gender: spouse.gender,
            avatarColor: spouse.avatarColor,
            birthYear: spouse.birthYear,
            deathYear: spouse.deathYear,
            dateOfBirth: spouse.dateOfBirth,
            dateOfDeath: spouse.dateOfDeath,
            x: startX + 140,
            y: level * nodeSpacing.y,
            level,
            index: 0,
            subtreeWidth: 0,
            children: [],
          };
        }

        // Add children with improved positioning
        if (children.length > 0) {
          const childStartX = startX - (subtreeWidth / 2) + (nodeSpacing.x / 2);
          treeNode.children = children.map((child, index) => 
            buildSubtree(child, level + 1, childStartX + (index * nodeSpacing.x))
          );
          
          // Recalculate subtree width based on actual children
          const childrenWidth = treeNode.children.reduce((sum, child) => sum + child.subtreeWidth, 0);
          treeNode.subtreeWidth = Math.max(subtreeWidth, childrenWidth);
        }

        return treeNode;
      };

      const rootNodes = roots.map((root, index) => {
        const rootX = index * 400 + 200;
        return buildSubtree(root, 0, rootX);
      });

      return {
        roots: rootNodes,
        stats: {
          totalNodes,
          maxDepth,
          generations: maxDepth + 1,
          families: rootNodes.length
        }
      };
    };

    return buildOptimizedTree();
  }, [persons]);

  // Auto-fit and center the tree
  const handleAutoFit = useCallback(() => {
    if (!svgRef.current || treeData.roots.length === 0) return;

    const svg = svgRef.current;
    const svgRect = svg.getBoundingClientRect();
    
    // Calculate tree bounds
    const allNodes: TreeLayoutNode[] = [];
    const collectNodes = (node: TreeLayoutNode) => {
      allNodes.push(node);
      if (node.spouse) allNodes.push(node.spouse as TreeLayoutNode);
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

  // Auto-fit on data change
  useEffect(() => {
    const timer = setTimeout(handleAutoFit, 100);
    return () => clearTimeout(timer);
  }, [handleAutoFit]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.3, 4));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.3, 0.2));
  const handleReset = () => handleAutoFit();

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click only
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

  const getPersonDates = (node: TreeLayoutNode) => {
    if (node.dateOfBirth && node.dateOfDeath) {
      return `${new Date(node.dateOfBirth).getFullYear()}-${new Date(node.dateOfDeath).getFullYear()}`;
    }
    if (node.dateOfBirth) {
      return `b. ${new Date(node.dateOfBirth).getFullYear()}`;
    }
    if (node.birthYear && node.deathYear) {
      return `${node.birthYear}-${node.deathYear}`;
    }
    if (node.birthYear) {
      return `b. ${node.birthYear}`;
    }
    return '';
  };

  const renderPersonNode = useCallback((node: TreeLayoutNode, isSpouse = false): JSX.Element => {
    const isSelected = selectedPersonId === node.id;
    const age = getPersonAge(node);
    const dates = getPersonDates(node);
    
    return (
      <g 
        key={`${node.id}-${isSpouse ? 'spouse' : 'main'}`}
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
          className="drop-shadow-lg transition-all duration-200 hover:drop-shadow-xl"
        />
        
        {/* Avatar circle */}
        <circle
          cx="50"
          cy="28"
          r="18"
          fill={node.avatarColor}
          className="transition-colors duration-200"
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
        
        {/* Age or dates */}
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
        
        {/* Birth/Death dates */}
        {dates && (
          <text
            x="50"
            y="80"
            textAnchor="middle"
            className="fill-gray-500 text-xs"
            style={{ fontSize: '8px' }}
          >
            {dates}
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

  const renderConnections = useCallback((node: TreeLayoutNode): JSX.Element[] => {
    const connections: JSX.Element[] = [];

    // Marriage connection
    if (node.spouse) {
      connections.push(
        <line
          key={`marriage-${node.id}`}
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
    if (node.children.length > 0) {
      const childrenCenterX = node.children.reduce((sum, child) => sum + child.x, 0) / node.children.length;
      
      // Vertical line from parent down
      connections.push(
        <line
          key={`parent-line-${node.id}`}
          x1={node.x}
          y1={node.y + 50}
          x2={node.x}
          y2={node.y + 90}
          stroke="#94a3b8"
          strokeWidth="2"
        />
      );

      // Horizontal line across children
      if (node.children.length > 1) {
        connections.push(
          <line
            key={`children-line-${node.id}`}
            x1={node.children[0].x}
            y1={node.y + 90}
            x2={node.children[node.children.length - 1].x}
            y2={node.y + 90}
            stroke="#94a3b8"
            strokeWidth="2"
          />
        );
      }

      // Vertical lines to each child
      node.children.forEach((child, index) => {
        connections.push(
          <line
            key={`child-line-${node.id}-${child.id}`}
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

  const renderTreeNode = useCallback((node: TreeLayoutNode): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    
    // Add connections first (so they appear behind nodes)
    elements.push(...renderConnections(node));
    
    // Add main person node
    elements.push(renderPersonNode(node));
    
    // Add spouse node
    if (node.spouse) {
      elements.push(renderPersonNode(node.spouse as TreeLayoutNode, true));
    }
    
    // Add children recursively
    node.children.forEach(child => {
      elements.push(...renderTreeNode(child));
    });
    
    return elements;
  }, [renderConnections, renderPersonNode]);

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
            <Badge variant="outline">Zoomable</Badge>
            <Badge variant="outline">Drag & Drop</Badge>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Controls */}
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
        </div>
        <div className="text-xs text-gray-500 text-center">
          Zoom: {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Statistics */}
      <div className="absolute top-4 left-4 z-10">
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <TreePine className="h-4 w-4 text-green-600" />
              <span className="font-medium">Family Statistics</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="font-medium text-gray-900">{treeData.stats.totalNodes}</div>
                <div className="text-gray-500">Members</div>
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
            <div>• Use zoom controls</div>
          </div>
        </Card>
      </div>

      {/* Legend */}
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
            {treeData.roots.map(root => renderTreeNode(root)).flat()}
          </g>
        </svg>
      </div>
    </div>
  );
}