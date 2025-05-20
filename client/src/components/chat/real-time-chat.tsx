import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Search, User, Users } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistance } from "date-fns";

interface RealTimeChatProps {
  className?: string;
  selectedUserId?: number | null;
  selectedProjectId?: number | null;
  onlyWithUser?: number;
  showHeader?: boolean;
  maxHeight?: string;
  mode?: "compact" | "full";
}

export function RealTimeChat({
  className = "",
  selectedUserId = null,
  selectedProjectId = null,
  onlyWithUser,
  showHeader = true,
  maxHeight = "600px",
  mode = "full"
}: RealTimeChatProps) {
  const { user } = useAuth();
  const { messages, sendMessage, isConnected, recentContacts } = useChat();
  const [activeTab, setActiveTab] = useState("all");
  const [messageText, setMessageText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [activeChatUserId, setActiveChatUserId] = useState<number | null>(selectedUserId);
  const [activeChatProjectId, setActiveChatProjectId] = useState<number | null>(selectedProjectId);

  useEffect(() => {
    if (selectedUserId) {
      setActiveChatUserId(selectedUserId);
      setActiveTab("direct");
    }
    if (selectedProjectId) {
      setActiveChatProjectId(selectedProjectId);
      setActiveTab("projects");
    }
  }, [selectedUserId, selectedProjectId]);

  // Filter out contacts based on search text and ensure we only show relevant contacts
  const filteredContacts = recentContacts
    .filter((contact: { userId: number; username: string; role: string }) => {
      if (onlyWithUser !== undefined) {
        return contact.userId === onlyWithUser;
      }
      
      if (searchText) {
        return contact.username.toLowerCase().includes(searchText.toLowerCase());
      }
      
      return true;
    })
    .sort((a: { userId: number }, b: { userId: number }) => {
      // Sort by most recent message
      const aLastMessage = [...messages]
        .filter(m => m.senderId === a.userId || m.receiverId === a.userId)
        .sort((msgA, msgB) => new Date(msgB.timestamp).getTime() - new Date(msgA.timestamp).getTime())[0];
        
      const bLastMessage = [...messages]
        .filter(m => m.senderId === b.userId || m.receiverId === b.userId)
        .sort((msgA, msgB) => new Date(msgB.timestamp).getTime() - new Date(msgA.timestamp).getTime())[0];
        
      if (!aLastMessage) return 1;
      if (!bLastMessage) return -1;
      
      return new Date(bLastMessage.timestamp).getTime() - new Date(aLastMessage.timestamp).getTime();
    });

  // Filter messages for active chat
  const chatMessages = messages.filter(message => {
    if (activeChatUserId) {
      return (
        (message.senderId === activeChatUserId || message.receiverId === activeChatUserId) && 
        (message.senderId === user?.id || message.receiverId === user?.id) &&
        (activeChatProjectId ? message.projectId === activeChatProjectId : true)
      );
    }
    
    if (activeChatProjectId) {
      return message.projectId === activeChatProjectId;
    }
    
    return false;
  }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeChatUserId || !user) return;
    
    // Convert null to undefined for the projectId parameter
    const projectIdParam = activeChatProjectId === null ? undefined : activeChatProjectId;
    const success = sendMessage(activeChatUserId, messageText, projectIdParam);
    if (success) {
      setMessageText("");
    }
  };

  const handleSelectChat = (userId: number, projectId?: number) => {
    setActiveChatUserId(userId);
    setActiveChatProjectId(projectId || null);
    setActiveTab("direct");
  };

  return (
    <Card className={`${className} h-full`}>
      {showHeader && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <MessageCircle className="h-5 w-5" />
            Messages
            {isConnected ? (
              <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 hover:bg-green-50">
                <span className="h-2 w-2 bg-green-500 rounded-full mr-1"></span>
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-2 bg-red-50 text-red-700 hover:bg-red-50">
                <span className="h-2 w-2 bg-red-500 rounded-full mr-1"></span>
                Disconnected
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
      )}

      <CardContent className="p-4 pb-6 h-full">
        {mode === "full" ? (
          <div className="grid grid-cols-12 gap-4 h-full" style={{ maxHeight }}>
            <div className="col-span-4 border rounded-lg overflow-hidden">
              <div className="p-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search contacts..."
                    className="pl-8 text-sm"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>
              </div>

              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="px-2">
                  <TabsList className="w-full">
                    <TabsTrigger value="all" className="flex-1">
                      <Users className="h-4 w-4 mr-1" />
                      All
                    </TabsTrigger>
                    <TabsTrigger value="direct" className="flex-1">
                      <User className="h-4 w-4 mr-1" />
                      Direct
                    </TabsTrigger>
                    <TabsTrigger value="projects" className="flex-1">
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Projects
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="all" className="m-0">
                  <ScrollArea className="h-[calc(100vh-320px)]">
                    <div className="divide-y">
                      {filteredContacts.length > 0 ? (
                        filteredContacts.map((contact) => {
                          // Find last message with this contact
                          const lastMessage = [...messages]
                            .filter(m => (m.senderId === contact.userId || m.receiverId === contact.userId) && 
                            (m.senderId === user?.id || m.receiverId === user?.id))
                            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                          
                          return (
                            <div 
                              key={contact.userId} 
                              className={`p-3 hover:bg-muted cursor-pointer flex items-center gap-3 ${
                                activeChatUserId === contact.userId ? 'bg-muted' : ''
                              }`}
                              onClick={() => handleSelectChat(contact.userId)}
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  {contact.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                  <p className="font-medium truncate">{contact.username}</p>
                                  {lastMessage && (
                                    <span className="text-xs text-muted-foreground">
                                      {formatDistance(new Date(lastMessage.timestamp), new Date(), { addSuffix: true })}
                                    </span>
                                  )}
                                </div>
                                {lastMessage && (
                                  <p className="text-sm text-muted-foreground truncate">
                                    {lastMessage.senderId === user?.id ? 'You: ' : ''}
                                    {lastMessage.content}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-muted-foreground">
                          {searchText ? 'No contacts match your search' : 'No contacts yet'}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Direct messages tab */}
                <TabsContent value="direct" className="m-0">
                  <ScrollArea className="h-[calc(100vh-320px)]">
                    <div className="divide-y">
                      {filteredContacts
                        .filter(contact => {
                          const hasDirectMessages = messages && messages.some(
                            m => (m.senderId === contact.userId || m.receiverId === contact.userId) && 
                                 (m.senderId === user?.id || m.receiverId === user?.id) &&
                                 !m.projectId
                          );
                          return hasDirectMessages;
                        })
                        .map((contact) => {
                          const lastMessage = messages && [...messages]
                            .filter(m => (m.senderId === contact.userId || m.receiverId === contact.userId) && 
                                     (m.senderId === user?.id || m.receiverId === user?.id) &&
                                     !m.projectId)
                            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                          
                          return (
                            <div 
                              key={contact.userId} 
                              className={`p-3 hover:bg-muted cursor-pointer flex items-center gap-3 ${
                                activeChatUserId === contact.userId && !activeChatProjectId ? 'bg-muted' : ''
                              }`}
                              onClick={() => handleSelectChat(contact.userId)}
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  {contact.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                  <p className="font-medium truncate">{contact.username}</p>
                                  {lastMessage && (
                                    <span className="text-xs text-muted-foreground">
                                      {formatDistance(new Date(lastMessage.timestamp), new Date(), { addSuffix: true })}
                                    </span>
                                  )}
                                </div>
                                {lastMessage && (
                                  <p className="text-sm text-muted-foreground truncate">
                                    {lastMessage.senderId === user?.id ? 'You: ' : ''}
                                    {lastMessage.content}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Project messages tab */}
                <TabsContent value="projects" className="m-0">
                  <ScrollArea className="h-[calc(100vh-320px)]">
                    <div className="divide-y">
                      {messages && Array.from(new Set(messages.filter(m => m.projectId).map(m => m.projectId)))
                        .filter(projectId => projectId !== undefined && projectId !== null)
                        .map((projectId) => {
                          const projectMessages = messages && messages.filter(m => m.projectId === projectId);
                          const lastMessage = projectMessages && [...projectMessages]
                            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                          
                          const projectName = lastMessage.projectName || `Project ${projectId}`;
                          
                          // Find a contact from the project messages
                          const contactId = lastMessage.senderId !== user?.id ? lastMessage.senderId : lastMessage.receiverId;
                          const contact = recentContacts.find(c => c.userId === contactId);
                          
                          return (
                            <div 
                              key={`project-${projectId}`} 
                              className={`p-3 hover:bg-muted cursor-pointer ${
                                activeChatProjectId === projectId ? 'bg-muted' : ''
                              }`}
                              onClick={() => {
                                setActiveChatProjectId(projectId as number);
                                setActiveChatUserId(null);
                                setActiveTab("projects");
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback>
                                    {projectName.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center">
                                    <p className="font-medium truncate">{projectName}</p>
                                    {lastMessage && (
                                      <span className="text-xs text-muted-foreground">
                                        {formatDistance(new Date(lastMessage.timestamp), new Date(), { addSuffix: true })}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center">
                                    <p className="text-sm text-muted-foreground truncate">
                                      {lastMessage.senderId === user?.id ? 'You: ' : `${lastMessage.senderName}: `}
                                      {lastMessage.content}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>

            <div className="col-span-8 border rounded-lg flex flex-col h-full">
              {(activeChatUserId || activeChatProjectId) ? (
                <>
                  <div className="p-3 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {activeChatUserId 
                            ? recentContacts.find(c => c.userId === activeChatUserId)?.username.charAt(0).toUpperCase() || '?' 
                            : activeChatProjectId ? 'P' : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {activeChatUserId 
                            ? recentContacts.find(c => c.userId === activeChatUserId)?.username || 'User'
                            : activeChatProjectId 
                              ? messages && messages.find(m => m.projectId === activeChatProjectId)?.projectName || `Project ${activeChatProjectId}`
                              : 'Select a conversation'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isConnected ? 'Connected' : 'Disconnected'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <ScrollArea className="flex-grow p-4">
                    <div className="space-y-4">
                      {chatMessages.length > 0 ? (
                        chatMessages.map((message, i) => {
                          const isCurrentUser = message.senderId === user?.id;
                          return (
                            <div 
                              key={i} 
                              className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                            >
                              <div className={`flex items-start max-w-[70%] ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}>
                                <Avatar className={`h-8 w-8 ${isCurrentUser ? "ml-2" : "mr-2"}`}>
                                  <AvatarFallback>
                                    {message.senderName.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div 
                                    className={`px-3 py-2 rounded-lg text-sm ${
                                      isCurrentUser 
                                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                                        : "bg-muted rounded-tl-none"
                                    }`}
                                  >
                                    {message.content}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatDistance(new Date(message.timestamp), new Date(), { addSuffix: true })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="h-40 flex flex-col items-center justify-center text-center text-muted-foreground">
                          <MessageCircle className="h-10 w-10 mb-2 opacity-50" />
                          <p>No messages yet</p>
                          <p className="text-sm">Send a message to start the conversation</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  <div className="p-3 border-t mt-auto">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1"
                        disabled={!isConnected}
                      />
                      <Button 
                        type="submit" 
                        disabled={!isConnected || !messageText.trim()}
                      >
                        Send
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                  <MessageCircle className="h-16 w-16 mb-4 opacity-30" />
                  <h3 className="text-xl font-medium mb-2">Select a conversation</h3>
                  <p>Choose a contact or project from the sidebar to start messaging</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Compact mode layout
          <div className="space-y-4" style={{ maxHeight }}>
            {activeChatUserId || selectedUserId ? (
              <>
                <ScrollArea className="h-[300px] p-4 border rounded-lg">
                  <div className="space-y-4">
                    {chatMessages.length > 0 ? (
                      chatMessages.map((message, i) => {
                        const isCurrentUser = message.senderId === user?.id;
                        return (
                          <div 
                            key={i} 
                            className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                          >
                            <div className={`flex items-start max-w-[70%] ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}>
                              <Avatar className={`h-6 w-6 ${isCurrentUser ? "ml-2" : "mr-2"}`}>
                                <AvatarFallback>
                                  {message.senderName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div 
                                  className={`px-3 py-2 rounded-lg text-sm ${
                                    isCurrentUser 
                                      ? "bg-primary text-primary-foreground rounded-tr-none" 
                                      : "bg-muted rounded-tl-none"
                                  }`}
                                >
                                  {message.content}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDistance(new Date(message.timestamp), new Date(), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="h-32 flex flex-col items-center justify-center text-center text-muted-foreground">
                        <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs">Send a message to start the conversation</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1"
                    disabled={!isConnected}
                  />
                  <Button 
                    type="submit" 
                    size="sm"
                    disabled={!isConnected || !messageText.trim()}
                  >
                    Send
                  </Button>
                </form>
              </>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground border rounded-lg">
                <MessageCircle className="h-12 w-12 mb-2 opacity-30" />
                <p className="text-sm">Select a conversation to start messaging</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}