import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { SkillsList } from '@/components/skills/skill-list';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Book, Hammer, UserCog } from 'lucide-react';
import { Link } from 'wouter';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { COMMON_CONSTRUCTION_SKILLS } from '@/hooks/use-skills';

export default function SkillsManagementPage() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert>
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            Please <Link href="/auth" className="text-primary underline">log in</Link> to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground mb-2 hover:text-primary">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Skills Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your construction skills and expertise for better task matching
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <SkillsList userId={user.id} />
        </div>
        
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center gap-2 mb-4">
              <UserCog className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium">Why Add Skills?</h3>
            </div>
            
            <p className="text-muted-foreground mb-4">
              Adding your construction skills helps project managers find the right person for specific tasks. The more detailed your skills profile, the better your matches will be.
            </p>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-primary rounded-full h-6 w-6 flex items-center justify-center text-primary-foreground text-sm">1</div>
                <span>Add specific construction skills you possess</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-primary rounded-full h-6 w-6 flex items-center justify-center text-primary-foreground text-sm">2</div>
                <span>Rate your proficiency level honestly</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-primary rounded-full h-6 w-6 flex items-center justify-center text-primary-foreground text-sm">3</div>
                <span>Include years of experience for better matching</span>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="flex items-center gap-2 mb-2">
              <Hammer className="h-5 w-5 text-primary" />
              <h3 className="font-medium">Skill-Based Task Allocation</h3>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Project managers can now assign tasks based on your skills, ensuring you work on projects that match your expertise.
            </p>
          </div>
          
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Book className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium">Popular Construction Skills</h3>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Consider adding these commonly requested construction skills:
            </p>
            
            <div className="flex flex-wrap gap-1.5">
              {COMMON_CONSTRUCTION_SKILLS.slice(0, 15).map(skill => (
                <div key={skill} className="text-xs px-2 py-1 bg-muted rounded-md">
                  {skill}
                </div>
              ))}
              <div className="text-xs px-2 py-1 bg-muted rounded-md">
                and more...
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}