import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useChat } from "@/hooks/use-chat";
import { MessageCircle, Send } from "lucide-react";
import { formatDistance } from "date-fns";

interface ChatPanelProps {
  userId?: number;
  projectId?: number;
  position?: "right" | "left" | "bottom";
  className?: string;
}

export function ChatPanel({
  userId,
  projectId,
  position = "right",
  className = ""
}: ChatPanelProps) {
  const { toast } = useToast();
  const { messages, sendMessage, isConnected } = useChat();
  const [messageText, setMessageText] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter messages for this specific conversation
  const filteredMessages = messages.filter(message => {
    if (userId) {
      return (
        (message.senderId === userId || message.receiverId === userId) &&
        (projectId ? message.projectId === projectId : true)
      );
    }
    
    if (projectId) {
      return message.projectId === projectId;
    }
    
    return false;
  });

  // Sort messages by date, newest last
  const sortedMessages = [...filteredMessages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !userId) return;
    
    const success = sendMessage(userId, messageText, projectId);
    if (success) {
      setMessageText("");
    }
  };

  // Position styles
  const positionStyles = {
    right: "fixed right-4 bottom-4 w-80 z-10",
    left: "fixed left-4 bottom-4 w-80 z-10",
    bottom: "fixed bottom-0 left-0 right-0 w-full border-t z-10 rounded-none",
  };

  if (!isExpanded) {
    return (
      <Button
        onClick={() => setIsExpanded(true)}
        className={`${positionStyles[position]} h-12 flex items-center justify-center shadow-lg`}
        variant="default"
      >
        <MessageCircle className="h-5 w-5 mr-2" />
        <span>Open Chat</span>
      </Button>
    );
  }

  return (
    <Card className={`${positionStyles[position]} flex flex-col shadow-lg ${className}`}>
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              {userId ? `Chat with User ${userId}` : projectId ? `Project Chat` : "Chat"}
            </CardTitle>
            <CardDescription className="text-xs">
              {isConnected ? (
                <span className="flex items-center text-green-600">
                  <span className="h-2 w-2 bg-green-600 rounded-full mr-1"></span>
                  Connected
                </span>
              ) : (
                <span className="flex items-center text-red-600">
                  <span className="h-2 w-2 bg-red-600 rounded-full mr-1"></span>
                  Disconnected
                </span>
              )}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setIsExpanded(false)}
          >
            ✕
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-3 overflow-y-auto flex-grow" style={{ maxHeight: "300px" }}>
        {sortedMessages.length > 0 ? (
          <div className="space-y-2">
            {sortedMessages.map((message, i) => {
              const isCurrentUser = message.senderId !== userId;
              return (
                <div 
                  key={i} 
                  className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex items-start max-w-[80%] ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}>
                    <Avatar className={`h-6 w-6 ${isCurrentUser ? "ml-1" : "mr-1"}`}>
                      <AvatarFallback>
                        {message.senderName ? message.senderName.charAt(0).toUpperCase() : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div 
                        className={`px-3 py-2 rounded-md text-sm ${
                          isCurrentUser 
                            ? "bg-primary text-primary-foreground rounded-tr-none" 
                            : "bg-muted rounded-tl-none"
                        }`}
                      >
                        {message.content}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistance(new Date(message.timestamp), new Date(), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Start the conversation</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-2 pt-0">
        <form onSubmit={handleSendMessage} className="w-full flex items-center gap-2">
          <Input
            placeholder="Type your message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="flex-1"
            disabled={!isConnected}
          />
          <Button type="submit" size="sm" disabled={!isConnected || !messageText.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}