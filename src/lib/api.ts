import axios from 'axios';
import { Person, CreatePersonData } from '@/types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const personApi = {
  // Get all persons
  getAll: async (): Promise<Person[]> => {
    const response = await api.get('/persons');
    return response.data;
  },

  // Get single person
  getById: async (id: string): Promise<Person> => {
    const response = await api.get(`/persons/${id}`);
    return response.data;
  },

  // Create new person
  create: async (data: CreatePersonData): Promise<Person> => {
    const response = await api.post('/persons', data);
    return response.data;
  },

  // Update person
  update: async (id: string, data: Partial<CreatePersonData>): Promise<Person> => {
    const response = await api.put(`/persons/${id}`, data);
    return response.data;
  },

  // Delete person
  delete: async (id: string): Promise<void> => {
    await api.delete(`/persons/${id}`);
  },

  // Get family tree for a person
  getFamilyTree: async (personId: string): Promise<Person[]> => {
    const response = await api.get(`/family-tree/${personId}`);
    return response.data;
  },
};

export default api;