import { pgTable, text, serial, integer, boolean, timestamp, json, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Suppliers Schema & Types
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  address: text("address"),
  userId: integer("user_id").notNull(), // Link to user table for auth and profile
  businessRegistrationNumber: text("business_registration_number"),
  logo: text("logo"),
  storeDescription: text("store_description"),
  paymentDetails: text("payment_details"),
  rating: doublePrecision("rating"),
  deliveryOptions: json("delivery_options"),
  active: boolean("active").notNull().default(true),
  verificationStatus: text("verification_status").default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSupplierSchema = createInsertSchema(suppliers).pick({
  name: true,
  description: true,
  contactEmail: true,
  contactPhone: true,
  address: true,
  userId: true,
  businessRegistrationNumber: true, 
  logo: true,
  storeDescription: true,
  paymentDetails: true,
  deliveryOptions: true,
  active: true,
});

// User Schema & Types
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("client"), // client, service_provider, supplier, admin
  serviceType: text("service_type"), // Only for service_provider: contractor, electrician, plumber, etc.
  businessName: text("business_name"), // Only for service_provider
  phone: text("phone"), 
  address: text("address"),
  bio: text("bio"), // Brief description of service provider
  verificationStatus: text("verification_status").default("pending"), // pending, verified, rejected
  points: integer("points").notNull().default(500), // Points for bidding on projects
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
  role: true,
  serviceType: true,
  businessName: true,
  phone: true,
  address: true,
  bio: true,
  verificationStatus: true,
  points: true,
});

// Project Schema & Types
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // commercial, residential, renovation, new_build
  clientId: integer("client_id").references(() => users.id).notNull(),
  companyId: integer("company_id").references(() => users.id),
  status: text("status").notNull().default("active"), // active, in_progress, completed, on_hold, delayed
  progress: integer("progress").notNull().default(0), // 0-100
  estimatedCompletion: timestamp("estimated_completion"),
  location: text("location").notNull(),
  coordinates: json("coordinates").notNull(), // { lat: number, lng: number }
  mainImage: json("main_image"), // Main project image object with details
  additionalImages: json("additional_images"), // Array of additional project images
  attachments: json("attachments"), // Array of { name: string, url: string, type: string, size: number }
  teamMembers: json("team_members"), // Array of { userId: number, username: string, role: string, addedAt: Date, permissions: string[] }
  budget: integer("budget"), // Total budget in cents
  actualCost: integer("actual_cost").default(0), // Actual cost in cents
  constructionPhase: text("construction_phase"), // foundation, framing, roofing, electrical, plumbing, finishing
  riskAssessment: json("risk_assessment"), // Array of { risk: string, impact: string, mitigation: string, probability: string }
  qualityChecklist: json("quality_checklist"), // Array of { item: string, completed: boolean, notes: string, inspectorId: number }
  weatherDelays: integer("weather_delays").default(0), // Number of days delayed due to weather
  permitStatus: json("permit_status"), // Array of { type: string, status: string, submissionDate: Date, approvalDate: Date }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  description: true,
  type: true,
  clientId: true,
  companyId: true,
  status: true,
  estimatedCompletion: true,
  location: true,
  coordinates: true,
  mainImage: true,
  attachments: true,
  teamMembers: true,
  budget: true,
  actualCost: true,
  constructionPhase: true,
  riskAssessment: true,
  qualityChecklist: true,
  weatherDelays: true,
  permitStatus: true,
});

