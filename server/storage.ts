import { 
  users, type User, type InsertUser,
  projects, type Project, type InsertProject,
  projectTimelines, type ProjectTimeline, type InsertProjectTimeline,
  materials, type Material, type InsertMaterial,
  orders, type Order, type InsertOrder,
  messages, type Message, type InsertMessage,
  serviceRequests, type ServiceRequest, type InsertServiceRequest,
  notifications, type Notification, type InsertNotification,
  suppliers, type Supplier, type InsertSupplier,
  inventory, type Inventory, type InsertInventory,
  projectBids, type ProjectBid, type InsertProjectBid,
  teamInvitations, type TeamInvitation, type InsertTeamInvitation,
  userSkills, type UserSkill, type InsertUserSkill,
  projectTasks, type ProjectTask, type InsertProjectTask,
  taskComments, type TaskComment, type InsertTaskComment,
  siteMaterials, type SiteMaterial, type InsertSiteMaterial,
  serviceRequestBids, type ServiceRequestBid, type InsertServiceRequestBid
} from "@shared/schema";
import { asc, inArray } from "drizzle-orm";
import createMemoryStore from "memorystore";
import session from "express-session";
import { scrypt } from "crypto";
import { promisify } from "util";

const MemoryStore = createMemoryStore(session);

// Define storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string, isCaseSensitive?: boolean): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPoints(userId: number, points: number): Promise<User>;
  updateUserProfile(userId: number, profile: Partial<User>): Promise<User>;
  updateUserPassword(userId: number, password: string): Promise<void>;
  getUserPoints(userId: number): Promise<number>;
  updateUser(userId: number, userData: Partial<User>): Promise<User>;
  deleteUser(userId: number): Promise<void>;
  
  // Site Materials methods
  getSiteMaterials(projectId: number): Promise<SiteMaterial[]>;
  getSiteMaterial(id: number): Promise<SiteMaterial | undefined>;
  createSiteMaterial(material: InsertSiteMaterial): Promise<SiteMaterial>;
  updateSiteMaterial(id: number, material: Partial<SiteMaterial>): Promise<SiteMaterial>;
  deleteSiteMaterial(id: number): Promise<void>;
  
  // Project methods
  getAllProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByClientId(clientId: number): Promise<Project[]>;
  getProjectsByCompanyId(companyId: number): Promise<Project[]>;
  getProjectsByServiceProviderId(providerId: number): Promise<Project[]>; // Get projects where service provider is a team member
  getProjectsBySupplier(supplierId: number): Promise<Project[]>; // Get projects where supplier provides materials
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project>;
  updateProjectDocuments(projectId: number, attachments: any[]): Promise<Project | undefined>;
  getProjectsForBidding(): Promise<Project[]>; // Get all projects available for bidding
  
  // Project Bids methods
  createProjectBid(bid: InsertProjectBid): Promise<ProjectBid>;
  getProjectBid(id: number): Promise<ProjectBid | undefined>;
  getProjectBidsByProject(projectId: number): Promise<ProjectBid[]>;
  getProjectBidsByServiceProvider(serviceProviderId: number): Promise<ProjectBid[]>;
  updateProjectBid(id: number, bid: Partial<ProjectBid>): Promise<ProjectBid>;
  deleteProjectBid(id: number): Promise<void>;
  
  // Project Timeline methods
  getProjectTimelines(projectId: number): Promise<ProjectTimeline[]>;
  createProjectTimeline(timeline: InsertProjectTimeline): Promise<ProjectTimeline>;
  
  // Supplier methods
  getAllSuppliers(): Promise<Supplier[]>;
  getSupplier(id: number): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: Partial<Supplier>): Promise<Supplier>;
  getActiveSuppliers(): Promise<Supplier[]>;
  
  // Material methods
  getAllMaterials(): Promise<Material[]>;
  getMaterial(id: number): Promise<Material | undefined>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: number, material: Partial<Material>): Promise<Material>;
  deleteMaterial(id: number): Promise<void>;
  getMaterialsBySupplier(supplierId: number): Promise<Material[]>;
  getMaterialsByCategory(category: string): Promise<Material[]>;
  
  // Inventory methods
  getAllInventory(): Promise<Inventory[]>;
  getInventoryItem(id: number): Promise<Inventory | undefined>;
  getInventoryByMaterial(materialId: number): Promise<Inventory[]>;
  getInventoryBySupplier(supplierId: number): Promise<Inventory[]>;
  createInventoryItem(item: InsertInventory): Promise<Inventory>;
  updateInventoryItem(id: number, item: Partial<Inventory>): Promise<Inventory>;
  deleteInventoryItemsByMaterial(materialId: number): Promise<void>;
  getAvailableMaterialsWithInventory(): Promise<{material: Material, inventory: Inventory}[]>;
  
  // Order methods
  getAllOrders(): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  getOrdersByClientId(clientId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<Order>): Promise<Order>;
  
  // Message methods
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesByUserId(userId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: number, message: Partial<Message>): Promise<Message>;
  
  // Service Request methods
  getAllServiceRequests(): Promise<ServiceRequest[]>;
  getServiceRequest(id: number): Promise<ServiceRequest | undefined>;
  getServiceRequestsByClientId(clientId: number): Promise<ServiceRequest[]>;
  getServiceRequestsByProviderId(providerId: number): Promise<ServiceRequest[]>;
  getServiceRequestsByProjectId(projectId: number): Promise<ServiceRequest[]>;
  createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest>;
  updateServiceRequest(id: number, request: Partial<ServiceRequest>): Promise<ServiceRequest>;
  getServiceRequestsByStatus(status: string): Promise<ServiceRequest[]>;
  
  // Bid methods
  getAllBids(): Promise<any[]>;
  getBid(id: number): Promise<any | undefined>;
  getBidsByServiceRequest(serviceRequestId: number): Promise<any[]>;
  getBidsByServiceProvider(providerId: number): Promise<any[]>;
  createBid(bid: any): Promise<any>;
  updateBid(id: number, bid: Partial<any>): Promise<any>;
  
  // Notification methods
  getUserNotifications(userId: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: number): Promise<number>;
  getUnreadNotificationsByUserId(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
  getNotification(id: number): Promise<Notification | undefined>;
  markNotificationsAsRead(ids: number[]): Promise<void>;
  deleteNotification(id: number): Promise<void>;
  
  // Team Invitation methods
  createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation>;
  getTeamInvitation(id: number): Promise<TeamInvitation | undefined>;
  getTeamInvitationByToken(token: string): Promise<TeamInvitation | undefined>;
  getTeamInvitationsByEmail(email: string): Promise<TeamInvitation[]>;
  getTeamInvitationsByProject(projectId: number): Promise<TeamInvitation[]>;
  updateTeamInvitation(id: number, data: Partial<TeamInvitation>): Promise<TeamInvitation>;
  deleteTeamInvitation(id: number): Promise<void>;
  
  // User Skills methods
  getUserSkills(userId: number): Promise<UserSkill[]>;
  getUserSkillsBySkill(skill: string): Promise<UserSkill[]>;
  getUsersWithSkill(skill: string): Promise<User[]>;
  getUsersWithSkills(skills: string[]): Promise<User[]>;
  getUserSkill(id: number): Promise<UserSkill | undefined>;
  createUserSkill(skill: InsertUserSkill): Promise<UserSkill>;
  updateUserSkill(id: number, skill: Partial<UserSkill>): Promise<UserSkill>;
  deleteUserSkill(id: number): Promise<void>;
  
  // Project Tasks methods
  getProjectTasks(projectId: number): Promise<ProjectTask[]>;
  getTasksByUser(userId: number): Promise<ProjectTask[]>;
  getTasksByStatus(projectId: number, status: string): Promise<ProjectTask[]>;
  getTasksByPhase(projectId: number, phase: string): Promise<ProjectTask[]>;
  getTasksRequiringSkills(skills: string[]): Promise<ProjectTask[]>;
  getTask(id: number): Promise<ProjectTask | undefined>;
  createTask(task: InsertProjectTask): Promise<ProjectTask>;
  updateTask(id: number, task: Partial<ProjectTask>): Promise<ProjectTask>;
  deleteTask(id: number): Promise<void>;
  getRecommendedUsersForTask(taskId: number): Promise<User[]>;
  
  // Task Comments methods
  getTaskComments(taskId: number): Promise<TaskComment[]>;
  createTaskComment(comment: InsertTaskComment): Promise<TaskComment>;
  deleteTaskComment(id: number): Promise<void>;
  
  // Site Materials methods - these are the full methods, others can be removed
  getSiteMaterials(projectId: number): Promise<SiteMaterial[]>;
  getSiteMaterial(id: number): Promise<SiteMaterial | undefined>;
  getSiteMaterialsByMaterialId(materialId: number): Promise<SiteMaterial[]>;
  createSiteMaterial(siteMaterial: InsertSiteMaterial): Promise<SiteMaterial>;
  updateSiteMaterial(id: number, siteMaterial: Partial<SiteMaterial>): Promise<SiteMaterial>;
  deleteSiteMaterial(id: number): Promise<void>;
  
  // Service Request Bids methods
  getAllServiceRequestBids(): Promise<ServiceRequestBid[]>;
  getServiceRequestBid(id: number): Promise<ServiceRequestBid | undefined>;
  getServiceRequestBidsByServiceRequest(serviceRequestId: number): Promise<ServiceRequestBid[]>;
  getServiceRequestBidsByServiceProvider(serviceProviderId: number): Promise<ServiceRequestBid[]>;
  createServiceRequestBid(bid: InsertServiceRequestBid): Promise<ServiceRequestBid>;
  updateServiceRequestBid(id: number, bid: Partial<ServiceRequestBid>): Promise<ServiceRequestBid>;
  deleteServiceRequestBid(id: number): Promise<void>;
  // Method for admin to select bids to forward to client
  selectBidsForClient(serviceRequestId: number, bidIds: number[]): Promise<ServiceRequestBid[]>;
  // Method for admin to assign a service provider to a request based on their bid
  assignServiceProviderToBid(serviceRequestId: number, bidId: number): Promise<ServiceRequest>;
  // Method to generate anonymous identifiers for bids
  generateAnonymousIdentifier(): string;
  
  // Service Request Status methods
  getServiceRequestsByStatus(status: string): Promise<ServiceRequest[]>;
  getServiceRequestsByProviderId(providerId: number): Promise<ServiceRequest[]>;
  
  // Session store
  sessionStore: ReturnType<typeof createMemoryStore>;
  
  // Password reset
  savePasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<void>;
  getPasswordResetToken(token: string): Promise<{ userId: number, expiresAt: Date } | undefined>;
  deletePasswordResetToken(token: string): Promise<void>;
  updateUserPassword(userId: number, password: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private usersMap: Map<number, User>;
  private projectsMap: Map<number, Project>;
  private projectTimelinesMap: Map<number, ProjectTimeline>;
  private suppliersMap: Map<number, Supplier>;
  private materialsMap: Map<number, Material>;
  private inventoryMap: Map<number, Inventory>;
  private ordersMap: Map<number, Order>;
  private messagesMap: Map<number, Message>;
  private serviceRequestsMap: Map<number, ServiceRequest>;
  private notificationsMap: Map<number, Notification>;
  private projectBidsMap: Map<number, ProjectBid>;
  private teamInvitationsMap: Map<number, TeamInvitation>;
  private userSkillsMap: Map<number, UserSkill>;
  private projectTasksMap: Map<number, ProjectTask>;
  private taskCommentsMap: Map<number, TaskComment>;
  private siteMaterialsMap: Map<number, SiteMaterial>;
  private passwordResetTokensMap: Map<string, { userId: number, expiresAt: Date }>;
  private serviceRequestBidsMap: Map<number, ServiceRequestBid>; // For service request bids
  sessionStore: ReturnType<typeof createMemoryStore>;
  
  private userIdCounter: number;
  private projectIdCounter: number;
  private timelineIdCounter: number;
  private supplierIdCounter: number;
  private materialIdCounter: number;
  private inventoryIdCounter: number;
  private orderIdCounter: number;
  private messageIdCounter: number;
  private serviceRequestIdCounter: number;
  private notificationIdCounter: number;
  private projectBidIdCounter: number;
  private teamInvitationIdCounter: number;
  private userSkillIdCounter: number;
  private projectTaskIdCounter: number;
  private taskCommentIdCounter: number;
  private siteMaterialIdCounter: number;
  private bidIdCounter: number; // For service request bids counter

  constructor() {
    console.log("🚀 Initializing MemStorage - creating in-memory data stores");
    
    try {
      // Initialize all maps first
      this.usersMap = new Map();
      this.projectsMap = new Map();
      this.projectTimelinesMap = new Map();
      this.suppliersMap = new Map();
      this.materialsMap = new Map();
      this.inventoryMap = new Map();
      this.ordersMap = new Map();
      this.messagesMap = new Map();
      this.serviceRequestsMap = new Map();
      this.notificationsMap = new Map();
      this.projectBidsMap = new Map();
      this.teamInvitationsMap = new Map();
      this.userSkillsMap = new Map();
      this.projectTasksMap = new Map();
      this.taskCommentsMap = new Map();
      this.siteMaterialsMap = new Map();
      this.passwordResetTokensMap = new Map();
      this.serviceRequestBidsMap = new Map();
      
      console.log("Maps initialized successfully");
      
      // Initialize counter values
      this.userIdCounter = 1;
      this.projectIdCounter = 1;
      this.timelineIdCounter = 1;
      this.supplierIdCounter = 1;
      this.materialIdCounter = 1;
      this.inventoryIdCounter = 1;
      this.orderIdCounter = 1;
      this.messageIdCounter = 1;
      this.serviceRequestIdCounter = 1;
      this.notificationIdCounter = 1;
      this.projectBidIdCounter = 1;
      this.teamInvitationIdCounter = 1;
      this.userSkillIdCounter = 1;
      this.projectTaskIdCounter = 1;
      this.taskCommentIdCounter = 1;
      this.siteMaterialIdCounter = 1;
      this.bidIdCounter = 1;
      
      console.log("Counters initialized successfully");
      
      // Create session store
      this.sessionStore = new MemoryStore({
        checkPeriod: 86400000 // 24 hours
      });
      
      console.log("Session store created successfully");
      
      console.log("Now setting up initial seed data (synchronously)...");
      
      // Important: immediately seed data to prevent race conditions
      // Handle the user seeding separately using direct sync approach
      
      // Create a direct hash for seeding that we know will work with the comparePasswords function
      const passwordHash = "ea78bcccf63ed393ef98ba4d592e4a812c5818d22acaf9c1e4c55c41543d90efcbcd5a437cf676b5df75d4fc08b51ca449d73926a76adb425d4437c699cdee82.46a21c1553eb1c40";
      
      // Seed users directly in constructor for immediate availability
      console.log("🧑‍🤝‍🧑 Seeding users directly in constructor");
      const users = [
        {
          username: "client1",
          password: passwordHash, // "password"
          email: "client1@example.com",
          fullName: "Client User",
          role: "client",
          phone: "+233501234567",
          serviceType: null,
          businessName: null,
          address: "Accra, Ghana",
          bio: null,
          verificationStatus: null,
          points: 500
        },
        {
          username: "provider1",
          password: passwordHash, // "password"
          email: "provider1@example.com",
          fullName: "Service Provider",
          role: "service_provider",
          phone: "+233502345678",
          serviceType: "contractor",
          businessName: "BuildRight Construction",
          address: "Kumasi, Ghana",
          bio: "Professional building contractor with 10 years of experience",
          verificationStatus: "verified",
          points: 500
        },
        {
          username: "admin",
          password: passwordHash, // "password"
          email: "admin@artisans.com",
          fullName: "Admin User",
          role: "admin",
          phone: "+233503456789",
          serviceType: null,
          businessName: null,
          address: null,
          bio: null,
          verificationStatus: null,
          points: 500
        },
        {
          username: "supplier1",
          password: passwordHash, // "password"
          email: "supplier1@example.com",
          fullName: "Supplier User",
          role: "supplier",
          phone: "+233504567890",
          serviceType: null,
          businessName: "Ghana Building Materials",
          address: "Tema, Ghana",
          bio: "Premium supplier of building materials",
          verificationStatus: "verified",
          points: 500
        }
      ];
      
      // Directly create users in constructor
      for (const user of users) {
        const id = this.userIdCounter++;
        const createdAt = new Date();
        
        // Create complete user object ensuring all required fields are present
        const completeUser = {
          id,
          createdAt,
          username: user.username,
          password: user.password,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          serviceType: user.serviceType,
          businessName: user.businessName,
          phone: user.phone,
          address: user.address,
          bio: user.bio,
          verificationStatus: user.verificationStatus,
          points: user.points
        };
        
        this.usersMap.set(id, completeUser);
        console.log(`✅ Direct seeded user: ${user.username}, ID: ${id}, Role: ${user.role}`);
      }
      
      // Verify user seeding worked
      console.log(`Directly created ${this.usersMap.size} users. User IDs:`, 
                  Array.from(this.usersMap.keys()));
      
      // Seed other data
      console.log("Seeding suppliers...");
      this.seedSuppliers();
      console.log("Seeding materials...");
      this.seedMaterials();
      console.log("Seeding inventory...");
      this.seedInventory();
      console.log("Seeding notifications...");
      this.seedNotifications();
      console.log("Seeding site materials...");
      this.seedSiteMaterials();
      
      // Log total counts when constructor is done
      console.log("🏁 Constructor completed. Data stats:", {
        users: this.usersMap.size,
        suppliers: this.suppliersMap.size,
        materials: this.materialsMap.size,
        inventory: this.inventoryMap.size,
        siteMaterials: this.siteMaterialsMap.size
      });
      
    } catch (error) {
      console.error("❌ CRITICAL ERROR during MemStorage initialization:", error);
    }
  }

  // ===== User methods =====
  async getUser(id: number): Promise<User | undefined> {
    return this.usersMap.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    console.log(`Looking up user by username: ${username}`);
    const allUsers = Array.from(this.usersMap.values());
    console.log("Available users:", allUsers.map(u => ({ username: u.username, id: u.id })));
    
    // Ensure case-insensitive comparison
    const normalizedUsername = username.toLowerCase();
    console.log(`Normalized username for lookup: ${normalizedUsername}`);
    
    // Extra validation to avoid undefined errors
    const foundUser = allUsers.find(user => {
      if (!user || !user.username) {
        console.log("Warning: Found invalid user record", user?.id);
        return false;
      }
      const userLower = user.username.toLowerCase();
      console.log(`Comparing: '${userLower}' with '${normalizedUsername}'`);
      return userLower === normalizedUsername;
    });
    
    console.log(foundUser ? `Found user: ${foundUser.username} (ID: ${foundUser.id})` : 'User not found');
    return foundUser;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    
    return Array.from(this.usersMap.values()).find(
      (user) => user.email && user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.usersMap.values()).filter(user => user.role === role);
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.usersMap.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const createdAt = new Date();
    // Default points to 500 if not provided
    const points = insertUser.points !== undefined ? insertUser.points : 500;
    const user: User = { ...insertUser, id, createdAt, points };
    this.usersMap.set(id, user);
    return user;
  }
  
  async updateUserPoints(userId: number, points: number): Promise<User> {
    const user = this.usersMap.get(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const updatedUser = { ...user, points };
    this.usersMap.set(userId, updatedUser);
    return updatedUser;
  }
  
  async getUserPoints(userId: number): Promise<number> {
    const user = this.usersMap.get(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    return user.points;
  }
  
  async updateUserProfile(userId: number, profile: Partial<User>): Promise<User> {
    const user = this.usersMap.get(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    // Create updated user with new profile data
    const updatedUser = { 
      ...user,
      ...profile,
      // Ensure these fields can't be overridden
      id: user.id,
      username: user.username,
      password: user.password,
      role: user.role,
      points: user.points,
      createdAt: user.createdAt
    };
    
    this.usersMap.set(userId, updatedUser);
    
    // Return the updated user without password
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword as User;
  }
  
  async updateUserPassword(userId: number, password: string): Promise<void> {
    const user = this.usersMap.get(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const updatedUser = { 
      ...user, 
      password,
      // Add a passwordLastChanged field if we want to track this
      passwordLastChanged: new Date().toISOString()
    };
    
    this.usersMap.set(userId, updatedUser);
  }
  
  async updateUser(userId: number, userData: Partial<User>): Promise<User> {
    const user = this.usersMap.get(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const updatedUser = { ...user, ...userData };
    this.usersMap.set(userId, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(userId: number): Promise<void> {
    if (!this.usersMap.has(userId)) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    this.usersMap.delete(userId);
  }
  
  // Service Request Status methods
  async getServiceRequestsByStatus(status: string): Promise<ServiceRequest[]> {
    return Array.from(this.serviceRequestsMap.values()).filter(
      request => request.status === status
    );
  }
  
  async getServiceRequestsByProviderId(providerId: number): Promise<ServiceRequest[]> {
    return Array.from(this.serviceRequestsMap.values()).filter(
      request => request.serviceProviderId === providerId
    );
  }
  
  // Method to generate anonymous identifiers for service providers in bids
  generateAnonymousIdentifier(): string {
    const adjectives = [
      "Skilled", "Experienced", "Professional", "Qualified", "Expert", 
      "Certified", "Reliable", "Trusted", "Dedicated", "Efficient"
    ];
    
    const nouns = [
      "Builder", "Contractor", "Craftsman", "Artisan", "Specialist",
      "Constructor", "Designer", "Developer", "Engineer", "Tradesman"
    ];
    
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(1000 + Math.random() * 9000); // 4-digit number
    
    return `${randomAdjective}${randomNoun}${randomNumber}`;
  }
  
  // Service Request Bids methods
  async getAllServiceRequestBids(): Promise<ServiceRequestBid[]> {
    return Array.from(this.serviceRequestBidsMap.values());
  }
  
  async getServiceRequestBid(id: number): Promise<ServiceRequestBid | undefined> {
    return this.serviceRequestBidsMap.get(id);
  }
  
  async getServiceRequestBidsByServiceRequest(serviceRequestId: number): Promise<ServiceRequestBid[]> {
    return Array.from(this.serviceRequestBidsMap.values()).filter(
      bid => bid.serviceRequestId === serviceRequestId
    );
  }
  
  async getServiceRequestBidsByServiceProvider(providerId: number): Promise<ServiceRequestBid[]> {
    return Array.from(this.serviceRequestBidsMap.values()).filter(
      bid => bid.serviceProviderId === providerId
    );
  }
  
  async createServiceRequestBid(bid: InsertServiceRequestBid): Promise<ServiceRequestBid> {
    const id = this.bidIdCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    
    // Generate an anonymous identifier if not provided
    const anonymousIdentifier = bid.anonymousIdentifier || this.generateAnonymousIdentifier();
    
    // Create the bid with default values for fields not in InsertServiceRequestBid
    const newBid: ServiceRequestBid = { 
      ...bid, 
      id, 
      createdAt, 
      updatedAt,
      anonymousIdentifier,
      selectedByAdmin: false,
      selectedByClient: false,
      adminNotes: null
    };
    
    this.serviceRequestBidsMap.set(id, newBid);
    
    // Deduct points from user
    const user = this.usersMap.get(bid.serviceProviderId);
    if (user) {
      const updatedUser = { 
        ...user, 
        points: user.points - (bid.pointsToUse || 50) 
      };
      this.usersMap.set(user.id, updatedUser);
    }
    
    return newBid;
  }
  
  async updateServiceRequestBid(id: number, bidData: Partial<ServiceRequestBid>): Promise<ServiceRequestBid> {
    const existingBid = this.serviceRequestBidsMap.get(id);
    if (!existingBid) {
      throw new Error(`Bid with id ${id} not found`);
    }
    
    // If points are being changed, update user points
    if (bidData.pointsToUse !== undefined && bidData.pointsToUse !== existingBid.pointsToUse) {
      const pointsDifference = (bidData.pointsToUse || 0) - (existingBid.pointsToUse || 0);
      
      // If points increased, deduct more from user; if decreased, refund user
      const user = this.usersMap.get(existingBid.serviceProviderId);
      if (user) {
        const updatedUser = { 
          ...user, 
          points: user.points - pointsDifference 
        };
        this.usersMap.set(user.id, updatedUser);
      }
    }
    
    const updatedBid = { 
      ...existingBid, 
      ...bidData,
      updatedAt: new Date() 
    };
    
    this.serviceRequestBidsMap.set(id, updatedBid);
    return updatedBid;
  }
  
  async deleteServiceRequestBid(id: number): Promise<void> {
    const bid = this.serviceRequestBidsMap.get(id);
    if (!bid) {
      throw new Error(`Bid with id ${id} not found`);
    }
    
    // Refund points to user
    const user = this.usersMap.get(bid.serviceProviderId);
    if (user) {
      const updatedUser = { 
        ...user, 
        points: user.points + (bid.pointsToUse || 50) 
      };
      this.usersMap.set(user.id, updatedUser);
    }
    
    this.serviceRequestBidsMap.delete(id);
  }
  
  // Method for admin to select bids to forward to client
  async selectBidsForClient(serviceRequestId: number, bidIds: number[]): Promise<ServiceRequestBid[]> {
    const serviceRequest = this.serviceRequestsMap.get(serviceRequestId);
    if (!serviceRequest) {
      throw new Error(`Service request with id ${serviceRequestId} not found`);
    }
    
    // First, reset all bids for this service request to not be selected
    const allBids = await this.getServiceRequestBidsByServiceRequest(serviceRequestId);
    for (const bid of allBids) {
      if (bid.selectedByAdmin) {
        await this.updateServiceRequestBid(bid.id, { selectedByAdmin: false });
      }
    }
    
    // Then, mark the specified bids as selected
    const updatedBids: ServiceRequestBid[] = [];
    for (const bidId of bidIds) {
      const bid = this.serviceRequestBidsMap.get(bidId);
      if (bid && bid.serviceRequestId === serviceRequestId) {
        const updatedBid = await this.updateServiceRequestBid(bidId, { 
          selectedByAdmin: true,
          status: "forwarded_to_client" 
        });
        updatedBids.push(updatedBid);
      }
    }
    
    // Update the service request status
    await this.updateServiceRequest(serviceRequestId, { status: "bids_forwarded" });
    
    return updatedBids;
  }
  
  // For backward compatibility
  async getAllBids(): Promise<any[]> {
    return this.getAllServiceRequestBids();
  }
  
  async getBid(id: number): Promise<any | undefined> {
    return this.getServiceRequestBid(id);
  }
  
  async getBidsByServiceRequest(serviceRequestId: number): Promise<any[]> {
    return this.getServiceRequestBidsByServiceRequest(serviceRequestId);
  }
  
  async getBidsByServiceProvider(providerId: number): Promise<any[]> {
    return this.getServiceRequestBidsByServiceProvider(providerId);
  }
  
  async createBid(bid: any): Promise<any> {
    return this.createServiceRequestBid(bid as InsertServiceRequestBid);
  }
  
  async updateBid(id: number, bid: Partial<any>): Promise<any> {
    return this.updateServiceRequestBid(id, bid as Partial<ServiceRequestBid>);
  }
  
  async deleteBid(id: number): Promise<void> {
    return this.deleteServiceRequestBid(id);
  }

  // ===== Project methods =====
  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projectsMap.values());
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projectsMap.get(id);
  }

  async getProjectsByClientId(clientId: number): Promise<Project[]> {
    return Array.from(this.projectsMap.values()).filter(
      project => project.clientId === clientId
    );
  }

  async getProjectsByCompanyId(companyId: number): Promise<Project[]> {
    return Array.from(this.projectsMap.values()).filter(
      project => project.companyId === companyId
    );
  }
  
  async getProjectsByServiceProviderId(providerId: number): Promise<Project[]> {
    // Find projects where service provider is a team member
    return Array.from(this.projectsMap.values()).filter(project => {
      if (!project.teamMembers || !Array.isArray(project.teamMembers)) {
        return false;
      }
      
      // Find if provider is in team members
      return project.teamMembers.some(member => 
        typeof member === 'object' && 
        member !== null && 
        'userId' in member &&
        member.userId === providerId
      );
    });
  }
  
  async isProjectTeamMember(projectId: number, userId: number): Promise<boolean> {
    const project = await this.getProject(projectId);
    
    if (!project) {
      return false;
    }
    
    // If the user is the client who owns the project
    if (project.clientId === userId) {
      return true;
    }
    
    // If the user is the service provider assigned to the project
    if (project.companyId === userId) {
      return true;
    }
    
    // Check if the user is in the team members array
    if (!project.teamMembers || !Array.isArray(project.teamMembers)) {
      return false;
    }
    
    return project.teamMembers.some(member => 
      typeof member === 'object' && 
      member !== null && 
      'userId' in member &&
      member.userId === userId
    );
  }
  
  async getProjectsBySupplier(supplierId: number): Promise<Project[]> {
    // Find projects where the supplier has provided materials
    // First get all orders by this supplier
    const supplierOrders = Array.from(this.ordersMap.values()).filter(
      order => order.supplierId === supplierId
    );
    
    // Get unique project IDs from these orders
    const projectIds = new Set(
      supplierOrders
        .filter(order => order.projectId !== null && order.projectId !== undefined)
        .map(order => order.projectId as number)
    );
    
    // Return projects matching these IDs
    return Array.from(this.projectsMap.values()).filter(
      project => projectIds.has(project.id)
    );
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.projectIdCounter++;
    const createdAt = new Date();
    const project: Project = { ...insertProject, id, createdAt, progress: 0 };
    this.projectsMap.set(id, project);
    return project;
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<Project> {
    const project = this.projectsMap.get(id);
    if (!project) {
      throw new Error(`Project with id ${id} not found`);
    }
    
    const updatedProject = { ...project, ...updates };
    this.projectsMap.set(id, updatedProject);
    return updatedProject;
  }
  
  async updateProjectDocuments(projectId: number, attachments: any[]): Promise<Project | undefined> {
    const project = this.projectsMap.get(projectId);
    if (!project) {
      return undefined;
    }
    
    const updatedProject = {
      ...project,
      attachments
    };
    
    this.projectsMap.set(projectId, updatedProject);
    return updatedProject;
  }
  
  async getProjectsForBidding(): Promise<Project[]> {
    // Get all projects that are open for bidding
    return Array.from(this.projectsMap.values()).filter(
      project => project.status === 'open_for_bids'
    );
  }
  
  // Project Bid methods
  async createProjectBid(bid: InsertProjectBid): Promise<ProjectBid> {
    const id = this.projectBidIdCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    
    // Before creating the bid, check if user has enough points and deduct them
    const serviceProvider = this.usersMap.get(bid.serviceProviderId);
    if (!serviceProvider) {
      throw new Error(`Service provider with id ${bid.serviceProviderId} not found`);
    }
    
    if (serviceProvider.points < bid.pointsUsed) {
      throw new Error(`Insufficient points. Required: ${bid.pointsUsed}, Available: ${serviceProvider.points}`);
    }
    
    // Deduct points from the service provider
    const updatedPoints = serviceProvider.points - bid.pointsUsed;
    await this.updateUserPoints(bid.serviceProviderId, updatedPoints);
    
    // Create the project bid
    const projectBid: ProjectBid = {
      ...bid,
      id,
      createdAt,
      updatedAt
    };
    
    this.projectBidsMap.set(id, projectBid);
    return projectBid;
  }
  
  async getProjectBid(id: number): Promise<ProjectBid | undefined> {
    return this.projectBidsMap.get(id);
  }
  
  async getProjectBidsByProject(projectId: number): Promise<ProjectBid[]> {
    return Array.from(this.projectBidsMap.values())
      .filter(bid => bid.projectId === projectId)
      .sort((a, b) => b.bidAmount - a.bidAmount); // Sort by highest bid amount
  }
  
  async getProjectBidsByServiceProvider(serviceProviderId: number): Promise<ProjectBid[]> {
    return Array.from(this.projectBidsMap.values())
      .filter(bid => bid.serviceProviderId === serviceProviderId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Sort by most recent
  }
  
  async updateProjectBid(id: number, updates: Partial<ProjectBid>): Promise<ProjectBid> {
    const bid = this.projectBidsMap.get(id);
    if (!bid) {
      throw new Error(`Project bid with id ${id} not found`);
    }
    
    const updatedBid = { 
      ...bid, 
      ...updates,
      updatedAt: new Date()
    };
    
    this.projectBidsMap.set(id, updatedBid);
    return updatedBid;
  }
  
  async deleteProjectBid(id: number): Promise<void> {
    const bid = this.projectBidsMap.get(id);
    if (!bid) {
      throw new Error(`Project bid with id ${id} not found`);
    }
    
    // When a bid is deleted, return the points to the service provider
    const serviceProvider = this.usersMap.get(bid.serviceProviderId);
    if (serviceProvider) {
      const updatedPoints = serviceProvider.points + bid.pointsUsed;
      await this.updateUserPoints(bid.serviceProviderId, updatedPoints);
    }
    
    this.projectBidsMap.delete(id);
  }

  // ===== Project Timeline methods =====
  async getProjectTimelines(projectId: number): Promise<ProjectTimeline[]> {
    return Array.from(this.projectTimelinesMap.values())
      .filter(timeline => timeline.projectId === projectId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async createProjectTimeline(insertTimeline: InsertProjectTimeline): Promise<ProjectTimeline> {
    const id = this.timelineIdCounter++;
    const createdAt = new Date();
    const timeline: ProjectTimeline = { ...insertTimeline, id, createdAt };
    this.projectTimelinesMap.set(id, timeline);
    return timeline;
  }

  // ===== Material methods =====
  async getAllMaterials(): Promise<Material[]> {
    return Array.from(this.materialsMap.values());
  }

  async getMaterial(id: number): Promise<Material | undefined> {
    return this.materialsMap.get(id);
  }

  async createMaterial(insertMaterial: InsertMaterial): Promise<Material> {
    const id = this.materialIdCounter++;
    const createdAt = new Date();
    const material: Material = { ...insertMaterial, id, createdAt };
    this.materialsMap.set(id, material);
    return material;
  }
  
  async getMaterialsBySupplier(supplierId: number): Promise<Material[]> {
    return Array.from(this.materialsMap.values()).filter(
      material => material.supplierId === supplierId
    );
  }

  async getMaterialsByCategory(category: string): Promise<Material[]> {
    return Array.from(this.materialsMap.values()).filter(
      material => material.category === category
    );
  }
  
  async updateMaterial(id: number, updates: Partial<Material>): Promise<Material> {
    const material = this.materialsMap.get(id);
    if (!material) {
      throw new Error(`Material with ID ${id} not found`);
    }
    
    const updatedMaterial = {
      ...material,
      ...updates,
      updatedAt: new Date()
    };
    
    this.materialsMap.set(id, updatedMaterial);
    return updatedMaterial;
  }
  
  async deleteMaterial(id: number): Promise<void> {
    const material = this.materialsMap.get(id);
    if (!material) {
      throw new Error(`Material with ID ${id} not found`);
    }
    
    this.materialsMap.delete(id);
  }
  
  async deleteInventoryItemsByMaterial(materialId: number): Promise<void> {
    // Find all inventory items for this material
    const inventoryItems = Array.from(this.inventoryMap.values())
      .filter(item => item.materialId === materialId);
    
    // Delete each inventory item
    for (const item of inventoryItems) {
      this.inventoryMap.delete(item.id);
    }
  }
  
  // ===== Supplier methods =====
  async getAllSuppliers(): Promise<Supplier[]> {
    return Array.from(this.suppliersMap.values());
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    return this.suppliersMap.get(id);
  }

  async createSupplier(insertSupplier: InsertSupplier): Promise<Supplier> {
    const id = this.supplierIdCounter++;
    const createdAt = new Date();
    const supplier: Supplier = { ...insertSupplier, id, createdAt };
    this.suppliersMap.set(id, supplier);
    return supplier;
  }

  async updateSupplier(id: number, updates: Partial<Supplier>): Promise<Supplier> {
    const supplier = this.suppliersMap.get(id);
    if (!supplier) {
      throw new Error(`Supplier with id ${id} not found`);
    }
    
    const updatedSupplier = { ...supplier, ...updates };
    this.suppliersMap.set(id, updatedSupplier);
    return updatedSupplier;
  }

  async getActiveSuppliers(): Promise<Supplier[]> {
    return Array.from(this.suppliersMap.values()).filter(supplier => supplier.active);
  }
  
  // ===== Inventory methods =====
  async getAllInventory(): Promise<Inventory[]> {
    return Array.from(this.inventoryMap.values());
  }

  async getInventoryItem(id: number): Promise<Inventory | undefined> {
    return this.inventoryMap.get(id);
  }

  async getInventoryByMaterial(materialId: number): Promise<Inventory[]> {
    return Array.from(this.inventoryMap.values()).filter(
      inventory => inventory.materialId === materialId
    );
  }

  async getInventoryBySupplier(supplierId: number): Promise<Inventory[]> {
    return Array.from(this.inventoryMap.values()).filter(
      inventory => inventory.supplierId === supplierId
    );
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    const id = this.inventoryIdCounter++;
    const createdAt = new Date();
    const lastUpdated = new Date();
    const inventory: Inventory = { 
      ...item, 
      id, 
      createdAt,
      lastUpdated,
      status: item.status || "in_stock"
    };
    this.inventoryMap.set(id, inventory);
    return inventory;
  }

  async updateInventoryItem(id: number, item: Partial<Inventory>): Promise<Inventory> {
    const inventory = this.inventoryMap.get(id);
    if (!inventory) {
      throw new Error(`Inventory item with id ${id} not found`);
    }
    
    const updatedInventory = { 
      ...inventory, 
      ...item,
      lastUpdated: new Date() 
    };
    this.inventoryMap.set(id, updatedInventory);
    return updatedInventory;
  }

  async getAvailableMaterialsWithInventory(): Promise<{material: Material, inventory: Inventory}[]> {
    const result: {material: Material, inventory: Inventory}[] = [];
    
    // Get all materials with inventory data
    for (const material of this.materialsMap.values()) {
      const inventoryItems = await this.getInventoryByMaterial(material.id);
      if (inventoryItems.length > 0) {
        // Find the inventory with the most stock
        const inventory = inventoryItems.reduce((prev, current) => 
          (prev.quantityAvailable > current.quantityAvailable) ? prev : current
        );
        
        if (inventory.status !== "discontinued" && inventory.quantityAvailable > 0) {
          result.push({ material, inventory });
        }
      }
    }
    
    return result;
  }

  // ===== Order methods =====
  async getAllOrders(): Promise<Order[]> {
    return Array.from(this.ordersMap.values());
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.ordersMap.get(id);
  }

  async getOrdersByClientId(clientId: number): Promise<Order[]> {
    return Array.from(this.ordersMap.values())
      .filter(order => order.clientId === clientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = this.orderIdCounter++;
    const createdAt = new Date();
    const order: Order = { ...insertOrder, id, createdAt };
    this.ordersMap.set(id, order);
    return order;
  }

  async updateOrder(id: number, updates: Partial<Order>): Promise<Order> {
    const order = this.ordersMap.get(id);
    if (!order) {
      throw new Error(`Order with id ${id} not found`);
    }
    
    const updatedOrder = { ...order, ...updates };
    this.ordersMap.set(id, updatedOrder);
    return updatedOrder;
  }

  // ===== Message methods =====
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messagesMap.get(id);
  }

  async getMessagesByUserId(userId: number): Promise<Message[]> {
    return Array.from(this.messagesMap.values())
      .filter(message => message.senderId === userId || message.receiverId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const createdAt = new Date();
    const message: Message = { ...insertMessage, id, read: false, createdAt };
    this.messagesMap.set(id, message);
    return message;
  }

  async updateMessage(id: number, updates: Partial<Message>): Promise<Message> {
    const message = this.messagesMap.get(id);
    if (!message) {
      throw new Error(`Message with id ${id} not found`);
    }
    
    const updatedMessage = { ...message, ...updates };
    this.messagesMap.set(id, updatedMessage);
    return updatedMessage;
  }
  
  // ===== Team Invitation methods =====
  async createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation> {
    const id = this.teamInvitationIdCounter++;
    const createdAt = new Date();
    
    // Using Postgres to handle the dates via defaultNow() in schema.ts
    // No need to set expiresAt here anymore
    const newInvitation: TeamInvitation = {
      ...invitation,
      id,
      createdAt,
      expiresAt: createdAt, // This will be overridden by the database default
      inviteStatus: 'pending',
      acceptedAt: null
    };
    
    this.teamInvitationsMap.set(id, newInvitation);
    return newInvitation;
  }
  
  async getTeamInvitation(id: number): Promise<TeamInvitation | undefined> {
    return this.teamInvitationsMap.get(id);
  }
  
  async getTeamInvitationByToken(token: string): Promise<TeamInvitation | undefined> {
    return Array.from(this.teamInvitationsMap.values()).find(
      invitation => invitation.inviteToken === token
    );
  }
  
  async getTeamInvitationsByEmail(email: string): Promise<TeamInvitation[]> {
    return Array.from(this.teamInvitationsMap.values())
      .filter(invitation => invitation.inviteEmail.toLowerCase() === email.toLowerCase())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async getTeamInvitationsByProject(projectId: number): Promise<TeamInvitation[]> {
    return Array.from(this.teamInvitationsMap.values())
      .filter(invitation => invitation.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async updateTeamInvitation(id: number, updates: Partial<TeamInvitation>): Promise<TeamInvitation> {
    const invitation = this.teamInvitationsMap.get(id);
    if (!invitation) {
      throw new Error(`Team invitation with id ${id} not found`);
    }
    
    const updatedInvitation = { ...invitation, ...updates };
    this.teamInvitationsMap.set(id, updatedInvitation);
    return updatedInvitation;
  }
  
  async deleteTeamInvitation(id: number): Promise<void> {
    if (!this.teamInvitationsMap.has(id)) {
      throw new Error(`Team invitation with id ${id} not found`);
    }
    this.teamInvitationsMap.delete(id);
  }

  // Seed initial users
  private async seedUsers() {
    console.log("⭐️ Starting user seeding process...");
    try {
      // Create a direct hash for seeding that we know will work with the comparePasswords function
      // Using a known hash format for the password "password" with a fixed salt
      const passwordHash = "ea78bcccf63ed393ef98ba4d592e4a812c5818d22acaf9c1e4c55c41543d90efcbcd5a437cf676b5df75d4fc08b51ca449d73926a76adb425d4437c699cdee82.46a21c1553eb1c40";
      console.log("Using fixed password hash for all test accounts");
      
      // Pre-check if users are already seeded
      const existingCount = this.usersMap.size;
      console.log(`Current user count before seeding: ${existingCount}`);
      
      const users = [
        {
          username: "client1",
          password: passwordHash, // "password"
          email: "client1@example.com",
          fullName: "Client User",
          role: "client",
          phone: "+233501234567",
          serviceType: null,
          businessName: null,
          address: "Accra, Ghana",
          bio: null,
          verificationStatus: null,
          points: 500
        },
        {
          username: "provider1",
          password: passwordHash, // "password"
          email: "provider1@example.com",
          fullName: "Service Provider",
          role: "service_provider",
          phone: "+233502345678",
          serviceType: "contractor",
          businessName: "BuildRight Construction",
          address: "Kumasi, Ghana",
          bio: "Professional building contractor with 10 years of experience",
          verificationStatus: "verified",
          points: 500
        },
        {
          username: "admin",
          password: passwordHash, // "password"
          email: "admin@artisans.com",
          fullName: "Admin User",
          role: "admin",
          phone: "+233503456789",
          serviceType: null,
          businessName: null,
          address: null,
          bio: null,
          verificationStatus: null,
          points: 500
        },
        {
          username: "supplier1",
          password: passwordHash, // "password"
          email: "supplier1@example.com",
          fullName: "Supplier User",
          role: "supplier",
          phone: "+233504567890",
          serviceType: null,
          businessName: "Ghana Building Materials",
          address: "Tema, Ghana",
          bio: "Premium supplier of building materials",
          verificationStatus: "verified",
          points: 500
        }
      ];

      console.log(`Seeding ${users.length} test users...`);
      
      // We need to ensure that fields that are required in the schema actually have values
      const createdUsers = [];
      for (const user of users) {
        const id = this.userIdCounter++;
        const createdAt = new Date();
        
        // Make sure required fields are not undefined
        const fullUser: User = {
          id,
          createdAt,
          username: user.username,
          password: user.password,
          email: user.email,
          fullName: user.fullName,
          role: user.role || "client", // Default to client if no role provided
          serviceType: user.serviceType,
          businessName: user.businessName,
          phone: user.phone,
          address: user.address,
          bio: user.bio,
          verificationStatus: user.verificationStatus,
          points: user.points || 500, // Default to 500 points if not specified
        };
        
        // Add to storage
        this.usersMap.set(id, fullUser);
        createdUsers.push(fullUser);
        console.log(`✅ Seeded user: ${user.username}, ID: ${id}, Role: ${user.role}`);
      }
      
      // Double check with the usersMap
      const allUsers = Array.from(this.usersMap.values());
      console.log(`User map now contains ${allUsers.length} users`);
      
      // Log all users for debugging
      console.log("All seeded users:", allUsers.map(u => ({ 
        id: u.id, 
        username: u.username, 
        role: u.role,
        points: u.points
      })));
      
      return createdUsers;
    } catch (error) {
      console.error("❌ ERROR during user seeding:", error);
      throw error;
    }
  }

  // ===== Service Request methods =====
  async getAllServiceRequests(): Promise<ServiceRequest[]> {
    return Array.from(this.serviceRequestsMap.values());
  }

  async getServiceRequest(id: number): Promise<ServiceRequest | undefined> {
    return this.serviceRequestsMap.get(id);
  }

  async getServiceRequestsByClientId(clientId: number): Promise<ServiceRequest[]> {
    return Array.from(this.serviceRequestsMap.values())
      .filter(request => request.clientId === clientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async getServiceRequestsByProviderId(providerId: number): Promise<ServiceRequest[]> {
    return Array.from(this.serviceRequestsMap.values())
      .filter(request => request.assignedServiceProviderId === providerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async getServiceRequestsByProjectId(projectId: number): Promise<ServiceRequest[]> {
    return Array.from(this.serviceRequestsMap.values())
      .filter(request => request.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createServiceRequest(insertRequest: InsertServiceRequest): Promise<ServiceRequest> {
    const id = this.serviceRequestIdCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const request: ServiceRequest = { 
      ...insertRequest, 
      id, 
      createdAt, 
      updatedAt,
      status: "pending",
      adminNotes: null,
      assignedServiceProviderId: null
    };
    this.serviceRequestsMap.set(id, request);
    return request;
  }

  async updateServiceRequest(id: number, updates: Partial<ServiceRequest>): Promise<ServiceRequest> {
    const request = this.serviceRequestsMap.get(id);
    if (!request) {
      throw new Error(`Service request with id ${id} not found`);
    }
    
    const updatedRequest = { 
      ...request, 
      ...updates,
      updatedAt: new Date() 
    };
    this.serviceRequestsMap.set(id, updatedRequest);
    return updatedRequest;
  }
  
  // ===== Notification methods =====
  async getUserNotifications(userId: number): Promise<Notification[]> {
    return Array.from(this.notificationsMap.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async getUnreadNotificationCount(userId: number): Promise<number> {
    return Array.from(this.notificationsMap.values())
      .filter(notification => notification.userId === userId && !notification.read)
      .length;
  }
  
  async getUnreadNotificationsByUserId(userId: number): Promise<Notification[]> {
    return Array.from(this.notificationsMap.values())
      .filter(notification => notification.userId === userId && !notification.read)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = this.notificationIdCounter++;
    const createdAt = new Date();
    const newNotification: Notification = {
      ...notification,
      id,
      createdAt,
      read: false
    };
    this.notificationsMap.set(id, newNotification);
    return newNotification;
  }
  
  async markNotificationAsRead(id: number): Promise<Notification> {
    const notification = this.notificationsMap.get(id);
    if (!notification) {
      throw new Error(`Notification with id ${id} not found`);
    }
    
    const updatedNotification = { ...notification, read: true };
    this.notificationsMap.set(id, updatedNotification);
    return updatedNotification;
  }
  
  async markAllNotificationsAsRead(userId: number): Promise<void> {
    const userNotifications = Array.from(this.notificationsMap.values())
      .filter(notification => notification.userId === userId);
      
    userNotifications.forEach(notification => {
      const updated = { ...notification, read: true };
      this.notificationsMap.set(notification.id, updated);
    });
  }
  
  async markNotificationsAsRead(ids: number[]): Promise<void> {
    if (!ids || ids.length === 0) {
      return;
    }
    
    for (const id of ids) {
      const notification = this.notificationsMap.get(id);
      if (notification) {
        const updated = { ...notification, read: true };
        this.notificationsMap.set(id, updated);
      }
    }
  }
  
  async deleteNotification(id: number): Promise<void> {
    if (!this.notificationsMap.has(id)) {
      throw new Error(`Notification with id ${id} not found`);
    }
    this.notificationsMap.delete(id);
  }

  // Seed initial suppliers
  private seedSuppliers() {
    const suppliers = [
      {
        name: "Ghana Cement Ltd",
        description: "Leading supplier of cement and concrete products in Ghana",
        contactEmail: "info@ghanacement.com",
        contactPhone: "+233501234567",
        address: "Industrial Area, Tema, Ghana",
        apiEndpoint: "https://api.ghanacement.com/inventory",
        apiKey: null,
        active: true
      },
      {
        name: "Accra Steel Works",
        description: "Premium steel and metal products for construction",
        contactEmail: "sales@accrasteel.com",
        contactPhone: "+233502345678",
        address: "North Industrial Area, Accra, Ghana",
        apiEndpoint: "https://api.accrasteel.com/inventory",
        apiKey: null,
        active: true
      },
      {
        name: "Kumasi Building Materials",
        description: "Complete range of building materials for all construction needs",
        contactEmail: "info@kumasibuilding.com",
        contactPhone: "+233503456789",
        address: "Adum, Kumasi, Ghana",
        apiEndpoint: "https://api.kumasibuilding.com/inventory",
        apiKey: null,
        active: true
      }
    ];
    
    suppliers.forEach(supplier => {
      const id = this.supplierIdCounter++;
      const createdAt = new Date();
      const newSupplier: Supplier = { ...supplier, id, createdAt };
      this.suppliersMap.set(id, newSupplier);
    });
  }

  // Seed initial materials data
  private seedMaterials() {
    // First get supplier IDs if any exist
    const supplierIds = Array.from(this.suppliersMap.keys());
    
    // Default supplier ID if none exist
    const defaultSupplierId = 4;
    
    const materials = [
      // Foundation and Structure Materials
      {
        name: "GHACEM Super Strong Cement",
        description: "Premium Ghanaian Portland cement for durable foundations",
        category: "foundation",
        subcategory: "cement",
        price: 7500, // ₵75.00
        unit: "bag",
        inStock: true,
        rating: 4.8,
        reviewCount: 158,
        brand: "GHACEM",
        featured: true,
        imageUrl: "https://images.unsplash.com/photo-1517911478175-54994cca56d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 0 ? supplierIds[0] : defaultSupplierId,
        supplierProductId: "GCL-PC-001"
      },
      {
        name: "GHACEM Tough Mix Ready Concrete",
        description: "Pre-mixed concrete for rapid construction",
        category: "foundation",
        subcategory: "concrete",
        price: 95000, // ₵950.00
        unit: "cubic meter",
        inStock: true,
        rating: 4.6,
        reviewCount: 72,
        brand: "GHACEM",
        featured: true,
        imageUrl: "https://images.unsplash.com/photo-1578824576668-a439f3d4caee?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 0 ? supplierIds[0] : defaultSupplierId,
        supplierProductId: "GCL-TM-002"
      },
      {
        name: "Imported River Sand",
        description: "High-quality washed river sand for concrete mixing",
        category: "foundation",
        subcategory: "sand",
        price: 12000, // ₵120.00
        unit: "ton",
        inStock: true,
        rating: 4.5,
        reviewCount: 63,
        brand: "GoldCoast Materials",
        featured: false,
        imageUrl: "https://images.unsplash.com/photo-1629451391581-07a845ca1fe2?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 0 ? supplierIds[0] : defaultSupplierId,
        supplierProductId: "GCL-RS-003"
      },
      {
        name: "Kumasi Crushed Stone Aggregate",
        description: "Local crushed stone for concrete production",
        category: "foundation",
        subcategory: "aggregate",
        price: 18000, // ₵180.00
        unit: "ton",
        inStock: true,
        rating: 4.3,
        reviewCount: 48,
        brand: "Kumasi Building Materials",
        featured: false,
        imageUrl: "https://images.unsplash.com/photo-1589137555072-5b31d530a59f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 2 ? supplierIds[2] : defaultSupplierId,
        supplierProductId: "KBM-CS-001"
      },
      {
        name: "Accra Steel Rebars (12mm)",
        description: "High-tensile steel reinforcement bars made in Ghana",
        category: "structure",
        subcategory: "rebars",
        price: 8800, // ₵88.00
        unit: "piece",
        inStock: true,
        rating: 4.9,
        reviewCount: 112,
        brand: "Accra Steel Works",
        featured: true,
        imageUrl: "https://images.unsplash.com/photo-1601553288939-422e14a5567b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 1 ? supplierIds[1] : defaultSupplierId,
        supplierProductId: "ASW-SR-120"
      },
      {
        name: "Accra Steel Binding Wire",
        description: "Galvanized wire for securing rebars",
        category: "structure",
        subcategory: "binding materials",
        price: 4500, // ₵45.00
        unit: "roll",
        inStock: true,
        rating: 4.6,
        reviewCount: 85,
        brand: "Accra Steel Works",
        featured: false,
        imageUrl: "https://images.unsplash.com/photo-1517420879524-86d64ac2f339?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 1 ? supplierIds[1] : defaultSupplierId,
        supplierProductId: "ASW-BW-121"
      },
      
      // Building Blocks and Bricks
      {
        name: "Ghana Standard Concrete Blocks (6-inch)",
        description: "Locally manufactured concrete blocks for walls",
        category: "structure",
        subcategory: "concrete blocks",
        price: 1200, // ₵12.00
        unit: "block",
        inStock: true,
        rating: 4.7,
        reviewCount: 223,
        brand: "GoldCoast Materials",
        featured: true,
        imageUrl: "https://images.unsplash.com/photo-1643166407676-0a196c21fc42?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 0 ? supplierIds[0] : defaultSupplierId,
        supplierProductId: "GCL-CB-004"
      },
      {
        name: "Ghana Standard Concrete Blocks (4-inch)",
        description: "Locally manufactured concrete blocks for internal walls",
        category: "structure",
        subcategory: "concrete blocks",
        price: 950, // ₵9.50
        unit: "block",
        inStock: true,
        rating: 4.6,
        reviewCount: 189,
        brand: "GoldCoast Materials",
        featured: false,
        imageUrl: "https://images.unsplash.com/photo-1575516092328-ebd4c7a1d8d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 0 ? supplierIds[0] : defaultSupplierId,
        supplierProductId: "GCL-CB-005"
      },
      {
        name: "Clay Bricks (Suame Made)",
        description: "Traditional clay bricks from Suame artisans",
        category: "structure",
        subcategory: "bricks",
        price: 850, // ₵8.50
        unit: "brick",
        inStock: true,
        rating: 4.8,
        reviewCount: 157,
        brand: "Kumasi Building Materials",
        featured: true,
        imageUrl: "https://images.unsplash.com/photo-1530824395616-b1ec7fecb4d6?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 2 ? supplierIds[2] : defaultSupplierId,
        supplierProductId: "KBM-CB-002"
      },
      
      // Roofing Materials
      {
        name: "Aluminum Roofing Sheets",
        description: "Corrugated aluminum sheets for durable roofing",
        category: "roofing",
        subcategory: "metal roofing",
        price: 18500, // ₵185.00
        unit: "sheet",
        inStock: true,
        rating: 4.5,
        reviewCount: 142,
        brand: "Accra Steel Works",
        featured: true,
        imageUrl: "https://images.unsplash.com/photo-1621323357303-c7817cc00190?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 1 ? supplierIds[1] : defaultSupplierId,
        supplierProductId: "ASW-RS-122"
      },
      {
        name: "Tema-Made Roof Trusses",
        description: "Pre-fabricated wooden roof trusses from Tema",
        category: "roofing",
        subcategory: "structural elements",
        price: 65000, // ₵650.00
        unit: "set",
        inStock: true,
        rating: 4.9,
        reviewCount: 95,
        brand: "Accra Steel Works",
        featured: true,
        imageUrl: "https://images.unsplash.com/photo-1598520106830-8c30c82c7c5b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 1 ? supplierIds[1] : defaultSupplierId,
        supplierProductId: "ASW-RT-123"
      },
      {
        name: "Ghana Rubber Waterproof Membrane",
        description: "Waterproofing membrane for flat roofs",
        category: "roofing",
        subcategory: "waterproofing",
        price: 32000, // ₵320.00
        unit: "roll",
        inStock: true,
        rating: 4.3,
        reviewCount: 78,
        brand: "GoldCoast Materials",
        featured: false,
        imageUrl: "https://images.unsplash.com/photo-1621323395504-d99ddd6d52e1?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 0 ? supplierIds[0] : defaultSupplierId,
        supplierProductId: "GCL-WM-006"
      },
      
      // Electrical Materials
      {
        name: "Ghana-Made PVC Electrical Conduit",
        description: "Flame-resistant PVC conduit for electrical wiring",
        category: "electrical",
        subcategory: "conduit",
        price: 3200, // ₵32.00
        unit: "meter",
        inStock: true,
        rating: 4.7,
        reviewCount: 102,
        brand: "Kumasi Building Materials",
        featured: true,
        imageUrl: "https://images.unsplash.com/photo-1576669801731-7e081ebf258d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 2 ? supplierIds[2] : defaultSupplierId,
        supplierProductId: "KBM-EC-203"
      },
      {
        name: "Accra Electrical Cable (2.5mm)",
        description: "High-quality copper wiring for residential use",
        category: "electrical",
        price: 7500, // ₵75.00
        unit: "roll",
        imageUrl: "https://images.unsplash.com/photo-1565165501803-f74669053c48?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 1 ? supplierIds[1] : null,
        supplierProductId: "ASW-EC-124"
      },
      {
        name: "Ghana-Standard Circuit Breakers",
        description: "Circuit breakers meeting Ghana Standards Authority specifications",
        category: "electrical",
        price: 4500, // ₵45.00
        unit: "piece",
        imageUrl: "https://images.unsplash.com/photo-1656226654690-bb35a9c7a0e1?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 2 ? supplierIds[2] : null,
        supplierProductId: "KBM-CB-204"
      },
      
      // Plumbing Materials
      {
        name: "Local PVC Water Pipes (1-inch)",
        description: "Ghana-made PVC pipes for water systems",
        category: "plumbing",
        subcategory: "pipes",
        price: 4000, // ₵40.00
        unit: "length",
        inStock: true,
        rating: 4.5,
        reviewCount: 128,
        brand: "Kumasi Building Materials",
        featured: true,
        imageUrl: "https://images.unsplash.com/photo-1534951009808-766178b47a4f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 2 ? supplierIds[2] : defaultSupplierId,
        supplierProductId: "KBM-PV-205"
      },
      {
        name: "Imported Copper Pipes",
        description: "Premium copper piping for hot water systems",
        category: "plumbing",
        price: 9500, // ₵95.00
        unit: "meter",
        imageUrl: "https://images.unsplash.com/photo-1582297649032-66503e0c5bfa?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 1 ? supplierIds[1] : null,
        supplierProductId: "ASW-CP-387"
      },
      {
        name: "Kumasi-Made Toilet Fixture Set",
        description: "Complete toilet fixture set produced in Kumasi",
        category: "plumbing",
        price: 125000, // ₵1,250.00
        unit: "set",
        imageUrl: "https://images.unsplash.com/photo-1573288880946-184c1df86e69?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 2 ? supplierIds[2] : null,
        supplierProductId: "KBM-TF-206"
      },
      
      // Insulation and Weatherproofing
      {
        name: "Ghana Thermal Insulation Panels",
        description: "Locally produced thermal insulation for energy efficiency",
        category: "insulation",
        price: 18000, // ₵180.00
        unit: "panel",
        imageUrl: "https://images.unsplash.com/photo-1620416264288-b67f9dcb3a11?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 0 ? supplierIds[0] : null,
        supplierProductId: "GCL-IP-045"
      },
      {
        name: "Accra Weather Sealant",
        description: "Silicone-based sealant for windows and doors",
        category: "insulation",
        price: 3500, // ₵35.00
        unit: "tube",
        imageUrl: "https://images.unsplash.com/photo-1615869124483-3dd7080a0c2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 1 ? supplierIds[1] : null,
        supplierProductId: "ASW-WS-125"
      },
      
      // Interior Finishing
      {
        name: "Ghanaian Drywall Sheets",
        description: "Locally produced gypsum board for interior walls",
        category: "interior",
        price: 14500, // ₵145.00
        unit: "sheet",
        imageUrl: "https://images.unsplash.com/photo-1604709473230-a2d85b594f7a?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 2 ? supplierIds[2] : null,
        supplierProductId: "KBM-DS-091"
      },
      {
        name: "Ghana-Made Ceiling Tiles",
        description: "Decorative PVC ceiling tiles manufactured in Ghana",
        category: "interior",
        price: 4000, // ₵40.00
        unit: "tile",
        imageUrl: "https://images.unsplash.com/photo-1605799207334-b8e4eea3aa1a?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 0 ? supplierIds[0] : null,
        supplierProductId: "GCL-CT-007"
      },
      {
        name: "Local Wood Wall Paneling",
        description: "Hardwood paneling from sustainable Ghanaian forests",
        category: "interior",
        price: 22000, // ₵220.00
        unit: "panel",
        imageUrl: "https://images.unsplash.com/photo-1583608564770-91134aaf32a8?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 2 ? supplierIds[2] : null,
        supplierProductId: "KBM-WP-207"
      },
      
      // Flooring Materials
      {
        name: "Ghanaian Ceramic Floor Tiles",
        description: "Premium ceramic tiles produced in Ghana",
        category: "flooring",
        price: 8500, // ₵85.00
        unit: "square meter",
        imageUrl: "https://images.unsplash.com/photo-1594844311013-9238ed92f06f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 0 ? supplierIds[0] : null,
        supplierProductId: "GCL-FT-008"
      },
      {
        name: "Kumasi Handcrafted Terrazzo",
        description: "Traditional terrazzo flooring mixed on-site",
        category: "flooring",
        price: 18000, // ₵180.00
        unit: "square meter",
        imageUrl: "https://images.unsplash.com/photo-1649779146883-5f68ea51fbe5?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 2 ? supplierIds[2] : null,
        supplierProductId: "KBM-TZ-208"
      },
      {
        name: "Local Hardwood Flooring",
        description: "Premium hardwood flooring from Ghanaian forests",
        category: "flooring",
        price: 25000, // ₵250.00
        unit: "square meter",
        imageUrl: "https://images.unsplash.com/photo-1622140827953-9ded1f7f5b9e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 2 ? supplierIds[2] : null,
        supplierProductId: "KBM-HF-209"
      },
      
      // Painting and Finishing
      {
        name: "Ghana-Made Interior Paint",
        description: "Low-VOC interior paint manufactured in Ghana",
        category: "painting",
        price: 12000, // ₵120.00
        unit: "gallon",
        imageUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 0 ? supplierIds[0] : null,
        supplierProductId: "GCL-IP-009"
      },
      {
        name: "Exterior Weather-Resistant Paint",
        description: "Durable exterior paint formulated for Ghana's climate",
        category: "painting",
        price: 15000, // ₵150.00
        unit: "gallon",
        imageUrl: "https://images.unsplash.com/photo-1562259929-b4e1fd8aae64?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        supplierId: supplierIds.length > 0 ? supplierIds[0] : null,
        supplierProductId: "GCL-EP-010"
      }
    ];

    materials.forEach(material => {
      const id = this.materialIdCounter++;
      const createdAt = new Date();
      const newMaterial: Material = { ...material, id, createdAt };
      this.materialsMap.set(id, newMaterial);
    });
  }
  
  // Seed inventory data based on materials
  private seedInventory() {
    // Get all materials and their supplier IDs
    const materials = Array.from(this.materialsMap.values());
    
    materials.forEach(material => {
      // Create inventory record for each material
      const id = this.inventoryIdCounter++;
      const createdAt = new Date();
      const lastUpdated = new Date();
      
      // Generate a random quantity between 5 and 100
      const quantityAvailable = Math.floor(Math.random() * 95) + 5;
      
      // Set status based on quantity
      let status = "in_stock";
      if (quantityAvailable <= 10) {
        status = "low_stock";
      } else if (quantityAvailable === 0) {
        status = "out_of_stock";
      }
      
      // Create expected restock date for low stock items
      const expectedRestockDate = status === "low_stock" 
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        : null;
      
      const inventory: Inventory = {
        id,
        materialId: material.id,
        supplierId: material.supplierId || 0,
        quantityAvailable,
        lastUpdated,
        expectedRestockDate,
        minOrderQuantity: 1,
        reservedQuantity: 0,
        status,
        createdAt
      };
      
      this.inventoryMap.set(id, inventory);
    });
  }
  
  private seedNotifications() {
    const notifications = [
      // Client notifications
      {
        userId: 1, // Client user
        title: "Project Update",
        message: "The foundation for your project has been completed",
        type: "project",
        priority: "normal",
        relatedItemId: 1,
        relatedItemType: "project",
        emoji: "🏗️",
        actionUrl: "/projects/1"
      },
      {
        userId: 1, // Client user
        title: "Order Shipped",
        message: "Your material order #ORD8721 has been shipped",
        type: "order",
        priority: "normal",
        relatedItemId: 1,
        relatedItemType: "order",
        emoji: "🚚",
        actionUrl: "/orders"
      },
      {
        userId: 1, // Client user
        title: "Payment Reminder",
        message: "Your next project payment is due in 5 days",
        type: "payment",
        priority: "high",
        relatedItemId: 1,
        relatedItemType: "project",
        emoji: "💰",
        actionUrl: "/projects/1"
      },
      {
        userId: 1, // Client user
        title: "New Message",
        message: "You have a new message from admin regarding your project",
        type: "message",
        priority: "normal",
        relatedItemId: 1,
        relatedItemType: "message",
        emoji: "💬",
        actionUrl: "/messages"
      },
      
      // Admin notifications
      {
        userId: 3, // Admin user
        title: "New Service Request",
        message: "A client has submitted a new service request for plumbing",
        type: "service_request",
        priority: "high",
        relatedItemId: 1,
        relatedItemType: "service_request",
        emoji: "🔧",
        actionUrl: "/service-requests"
      },
      {
        userId: 3, // Admin user
        title: "Project Milestone Reached",
        message: "Project 'Modern Residence' reached 50% completion",
        type: "project",
        priority: "normal",
        relatedItemId: 1,
        relatedItemType: "project",
        emoji: "✅",
        actionUrl: "/projects/1"
      },
      {
        userId: 3, // Admin user
        title: "Material Shortage Alert",
        message: "Low inventory alert for Premium Cement (5 bags remaining)",
        type: "inventory",
        priority: "high",
        relatedItemId: 1,
        relatedItemType: "material",
        emoji: "⚠️",
        actionUrl: "/materials"
      },
      
      // Service provider notifications
      {
        userId: 2, // Service provider user
        title: "New Assignment",
        message: "You have been assigned to a new plumbing project",
        type: "assignment",
        priority: "high",
        relatedItemId: 1,
        relatedItemType: "service_request",
        emoji: "📋",
        actionUrl: "/service-requests"
      },
      {
        userId: 2, // Service provider user
        title: "Schedule Update",
        message: "Your on-site inspection has been rescheduled for tomorrow",
        type: "schedule",
        priority: "normal",
        relatedItemId: 1,
        relatedItemType: "project",
        emoji: "📅",
        actionUrl: "/provider-dashboard"
      }
    ];
    
    notifications.forEach(notification => {
      const id = this.notificationIdCounter++;
      const createdAt = new Date();
      const newNotification = {
        ...notification,
        id,
        createdAt,
        read: false
      };
      this.notificationsMap.set(id, newNotification);
    });
  }
  
  // ===== Site Materials methods =====
  async getSiteMaterials(projectId: number): Promise<SiteMaterial[]> {
    return Array.from(this.siteMaterialsMap.values())
      .filter(material => material.projectId === projectId)
      .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
  }
  
  async getSiteMaterial(id: number): Promise<SiteMaterial | undefined> {
    return this.siteMaterialsMap.get(id);
  }
  
  async getSiteMaterialsByMaterialId(materialId: number): Promise<SiteMaterial[]> {
    return Array.from(this.siteMaterialsMap.values())
      .filter(material => material.materialId === materialId);
  }
  
  async createSiteMaterial(siteMaterial: InsertSiteMaterial): Promise<SiteMaterial> {
    const id = this.siteMaterialIdCounter++;
    const createdAt = new Date();
    const lastUpdated = new Date();
    
    const newSiteMaterial: SiteMaterial = {
      ...siteMaterial,
      id,
      createdAt,
      lastUpdated
    };
    
    this.siteMaterialsMap.set(id, newSiteMaterial);
    return newSiteMaterial;
  }
  
  async updateSiteMaterial(id: number, updates: Partial<SiteMaterial>): Promise<SiteMaterial> {
    const siteMaterial = this.siteMaterialsMap.get(id);
    if (!siteMaterial) {
      throw new Error(`Site material with id ${id} not found`);
    }
    
    const updatedSiteMaterial = { 
      ...siteMaterial, 
      ...updates,
      lastUpdated: new Date() 
    };
    
    this.siteMaterialsMap.set(id, updatedSiteMaterial);
    return updatedSiteMaterial;
  }
  
  async deleteSiteMaterial(id: number): Promise<void> {
    if (!this.siteMaterialsMap.has(id)) {
      throw new Error(`Site material with id ${id} not found`);
    }
    
    this.siteMaterialsMap.delete(id);
  }
  
  // ===== Password Reset methods =====
  async savePasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    // Store the token with userId and expiration
    this.passwordResetTokensMap.set(token, { userId, expiresAt });
    console.log(`Password reset token created for user ID: ${userId}, expires at: ${expiresAt}`);
  }
  
  async getPasswordResetToken(token: string): Promise<{ userId: number, expiresAt: Date } | undefined> {
    return this.passwordResetTokensMap.get(token);
  }
  
  async deletePasswordResetToken(token: string): Promise<void> {
    this.passwordResetTokensMap.delete(token);
    console.log(`Password reset token deleted`);
  }
  
  async updateUserPassword(userId: number, password: string): Promise<void> {
    const user = this.usersMap.get(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Update the user's password
    const updatedUser = { ...user, password };
    this.usersMap.set(userId, updatedUser);
    console.log(`Password updated for user ID: ${userId}`);
  }
}

// Use DatabaseStorage instead of MemStorage for persistance
import { db } from "./db"; 
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { eq, gt, or, and, desc, count, sql } from "drizzle-orm";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: ReturnType<typeof PostgresSessionStore>;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }
  
  // Password Reset methods for DatabaseStorage
  async savePasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    // Use a direct SQL query for password reset tokens
    // In a production app, you should create a proper schema table for these
    await db.execute(sql`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (${userId}, ${token}, ${expiresAt})
      ON CONFLICT (token) DO UPDATE
      SET user_id = ${userId}, expires_at = ${expiresAt}
    `);
    console.log(`Password reset token created for user ID: ${userId}`);
  }
  
  async getPasswordResetToken(token: string): Promise<{ userId: number, expiresAt: Date } | undefined> {
    try {
      const result = await db.execute(sql`
        SELECT user_id, expires_at FROM password_reset_tokens
        WHERE token = ${token}
      `);
      
      if (result.length === 0) {
        return undefined;
      }
      
      return {
        userId: result[0].user_id,
        expiresAt: result[0].expires_at
      };
    } catch (error) {
      console.error('Error getting password reset token:', error);
      return undefined;
    }
  }
  
  async deletePasswordResetToken(token: string): Promise<void> {
    await db.execute(sql`
      DELETE FROM password_reset_tokens
      WHERE token = ${token}
    `);
  }
  
  async updateUserPassword(userId: number, password: string): Promise<void> {
    await db
      .update(users)
      .set({ password })
      .where(eq(users.id, userId));
  }
  
  // Notification methods for database implementation
  async getUnreadNotificationsByUserId(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ))
      .orderBy(desc(notifications.createdAt));
  }
  
  async markNotificationsAsRead(ids: number[]): Promise<void> {
    if (!ids || ids.length === 0) {
      return;
    }
    
    await db
      .update(notifications)
      .set({ read: true })
      .where(sql`id = ANY(${ids})`);
  }
  
  // Team Invitation methods
  async createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation> {
    console.log("Creating invitation with data:", JSON.stringify(invitation, null, 2));
    
    // Set expiration date - SQL-safe approach
    // Use a direct SQL query with raw SQL to avoid type issues
    const expiresAtSql = sql`NOW() + INTERVAL '7 days'`;
    
    try {
      const query = sql`
        INSERT INTO team_invitations (
          project_id, 
          invited_by_user_id, 
          invite_email, 
          role, 
          invite_token, 
          permissions, 
          invite_status,
          expires_at
        ) 
        VALUES (
          ${invitation.projectId}, 
          ${invitation.invitedByUserId}, 
          ${invitation.inviteEmail}, 
          ${invitation.role}, 
          ${invitation.inviteToken}, 
          ${invitation.permissions || []}, 
          'pending', 
          ${expiresAtSql}
        )
        RETURNING *;
      `;
      
      console.log("Executing direct SQL query to create invitation");
      const result = await db.execute(query);
      console.log("SQL query result:", result);
      
      if (result.length > 0) {
        return result[0] as TeamInvitation;
      } else {
        throw new Error("Failed to create invitation - no rows returned");
      }
    } catch (error) {
      console.error("SQL error creating invitation:", error);
      throw error;
    }
  }
  
  async getTeamInvitation(id: number): Promise<TeamInvitation | undefined> {
    const [invitation] = await db.select().from(teamInvitations).where(eq(teamInvitations.id, id));
    return invitation || undefined;
  }
  
  async getTeamInvitationByToken(token: string): Promise<TeamInvitation | undefined> {
    const [invitation] = await db.select().from(teamInvitations).where(eq(teamInvitations.inviteToken, token));
    return invitation || undefined;
  }
  
  async getTeamInvitationsByEmail(email: string): Promise<TeamInvitation[]> {
    return db.select().from(teamInvitations)
      .where(eq(teamInvitations.inviteEmail, email))
      .orderBy(desc(teamInvitations.createdAt));
  }
  
  async getTeamInvitationsByProject(projectId: number): Promise<TeamInvitation[]> {
    return db.select().from(teamInvitations)
      .where(eq(teamInvitations.projectId, projectId))
      .orderBy(desc(teamInvitations.createdAt));
  }
  
  async updateTeamInvitation(id: number, data: Partial<TeamInvitation>): Promise<TeamInvitation> {
    const [updatedInvitation] = await db.update(teamInvitations)
      .set(data)
      .where(eq(teamInvitations.id, id))
      .returning();
    
    if (!updatedInvitation) {
      throw new Error(`Team invitation with id ${id} not found`);
    }
    
    return updatedInvitation;
  }
  
  async deleteTeamInvitation(id: number): Promise<void> {
    await db.delete(teamInvitations).where(eq(teamInvitations.id, id));
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      console.log(`Looking up user by username: ${username}`);
      
      // First try case-insensitive version (more reliable)
      console.log("Using case-insensitive query by default");
      const result = await db.execute(sql`
        SELECT * FROM users 
        WHERE LOWER(username) = LOWER(${username})
      `);
      
      // Check result and rows length - this will now work for both PostgreSQL and other databases
      if (result?.rows && result.rows.length > 0) {
        console.log(`Found user with case-insensitive query: ${result.rows[0].username} (ID: ${result.rows[0].id})`);
        return result.rows[0] as User;
      }
      
      // For backward compatibility, if the rows property doesn't work, try using result directly
      if (Array.isArray(result) && result.length > 0) {
        console.log(`Found user with case-insensitive array result: ${result[0].username} (ID: ${result[0].id})`);
        return result[0] as User;
      }
      
      // If we got this far, no user was found
      console.log(`User not found with case-insensitive query: ${username}`);
      return undefined;
      
    } catch (error) {
      console.error(`Error in getUserByUsername for ${username}:`, error);
      
      // Fallback to standard query as a last resort
      try {
        console.log("Falling back to standard equality query");
        const [standardResult] = await db.select().from(users).where(eq(users.username, username));
        
        if (standardResult) {
          console.log(`Found user with standard query: ${standardResult.username} (ID: ${standardResult.id})`);
          return standardResult;
        }
        
        return undefined;
      } catch (finalError) {
        console.error("All query attempts failed:", finalError);
        return undefined;
      }
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    
    try {
      console.log(`Looking up user by email: ${email}`);
      
      // First try case-insensitive version (more reliable)
      console.log("Using case-insensitive email query by default");
      const result = await db.execute(sql`
        SELECT * FROM users 
        WHERE LOWER(email) = LOWER(${email})
      `);
      
      // Check result and rows length - this will now work for both PostgreSQL and other databases
      if (result?.rows && result.rows.length > 0) {
        console.log(`Found user with case-insensitive email query: ${result.rows[0].username} (ID: ${result.rows[0].id})`);
        return result.rows[0] as User;
      }
      
      // For backward compatibility, if the rows property doesn't work, try using result directly
      if (Array.isArray(result) && result.length > 0) {
        console.log(`Found user with case-insensitive array result: ${result[0].username} (ID: ${result[0].id})`);
        return result[0] as User;
      }
      
      // If we got this far, no user was found
      console.log(`User not found with case-insensitive email query: ${email}`);
      return undefined;
      
    } catch (error) {
      console.error(`Error in getUserByEmail for ${email}:`, error);
      
      // Fallback to standard query as a last resort
      try {
        console.log("Falling back to standard equality email query");
        const [standardResult] = await db.select().from(users).where(eq(users.email, email));
        
        if (standardResult) {
          console.log(`Found user with standard email query: ${standardResult.username} (ID: ${standardResult.id})`);
          return standardResult;
        }
        
        return undefined;
      } catch (finalError) {
        console.error("All email query attempts failed:", finalError);
        return undefined;
      }
    }
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }
  
  // Get service providers filtered by service type
  async getServiceProviders(serviceType?: string): Promise<User[]> {
    let query = db
      .select()
      .from(users)
      .where(eq(users.role, "service_provider"));
      
    // If service type is provided, filter by it
    if (serviceType) {
      query = query.where(sql`LOWER(${users.serviceType}) = LOWER(${serviceType}) OR ${users.serviceType} IS NULL`);
    }
    
    return await query;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserPoints(userId: number, points: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ points })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUserPoints(userId: number): Promise<number> {
    const [user] = await db
      .select({ points: users.points })
      .from(users)
      .where(eq(users.id, userId));
    return user?.points || 0;
  }
  
  async updateUserProfile(userId: number, profile: Partial<User>): Promise<User> {
    const updatableFields: Partial<User> = {};
    
    // Only allow updating specific fields
    if (profile.fullName !== undefined) updatableFields.fullName = profile.fullName;
    if (profile.email !== undefined) updatableFields.email = profile.email;
    if (profile.phone !== undefined) updatableFields.phone = profile.phone;
    if (profile.address !== undefined) updatableFields.address = profile.address;
    if (profile.bio !== undefined) updatableFields.bio = profile.bio;
    
    const [updatedUser] = await db
      .update(users)
      .set(updatableFields)
      .where(eq(users.id, userId))
      .returning();
      
    return updatedUser;
  }
  
  async updateUserPassword(userId: number, password: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        password,
        // We could add this field to the schema if we want to track password changes
        // passwordLastChanged: new Date().toISOString()
      })
      .where(eq(users.id, userId));
  }
  
  async updateUser(userId: number, userData: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        ...userData,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
      
    if (!updatedUser) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    return updatedUser;
  }
  
  async deleteUser(userId: number): Promise<void> {
    await db
      .delete(users)
      .where(eq(users.id, userId));
  }
  
  // Project methods
  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjectsByClientId(clientId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.clientId, clientId));
  }

  async getProjectsByCompanyId(companyId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.companyId, companyId));
  }
  
  async getProjectsByServiceProviderId(providerId: number): Promise<Project[]> {
    try {
      // We need to query for projects that have this service provider in their teamMembers array
      // This requires a JSON path query in PostgreSQL
      const result = await db.execute(sql`
        SELECT * FROM projects
        WHERE EXISTS (
          SELECT 1 FROM jsonb_array_elements(team_members) as team_member
          WHERE team_member->>'userId' = ${providerId.toString()}
        )
      `);
      
      return result.rows as Project[];
    } catch (error) {
      console.error("Error in getProjectsByServiceProviderId:", error);
      return [];
    }
  }
  
  async isProjectTeamMember(projectId: number, userId: number): Promise<boolean> {
    try {
      // First check if the user is the client who owns the project or the company assigned to it
      const project = await this.getProject(projectId);
      
      if (!project) {
        return false;
      }
      
      // If the user is the client who owns the project
      if (project.clientId === userId) {
        return true;
      }
      
      // If the user is the service provider assigned to the project
      if (project.companyId === userId) {
        return true;
      }
      
      // Check if the user is in the team members array using JSON query
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT 1 FROM projects
          WHERE id = ${projectId}
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(team_members) as team_member
            WHERE team_member->>'userId' = ${userId.toString()}
          )
        ) as is_member
      `);
      
      return result.rows[0]?.is_member === true;
    } catch (error) {
      console.error("Error in isProjectTeamMember:", error);
      return false;
    }
  }
  
  async getProjectsBySupplier(supplierId: number): Promise<Project[]> {
    try {
      // This query finds all projects that have orders from this supplier
      const result = await db.execute(sql`
        SELECT DISTINCT p.* FROM projects p
        JOIN orders o ON p.id = o.project_id
        WHERE o.supplier_id = ${supplierId}
      `);
      
      return result.rows as Project[];
    } catch (error) {
      console.error("Error in getProjectsBySupplier:", error);
      return [];
    }
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<Project> {
    const [project] = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();
    return project;
  }
  
  async updateProjectDocuments(projectId: number, attachments: any[]): Promise<Project | undefined> {
    // First get the project to make sure it exists
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));
    
    if (!project) {
      return undefined;
    }
    
    // Update the project with the new attachments
    const [updatedProject] = await db
      .update(projects)
      .set({ attachments })
      .where(eq(projects.id, projectId))
      .returning();
    
    return updatedProject;
  }

  async getProjectsForBidding(): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.status, 'open_for_bids'));
  }
  
  // Project Bids methods
  async createProjectBid(bid: InsertProjectBid): Promise<ProjectBid> {
    const [projectBid] = await db.insert(projectBids).values(bid).returning();
    return projectBid;
  }

  async getProjectBid(id: number): Promise<ProjectBid | undefined> {
    const [bid] = await db.select().from(projectBids).where(eq(projectBids.id, id));
    return bid || undefined;
  }

  async getProjectBidsByProject(projectId: number): Promise<ProjectBid[]> {
    return await db
      .select()
      .from(projectBids)
      .where(eq(projectBids.projectId, projectId));
  }

  async getProjectBidsByServiceProvider(serviceProviderId: number): Promise<ProjectBid[]> {
    return await db
      .select()
      .from(projectBids)
      .where(eq(projectBids.serviceProviderId, serviceProviderId));
  }

  async updateProjectBid(id: number, updates: Partial<ProjectBid>): Promise<ProjectBid> {
    const [bid] = await db
      .update(projectBids)
      .set(updates)
      .where(eq(projectBids.id, id))
      .returning();
    return bid;
  }

  async deleteProjectBid(id: number): Promise<void> {
    await db.delete(projectBids).where(eq(projectBids.id, id));
  }
  
  // Project Timeline methods
  async getProjectTimelines(projectId: number): Promise<ProjectTimeline[]> {
    return await db
      .select()
      .from(projectTimelines)
      .where(eq(projectTimelines.projectId, projectId));
  }

  async createProjectTimeline(timeline: InsertProjectTimeline): Promise<ProjectTimeline> {
    const [entry] = await db.insert(projectTimelines).values(timeline).returning();
    return entry;
  }
  
  // Supplier methods
  async getAllSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers);
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier || undefined;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [newSupplier] = await db.insert(suppliers).values(supplier).returning();
    return newSupplier;
  }

  async updateSupplier(id: number, updates: Partial<Supplier>): Promise<Supplier> {
    const [supplier] = await db
      .update(suppliers)
      .set(updates)
      .where(eq(suppliers.id, id))
      .returning();
    return supplier;
  }

  async getActiveSuppliers(): Promise<Supplier[]> {
    return await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.status, 'active'));
  }
  
  // Material methods
  async getAllMaterials(): Promise<Material[]> {
    return await db.select().from(materials);
  }

  async getMaterial(id: number): Promise<Material | undefined> {
    const [material] = await db.select().from(materials).where(eq(materials.id, id));
    return material || undefined;
  }

  async createMaterial(material: InsertMaterial): Promise<Material> {
    const [newMaterial] = await db.insert(materials).values(material).returning();
    return newMaterial;
  }

  async updateMaterial(id: number, updates: Partial<Material>): Promise<Material> {
    const [material] = await db
      .update(materials)
      .set(updates)
      .where(eq(materials.id, id))
      .returning();
    return material;
  }

  async deleteMaterial(id: number): Promise<void> {
    await db.delete(materials).where(eq(materials.id, id));
  }

  async getMaterialsBySupplier(supplierId: number): Promise<Material[]> {
    return await db
      .select()
      .from(materials)
      .where(eq(materials.supplierId, supplierId));
  }

  async getMaterialsByCategory(category: string): Promise<Material[]> {
    return await db
      .select()
      .from(materials)
      .where(eq(materials.category, category));
  }
  
  // Inventory methods
  async getAllInventory(): Promise<Inventory[]> {
    return await db.select().from(inventory);
  }

  async getInventoryItem(id: number): Promise<Inventory | undefined> {
    const [item] = await db.select().from(inventory).where(eq(inventory.id, id));
    return item || undefined;
  }

  async getInventoryByMaterial(materialId: number): Promise<Inventory[]> {
    return await db
      .select()
      .from(inventory)
      .where(eq(inventory.materialId, materialId));
  }

  async getInventoryBySupplier(supplierId: number): Promise<Inventory[]> {
    return await db
      .select()
      .from(inventory)
      .where(eq(inventory.supplierId, supplierId));
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    const [newItem] = await db.insert(inventory).values(item).returning();
    return newItem;
  }

  async updateInventoryItem(id: number, updates: Partial<Inventory>): Promise<Inventory> {
    const [item] = await db
      .update(inventory)
      .set(updates)
      .where(eq(inventory.id, id))
      .returning();
    return item;
  }

  async deleteInventoryItemsByMaterial(materialId: number): Promise<void> {
    await db.delete(inventory).where(eq(inventory.materialId, materialId));
  }

  async getAvailableMaterialsWithInventory(): Promise<{material: Material, inventory: Inventory}[]> {
    const result: {material: Material, inventory: Inventory}[] = [];
    
    const materialWithInventory = await db
      .select()
      .from(materials)
      .innerJoin(inventory, eq(materials.id, inventory.materialId))
      .where(gt(inventory.quantity, 0));
    
    for (const row of materialWithInventory) {
      result.push({
        material: row.materials,
        inventory: row.inventory
      });
    }
    
    return result;
  }
  
  // Order methods
  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders);
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrdersByClientId(clientId: number): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.clientId, clientId));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrder(id: number, updates: Partial<Order>): Promise<Order> {
    const [order] = await db
      .update(orders)
      .set(updates)
      .where(eq(orders.id, id))
      .returning();
    return order;
  }
  
  // Message methods
  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async getMessagesByUserId(userId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        or(
          eq(messages.senderId, userId),
          eq(messages.receiverId, userId)
        )
      );
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async updateMessage(id: number, updates: Partial<Message>): Promise<Message> {
    const [message] = await db
      .update(messages)
      .set(updates)
      .where(eq(messages.id, id))
      .returning();
    return message;
  }
  
  // Service Request methods
  async getAllServiceRequests(): Promise<ServiceRequest[]> {
    return await db.select().from(serviceRequests);
  }

  async getServiceRequest(id: number): Promise<ServiceRequest | undefined> {
    const [request] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id));
    return request || undefined;
  }

  async getServiceRequestsByClientId(clientId: number): Promise<ServiceRequest[]> {
    return await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.clientId, clientId));
  }

  async getServiceRequestsByProjectId(projectId: number): Promise<ServiceRequest[]> {
    return await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.projectId, projectId));
  }

  async createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest> {
    const [newRequest] = await db.insert(serviceRequests).values(request).returning();
    return newRequest;
  }

  async updateServiceRequest(id: number, updates: Partial<ServiceRequest>): Promise<ServiceRequest> {
    const [request] = await db
      .update(serviceRequests)
      .set(updates)
      .where(eq(serviceRequests.id, id))
      .returning();
    return request;
  }
  
  async getServiceRequestsByStatus(status: string): Promise<ServiceRequest[]> {
    // If status contains multiple options separated by commas, filter by any matching status
    if (status.includes(',')) {
      const statusOptions = status.split(',').map(s => s.trim());
      return await db
        .select()
        .from(serviceRequests)
        .where(inArray(serviceRequests.status, statusOptions));
    }
    
    return await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.status, status));
  }
  
  // Notification methods
  async getUserNotifications(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ));
    
    return result[0]?.count || 0;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationAsRead(id: number): Promise<Notification> {
    const [notification] = await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id))
      .returning();
    return notification;
  }
  
  async getNotification(id: number): Promise<Notification | undefined> {
    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id));
    return notification;
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId));
  }

  async deleteNotification(id: number): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }
  
  // ===== User Skills methods =====
  async getUserSkills(userId: number): Promise<UserSkill[]> {
    return db.select().from(userSkills)
      .where(eq(userSkills.userId, userId))
      .orderBy(desc(userSkills.proficiencyLevel));
  }
  
  async getUserSkillsBySkill(skill: string): Promise<UserSkill[]> {
    return db.select().from(userSkills)
      .where(sql`LOWER(${userSkills.skill}) = LOWER(${skill})`)
      .orderBy(desc(userSkills.proficiencyLevel));
  }
  
  async getUsersWithSkill(skill: string): Promise<User[]> {
    const results = await db.select({
      user: users
    })
    .from(users)
    .innerJoin(
      userSkills,
      and(
        eq(users.id, userSkills.userId),
        sql`LOWER(${userSkills.skill}) = LOWER(${skill})`
      )
    );
    
    return results.map(r => r.user);
  }
  
  async getUsersWithSkills(skills: string[]): Promise<User[]> {
    if (!skills.length) return [];
    
    const lowerCaseSkills = skills.map(skill => skill.toLowerCase());
    
    // This query finds users who have ALL the required skills
    const results = await db.select({
      user: users,
      skillCount: sql<number>`COUNT(DISTINCT LOWER(${userSkills.skill}))`
    })
    .from(users)
    .innerJoin(
      userSkills,
      eq(users.id, userSkills.userId)
    )
    .where(
      sql`LOWER(${userSkills.skill}) IN (${sql.join(lowerCaseSkills, sql`, `)})`
    )
    .groupBy(users.id)
    .having(sql`COUNT(DISTINCT LOWER(${userSkills.skill})) = ${lowerCaseSkills.length}`);
    
    return results.map(r => r.user);
  }
  
  async getUserSkill(id: number): Promise<UserSkill | undefined> {
    const [skill] = await db.select().from(userSkills).where(eq(userSkills.id, id));
    return skill || undefined;
  }
  
  async createUserSkill(skill: InsertUserSkill): Promise<UserSkill> {
    const now = new Date();
    const [newSkill] = await db.insert(userSkills).values({
      ...skill,
      createdAt: now,
      updatedAt: now
    }).returning();
    
    return newSkill;
  }
  
  async updateUserSkill(id: number, data: Partial<UserSkill>): Promise<UserSkill> {
    const [updatedSkill] = await db.update(userSkills)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(userSkills.id, id))
      .returning();
    
    if (!updatedSkill) {
      throw new Error(`User skill with id ${id} not found`);
    }
    
    return updatedSkill;
  }
  
  async deleteUserSkill(id: number): Promise<void> {
    await db.delete(userSkills).where(eq(userSkills.id, id));
  }
  
  // ===== Project Tasks methods =====
  async getProjectTasks(projectId: number): Promise<ProjectTask[]> {
    return db.select().from(projectTasks)
      .where(eq(projectTasks.projectId, projectId))
      .orderBy(
        // Sort by status
        sql`CASE 
          WHEN ${projectTasks.status} = 'in_progress' THEN 1 
          WHEN ${projectTasks.status} = 'pending' THEN 2 
          WHEN ${projectTasks.status} = 'blocked' THEN 3 
          WHEN ${projectTasks.status} = 'completed' THEN 4 
          ELSE 5 
        END`,
        // Then by priority
        sql`CASE 
          WHEN ${projectTasks.priority} = 'critical' THEN 1 
          WHEN ${projectTasks.priority} = 'high' THEN 2 
          WHEN ${projectTasks.priority} = 'medium' THEN 3 
          WHEN ${projectTasks.priority} = 'low' THEN 4 
          ELSE 5 
        END`,
        // Then by due date (ascending)
        asc(projectTasks.dueDate)
      );
  }
  
  async getTasksByUser(userId: number): Promise<ProjectTask[]> {
    return db.select().from(projectTasks)
      .where(eq(projectTasks.assignedToId, userId))
      .orderBy(
        // Sort by status
        sql`CASE 
          WHEN ${projectTasks.status} = 'in_progress' THEN 1 
          WHEN ${projectTasks.status} = 'pending' THEN 2 
          WHEN ${projectTasks.status} = 'blocked' THEN 3 
          WHEN ${projectTasks.status} = 'completed' THEN 4 
          ELSE 5 
        END`,
        // Then by due date (ascending)
        asc(projectTasks.dueDate),
        // Then by creation date (descending)
        desc(projectTasks.createdAt)
      );
  }
  
  async getTasksByStatus(projectId: number, status: string): Promise<ProjectTask[]> {
    return db.select().from(projectTasks)
      .where(
        and(
          eq(projectTasks.projectId, projectId),
          eq(projectTasks.status, status)
        )
      )
      .orderBy(
        // Sort by priority
        sql`CASE 
          WHEN ${projectTasks.priority} = 'critical' THEN 1 
          WHEN ${projectTasks.priority} = 'high' THEN 2 
          WHEN ${projectTasks.priority} = 'medium' THEN 3 
          WHEN ${projectTasks.priority} = 'low' THEN 4 
          ELSE 5 
        END`,
        // Then by due date (ascending)
        asc(projectTasks.dueDate)
      );
  }
  
  async getTasksByPhase(projectId: number, phase: string): Promise<ProjectTask[]> {
    return db.select().from(projectTasks)
      .where(
        and(
          eq(projectTasks.projectId, projectId),
          eq(projectTasks.constructionPhase, phase)
        )
      )
      .orderBy(asc(projectTasks.createdAt));
  }
  
  async getTasksRequiringSkills(skills: string[]): Promise<ProjectTask[]> {
    if (!skills.length) return [];
    
    const lowerCaseSkills = skills.map(skill => skill.toLowerCase());
    
    // Query for tasks where any of the required skills match
    // Note: This relies on PostgreSQL's JSONB containment operators
    return db.select().from(projectTasks)
      .where(
        sql`EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(${projectTasks.requiredSkills}::jsonb) as skill
          WHERE LOWER(skill::text) IN (${sql.join(lowerCaseSkills, sql`, `)})
        )`
      );
  }
  
  async getTask(id: number): Promise<ProjectTask | undefined> {
    const [task] = await db.select().from(projectTasks).where(eq(projectTasks.id, id));
    return task || undefined;
  }
  
  async createTask(task: InsertProjectTask): Promise<ProjectTask> {
    const now = new Date();
    const [newTask] = await db.insert(projectTasks).values({
      ...task,
      createdAt: now,
      updatedAt: now
    }).returning();
    
    // Create notification for assigned user if present
    if (task.assignedToId) {
      const project = await this.getProject(task.projectId);
      if (project) {
        await this.createNotification({
          userId: task.assignedToId,
          type: "task_assigned",
          title: "New Task Assigned",
          message: `You have been assigned to task "${task.title}" in project "${project.name}"`,
          linkUrl: `/projects/${project.id}/tasks/${newTask.id}`,
          isRead: false,
          priority: "medium",
        });
      }
    }
    
    return newTask;
  }
  
  async updateTask(id: number, data: Partial<ProjectTask>): Promise<ProjectTask> {
    const task = await this.getTask(id);
    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }
    
    // Special handling for status change to "completed"
    if (data.status === "completed" && task.status !== "completed") {
      data.completedAt = new Date();
    }
    
    const [updatedTask] = await db.update(projectTasks)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(projectTasks.id, id))
      .returning();
    
    // Create notifications for status changes
    if (data.status && data.status !== task.status) {
      // Notify the assigner if there is one
      if (task.assignedByUserId) {
        await this.createNotification({
          userId: task.assignedByUserId,
          type: "task_status_change",
          title: "Task Status Changed",
          message: `Task "${task.title}" status changed to ${data.status}`,
          linkUrl: `/projects/${task.projectId}/tasks/${id}`,
          isRead: false,
          priority: "low",
        });
      }
      
      // If task is completed, update project progress
      if (data.status === "completed") {
        const project = await this.getProject(task.projectId);
        if (project) {
          // Get all tasks for this project
          const allTasks = await this.getProjectTasks(task.projectId);
          const totalTasks = allTasks.length;
          const completedTasks = allTasks.filter(t => t.status === "completed").length;
          
          // Calculate new progress percentage
          const newProgress = Math.round((completedTasks / totalTasks) * 100);
          
          // Update project progress
          await this.updateProject(task.projectId, { progress: newProgress });
        }
      }
    }
    
    // If task was reassigned, notify the new assignee
    if (data.assignedToId && data.assignedToId !== task.assignedToId) {
      await this.createNotification({
        userId: data.assignedToId,
        type: "task_assigned",
        title: "Task Assigned to You",
        message: `You have been assigned to task "${task.title}"`,
        linkUrl: `/projects/${task.projectId}/tasks/${id}`,
        isRead: false,
        priority: "medium",
      });
    }
    
    return updatedTask;
  }
  
  async deleteTask(id: number): Promise<void> {
    await db.delete(projectTasks).where(eq(projectTasks.id, id));
  }
  
  async getRecommendedUsersForTask(taskId: number): Promise<User[]> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }
    
    if (!task.requiredSkills || (task.requiredSkills as string[]).length === 0) {
      // If no specific skills required, return service providers
      return this.getUsersByRole("service_provider");
    }
    
    // Get users with required skills and their skill scores
    const requiredSkills = task.requiredSkills as string[];
    const lowerCaseSkills = requiredSkills.map(skill => skill.toLowerCase());
    
    const results = await db.select({
      user: users,
      skillScore: sql<number>`SUM(${userSkills.proficiencyLevel})`
    })
    .from(users)
    .innerJoin(
      userSkills,
      eq(users.id, userSkills.userId)
    )
    .where(
      and(
        eq(users.role, "service_provider"),
        sql`LOWER(${userSkills.skill}) IN (${sql.join(lowerCaseSkills, sql`, `)})`
      )
    )
    .groupBy(users.id)
    .orderBy(desc(sql<number>`SUM(${userSkills.proficiencyLevel})`));
    
    return results.map(r => r.user);
  }
  
  // ===== Task Comments methods =====
  async getTaskComments(taskId: number): Promise<TaskComment[]> {
    return db.select().from(taskComments)
      .where(eq(taskComments.taskId, taskId))
      .orderBy(asc(taskComments.createdAt));
  }
  
  async createTaskComment(comment: InsertTaskComment): Promise<TaskComment> {
    const [newComment] = await db.insert(taskComments).values(comment).returning();
    
    // Create notification for task assignee if the commenter is not the assignee
    const task = await this.getTask(comment.taskId);
    if (task && task.assignedToId && task.assignedToId !== comment.userId) {
      await this.createNotification({
        userId: task.assignedToId,
        type: "task_comment",
        title: "New Comment on Your Task",
        message: `There is a new comment on task "${task.title}"`,
        actionUrl: `/projects/${task.projectId}/tasks/${task.id}`,
        isRead: false,
        priority: "low",
      });
    }
    
    return newComment;
  }
  
  async deleteTaskComment(id: number): Promise<void> {
    await db.delete(taskComments).where(eq(taskComments.id, id));
  }
  
  // ===== Site Materials methods =====
  async getSiteMaterials(projectId: number): Promise<SiteMaterial[]> {
    console.log(`Getting site materials for project ID: ${projectId}`);
    return db.select().from(siteMaterials)
      .where(eq(siteMaterials.projectId, projectId));
  }
  
  async getSiteMaterial(id: number): Promise<SiteMaterial | undefined> {
    const [siteMaterial] = await db.select().from(siteMaterials)
      .where(eq(siteMaterials.id, id));
    return siteMaterial;
  }
  
  async getSiteMaterialsByMaterialId(materialId: number): Promise<SiteMaterial[]> {
    return db.select().from(siteMaterials)
      .where(eq(siteMaterials.materialId, materialId));
  }
  
  async createSiteMaterial(material: InsertSiteMaterial): Promise<SiteMaterial> {
    const now = new Date();
    const materialWithDates = {
      ...material,
      createdAt: now,
      lastUpdated: now
    };
    
    const [newSiteMaterial] = await db.insert(siteMaterials)
      .values(materialWithDates)
      .returning();
    
    return newSiteMaterial;
  }
  
  async updateSiteMaterial(id: number, updates: Partial<SiteMaterial>): Promise<SiteMaterial> {
    const updatesWithTimestamp = {
      ...updates,
      lastUpdated: new Date()
    };
    
    const [updatedSiteMaterial] = await db.update(siteMaterials)
      .set(updatesWithTimestamp)
      .where(eq(siteMaterials.id, id))
      .returning();
    
    if (!updatedSiteMaterial) {
      throw new Error(`Site material with id ${id} not found`);
    }
    
    return updatedSiteMaterial;
  }
  
  async deleteSiteMaterial(id: number): Promise<void> {
    await db.delete(siteMaterials)
      .where(eq(siteMaterials.id, id));
  }
}

// Use DatabaseStorage for persistence while also creating an in-memory database 
// with all the necessary materials so they can be browsed without requiring 
// database seeding
export const storage = new DatabaseStorage();
