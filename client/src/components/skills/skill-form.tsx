import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserSkill } from '@shared/schema';
import { COMMON_CONSTRUCTION_SKILLS, ProficiencyLevel, PROFICIENCY_LABELS } from '@/hooks/use-skills';
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckIcon, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem 
} from '@/components/ui/command';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// Form validation schema
const skillFormSchema = z.object({
  skill: z.string().min(2, 'Skill name is required'),
  proficiencyLevel: z.number().min(1).max(3),
  yearsExperience: z.number().nullable(),
  certifications: z.any().optional(),
});

type SkillFormValues = z.infer<typeof skillFormSchema>;

interface SkillFormProps {
  onSubmit: (data: Partial<UserSkill>) => void;
  defaultValues?: Partial<UserSkill>;
  isSubmitting: boolean;
}

export function SkillForm({ onSubmit, defaultValues, isSubmitting }: SkillFormProps) {
  const form = useForm<SkillFormValues>({
    resolver: zodResolver(skillFormSchema),
    defaultValues: {
      skill: defaultValues?.skill || '',
      proficiencyLevel: defaultValues?.proficiencyLevel || 1,
      yearsExperience: defaultValues?.yearsExperience || null,
      certifications: defaultValues?.certifications || [],
    },
  });

  // Update form when defaultValues change (editing mode)
  useEffect(() => {
    if (defaultValues) {
      form.reset({
        skill: defaultValues.skill,
        proficiencyLevel: defaultValues.proficiencyLevel,
        yearsExperience: defaultValues.yearsExperience,
        certifications: defaultValues.certifications,
      });
    }
  }, [defaultValues, form]);

  const handleSubmit = (values: SkillFormValues) => {
    onSubmit({
      ...values,
      certifications: Array.isArray(values.certifications) ? values.certifications : 
        values.certifications ? [values.certifications] : []
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="skill"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Skill Name</FormLabel>
              <div>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value || "Select a skill"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search skill..." />
                      <CommandEmpty>No skill found.</CommandEmpty>
                      <CommandGroup>
                        <ScrollArea className="h-72">
                          {COMMON_CONSTRUCTION_SKILLS.map((skill) => (
                            <CommandItem
                              key={skill}
                              value={skill}
                              onSelect={() => form.setValue("skill", skill)}
                            >
                              <CheckIcon
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  skill === field.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {skill}
                            </CommandItem>
                          ))}
                        </ScrollArea>
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <FormDescription>
                Select from common construction skills or type a custom skill.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="proficiencyLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Proficiency Level</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => field.onChange(Number(value))}
                  defaultValue={field.value?.toString()}
                  className="flex flex-col space-y-1"
                >
                  {Object.entries(PROFICIENCY_LABELS).map(([key, label]) => (
                    <FormItem 
                      key={key} 
                      className="flex items-center space-x-3 space-y-0"
                    >
                      <FormControl>
                        <RadioGroupItem 
                          value={key} 
                          checked={field.value === Number(key)}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        {label}
                      </FormLabel>
                    </FormItem>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormDescription>
                Select your level of expertise with this skill.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="yearsExperience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Years of Experience</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  placeholder="Years of experience"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  value={field.value === null ? '' : field.value}
                />
              </FormControl>
              <FormDescription>
                How many years have you been using this skill?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="certifications"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Certifications (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="List any relevant certifications, separated by commas"
                  className="resize-none"
                  {...field}
                  value={Array.isArray(field.value) ? field.value.join(', ') : field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.trim() === '') {
                      field.onChange([]);
                    } else {
                      field.onChange(value.split(',').map(item => item.trim()));
                    }
                  }}
                />
              </FormControl>
              <FormDescription>
                Enter any certifications related to this skill.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : defaultValues?.id ? 'Update Skill' : 'Add Skill'}
          </Button>
        </div>
      </form>
    </Form>
  );
}