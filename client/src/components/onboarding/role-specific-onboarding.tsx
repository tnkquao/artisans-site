import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User } from "@shared/schema";
import { 
  HardHat, 
  ClipboardCheck, 
  Ruler, 
  UserCheck,
  MessageSquare,
  FileText,
  Calendar,
  Upload,
  AlertTriangle,
  CheckCircle,
  Truck,
  Construction,
  Home,
  Users,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";

// Define onboarding step interface
interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface RoleSpecificOnboardingProps {
  user: User | null;
  role?: string; // This can be the team member role if different from user's main role
  onComplete: () => void;
}

// Default export as requested in the import statement
export default function RoleSpecificOnboarding({ user, role: teamRole, onComplete }: RoleSpecificOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  // Determine which role to use for onboarding - team role takes precedence
  const role = teamRole || user?.role || "client";
  
  // Define role-specific onboarding steps
  const getOnboardingSteps = (): OnboardingStep[] => {
    switch (role) {
      case "contractor":
        return [
          {
            title: "Welcome, Contractor",
            description: "As a contractor on this project, you'll manage construction work, update timelines, and track materials usage.",
            icon: <HardHat className="h-12 w-12 text-primary" />
          },
          {
            title: "Update Project Timeline",
            description: "You are responsible for providing regular updates on the construction progress. Go to the Timeline tab to add updates.",
            icon: <Calendar className="h-12 w-12 text-primary" />
          },
          {
            title: "Upload Documents",
            description: "Share important building plans, permits, and other documents with the entire project team.",
            icon: <Upload className="h-12 w-12 text-primary" />
          },
          {
            title: "Report Issues",
            description: "If you encounter any problems or delays, make sure to document them in your timeline updates.",
            icon: <AlertTriangle className="h-12 w-12 text-primary" />
          },
          {
            title: "Communication",
            description: "Use the Chat tab to communicate with the client, project manager, and other team members.",
            icon: <MessageSquare className="h-12 w-12 text-primary" />
          }
        ];
        
      case "project_manager":
        return [
          {
            title: "Welcome, Project Manager",
            description: "As a project manager, you'll oversee the entire project, coordinate team efforts, and ensure tasks are completed on time.",
            icon: <ClipboardCheck className="h-12 w-12 text-primary" />
          },
          {
            title: "Monitor Timeline",
            description: "Keep track of project progress and ensure the construction remains on schedule.",
            icon: <Calendar className="h-12 w-12 text-primary" />
          },
          {
            title: "Manage Team",
            description: "Coordinate with contractors, inspectors, and other team members to ensure smooth project execution.",
            icon: <Users className="h-12 w-12 text-primary" />
          },
          {
            title: "Resource Allocation",
            description: "Monitor material usage and ensure resources are available when needed.",
            icon: <Truck className="h-12 w-12 text-primary" />
          },
          {
            title: "Client Communication",
            description: "Maintain regular communication with the client about project status and any changes.",
            icon: <MessageSquare className="h-12 w-12 text-primary" />
          }
        ];
        
      case "inspector":
        return [
          {
            title: "Welcome, Inspector",
            description: "As an inspector, your role is to verify construction quality and ensure compliance with building codes and standards.",
            icon: <Ruler className="h-12 w-12 text-primary" />
          },
          {
            title: "Verify Construction Quality",
            description: "Check construction work against approved plans and standards, documenting your findings.",
            icon: <Construction className="h-12 w-12 text-primary" />
          },
          {
            title: "Review Timeline Updates",
            description: "Validate contractor's timeline updates to ensure accuracy and quality of reported work.",
            icon: <CheckCircle className="h-12 w-12 text-primary" />
          },
          {
            title: "Document Inspections",
            description: "Upload inspection reports and photos to keep all stakeholders informed.",
            icon: <FileText className="h-12 w-12 text-primary" />
          },
          {
            title: "Report Issues",
            description: "Flag any compliance issues or quality concerns that need to be addressed.",
            icon: <AlertTriangle className="h-12 w-12 text-primary" />
          }
        ];
        
      case "relative":
        return [
          {
            title: "Welcome to the Project",
            description: "As a family representative, you'll help oversee the project on behalf of your relative abroad.",
            icon: <UserCheck className="h-12 w-12 text-primary" />
          },
          {
            title: "Monitor Progress",
            description: "Keep track of construction progress through timeline updates and photos.",
            icon: <Eye className="h-12 w-12 text-primary" />
          },
          {
            title: "Visit the Site",
            description: "When possible, visit the construction site to verify progress in person.",
            icon: <Home className="h-12 w-12 text-primary" />
          },
          {
            title: "Relay Information",
            description: "Share important updates and concerns with your relative abroad.",
            icon: <MessageSquare className="h-12 w-12 text-primary" />
          },
          {
            title: "Join Discussions",
            description: "Participate in project discussions to represent your relative's interests.",
            icon: <Users className="h-12 w-12 text-primary" />
          }
        ];
        
      default:
        return [
          {
            title: "Welcome to Artisans",
            description: "Our platform helps connect you with trusted professionals for your building project in Ghana.",
            icon: <Construction className="h-12 w-12 text-primary" />
          },
          {
            title: "Team Collaboration",
            description: "Add team members like contractors, project managers, inspectors or relatives to help with your project.",
            icon: <Users className="h-12 w-12 text-primary" />
          },
          {
            title: "Track Progress",
            description: "Monitor construction progress through regular timeline updates and photos.",
            icon: <Calendar className="h-12 w-12 text-primary" />
          },
          {
            title: "Secure Payments",
            description: "Make secure payments through our platform to ensure funds are only released when work is completed.",
            icon: <CheckCircle className="h-12 w-12 text-primary" />
          },
          {
            title: "Communication",
            description: "Stay in touch with your team through our integrated messaging system.",
            icon: <MessageSquare className="h-12 w-12 text-primary" />
          }
        ];
    }
  };
  
  const steps = getOnboardingSteps();
  
  // Final step for all roles
  const finalStep: OnboardingStep = {
    title: "You're All Set!",
    description: "You now know the basics of your role. Click 'Get Started' to begin working on the project.",
    icon: <CheckCircle className="h-12 w-12 text-green-500" />
  };
  
  const allSteps = [...steps, finalStep];
  
  // Handle next step and completion
  const handleNext = () => {
    if (currentStep < allSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };
  
  const handleSkip = () => {
    onComplete();
  };
  
  return (
    <Dialog open={true} onOpenChange={() => onComplete()}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            {allSteps[currentStep].title}
          </DialogTitle>
          <DialogDescription className="text-center">
            Step {currentStep + 1} of {allSteps.length}
          </DialogDescription>
        </DialogHeader>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="py-6 flex flex-col items-center justify-center"
          >
            <div className="mb-6">
              {allSteps[currentStep].icon}
            </div>
            <p className="text-center px-4 mb-8">
              {allSteps[currentStep].description}
            </p>
          </motion.div>
        </AnimatePresence>
        
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
          {currentStep === 0 ? (
            <Button variant="ghost" onClick={handleSkip}>
              Skip Tour
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
              Back
            </Button>
          )}
          <Button onClick={handleNext}>
            {currentStep < allSteps.length - 1 ? "Next" : "Get Started"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}