// Project Timeline Schema & Types
export const projectTimelines = pgTable("project_timelines", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull(), // completed, in_progress, pending, delayed, on_hold
  date: timestamp("date").notNull(),
  completionPercentage: integer("completion_percentage"),
  images: json("images"), // array of image URLs
  constructionPhase: text("construction_phase"), // foundation, framing, roofing, electrical, plumbing, finishing
  materialsUsed: json("materials_used"), // Array of { materialId: number, quantity: number, cost: number }
  workersInvolved: json("workers_involved"), // Array of { userId: number, username: string, role: string, hoursWorked: number }
  weather: text("weather"), // Weather conditions during this phase
  qualityIssues: json("quality_issues"), // Array of { issue: string, severity: string, resolution: string, status: string }
  safetyIncidents: json("safety_incidents"), // Array of { incident: string, severity: string, response: string }
  inspectionResults: json("inspection_results"), // Array of { inspector: string, result: string, comments: string, date: string }
  nextSteps: text("next_steps"), // What's planned next
  delayReason: text("delay_reason"), // If status is 'delayed', reason for the delay
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProjectTimelineSchema = createInsertSchema(projectTimelines).pick({
  projectId: true,
  title: true,
  description: true,
  status: true,
  date: true,
  completionPercentage: true,
  images: true,
});

// Materials Schema & Types
export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // electrical, plumbing, structure, etc.
  subcategory: text("subcategory"), // More specific categorization
  price: integer("price").notNull(), // in cents
  discountPrice: integer("discount_price"), // Sale price in cents
  unit: text("unit").notNull(), // bag, unit, meter, etc.
  weight: integer("weight"), // in grams
  dimensions: json("dimensions"), // { length, width, height } in cm
  brand: text("brand"),
  features: json("features"), // array of product features/highlights
  imageUrl: text("image_url"),
  additionalImages: json("additional_images"), // array of image URLs
  productCode: text("product_code"), // SKU or product code
  warrantyInfo: text("warranty_info"),
  rating: doublePrecision("rating"),
  reviewCount: integer("review_count").default(0),
  inStock: boolean("in_stock").default(true),
  featured: boolean("featured").default(false),
  tags: json("tags"), // array of tags for search/filtering
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  supplierProductId: text("supplier_product_id"), // External product ID in supplier's system
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMaterialSchema = createInsertSchema(materials).pick({
  name: true,
  description: true,
  category: true,
  subcategory: true,
  price: true,
  discountPrice: true,
  unit: true,
  weight: true,
  dimensions: true,
  brand: true,
  features: true,
  imageUrl: true,
  additionalImages: true,
  productCode: true,
  warrantyInfo: true,
  rating: true,
  featured: true,
  tags: true,
  supplierId: true,
  supplierProductId: true,
});

// Orders Schema & Types
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().unique(), // formatted order ID: ORD-YYYY-XXXX
  clientId: integer("client_id").references(() => users.id).notNull(),
  projectId: integer("project_id").references(() => projects.id),
  status: text("status").notNull().default("processing"), // processing, in_transit, delivered
  items: json("items").notNull(), // array of { materialId, quantity, price }
  totalAmount: integer("total_amount").notNull(), // in cents
  deliveryAddress: text("delivery_address").notNull(),
  deliveryDate: timestamp("delivery_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  orderId: true,
  clientId: true,
  projectId: true,
  status: true,
  items: true,
  totalAmount: true,
  deliveryAddress: true,
  deliveryDate: true,
});

// Messages Schema & Types
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  receiverId: integer("receiver_id").references(() => users.id).notNull(),
  projectId: integer("project_id").references(() => projects.id),
  content: text("content").notNull(),
  images: text("images").array(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  senderId: true,
  receiverId: true,
  projectId: true,
  content: true,
  images: true,
});

// Inventory Schema & Types
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").references(() => materials.id).notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  quantityAvailable: integer("quantity_available").notNull().default(0),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  expectedRestockDate: timestamp("expected_restock_date"),
  minOrderQuantity: integer("min_order_quantity").default(1),
  reservedQuantity: integer("reserved_quantity").default(0),
  status: text("status").notNull().default("in_stock"), // in_stock, low_stock, out_of_stock, discontinued
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInventorySchema = createInsertSchema(inventory).pick({
  materialId: true,
  supplierId: true,
  quantityAvailable: true,
  expectedRestockDate: true,
  minOrderQuantity: true,
  reservedQuantity: true,
  status: true,
});

// Site Materials Schema & Types - for tracking materials already on construction sites
export const siteMaterials = pgTable("site_materials", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  materialId: integer("material_id").references(() => materials.id).notNull(),
  quantity: integer("quantity").notNull().default(0),
  unit: text("unit").notNull(), // bag, unit, meter, etc.
  location: text("location"), // specific location on site
  status: text("status").default("available"), // available, reserved, depleted, damaged
  condition: text("condition").default("good"), // good, damaged, used, etc.
  notes: text("notes"), // any notes about the material
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  addedBy: integer("added_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSiteMaterialSchema = createInsertSchema(siteMaterials).pick({
  projectId: true,
  materialId: true,
  quantity: true,
  unit: true,
  location: true,
  status: true,
  condition: true,
  notes: true,
  addedBy: true,
});

// Type Definitions
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

// Extended project type with runtime-only properties
export interface ExtendedProject extends Project {
  isTeamMember?: boolean; // Flag to indicate if current user is a team member and not the primary assignee
}

