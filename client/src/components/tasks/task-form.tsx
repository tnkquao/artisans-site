import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ProjectTask } from '@shared/schema';
import { COMMON_CONSTRUCTION_SKILLS } from '@/hooks/use-skills';
import { TASK_STATUS_OPTIONS, TASK_PRIORITY_OPTIONS, CONSTRUCTION_PHASES } from '@/hooks/use-tasks';
import { format } from 'date-fns';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, CheckIcon, XCircle } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Define the form schema
const formSchema = z.object({
  title: z.string().min(2, {
    message: 'Task title must be at least 2 characters.',
  }),
  description: z.string().min(5, {
    message: 'Description must be at least 5 characters.',
  }),
  status: z.string(),
  priority: z.string(),
  dueDate: z.date().optional(),
  constructionPhase: z.string().optional(),
  estimatedHours: z.coerce.number().min(0).optional(),
  requiredSkills: z.array(z.string()).optional(),
  assignedToId: z.coerce.number().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormData) => void;
  defaultValues?: Partial<ProjectTask>;
  isSubmitting?: boolean;
  projectId?: number;
  teamMembers?: any[]; // Array of team members for assignment
}

export function TaskForm({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isSubmitting,
  projectId,
  teamMembers = [],
}: TaskFormProps) {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillsDialogOpen, setSkillsDialogOpen] = useState(false);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      constructionPhase: undefined,
      estimatedHours: 0,
      requiredSkills: [],
      assignedToId: undefined,
      ...defaultValues,
    },
  });
  
  // Update form when defaultValues change
  useEffect(() => {
    if (defaultValues) {
      const skillsArray = Array.isArray(defaultValues.requiredSkills)
        ? defaultValues.requiredSkills
        : defaultValues.requiredSkills
        ? JSON.parse(defaultValues.requiredSkills as unknown as string)
        : [];
      
      setSelectedSkills(skillsArray);
      
      form.reset({
        title: defaultValues.title || '',
        description: defaultValues.description || '',
        status: defaultValues.status || 'pending',
        priority: defaultValues.priority || 'medium',
        dueDate: defaultValues.dueDate ? new Date(defaultValues.dueDate) : undefined,
        constructionPhase: defaultValues.constructionPhase || undefined,
        estimatedHours: defaultValues.estimatedHours || 0,
        requiredSkills: skillsArray,
        assignedToId: defaultValues.assignedToId || undefined,
      });
    }
  }, [defaultValues, form]);
  
  const handleSubmit = (data: FormData) => {
    // Ensure required skills are included
    const dataWithSkills = {
      ...data,
      requiredSkills: selectedSkills,
    };
    onSubmit(dataWithSkills);
  };
  
  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
    
    // Update form value
    const updatedSkills = selectedSkills.includes(skill)
      ? selectedSkills.filter(s => s !== skill)
      : [...selectedSkills, skill];
    
    form.setValue('requiredSkills', updatedSkills);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {defaultValues?.id ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter task title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TASK_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TASK_PRIORITY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="constructionPhase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Construction Phase</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select phase" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONSTRUCTION_PHASES.map((phase) => (
                          <SelectItem key={phase.value} value={phase.value}>
                            {phase.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimatedHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Hours</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="assignedToId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">Unassigned</SelectItem>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.userId} value={member.userId.toString()}>
                            {member.username} ({member.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="requiredSkills"
              render={() => (
                <FormItem>
                  <FormLabel>Required Skills</FormLabel>
                  <FormControl>
                    <div>
                      <Popover open={skillsDialogOpen} onOpenChange={setSkillsDialogOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={skillsDialogOpen}
                            className="w-full justify-between"
                          >
                            {selectedSkills.length > 0
                              ? `${selectedSkills.length} skill${selectedSkills.length > 1 ? 's' : ''} selected`
                              : "Select skills"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                          <Command>
                            <CommandInput placeholder="Search skills..." />
                            <CommandList>
                              <CommandEmpty>No skills found.</CommandEmpty>
                              <CommandGroup>
                                {COMMON_CONSTRUCTION_SKILLS.map((skill) => (
                                  <CommandItem
                                    key={skill}
                                    onSelect={() => toggleSkill(skill)}
                                    className="flex items-center justify-between"
                                  >
                                    {skill}
                                    {selectedSkills.includes(skill) && (
                                      <CheckIcon className="h-4 w-4" />
                                    )}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                              <CommandSeparator />
                              <CommandGroup>
                                <CommandItem
                                  onSelect={() => {
                                    setSkillsDialogOpen(false);
                                  }}
                                  className="justify-center text-blue-500 hover:text-blue-600"
                                >
                                  Done
                                </CommandItem>
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      
                      {selectedSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {selectedSkills.map((skill) => (
                            <Badge 
                              key={skill} 
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              {skill}
                              <XCircle 
                                className="h-3 w-3 cursor-pointer" 
                                onClick={() => toggleSkill(skill)}
                              />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Select skills required for this task
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter task description"
                      className="min-h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : defaultValues?.id ? 'Save Changes' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}