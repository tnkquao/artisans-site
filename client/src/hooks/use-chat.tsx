import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export interface ChatMessage {
  id?: number;
  senderId: number;
  senderName: string;
  receiverId: number;
  receiverName?: string;
  content: string;
  timestamp: string;
  projectId?: number;
  projectName?: string;
}

interface ChatContact {
  userId: number;
  username: string;
  role: string;
}

interface ChatContextProps {
  messages: ChatMessage[];
  recentContacts: ChatContact[];
  sendMessage: (receiverId: number, content: string, projectId?: number) => boolean;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => void;
}

export const ChatContext = createContext<ChatContextProps | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [recentContacts, setRecentContacts] = useState<ChatContact[]>([]);

  const connect = () => {
    if (socket || !user || isConnecting) return;
    
    try {
      setIsConnecting(true);
      
      // Create WebSocket connection
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const newSocket = new WebSocket(wsUrl);
      
      newSocket.onopen = () => {
        console.log("WebSocket connection established");
        setIsConnected(true);
        setIsConnecting(false);
        
        // Send auth message
        newSocket.send(
          JSON.stringify({
            type: "auth",
            userId: user.id,
            username: user.username,
            role: user.role
          })
        );
      };
      
      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WebSocket message received:", data);
          
          if (data.type === "message") {
            const newMessage: ChatMessage = data.message;
            
            setMessages((prevMessages) => {
              // Avoid duplicates
              if (prevMessages.some(m => 
                  m.senderId === newMessage.senderId && 
                  m.receiverId === newMessage.receiverId && 
                  m.content === newMessage.content && 
                  m.timestamp === newMessage.timestamp)) {
                return prevMessages;
              }
              return [...prevMessages, newMessage];
            });
            
            // If it's a new contact, add to recent contacts
            setRecentContacts((prevContacts) => {
              const contactExists = prevContacts.some(
                (c) => c.userId === newMessage.senderId
              );
              
              if (!contactExists && newMessage.senderId !== user.id) {
                return [
                  ...prevContacts,
                  { 
                    userId: newMessage.senderId, 
                    username: newMessage.senderName,
                    role: "unknown" // Will be updated with correct role later
                  }
                ];
              }
              return prevContacts;
            });
            
          } else if (data.type === "history") {
            setMessages(data.messages);
          } else if (data.type === "contacts") {
            setRecentContacts(data.contacts);
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      };
      
      newSocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
        setIsConnecting(false);
        toast({
          title: "Connection Error",
          description: "Could not connect to chat server. Please try again later.",
          variant: "destructive",
        });
      };
      
      newSocket.onclose = () => {
        console.log("WebSocket connection closed - not automatically reconnecting");
        setIsConnected(false);
        setIsConnecting(false);
        setSocket(null);
        // Don't trigger automatic reconnection on close
      };
      
      setSocket(newSocket);
      
    } catch (error) {
      console.error("Error connecting to WebSocket:", error);
      setIsConnected(false);
      setIsConnecting(false);
      toast({
        title: "Connection Error",
        description: "Could not connect to chat server. Please try again later.",
        variant: "destructive",
      });
    }
  };

  // Modified WebSocket connection logic with reconnection limits
  useEffect(() => {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 3; // Limit to 3 attempts
    let reconnectTimeout: NodeJS.Timeout | null = null;
    
    const attemptConnection = () => {
      // Only connect if needed and below max attempts
      if (user && !socket && !isConnecting && reconnectAttempts < maxReconnectAttempts) {
        console.log(`Attempting chat connection (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
        connect();
        reconnectAttempts++;
      }
    };
    
    // Initial connection attempt
    if (user && !socket && !isConnecting) {
      attemptConnection();
    }
    
    // Cleanup function
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, [user]);  // Only depend on user to prevent excessive reconnects

  const sendMessage = (receiverId: number, content: string, projectId?: number): boolean => {
    if (!socket || !isConnected || !user) {
      toast({
        title: "Cannot Send Message",
        description: "You are not connected to the chat server.",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      // Find the receiver name from contacts
      const receiverContact = recentContacts.find(c => c.userId === receiverId);
      const receiverName = receiverContact?.username || `User ${receiverId}`;
      
      // Create message object
      const message: ChatMessage = {
        senderId: user.id,
        senderName: user.username,
        receiverId,
        receiverName,
        content,
        timestamp: new Date().toISOString(),
        projectId
      };
      
      // Send to server
      socket.send(
        JSON.stringify({
          type: "message",
          message
        })
      );
      
      // Also update the local state
      setMessages(prevMessages => [...prevMessages, message]);
      
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Message Failed",
        description: "Your message could not be sent. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        recentContacts,
        sendMessage,
        isConnected,
        isConnecting,
        connect
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}