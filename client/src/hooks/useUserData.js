// src/hooks/useUserData.js
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export function useUserData() {
  const { user, isAuthenticated } = useAuth();

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  };

  const fetchUserGoals = async () => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_URL}/goals/${user.id}`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch goals');
    }

    return response.json();
  };

  const createGoal = async (goalData) => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_URL}/goals`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        ...goalData,
        user_id: user.id,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create goal');
    }

    return response.json();
  };

  const fetchUserCheckpoints = async () => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_URL}/checkpoints/${user.id}`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch checkpoints');
    }

    return response.json();
  };

  const fetchGoalById = async (goalId) => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_URL}/goals/goal/${goalId}`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch goal');
    }

    return response.json();
  };

  return {
    user,
    isAuthenticated,
    fetchUserGoals,
    createGoal,
    fetchUserCheckpoints,
    fetchGoalById,
  };
}