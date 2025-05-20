import React from 'react';
import { ProjectTask, User } from '@shared/schema';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTasks } from '@/hooks/use-tasks';
import { useSkills } from '@/hooks/use-skills';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCheck, Star, ThumbsUp, UserCog, Users, UserPlus } from 'lucide-react';
import { PROFICIENCY_LABELS } from '@/hooks/use-skills';

interface TaskRecommendationsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: ProjectTask | null;
  onAssign: (userId: number) => void;
}

export function TaskRecommendations({
  open,
  onOpenChange,
  task,
  onAssign
}: TaskRecommendationsProps) {
  const { getRecommendedUsers } = useTasks();
  
  const {
    data: recommendedUsers,
    isLoading,
    error
  } = task ? getRecommendedUsers(task.id) : { data: undefined, isLoading: false, error: null };
  
  // Handle empty task case
  if (!task) {
    return null;
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Skill-Based Recommendations
          </DialogTitle>
          <DialogDescription>
            Recommending service providers based on skills required for this task.
          </DialogDescription>
        </DialogHeader>
        
        <div className="my-4">
          <h3 className="text-sm font-medium mb-2">Task Skills:</h3>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {task.requiredSkills && Array.isArray(task.requiredSkills) ? (
              task.requiredSkills.map((skill, index) => (
                <Badge key={index} variant="secondary">{skill}</Badge>
              ))
            ) : task.requiredSkills && typeof task.requiredSkills === 'object' ? (
              Object.values(task.requiredSkills).map((skill, index) => (
                <Badge key={index} variant="secondary">{skill}</Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No skills specified</span>
            )}
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-4">
              Error loading recommendations: {error.message}
            </div>
          ) : recommendedUsers && recommendedUsers.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <ThumbsUp className="h-4 w-4" />
                Recommended Service Providers ({recommendedUsers.length})
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                {recommendedUsers.map((user) => (
                  <RecommendedUserCard 
                    key={user.id} 
                    user={user} 
                    onAssign={() => onAssign(user.id)} 
                    taskSkills={
                      task.requiredSkills && Array.isArray(task.requiredSkills) 
                        ? task.requiredSkills 
                        : task.requiredSkills && typeof task.requiredSkills === 'object'
                        ? Object.values(task.requiredSkills)
                        : []
                    }
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed rounded-md">
              <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p>No recommended service providers found.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adding more skills to the task or invite more service providers to the platform.
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RecommendedUserCardProps {
  user: User;
  onAssign: () => void;
  taskSkills: string[];
}

function RecommendedUserCard({ user, onAssign, taskSkills }: RecommendedUserCardProps) {
  const { skills } = useSkills(user.id);
  
  // Match user skills with task skills
  const matchingSkills = skills?.filter(
    userSkill => taskSkills.some(
      taskSkill => userSkill.skill.toLowerCase() === taskSkill.toLowerCase()
    )
  ) || [];
  
  // Calculate match score (0-100)
  const matchScore = taskSkills.length > 0 
    ? Math.min(100, Math.round((matchingSkills.length / taskSkills.length) * 100))
    : 0;
  
  // Get match rating (1-5 stars)
  const getMatchRating = () => {
    if (matchScore >= 90) return 5;
    if (matchScore >= 75) return 4;
    if (matchScore >= 50) return 3;
    if (matchScore >= 25) return 2;
    return 1;
  };
  
  const renderStars = (count: number) => {
    return Array(5).fill(0).map((_, i) => (
      <Star 
        key={i} 
        className={`h-4 w-4 ${i < count ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
      />
    ));
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {user.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{user.fullName || user.username}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {user.serviceType || 'Service Provider'}
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex">{renderStars(getMatchRating())}</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium mb-1">Matching Skills:</p>
            <div className="flex flex-wrap gap-1.5">
              {matchingSkills.length > 0 ? (
                matchingSkills.map(skill => (
                  <Badge 
                    key={skill.id} 
                    variant={skill.proficiencyLevel === 3 ? 'default' : 'secondary'}
                    className="flex items-center gap-1"
                  >
                    {skill.skill}
                    <span className="text-xs">
                      ({PROFICIENCY_LABELS[skill.proficiencyLevel as 1 | 2 | 3]})
                    </span>
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No matching skills</span>
              )}
            </div>
          </div>
          
          <div className="bg-muted p-2 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-sm">Skill Match</span>
              <span className="font-medium">{matchScore}%</span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full mt-1">
              <div 
                className="bg-primary h-2 rounded-full" 
                style={{ width: `${matchScore}%` }}
              ></div>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button onClick={onAssign} className="w-full" size="sm">
          <UserPlus className="h-4 w-4 mr-2" /> Assign Task
        </Button>
      </CardFooter>
    </Card>
  );
}