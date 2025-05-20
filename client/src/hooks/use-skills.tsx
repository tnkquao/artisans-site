import { useMutation, useQuery } from '@tanstack/react-query';
import { UserSkill } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Common construction skills for the dropdown
export const COMMON_CONSTRUCTION_SKILLS = [
  'Masonry',
  'Carpentry',
  'Electrical Wiring',
  'Plumbing',
  'Welding',
  'Painting',
  'Concrete Work',
  'Roofing',
  'Drywall Installation',
  'Flooring Installation',
  'Tile Setting',
  'HVAC Installation',
  'Cabinet Making',
  'Structural Steel Work',
  'Excavation',
  'Foundation Work',
  'Framing',
  'Cabinetry',
  'Trim Carpentry',
  'Insulation Installation',
  'Glass Installation',
  'Demolition',
  'Landscaping',
  'Irrigation Systems',
  'Stone Work',
  'Plastering',
  'Waterproofing',
  'Finishing',
  'Renovation',
  'Project Management',
  'Blueprint Reading',
  'Architectural Drawing'
];

// Proficiency levels
export enum ProficiencyLevel {
  Beginner = 1,
  Intermediate = 2,
  Expert = 3
}

export const PROFICIENCY_LABELS: Record<ProficiencyLevel, string> = {
  [ProficiencyLevel.Beginner]: 'Beginner - Basic understanding',
  [ProficiencyLevel.Intermediate]: 'Intermediate - Regular experience',
  [ProficiencyLevel.Expert]: 'Expert - Advanced proficiency'
};

export function useSkills(userId?: number) {
  const { toast } = useToast();
  const apiUrl = userId ? `/api/users/${userId}/skills` : '/api/skills';

  // Fetch skills
  const { 
    data: skills, 
    isLoading, 
    refetch: refetchSkills 
  } = useQuery<UserSkill[]>({
    queryKey: [apiUrl],
    enabled: !!userId || true, // fetch current user's skills if userId is not provided
  });

  // Add a new skill
  const { 
    mutate: addSkill,
    status: addSkillStatus
  } = useMutation({
    mutationFn: async (data: Partial<UserSkill>) => {
      const response = await apiRequest('POST', apiUrl, data);
      return response.json();
    },
    onSuccess: (newSkill: UserSkill) => {
      toast({
        title: 'Skill Added',
        description: `${newSkill.skill} has been added to your skills.`,
      });
      queryClient.invalidateQueries({ queryKey: [apiUrl] });
    },
    onError: (err: Error) => {
      toast({
        title: 'Failed to add skill',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  // Update a skill
  const { 
    mutate: updateSkill,
    status: updateSkillStatus
  } = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<UserSkill> }) => {
      const response = await apiRequest('PATCH', `${apiUrl}/${id}`, data);
      return response.json();
    },
    onSuccess: (updatedSkill: UserSkill) => {
      toast({
        title: 'Skill Updated',
        description: `${updatedSkill.skill} has been updated.`,
      });
      queryClient.invalidateQueries({ queryKey: [apiUrl] });
    },
    onError: (err: Error) => {
      toast({
        title: 'Failed to update skill',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  // Delete a skill
  const { 
    mutate: deleteSkill,
    status: deleteSkillStatus
  } = useMutation({
    mutationFn: async (skillId: number) => {
      await apiRequest('DELETE', `${apiUrl}/${skillId}`);
      return skillId;
    },
    onSuccess: () => {
      toast({
        title: 'Skill Deleted',
        description: 'The skill has been removed from your profile.',
      });
      queryClient.invalidateQueries({ queryKey: [apiUrl] });
    },
    onError: (err: Error) => {
      toast({
        title: 'Failed to delete skill',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  return {
    skills: skills || [],
    isLoading,
    addSkill,
    updateSkill,
    deleteSkill,
    addSkillStatus,
    updateSkillStatus,
    deleteSkillStatus,
    refetchSkills,
  };
}