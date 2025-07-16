'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ZoomIn, ZoomOut, RotateCcw, TreePine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Person, TreeNode } from '@/types';
import axios from 'axios';

interface FamilyTreeViewProps {
  onPersonSelect: (person: Person) => void;
  selectedPersonId?: string;
}

export function FamilyTreeView({ onPersonSelect, selectedPersonId }: FamilyTreeViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const { data: persons = [], isLoading } = useQuery({
    queryKey: ['persons'],
    queryFn: async () => {
      const response = await axios.get('/api/persons');
      return response.data as Person[];
    },
  });

  const buildFamilyTree = (persons: Person[]): TreeNode[] => {
    if (persons.length === 0) return [];

    // Find root nodes (people without parents)
    const roots = persons.filter(person => !person.fatherId && !person.motherId);
    
    if (roots.length === 0 && persons.length > 0) {
      // If no clear roots, take the first person as root
      return [buildTreeNode(persons[0], persons, 0, 0)];
    }

    return roots.map((root, index) => buildTreeNode(root, persons, index * 300, 0));
  };

  const buildTreeNode = (person: Person, allPersons: Person[], x: number, y: number): TreeNode => {
    const children = allPersons.filter(p => p.fatherId === person.id || p.motherId === person.id);
    
    const treeNode: TreeNode = {
      id: person.id,
      name: `${person.firstName} ${person.lastName}`,
      gender: person.gender,
      avatarColor: person.avatarColor,
      birthYear: person.birthYear,
      deathYear: person.deathYear,
      x,
      y,
      children: [],
    };

    // Add spouse if exists
    if (person.spouseId) {
      const spouse = allPersons.find(p => p.id === person.spouseId);
      if (spouse) {
        treeNode.spouse = {
          id: spouse.id,
          name: `${spouse.firstName} ${spouse.lastName}`,
          gender: spouse.gender,
          avatarColor: spouse.avatarColor,
          birthYear: spouse.birthYear,
          deathYear: spouse.deathYear,
          x: x + 120,
          y,
          children: [],
        };
      }
    }

    // Add children recursively
    treeNode.children = children.map((child, index) => 
      buildTreeNode(child, allPersons, x + (index - children.length / 2) * 150, y + 150)
    );

    return treeNode;
  };

  const treeData = buildFamilyTree(persons);

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.3));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
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
    return names.map(n => n.charAt(0)).join('').toUpperCase();
  };

  const renderTreeNode = (node: TreeNode): JSX.Element => {
    const isSelected = selectedPersonId === node.id;
    
    return (
      <g key={node.id}>
        {/* Connections to children */}
        {node.children.map(child => (
          <g key={`${node.id}-${child.id}`}>
            <line
              x1={node.x}
              y1={node.y + 30}
              x2={node.x}
              y2={node.y + 75}
              stroke="#94a3b8"
              strokeWidth="2"
            />
            <line
              x1={node.x}
              y1={node.y + 75}
              x2={child.x}
              y2={child.y + 75}
              stroke="#94a3b8"
              strokeWidth="2"
            />
            <line
              x1={child.x}
              y1={child.y + 75}
              x2={child.x}
              y2={child.y - 30}
              stroke="#94a3b8"
              strokeWidth="2"
            />
          </g>
        ))}

        {/* Marriage connection */}
        {node.spouse && (
          <line
            x1={node.x + 30}
            y1={node.y}
            x2={node.spouse.x - 30}
            y2={node.spouse.y}
            stroke="#ef4444"
            strokeWidth="3"
          />
        )}

        {/* Person node */}
        <g 
          transform={`translate(${node.x - 40}, ${node.y - 40})`}
          style={{ cursor: 'pointer' }}
          onClick={() => {
            const person = persons.find(p => p.id === node.id);
            if (person) onPersonSelect(person);
          }}
        >
          <rect
            x="0"
            y="0"
            width="80"
            height="80"
            rx="8"
            fill="white"
            stroke={isSelected ? '#3b82f6' : '#e2e8f0'}
            strokeWidth={isSelected ? '3' : '1'}
            className="drop-shadow-md"
          />
          
          <circle
            cx="40"
            cy="25"
            r="15"
            fill={node.avatarColor}
          />
          
          <text
            x="40"
            y="30"
            textAnchor="middle"
            className="fill-white text-xs font-medium"
          >
            {getInitials(node.name)}
          </text>
          
          <text
            x="40"
            y="50"
            textAnchor="middle"
            className="fill-gray-900 text-xs font-medium"
          >
            {node.name.split(' ')[0]}
          </text>
          
          <text
            x="40"
            y="62"
            textAnchor="middle"
            className="fill-gray-900 text-xs"
          >
            {node.name.split(' ')[1]}
          </text>
          
          {node.birthYear && (
            <text
              x="40"
              y="74"
              textAnchor="middle"
              className="fill-gray-500 text-xs"
            >
              {node.deathYear ? `${node.birthYear}-${node.deathYear}` : `b. ${node.birthYear}`}
            </text>
          )}
        </g>

        {/* Spouse node */}
        {node.spouse && (
          <g 
            transform={`translate(${node.spouse.x - 40}, ${node.spouse.y - 40})`}
            style={{ cursor: 'pointer' }}
            onClick={() => {
              const person = persons.find(p => p.id === node.spouse!.id);
              if (person) onPersonSelect(person);
            }}
          >
            <rect
              x="0"
              y="0"
              width="80"
              height="80"
              rx="8"
              fill="white"
              stroke={selectedPersonId === node.spouse.id ? '#3b82f6' : '#e2e8f0'}
              strokeWidth={selectedPersonId === node.spouse.id ? '3' : '1'}
              className="drop-shadow-md"
            />
            
            <circle
              cx="40"
              cy="25"
              r="15"
              fill={node.spouse.avatarColor}
            />
            
            <text
              x="40"
              y="30"
              textAnchor="middle"
              className="fill-white text-xs font-medium"
            >
              {getInitials(node.spouse.name)}
            </text>
            
            <text
              x="40"
              y="50"
              textAnchor="middle"
              className="fill-gray-900 text-xs font-medium"
            >
              {node.spouse.name.split(' ')[0]}
            </text>
            
            <text
              x="40"
              y="62"
              textAnchor="middle"
              className="fill-gray-900 text-xs"
            >
              {node.spouse.name.split(' ')[1]}
            </text>
            
            {node.spouse.birthYear && (
              <text
                x="40"
                y="74"
                textAnchor="middle"
                className="fill-gray-500 text-xs"
              >
                {node.spouse.deathYear ? 
                  `${node.spouse.birthYear}-${node.spouse.deathYear}` : 
                  `b. ${node.spouse.birthYear}`
                }
              </text>
            )}
          </g>
        )}

        {/* Render children */}
        {node.children.map(child => renderTreeNode(child))}
      </g>
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (persons.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="p-8 text-center">
          <TreePine className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Family Members Yet
          </h3>
          <p className="text-gray-600">
            Add family members to see your family tree visualization
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex space-x-2">
        <Button variant="outline" size="sm" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Info */}
      <div className="absolute top-4 left-4 z-10">
        <Card className="p-3">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <TreePine className="h-4 w-4" />
            <span>{persons.length} family members</span>
          </div>
        </Card>
      </div>

      {/* SVG Tree */}
      <div className="flex-1 overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            <g transform="translate(400, 100)">
              {treeData.map(root => renderTreeNode(root))}
            </g>
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10">
        <Card className="p-3">
          <div className="space-y-2 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-0.5 bg-gray-400"></div>
              <span>Parent-Child</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-0.5 bg-red-500"></div>
              <span>Marriage</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}