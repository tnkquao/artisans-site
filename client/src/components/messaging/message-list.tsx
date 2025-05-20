import { Message, User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { formatDistance } from "date-fns";
import { Send, Image, X, Paperclip, Camera } from "lucide-react";

interface MessageListProps {
  messages: Message[];
  users: Record<number, User>;
  currentUser: User;
  onSendMessage: (content: string, images?: File[]) => void;
  isLoading?: boolean;
  projectId?: number;
}

export function MessageList({
  messages,
  users,
  currentUser,
  onSendMessage,
  isLoading = false,
  projectId,
}: MessageListProps) {
  const [messageText, setMessageText] = useState("");
  const [messageImages, setMessageImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Convert FileList to array and add to state
    const newImages = Array.from(files);
    setMessageImages(prev => [...prev, ...newImages]);
    
    // Create object URLs for preview
    const newImageUrls = newImages.map(file => URL.createObjectURL(file));
    setImagePreviewUrls(prev => [...prev, ...newImageUrls]);
  };
  
  const removeImage = (index: number) => {
    // Release object URL to prevent memory leaks
    if (imagePreviewUrls[index]) {
      URL.revokeObjectURL(imagePreviewUrls[index]);
    }
    
    setMessageImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim() || messageImages.length > 0) {
      onSendMessage(messageText, messageImages.length > 0 ? messageImages : undefined);
      setMessageText("");
      
      // Clear image previews and release object URLs
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
      setMessageImages([]);
      setImagePreviewUrls([]);
    }
  };

  // Get user information for display
  const getUserInfo = (userId: number) => {
    const user = users[userId];
    return {
      name: user?.fullName || "Unknown User",
      role: user?.role === "admin" 
        ? "Artisans Administrator" 
        : user?.role === "company" 
          ? "Real Estate Partner"
          : "Client",
      avatarUrl: null // We don't have avatar URLs in our schema
    };
  };

  // Format relative time
  const formatMessageTime = (date: Date | string) => {
    try {
      return formatDistance(new Date(date), new Date(), { addSuffix: true });
    } catch (e) {
      return "Unknown time";
    }
  };

  return (
    <Card className="border border-gray-200 shadow-sm h-full">
      <CardHeader className="px-6 py-4">
        <CardTitle className="text-lg font-semibold text-gray-800">Recent Messages</CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="space-y-4 px-6 py-2 max-h-[400px] overflow-y-auto">
          {messages.length > 0 ? (
            messages.map((message) => {
              const isCurrentUser = message.senderId === currentUser.id;
              const userInfo = getUserInfo(message.senderId);
              
              return (
                <div key={message.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex">
                      <Avatar className="w-8 h-8 mr-3">
                        <AvatarFallback className={isCurrentUser ? "bg-primary" : "bg-secondary"}>
                          {userInfo.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="text-sm font-medium">{userInfo.name}</h4>
                        <p className="text-xs text-gray-500">{userInfo.role}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatMessageTime(message.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm mt-2">{message.content}</p>
                  
                  {/* Message images */}
                  {message.images && Array.isArray(message.images) && message.images.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.images.map((image, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={image} 
                            alt={`Message attachment ${index + 1}`} 
                            className="w-20 h-20 object-cover rounded-md border border-gray-200 cursor-pointer"
                            onClick={() => window.open(image, '_blank')}
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                            <div className="text-white text-xs">View</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {!isCurrentUser && (
                    <div className="mt-2 text-right">
                      <Button 
                        variant="link" 
                        className="text-xs text-primary hover:text-primary-dark p-0 h-auto"
                        onClick={() => setMessageText(`@${userInfo.name} `)}
                      >
                        Reply
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              No messages yet. Start a conversation!
            </div>
          )}
        </div>

        <div className="mt-4 px-6 pb-6">
          <form onSubmit={handleSendMessage}>
            {/* Image preview area */}
            {imagePreviewUrls.length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-2">
                  {imagePreviewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={url} 
                        alt={`Upload preview ${index + 1}`} 
                        className="h-20 w-20 object-cover rounded-md border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2 mb-2">
              <label
                htmlFor="message-image-upload"
                className="flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-8 px-3 cursor-pointer"
              >
                <Camera className="h-4 w-4 mr-1" />
                <span className="text-xs">Add Photo</span>
              </label>
              <input
                id="message-image-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            
            <div className="relative">
              <Input
                type="text"
                placeholder="Type a message..."
                className="w-full border border-gray-300 rounded-lg py-2 px-4 pr-10 text-sm focus:outline-none focus:border-primary"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                disabled={isLoading}
              />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary"
                disabled={isLoading || (!messageText.trim() && messageImages.length === 0)}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