export type ProjectTimeline = typeof projectTimelines.$inferSelect;
export type InsertProjectTimeline = z.infer<typeof insertProjectTimelineSchema>;

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type SiteMaterial = typeof siteMaterials.$inferSelect;
export type InsertSiteMaterial = z.infer<typeof insertSiteMaterialSchema>;

// Project Expenses Schema & Types
export const projectExpenses = pgTable("project_expenses", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  title: text("title").notNull(),
  amount: integer("amount").notNull(), // in cents
  category: text("category").notNull(), // materials, labor, equipment, permits, etc.
  date: timestamp("date").notNull(),
  description: text("description"),
  paymentMethod: text("payment_method"), // cash, credit, check, transfer
  vendor: text("vendor"),
  invoiceNumber: text("invoice_number"),
  receiptImage: text("receipt_image"),
  addedBy: integer("added_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProjectExpenseSchema = createInsertSchema(projectExpenses).pick({
  projectId: true,
  title: true,
  amount: true,
  category: true,
  date: true,
  description: true,
  paymentMethod: true,
  vendor: true,
  invoiceNumber: true,
  receiptImage: true,
  addedBy: true,
});

export type ProjectExpense = typeof projectExpenses.$inferSelect;
export type InsertProjectExpense = z.infer<typeof insertProjectExpenseSchema>;

// Service Requests Schema & Types
export const serviceRequests = pgTable("service_requests", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => users.id).notNull(),
  requestType: text("request_type").notNull(), // artisan, contractor, real_estate
  serviceType: text("service_type").notNull(), // electrician, plumber, architect, etc. for artisans
  description: text("description").notNull(),
  budget: integer("budget"), // in cents
  location: text("location").notNull(),
  coordinates: json("coordinates").notNull(), // { lat: number, lng: number }
  status: text("status").notNull().default("pending_admin"), // pending_admin, approved, published, in_progress, completed, cancelled
  adminNotes: text("admin_notes"), // private notes for admin
  assignedServiceProviderId: integer("assigned_service_provider_id").references(() => users.id),
  timeline: text("timeline"), // expected timeline for project
  attachments: json("attachments"), // Array of { name: string, url: string, type: string, size: number }
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertServiceRequestSchema = createInsertSchema(serviceRequests).pick({
  clientId: true,
  requestType: true,
  serviceType: true,
  description: true,
  budget: true,
  location: true,
  coordinates: true,
  timeline: true,
  attachments: true,
});

export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;

// Service Request Bids Schema & Types
export const serviceRequestBids = pgTable("service_request_bids", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").references(() => serviceRequests.id).notNull(),
  serviceProviderId: integer("service_provider_id").references(() => users.id).notNull(),
  bidAmount: integer("bid_amount").notNull(), // in cents
  timeframe: integer("timeframe").notNull(), // in days
  description: text("description").notNull(),
  pointsToUse: integer("points_to_use").notNull().default(50),
  materialsCost: integer("materials_cost").notNull().default(0),
  laborCost: integer("labor_cost").notNull().default(0),
  equipmentCost: integer("equipment_cost").notNull().default(0),
  overheadCost: integer("overhead_cost").notNull().default(0),
  contingency: integer("contingency").notNull().default(5), // percentage
  paymentSchedule: text("payment_schedule").notNull().default("milestone"),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected, forwarded_to_client
  anonymousIdentifier: text("anonymous_identifier"), // Random identifier shown to clients instead of actual name
  selectedByAdmin: boolean("selected_by_admin").default(false), // Flag to indicate if admin selected this bid to forward to client
  selectedByClient: boolean("selected_by_client").default(false), // Flag to indicate if client selected this bid
  adminNotes: text("admin_notes"), // Private notes for admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertServiceRequestBidSchema = createInsertSchema(serviceRequestBids).pick({
  serviceRequestId: true,
  serviceProviderId: true,
  bidAmount: true,
  timeframe: true,
  description: true,
  pointsToUse: true,
  materialsCost: true,
  laborCost: true,
  equipmentCost: true,
  overheadCost: true,
  contingency: true,
  paymentSchedule: true,
  anonymousIdentifier: true,
});

export type ServiceRequestBid = typeof serviceRequestBids.$inferSelect;
export type InsertServiceRequestBid = z.infer<typeof insertServiceRequestBidSchema>;

