'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { PersonsList } from '@/components/PersonsList';
import { PersonForm } from '@/components/PersonForm';
import { FamilyTreeView } from '@/components/FamilyTreeView';
import { PersonDetail } from '@/components/PersonDetail';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Users, TreePine } from 'lucide-react';
import { Person } from '@/types';

const queryClient = new QueryClient();

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <FamilyTreeApp />
      <Toaster />
    </QueryClientProvider>
  );
}

function FamilyTreeApp() {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<'list' | 'tree'>('list');
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

  const handlePersonSelect = (person: Person) => {
    setSelectedPerson(person);
  };

  const handleEditPerson = (person: Person) => {
    setEditingPerson(person);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingPerson(null);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TreePine className="h-6 w-6 text-green-600" />
            <h1 className="text-xl font-semibold">Family Tree</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant={view === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('list')}
            >
              <Users className="h-4 w-4 mr-1" />
              List
            </Button>
            <Button
              variant={view === 'tree' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('tree')}
            >
              <TreePine className="h-4 w-4 mr-1" />
              Tree
            </Button>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Person
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - People List */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-medium text-gray-900">Family Members</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <PersonsList 
              onPersonSelect={handlePersonSelect}
              onPersonEdit={handleEditPerson}
              selectedPersonId={selectedPerson?.id}
            />
          </div>
        </div>

        {/* Center Panel - Tree View or Main Content */}
        <div className="flex-1 flex flex-col">
          {view === 'tree' ? (
            <FamilyTreeView 
              onPersonSelect={handlePersonSelect}
              selectedPersonId={selectedPerson?.id}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <Card className="p-8 text-center">
                <TreePine className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Welcome to Family Tree
                </h3>
                <p className="text-gray-600 mb-4">
                  Start by adding family members or switch to tree view to see relationships
                </p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add First Person
                </Button>
              </Card>
            </div>
          )}
        </div>

        {/* Right Panel - Person Details */}
        {selectedPerson && (
          <div className="w-80 bg-white border-l border-gray-200">
            <PersonDetail 
              person={selectedPerson}
              onEdit={handleEditPerson}
              onClose={() => setSelectedPerson(null)}
            />
          </div>
        )}
      </div>

      {/* Person Form Dialog */}
      {showForm && (
        <PersonForm
          person={editingPerson}
          onClose={handleFormClose}
          onSuccess={() => {
            handleFormClose();
            // Optionally refresh the selected person if it was edited
          }}
        />
      )}
    </div>
  );
}