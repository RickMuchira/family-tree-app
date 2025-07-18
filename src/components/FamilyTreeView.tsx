// Complete fixed FamilyTreeView.tsx with working filter integration

'use client';

import * as React from "react";
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ZoomIn, ZoomOut, RotateCcw, TreePine, Maximize2, Users, Download, Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Person, TreeNode } from '@/types';
import { FamilyFilter } from '@/components/FamilyFilter';
import axios from 'axios';

interface FamilyTreeViewProps {
  onPersonSelect: (person: Person) => void;
  selectedPersonId?: string;
}

// Local layout node type for tree rendering
interface TreeLayoutNode extends Omit<TreeNode, 'children' | 'spouse'> {
  index: number;
  subtreeWidth: number;
  children: TreeLayoutNode[];
  spouse?: TreeLayoutNode;
}

export function FamilyTreeView({ onPersonSelect, selectedPersonId }: FamilyTreeViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(0.8);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Filter states
  const [filteredPersons, setFilteredPersons] = useState<Person[]>([]);
  const [isFiltered, setIsFiltered] = useState(false);
  // Add state for focus person
  const [focusPersonId, setFocusPersonId] = useState<string | null>(null);

  const { data: persons = [], isLoading } = useQuery({
    queryKey: ['persons'],
    queryFn: async () => {
      const response = await axios.get('/api/persons');
      return response.data as Person[];
    },
  });

  // Initialize filteredPersons with all persons when data loads
  useEffect(() => {
    if (persons.length > 0) {
      console.log('Initializing with persons:', persons.length);
      setFilteredPersons(persons);
      setIsFiltered(false);
    }
  }, [persons]);

  // Handle filter changes
  const handleFilterChange = useCallback((filtered: Person[], focusId?: string) => {
    console.log('Filter changed:', filtered.length, 'of', persons.length, 'Focus:', focusId);
    setFilteredPersons(filtered);
    setFocusPersonId(focusId || null);
    setIsFiltered(filtered.length !== persons.length && filtered.length > 0);
  }, [persons.length]);

  // Improved treeData logic: single focused tree if filtering and focusPersonId is set
  const treeData = useMemo(() => {
    const dataToUse = filteredPersons.length > 0 ? filteredPersons : persons;
    
    console.log('Building tree with:', dataToUse.length, 'persons', 'Focus:', focusPersonId);
    
    if (dataToUse.length === 0) {
      return { roots: [], stats: { totalNodes: 0, maxDepth: 0, generations: 0 } };
    }

    const buildSingleFocusedTree = (): { roots: TreeLayoutNode[], stats: any } => {
      if (focusPersonId && isFiltered) {
        // FILTERED MODE: Create single tree focused on the selected person
        const focusPerson = dataToUse.find(p => p.id === focusPersonId);
        
        if (!focusPerson) {
          return { roots: [], stats: { totalNodes: 0, maxDepth: 0, generations: 0 } };
        }

        // Find the SINGLE top ancestor for this family network
        const findTopAncestor = (person: Person): Person => {
          // Look for parents in the filtered data
          const father = person.fatherId ? dataToUse.find(p => p.id === person.fatherId) : null;
          const mother = person.motherId ? dataToUse.find(p => p.id === person.motherId) : null;
          
          // If no parents in filtered data, this person is the top
          if (!father && !mother) {
            return person;
          }
          
          // If only one parent exists, follow that lineage
          if (father && !mother) {
            return findTopAncestor(father);
          }
          if (mother && !father) {
            return findTopAncestor(mother);
          }
          
          // If both parents exist, choose the older one or default to father
            if (father && mother) {
            let chosenParent = father; // Default to father
            
            if (father.birthYear && mother.birthYear) {
              chosenParent = father.birthYear <= mother.birthYear ? father : mother;
            } else if (mother.birthYear && !father.birthYear) {
              chosenParent = mother;
            }
            // If only father has birth year or neither have birth years, stick with father
            
            return findTopAncestor(chosenParent);
          }
          
          return person; // Fallback
        };

        const singleRoot = findTopAncestor(focusPerson);
        
        // Build the tree from this single root
        let totalNodes = 0;
        let maxDepth = 0;
        const nodeSpacing = { x: 180, y: 120 };
        
        const buildSubtree = (person: Person, level: number, startX: number): TreeLayoutNode => {
          totalNodes++;
          maxDepth = Math.max(maxDepth, level);
          
          // Only get children that exist in filtered data
          const children = dataToUse.filter(p => p.fatherId === person.id || p.motherId === person.id);
          
          // Only get spouse if they exist in filtered data
          const spouse = person.spouseId ? dataToUse.find(p => p.id === person.spouseId) : undefined;
          
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

          // Add spouse ONLY if they're in the filtered data
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

          // Add children recursively
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

        // Build single tree from the single root
        const singleTreeRoot = buildSubtree(singleRoot, 0, 400); // Center it

        return {
          roots: [singleTreeRoot], // ALWAYS return single root when filtered
          stats: {
            totalNodes,
            maxDepth,
            generations: maxDepth + 1,
            families: 1, // Always 1 family when filtered
            focusedOn: `${focusPerson.firstName} ${focusPerson.lastName}`
            }
        };
      } else {
        // NORMAL MODE: Show all families as separate trees
        const roots = dataToUse.filter(person => !person.fatherId && !person.motherId);
        
        if (roots.length === 0 && dataToUse.length > 0) {
          // If no clear roots, find the oldest person
          const oldestPerson = dataToUse.reduce((oldest, current) => {
            if (!oldest.birthYear && current.birthYear) return current;
            if (oldest.birthYear && !current.birthYear) return oldest;
            if (oldest.birthYear && current.birthYear) {
              return current.birthYear < oldest.birthYear ? current : oldest;
            }
            return oldest;
          }, dataToUse[0]);
          
          roots.push(oldestPerson);
        }

      let totalNodes = 0;
      let maxDepth = 0;
      const nodeSpacing = { x: 180, y: 120 };
        
      const buildSubtree = (person: Person, level: number, startX: number): TreeLayoutNode => {
        totalNodes++;
        maxDepth = Math.max(maxDepth, level);
          
        const children = dataToUse.filter(p => p.fatherId === person.id || p.motherId === person.id);
          const spouse = person.spouseId ? dataToUse.find(p => p.id === person.spouseId) : undefined;
          
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

        if (children.length > 0) {
          const childStartX = startX - (subtreeWidth / 2) + (nodeSpacing.x / 2);
          treeNode.children = children.map((child, index) =>
            buildSubtree(child, level + 1, childStartX + (index * nodeSpacing.x))
          );
            
          const childrenWidth = treeNode.children.reduce((sum, child) => sum + child.subtreeWidth, 0);
          treeNode.subtreeWidth = Math.max(subtreeWidth, childrenWidth);
        }

        return treeNode;
      };

        // Build multiple trees for normal mode, spaced apart
      const rootNodes = roots.map((root, index) => {
          const rootX = index * 500 + 300;
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
      }
    };

    return buildSingleFocusedTree();
  }, [filteredPersons, persons, focusPersonId, isFiltered]);

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

  // Export functionality
  const exportTreeAsPNG = useCallback(async () => {
    if (!svgRef.current || treeData.roots.length === 0) return;

    try {
      // Get all nodes and their positions
      const allNodes: TreeLayoutNode[] = [];
      const collectAllNodes = (node: TreeLayoutNode) => {
        allNodes.push(node);
        if (node.spouse) allNodes.push(node.spouse as TreeLayoutNode);
        node.children.forEach(collectAllNodes);
      };
      
      treeData.roots.forEach(collectAllNodes);
      
      if (allNodes.length === 0) return;

      // Calculate ACTUAL bounds with proper padding
      const nodePositions = allNodes.map(node => ({ x: node.x, y: node.y }));
      const bounds = {
        minX: Math.min(...nodePositions.map(p => p.x)) - 100,
        maxX: Math.max(...nodePositions.map(p => p.x)) + 100,
        minY: Math.min(...nodePositions.map(p => p.y)) - 100,
        maxY: Math.max(...nodePositions.map(p => p.y)) + 100,
      };

      // Add extra padding
      const padding = 80;
      bounds.minX -= padding;
      bounds.maxX += padding;
      bounds.minY -= padding;
      bounds.maxY += padding;

      const contentWidth = bounds.maxX - bounds.minX;
      const contentHeight = bounds.maxY - bounds.minY;
      
      // Add space for title
      const titleHeight = 100;
      const totalWidth = contentWidth;
      const totalHeight = contentHeight + titleHeight;

      // Create export SVG with exact dimensions
      const exportSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      exportSvg.setAttribute('width', totalWidth.toString());
      exportSvg.setAttribute('height', totalHeight.toString());
      exportSvg.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`);
      exportSvg.style.backgroundColor = '#ffffff';
      exportSvg.style.fontFamily = 'system-ui, -apple-system, sans-serif';

      // Add styles
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      
      // Drop shadow filter
      const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
      filter.setAttribute('id', 'shadow');
      filter.setAttribute('x', '-50%');
      filter.setAttribute('y', '-50%');
      filter.setAttribute('width', '200%');
      filter.setAttribute('height', '200%');
      
      const feDropShadow = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
      feDropShadow.setAttribute('dx', '0');
      feDropShadow.setAttribute('dy', '2');
      feDropShadow.setAttribute('stdDeviation', '4');
      feDropShadow.setAttribute('flood-color', '#000000');
      feDropShadow.setAttribute('flood-opacity', '0.1');
      
      filter.appendChild(feDropShadow);
      defs.appendChild(filter);
      exportSvg.appendChild(defs);

      // White background
      const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      background.setAttribute('width', totalWidth.toString());
      background.setAttribute('height', totalHeight.toString());
      background.setAttribute('fill', '#ffffff');
      exportSvg.appendChild(background);

      // Title section
      const titleGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      
      const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      titleText.setAttribute('x', (totalWidth / 2).toString());
      titleText.setAttribute('y', '40');
      titleText.setAttribute('text-anchor', 'middle');
      titleText.setAttribute('font-size', '28');
      titleText.setAttribute('font-weight', 'bold');
      titleText.setAttribute('fill', '#1f2937');
      titleText.textContent = isFiltered && treeData.stats.focusedOn ? 
        `${treeData.stats.focusedOn}'s Family Tree` : 'Family Tree';
      
      const subtitleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      subtitleText.setAttribute('x', (totalWidth / 2).toString());
      subtitleText.setAttribute('y', '65');
      subtitleText.setAttribute('text-anchor', 'middle');
      subtitleText.setAttribute('font-size', '14');
      subtitleText.setAttribute('fill', '#6b7280');
      subtitleText.textContent = `${treeData.stats.totalNodes} members • ${treeData.stats.generations} generations`;
      
      titleGroup.appendChild(titleText);
      titleGroup.appendChild(subtitleText);
      exportSvg.appendChild(titleGroup);

      // Helper functions for adding elements
      const addPersonNode = (node: TreeLayoutNode, parent: SVGElement, isSpouse = false) => {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        // Person card (centered on node position)
        const card = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        card.setAttribute('x', (node.x - 50).toString());
        card.setAttribute('y', (node.y - 50).toString());
        card.setAttribute('width', '100');
        card.setAttribute('height', '100');
        card.setAttribute('rx', '12');
        card.setAttribute('fill', '#ffffff');
        card.setAttribute('stroke', '#e5e7eb');
        card.setAttribute('stroke-width', '2');
        card.setAttribute('filter', 'url(#shadow)');
        
        // Avatar circle
        const avatar = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        avatar.setAttribute('cx', node.x.toString());
        avatar.setAttribute('cy', (node.y - 15).toString());
        avatar.setAttribute('r', '18');
        avatar.setAttribute('fill', node.avatarColor);
        
        // Initials
        const initials = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        initials.setAttribute('x', node.x.toString());
        initials.setAttribute('y', (node.y - 8).toString());
        initials.setAttribute('text-anchor', 'middle');
        initials.setAttribute('font-size', '14');
        initials.setAttribute('font-weight', 'bold');
        initials.setAttribute('fill', '#ffffff');
        initials.textContent = getInitials(node.name);
        
        // Name
        const name = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        name.setAttribute('x', node.x.toString());
        name.setAttribute('y', (node.y + 15).toString());
        name.setAttribute('text-anchor', 'middle');
        name.setAttribute('font-size', '11');
        name.setAttribute('font-weight', '600');
        name.setAttribute('fill', '#1f2937');
        name.textContent = node.name.length > 14 ? `${node.name.slice(0, 14)}...` : node.name;
        
        // Age info
        const ageInfo = getPersonAge(node);
        if (ageInfo) {
          const age = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          age.setAttribute('x', node.x.toString());
          age.setAttribute('y', (node.y + 30).toString());
          age.setAttribute('text-anchor', 'middle');
          age.setAttribute('font-size', '9');
          age.setAttribute('fill', '#6b7280');
          age.textContent = ageInfo;
          group.appendChild(age);
        }

        // Gender indicator
        const genderColor = node.gender === 'MALE' ? '#3b82f6' : node.gender === 'FEMALE' ? '#ec4899' : '#6b7280';
        const genderIndicator = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        genderIndicator.setAttribute('x', (node.x - 45).toString());
        genderIndicator.setAttribute('y', (node.y - 45).toString());
        genderIndicator.setAttribute('width', '12');
        genderIndicator.setAttribute('height', '8');
        genderIndicator.setAttribute('rx', '2');
        genderIndicator.setAttribute('fill', genderColor);
        
        group.appendChild(card);
        group.appendChild(avatar);
        group.appendChild(initials);
        group.appendChild(name);
        group.appendChild(genderIndicator);
        
        parent.appendChild(group);
      };

      const addConnections = (node: TreeLayoutNode, parent: SVGElement) => {
        // Marriage line
        if (node.spouse) {
          const marriageLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          marriageLine.setAttribute('x1', (node.x + 50).toString());
          marriageLine.setAttribute('y1', node.y.toString());
          marriageLine.setAttribute('x2', (node.spouse.x - 50).toString());
          marriageLine.setAttribute('y2', node.spouse.y.toString());
          marriageLine.setAttribute('stroke', '#ef4444');
          marriageLine.setAttribute('stroke-width', '3');
          marriageLine.setAttribute('stroke-dasharray', '6,4');
          parent.appendChild(marriageLine);
        }

        // Parent-child connections
        if (node.children.length > 0) {
          // Vertical line down from parent
          const parentLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          parentLine.setAttribute('x1', node.x.toString());
          parentLine.setAttribute('y1', (node.y + 50).toString());
          parentLine.setAttribute('x2', node.x.toString());
          parentLine.setAttribute('y2', (node.y + 90).toString());
          parentLine.setAttribute('stroke', '#6b7280');
          parentLine.setAttribute('stroke-width', '2');
          parent.appendChild(parentLine);

          // Horizontal line across children
          if (node.children.length > 1) {
            const childrenLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            childrenLine.setAttribute('x1', node.children[0].x.toString());
            childrenLine.setAttribute('y1', (node.y + 90).toString());
            childrenLine.setAttribute('x2', node.children[node.children.length - 1].x.toString());
            childrenLine.setAttribute('y2', (node.y + 90).toString());
            childrenLine.setAttribute('stroke', '#6b7280');
            childrenLine.setAttribute('stroke-width', '2');
            parent.appendChild(childrenLine);
          }

          // Lines to each child
          node.children.forEach(child => {
            const childLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            childLine.setAttribute('x1', child.x.toString());
            childLine.setAttribute('y1', (node.y + 90).toString());
            childLine.setAttribute('x2', child.x.toString());
            childLine.setAttribute('y2', (child.y - 50).toString());
            childLine.setAttribute('stroke', '#6b7280');
            childLine.setAttribute('stroke-width', '2');
            parent.appendChild(childLine);
          });
        }
      };

      // Main content group - translate to fit properly
      const contentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const translateX = -bounds.minX;
      const translateY = -bounds.minY + titleHeight;
      contentGroup.setAttribute('transform', `translate(${translateX}, ${translateY})`);

      // Add all tree elements
      const addTreeElements = (node: TreeLayoutNode) => {
        // Add connections first (behind nodes)
        addConnections(node, contentGroup);
        
        // Add person nodes
        addPersonNode(node, contentGroup);
        if (node.spouse) {
          addPersonNode(node.spouse as TreeLayoutNode, contentGroup, true);
        }
        
        // Add children recursively
        node.children.forEach(addTreeElements);
      };

      treeData.roots.forEach(addTreeElements);
      exportSvg.appendChild(contentGroup);

      // Convert to PNG
      const svgData = new XMLSerializer().serializeToString(exportSvg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      const scale = 2;
      canvas.width = totalWidth * scale;
      canvas.height = totalHeight * scale;
      ctx.scale(scale, scale);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, totalWidth, totalHeight);

      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        ctx.drawImage(img, 0, 0, totalWidth, totalHeight);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const link = document.createElement('a');
            link.download = `family-tree-${new Date().toISOString().split('T')[0]}.png`;
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);
          }
        }, 'image/png', 1.0);
        
        URL.revokeObjectURL(url);
      };
      
      img.src = url;

    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [treeData, isFiltered]);

  // Print functionality  
  const printFamilyTree = useCallback(async () => {
    if (!svgRef.current || treeData.roots.length === 0) return;

    try {
      // Get all nodes and their positions
      const allNodes: TreeLayoutNode[] = [];
      const collectAllNodes = (node: TreeLayoutNode) => {
        allNodes.push(node);
        if (node.spouse) allNodes.push(node.spouse as TreeLayoutNode);
        node.children.forEach(collectAllNodes);
      };
      
      treeData.roots.forEach(collectAllNodes);
      
      if (allNodes.length === 0) return;

      // Calculate bounds for print layout
      const nodePositions = allNodes.map(node => ({ x: node.x, y: node.y }));
      const bounds = {
        minX: Math.min(...nodePositions.map(p => p.x)) - 100,
        maxX: Math.max(...nodePositions.map(p => p.x)) + 100,
        minY: Math.min(...nodePositions.map(p => p.y)) - 100,
        maxY: Math.max(...nodePositions.map(p => p.y)) + 100,
      };

      const padding = 80;
      bounds.minX -= padding;
      bounds.maxX += padding;
      bounds.minY -= padding;
      bounds.maxY += padding;

      const contentWidth = bounds.maxX - bounds.minX;
      const contentHeight = bounds.maxY - bounds.minY;

      // Create print HTML
      const printHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Family Tree - Print</title>
    <style>
        @page { margin: 0.5in; size: landscape; }
        @media print { body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; } }
        body { font-family: system-ui; background: white; margin: 0; padding: 20px; }
        .print-title { font-size: 32px; font-weight: bold; text-align: center; margin-bottom: 20px; }
        .tree-svg { max-width: 100%; height: auto; margin: 0 auto; display: block; }
    </style>
</head>
<body>
    <h1 class="print-title">${isFiltered && treeData.stats.focusedOn ? `${treeData.stats.focusedOn}'s Family Tree` : 'Family Tree'}</h1>
    <div>
        <svg class="tree-svg" width="${contentWidth}" height="${contentHeight}" viewBox="0 0 ${contentWidth} ${contentHeight}" xmlns="http://www.w3.org/2000/svg">
            <!-- SVG content would be generated here -->
        </svg>
    </div>
</body>
</html>`;

      const printWindow = window.open('', '_blank', 'width=1200,height=800');
      if (!printWindow) {
        alert('Please allow popups to print the family tree');
        return;
      }

      printWindow.document.write(printHtml);
      printWindow.document.close();
      printWindow.focus();

    } catch (error) {
      console.error('Print failed:', error);
    }
  }, [treeData, isFiltered]);

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

  // Helper to generate unique keys
  const generateUniqueKey = (() => {
    let counter = 0;
    return (prefix: string) => `${prefix}-${++counter}`;
  })();

  // Fixed renderPersonNode function
  const renderPersonNode = useCallback((node: TreeLayoutNode, isSpouse = false, parentId?: string) => {
    const isSelected = selectedPersonId === node.id;
    const age = getPersonAge(node);
    // Generate unique key using position and parent context
    const uniqueKey = `person-${node.id}-${node.x}-${node.y}-${isSpouse ? 'spouse' : 'main'}-${parentId || 'root'}`;
    return (
      <g 
        key={uniqueKey}
        transform={`translate(${node.x - 50}, ${node.y - 50})`}
        style={{ cursor: 'pointer' }}
        onClick={(e) => {
          e.stopPropagation();
          const person = (filteredPersons.length > 0 ? filteredPersons : persons).find(p => p.id === node.id);
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
  }, [selectedPersonId, filteredPersons, persons, onPersonSelect]);

  // Fixed renderConnections function
  const renderConnections = useCallback((node: TreeLayoutNode, parentId?: string) => {
    const connections = [];
    const baseKey = `${node.id}-${node.x}-${node.y}-${parentId || 'root'}`;
    // Marriage connection
    if (node.spouse) {
      const marriageKey = `marriage-${baseKey}-${node.spouse.id}`;
      connections.push(
        <line
          key={marriageKey}
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
      // Vertical line from parent down
      const parentLineKey = `parent-line-${baseKey}`;
      connections.push(
        <line
          key={parentLineKey}
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
        const childrenLineKey = `children-line-${baseKey}`;
        connections.push(
          <line
            key={childrenLineKey}
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
        const childLineKey = `child-line-${baseKey}-${child.id}-${index}`;
        connections.push(
          <line
            key={childLineKey}
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

  // Fixed renderTreeNode function
  const renderTreeNode = useCallback((node: TreeLayoutNode, parentId?: string) => {
    const elements = [];
    const currentNodeKey = `${node.id}-${node.x}-${node.y}-${parentId || 'root'}`;
    // Add connections first (so they appear behind nodes)
    elements.push(...renderConnections(node, currentNodeKey));
    // Add main person node
    elements.push(renderPersonNode(node, false, currentNodeKey));
    // Add spouse node if exists
    if (node.spouse) {
      elements.push(renderPersonNode(node.spouse as TreeLayoutNode, true, currentNodeKey));
    }
    // Add children recursively
    node.children.forEach((child, index) => {
      const childElements = renderTreeNode(child, `${currentNodeKey}-child-${index}`);
      elements.push(...childElements);
    });
    return elements;
  }, [renderConnections, renderPersonNode]);

  // Helper to deduplicate tree data
  const deduplicateTreeData = (nodes: TreeLayoutNode[]): TreeLayoutNode[] => {
    const seen = new Set<string>();
    const processNode = (node: TreeLayoutNode): TreeLayoutNode => {
      const nodeKey = `${node.id}-${node.x}-${node.y}`;
      if (seen.has(nodeKey)) {
        return node;
      }
      seen.add(nodeKey);
      const processedChildren: TreeLayoutNode[] = node.children.map(processNode);
      return {
        ...node,
        children: processedChildren,
        spouse: node.spouse ? { ...node.spouse } as TreeLayoutNode : undefined
      };
    };
    return nodes.map(processNode);
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
          <FamilyFilter
            allPersons={persons}
            onFilterChange={handleFilterChange}
            selectedPersonId={selectedPersonId}
            onPersonSelect={onPersonSelect}
            focusPersonId={focusPersonId}
          />
          {isFiltered && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setFilteredPersons(persons);
                setFocusPersonId(null);
                setIsFiltered(false);
              }}
              title="Clear Filter"
              className="bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleZoomIn} title="Zoom In">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomOut} title="Zoom Out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} title="Fit to Screen">
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={exportTreeAsPNG} title="Export as PNG">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={printFamilyTree} title="Print Family Tree">
            <Printer className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-xs text-gray-500 text-center">
          Zoom: {Math.round(zoom * 100)}%
          {isFiltered && (
            <div className="text-blue-600 font-medium">
              Showing: {filteredPersons.length} of {persons.length} members
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="absolute top-4 left-4 z-10">
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <TreePine className="h-4 w-4 text-green-600" />
              <span className="font-medium">
                {isFiltered ? 'Filtered ' : ''}Family Statistics
              </span>
              {isFiltered && (
                <Badge variant="outline" className="bg-blue-50 text-blue-600">
                  {filteredPersons.length}/{persons.length}
                </Badge>
              )}
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
            {treeData.roots.map((root, rootIndex) => {
              const rootKey = `root-${root.id}-${rootIndex}`;
              return renderTreeNode(root, rootKey);
            }).flat()}
          </g>
        </svg>
      </div>
    </div>
  );
}