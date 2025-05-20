import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  MessageSquare,
  Send,
  User,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ImageComment {
  id: number;
  userId: number;
  username: string;
  role: string;
  text: string;
  timestamp: string;
}

interface ImageDetailsWithComments {
  id: number;
  name: string;
  url: string;
  uploadedBy: {
    userId: number;
    username: string;
    role: string;
  };
  uploadedAt: string;
  comments?: ImageComment[];
  type?: string;
}

interface ImageCommentsProps {
  projectId: number;
  image: ImageDetailsWithComments;
  variant?: "icon" | "button" | "link";
  asChild?: boolean;
  buttonText?: string;
  onCommentAdded?: () => void;
}

export function ImageComments({
  projectId,
  image,
  variant = "icon",
  asChild = false,
  buttonText = "Comments",
  onCommentAdded,
}: ImageCommentsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const comments = image.comments || [];
  const commentCount = comments.length;

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (comment: string) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/images/${image.id}/comments`, {
        comment,
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      // Clear form
      setNewComment("");
      
      // Invalidate project query to refresh comments
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully.",
      });
      
      if (onCommentAdded) {
        onCommentAdded();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding comment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCommentSubmit = () => {
    if (!newComment.trim()) {
      toast({
        title: "Comment required",
        description: "Please enter a comment before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    addCommentMutation.mutate(newComment.trim());
  };

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy 'at' h:mm a");
    } catch (e) {
      return dateStr;
    }
  };

  // Generate initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Get role color
  const getRoleColor = (role: string) => {
    switch (role) {
      case "client":
        return "bg-blue-500";
      case "contractor":
        return "bg-amber-500";
      case "admin":
        return "bg-red-500";
      case "project_manager":
        return "bg-green-500";
      case "service_provider":
        return "bg-purple-500";
      case "inspector":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild={asChild}>
        {variant === "icon" ? (
          <Button variant="ghost" size="icon" className="relative">
            <MessageSquare className="h-5 w-5" />
            {commentCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full text-xs w-4 h-4 flex items-center justify-center">
                {commentCount > 9 ? "9+" : commentCount}
              </span>
            )}
          </Button>
        ) : variant === "button" ? (
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            {buttonText} {commentCount > 0 && `(${commentCount})`}
          </Button>
        ) : (
          <Button variant="link" size="sm" className="gap-1 p-0 h-auto text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            {commentCount} {commentCount === 1 ? "comment" : "comments"}
          </Button>
        )}
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Image Comments</SheetTitle>
          <SheetDescription>
            View and add comments to this project image
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-4">
          <div className="rounded-md overflow-hidden mb-4">
            <img 
              src={image.url} 
              alt={image.name}
              className="w-full h-44 object-cover"
            />
          </div>
          
          <div className="text-sm text-muted-foreground mb-2">
            Uploaded by {image.uploadedBy?.username || "Unknown"} ({image.uploadedBy?.role || "user"}) 
            on {formatDate(image.uploadedAt)}
          </div>
          
          <Separator className="my-4" />
          
          <div className="flex flex-col space-y-4 flex-1 mb-4 overflow-y-auto max-h-[30vh]">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>No comments yet</p>
                <p className="text-sm">Be the first to comment on this image</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className={`h-8 w-8 ${getRoleColor(comment.role)}`}>
                    <AvatarFallback>{getInitials(comment.username)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-sm flex items-center gap-2">
                        {comment.username}
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded-sm capitalize">
                          {comment.role.replace("_", " ")}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(comment.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{comment.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="mt-auto">
          <Separator className="mb-4" />
          <div className="space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="resize-none"
              rows={2}
            />
            <div className="flex justify-between">
              <SheetClose asChild>
                <Button variant="outline">Close</Button>
              </SheetClose>
              <Button 
                onClick={handleCommentSubmit} 
                disabled={!newComment.trim() || addCommentMutation.isPending}
              >
                {addCommentMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Send className="mr-2 h-4 w-4" />
                Post Comment
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}