import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { ProjectCard } from "@/components/projects/project-card";
import { ProgressTimeline } from "@/components/projects/progress-timeline";
import { LocationMap } from "@/components/map/location-map";
import { LocationEditor } from "@/components/map/location-editor";
import { MessageList } from "@/components/messaging/message-list";
import { OrderTable } from "@/components/orders/order-table";
import { TaskList } from "@/components/tasks/task-list";
import { ProjectExpenses } from "@/components/projects/project-expenses";
import { ProjectReports } from "@/components/projects/project-reports";
import { ProjectImageSlider } from "@/components/projects/project-image-slider";
import { IOSImageUploader } from "@/components/projects/ios-image-uploader";
import SiteMaterialsSection from "@/components/projects/site-materials-section";
import { useAuth } from "@/hooks/use-auth";
import { useParams, useLocation, Link } from "wouter";
import { useRoleOnboarding } from "@/hooks/use-role-onboarding";
import RoleSpecificOnboarding from "@/components/onboarding/role-specific-onboarding";
import { 
  ArrowLeft, 
  Binoculars,
  Building2, 
  FileText, 
  Users,
  Calendar,
  Truck,
  Check,
  Map,
  MapPin,
  Edit,
  Plus,
  Wrench,
  UserPlus,
  X,
  Trash2,
  Loader2,
  AlertCircle,
  HardHat,
  Ruler,
  Construction,
  Hammer,
  BarChart3,
  Droplets,
  CloudRain,
  ClipboardCheck,
  AlertTriangle,
  Banknote,
  MessageSquare,
  CheckSquare,
  Mail,
  Copy,
  Send,
  File as FileIcon,
  Receipt,
  FileCheck,
  ExternalLink,
  Upload,
  Image,
  Boxes,
  Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmojiProgressBar } from "@/components/ui/emoji-progress-bar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Project, User, ProjectTimeline, Message, Order, insertProjectTimelineSchema } from "@shared/schema";
import { useForm } from "react-hook-form";

