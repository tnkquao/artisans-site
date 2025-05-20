import React, { useState } from 'react';
import { UserSkill } from '@shared/schema';
import { useSkills } from '@/hooks/use-skills';
import { SkillCard } from './skill-card';
import { SkillForm } from './skill-form';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface SkillsListProps {
  userId?: number;
}

export function SkillsList({ userId }: SkillsListProps) {
  const { 
    skills, 
    isLoading, 
    addSkill, 
    updateSkill, 
    deleteSkill,
    addSkillStatus,
    updateSkillStatus,
    refetchSkills
  } = useSkills(userId);
  
  const [isAddSkillOpen, setIsAddSkillOpen] = useState(false);
  const [skillToEdit, setSkillToEdit] = useState<UserSkill | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<UserSkill | null>(null);
  
  const handleAddSkill = (data: Partial<UserSkill>) => {
    addSkill(data, {
      onSuccess: () => {
        setIsAddSkillOpen(false);
        refetchSkills();
      }
    });
  };
  
  const handleEditSkill = (skill: UserSkill) => {
    setSkillToEdit(skill);
  };
  
  const handleUpdateSkill = (data: Partial<UserSkill>) => {
    if (!skillToEdit) return;
    
    updateSkill({
      id: skillToEdit.id,
      data
    }, {
      onSuccess: () => {
        setSkillToEdit(null);
        refetchSkills();
      }
    });
  };
  
  const handleDeleteConfirm = (skill: UserSkill) => {
    setSkillToDelete(skill);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteSkill = () => {
    if (!skillToDelete) return;
    
    deleteSkill(skillToDelete.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setSkillToDelete(null);
      }
    });
  };
  
  if (isLoading) {
    return <div className="py-8 text-center">Loading skills...</div>;
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Your Skills</h2>
        <Button onClick={() => setIsAddSkillOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Skill
        </Button>
      </div>
      
      {skills?.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No skills added yet</AlertTitle>
          <AlertDescription>
            Add your construction skills to help the system match you with suitable tasks.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills?.map(skill => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onEdit={handleEditSkill}
              onDelete={(id) => handleDeleteConfirm(skills.find(s => s.id === id)!)}
            />
          ))}
        </div>
      )}
      
      {/* Add Skill Sheet */}
      <Sheet open={isAddSkillOpen} onOpenChange={setIsAddSkillOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add New Skill</SheetTitle>
            <SheetDescription>
              Add your construction skills and experience level to help match you with suitable tasks.
            </SheetDescription>
          </SheetHeader>
          
          <div className="py-6">
            <SkillForm 
              onSubmit={handleAddSkill} 
              isSubmitting={addSkillStatus === 'pending'}
            />
          </div>
          
          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">Cancel</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      
      {/* Edit Skill Sheet */}
      <Sheet open={!!skillToEdit} onOpenChange={(open) => !open && setSkillToEdit(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit Skill</SheetTitle>
            <SheetDescription>
              Update your skill information and experience level.
            </SheetDescription>
          </SheetHeader>
          
          <div className="py-6">
            {skillToEdit && (
              <SkillForm 
                onSubmit={handleUpdateSkill} 
                defaultValues={skillToEdit}
                isSubmitting={updateSkillStatus === 'pending'}
              />
            )}
          </div>
          
          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">Cancel</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Skill</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this skill? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {skillToDelete && (
            <div className="py-4">
              <p className="font-medium">{skillToDelete.skill}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteSkill}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}