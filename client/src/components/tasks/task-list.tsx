import React, { useState, useEffect } from 'react';
import { ProjectTask, User } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { PlusCircle, ListFilter, UserCog } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TaskCard } from './task-card';
import { TaskForm } from './task-form';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTasks } from '@/hooks/use-tasks';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TASK_STATUS_OPTIONS, CONSTRUCTION_PHASES } from '@/hooks/use-tasks';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu';
import { TaskRecommendations } from './task-recommendations';

interface TaskListProps {
  projectId: number;
  teamMembers?: any[];
  className?: string;
}

export function TaskList({ projectId, teamMembers = [], className = '' }: TaskListProps) {
  const { 
    tasks, 
    isLoading, 
    error, 
    createTask, 
    updateTask, 
    deleteTask,
    createTaskStatus,
    updateTaskStatus,
    deleteTaskStatus
  } = useTasks(projectId);
  
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState<{
    priority: string[];
    phases: string[];
  }>({
    priority: [],
    phases: []
  });
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [taskForRecommendation, setTaskForRecommendation] = useState<ProjectTask | null>(null);
  
  // Convert team members to User array for task assignment
  const teamUsers = teamMembers.map(member => ({
    id: member.userId,
    username: member.username,
    role: member.role
  }));
  
  const handleAddClick = () => {
    setSelectedTask(null);
    setIsFormOpen(true);
  };
  
  const handleEditClick = (task: ProjectTask) => {
    setSelectedTask(task);
    setIsFormOpen(true);
  };
  
  const handleDeleteClick = (id: number) => {
    setTaskToDelete(id);
    setIsConfirmOpen(true);
  };
  
  const handleDeleteConfirm = () => {
    if (taskToDelete !== null) {
      deleteTask(taskToDelete);
      setIsConfirmOpen(false);
      setTaskToDelete(null);
    }
  };
  
  const handleStatusChange = (id: number, status: string) => {
    updateTask({ 
      id, 
      data: { status } 
    });
  };
  
  const handleFormSubmit = (data: any) => {
    if (selectedTask) {
      updateTask({ id: selectedTask.id, data });
      setIsFormOpen(false);
    } else {
      createTask(data);
      setIsFormOpen(false);
    }
  };
  
  const handleShowRecommendations = (task: ProjectTask) => {
    setTaskForRecommendation(task);
    setShowRecommendations(true);
  };
  
  const filterTasks = (taskList: ProjectTask[] | undefined) => {
    if (!taskList) return [];
    
    return taskList.filter(task => {
      let passesStatusFilter = true;
      if (activeTab !== 'all') {
        passesStatusFilter = task.status === activeTab;
      }
      
      let passesPriorityFilter = true;
      if (filters.priority.length > 0) {
        passesPriorityFilter = filters.priority.includes(task.priority);
      }
      
      let passesPhaseFilter = true;
      if (filters.phases.length > 0) {
        passesPhaseFilter = !!task.constructionPhase && filters.phases.includes(task.constructionPhase);
      }
      
      return passesStatusFilter && passesPriorityFilter && passesPhaseFilter;
    });
  };
  
  const togglePriorityFilter = (priority: string) => {
    setFilters(prev => {
      if (prev.priority.includes(priority)) {
        return { ...prev, priority: prev.priority.filter(p => p !== priority) };
      } else {
        return { ...prev, priority: [...prev.priority, priority] };
      }
    });
  };
  
  const togglePhaseFilter = (phase: string) => {
    setFilters(prev => {
      if (prev.phases.includes(phase)) {
        return { ...prev, phases: prev.phases.filter(p => p !== phase) };
      } else {
        return { ...prev, phases: [...prev.phases, phase] };
      }
    });
  };
  
  const filteredTasks = filterTasks(tasks);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertDescription>
          Error loading tasks: {error.message}
        </AlertDescription>
      </Alert>
    );
  }
  
  const isFormSubmitting = createTaskStatus === 'pending' || updateTaskStatus === 'pending';
  
  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Project Tasks</h3>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ListFilter className="h-4 w-4 mr-2" /> Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {TASK_PRIORITY_OPTIONS.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={filters.priority.includes(option.value)}
                  onCheckedChange={() => togglePriorityFilter(option.value)}
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Filter by Phase</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ScrollArea className="h-[200px]">
                {CONSTRUCTION_PHASES.map((phase) => (
                  <DropdownMenuCheckboxItem
                    key={phase.value}
                    checked={filters.phases.includes(phase.value)}
                    onCheckedChange={() => togglePhaseFilter(phase.value)}
                  >
                    {phase.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button onClick={handleAddClick} variant="default" size="sm">
            <PlusCircle className="h-4 w-4 mr-2" /> Add Task
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Tasks</TabsTrigger>
          {TASK_STATUS_OPTIONS.map((status) => (
            <TabsTrigger key={status.value} value={status.value}>
              {status.label}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-0">
          {filteredTasks && filteredTasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                  onStatusChange={handleStatusChange}
                  assignees={teamUsers}
                  className="h-full"
                />
              ))}
            </div>
          ) : (
            <div className="text-center p-8 border border-dashed rounded-lg">
              <p className="text-muted-foreground">No tasks found.</p>
              <Button onClick={handleAddClick} variant="outline" className="mt-2">
                <PlusCircle className="h-4 w-4 mr-2" /> Create Your First Task
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <TaskForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        defaultValues={selectedTask || undefined}
        isSubmitting={isFormSubmitting}
        projectId={projectId}
        teamMembers={teamMembers}
      />
      
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              {deleteTaskStatus === 'pending' ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <TaskRecommendations
        open={showRecommendations}
        onOpenChange={setShowRecommendations}
        task={taskForRecommendation}
        onAssign={(userId) => {
          if (taskForRecommendation) {
            updateTask({
              id: taskForRecommendation.id,
              data: { assignedToId: userId }
            });
            toast({
              title: "Task Assigned",
              description: "The task has been successfully assigned.",
            });
            setShowRecommendations(false);
          }
        }}
      />
    </div>
  );
}