// Document type definition (would normally be in @shared/schema)
interface Document {
  id: number;
  name: string;
  type: string;
  url: string;
  projectId: number;
  uploadedBy: number;
  createdAt: string;
}
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { format } from "date-fns";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    showRoleOnboarding, 
    setShowRoleOnboarding, 
    completeRoleOnboarding, 
    currentRole, 
    setCurrentRole 
  } = useRoleOnboarding();
  const [activeTab, setActiveTab] = useState("overview");
  const [showSiteMaterials, setShowSiteMaterials] = useState(false);
  const [isAddTimelineOpen, setIsAddTimelineOpen] = useState(false);
  const [isAddTeamMemberOpen, setIsAddTeamMemberOpen] = useState(false);
  const [newTeamMember, setNewTeamMember] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [teamMemberRole, setTeamMemberRole] = useState("contractor");
  const [addTeamMemberError, setAddTeamMemberError] = useState("");
  const [inviteTeamMemberError, setInviteTeamMemberError] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [locationEditorOpen, setLocationEditorOpen] = useState(false);
  const [isUploadDocumentOpen, setIsUploadDocumentOpen] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState("receipt");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [timelineImages, setTimelineImages] = useState<File[]>([]);
  const [timelineImageUrls, setTimelineImageUrls] = useState<string[]>([]);

  // Fetch project details
  const { 
    data: project, 
    isLoading: isLoadingProject,
    error: projectError,
  } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !isNaN(projectId),
  });

  // Fetch project timeline
  const { 
    data: timelineItems = [], 
    isLoading: isLoadingTimeline,
  } = useQuery<ProjectTimeline[]>({
    queryKey: [`/api/projects/${projectId}/timeline`],
    enabled: !isNaN(projectId),
  });
  
  // Fetch project invitations
  const {
    data: projectInvitations = [],
    isLoading: isLoadingInvitations,
    refetch: refetchInvitations,
  } = useQuery<any[]>({
    queryKey: [`/api/projects/${projectId}/invitations`],
    enabled: !isNaN(projectId),
  });
  
  // Mutation for deleting a team invitation
  const deleteInvitationMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      const response = await apiRequest("DELETE", `/api/projects/${projectId}/invitations/${invitationId}`);
      return response.json();
    },
    onSuccess: () => {
      // Refetch invitations to update the list
      refetchInvitations();
      toast({
        title: "Invitation deleted",
        description: "The invitation has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete invitation",
        description: error.message || "An error occurred while deleting the invitation",
        variant: "destructive",
      });
    },
  });

  // Fetch companies (for project company info)
  const { 
    data: companies = [], 
    isLoading: isLoadingCompanies,
  } = useQuery<User[]>({
    queryKey: ["/api/users/companies"],
  });

  // Fetch messages related to this project
  const { 
    data: allMessages = [], 
    isLoading: isLoadingMessages,
  } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  // Fetch orders related to this project
  const { 
    data: allOrders = [], 
    isLoading: isLoadingOrders,
  } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });
  
  // Fetch reports related to this project
  const {
    data: reports = [],
    isLoading: isLoadingReports,
  } = useQuery<any[]>({
    queryKey: [`/api/projects/${projectId}/reports`],
    enabled: !isNaN(projectId),
  });
  
  // Fetch documents related to this project
  const {
    data: projectDocuments = [],
    isLoading: isLoadingDocuments,
    refetch: refetchDocuments,
  } = useQuery<Document[]>({
    queryKey: [`/api/projects/${projectId}/documents`],
    enabled: !isNaN(projectId),
  });

  // Get users for message display
  const messagesUsers = allMessages.reduce(
    (acc, message) => {
      if (!acc[message.senderId]) {
        acc[message.senderId] = user?.id === message.senderId ? user : { id: message.senderId, fullName: "Unknown User", role: "unknown", username: "", email: "", password: "" };
      }
      if (!acc[message.receiverId]) {
        acc[message.receiverId] = user?.id === message.receiverId ? user : { id: message.receiverId, fullName: "Unknown User", role: "unknown", username: "", email: "", password: "" };
      }
      return acc;
    },
    {} as Record<number, User>
  );

  // Companies record for easy lookup
  const companiesRecord = companies.reduce(
    (acc, company) => ({ ...acc, [company.id]: company }), 
    {} as Record<number, User>
  );

  // Filter messages for this project
  const projectMessages = allMessages.filter(message => message.projectId === projectId);

  // Filter orders for this project
  const projectOrders = allOrders.filter(order => order.projectId === projectId);

  // Form schema for adding timeline entry
  const addTimelineSchema = insertProjectTimelineSchema
    .omit({ projectId: true })
    .extend({
      images: z.array(z.string()).optional(),
      constructionPhase: z.string().nullable().optional(),
      materialsUsed: z.string().nullable().optional(),
      workersInvolved: z.number().nullable().optional(),
      weather: z.string().nullable().optional(),
      issues: z.string().nullable().optional(),
      delayReason: z.string().nullable().optional(),
      materialCosts: z.number().nullable().optional(),
      laborCosts: z.number().nullable().optional(),
    });

  // Timeline form
  const form = useForm<z.infer<typeof addTimelineSchema>>({
    resolver: zodResolver(addTimelineSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "in_progress",
      date: new Date().toISOString().split('T')[0],
      completionPercentage: project?.progress || 0,
      images: [],
      constructionPhase: project?.constructionPhase || "planning",
      materialsUsed: "",
      workersInvolved: null,
      weather: "clear",
      issues: null,
      delayReason: null,
      materialCosts: null,
      laborCosts: null,
    },
  });

  // Helper function to upload timeline images
  const uploadTimelineImages = async (): Promise<string[]> => {
    if (timelineImages.length === 0) return [];
    
    const uploadedImageUrls: string[] = [];
    
    for (const image of timelineImages) {
      const formData = new FormData();
      formData.append("file", image);
      formData.append("type", "timeline_image");
      
      try {
        const response = await fetch(`/api/projects/${projectId}/documents`, {
          method: "POST",
          body: formData,
          credentials: "include"
        });
        
        if (!response.ok) {
          throw new Error("Failed to upload timeline image");
        }
        
        const data = await response.json();
        uploadedImageUrls.push(data.url);
      } catch (error) {
        console.error("Error uploading timeline image:", error);
        // Continue with other uploads even if one fails
      }
    }
    
    return uploadedImageUrls;
  };
  
  // Handle timeline image upload
  const handleTimelineImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Convert FileList to array and add to state
    const newImages = Array.from(files);
    setTimelineImages(prev => [...prev, ...newImages]);
    
    // Create object URLs for preview
    const newImageUrls = newImages.map(file => URL.createObjectURL(file));
    setTimelineImageUrls(prev => [...prev, ...newImageUrls]);
  };
  
  // Remove a timeline image
  const removeTimelineImage = (index: number) => {
    // Release object URL to prevent memory leaks
    if (timelineImageUrls[index]) {
      URL.revokeObjectURL(timelineImageUrls[index]);
    }
    
    setTimelineImages(prev => prev.filter((_, i) => i !== index));
    setTimelineImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Create timeline entry mutation
  const createTimelineMutation = useMutation({
    mutationFn: async (data: z.infer<typeof addTimelineSchema>) => {
      // Parse and convert the date correctly before sending to API
      let dateValue: Date;
      
      try {
        // If the date is already a Date object, use it directly
        if (data.date instanceof Date) {
          dateValue = data.date;
        } 
        // If it's a string, try to parse it
        else if (typeof data.date === 'string') {
          // Handle different date formats (including 'YYYY-MM-DD' from input[type="date"])
          if (data.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // ISO format date string from date picker (YYYY-MM-DD)
            dateValue = new Date(data.date + 'T00:00:00');
          } else {
            // Other string formats
            dateValue = new Date(data.date);
          }
          
          // Check if date is valid
          if (isNaN(dateValue.getTime())) {
            throw new Error("Invalid date format");
          }
        } else {
          // Fallback to current date if no valid date provided
          dateValue = new Date();
        }
      } catch (error) {
        console.error("Date parsing error:", error);
        dateValue = new Date(); // Fallback to current date
      }
      
      // Upload any images first
      const uploadedImageUrls = await uploadTimelineImages();
      
      // Combine the uploaded image URLs with any existing URLs from the form
      const allImageUrls = [
        ...(data.images || []),
        ...uploadedImageUrls
      ];
      
      // Create formatted data with valid Date object and image URLs
      const formattedData = {
        ...data,
        projectId,
        date: dateValue,
        images: allImageUrls.length > 0 ? allImageUrls : undefined
      };
      
      console.log("Sending timeline data with date:", formattedData.date);
      
      const response = await apiRequest("POST", `/api/projects/${projectId}/timeline`, formattedData);
      return response.json();
    },
    onSuccess: (newTimeline: ProjectTimeline) => {
      queryClient.setQueryData(
        [`/api/projects/${projectId}/timeline`],
        (oldData: ProjectTimeline[] = []) => [...oldData, newTimeline]
      );
      
      // Also update the project progress if it changed
      if (newTimeline.completionPercentage) {
        queryClient.setQueryData(
          [`/api/projects/${projectId}`],
          (oldProject: Project | undefined) => {
            if (!oldProject) return undefined;
            return {
              ...oldProject,
              progress: newTimeline.completionPercentage
            };
          }
        );
        
        // Also update in the projects list
        queryClient.setQueryData(
          ["/api/projects"],
          (oldProjects: Project[] = []) => 
            oldProjects.map(p => 
              p.id === projectId 
                ? { ...p, progress: newTimeline.completionPercentage as number } 
                : p
            )
        );
      }
      
      toast({
        title: "Timeline updated",
        description: "Project timeline has been updated successfully.",
      });
      
      setIsAddTimelineOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating timeline",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send text-only message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!project?.companyId) {
        throw new Error("This project doesn't have a company assigned yet");
      }
      
      const response = await apiRequest("POST", "/api/messages", {
        receiverId: project.companyId,
        projectId,
        content,
      });
      
      return response.json();
    },
    onSuccess: (newMessage: Message) => {
      queryClient.setQueryData(
        ["/api/messages"],
        (oldData: Message[] = []) => [...oldData, newMessage]
      );
      
      setNewMessage("");
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Send message with images mutation
  const sendMessageWithImagesMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!project?.companyId) {
        throw new Error("This project doesn't have a company assigned yet");
      }
      
      const response = await fetch("/api/messages/with-images", {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send message with images");
      }
      
      return response.json();
    },
    onSuccess: (newMessage: Message) => {
      queryClient.setQueryData(
        ["/api/messages"],
        (oldData: Message[] = []) => [...oldData, newMessage]
      );
      
      setNewMessage("");
      toast({
        title: "Message sent",
        description: "Your message with images has been sent successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Add team member mutation
  const addTeamMemberMutation = useMutation({
    mutationFn: async ({ username, role }: { username: string, role: string }) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/team`, {
        username,
        role
      });
      
      return response.json();
    },
    onSuccess: (updatedProject: Project) => {
      // Update project in cache
      queryClient.setQueryData(
        [`/api/projects/${projectId}`],
        updatedProject
      );
      
      // Trigger role-specific onboarding for the newly added member's role
      setCurrentRole(teamMemberRole);
      setShowRoleOnboarding(true);
      
      setNewTeamMember("");
      setTeamMemberRole("contractor");
      setAddTeamMemberError("");
      setIsAddTeamMemberOpen(false);
      
      toast({
        title: "Team member added",
        description: "Team member has been added to the project successfully.",
      });
    },
    onError: (error: Error) => {
      setAddTeamMemberError(error.message);
      toast({
        title: "Error adding team member",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Invite team member by email mutation
  const inviteTeamMemberMutation = useMutation({
    mutationFn: async ({ inviteEmail, role }: { inviteEmail: string, role: string }) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/invitations`, {
        inviteEmail,
        role
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      // Update project in cache
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      
      setInviteEmail("");
      setTeamMemberRole("contractor");
      setInviteTeamMemberError("");
      setIsAddTeamMemberOpen(false);
      
      toast({
        title: "Invitation sent",
        description: "An invitation has been sent to join the project team!",
      });
    },
    onError: (error: Error) => {
      setInviteTeamMemberError(error.message);
      toast({
        title: "Error sending invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove team member mutation
  const removeTeamMemberMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("DELETE", `/api/projects/${projectId}/team/${userId}`);
      return response.json();
    },
    onSuccess: (updatedProject: Project) => {
      // Update project in cache
      queryClient.setQueryData(
        [`/api/projects/${projectId}`],
        updatedProject
      );
      
      toast({
        title: "Team member removed",
        description: "Team member has been removed from the project.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error removing team member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: z.infer<typeof addTimelineSchema>) => {
    createTimelineMutation.mutate(data);
    
    // Reset the image upload state after form is submitted
    setTimelineImages([]);
    setTimelineImageUrls([]);
  };

  // Handle send message
  const handleSendMessage = (content: string, images?: File[]) => {
    if (!content.trim() && (!images || images.length === 0)) return;
    
    if (images && images.length > 0) {
      // Create FormData and append content and images
      const formData = new FormData();
      formData.append("content", content);
      formData.append("receiverId", project?.companyId?.toString() || "");
      formData.append("projectId", projectId.toString());
      
      // Append each image file
      images.forEach((image, index) => {
        formData.append(`images`, image);
      });
      
      // Send the FormData with images
      sendMessageWithImagesMutation.mutate(formData);
    } else {
      // Send text-only message
      sendMessageMutation.mutate(content);
    }
  };
  
  // Handle file change for document upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setDocumentFile(files[0]);
      
      // Auto-populate document name if not already set
      if (!documentName) {
        // Remove file extension
        const fileName = files[0].name.split('.').slice(0, -1).join('.');
        setDocumentName(fileName);
      }
    }
  };
  
  // Handle document upload
  const handleUploadDocument = () => {
    if (!documentName.trim()) {
      setUploadError("Document name is required");
      return;
    }
    
    if (!documentFile) {
      setUploadError("Please select a file to upload");
      return;
    }
    
    uploadDocumentMutation.mutate();
  };
  
  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async () => {
      if (!documentFile || !documentName.trim()) {
        throw new Error("Please select a file and provide a name");
      }
      
      const formData = new FormData();
      formData.append("file", documentFile);
      formData.append("name", documentName);
      formData.append("type", documentType);
      
      const response = await fetch(`/api/projects/${projectId}/documents`, {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload document");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/projects/${projectId}/documents`]
      });
      
      setDocumentName("");
      setDocumentFile(null);
      setUploadError("");
      setIsUploadDocumentOpen(false);
      
      toast({
        title: "Document uploaded",
        description: "Your document has been uploaded successfully.",
      });
    },
    onError: (error: Error) => {
      setUploadError(error.message);
      toast({
        title: "Error uploading document",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const response = await apiRequest("DELETE", `/api/projects/${projectId}/documents/${documentId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/documents`] 
      });
      
      toast({
        title: "Document deleted",
        description: "The document has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting document",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Filter documents by type
  const filterDocumentsByType = (type: string) => {
    setFilterType(type);
  };
  
  // Handle document deletion
  const handleDeleteDocument = (documentId: number) => {
    deleteDocumentMutation.mutate(documentId);
  };
  
  // Get filtered documents based on the filter type
  const filteredDocuments = filterType
    ? projectDocuments.filter(doc => doc.type === filterType)
    : projectDocuments;

  if (isLoadingProject) {
    return (
      <DashboardLayout title="Project Details">
        <div className="flex justify-center items-center min-h-[60vh]">
          <p>Loading project details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (projectError || !project) {
    return (
      <DashboardLayout title="Project Details">
        <div className="flex justify-center items-center min-h-[60vh]">
          <TryAgain
            message={projectError ? 
              "There was a problem loading this project. This could be due to an authentication issue or the project might not exist." : 
              "Project not found or you don't have permission to view it."
            }
            retryFunction={async () => {
              // First try to revalidate authentication
              try {
                // Fetch the user to refresh authentication
                await apiRequest("GET", "/api/auth/verify");
                // Refetch the project data
                queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
              } catch (err) {
                console.error("Authentication recovery failed:", err);
                // Redirect to login if authentication fails
                navigate("/auth");
              }
            }}
            buttonText="Try Again"
            isError={true}
          />
        </div>
      </DashboardLayout>
    );
  }

  // Generate the status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Pending Approval</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Format date
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "Not set";
    try {
      return format(new Date(date), "MMMM dd, yyyy");
    } catch (e) {
      return "Invalid date";
    }
  };

  // Get the associated company if any
  const company = project.companyId ? companiesRecord[project.companyId] : undefined;

  // Get project coordinates
  const coordinates = project.coordinates as { lat: number, lng: number };
  
  // Check if the current user can edit the project
  const canEditProject = user?.id === project.clientId || 
    (project.teamMembers && Array.isArray(project.teamMembers) && 
     project.teamMembers.some((member: any) => 
       member.userId === user?.id && 
       (member.role === "contractor" || member.role === "project_manager")
     ));

  return (
    <DashboardLayout title={`Project: ${project.name}`}>
      {/* Role-specific onboarding modal */}
      {showRoleOnboarding && (
        <RoleSpecificOnboarding
          user={user}
          role={currentRole}
          onComplete={() => {
            setShowRoleOnboarding(false);
            if (currentRole) {
              completeRoleOnboarding(currentRole);
            }
          }}
        />
      )}
    
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Button 
          variant="outline" 
          size="sm"
          className="sm:mr-3 w-fit" 
          onClick={() => navigate("/projects")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
          <h1 className="text-xl sm:text-2xl font-bold mr-2 break-words">{project.name}</h1>
          {getStatusBadge(project.status)}
        </div>
      </div>

      <Card className="mb-4 sm:mb-6">
        <CardContent className="p-3 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="md:col-span-2">
              <h2 className="font-semibold text-base sm:text-lg mb-2">Project Overview</h2>
              <p className="text-gray-600 text-sm sm:text-base mb-3 sm:mb-4 line-clamp-4 sm:line-clamp-none">{project.description}</p>
              
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="bg-gray-50 p-2 sm:p-3 rounded-md">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500">Type</h3>
                  <p className="text-sm sm:text-base font-medium truncate">{project.type.charAt(0).toUpperCase() + project.type.slice(1)}</p>
                </div>
                <div className="bg-gray-50 p-2 sm:p-3 rounded-md">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500">Status</h3>
                  <p className="text-sm sm:text-base font-medium truncate">{project.status.replace('_', ' ').charAt(0).toUpperCase() + project.status.replace('_', ' ').slice(1)}</p>
                </div>
                <div className="bg-gray-50 p-2 sm:p-3 rounded-md">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500">Location</h3>
                  <div className="flex items-center">
                    <MapPin className="h-3 w-3 text-primary mr-1 flex-shrink-0" />
                    <p className="text-sm sm:text-base font-medium truncate">{project.location}</p>
                  </div>
                </div>
                <div className="bg-gray-50 p-2 sm:p-3 rounded-md">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500">Est. Completion</h3>
                  <p className="text-sm sm:text-base font-medium truncate">{formatDate(project.estimatedCompletion)}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-2 sm:p-3 rounded-md mb-3 sm:mb-4">
                <div className="flex justify-between items-center mb-1.5">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500">Progress</h3>
                  <span className="text-xs sm:text-sm font-medium">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-2 sm:h-2.5" />
              </div>
            </div>
            
            <div>
              <h2 className="font-semibold text-base sm:text-lg mb-2 flex items-center">
                <MapPin className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Construction Site Location
              </h2>
              <div className="h-[150px] sm:h-[250px] mb-3 sm:mb-4 rounded-md overflow-hidden border border-gray-100 shadow-sm">
                <LocationMap
                  projects={[project]}
                  height="100%"
                />
              </div>
              <div className="flex items-center bg-gray-50 p-2 sm:p-3 rounded-md mb-3 sm:mb-4">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary mr-1.5 sm:mr-2 flex-shrink-0" />
                <p className="text-xs sm:text-sm text-gray-700">{project.location}</p>
              </div>
              
              {company && (
                <div className="border-t pt-3 sm:pt-4 mt-3 sm:mt-4">
                  <h2 className="font-semibold text-base sm:text-lg mb-2">Real Estate Partner</h2>
                  <div className="flex items-center">
                    <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-primary text-white flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                      {company.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-sm sm:text-base truncate">{company.fullName}</p>
                      <p className="text-xs text-gray-500 truncate">{company.email}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="mb-4 sm:mb-6 overflow-hidden border-b">
          <TabsList className="w-full justify-start overflow-x-auto p-0 pb-1 no-scrollbar relative -mx-1 px-1">
            <TabsTrigger value="overview" className="flex items-center text-xs sm:text-sm py-1.5 px-2.5 sm:py-2 sm:px-4 flex-shrink-0 rounded-md">
              <FileText className="h-4 w-4 mr-1 sm:mr-2" /> 
              <span className="text-xs sm:text-sm whitespace-nowrap">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center text-xs sm:text-sm py-1.5 px-2.5 sm:py-2 sm:px-4 flex-shrink-0 rounded-md">
              <Calendar className="h-4 w-4 mr-1 sm:mr-2" /> 
              <span className="text-xs sm:text-sm whitespace-nowrap">Timeline</span>
            </TabsTrigger>
            <TabsTrigger value="construction" className="flex items-center text-xs sm:text-sm py-1.5 px-2.5 sm:py-2 sm:px-4 flex-shrink-0 rounded-md">
              <HardHat className="h-4 w-4 mr-1 sm:mr-2" /> 
              <span className="text-xs sm:text-sm whitespace-nowrap">Build</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center text-xs sm:text-sm py-1.5 px-2.5 sm:py-2 sm:px-4 flex-shrink-0 rounded-md">
              <Users className="h-4 w-4 mr-1 sm:mr-2" /> 
              <span className="text-xs sm:text-sm whitespace-nowrap">Team</span>
            </TabsTrigger>
            <TabsTrigger value="materials" className="flex items-center text-xs sm:text-sm py-1.5 px-2.5 sm:py-2 sm:px-4 flex-shrink-0 rounded-md">
              <Boxes className="h-4 w-4 mr-1 sm:mr-2" /> 
              <span className="text-xs sm:text-sm whitespace-nowrap">Materials</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center text-xs sm:text-sm py-1.5 px-2.5 sm:py-2 sm:px-4 flex-shrink-0 rounded-md">
              <Banknote className="h-4 w-4 mr-1 sm:mr-2" /> 
              <span className="text-xs sm:text-sm whitespace-nowrap">Expenses</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center text-xs sm:text-sm py-1.5 px-2.5 sm:py-2 sm:px-4 flex-shrink-0 rounded-md">
              <ClipboardCheck className="h-4 w-4 mr-1 sm:mr-2" /> 
              <span className="text-xs sm:text-sm whitespace-nowrap">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center text-xs sm:text-sm py-1.5 px-2.5 sm:py-2 sm:px-4 flex-shrink-0 rounded-md">
              <Truck className="h-4 w-4 mr-1 sm:mr-2" /> 
              <span className="text-xs sm:text-sm whitespace-nowrap">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center text-xs sm:text-sm py-1.5 px-2.5 sm:py-2 sm:px-4 flex-shrink-0 rounded-md">
              <MessageSquare className="h-4 w-4 mr-1 sm:mr-2" /> 
              <span className="text-xs sm:text-sm whitespace-nowrap">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center text-xs sm:text-sm py-1.5 px-2.5 sm:py-2 sm:px-4 flex-shrink-0 rounded-md">
              <FileIcon className="h-4 w-4 mr-1 sm:mr-2" /> 
              <span className="text-xs sm:text-sm whitespace-nowrap">Docs</span>
            </TabsTrigger>
            <TabsTrigger value="photos" className="flex items-center text-xs sm:text-sm py-1.5 px-2.5 sm:py-2 sm:px-4 flex-shrink-0 rounded-md">
              <Camera className="h-4 w-4 mr-1 sm:mr-2" /> 
              <span className="text-xs sm:text-sm whitespace-nowrap">Photos</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          {/* Site Materials Section (conditionally rendered) */}
          {showSiteMaterials && (
            <div className="mb-6">
              <SiteMaterialsSection projectId={projectId} />
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="md:col-span-2">
              <ProgressTimeline 
                timelineItems={timelineItems.slice(0, 3)} 
                projectName={project.name}
              />
            </div>
            
            <div className="flex flex-col space-y-4 sm:space-y-6">
              <Card className="border shadow-sm">
                <CardHeader className="py-3 sm:py-4">
                  <CardTitle className="text-base sm:text-lg">Project Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3 py-0 px-3 pb-3 sm:px-6 sm:pb-4">
                  {/* View Site Materials Button */}
                  <Button 
                    className="w-full justify-start bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm h-9 sm:h-10"
                    onClick={() => setShowSiteMaterials(!showSiteMaterials)}
                  >
                    <Boxes className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> 
                    {showSiteMaterials ? "Hide Materials Onsite" : "View Materials Onsite"}
                  </Button>
                  
                  {(user?.role === "company" || 
                   (project.teamMembers && Array.isArray(project.teamMembers) && 
                    project.teamMembers.some((member: any) => 
                     member.userId === user?.id && 
                     (member.role === "contractor" || member.role === "project_manager")
                    )
                   )) && (
                    <Button 
                      className="w-full justify-start text-xs sm:text-sm h-9 sm:h-10" 
                      onClick={() => setIsAddTimelineOpen(true)}
                    >
                      <Plus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Update Project Timeline
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-xs sm:text-sm h-9 sm:h-10"
                    onClick={() => setActiveTab("messages")}
                  >
                    <Users className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Send Message
                  </Button>
                  
                  {user?.role === "client" && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-xs sm:text-sm h-9 sm:h-10"
                      onClick={() => navigate("/materials")}
                    >
                      <Truck className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Order Materials
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-xs sm:text-sm h-9 sm:h-10"
                    onClick={() => setActiveTab("timeline")}
                  >
                    <Calendar className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> View Full Timeline
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-xs sm:text-sm h-9 sm:h-10"
                    onClick={() => navigate("/locations")}
                  >
                    <Map className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> View on Map
                  </Button>
                  
                  {user?.role === "client" && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-xs sm:text-sm h-9 sm:h-10"
                      onClick={() => navigate("/service-requests")}
                    >
                      <Wrench className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Request Service
                    </Button>
                  )}
                </CardContent>
              </Card>
              
              {projectOrders.length > 0 && (
                <Card className="border shadow-sm">
                  <CardHeader className="py-3 sm:py-4">
                    <CardTitle className="text-base sm:text-lg">Recent Orders</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0 px-3 pb-3 sm:px-6 sm:pb-4">
                    <div className="space-y-2 sm:space-y-3">
                      {projectOrders.slice(0, 3).map((order) => (
                        <div key={order.id} className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-xs sm:text-sm font-medium">#{order.orderId}</p>
                            <p className="text-xs text-gray-500">
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                          <Badge
                            className={`text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 ${
                              order.status === "delivered"
                                ? "bg-green-100 text-green-800"
                                : order.status === "in_transit"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {order.status.replace('_', ' ').charAt(0).toUpperCase() + order.status.replace('_', ' ').slice(1)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    {projectOrders.length > 3 && (
                      <Button 
                        variant="link" 
                        className="w-full text-xs sm:text-sm h-8 sm:h-9 mt-1" 
                        onClick={() => setActiveTab("orders")}
                      >
                        View All Orders
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="timeline">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-semibold">Project Timeline</h2>
            {(user?.role === "company" || 
              (project.teamMembers && Array.isArray(project.teamMembers) && 
               project.teamMembers.some((member: any) => 
                member.userId === user?.id && 
                (member.role === "contractor" || member.role === "project_manager")
               )
              )) && (
              <Button 
                size="sm" 
                className="h-8 sm:h-10 text-xs sm:text-sm"
                onClick={() => setIsAddTimelineOpen(true)}
              >
                <Plus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Add Timeline Entry
              </Button>
            )}
          </div>
          
          {isLoadingTimeline ? (
            <div className="text-center py-6 sm:py-8">
              <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-sm sm:text-base">Loading timeline...</p>
            </div>
          ) : timelineItems.length > 0 ? (
            <Card className="border shadow-sm overflow-hidden">
              <CardContent className="p-2 sm:p-6">
                <ProgressTimeline 
                  timelineItems={timelineItems} 
                  projectName={project.name}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg border border-gray-200 px-3 sm:px-6">
              <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No timeline entries yet</h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 max-w-md mx-auto">
                {(user?.role === "company" || 
                  (project.teamMembers && Array.isArray(project.teamMembers) && 
                   project.teamMembers.some((member: any) => 
                    member.userId === user?.id && 
                    (member.role === "contractor" || member.role === "project_manager")
                   )
                  )) 
                  ? "Add your first timeline entry to track the project progress."
                  : "The project timeline will be updated as work progresses."}
              </p>
              {(user?.role === "company" || 
                (project.teamMembers && Array.isArray(project.teamMembers) && 
                 project.teamMembers.some((member: any) => 
                  member.userId === user?.id && 
                  (member.role === "contractor" || member.role === "project_manager")
                 )
                )) && (
                <Button 
                  size="sm"
                  className="h-8 sm:h-10 text-xs sm:text-sm"
                  onClick={() => setIsAddTimelineOpen(true)}
                >
                  <Plus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Add First Entry
                </Button>
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="orders">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-semibold">Project Orders</h2>
            {user?.role === "client" && (
              <Button 
                size="sm" 
                className="h-8 sm:h-10 text-xs sm:text-sm"
                onClick={() => navigate("/materials")}
              >
                <Plus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Order Materials
              </Button>
            )}
          </div>
          
          {isLoadingOrders ? (
            <div className="text-center py-6 sm:py-8">
              <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-sm sm:text-base">Loading orders...</p>
            </div>
          ) : projectOrders.length > 0 ? (
            <Card className="border shadow-sm overflow-hidden">
              <CardContent className="p-2 sm:p-6">
                <OrderTable orders={projectOrders} />
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg border border-gray-200 px-3 sm:px-6">
              <Truck className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No orders found</h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 max-w-md mx-auto">
                {user?.role === "client" 
                  ? "Order construction materials for this project."
                  : "No materials have been ordered for this project yet."}
              </p>
              {user?.role === "client" && (
                <Button
                  size="sm"
                  className="h-8 sm:h-10 text-xs sm:text-sm"
                  onClick={() => navigate("/materials")}
                >
                  <Plus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Order Materials
                </Button>
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="materials">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-semibold">Site Materials</h2>
            <Button 
              size="sm" 
              className="h-8 sm:h-10 text-xs sm:text-sm"
              asChild
              disabled={isLoadingProject || !project}
            >
              <Link href={`/projects/${projectId}/site-materials`}>
                <Plus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Manage Site Materials
              </Link>
            </Button>
          </div>
          
          <Card className="border shadow-sm overflow-hidden">
            <CardContent className="p-2 sm:p-6">
              <SiteMaterialsSection projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="team">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-semibold">Project Team</h2>
            {user && (user.role === "client" || user.role === "admin") && user.id === project.clientId && (
              <Button 
                size="sm" 
                className="h-8 sm:h-10 text-xs sm:text-sm"
                onClick={() => setIsAddTeamMemberOpen(true)}
              >
                <UserPlus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Add Team Member
              </Button>
            )}
          </div>
          
          {/* Pending Invitations Section */}
          {!isLoadingInvitations && projectInvitations && projectInvitations.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center mb-3">
                <Mail className="h-5 w-5 mr-2 text-blue-500" />
                <h4 className="font-semibold">Pending Invitations</h4>
              </div>
              <div className="space-y-3 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-100 dark:border-blue-800">
                {projectInvitations
                  .filter((invite: any) => invite.inviteStatus === "pending")
                  .map((invite: any, index: number) => (
                  <div key={index} className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                    <div className="flex items-center mb-2 md:mb-0">
                      <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-full mr-3">
                        <Mail className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{invite.inviteEmail}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          Invited as {invite.role.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 w-full md:w-auto md:flex-row md:space-y-0 md:space-x-3 justify-start md:justify-end mt-2 md:mt-0">
                      <div className="relative flex items-center">
                        <Input 
                          value={invite.inviteLink} 
                          readOnly
                          className="pr-20 text-xs bg-gray-50 dark:bg-gray-700 w-full md:w-64"
                          onClick={(e) => {
                            e.currentTarget.select();
                            navigator.clipboard.writeText(invite.inviteLink);
                            toast({
                              title: "Link copied!",
                              description: "Invitation link copied to clipboard",
                            });
                          }}
                        />
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="absolute right-0 h-full"
                          onClick={() => {
                            navigator.clipboard.writeText(invite.inviteLink);
                            toast({
                              title: "Link copied!",
                              description: "Invitation link copied to clipboard",
                            });
                          }}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          <span className="text-xs">Copy</span>
                        </Button>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs"
                          onClick={() => {
                            // Create a mailto link with the invitation info
                            window.open(`mailto:${invite.inviteEmail}?subject=Invitation to join project ${project?.name}&body=You've been invited to join the project "${project?.name}" as ${invite.role.replace(/_/g, ' ')}. Click this link to join: ${invite.inviteLink}`);
                          }}
                        >
                          <Send className="h-3.5 w-3.5 mr-1" />
                          Email
                        </Button>
                        
                        {/* Delete invitation button */}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-800 dark:hover:bg-red-950"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete the invitation for ${invite.inviteEmail}?`)) {
                              deleteInvitationMutation.mutate(invite.id);
                            }
                          }}
                          disabled={deleteInvitationMutation.isPending}
                        >
                          {deleteInvitationMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                          )}
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" /> Project Team {project.teamMembers && Array.isArray(project.teamMembers) && 
                  <Badge className="ml-2 bg-primary">{project.teamMembers.length} {project.teamMembers.length === 1 ? 'Member' : 'Members'}</Badge>
                }
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {project.teamMembers && Array.isArray(project.teamMembers) && project.teamMembers.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex p-3 bg-gray-100 rounded-lg mb-2">
                    <div className="flex-1 font-medium">Team Member</div>
                    <div className="flex-1 font-medium">Role</div>
                    <div className="w-10"></div>
                  </div>
                  {project.teamMembers.map((member: any) => (
                    <div key={member.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center flex-1">
                        <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center mr-3">
                          {member.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{member.username}</p>
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center">
                          {member.role === "contractor" && (
                            <div className="flex items-center">
                              <div className="bg-orange-100 p-1 rounded-full mr-1.5">
                                <HardHat className="h-4 w-4 text-orange-600" />
                              </div>
                              <span className="text-sm font-medium text-orange-700 capitalize">Contractor</span>
                            </div>
                          )}
                          {member.role === "project_manager" && (
                            <div className="flex items-center">
                              <div className="bg-blue-100 p-1 rounded-full mr-1.5">
                                <ClipboardCheck className="h-4 w-4 text-blue-600" />
                              </div>
                              <span className="text-sm font-medium text-blue-700 capitalize">Project Manager</span>
                            </div>
                          )}
                          {member.role === "inspector" && (
                            <div className="flex items-center">
                              <div className="bg-green-100 p-1 rounded-full mr-1.5">
                                <Binoculars className="h-4 w-4 text-green-600" />
                              </div>
                              <span className="text-sm font-medium text-green-700 capitalize">Inspector</span>
                            </div>
                          )}
                          {member.role === "relative" && (
                            <div className="flex items-center">
                              <div className="bg-purple-100 p-1 rounded-full mr-1.5">
                                <Users className="h-4 w-4 text-purple-600" />
                              </div>
                              <span className="text-sm font-medium text-purple-700 capitalize">Relative</span>
                            </div>
                          )}
                          {!["contractor", "project_manager", "inspector", "relative"].includes(member.role) && (
                            <p className="text-sm font-medium capitalize">{member.role || 'Member'}</p>
                          )}
                        </div>
                      </div>
                      
                      {user && (user.id === project.clientId || user.role === "admin") && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeTeamMemberMutation.mutate(member.userId)}
                          disabled={removeTeamMemberMutation.isPending}
                          className="ml-2"
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No team members yet</h3>
                  <p className="text-gray-500 mb-6">
                    {user?.id === project.clientId 
                      ? "Add team members to collaborate on this project."
                      : "No team members have been added to this project yet."}
                  </p>
                  {user?.id === project.clientId && (
                    <Button onClick={() => setIsAddTeamMemberOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" /> Add Team Member
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="construction">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold">Construction Details</h2>
            {(user?.role === "company" || 
              (project.teamMembers && Array.isArray(project.teamMembers) && 
               project.teamMembers.some((member: any) => 
                member.userId === user?.id && 
                (member.role === "contractor" || member.role === "project_manager")
               )
              )) && (
              <div className="flex gap-2">
                <Button onClick={() => setIsAddTimelineOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add Progress Update
                </Button>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HardHat className="mr-2 h-5 w-5" /> Construction Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Phase:</span>
                    <Badge className="bg-blue-500">
                      {project.constructionPhase || "Planning"}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Building Type:</span>
                    <span>{project.buildingType || "Residential"}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Area:</span>
                    <span>{project.area || "N/A"} sq.m</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Stories:</span>
                    <span>{project.stories || "N/A"}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Permit Status:</span>
                    <Badge className={project.permitStatus === "approved" ? "bg-green-500" : "bg-yellow-500"}>
                      {typeof project.permitStatus === 'string' ? project.permitStatus.charAt(0).toUpperCase() + project.permitStatus.slice(1) : "Pending"}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Overall Progress:</span>
                    <EmojiProgressBar 
                      value={project.progress}
                      animationDuration={0.8}
                      height="h-8"
                      className="mt-2" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" /> Timeline Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Start Date:</span>
                    <span>{formatDate(project.startDate) || "Not set"}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Estimated Completion:</span>
                    <span>{formatDate(project.estimatedCompletion) || "Not set"}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Current Phase Deadline:</span>
                    <span>{formatDate(project.currentPhaseDeadline) || "Not set"}</span>
                  </div>
                  
                  <div className="flex items-center text-sm">
                    <AlertCircle className="h-4 w-4 mr-2 text-yellow-500" />
                    <span>
                      {project.delayStatus ? `Delayed by ${project.delayStatus} days` : "Currently on schedule"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Construction className="mr-2 h-5 w-5" /> Current Construction Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timelineItems.length > 0 ? (
                  <div className="space-y-4">
                    {timelineItems.slice(0, 3).map((item) => (
                      <div key={item.id} className="border-l-4 border-primary pl-4 py-2">
                        <div className="flex items-center">
                          <span className="text-sm font-medium">{item.title}</span>
                          <Badge className="ml-2">{item.constructionPhase || "General"}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        <div className="flex items-center mt-2 text-xs text-gray-500">
                          <Hammer className="h-3 w-3 mr-1" /> 
                          <span className="mr-4">Workers: {item.workersInvolved || "N/A"}</span>
                          <CloudRain className="h-3 w-3 mr-1" /> 
                          <span>Weather: {item.weather || "N/A"}</span>
                        </div>
                      </div>
                    ))}
                    <Button 
                      variant="link" 
                      onClick={() => setActiveTab("timeline")}
                      className="mt-2"
                    >
                      View all activities
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed rounded-md">
                    <Construction className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500">No construction activities recorded yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold">Project Expenses</h2>
            <Button 
              size="sm" 
              className="h-8 sm:h-10 text-xs sm:text-sm"
              onClick={() => {
                if (document.getElementById("add-expense-button")) {
                  // Simulate clicking the Add Expense button in ProjectExpenses component
                  document.getElementById("add-expense-button")?.click();
                }
              }}
              disabled={isLoadingProject || !project}
            >
              <Plus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Record Expense
            </Button>
          </div>
          
          <ProjectExpenses 
            project={project} 
            canEdit={canEditProject}
          />
        </TabsContent>
        
        <TabsContent value="reports">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold">Project Reports</h2>
            {(user?.role === "company" || 
              (project.teamMembers && Array.isArray(project.teamMembers) && 
               project.teamMembers.some((member: any) => 
                member.userId === user?.id && 
                (member.role === "contractor" || member.role === "project_manager")
               )
              )) && (
              <Button onClick={() => navigate(`/projects/${project.id}/reports/new`)}>
                <Plus className="mr-2 h-4 w-4" /> Add Manual Report
              </Button>
            )}
          </div>
          
          {/* Add the Auto-Generated Reports Section */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">
                <span className="flex items-center">
                  <BarChart3 className="mr-2 h-4 w-4 text-primary" />
                  Automated Project Reports
                </span>
              </CardTitle>
              <CardDescription>
                Intelligent reports automatically generated from your project data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingProject || isLoadingTimeline || !project ? (
                <div className="flex justify-center items-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ProjectReports 
                  project={project}
                  timelineEntries={timelineItems}
                  expenses={project.expenses || []}
                  siteMaterials={project.siteMaterials || []}
                  teamMembers={project.teamMembers || []}
                />
              )}
            </CardContent>
          </Card>
          
          {/* Existing Manual Reports Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">
                <span className="flex items-center">
                  <FileText className="mr-2 h-4 w-4 text-primary" />
                  Manual Site Reports
                </span>
              </CardTitle>
              <CardDescription>
                Reports manually created by team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingReports ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : reports && reports.length > 0 ? (
                <div className="space-y-4">
                  {reports.map((report: any) => (
                    <Card key={report.id} className="overflow-hidden">
                      <CardHeader className="p-4 border-b bg-gray-50">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-base font-medium">{report.title}</CardTitle>
                          <Badge variant={report.type === "issue" ? "destructive" : "outline"}>
                            {report.type === "issue" ? "Issue" : "Progress Update"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <p className="mb-3">{report.description}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <div className="text-sm text-gray-500 flex items-center">
                            <Calendar className="w-3.5 h-3.5 mr-1" />
                            {new Date(report.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <FileText className="w-3.5 h-3.5 mr-1" />
                            {report.author?.username || "Unknown"}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  <div className="text-center mt-6">
                    <Button variant="outline" onClick={() => navigate(`/projects/${project.id}/reports`)}>
                      View All Manual Reports
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                  <ClipboardCheck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No manual reports yet</h3>
                  <p className="text-gray-500 mb-6">
                    Add detailed reports about specific issues or milestones.
                  </p>
                  {(user?.role === "company" || 
                    (project.teamMembers && Array.isArray(project.teamMembers) && 
                     project.teamMembers.some((member: any) => 
                      member.userId === user?.id && 
                      (member.role === "contractor" || member.role === "project_manager")
                     )
                    )) && (
                    <Button onClick={() => navigate(`/projects/${project.id}/reports/new`)}>
                      <Plus className="mr-2 h-4 w-4" /> Create Manual Report
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold">Project Communication</h2>
          </div>
          
          {isLoadingMessages ? (
            <div className="text-center py-8">
              <p>Loading messages...</p>
            </div>
          ) : (
            <MessageList
              messages={projectMessages}
              users={messagesUsers}
              currentUser={user!}
              onSendMessage={handleSendMessage}
              isLoading={sendMessageMutation.isPending}
            />
          )}
        </TabsContent>
        
        <TabsContent value="photos">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold">Project Photos</h2>
          </div>
          
          {/* iOS-specific Image Uploader - only visible on iOS devices */}
          {project && !!canEditProject && (
            <div className="mb-6 ios-only" style={{display: /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'block' : 'none'}}>
              <IOSImageUploader 
                projectId={projectId}
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
                  toast({
                    title: "Image uploaded",
                    description: "Your image has been added to the project gallery.",
                  });
                }}
              />
            </div>
          )}
          
          {project && (
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="flex justify-between items-center p-6">
                <CardTitle className="text-lg font-semibold text-gray-800">Project Gallery</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ProjectImageSlider
                  images={[
                    ...(project.mainImage && typeof project.mainImage === 'object' ? [project.mainImage as any] : []),
                    ...(Array.isArray(project.additionalImages) ? project.additionalImages as any[] : [])
                  ].filter(img => img && img.url)}
                  projectId={projectId}
                  canEdit={!!canEditProject}
                  showControls={true}
                  height="h-64 sm:h-96"
                  aspectRatio="wide"
                  showUpload={!!canEditProject}
                  project={project}
                  onUploadComplete={() => {
                    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
                    toast({
                      title: "Image uploaded",
                      description: "Your image has been added to the project gallery.",
                    });
                  }}
                />
                
                {/* Image instructions */}
                <div className="mt-6 bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                  <h4 className="font-medium mb-2 flex items-center">
                    <Camera className="h-4 w-4 mr-2 text-primary" />
                    Project Photo Guidelines
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-500">
                    <li>Upload clear, high-quality images of your construction site</li>
                    <li>Include photos of important milestones and completed work</li>
                    <li>Add images of materials being used on site</li>
                    <li>Swipe left or right to navigate through all project photos</li>
                    {!!canEditProject && <li>Click "Add Image" to upload additional photos</li>}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="documents">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold">Project Documents</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex flex-wrap items-center gap-2 mr-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className={filterType === null ? "bg-primary/10" : ""}
                  onClick={() => setFilterType(null)}
                >
                  All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className={filterType === "receipt" ? "bg-primary/10" : ""}
                  onClick={() => filterDocumentsByType("receipt")}
                >
                  Receipts
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className={filterType === "drawing" ? "bg-primary/10" : ""}
                  onClick={() => filterDocumentsByType("drawing")}
                >
                  Drawings
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className={filterType === "legal" ? "bg-primary/10" : ""}
                  onClick={() => filterDocumentsByType("legal")}
                >
                  Legal
                </Button>
              </div>
              
              <Button onClick={() => setIsUploadDocumentOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Upload Document
              </Button>
            </div>
          </div>
          
          {isLoadingDocuments ? (
            <div className="text-center py-8">
              <p>Loading documents...</p>
            </div>
          ) : filteredDocuments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((document) => (
                <Card key={document.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                        {document.type === "receipt" ? (
                          <Receipt className="h-5 w-5" />
                        ) : document.type === "drawing" ? (
                          <FileText className="h-5 w-5" />
                        ) : document.type === "legal" ? (
                          <FileCheck className="h-5 w-5" />
                        ) : (
                          <FileIcon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{document.name}</h3>
                        <p className="text-xs text-gray-500 capitalize">
                          {document.type} • {format(new Date(document.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between mt-4">
                      <a 
                        href={document.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Document
                      </a>
                      
                      {user?.id === document.uploadedBy && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteDocument(document.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Delete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <FileIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents uploaded</h3>
              <p className="text-gray-500 mb-6">
                Upload receipts, drawings, contracts, and other documents related to this project.
              </p>
              <Button onClick={() => setIsUploadDocumentOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Upload First Document
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Timeline Entry Dialog */}
      <Dialog open={isAddTimelineOpen} onOpenChange={setIsAddTimelineOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Timeline Entry</DialogTitle>
            <DialogDescription>
              Update the project timeline with the latest progress.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Foundation Completed" />
                    </FormControl>
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
                        {...field} 
                        placeholder="Provide details about this milestone"
                        rows={3} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <select 
                          {...field}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="completed">Completed</option>
                          <option value="in_progress">In Progress</option>
                          <option value="pending">Pending</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between">
                        <FormLabel>Date</FormLabel>
                        <p className="text-xs text-muted-foreground">Format: YYYY-MM-DD</p>
                      </div>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="text" 
                          placeholder="e.g. 2025-04-28"
                          // Ensure we're working with a string value for the date input
                          value={typeof field.value === 'string' 
                            ? field.value 
                            : field.value instanceof Date 
                              ? field.value.toISOString().split('T')[0]
                              : ''
                          }
                          onChange={(e) => {
                            // Directly store the string from the text input
                            field.onChange(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                      {field.value && typeof field.value === 'string' && !field.value.match(/^\d{4}-\d{2}-\d{2}$/) && (
                        <p className="text-xs text-destructive mt-1">
                          Expected date format: YYYY-MM-DD
                        </p>
                      )}
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="completionPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Overall Project Completion (%)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="0" 
                        max="100"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Images (Optional)</FormLabel>
                    <div className="space-y-4">
                      {/* Manual URL input */}
                      <FormControl>
                        <Textarea 
                          placeholder="Add image URLs, one per line"
                          value={(field.value || []).join('\n')}
                          onChange={(e) => {
                            const urls = e.target.value
                              .split('\n')
                              .filter(url => url.trim() !== '');
                            field.onChange(urls);
                          }}
                          rows={2}
                        />
                      </FormControl>
                      
                      {/* File upload */}
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <label 
                            htmlFor="timeline-image-upload" 
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 cursor-pointer"
                          >
                            <Camera className="mr-2 h-4 w-4" />
                            Upload Photos
                          </label>
                          <input
                            id="timeline-image-upload"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleTimelineImageChange}
                            className="hidden"
                          />
                        </div>
                        
                        {/* Image preview */}
                        {timelineImageUrls.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {timelineImageUrls.map((url, index) => (
                              <div key={index} className="relative group">
                                <img 
                                  src={url} 
                                  alt={`Upload preview ${index + 1}`} 
                                  className="h-20 w-20 object-cover rounded-md border border-gray-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeTimelineImage(index)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddTimelineOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createTimelineMutation.isPending}
                >
                  {createTimelineMutation.isPending ? "Adding..." : "Add Entry"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Upload Document Dialog */}
      <Dialog open={isUploadDocumentOpen} onOpenChange={setIsUploadDocumentOpen}>
        <DialogContent className="sm:max-w-[475px]">
          <DialogHeader>
            <DialogTitle>Upload Project Document</DialogTitle>
            <DialogDescription>
              Upload receipts, drawings, contracts, and other documents related to this project.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {uploadError && (
              <div className="bg-red-50 text-red-800 px-4 py-2 rounded-md flex items-center text-sm">
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                {uploadError}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="documentName">Document Name</Label>
              <Input
                id="documentName"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="e.g., Foundation Receipt"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type</Label>
              <select
                id="documentType"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="receipt">Receipt</option>
                <option value="drawing">Drawing / Plan</option>
                <option value="legal">Legal Document</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="documentFile">Select File</Label>
              <Input
                id="documentFile"
                type="file"
                onChange={handleFileChange}
              />
            </div>
            
            {documentFile && (
              <div className="bg-gray-50 p-2 rounded-md">
                <div className="flex items-center">
                  <CheckSquare className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm font-medium">{documentFile.name}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({Math.round(documentFile.size / 1024)} KB)
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsUploadDocumentOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUploadDocument}
              disabled={uploadDocumentMutation.isPending}
            >
              {uploadDocumentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Team Member Dialog */}
      <Dialog open={isAddTeamMemberOpen} onOpenChange={setIsAddTeamMemberOpen}>
        <DialogContent className="sm:max-w-[475px]">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Invite a team member to collaborate on this project. You can invite existing users or new members via email.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="existing" className="w-full py-4">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="existing">Existing User</TabsTrigger>
              <TabsTrigger value="email">Invite by Email</TabsTrigger>
            </TabsList>
            
            <TabsContent value="existing" className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">Username</label>
                <Input
                  id="username"
                  placeholder="Enter team member's username"
                  value={newTeamMember}
                  onChange={(e) => setNewTeamMember(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  The user must already have an account on the platform.
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Team Member Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    className={`border rounded-md p-3 cursor-pointer transition-colors ${
                      teamMemberRole === "contractor" 
                        ? "border-primary bg-primary/10" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setTeamMemberRole("contractor")}
                  >
                    <div className="flex items-center">
                      <div className="bg-orange-100 p-2 rounded-full mr-3">
                        <HardHat className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Contractor</p>
                        <p className="text-xs text-gray-500">Oversees construction</p>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className={`border rounded-md p-3 cursor-pointer transition-colors ${
                      teamMemberRole === "project_manager" 
                        ? "border-primary bg-primary/10" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setTeamMemberRole("project_manager")}
                  >
                    <div className="flex items-center">
                      <div className="bg-blue-100 p-2 rounded-full mr-3">
                        <ClipboardCheck className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Project Manager</p>
                        <p className="text-xs text-gray-500">Coordinates project</p>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className={`border rounded-md p-3 cursor-pointer transition-colors ${
                      teamMemberRole === "inspector" 
                        ? "border-primary bg-primary/10" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setTeamMemberRole("inspector")}
                  >
                    <div className="flex items-center">
                      <div className="bg-green-100 p-2 rounded-full mr-3">
                        <Binoculars className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Inspector</p>
                        <p className="text-xs text-gray-500">Verifies quality</p>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className={`border rounded-md p-3 cursor-pointer transition-colors ${
                      teamMemberRole === "relative" 
                        ? "border-primary bg-primary/10" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setTeamMemberRole("relative")}
                  >
                    <div className="flex items-center">
                      <div className="bg-purple-100 p-2 rounded-full mr-3">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Relative</p>
                        <p className="text-xs text-gray-500">Family oversight</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {addTeamMemberError && (
                <div className="flex items-center rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <p>{addTeamMemberError}</p>
                </div>
              )}
              
              <Button 
                className="w-full"
                onClick={() => {
                  if (!newTeamMember.trim()) {
                    setAddTeamMemberError("Username is required");
                    return;
                  }
                  
                  addTeamMemberMutation.mutate({
                    username: newTeamMember.trim(),
                    role: teamMemberRole
                  });
                }}
                disabled={addTeamMemberMutation.isPending}
              >
                {addTeamMemberMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Member"
                )}
              </Button>
            </TabsContent>
            
            <TabsContent value="email" className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="inviteEmail" className="text-sm font-medium">Email Address</label>
                <Input
                  id="inviteEmail"
                  type="email"
                  placeholder="Enter email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  An invitation will be sent to this email address. They can create an account if they don't have one.
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Team Member Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    className={`border rounded-md p-3 cursor-pointer transition-colors ${
                      teamMemberRole === "contractor" 
                        ? "border-primary bg-primary/10" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setTeamMemberRole("contractor")}
                  >
                    <div className="flex items-center">
                      <div className="bg-orange-100 p-2 rounded-full mr-3">
                        <HardHat className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Contractor</p>
                        <p className="text-xs text-gray-500">Oversees construction</p>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className={`border rounded-md p-3 cursor-pointer transition-colors ${
                      teamMemberRole === "project_manager" 
                        ? "border-primary bg-primary/10" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setTeamMemberRole("project_manager")}
                  >
                    <div className="flex items-center">
                      <div className="bg-blue-100 p-2 rounded-full mr-3">
                        <ClipboardCheck className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Project Manager</p>
                        <p className="text-xs text-gray-500">Coordinates project</p>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className={`border rounded-md p-3 cursor-pointer transition-colors ${
                      teamMemberRole === "inspector" 
                        ? "border-primary bg-primary/10" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setTeamMemberRole("inspector")}
                  >
                    <div className="flex items-center">
                      <div className="bg-green-100 p-2 rounded-full mr-3">
                        <Binoculars className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Inspector</p>
                        <p className="text-xs text-gray-500">Verifies quality</p>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className={`border rounded-md p-3 cursor-pointer transition-colors ${
                      teamMemberRole === "relative" 
                        ? "border-primary bg-primary/10" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setTeamMemberRole("relative")}
                  >
                    <div className="flex items-center">
                      <div className="bg-purple-100 p-2 rounded-full mr-3">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Relative</p>
                        <p className="text-xs text-gray-500">Family oversight</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {inviteTeamMemberError && (
                <div className="flex items-center rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <p>{inviteTeamMemberError}</p>
                </div>
              )}
              
              <Button 
                className="w-full"
                onClick={() => {
                  if (!inviteEmail) {
                    setInviteTeamMemberError("Email address is required");
                    return;
                  }
                  
                  // Validate email format
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (!emailRegex.test(inviteEmail)) {
                    setInviteTeamMemberError("Please enter a valid email address");
                    return;
                  }
                  
                  inviteTeamMemberMutation.mutate({
                    inviteEmail,
                    role: teamMemberRole
                  });
                }}
                disabled={inviteTeamMemberMutation.isPending}
              >
                {inviteTeamMemberMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Invitation...
                  </>
                ) : (
                  "Send Invitation"
                )}
              </Button>
              
              <p className="text-xs text-muted-foreground text-center mt-3">
                An email will be sent with instructions to join the project.
              </p>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddTeamMemberOpen(false);
                setAddTeamMemberError("");
                setInviteTeamMemberError("");
                setNewTeamMember("");
                setInviteEmail("");
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
