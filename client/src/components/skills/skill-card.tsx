import React from 'react';
import { UserSkill } from '@shared/schema';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PencilIcon, TrashIcon, StarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ProficiencyLevel, PROFICIENCY_LABELS } from '@/hooks/use-skills';
import { format } from 'date-fns';

interface SkillCardProps {
  skill: UserSkill;
  onEdit: (skill: UserSkill) => void;
  onDelete: (id: number) => void;
}

export function SkillCard({ skill, onEdit, onDelete }: SkillCardProps) {
  // Convert proficiency level to stars
  const renderProficiencyStars = () => {
    const stars = [];
    const maxStars = 3;
    
    for (let i = 1; i <= maxStars; i++) {
      stars.push(
        <StarIcon 
          key={i} 
          className={`h-4 w-4 ${i <= skill.proficiencyLevel ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
        />
      );
    }
    
    return (
      <div className="flex gap-1">
        {stars}
        <span className="text-xs ml-2 text-muted-foreground">
          {PROFICIENCY_LABELS[skill.proficiencyLevel as ProficiencyLevel]}
        </span>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{skill.skill}</CardTitle>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => onEdit(skill)}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive"
              onClick={() => onDelete(skill.id)}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="space-y-3">
          {renderProficiencyStars()}
          
          {skill.yearsExperience !== null && skill.yearsExperience > 0 && (
            <div className="text-sm">
              <span className="font-medium">Experience:</span> {skill.yearsExperience} years
            </div>
          )}
          
          {skill.certifications && Array.isArray(skill.certifications) && skill.certifications.length > 0 && (
            <div className="space-y-1">
              <span className="text-sm font-medium">Certifications:</span>
              <div className="flex flex-wrap gap-2">
                {(skill.certifications as string[]).map((cert: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {cert}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 text-xs text-muted-foreground border-t">
        {skill.lastUsed ? (
          <span>Last used: {format(new Date(skill.lastUsed), 'MMM d, yyyy')}</span>
        ) : (
          <span>Added: {format(new Date(skill.createdAt), 'MMM d, yyyy')}</span>
        )}
      </CardFooter>
    </Card>
  );
}