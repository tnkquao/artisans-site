import React from 'react';
import { ProjectTask, User } from '@shared/schema';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarIcon, 
  CheckCircle2, 
  Clock, 
  Edit, 
  MoreHorizontal, 
  User as UserIcon,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { TASK_STATUS_OPTIONS, TASK_PRIORITY_OPTIONS, CONSTRUCTION_PHASES } from '@/hooks/use-tasks';

interface TaskCardProps {
  task: ProjectTask;
  onEdit: (task: ProjectTask) => void;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: string) => void;
  assignees?: User[];
  className?: string;
}

export function TaskCard({ 
  task, 
  onEdit, 
  onDelete, 
  onStatusChange,
  assignees = [],
  className = '' 
}: TaskCardProps) {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isPastDue = dueDate ? dueDate < new Date() && task.status !== 'completed' : false;
  
  const statusOption = TASK_STATUS_OPTIONS.find(s => s.value === task.status);
  const priorityOption = TASK_PRIORITY_OPTIONS.find(p => p.value === task.priority);
  const phaseOption = CONSTRUCTION_PHASES.find(p => p.value === task.constructionPhase);
  
  const assignee = assignees.find(a => a.id === task.assignedToId);
  
  // Function to get status badge styling
  const getStatusBadge = () => {
    switch(task.status) {
      case 'completed':
        return <Badge variant="success" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</Badge>;
      case 'in_progress':
        return <Badge><Clock className="h-3 w-3 mr-1" /> In Progress</Badge>;
      case 'blocked':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Blocked</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
    }
  };
  
  // Function to get priority badge styling
  const getPriorityBadge = () => {
    switch(task.priority) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge variant="destructive" className="bg-orange-500">High</Badge>;
      case 'medium':
        return <Badge variant="default">Medium</Badge>;
      default:
        return <Badge variant="secondary">Low</Badge>;
    }
  };
  
  // Calculate days remaining
  const getDaysRemaining = () => {
    if (!dueDate) return null;
    
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return <Badge variant="destructive">{Math.abs(diffDays)} day{Math.abs(diffDays) !== 1 ? 's' : ''} overdue</Badge>;
    } else if (diffDays === 0) {
      return <Badge variant="outline" className="bg-yellow-100">Due today</Badge>;
    } else if (diffDays <= 3) {
      return <Badge variant="outline" className="bg-yellow-100">{diffDays} day{diffDays !== 1 ? 's' : ''} left</Badge>;
    } else {
      return <Badge variant="outline">{diffDays} days left</Badge>;
    }
  };
  
  return (
    <Card className={`w-full ${className} ${isPastDue ? 'border-red-300' : ''}`}>
      <CardHeader className="pb-2 flex flex-row justify-between items-start">
        <div>
          <div className="flex gap-2 mb-1">
            {getStatusBadge()}
            {getPriorityBadge()}
            {phaseOption && <Badge variant="outline">{phaseOption.label}</Badge>}
          </div>
          <h3 className="text-lg font-semibold">{task.title}</h3>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Task Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Edit className="h-4 w-4 mr-2" /> Edit Task
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
            
            {TASK_STATUS_OPTIONS.map(option => (
              <DropdownMenuItem 
                key={option.value}
                disabled={task.status === option.value}
                onClick={() => onStatusChange(task.id, option.value)}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(task.id)}
              className="text-red-600 focus:text-red-600"
            >
              <XCircle className="h-4 w-4 mr-2" /> Delete Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      
      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground mb-4">
          {task.description.length > 150 
            ? `${task.description.substring(0, 150)}...` 
            : task.description}
        </p>
        
        {task.requiredSkills && (Array.isArray(task.requiredSkills) || typeof task.requiredSkills === 'object') && (
          <div className="mb-3">
            <h4 className="text-xs text-muted-foreground mb-1">Required Skills:</h4>
            <div className="flex flex-wrap gap-1">
              {(Array.isArray(task.requiredSkills) 
                ? task.requiredSkills 
                : Object.values(task.requiredSkills)
              ).map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between mt-4">
          {assignee ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {assignee.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{assignee.username}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserIcon className="h-4 w-4" />
              <span className="text-sm">Unassigned</span>
            </div>
          )}
          
          {dueDate && (
            <div className="flex items-center gap-1 text-sm">
              <CalendarIcon className="h-4 w-4" />
              <span>{format(dueDate, 'MMM d, yyyy')}</span>
              {isPastDue && <AlertTriangle className="h-4 w-4 text-red-500" />}
            </div>
          )}
        </div>
        
        {dueDate && (
          <div className="mt-3">
            {getDaysRemaining()}
            
            {task.status === 'in_progress' && (
              <div className="mt-2">
                <Progress value={task.completionPercentage || 0} className="h-2" />
                <p className="text-xs text-right mt-1 text-muted-foreground">
                  {task.completionPercentage || 0}% complete
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-2">
        <div className="flex w-full justify-between">
          {task.estimatedHours ? (
            <p className="text-xs text-muted-foreground">
              Est. {task.estimatedHours} hour{task.estimatedHours !== 1 ? 's' : ''}
            </p>
          ) : (
            <span />
          )}
          
          <Button variant="ghost" size="sm" onClick={() => onEdit(task)}>
            <Edit className="h-4 w-4 mr-1" /> Edit
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}