import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ProjectTask, User } from '@shared/schema';

// Task status options
export const TASK_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' }
];

// Task priority options
export const TASK_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
];

// Construction phases
export const CONSTRUCTION_PHASES = [
  { value: 'planning', label: 'Planning' },
  { value: 'design', label: 'Design & Approval' },
  { value: 'site_preparation', label: 'Site Preparation' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'framing', label: 'Framing' },
  { value: 'rough_ins', label: 'Rough-Ins (Plumbing, Electrical, HVAC)' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'exterior', label: 'Exterior Finishing' },
  { value: 'insulation', label: 'Insulation & Drywall' },
  { value: 'interior', label: 'Interior Finishing' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'fixtures', label: 'Fixtures & Appliances' },
  { value: 'painting', label: 'Painting & Decorating' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'final_inspection', label: 'Final Inspection' }
];

export function useTasks(projectId?: number) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Get all tasks for a project
  const {
    data: tasks,
    isLoading,
    error,
    refetch
  } = useQuery<ProjectTask[]>({
    queryKey: ['/api/tasks', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const response = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
      return await response.json();
    },
    enabled: !!projectId
  });
  
  // Create a new task
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: Partial<ProjectTask>) => {
      if (!projectId) throw new Error('Project ID is required');
      
      const response = await apiRequest('POST', `/api/projects/${projectId}/tasks`, {
        ...taskData,
        projectId
      });
      return await response.json();
    },
    onSuccess: (newTask: ProjectTask) => {
      queryClient.setQueryData(
        ['/api/tasks', projectId],
        (oldData: ProjectTask[] = []) => [...oldData, newTask]
      );
      
      toast({
        title: 'Task Created',
        description: `Task "${newTask.title}" has been created.`
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Error Creating Task',
        description: err.message,
        variant: 'destructive'
      });
    }
  });
  
  // Update an existing task
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ProjectTask> }) => {
      if (!projectId) throw new Error('Project ID is required');
      
      const response = await apiRequest('PATCH', `/api/projects/${projectId}/tasks/${id}`, data);
      return await response.json();
    },
    onSuccess: (updatedTask: ProjectTask) => {
      queryClient.setQueryData(
        ['/api/tasks', projectId],
        (oldData: ProjectTask[] = []) => 
          oldData.map(task => task.id === updatedTask.id ? updatedTask : task)
      );
      
      toast({
        title: 'Task Updated',
        description: `Task "${updatedTask.title}" has been updated.`
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Error Updating Task',
        description: err.message,
        variant: 'destructive'
      });
    }
  });
  
  // Delete a task
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      if (!projectId) throw new Error('Project ID is required');
      
      await apiRequest('DELETE', `/api/projects/${projectId}/tasks/${taskId}`);
      return taskId;
    },
    onSuccess: (taskId: number) => {
      queryClient.setQueryData(
        ['/api/tasks', projectId],
        (oldData: ProjectTask[] = []) => oldData.filter(task => task.id !== taskId)
      );
      
      toast({
        title: 'Task Deleted',
        description: 'The task has been deleted successfully.'
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Error Deleting Task',
        description: err.message,
        variant: 'destructive'
      });
    }
  });
  
  // Get recommended users for a task
  const getRecommendedUsers = (taskId: number) => {
    return useQuery<User[]>({
      queryKey: ['/api/tasks', taskId, 'recommendations'],
      queryFn: async () => {
        if (!projectId) return [];
        const response = await apiRequest('GET', `/api/projects/${projectId}/tasks/${taskId}/recommendations`);
        return await response.json();
      },
      enabled: !!projectId && !!taskId
    });
  };
  
  return {
    tasks,
    isLoading,
    error,
    createTask: createTaskMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    createTaskStatus: createTaskMutation.status,
    updateTaskStatus: updateTaskMutation.status,
    deleteTaskStatus: deleteTaskMutation.status,
    refetchTasks: refetch,
    getRecommendedUsers
  };
}