// Notifications schema
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // 'project', 'order', 'message', 'service_request', etc.
  priority: text("priority").notNull().default("normal"), // 'high', 'normal', 'low'
  relatedItemId: integer("related_item_id"), // ID of related project, order, etc.
  relatedItemType: text("related_item_type"), // 'project', 'order', etc. (redundant with type for clarity)
  emoji: text("emoji"), // Unicode emoji to represent the notification visually
  read: boolean("read").notNull().default(false),
  actionUrl: text("action_url"), // URL to navigate to when clicked
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  title: true,
  message: true,
  type: true,
  priority: true,
  relatedItemId: true,
  relatedItemType: true,
  emoji: true,
  actionUrl: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Project Bids Schema & Types
export const projectBids = pgTable("project_bids", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  serviceProviderId: integer("service_provider_id").references(() => users.id).notNull(),
  bidAmount: integer("bid_amount").notNull(), // in cents
  estimatedDuration: integer("estimated_duration"), // in days
  proposalDescription: text("proposal_description").notNull(),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected, withdrawn
  pointsUsed: integer("points_used").notNull(), 
  notes: text("notes"), // Additional notes or terms
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectBidSchema = createInsertSchema(projectBids).pick({
  projectId: true,
  serviceProviderId: true,
  bidAmount: true,
  estimatedDuration: true,
  proposalDescription: true,
  status: true,
  pointsUsed: true,
  notes: true,
});

export type ProjectBid = typeof projectBids.$inferSelect;
export type InsertProjectBid = z.infer<typeof insertProjectBidSchema>;

// Team Invitations Schema & Types
export const teamInvitations = pgTable("team_invitations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  invitedByUserId: integer("invited_by_user_id").references(() => users.id).notNull(),
  inviteEmail: text("invite_email").notNull(),
  role: text("role").notNull(), // contractor, project_manager, inspector, relative
  inviteToken: text("invite_token").notNull().unique(),
  inviteStatus: text("invite_status").notNull().default("pending"), // pending, accepted, declined, expired
  permissions: json("permissions"), // Array of permission strings 
  // Using default SQL expressions for date handling to avoid JavaScript Date conversion
  expiresAt: timestamp("expires_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
});

export const insertTeamInvitationSchema = createInsertSchema(teamInvitations).pick({
  projectId: true,
  invitedByUserId: true,
  inviteEmail: true,
  role: true,
  inviteToken: true,
  permissions: true,
});

export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type InsertTeamInvitation = z.infer<typeof insertTeamInvitationSchema>;

// User Skills Schema & Types
export const userSkills = pgTable("user_skills", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  skill: text("skill").notNull(), // e.g., "masonry", "electrical", "plumbing", "carpentry"
  proficiencyLevel: integer("proficiency_level").notNull(), // 1-5 scale
  yearsExperience: integer("years_experience"),
  certifications: json("certifications"), // Array of certification names or objects
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSkillSchema = createInsertSchema(userSkills).pick({
  userId: true,
  skill: true,
  proficiencyLevel: true,
  yearsExperience: true,
  certifications: true,
  lastUsed: true,
});

export type UserSkill = typeof userSkills.$inferSelect;
export type InsertUserSkill = z.infer<typeof insertUserSkillSchema>;

// Project Tasks Schema & Types
export const projectTasks = pgTable("project_tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, blocked
  priority: text("priority").notNull().default("medium"), // low, medium, high, critical
  dueDate: timestamp("due_date"),
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours"),
  assignedToId: integer("assigned_to_id").references(() => users.id),
  assignedByUserId: integer("assigned_by_user_id").references(() => users.id),
  dependencies: json("dependencies"), // Array of task IDs that must be completed first
  requiredSkills: json("required_skills"), // Array of skills needed
  constructionPhase: text("construction_phase"), // foundation, framing, roofing, electrical, plumbing, finishing
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectTaskSchema = createInsertSchema(projectTasks).pick({
  projectId: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  dueDate: true,
  estimatedHours: true,
  assignedToId: true,
  assignedByUserId: true,
  dependencies: true,
  requiredSkills: true,
  constructionPhase: true,
  notes: true,
});

export type ProjectTask = typeof projectTasks.$inferSelect;
export type InsertProjectTask = z.infer<typeof insertProjectTaskSchema>;

// Task Comments Schema & Types
export const taskComments = pgTable("task_comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => projectTasks.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  attachments: json("attachments"), // Array of { name: string, url: string, type: string }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTaskCommentSchema = createInsertSchema(taskComments).pick({
  taskId: true,
  userId: true,
  content: true,
  attachments: true,
});

export type TaskComment = typeof taskComments.$inferSelect;
export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;
