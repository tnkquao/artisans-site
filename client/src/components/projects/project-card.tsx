import { Project } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";
import { EmojiProgressBar } from "@/components/ui/emoji-progress-bar";
import { format } from "date-fns";
import { ArrowRight, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ProjectImageSlider } from "@/components/projects/project-image-slider";

interface ProjectCardProps {
  project: Project;
  company?: { id: number; fullName: string; image?: string };
}

export function ProjectCard({ project, company }: ProjectCardProps) {
  const getStatusColor = (status: string, progress: number) => {
    if (status === "completed") return "bg-green-500";
    if (progress >= 60) return "bg-green-500";
    if (progress >= 30) return "bg-yellow-500";
    return "bg-blue-500";
  };

  const getStatusText = (status: string, progress: number) => {
    if (status === "completed") return "Completed";
    if (status === "pending") return "Pending Approval";
    
    if (progress >= 60) return `In Progress (${progress}%)`;
    if (progress >= 30) return `Foundation Phase (${progress}%)`;
    return `Initial Phase (${progress}%)`;
  };

  const getStatusTextColor = (status: string, progress: number) => {
    if (status === "completed") return "text-green-500";
    if (progress >= 60) return "text-green-500";
    if (progress >= 30) return "text-yellow-500";
    return "text-blue-500";
  };

  const getStatusBadgeColor = (status: string, progress: number) => {
    if (status === "completed") return "bg-green-500";
    if (progress >= 60) return "bg-green-500";
    if (progress >= 30) return "bg-yellow-500";
    return "bg-blue-500";
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "TBD";
    return format(new Date(date), "MMM dd, yyyy");
  };

  // Format the project type for display
  const formatProjectType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
  };

  return (
    <div onClick={() => window.history.pushState({}, '', `/projects/${project.id}`)} className="cursor-pointer">
        <Card className="overflow-hidden border border-gray-200 card-hover-effect h-full transition-all">
          <div className="relative">
            {/* Prepare images array for slider including both main and additional images */}
            <ProjectImageSlider 
              images={[
                ...(project.mainImage && typeof project.mainImage === 'object' ? [project.mainImage as any] : []),
                ...(Array.isArray(project.additionalImages) ? project.additionalImages as any[] : [])
              ].filter(img => img && img.url)} 
              projectId={project.id}
              canEdit={false}
              showControls={true}
              height="h-40 sm:h-48"
              aspectRatio="wide"
              showUpload={false}
            />
            
            {/* Overlay with project info */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end pointer-events-none">
              <div className="p-4 text-white animate-fade-in">
                <Badge className={`${getStatusBadgeColor(project.status, project.progress)} mb-2`}>
                  {getStatusText(project.status, project.progress)}
                </Badge>
                <h4 className="text-lg font-semibold line-clamp-1">{project.name}</h4>
                <div className="flex items-center text-xs text-gray-300 mt-1">
                  <MapPin className="h-3 w-3 mr-1" />
                  <span className="line-clamp-1">{project.location}</span>
                </div>
              </div>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="mb-3">
              <EmojiProgressBar 
                value={project.progress} 
                height="h-6"
                className="mb-1"
                animationDuration={0.7}
              />
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Est: {formatDate(project.estimatedCompletion)}</span>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
              {company ? (
                <div className="flex items-center">
                  <Avatar className="w-7 h-7 mr-2">
                    <AvatarFallback className="bg-primary text-white text-xs">
                      {company.fullName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="max-w-[140px]">
                    <p className="text-xs text-gray-500">Partner</p>
                    <p className="text-sm font-medium truncate">{company.fullName}</p>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500">
                  <p>Type: {formatProjectType(project.type)}</p>
                </div>
              )}
              <div className="text-primary hover:text-primary-dark p-1">
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
