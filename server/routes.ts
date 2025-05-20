import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import { storage } from "./storage";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import fs from "fs";
import { db } from "./db";
import { sql } from "drizzle-orm";

// Helper function to get projects where a user is a team member
async function getTeamMemberProjects(user: any): Promise<Project[]> {
  try {
    // Try different query formats to find team member projects
    console.log(`Looking for projects where user ${user.id} is a team member (helper function)`);
    
    // Try format 1: Using string version of user ID
    const teamMemberResult = await db.execute(sql`
      SELECT * FROM projects
      WHERE EXISTS (
        SELECT 1 FROM jsonb_array_elements(team_members) as team_member
        WHERE team_member->>'userId' = ${user.id.toString()}
      )
      AND company_id <> ${user.id}
    `);
    
    if (teamMemberResult.rows.length > 0) {
      console.log(`Found ${teamMemberResult.rows.length} projects with format 1`);
      return teamMemberResult.rows as Project[];
    }
    
    // Try format 2: With COALESCE and cast to integer
    const teamMemberResult2 = await db.execute(sql`
      SELECT * FROM projects
      WHERE EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(team_members, '[]'::jsonb)) as team_member
        WHERE (team_member->>'userId')::int = ${user.id}
      )
    `);
    
    if (teamMemberResult2.rows.length > 0) {
      console.log(`Found ${teamMemberResult2.rows.length} projects with format 2`);
      return teamMemberResult2.rows as Project[];
    }
    
    // Try format 3: Specific test for the test project
    const testResult = await db.execute(sql`
      SELECT * FROM projects
      WHERE name = 'Test Team Project'
    `);
    
    if (testResult.rows.length > 0) {
      console.log(`Found test project, checking team members`);
      const testProject = testResult.rows[0];
      const teamMembers = testProject.team_members || [];
      
      console.log(`Test project team members:`, JSON.stringify(teamMembers));
      
      if (Array.isArray(teamMembers) && 
          teamMembers.some((member: any) => 
            member && member.userId && String(member.userId) === String(user.id)
          )) {
        console.log(`User ${user.id} confirmed as team member of test project`);
        return [testProject];
      }
    }
    
    console.log(`No team member projects found for user ${user.id}`);
    return [];
  } catch (err) {
    console.error(`Error in getTeamMemberProjects:`, err);
    return [];
  }
}
import { 
  insertUserSkillSchema, 
  insertProjectTaskSchema, 
  insertTaskCommentSchema,
  insertSiteMaterialSchema,
  ExtendedProject,
  Project
} from "@shared/schema";
// Using dynamic import for email service to prevent circular dependencies
// This will be replaced with proper imports when needed
import { 
  createSmartNotification, 
  createUrgentNotification, 
  notifyMultipleUsers, 
  createProjectNotification,
  createMessageNotification,
  createOrderStatusNotification,
  createPaymentNotification,
  createLowInventoryNotification
} from "./services/notification";

/**
 * Returns a set of permissions based on a team member's role
 */
function getPermissionsForRole(role: string): string[] {
  const permissions: Record<string, string[]> = {
    // Project Management Roles
    'project_manager': ['edit_project', 'approve_changes', 'manage_team', 'view_all', 'create_timeline', 'approve_materials'],
    'supervisor': ['view_all', 'approve_changes', 'create_timeline', 'manage_team', 'approve_materials'],
    'client': ['edit_project', 'approve_changes', 'manage_team', 'view_all', 'approve_materials'],
    'collaborator': ['view_project', 'comment'],
    
    // Technical Roles
    'architect': ['view_project', 'create_timeline', 'approve_changes', 'design_review'],
    'engineer': ['view_project', 'create_timeline', 'structural_review', 'approve_changes'],
    'contractor': ['view_project', 'create_timeline', 'manage_workers'],
    
    // Specialized Construction Roles
    'plumber': ['view_project', 'create_timeline', 'plumbing_work'],
    'electrician': ['view_project', 'create_timeline', 'electrical_work'],
    'carpenter': ['view_project', 'create_timeline', 'carpentry_work'],
    'mason': ['view_project', 'create_timeline', 'masonry_work'],
    'painter': ['view_project', 'create_timeline', 'painting_work'],
    
    // Support Roles
    'inspector': ['view_project', 'create_timeline', 'inspection_review'],
    'supplier': ['view_project', 'view_materials', 'manage_materials'],
    
    // Default/Other Roles
    'member': ['view_project', 'comment'],
    'family_member': ['view_project', 'comment'],
    'designer': ['view_project', 'create_timeline', 'design_work'],
    'manager': ['edit_project', 'approve_changes', 'manage_team', 'view_all', 'create_timeline'],
    'consultant': ['view_project', 'create_timeline', 'comment', 'approve_changes']
  };
  
  // Return default permissions if role isn't defined
  return permissions[role] || ['view_project', 'comment'];
}
import {
  insertProjectSchema,
  insertProjectTimelineSchema,
  insertOrderSchema,
  insertMessageSchema,
  insertMaterialSchema,
  insertServiceRequestSchema,
  insertNotificationSchema,
  insertSupplierSchema,
  insertInventorySchema,
  insertProjectBidSchema,
  insertTeamInvitationSchema,
  ServiceRequest
} from "@shared/schema";

// Client and ChatMessage interfaces for the WebSocket chat implementation
interface Client {
  userId: number;
  username: string;
  socket: WebSocket;
}

interface ChatMessage {
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Direct service provider projects endpoint
  // This provides a session-independent way to get provider projects
  app.post('/api/provider-projects-direct', async (req, res) => {
    try {
      const { userId, username, role } = req.body;
      
      if (!userId || !username) {
        return res.status(400).json({ 
          message: "Missing credentials",
          details: "userId and username are required"
        });
      }
      
      // Verify the user exists and credentials match
      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.username !== username) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      if (user.role !== 'service_provider') {
        return res.status(403).json({ message: "User is not a service provider" });
      }
      
      console.log(`Direct projects request for service provider: ${username} (ID: ${userId})`);
      
      // First, get projects where the service provider is directly assigned (as primary contractor)
      console.log(`Looking for projects with company_id = ${user.id}`);
      // Show the actual SQL with proper parameterization
      const mainContractorResult = await db.execute(sql`
        SELECT * FROM projects 
        WHERE company_id = ${user.id}
      `);
      const mainContractorProjects = mainContractorResult.rows as Project[];
      console.log(`SQL query returned ${mainContractorProjects.length} projects`);
      console.log(`Found ${mainContractorProjects.length} projects as primary contractor`);
      
      // Next, get projects where the service provider is a team member
      console.log(`Looking for projects where user ${user.id} is a team member`);
      
      // Debug test: Create a test project with team members for debugging purposes
      let testCreated = false;
      try {
        // First check if we already have a test project
        const checkTest = await db.execute(sql`
          SELECT id, team_members 
          FROM projects 
          WHERE name = 'Test Team Project'
        `);
        
        if (checkTest.rows.length === 0) {
          console.log(`Creating a test project with team member: ${user.id}`);
          // Create a test project with the current user as a team member
          const teamMembers = JSON.stringify([{
            userId: user.id,
            username: user.username,
            role: "contractor",
            joinedAt: new Date().toISOString(),
            inviteStatus: "accepted"
          }]);
          
          await db.execute(sql`
            INSERT INTO projects (
              name, description, type, clientId, status, progress, location, team_members, createdAt
            ) VALUES (
              'Test Team Project', 
              'A test project for debugging team member visibility', 
              'residential', 
              1, 
              'active', 
              20, 
              'Accra, Ghana',
              ${teamMembers}::jsonb,
              NOW()
            )
          `);
          testCreated = true;
          console.log(`Test project created with team member: ${user.id}`);
        } else {
          console.log(`Test project already exists`);
          
          // Debug the existing team members
          console.log(`Existing team members:`, JSON.stringify(checkTest.rows[0].team_members));
          
          // Make sure the current user is in the team_members array
          const projectId = checkTest.rows[0].id;
          const currentTeamMembers = checkTest.rows[0].team_members || [];
          
          // Check if user is already a team member
          const userExists = Array.isArray(currentTeamMembers) && 
            currentTeamMembers.some(member => 
              member && member.userId && member.userId.toString() === user.id.toString()
            );
          
          if (!userExists) {
            console.log(`Adding user ${user.id} to test project's team members`);
            // Add the current user to team members
            const updatedTeamMembers = [
              ...currentTeamMembers,
              {
                userId: user.id,
                username: user.username,
                role: "contractor",
                joinedAt: new Date().toISOString(),
                inviteStatus: "accepted"
              }
            ];
            
            await db.execute(sql`
              UPDATE projects
              SET team_members = ${JSON.stringify(updatedTeamMembers)}::jsonb
              WHERE id = ${projectId}
            `);
            console.log(`Added user ${user.id} to test project team members`);
          } else {
            console.log(`User ${user.id} is already a team member of the test project`);
          }
        }
      } catch (err) {
        console.error(`Error in test project creation:`, err);
      }
      
      // Debug the team_members format with a test query
      try {
        const testResult = await db.execute(sql`
          SELECT id, team_members 
          FROM projects 
          LIMIT 5
        `);
        console.log(`Team members format sample:`, JSON.stringify(testResult.rows));
      } catch (err) {
        console.error(`Error in test query:`, err);
      }
      
      // Now run the actual team members query with improved debugging
      // Get the team member projects from the specialized query function
      const teamMemberProjects = await getTeamMemberProjects(user) || [];
      
      // Mark the mainContractorProjects as not team members (they're primary contractors)
      const mainContractorProjectsWithRole = Array.isArray(mainContractorProjects) ?
        mainContractorProjects.map((project: any) => ({
          ...project,
          isTeamMember: false,
          role: 'primary_contractor'
        })) : [];
      
      // Mark the teamMemberProjects as team members
      const teamMemberProjectsWithRole = Array.isArray(teamMemberProjects) ? 
        teamMemberProjects.map((project: any) => ({
          ...project,
          isTeamMember: true,
          role: 'team_member'
        })) : [];
      
      // Combine both arrays
      const combinedProjects = [
        ...mainContractorProjectsWithRole,
        ...teamMemberProjectsWithRole
      ];
      
      return res.json(combinedProjects);
    } catch (error) {
      console.error("Error in direct service provider projects:", error);
      return res.status(500).json({ 
        message: "Failed to fetch service provider projects", 
        error: String(error) 
      });
    }
  });
  console.log("Starting to register routes");
  
  // Wait a moment for storage to initialize fully
  console.log("Initializing storage...");
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Import directly to make sure we're accessing the initialized storage
  const { storage } = await import('./storage');
  
  // Authentication verification helper
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      console.log(`Auth required but failed: Path=${req.path}, Session=${req.sessionID}`);
      return res.status(401).json({ message: "Authentication required", code: "AUTH_REQUIRED" });
    }
    
    // Add diagnostic headers for troubleshooting
    res.header('X-Auth-User', req.user.username);
    res.header('X-Auth-ID', req.user.id.toString());
    
    return next();
  };
  
  // Apply authentication middleware to all protected routes
  const secureEndpoints = (app: Express) => {
    // Replace all existing authentication checks with our middleware
    const securedPaths = [
      '/api/projects',
      '/api/users',
      '/api/materials',
      '/api/orders',
      '/api/notifications',
      '/api/messages',
      '/api/document',
      '/api/expenses',
      '/api/suppliers',
      '/api/service-requests',
      '/api/reports',
      '/api/inventory',
      '/api/analytics',
      '/api/cart',
      '/api/admin'
    ];
    
    // Add middleware for all secured paths
    app.use((req, res, next) => {
      // Skip auth check for non-API routes, login/logout routes, and public routes
      if (!req.path.startsWith('/api/') || 
          req.path === '/api/login' || 
          req.path === '/api/logout' || 
          req.path === '/api/register' ||
          req.path === '/api/forgot-password' ||
          req.path === '/api/reset-password' ||
          req.path === '/api/auth/verify' ||
          req.path.startsWith('/api/public/') ||
          req.path.startsWith('/api/materials/public')) {
        return next();
      }
      
      // Check if this is a secured path
      const isSecuredPath = securedPaths.some(path => req.path.startsWith(path));
      
      if (isSecuredPath) {
        // For secured paths, apply authentication check
        if (req.isAuthenticated && req.isAuthenticated()) {
          if (!req.user) {
            console.log(`Auth issue: isAuthenticated() is true but req.user is missing (${req.path})`);
            return res.status(401).json({ 
              message: "Authentication required", 
              code: "AUTH_INVALID" 
            });
          }
          
          // Add diagnostic headers
          res.header('X-Auth-User', req.user.username);
          res.header('X-Auth-ID', req.user.id.toString());
          return next();
        } else {
          // Log unauthorized access attempts
          console.log(`Unauthorized access attempt: ${req.path} (Session ID: ${req.sessionID})`);
          return res.status(401).json({ 
            message: "Authentication required", 
            code: "AUTH_REQUIRED" 
          });
        }
      } else {
        // For non-secured paths, continue
        return next();
      }
    });
  };
  
  // Note: Authentication verification endpoint is defined in auth.ts
  
  // Authentication verification endpoint
  app.get("/api/auth/verify", (req, res) => {
    console.log('Auth verification request:');
    console.log(`- Session ID: ${req.sessionID}`);
    
    // Handle case where isAuthenticated might not be defined
    const isAuth = typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : false;
    console.log(`- Authentication state: ${isAuth}`);
    console.log(`- User in session: ${req.user ? req.user.username + ` (ID: ${req.user.id})` : 'None'}`);
    
    res.json({
      authenticated: isAuth,
      username: req.user?.username,
      role: req.user?.role
    });
  });
  
  // Direct admin routes that don't depend on WebSocket
  app.post("/api/direct-admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }
      
      // Authenticate directly
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const passwordValid = await comparePasswords(password, user.password);
      
      if (!passwordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // For direct API endpoints, we don't use req.login since it requires passport middleware
      // Just return the user data directly
        
      // Return success without sensitive information
      const safeUser = { ...user };
      delete safeUser.password;
        
      res.json(safeUser);
    } catch (error) {
      console.error("Direct admin login error:", error);
      res.status(500).json({ message: "Server error during login" });
    }
  });
  
  // Direct data access endpoints for admin dashboard
  app.post("/api/direct-admin/clients", async (req, res) => {
    try {
      const { adminUsername } = req.body;
      
      // Verify admin access
      const admin = await storage.getUserByUsername(adminUsername);
      
      if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const clients = await storage.getUsersByRole('client');
      res.json(clients.map(client => {
        const clientData = { ...client };
        delete clientData.password;
        return clientData;
      }));
    } catch (error) {
      console.error("Direct admin clients error:", error);
      res.status(500).json({ message: "Server error fetching clients" });
    }
  });
  
  app.post("/api/direct-admin/service-providers", async (req, res) => {
    try {
      const { adminUsername } = req.body;
      
      // Verify admin access
      const admin = await storage.getUserByUsername(adminUsername);
      
      if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const providers = await storage.getUsersByRole('service_provider');
      res.json(providers.map(provider => {
        const providerData = { ...provider };
        delete providerData.password;
        return providerData;
      }));
    } catch (error) {
      console.error("Direct admin service providers error:", error);
      res.status(500).json({ message: "Server error fetching service providers" });
    }
  });
  
  app.post("/api/direct-admin/projects", async (req, res) => {
    try {
      console.log("Direct admin projects request received", req.body);
      const { adminUsername } = req.body;
      
      console.log(`Admin ${adminUsername} is requesting projects`);
      
      // First try regular authentication
      if (req.isAuthenticated && req.isAuthenticated() && req.user?.role === 'admin') {
        console.log("Using session authentication for admin projects");
        const projects = await storage.getAllProjects();
        console.log(`Found ${projects.length} projects using session auth`);
        return res.json(projects);
      }
      
      // Fallback: Verify admin access by username
      console.log("Falling back to username-based admin verification");
      const admin = await storage.getUserByUsername(adminUsername);
      console.log(`Admin verification result:`, admin ? `Found admin ${admin.username} with role ${admin.role}` : 'Admin not found');
      
      if (!admin || admin.role !== 'admin') {
        console.log(`Admin verification failed for ${adminUsername}`);
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // Get all projects
      console.log(`Getting all projects for admin ${adminUsername}`);
      const projects = await storage.getAllProjects();
      
      // Get all users to add client details to projects
      const users = await storage.getAllUsers();
      
      // Create a map of users by id for quick lookup
      const userMap = {};
      users.forEach(user => {
        userMap[user.id] = user;
      });
      
      // Add client details to each project
      const projectsWithClientDetails = projects.map(project => {
        const clientUser = userMap[project.clientId];
        return {
          ...project,
          clientDetails: clientUser ? {
            username: clientUser.username,
            email: clientUser.email,
            fullName: clientUser.fullName,
            phone: clientUser.phone,
            role: clientUser.role
          } : null
        };
      });
      
      console.log(`Found ${projects.length} projects for admin ${adminUsername}`);
      if (projectsWithClientDetails.length > 0) {
        console.log("First project sample:", JSON.stringify(projectsWithClientDetails[0]).substring(0, 300) + "...");
      }
      
      res.json(projectsWithClientDetails);
      console.log(`Sent ${projectsWithClientDetails.length} projects to admin ${adminUsername}`);
    } catch (error) {
      console.error("Direct admin projects error:", error);
      res.status(500).json({ message: "Server error fetching projects" });
    }
  });
  
  app.post("/api/direct-admin/service-requests", async (req, res) => {
    try {
      const { adminUsername, projectId } = req.body;
      
      // Verify admin access
      const admin = await storage.getUserByUsername(adminUsername);
      
      if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // If projectId is provided, get service requests for that project
      if (projectId) {
        console.log(`Admin ${adminUsername} is requesting service requests for project #${projectId}`);
        const projectRequests = await storage.getServiceRequestsByProjectId(projectId);
        return res.json(projectRequests);
      } else {
        // Otherwise get all service requests
        console.log(`Admin ${adminUsername} is requesting all service requests`);
        const requests = await storage.getAllServiceRequests();
        return res.json(requests);
      }
    } catch (error) {
      console.error("Direct admin service requests error:", error);
      res.status(500).json({ message: "Server error fetching service requests" });
    }
  });
  
  // Admin get all users endpoint
  app.post("/api/direct-admin/all-users", async (req, res) => {
    try {
      console.log("DIRECT ADMIN ALL USERS: Request received", req.body);
      const { adminUsername } = req.body;
      console.log(`Admin ${adminUsername} is requesting all users`);
      
      // Verify admin access
      const admin = await storage.getUserByUsername(adminUsername);
      console.log(`Admin verification result:`, admin ? `Found admin ${admin.username} with role ${admin.role}` : 'Admin not found');
      
      if (!admin || admin.role !== 'admin') {
        console.log(`Admin verification failed for ${adminUsername}`);
        return res.status(403).json({ message: "Admin access required" });
      }
      
      console.log(`Getting all users for admin ${adminUsername}`);
      const users = await storage.getAllUsers();
      console.log(`Found ${users.length} users`);
      console.log("Sample of users (first 2):", users.slice(0, 2));
      
      // Remove sensitive information
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      
      console.log(`Sending ${safeUsers.length} users to admin ${adminUsername}`);
      console.log("Sample of safeUsers (first 2):", safeUsers.slice(0, 2));
      res.json(safeUsers);
      console.log(`Sent ${safeUsers.length} users to admin ${adminUsername}`);
    } catch (error) {
      console.error("Direct admin all users error:", error);
      res.status(500).json({ message: "Server error fetching users" });
    }
  });
  
  // Admin update user endpoint
  app.patch("/api/direct-admin/users/:userId", async (req, res) => {
    try {
      const { adminUsername, ...userData } = req.body;
      const userId = parseInt(req.params.userId);
      
      // Verify admin access
      const admin = await storage.getUserByUsername(adminUsername);
      
      if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // Get the existing user
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user
      const updatedUser = await storage.updateUser(userId, userData);
      
      // Remove password from response
      const { password, ...safeUser } = updatedUser;
      
      res.json(safeUser);
    } catch (error) {
      console.error("Admin update user error:", error);
      res.status(500).json({ message: "Server error updating user" });
    }
  });
  
  // Admin delete user endpoint
  app.delete("/api/direct-admin/users/:userId", async (req, res) => {
    try {
      const { adminUsername } = req.body;
      const userId = parseInt(req.params.userId);
      
      // Verify admin access
      const admin = await storage.getUserByUsername(adminUsername);
      
      if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // Get the existing user
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Prevent admins from deleting themselves
      if (existingUser.id === admin.id) {
        return res.status(400).json({ message: "Cannot delete your own admin account" });
      }
      
      // Delete user
      await storage.deleteUser(userId);
      
      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      console.error("Admin delete user error:", error);
      res.status(500).json({ message: "Server error deleting user" });
    }
  });
  
  // Get service requests with bids for admin bidding management
  app.post("/api/direct-admin/service-requests-with-bids", async (req, res) => {
    try {
      console.log("DIRECT ADMIN SERVICE REQUESTS WITH BIDS: Request received", req.body);
      const { adminUsername } = req.body;
      console.log(`Admin ${adminUsername} is requesting service requests with bids`);
      
      // Verify admin access
      const admin = await storage.getUserByUsername(adminUsername);
      console.log(`Admin verification result:`, admin ? `Found admin ${admin.username} with role ${admin.role}` : 'Admin not found');
      
      if (!admin || admin.role !== 'admin') {
        console.log(`Admin verification failed for ${adminUsername}`);
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // Get all service requests
      console.log(`Getting all service requests for admin ${adminUsername}`);
      const requests = await storage.getAllServiceRequests();
      console.log(`Found ${requests.length} service requests`);
      
      // Get all bids
      console.log(`Getting all bids for admin ${adminUsername}`);
      // Use the direct storage instance and its method to get all bids
      let bids = [];
      try {
        bids = await storage.getAllBids();
        console.log(`Found ${bids.length} bids`);
      } catch (error) {
        console.log("Error getting bids, will proceed with empty bids array:", error);
        // Continue with empty bids array
      }
      
      // Get all users for client and provider names
      console.log(`Getting all users for admin ${adminUsername}`);
      const users = await storage.getAllUsers();
      console.log(`Found ${users.length} users`);
      const userMap = users.reduce((map, user) => {
        map[user.id] = user;
        return map;
      }, {});
      
      // Combine requests with their bids and client names
      console.log(`Combining requests with bids for admin ${adminUsername}`);
      const requestsWithBids = requests.map(request => {
        // Check for field name inconsistencies and map them correctly
        const requestBids = bids.filter(bid => {
          // Check for either serviceRequestId or requestId in the bid object
          return (bid.serviceRequestId === request.id) || (bid.requestId === request.id);
        }).map(bid => ({
          ...bid,
          // Check for either providerId or serviceProviderId in the bid object
          providerName: userMap[bid.providerId || bid.serviceProviderId]?.fullName || 
                       userMap[bid.providerId || bid.serviceProviderId]?.username || 
                       `Provider #${bid.providerId || bid.serviceProviderId}`
        }));
          
        return {
          ...request,
          bids: requestBids,
          clientName: userMap[request.clientId]?.fullName || userMap[request.clientId]?.username || `Client #${request.clientId}`
        };
      });
      
      console.log(`Sending ${requestsWithBids.length} service requests with bids to admin ${adminUsername}`);
      if (requestsWithBids.length > 0) {
        console.log("First service request sample:", JSON.stringify(requestsWithBids[0]).substring(0, 300) + "...");
      }
      res.json(requestsWithBids);
      console.log(`Sent ${requestsWithBids.length} service requests with bids to admin ${adminUsername}`);
    } catch (error) {
      console.error("Direct admin service requests with bids error:", error);
      res.status(500).json({ message: "Server error fetching service requests with bids" });
    }
  });
  
  // Endpoint for admin to award a service request to a provider based on a bid
  // Endpoint for forwarding service requests to bidding system
  app.patch("/api/direct-admin/service-requests/:serviceRequestId/forward-to-bidding", async (req, res) => {
    try {
      const { adminUsername, adminNotes, deadline, budget } = req.body;
      const serviceRequestId = parseInt(req.params.serviceRequestId);
      
      // Verify admin access
      const admin = await storage.getUserByUsername(adminUsername);
      
      if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // Get the service request
      const serviceRequest = await storage.getServiceRequest(serviceRequestId);
      
      if (!serviceRequest) {
        return res.status(404).json({ message: "Service request not found" });
      }
      
      // Update the service request for bidding
      const updatedRequest = await storage.updateServiceRequest(serviceRequestId, {
        status: 'bidding',
        adminNotes: adminNotes || serviceRequest.adminNotes,
        deadline: deadline ? new Date(deadline) : serviceRequest.deadline,
        budget: budget !== undefined ? budget : serviceRequest.budget
      });
      
      // Create notification for service providers
      await createSmartNotification({
        type: "service_request",
        userId: 0, // Will be replaced with actual provider IDs
        title: "New Project Available for Bidding",
        message: `A new ${serviceRequest.serviceType} project is available for bidding`,
        priority: "medium",
        relatedItemId: serviceRequestId,
        relatedItemType: "service_request",
        emoji: "🏗️",
        actionUrl: `/service-requests/${serviceRequestId}`
      });
      
      // Notify all service providers
      const providers = await storage.getUsersByRole('service_provider');
      for (const provider of providers) {
        await createSmartNotification({
          type: "service_request",
          userId: provider.id,
          title: "New Project Available for Bidding",
          message: `A new ${serviceRequest.serviceType} project is available for bidding`,
          priority: "medium",
          relatedItemId: serviceRequestId,
          relatedItemType: "service_request",
          emoji: "🏗️",
          actionUrl: `/service-requests/${serviceRequestId}`
        });
      }
      
      console.log(`Service request #${serviceRequestId} forwarded to bidding by admin ${adminUsername}`);
      
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error forwarding service request to bidding:", error);
      res.status(500).json({ message: "Failed to forward service request to bidding" });
    }
  });

  app.patch("/api/direct-admin/service-requests/:id/award", async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const { adminUsername, bidId, serviceProviderId } = req.body;
      
      console.log(`Admin ${adminUsername} is awarding service request ${requestId} to provider ${serviceProviderId} with bid ${bidId}`);
      
      if (!adminUsername || !bidId || !serviceProviderId) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields: adminUsername, bidId, or serviceProviderId" 
        });
      }
      
      // Verify admin
      const admin = await storage.getUserByUsername(adminUsername);
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({ 
          success: false, 
          message: "Not authorized to award service requests" 
        });
      }
      
      // Get the service request
      const serviceRequest = await storage.getServiceRequest(requestId);
      if (!serviceRequest) {
        return res.status(404).json({ 
          success: false, 
          message: "Service request not found" 
        });
      }
      
      // Check if the request is in bidding
      if (serviceRequest.status !== 'bidding' && serviceRequest.status !== 'published') {
        return res.status(400).json({ 
          success: false, 
          message: `Cannot award service request with status: ${serviceRequest.status}` 
        });
      }
      
      // Update the service request status and assign provider
      const updatedRequest = await storage.updateServiceRequest(requestId, {
        status: 'awarded',
        assignedServiceProviderId: serviceProviderId
      });
      
      // Update the bid status
      await storage.updateBid(bidId, {
        status: 'accepted'
      });
      
      // Get the service provider to send notification
      const serviceProvider = await storage.getUser(serviceProviderId);
      if (serviceProvider) {
        // Create notification for the service provider
        await storage.createNotification({
          userId: serviceProviderId,
          title: "Bid Accepted 🎉",
          message: `Your bid for the service request "${serviceRequest.description}" has been accepted! You have been awarded the project.`,
          type: "bid_accepted",
          priority: "high",
          relatedItemId: requestId,
          relatedItemType: "service_request",
          emoji: "🏆",
          actionUrl: `/service-requests/${requestId}`
        });
        
        // Create notification for the client
        if (serviceRequest.clientId) {
          await storage.createNotification({
            userId: serviceRequest.clientId,
            title: "Service Provider Assigned",
            message: `A service provider has been assigned to your request "${serviceRequest.description}"`,
            type: "request_awarded",
            priority: "high",
            relatedItemId: requestId,
            relatedItemType: "service_request",
            emoji: "✅",
            actionUrl: `/service-requests/${requestId}`
          });
        }
      }
      
      // Reject all other bids
      const otherBids = await storage.getBidsByServiceRequestId(requestId);
      for (const otherBid of otherBids) {
        if (otherBid.id !== bidId) {
          await storage.updateBid(otherBid.id, {
            status: 'rejected'
          });
          
          // Notify other bidders
          await storage.createNotification({
            userId: otherBid.serviceProviderId,
            title: "Bid Not Selected",
            message: `Your bid for the service request "${serviceRequest.description}" was not selected this time.`,
            type: "bid_rejected",
            priority: "low",
            relatedItemId: requestId,
            relatedItemType: "service_request",
            emoji: "ℹ️",
            actionUrl: `/service-requests/${requestId}`
          });
        }
      }
      
      return res.json({
        success: true,
        message: "Service request awarded successfully",
        serviceRequest: updatedRequest
      });
    } catch (error) {
      console.error("Error awarding service request:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Server error awarding service request" 
      });
    }
  });
  
  // Admin assign service provider to request
  app.patch("/api/direct-admin/service-requests/:requestId/assign", async (req, res) => {
    try {
      const { adminUsername, serviceProviderId, adminNotes } = req.body;
      const requestId = parseInt(req.params.requestId);
      
      // Verify admin access
      const admin = await storage.getUserByUsername(adminUsername);
      
      if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // Get the service request
      const request = await storage.getServiceRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Service request not found" });
      }
      
      // Verify service provider exists
      const serviceProvider = await storage.getUser(serviceProviderId);
      if (!serviceProvider) {
        return res.status(404).json({ message: "Service provider not found" });
      }
      
      if (serviceProvider.role !== 'service_provider') {
        return res.status(400).json({ message: "Selected user is not a service provider" });
      }
      
      // Update service request
      const updatedRequest = await storage.updateServiceRequest(requestId, {
        assignedServiceProviderId: serviceProviderId,
        status: 'assigned',
        adminNotes: adminNotes || null
      });
      
      // Create a notification for the service provider
      await storage.createNotification({
        userId: serviceProviderId,
        title: "New Assignment",
        message: `You've been assigned to service request #${requestId}`,
        type: "assignment",
        priority: "high",
        relatedItemId: requestId,
        relatedItemType: "service_request",
        emoji: "🔨",
        actionUrl: `/service-requests/${requestId}`
      });
      
      // Create a notification for the client
      await storage.createNotification({
        userId: request.clientId,
        title: "Service Provider Assigned",
        message: `A service provider has been assigned to your request #${requestId}`,
        type: "update",
        priority: "medium",
        relatedItemId: requestId,
        relatedItemType: "service_request",
        emoji: "👷",
        actionUrl: `/service-requests/${requestId}`
      });
      
      res.json(updatedRequest);
    } catch (error) {
      console.error("Admin assign service provider error:", error);
      res.status(500).json({ message: "Server error assigning service provider" });
    }
  });
  
  // Admin publish service request for bidding
  app.patch("/api/direct-admin/service-requests/:requestId/publish", async (req, res) => {
    try {
      const { adminUsername, adminNotes } = req.body;
      const requestId = parseInt(req.params.requestId);
      
      // Verify admin access
      const admin = await storage.getUserByUsername(adminUsername);
      
      if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // Get the service request
      const request = await storage.getServiceRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Service request not found" });
      }
      
      // Update service request
      const updatedRequest = await storage.updateServiceRequest(requestId, {
        status: 'bidding',
        adminNotes: adminNotes || null
      });
      
      // Get service providers for notifications
      const serviceProviders = await storage.getUsersByRole('service_provider');
      
      // Only notify service providers matching the service type
      const matchingProviders = serviceProviders.filter(provider => 
        !provider.serviceType || provider.serviceType === request.serviceType
      );
      
      // Create notifications for matching service providers
      for (const provider of matchingProviders) {
        await storage.createNotification({
          userId: provider.id,
          title: "New Bidding Opportunity",
          message: `A new ${request.serviceType} service request is available for bidding`,
          type: "bidding",
          priority: "medium",
          relatedItemId: requestId,
          relatedItemType: "service_request",
          emoji: "🔔",
          actionUrl: `/bidding/${requestId}`
        });
      }
      
      // Create a notification for the client
      await storage.createNotification({
        userId: request.clientId,
        title: "Request Published for Bidding",
        message: `Your request #${requestId} is now available for service providers to bid on`,
        type: "update",
        priority: "medium",
        relatedItemId: requestId,
        relatedItemType: "service_request",
        emoji: "📢",
        actionUrl: `/service-requests/${requestId}`
      });
      
      res.json(updatedRequest);
    } catch (error) {
      console.error("Admin publish service request error:", error);
      res.status(500).json({ message: "Server error publishing service request" });
    }
  });
  
  // Admin accept bid
  app.patch("/api/direct-admin/bids/:bidId/accept", async (req, res) => {
    try {
      const { adminUsername, serviceRequestId } = req.body;
      const bidId = parseInt(req.params.bidId);
      
      // Verify admin access
      const admin = await storage.getUserByUsername(adminUsername);
      
      if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // Get the bid
      const bid = await storage.getBid(bidId);
      if (!bid) {
        return res.status(404).json({ message: "Bid not found" });
      }
      
      // Get service request
      const request = await storage.getServiceRequest(serviceRequestId);
      if (!request) {
        return res.status(404).json({ message: "Service request not found" });
      }
      
      // Update bid status
      await storage.updateBid(bidId, { status: 'accepted' });
      
      // Update service request
      await storage.updateServiceRequest(serviceRequestId, {
        status: 'assigned',
        assignedServiceProviderId: bid.providerId
      });
      
      // Reject all other bids for this service request
      const otherBids = await storage.getBidsByServiceRequest(serviceRequestId);
      for (const otherBid of otherBids) {
        if (otherBid.id !== bidId && otherBid.status === 'pending') {
          await storage.updateBid(otherBid.id, { status: 'rejected' });
          
          // Notify other providers their bids were rejected
          await storage.createNotification({
            userId: otherBid.providerId,
            title: "Bid Not Selected",
            message: `Your bid for service request #${serviceRequestId} was not selected`,
            type: "bid_result",
            priority: "low",
            relatedItemId: serviceRequestId,
            relatedItemType: "service_request",
            emoji: "📋",
            actionUrl: `/bidding/${serviceRequestId}`
          });
        }
      }
      
      // Notify the winning provider
      await storage.createNotification({
        userId: bid.providerId,
        title: "Bid Accepted!",
        message: `Your bid for service request #${serviceRequestId} has been accepted`,
        type: "bid_result",
        priority: "high",
        relatedItemId: serviceRequestId,
        relatedItemType: "service_request",
        emoji: "🎉",
        actionUrl: `/service-requests/${serviceRequestId}`
      });
      
      // Notify the client
      await storage.createNotification({
        userId: request.clientId,
        title: "Service Provider Selected",
        message: `A service provider has been selected for your request #${serviceRequestId}`,
        type: "update",
        priority: "high",
        relatedItemId: serviceRequestId,
        relatedItemType: "service_request",
        emoji: "👷",
        actionUrl: `/service-requests/${serviceRequestId}`
      });
      
      res.json({ success: true, message: "Bid accepted successfully" });
    } catch (error) {
      console.error("Admin accept bid error:", error);
      res.status(500).json({ message: "Server error accepting bid" });
    }
  });
  
  // Admin reject bid
  app.patch("/api/direct-admin/bids/:bidId/reject", async (req, res) => {
    try {
      const { adminUsername, serviceRequestId } = req.body;
      const bidId = parseInt(req.params.bidId);
      
      // Verify admin access
      const admin = await storage.getUserByUsername(adminUsername);
      
      if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // Get the bid
      const bid = await storage.getBid(bidId);
      if (!bid) {
        return res.status(404).json({ message: "Bid not found" });
      }
      
      // Update bid status
      await storage.updateBid(bidId, { status: 'rejected' });
      
      // Notify the provider
      await storage.createNotification({
        userId: bid.providerId,
        title: "Bid Rejected",
        message: `Your bid for service request #${serviceRequestId} was rejected`,
        type: "bid_result",
        priority: "medium",
        relatedItemId: serviceRequestId,
        relatedItemType: "service_request",
        emoji: "📋",
        actionUrl: `/bidding/${serviceRequestId}`
      });
      
      res.json({ success: true, message: "Bid rejected successfully" });
    } catch (error) {
      console.error("Admin reject bid error:", error);
      res.status(500).json({ message: "Server error rejecting bid" });
    }
  });
  
  // Add debug auth route for testing user auth without login form
  app.get("/debug-auth/:username", async (req, res) => {
    try {
      const username = req.params.username;
      const user = await storage.getUserByUsername(username);
      if (user) {
        res.json({ 
          found: true, 
          id: user.id,
          username: user.username,
          role: user.role,
          points: user.points
        });
      } else {
        res.json({ found: false, message: `User ${username} not found` });
      }
    } catch (error) {
      res.status(500).json({ error: 'Error testing auth' });
    }
  });
  
  // Ensure storage has users for auth to work
  const users = await storage.getAllUsers();
  console.log(`Storage user count: ${users.length}`);
  console.log("Available users:", users.map(u => ({ 
    username: u.username, 
    id: u.id, 
    role: u.role 
  })));
  
  // If we still have no users, create them on-demand
  if (users.length === 0) {
    console.log("⚠️ No users found! Creating default users");
    await createDefaultUsers();
    console.log(`Storage user count after force creation: ${(await storage.getAllUsers()).length}`);
  }
  
  // Set up authentication routes
  console.log("Setting up authentication");
  setupAuth(app);
  
  // Import password utilities
  const { comparePasswords, hashPassword } = await import('./auth');
  
  // User profile and settings routes
  app.patch("/api/user/profile", requireAuth, async (req, res) => {
    const userId = req.user.id;
    const { fullName, email, phone, address, bio } = req.body;
    
    try {
      // Check if email is being changed and if it's already in use
      if (email && email !== req.user.email) {
        const existingUserWithEmail = await storage.getUserByEmail(email);
        if (existingUserWithEmail && existingUserWithEmail.id !== userId) {
          return res.status(400).json({ message: "Email is already in use by another account" });
        }
      }
      
      // Update user profile
      const updatedUser = await storage.updateUserProfile(userId, {
        fullName,
        email,
        phone,
        address,
        bio
      });
      
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
  
  // Change password endpoint
  app.post("/api/user/change-password", requireAuth, async (req, res) => {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    try {
      // Verify current password
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Compare current password
      const passwordMatch = await comparePasswords(currentPassword, user.password);
      
      if (!passwordMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Hash new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update password
      await storage.updateUserPassword(userId, hashedPassword);
      
      res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });
  
  // Apply our secure middleware to protect all endpoints
  console.log("Applying authentication middleware to protected routes");
  secureEndpoints(app);
  
  // Create test users function
  async function createDefaultUsers() {
    const passwordHash = "ea78bcccf63ed393ef98ba4d592e4a812c5818d22acaf9c1e4c55c41543d90efcbcd5a437cf676b5df75d4fc08b51ca449d73926a76adb425d4437c699cdee82.46a21c1553eb1c40";
    
    const defaultUsers = [
      {
        username: "client1",
        password: passwordHash,
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
        password: passwordHash,
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
        password: passwordHash,
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
        password: passwordHash,
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
    
    for (const userData of defaultUsers) {
      try {
        const createdUser = await storage.createUser(userData);
        console.log(`Created user ${userData.username} with ID ${createdUser.id}`);
      } catch (error) {
        console.error(`Failed to create user ${userData.username}:`, error);
      }
    }
  }

  // ===== User Routes =====
  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Return all users except the current user, with password fields removed for security
      const allUsers = await storage.getAllUsers();
      const filteredUsers = allUsers.map(({ password, ...user }) => user);
      res.json(filteredUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/companies", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Get all users with company role
      const companyUsers = await storage.getUsersByRole("company");
      // Remove password fields
      const filteredUsers = companyUsers.map(({ password, ...user }) => user);
      res.json(filteredUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });
  
  // Admin password reset endpoint
  app.post("/api/admin/reset-user-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Authentication required" });
    
    // Only admin users can reset passwords
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Admin privileges required for this action" });
    }
    
    const { userId, newPassword } = req.body;
    
    if (!userId || !newPassword) {
      return res.status(400).json({ message: "User ID and new password are required" });
    }
    
    try {
      // Get the user to verify they exist
      const user = await storage.getUser(parseInt(userId));
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update the user's password
      await storage.updateUserPassword(parseInt(userId), hashedPassword);
      
      // Log the password reset action
      console.log(`Admin user ${req.user!.username} (ID: ${req.user!.id}) reset password for user ${user.username} (ID: ${userId})`);
      
      return res.status(200).json({ 
        message: "Password reset successful",
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email
        }
      });
    } catch (error) {
      console.error("Error resetting user password:", error);
      return res.status(500).json({ message: "Failed to reset user password" });
    }
  });

  // ===== Project Routes =====
  app.get("/api/projects", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const userId = req.user!.id;
    const role = req.user!.role;
    
    try {
      let projects;
      if (role === "client") {
        projects = await storage.getProjectsByClientId(userId);
      } else if (role === "company") {
        projects = await storage.getProjectsByCompanyId(userId);
      } else if (role === "admin") {
        projects = await storage.getAllProjects();
      } else if (role === "service_provider") {
        // Get projects for service providers - they can see projects they're part of
        const assignedProjects = await storage.getProjectsByServiceProviderId(userId);
        
        // Fetch all projects to check for team membership
        const allProjects = await storage.getAllProjects();
        const teamMemberProjects = allProjects.filter(project => {
          // Parse team members if it's a string or use as is if it's already an array
          let teamMembers = [];
          if (project.teamMembers) {
            if (typeof project.teamMembers === 'string') {
              try {
                teamMembers = JSON.parse(project.teamMembers);
              } catch (e) {
                console.error("Error parsing team members:", e);
              }
            } else {
              teamMembers = project.teamMembers;
            }
          }
          
          // Check if user is a team member
          return teamMembers.some(member => 
            member.userId === userId || 
            (member.email && member.email === req.user!.email) ||
            (member.username && member.username === req.user!.username)
          );
        });
        
        // Combine assigned projects and team member projects, remove duplicates
        projects = [...assignedProjects];
        
        // Add team member projects if they're not already in the assigned projects
        teamMemberProjects.forEach(teamProject => {
          if (!projects.some(p => p.id === teamProject.id)) {
            // Cast to ExtendedProject to allow setting isTeamMember flag
            const extendedProject = teamProject as ExtendedProject;
            extendedProject.isTeamMember = true; // Mark as team member project
            projects.push(extendedProject);
          }
        });
      } else if (role === "supplier") {
        // Get projects for suppliers - they can see projects they're providing materials for
        projects = await storage.getProjectsBySupplier(userId);
      } else {
        console.log(`Unhandled role in projects fetch: ${role}`);
        // Instead of 403, return empty array to avoid breaking the UI
        return res.json([]);
      }
      
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Admin can access any project
      if (req.user!.role === "admin") {
        return res.json(project);
      }
      
      // Client can access their own projects
      if (req.user!.role === "client" && project.clientId === req.user!.id) {
        return res.json(project);
      }
      
      // Company can access projects assigned to them
      if (req.user!.role === "company" && project.companyId === req.user!.id) {
        return res.json(project);
      }
      
      // Service provider can access if they're a team member
      if (req.user!.role === "service_provider") {
        const isTeamMember = await storage.isProjectTeamMember(projectId, req.user!.id);
        if (isTeamMember) {
          return res.json(project);
        }
      }
      
      // Supplier can access if they're providing materials
      if (req.user!.role === "supplier") {
        // Check if supplier is providing materials for this project
        const isSupplier = await storage.isProjectSupplier(projectId, req.user!.id);
        if (isSupplier) {
          return res.json(project);
        }
      }
      
      // If we get here, the user doesn't have access
      return res.status(403).send("Unauthorized access");
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "client" && req.user!.role !== "service_provider" && req.user!.role !== "admin") {
      return res.status(403).send("Only clients, service providers, or administrators can create projects");
    }
    
    try {
      // For service providers creating a project, they need to specify a clientId
      let clientId = req.user!.id;
      
      if (req.user!.role === "service_provider" || req.user!.role === "admin") {
        // Service providers must specify a clientId
        if (!req.body.clientId) {
          return res.status(400).json({ message: "Client ID is required when service provider creates a project" });
        }
        
        // Verify the client exists
        const client = await storage.getUser(req.body.clientId);
        if (!client) {
          return res.status(404).json({ message: "Client not found" });
        }
        
        // Use the specified clientId instead of their own id
        clientId = req.body.clientId;
      }
      
      const validated = insertProjectSchema.parse({
        ...req.body,
        clientId
      });
      
      // Add default coordinates if not provided
      const projectData = {
        ...validated,
        coordinates: validated.coordinates || { lat: 37.7749, lng: -122.4194 },
        progress: 0,
        status: "active" // Project is active immediately without requiring approval
      };
      
      // Process attachments if any
      if (validated.attachments && Array.isArray(validated.attachments)) {
        // Validate each attachment has required fields
        projectData.attachments = validated.attachments.map(att => ({
          name: att.name,
          url: att.url,
          type: att.type,
          size: att.size
        }));
      }
      
      // Process team members if provided
      let validatedTeamMembers = [];
      
      if (validated.teamMembers && Array.isArray(validated.teamMembers)) {
        // Ensure team members have required fields
        for (const member of validated.teamMembers) {
          // Check if user exists in the system
          const userExists = await storage.getUserByUsername(member.username);
          if (userExists) {
            validatedTeamMembers.push({
              userId: userExists.id,
              username: userExists.username,
              role: member.role || 'member',
              addedAt: new Date()
            });
          }
        }
      }
      
      // If service provider is creating the project, add themselves as a team member automatically
      if (req.user!.role === "service_provider" && 
          !validatedTeamMembers.some(member => member.userId === req.user!.id)) {
        
        // Determine the appropriate role based on their service type
        const serviceType = req.user!.serviceType || '';
        let serviceProviderRole = 'contractor'; // Default role
        
        if (serviceType.includes('architect')) {
          serviceProviderRole = 'architect';
        } else if (serviceType.includes('engineer')) {
          serviceProviderRole = 'engineer';
        } else if (serviceType.includes('plumb')) {
          serviceProviderRole = 'plumber';
        } else if (serviceType.includes('electr')) {
          serviceProviderRole = 'electrician';
        } else if (serviceType.includes('carpen')) {
          serviceProviderRole = 'carpenter';
        } else if (serviceType.includes('mason')) {
          serviceProviderRole = 'mason';
        } else if (serviceType.includes('paint')) {
          serviceProviderRole = 'painter';
        } else if (serviceType.includes('inspect')) {
          serviceProviderRole = 'inspector';
        }
        
        // Add service provider to team members with appropriate role
        validatedTeamMembers.push({
          userId: req.user!.id,
          username: req.user!.username,
          role: serviceProviderRole,
          addedAt: new Date(),
          permissions: getPermissionsForRole(serviceProviderRole)
        });
      }
      
      projectData.teamMembers = validatedTeamMembers;
      
      const project = await storage.createProject(projectData);
      
      // Create a smart notification for the client that project was created
      await createProjectNotification({
        userId: req.user!.id,
        title: "Project Created",
        message: `Your project "${project.name}" has been created successfully.`,
        projectId: project.id,
        actionUrl: `/projects/${project.id}`
      }, "created");
      
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Project creation error:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Admin can update any project
      if (req.user!.role !== "admin") {
        // Validate permissions based on role
        if (req.user!.role === "client" && project.clientId !== req.user!.id) {
          return res.status(403).send("Unauthorized access");
        }
        
        if (req.user!.role === "company" && project.companyId !== req.user!.id) {
          return res.status(403).send("Unauthorized access");
        }
        
        // Check if service provider is a team member of this project
        if (req.user!.role === "service_provider") {
          const isTeamMember = await storage.isProjectTeamMember(projectId, req.user!.id);
          if (!isTeamMember) {
            return res.status(403).send("Unauthorized access: You are not a team member of this project");
          }
          
          // Service providers can update certain fields only - apply restrictions
          // Only allow status, progress, timeline entries, expenses updates
          const allowedFields = [
            'status', 'progress', 'timeline', 'expenses', 'notes',
            'budget', 'materials', 'tasks', 'completionPercentage'
          ];
          
          // Filter out unauthorized fields
          Object.keys(req.body).forEach(key => {
            if (!allowedFields.includes(key)) {
              delete req.body[key];
            }
          });
        }
      }
      
      // If changing status and is admin, create notification
      if (req.body.status && req.user!.role === "admin" && req.body.status !== project.status) {
        // Create smart notification for the client
        await createProjectNotification({
          userId: project.clientId,
          title: "Project Status Update",
          message: `Your project "${project.name}" status has been updated to ${req.body.status.replace('_', ' ')}`,
          projectId: project.id,
          actionUrl: `/projects/${project.id}`
        }, "updated");
      }
      
      const updatedProject = await storage.updateProject(projectId, req.body);
      res.json(updatedProject);
    } catch (error) {
      console.error("Project update error:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });
  
  // Add team members to a project
  app.post("/api/projects/:id/team", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.id);
      console.log(`Adding team member to project ${projectId}`);
      
      // Use direct database connection to avoid any ORM issues
      const { pool } = await import('./db');
      
      // Fetch project with direct SQL
      const projectResult = await pool.query(
        `SELECT * FROM projects WHERE id = $1`,
        [projectId]
      );
      
      if (projectResult.rows.length === 0) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const project = projectResult.rows[0];
      
      // Only client who owns the project or admin can add team members
      if (req.user!.role !== "admin" && (req.user!.role !== "client" || project.client_id !== req.user!.id)) {
        return res.status(403).json({ message: "Unauthorized access" });
      }
      
      const { username, role = 'member' } = req.body;
      console.log(`Attempting to add user ${username} with role ${role}`);
      
      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }
      
      // Check if user exists in the system with direct SQL
      const userResult = await pool.query(
        `SELECT * FROM users WHERE username = $1`,
        [username]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const userToAdd = userResult.rows[0];
      console.log(`Found user with ID: ${userToAdd.id}`);
      
      // Parse team members
      let teamMembers = [];
      if (project.team_members) {
        if (typeof project.team_members === 'string') {
          try {
            teamMembers = JSON.parse(project.team_members);
          } catch (e) {
            console.error("Error parsing team members:", e);
            teamMembers = [];
          }
        } else {
          teamMembers = project.team_members;
        }
      }
      
      // Ensure teamMembers is an array
      if (!Array.isArray(teamMembers)) {
        teamMembers = Object.values(teamMembers || {});
      }
      
      console.log(`Current team members:`, teamMembers);
      
      // Check if user is already a team member
      const isAlreadyMember = teamMembers.some((member: any) => 
        member && typeof member === 'object' && member.userId === userToAdd.id
      );
      
      if (isAlreadyMember) {
        return res.status(400).json({ message: "User is already a team member" });
      }
      
      // Auto-assign role based on user's platform role if no role was specified
      let assignedRole = role;
      
      if (!assignedRole || assignedRole === 'member') {
        // Automatically assign role based on the user's system role
        if (userToAdd.role === 'service_provider') {
          const serviceType = userToAdd.service_type || '';
          if (serviceType.includes('architect')) {
            assignedRole = 'architect';
          } else if (serviceType.includes('engineer')) {
            assignedRole = 'engineer';
          } else if (serviceType.includes('plumb')) {
            assignedRole = 'plumber';
          } else if (serviceType.includes('electr')) {
            assignedRole = 'electrician';
          } else if (serviceType.includes('carpen')) {
            assignedRole = 'carpenter';
          } else if (serviceType.includes('mason')) {
            assignedRole = 'mason';
          } else if (serviceType.includes('paint')) {
            assignedRole = 'painter';
          } else if (serviceType.includes('inspect')) {
            assignedRole = 'inspector';
          } else {
            assignedRole = 'contractor';
          }
        } else if (userToAdd.role === 'supplier') {
          assignedRole = 'supplier';
        } else if (userToAdd.role === 'admin') {
          assignedRole = 'supervisor';
        } else {
          assignedRole = 'collaborator';
        }
      }
      
      console.log(`Assigned role: ${assignedRole}`);
      
      // Add the new team member
      const newTeamMember = {
        userId: userToAdd.id,
        username: userToAdd.username,
        role: assignedRole,
        joinedAt: new Date().toISOString(),
        permissions: getPermissionsForRole(assignedRole)
      };
      
      // Add to team members array
      teamMembers.push(newTeamMember);
      
      // Update the project with the new team member using direct SQL
      const updateResult = await pool.query(
        `UPDATE projects 
         SET team_members = $1 
         WHERE id = $2
         RETURNING *`,
        [JSON.stringify(teamMembers), projectId]
      );
      
      if (updateResult.rows.length === 0) {
        throw new Error("Failed to update project with new team member");
      }
      
      const updatedProject = updateResult.rows[0];
      
      // Create notification for the added team member
      await pool.query(
        `INSERT INTO notifications 
         (user_id, title, message, type, priority, emoji, related_item_id, related_item_type, action_url) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userToAdd.id,
          "Added to Project Team",
          `You have been added to the project "${project.name}" as a ${assignedRole}`,
          "project_team",
          "high",
          "👷",
          projectId,
          "project",
          `/projects/${projectId}`
        ]
      );
      
      console.log(`Successfully added ${username} to project team`);
      
      res.status(200).json({
        message: `Successfully added ${username} to the project team`,
        project: updatedProject
      });
    } catch (error) {
      console.error("Add team member error:", error);
      res.status(500).json({ 
        message: "Failed to add team member",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Remove team member from a project
  app.delete("/api/projects/:id/team/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.id);
      const userIdToRemove = parseInt(req.params.userId);
      
      console.log(`Removing user ${userIdToRemove} from project ${projectId}`);
      
      // Use direct database connection to avoid any ORM issues
      const { pool } = await import('./db');
      
      // Fetch project with direct SQL
      const projectResult = await pool.query(
        `SELECT * FROM projects WHERE id = $1`,
        [projectId]
      );
      
      if (projectResult.rows.length === 0) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const project = projectResult.rows[0];
      
      // Only client who owns the project or admin can remove team members
      if (req.user!.role !== "admin" && (req.user!.role !== "client" || project.client_id !== req.user!.id)) {
        return res.status(403).json({ message: "Unauthorized access" });
      }
      
      // Parse team members
      let teamMembers = [];
      if (project.team_members) {
        if (typeof project.team_members === 'string') {
          try {
            teamMembers = JSON.parse(project.team_members);
          } catch (e) {
            console.error("Error parsing team members:", e);
            teamMembers = [];
          }
        } else {
          teamMembers = project.team_members;
        }
      }
      
      // Ensure teamMembers is an array
      if (!Array.isArray(teamMembers)) {
        teamMembers = Object.values(teamMembers || {});
      }
      
      if (teamMembers.length === 0) {
        return res.status(400).json({ message: "Project has no team members" });
      }
      
      console.log(`Current team members:`, teamMembers);
      
      // Find the team member to remove
      const memberIndex = teamMembers.findIndex((member: any) => 
        member && typeof member === 'object' && member.userId === userIdToRemove
      );
      
      if (memberIndex === -1) {
        return res.status(404).json({ message: "Team member not found" });
      }
      
      // Get the member we're removing
      const removedMember = teamMembers[memberIndex];
      console.log(`Removing team member:`, removedMember);
      
      // Remove the member
      teamMembers.splice(memberIndex, 1);
      
      // Update the project with the modified team members array using direct SQL
      const updateResult = await pool.query(
        `UPDATE projects 
         SET team_members = $1 
         WHERE id = $2
         RETURNING *`,
        [JSON.stringify(teamMembers), projectId]
      );
      
      if (updateResult.rows.length === 0) {
        throw new Error("Failed to update project after removing team member");
      }
      
      const updatedProject = updateResult.rows[0];
      
      // Create notification for the removed team member
      await pool.query(
        `INSERT INTO notifications 
         (user_id, title, message, type, priority, emoji, related_item_id, related_item_type, action_url) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userIdToRemove,
          "Removed from Project Team",
          `You have been removed from the project "${project.name}"`,
          "project_team",
          "high",
          "🚫",
          projectId,
          "project",
          "/"
        ]
      );
      
      console.log(`Successfully removed user ${userIdToRemove} from project team`);
      
      res.status(200).json({
        message: "Team member successfully removed",
        project: updatedProject
      });
    } catch (error) {
      console.error("Remove team member error:", error);
      res.status(500).json({ 
        message: "Failed to remove team member",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ===== Team Invitation Routes =====
  // Get project invitations
  app.get("/api/projects/:id/invitations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Validate permissions - only allow project owner or team members to view invitations
      const isTeamMember = project.teamMembers?.some((m: any) => m.userId === req.user!.id);
      const isProjectOwner = project.clientId === req.user!.id;
      const isAdmin = req.user!.role === "admin";
      
      if (!isProjectOwner && !isTeamMember && !isAdmin) {
        return res.status(403).json({ message: "You don't have permission to view project invitations" });
      }
      
      const invitations = await storage.getTeamInvitationsByProject(projectId);
      
      // Get base URL for constructing invitation links
      const baseUrl = process.env.BASE_URL || `http://${req.headers.host}`;
      
      // Add invitation links to each invitation
      const invitationsWithLinks = invitations.map(invitation => ({
        ...invitation,
        inviteLink: `${baseUrl}/join/${invitation.inviteToken}`
      }));
      
      res.json(invitationsWithLinks);
    } catch (error) {
      console.error("Error getting project invitations:", error);
      res.status(500).json({ message: "Error fetching project invitations" });
    }
  });
  
  // Create a team invitation
  app.post("/api/projects/:id/invitations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Only client who owns the project or admin can create invitations
      if (req.user!.role !== "admin" && (req.user!.role !== "client" || project.clientId !== req.user!.id)) {
        return res.status(403).send("Unauthorized access");
      }
      
      // Get email and role from request body
      const { inviteEmail, role } = req.body;
      
      if (!inviteEmail || !role) {
        return res.status(400).json({ message: "Email and role are required" });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inviteEmail)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      
      // Calculate invitation expiry date (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      // Generate permissions for the role
      const permissions = getPermissionsForRole(role);
      
      const invitationData = insertTeamInvitationSchema.parse({
        projectId,
        invitedByUserId: req.user!.id,
        inviteEmail: inviteEmail.toLowerCase(),
        role,
        inviteToken: uuidv4(),
        permissions,
        expiresAt
      });
      
      // Check if there's already a pending invitation for this email and project
      const existingInvitations = await storage.getTeamInvitationsByEmail(inviteEmail.toLowerCase());
      const pendingInvitation = existingInvitations.find(
        inv => inv.projectId === projectId && inv.inviteStatus === "pending"
      );
      
      if (pendingInvitation) {
        return res.status(400).json({ 
          message: "An invitation has already been sent to this email for this project",
          invitation: pendingInvitation
        });
      }
      
      // Create the invitation
      const invitation = await storage.createTeamInvitation(invitationData);
      
      // Check if a user with this email already exists in the system
      const existingUsers = await storage.getAllUsers();
      const userWithEmail = existingUsers.find(user => 
        user.email && user.email.toLowerCase() === inviteEmail.toLowerCase()
      );
      
      if (userWithEmail) {
        // Create a smart notification for the user about the invitation
        await createSmartNotification({
          userId: userWithEmail.id,
          title: "New Team Invitation",
          message: `You have been invited to join project "${project.name}" as ${role}`,
          type: "invitation",
          relatedItemId: project.id,
          relatedItemType: "project",
          actionUrl: `/join/${invitation.inviteToken}`
        }, "sent");
      }
      
      // Send an email invitation regardless of whether the user exists in the system
      try {
        // Dynamically import email service to avoid circular dependencies
        const emailService = await import('./services/email');
        await emailService.sendTeamInvitationEmail(invitation, project.name);
        console.log(`Invitation email sent to ${inviteEmail}`);
      } catch (error) {
        console.error(`Failed to send invitation email to ${inviteEmail}:`, error);
        // Don't return an error to the client, as the invitation was still created
      }
      
      // Generate invitation details to return to client
      const invitationDetails = {
        ...invitation,
        projectName: project.name,
        invitationUrl: `/join/${invitation.inviteToken}`,
        projectId: project.id
      };
      
      res.status(201).json(invitationDetails);
    } catch (error) {
      console.error("Create invitation error:", error);
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });
  
  // Get invitations for a specific project with detailed links
  // This route replaces the basic invitations route above
  
  
  // Get invitations for current user
  app.get("/api/invitations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const invitations = await storage.getTeamInvitationsByEmail(req.user!.email);
      res.json(invitations);
    } catch (error) {
      console.error("Get user invitations error:", error);
      res.status(500).json({ message: "Failed to get invitations" });
    }
  });
  
  // Accept/decline invitation
  app.patch("/api/invitations/:code", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const inviteToken = req.params.code;
      const { action } = req.body;
      
      console.log(`Processing invitation ${action} with token: ${inviteToken}`);
      
      if (action !== "accept" && action !== "decline") {
        return res.status(400).json({ message: "Invalid action. Must be 'accept' or 'decline'" });
      }
      
      // Use direct database connection to avoid any ORM issues
      const { pool } = await import('./db');
      
      // Fetch invitation with direct SQL
      const invitationResult = await pool.query(
        `SELECT i.*, p.name as project_name, p.client_id, p.team_members
         FROM team_invitations i
         LEFT JOIN projects p ON i.project_id = p.id
         WHERE i.invite_token = $1`,
        [inviteToken]
      );
      
      if (invitationResult.rows.length === 0) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      const invitation = invitationResult.rows[0];
      
      // Validate the invitation is for this user
      if (invitation.invite_email !== req.user!.email) {
        return res.status(403).json({ message: "This invitation was not sent to your email address" });
      }
      
      // Check if invitation is already processed
      if (invitation.invite_status !== "pending") {
        return res.status(400).json({ message: `This invitation has already been ${invitation.invite_status}` });
      }
      
      // Update status based on action
      const inviteStatus = action === "accept" ? "accepted" : "declined";
      
      // Update invitation status in database
      const updateResult = await pool.query(
        `UPDATE team_invitations 
         SET invite_status = $1, accepted_at = $2
         WHERE invite_token = $3
         RETURNING *`,
        [inviteStatus, action === "accept" ? new Date() : null, inviteToken]
      );
      
      if (updateResult.rows.length === 0) {
        throw new Error("Failed to update invitation status");
      }
      
      const updatedInvitation = updateResult.rows[0];
      
      if (action === "accept") {
        console.log(`User ${req.user!.id} (${req.user!.username}) accepting invitation to project ${invitation.project_id}`);
        
        // Parse team members
        let teamMembers = [];
        if (invitation.team_members) {
          if (typeof invitation.team_members === 'string') {
            try {
              teamMembers = JSON.parse(invitation.team_members);
            } catch (e) {
              console.error("Error parsing team members:", e);
              teamMembers = [];
            }
          } else {
            teamMembers = invitation.team_members;
          }
        }
        
        // Ensure teamMembers is an array
        if (!Array.isArray(teamMembers)) {
          teamMembers = Object.values(teamMembers || {});
        }
        
        console.log(`Current team members:`, teamMembers);
        
        // Check if user is already a team member
        const isAlreadyMember = teamMembers.some((member: any) => 
          member && typeof member === 'object' && member.userId === req.user!.id
        );
        
        console.log(`Is user already a member? ${isAlreadyMember}`);
        
        if (!isAlreadyMember) {
          // Create new team member object
          const newMember = {
            userId: req.user!.id,
            username: req.user!.username,
            role: invitation.role,
            permissions: invitation.permissions || getPermissionsForRole(invitation.role),
            joinedAt: new Date().toISOString()
          };
          
          // Add user to team members array
          teamMembers.push(newMember);
          
          console.log(`Adding new team member:`, newMember);
          
          // Update the project with the new team member
          const projectUpdateResult = await pool.query(
            `UPDATE projects 
             SET team_members = $1 
             WHERE id = $2
             RETURNING *`,
            [JSON.stringify(teamMembers), invitation.project_id]
          );
          
          if (projectUpdateResult.rows.length === 0) {
            throw new Error("Failed to update project with new team member");
          }
          
          console.log(`Successfully updated project team members`);
          
          // Create notification for the project owner
          await pool.query(
            `INSERT INTO notifications 
             (user_id, title, message, type, priority, emoji, related_item_id, related_item_type, action_url) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              invitation.client_id,
              "Team Invitation Accepted",
              `${req.user!.username} has accepted your invitation to join "${invitation.project_name}" as ${invitation.role}`,
              "invitation",
              "high",
              "✅",
              invitation.project_id,
              "project",
              `/projects/${invitation.project_id}`
            ]
          );
        }
      } else {
        // Declined invitation
        console.log(`User ${req.user!.id} (${req.user!.username}) declining invitation to project ${invitation.project_id}`);
        
        // Create notification for the project owner about declined invitation
        await pool.query(
          `INSERT INTO notifications 
           (user_id, title, message, type, priority, emoji, related_item_id, related_item_type, action_url) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            invitation.client_id,
            "Team Invitation Declined",
            `${req.user!.username} has declined your invitation to join "${invitation.project_name}" as ${invitation.role}`,
            "invitation",
            "medium",
            "❌",
            invitation.project_id,
            "project",
            `/projects/${invitation.project_id}`
          ]
        );
      }
      
      // Add project info for client-side redirection
      const response = {
        ...updatedInvitation,
        projectName: invitation.project_name,
        projectId: invitation.project_id
      };
      
      res.json(response);
    } catch (error) {
      console.error("Update invitation error:", error);
      res.status(500).json({ 
        message: "Failed to update invitation",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Get pending invitations for the current user
  app.get("/api/invitations/pending", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Authentication required" });
    
    try {
      const userEmail = req.user!.email;
      
      if (!userEmail) {
        return res.status(400).json({ message: "Your account doesn't have an email address configured" });
      }
      
      // Get all pending invitations for this user's email
      const { pool } = await import('./db');
      
      const result = await pool.query(
        `SELECT i.*, p.name as project_name, u.username as invited_by_username
         FROM team_invitations i
         LEFT JOIN projects p ON i.project_id = p.id
         LEFT JOIN users u ON i.invited_by_user_id = u.id
         WHERE i.invite_email = $1 AND i.invite_status = 'pending' AND i.expires_at > NOW()`,
        [userEmail]
      );
      
      // Convert to camelCase format for frontend
      const pendingInvitations = result.rows.map(row => ({
        id: row.id,
        projectId: row.project_id,
        projectName: row.project_name,
        invitedByUserId: row.invited_by_user_id,
        invitedByUsername: row.invited_by_username,
        inviteEmail: row.invite_email,
        role: row.role,
        inviteToken: row.invite_token,
        inviteStatus: row.invite_status,
        expiresAt: row.expires_at,
        createdAt: row.created_at
      }));
      
      res.json(pendingInvitations);
    } catch (error) {
      console.error("Error fetching pending invitations:", error);
      res.status(500).json({ message: "Failed to load pending invitations" });
    }
  });
  
  // Accept invitation by token (POST endpoint)
  app.post("/api/invitations/accept", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "You must be logged in to accept an invitation" });
    
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Invitation token is required" });
      }
      
      console.log("Processing invitation accept with token:", token);
      
      // Use direct database query to avoid ORM date conversion issues
      const { pool } = await import('./db');
      
      // Fetch invitation with project information in a single query
      const inviteResult = await pool.query(
        `SELECT i.*, p.name as project_name, p.client_id, p.team_members, p.id as project_id
         FROM team_invitations i
         LEFT JOIN projects p ON i.project_id = p.id
         WHERE i.invite_token = $1`,
        [token]
      );
      
      if (inviteResult.rows.length === 0) {
        console.log("No invitation found with token:", token);
        return res.status(404).json({ message: "Invitation not found or has expired" });
      }
      
      const invitation = inviteResult.rows[0];
      
      // Validate the invitation is for this user
      if (invitation.invite_email !== req.user!.email) {
        return res.status(403).json({ message: "This invitation was not sent to your email address" });
      }
      
      // Check if invitation is already processed
      if (invitation.invite_status !== "pending") {
        return res.status(400).json({ message: `This invitation has already been ${invitation.invite_status}` });
      }
      
      // Update invitation to accepted directly in database
      await pool.query(
        `UPDATE team_invitations 
         SET invite_status = 'accepted', accepted_at = NOW() 
         WHERE invite_token = $1`,
        [token]
      );
      
      // Handle team member addition
      let teamMembers = invitation.team_members || [];
      
      // Convert to array if it's still a string or object
      if (typeof teamMembers === 'string') {
        try {
          teamMembers = JSON.parse(teamMembers);
        } catch (e) {
          teamMembers = [];
        }
      }
      
      if (!Array.isArray(teamMembers)) {
        teamMembers = Object.values(teamMembers);
      }
      
      // Check if user is already a team member
      const isAlreadyMember = teamMembers.some((member: any) => 
        member && typeof member === 'object' && member.userId === req.user!.id
      );
      
      if (!isAlreadyMember) {
        // Add user to team members
        const newMember = {
          userId: req.user!.id,
          username: req.user!.username,
          role: invitation.role,
          permissions: invitation.permissions || getPermissionsForRole(invitation.role),
          joinedAt: new Date().toISOString()
        };
        
        teamMembers.push(newMember);
        
        // Update project with new team member using direct SQL
        await pool.query(
          `UPDATE projects 
           SET team_members = $1 
           WHERE id = $2`,
          [JSON.stringify(teamMembers), invitation.project_id]
        );
        
        // Create smart notification for the project owner using direct SQL
        await pool.query(
          `INSERT INTO notifications 
           (user_id, title, message, type, priority, emoji, related_item_id, related_item_type, action_url) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            invitation.client_id,
            "Team Member Joined",
            `${req.user!.username} has joined your project "${invitation.project_name}" as ${invitation.role}`,
            "project_team",
            "normal", // Still using normal priority as we can't easily use our smart service with SQL
            "👥", // Using a team-related emoji
            invitation.project_id,
            "project",
            `/projects/${invitation.project_id}`
          ]
        );
      }
      
      // Return success with project ID for redirection
      return res.status(200).json({ 
        success: true, 
        projectId: invitation.project_id,
        projectName: invitation.project_name
      });
    } catch (error) {
      console.error("Accept invitation error:", error);
      return res.status(500).json({ message: "Failed to accept invitation" });
    }
  });
  
  // Decline invitation by token (POST endpoint)
  app.post("/api/invitations/decline", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "You must be logged in to decline an invitation" });
    
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Invitation token is required" });
      }
      
      console.log("Processing invitation decline with token:", token);
      
      // Use direct database query to avoid ORM date conversion issues
      const { pool } = await import('./db');
      
      // Fetch invitation with project information in a single query
      const inviteResult = await pool.query(
        `SELECT i.*, p.name as project_name, p.client_id
         FROM team_invitations i
         LEFT JOIN projects p ON i.project_id = p.id
         WHERE i.invite_token = $1`,
        [token]
      );
      
      if (inviteResult.rows.length === 0) {
        console.log("No invitation found with token:", token);
        return res.status(404).json({ message: "Invitation not found or has expired" });
      }
      
      const invitation = inviteResult.rows[0];
      
      // Validate the invitation is for this user
      if (invitation.invite_email !== req.user!.email) {
        return res.status(403).json({ message: "This invitation was not sent to your email address" });
      }
      
      // Check if invitation is already processed
      if (invitation.invite_status !== "pending") {
        return res.status(400).json({ message: `This invitation has already been ${invitation.invite_status}` });
      }
      
      // Update invitation to declined directly in database
      await pool.query(
        `UPDATE team_invitations 
         SET invite_status = 'declined', accepted_at = NULL 
         WHERE invite_token = $1`,
        [token]
      );
      
      // Create notification for the project owner about declined invitation
      await pool.query(
        `INSERT INTO notifications 
         (user_id, title, message, type, priority, emoji, related_item_id, related_item_type, action_url) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          invitation.client_id,
          "Team Invitation Declined",
          `${req.user!.username} has declined your invitation to join "${invitation.project_name}" as ${invitation.role}`,
          "invitation",
          "medium",
          "❌",
          invitation.project_id,
          "project",
          `/projects/${invitation.project_id}`
        ]
      );
      
      // Return success 
      return res.status(200).json({ 
        success: true,
        message: "Invitation declined successfully" 
      });
    } catch (error) {
      console.error("Decline invitation error:", error);
      return res.status(500).json({ message: "Failed to decline invitation" });
    }
  });
  
  // Delete a pending invitation
  app.delete("/api/projects/:projectId/invitations/:invitationId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.projectId);
      const invitationId = parseInt(req.params.invitationId);
      
      if (isNaN(projectId) || isNaN(invitationId)) {
        return res.status(400).json({ message: "Invalid project ID or invitation ID" });
      }
      
      // Use direct database query to avoid ORM date conversion issues
      const { pool } = await import('./db');
      
      // Get the project first
      const projectResult = await pool.query(
        `SELECT * FROM projects WHERE id = $1`,
        [projectId]
      );
      
      if (projectResult.rows.length === 0) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const project = projectResult.rows[0];
      
      // Only project owner or admin can delete invitations
      const isOwner = project.client_id === req.user!.id;
      
      if (!isOwner && req.user!.role !== "admin") {
        return res.status(403).json({ message: "You don't have permission to delete project invitations" });
      }
      
      // Get the invitation first
      const invitationResult = await pool.query(
        `SELECT * FROM team_invitations WHERE id = $1 AND project_id = $2`,
        [invitationId, projectId]
      );
      
      if (invitationResult.rows.length === 0) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      const invitation = invitationResult.rows[0];
      
      // Only allow deletion of pending invitations
      if (invitation.invite_status !== "pending") {
        return res.status(400).json({ message: `Cannot delete invitation with status: ${invitation.invite_status}` });
      }
      
      // Delete the invitation
      await pool.query(
        `DELETE FROM team_invitations WHERE id = $1`,
        [invitationId]
      );
      
      // Return success
      res.status(200).json({ message: "Invitation deleted successfully" });
    } catch (error) {
      console.error("Error deleting project invitation:", error);
      res.status(500).json({ message: "Error deleting project invitation" });
    }
  });
  
  // Get all pending invitations for the current user
  app.get("/api/invitations/pending", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Authentication required" });
    
    try {
      const userEmail = req.user!.email;
      
      if (!userEmail) {
        return res.status(400).json({ message: "User email is required" });
      }
      
      // Use direct database query to avoid ORM date conversion issues
      const { pool } = await import('./db');
      
      // Fetch all pending invitations for the current user
      const result = await pool.query(
        `SELECT i.*, p.name as project_name, u.username as invited_by_username
         FROM team_invitations i
         LEFT JOIN projects p ON i.project_id = p.id
         LEFT JOIN users u ON i.invited_by_user_id = u.id
         WHERE i.invite_email = $1 AND i.invite_status = 'pending'
         ORDER BY i.created_at DESC`,
        [userEmail]
      );
      
      // Convert snake_case DB fields to camelCase for frontend
      const invitations = result.rows.map(row => ({
        id: row.id,
        projectId: row.project_id,
        projectName: row.project_name,
        invitedByUserId: row.invited_by_user_id,
        invitedByUsername: row.invited_by_username,
        inviteEmail: row.invite_email,
        inviteToken: row.invite_token,
        inviteStatus: row.invite_status,
        role: row.role,
        permissions: row.permissions,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        acceptedAt: row.accepted_at
      }));
      
      console.log(`Found ${invitations.length} pending invitations for ${userEmail}`);
      res.json(invitations);
    } catch (error) {
      console.error("Get pending invitations error:", error);
      res.status(500).json({ 
        message: "Failed to get pending invitations", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get invitation by code (for public access when checking an invitation)
  app.get("/api/invitations/:code", async (req, res) => {
    try {
      const inviteToken = req.params.code;
      console.log("Fetching invitation with token:", inviteToken);
      
      // Use direct database query to avoid ORM date conversion issues
      const { pool } = await import('./db');
      
      // Fetch invitation with project information in a single query
      const result = await pool.query(
        `SELECT i.*, p.name as project_name, u.username as invited_by_username
         FROM team_invitations i
         LEFT JOIN projects p ON i.project_id = p.id
         LEFT JOIN users u ON i.invited_by_user_id = u.id
         WHERE i.invite_token = $1`,
        [inviteToken]
      );
      
      if (result.rows.length === 0) {
        console.log("No invitation found with token:", inviteToken);
        return res.status(404).json({ message: "Invitation not found or has expired" });
      }
      
      // Convert snake_case DB fields to camelCase for frontend
      const row = result.rows[0];
      const invitationWithProject = {
        id: row.id,
        projectId: row.project_id,
        projectName: row.project_name,
        invitedByUserId: row.invited_by_user_id,
        invitedByUsername: row.invited_by_username,
        inviteEmail: row.invite_email,
        inviteToken: row.invite_token,
        inviteStatus: row.invite_status,
        role: row.role,
        permissions: row.permissions,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        acceptedAt: row.accepted_at
      };
      
      console.log("Successfully found invitation:", invitationWithProject.id);
      res.json(invitationWithProject);
    } catch (error) {
      console.error("Get invitation by code error:", error);
      res.status(500).json({ 
        message: "Failed to get invitation", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ===== Project Bidding Routes =====
  app.get("/api/projects/bidding", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Open projects that service providers can bid on
      const projects = await storage.getProjectsForBidding();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects for bidding" });
    }
  });
  
  app.get("/api/projects/:id/bids", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Access control: only project owner or admin can see all bids
      const role = req.user!.role;
      if (role !== "admin" && project.clientId !== req.user!.id) {
        // Service providers can only see their own bids
        if (role === "service_provider") {
          const ownBids = await storage.getProjectBidsByServiceProvider(req.user!.id);
          const projectBids = ownBids.filter(bid => bid.projectId === projectId);
          return res.json(projectBids);
        }
        return res.status(403).send("Unauthorized access");
      }
      
      const bids = await storage.getProjectBidsByProject(projectId);
      res.json(bids);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project bids" });
    }
  });
  
  app.post("/api/projects/:id/bids", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "service_provider") {
      return res.status(403).json({ message: "Only service providers can place bids on projects" });
    }
    
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.status !== "open_for_bids") {
        return res.status(400).json({ message: "This project is not open for bidding" });
      }
      
      // Get user points to validate if they have enough
      const userPoints = await storage.getUserPoints(req.user!.id);
      const pointsRequired = req.body.pointsUsed || 50; // Default 50 points per bid
      
      if (userPoints < pointsRequired) {
        return res.status(400).json({
          message: `Insufficient points. You have ${userPoints} points, but ${pointsRequired} are required to bid.`
        });
      }
      
      const bidData = insertProjectBidSchema.parse({
        ...req.body,
        projectId,
        serviceProviderId: req.user!.id,
        pointsUsed: pointsRequired,
        status: "pending"
      });
      
      const bid = await storage.createProjectBid(bidData);
      
      // Notify the project owner (client)
      const client = await storage.getUser(project.clientId);
      if (client) {
        const serviceProvider = req.user!;
        const notification = insertNotificationSchema.parse({
          userId: client.id,
          title: "New Project Bid",
          message: `${serviceProvider.fullName} has placed a bid on your project "${project.name}"`,
          type: "bid",
          priority: "high",
          relatedItemId: bid.id,
          relatedItemType: "bid",
          emoji: "🔨", // Construction/builder emoji
          actionUrl: `/projects/${project.id}/bids`
        });
        await storage.createNotification(notification);
      }
      
      // Also notify all admin users
      const admins = await storage.getUsersByRole("admin");
      for (const admin of admins) {
        const notification = insertNotificationSchema.parse({
          userId: admin.id,
          title: "New Project Bid",
          message: `${req.user!.fullName} has bid on project "${project.name}"`,
          type: "bid",
          priority: "normal",
          relatedItemId: bid.id,
          relatedItemType: "bid",
          emoji: "🔨", 
          actionUrl: `/admin/projects/${project.id}/bids`
        });
        await storage.createNotification(notification);
      }
      
      res.status(201).json(bid);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Failed to create bid" });
    }
  });
  
  app.patch("/api/projects/bids/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const bidId = parseInt(req.params.id);
      const bid = await storage.getProjectBid(bidId);
      
      if (!bid) {
        return res.status(404).json({ message: "Bid not found" });
      }
      
      // Get the associated project
      const project = await storage.getProject(bid.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Access control: only project owner or admin can update bid status
      const role = req.user!.role;
      if (role !== "admin" && project.clientId !== req.user!.id) {
        // Service providers can only update their own bids if status is pending
        if (role === "service_provider" && bid.serviceProviderId === req.user!.id && bid.status === "pending") {
          // Allow service providers to update or withdraw their own bids
          const updateData = { ...req.body };
          delete updateData.status; // Don't allow status changes from service provider
          
          if (req.body.withdraw === true) {
            // Special case for withdrawing a bid
            const updatedBid = await storage.updateProjectBid(bidId, { status: "withdrawn" });
            return res.json(updatedBid);
          }
          
          const updatedBid = await storage.updateProjectBid(bidId, updateData);
          return res.json(updatedBid);
        }
        return res.status(403).send("Unauthorized access");
      }
      
      // Admin or project owner can update any bid fields including status
      const updatedBid = await storage.updateProjectBid(bidId, req.body);
      
      // If bid is accepted, notify the service provider and update project
      if (req.body.status === "accepted" && bid.status !== "accepted") {
        // Update project status and assign company
        await storage.updateProject(project.id, {
          status: "in_progress",
          companyId: bid.serviceProviderId
        });
        
        // Notify the service provider
        const notification = insertNotificationSchema.parse({
          userId: bid.serviceProviderId,
          title: "Bid Accepted",
          message: `Your bid on project "${project.name}" has been accepted`,
          type: "bid",
          priority: "high",
          relatedItemId: bid.id,
          relatedItemType: "bid",
          emoji: "✅", 
          actionUrl: `/projects/${project.id}`
        });
        await storage.createNotification(notification);
        
        // Reject all other bids
        const otherBids = await storage.getProjectBidsByProject(project.id);
        for (const otherBid of otherBids) {
          if (otherBid.id !== bid.id && otherBid.status === "pending") {
            await storage.updateProjectBid(otherBid.id, { status: "rejected" });
            
            // Notify the service provider about rejection
            const rejectNotification = insertNotificationSchema.parse({
              userId: otherBid.serviceProviderId,
              title: "Bid Rejected",
              message: `Your bid on project "${project.name}" was not selected`,
              type: "bid",
              priority: "normal",
              relatedItemId: otherBid.id,
              relatedItemType: "bid",
              emoji: "❌", 
              actionUrl: `/projects/${project.id}`
            });
            await storage.createNotification(rejectNotification);
          }
        }
      }
      
      res.json(updatedBid);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to update bid" });
    }
  });
  
  // ===== Project Timeline Routes =====
  app.get("/api/projects/:id/timeline", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Validate permissions
      if (req.user!.role === "client" && project.clientId !== req.user!.id) {
        return res.status(403).send("Unauthorized access");
      }
      
      if (req.user!.role === "company" && project.companyId !== req.user!.id) {
        return res.status(403).send("Unauthorized access");
      }
      
      const timeline = await storage.getProjectTimelines(projectId);
      res.json(timeline);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project timeline" });
    }
  });

  app.post("/api/projects/:id/timeline", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Update permissions check to include all valid roles (client, service_provider, admin)
    const allowedRoles = ["service_provider", "client", "admin"];
    if (!allowedRoles.includes(req.user!.role)) {
      return res.status(403).send("You don't have permission to update project timeline");
    }
    
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if user has access to this project
      if (
        req.user!.role === "service_provider" && 
        project.companyId !== req.user!.id &&
        !await storage.isProjectTeamMember(projectId, req.user!.id)
      ) {
        return res.status(403).send("Unauthorized access to this project");
      }
      
      if (
        req.user!.role === "client" &&
        project.clientId !== req.user!.id &&
        !await storage.isProjectTeamMember(projectId, req.user!.id)
      ) {
        return res.status(403).send("Unauthorized access to this project");
      }
      
      // Process and properly format the date field before validation
      let formattedDate: Date;
      
      try {
        // Check if date is a string that needs parsing
        if (typeof req.body.date === 'string') {
          // Handle different date string formats
          if (req.body.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // ISO date string from date input (YYYY-MM-DD)
            formattedDate = new Date(req.body.date + 'T00:00:00');
          } else {
            // Other string formats
            formattedDate = new Date(req.body.date);
          }
          
          // Ensure the date is valid
          if (isNaN(formattedDate.getTime())) {
            throw new Error("Invalid date format");
          }
        } else if (req.body.date instanceof Date) {
          // Date is already a Date object
          formattedDate = req.body.date;
        } else {
          // Default to current date if no valid date
          formattedDate = new Date();
          console.log("Using current date as fallback");
        }
      } catch (error) {
        console.error("Date parsing error:", error);
        return res.status(400).json({ message: "Invalid date format. Please use YYYY-MM-DD format." });
      }
      
      console.log("Received date:", req.body.date);
      console.log("Formatted date:", formattedDate);
      
      // Prepare the data with the properly formatted date
      const timelineData = {
        ...req.body,
        projectId,
        date: formattedDate
      };
      
      // Validate and parse with zod schema
      const validated = insertProjectTimelineSchema.parse(timelineData);
      
      console.log("Validated data:", validated);
      
      const timelineEntry = await storage.createProjectTimeline(validated);
      
      // Update project progress if timeline entry includes it
      if (validated.completionPercentage) {
        await storage.updateProject(projectId, { progress: validated.completionPercentage });
      }
      
      res.status(201).json(timelineEntry);
    } catch (error) {
      console.error("Timeline entry error:", error);
      
      if (error instanceof z.ZodError) {
        console.log("Zod validation error:", error.errors);
        return res.status(400).json({ errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to create timeline entry: " + (error as Error).message });
    }
  });

  // ===== Materials Routes =====
  app.get("/api/materials", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const materials = await storage.getAllMaterials();
      res.json(materials);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch materials" });
    }
  });

  app.post("/api/materials", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "admin") {
      return res.status(403).send("Only admins can add materials");
    }
    
    try {
      const validated = insertMaterialSchema.parse(req.body);
      const material = await storage.createMaterial(validated);
      res.status(201).json(material);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create material" });
    }
  });

  // ===== Orders Routes =====
  app.get("/api/orders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user!.id;
      const role = req.user!.role;
      
      let orders;
      if (role === "client") {
        orders = await storage.getOrdersByClientId(userId);
      } else if (role === "admin") {
        orders = await storage.getAllOrders();
      } else {
        return res.status(403).send("Unauthorized role");
      }
      
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "client") {
      return res.status(403).send("Only clients can place orders");
    }
    
    try {
      // Generate order ID
      const year = new Date().getFullYear();
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const orderId = `ORD-${year}-${randomId}`;
      
      const validated = insertOrderSchema.parse({
        ...req.body,
        orderId,
        clientId: req.user!.id
      });
      
      const order = await storage.createOrder(validated);
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.patch("/api/orders/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "admin") {
      return res.status(403).send("Only admins can update order status");
    }
    
    try {
      const orderId = parseInt(req.params.id);
      const updatedOrder = await storage.updateOrder(orderId, req.body);
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  // ===== Messages Routes =====
  app.get("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user!.id;
      const messages = await storage.getMessagesByUserId(userId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const validated = insertMessageSchema.parse({
        ...req.body,
        senderId: req.user!.id
      });
      
      const role = req.user!.role;
      const receiverRole = req.body.receiverRole;
      
      // If client is messaging a service provider or vice versa, check if they're connected
      if ((role === "client" && receiverRole === "service_provider") || 
          (role === "service_provider" && receiverRole === "client")) {
        
        // Get receiverId to validate the connection
        const receiverId = validated.receiverId;
        const currentUserId = req.user!.id;
        
        // Check if these users are connected via a service request
        const allRequests = await storage.getAllServiceRequests();
        const connection = allRequests.find(request => 
          (request.clientId === currentUserId && request.assignedServiceProviderId === receiverId) || 
          (request.assignedServiceProviderId === currentUserId && request.clientId === receiverId)
        );
        
        if (!connection) {
          return res.status(403).json({ 
            message: "You can only message service providers/clients assigned to your requests" 
          });
        }
      }
      
      const message = await storage.createMessage(validated);
      
      // Add notification for the receiver
      await storage.createNotification({
        userId: validated.receiverId,
        title: "New Message",
        message: validated.content.length > 30 
          ? validated.content.substring(0, 30) + "..." 
          : validated.content,
        type: "message",
        priority: "normal",
        relatedItemId: message.id,
        relatedItemType: "message",
        emoji: "💬",
        actionUrl: "/messages"
      });
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
    }
  });

  app.patch("/api/messages/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const messageId = parseInt(req.params.id);
      const message = await storage.getMessage(messageId);
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      if (message.receiverId !== req.user!.id) {
        return res.status(403).send("Unauthorized access");
      }
      
      const updatedMessage = await storage.updateMessage(messageId, { read: true });
      res.json(updatedMessage);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // ===== Users Routes =====
  app.get("/api/users/companies", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const companies = await storage.getUsersByRole("company");
      res.json(companies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });
  
  app.get("/api/users/service-providers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const serviceProviders = await storage.getUsersByRole("service_provider");
      res.json(serviceProviders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch service providers" });
    }
  });
  
  app.get("/api/users/admins", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const admins = await storage.getUsersByRole("admin");
      res.json(admins);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admins" });
    }
  });
  
  app.get("/api/users/clients", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "admin" && req.user!.role !== "service_provider") {
      return res.status(403).send("Unauthorized role");
    }
    
    try {
      const clients = await storage.getUsersByRole("client");
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });
  
  // Get all users - needed for admin dashboard
  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "admin") {
      return res.status(403).send("Unauthorized role");
    }
    
    try {
      // Get all users
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  app.get("/api/users/assigned-contacts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user!.id;
      const role = req.user!.role;
      const allRequests = await storage.getAllServiceRequests();
      
      // Different logic based on user role
      if (role === "client") {
        // Get all service providers assigned to this client's requests
        const assignedServiceProviderIds = new Set<number>();
        
        allRequests
          .filter(request => request.clientId === userId && request.assignedServiceProviderId !== null)
          .forEach(request => {
            if (request.assignedServiceProviderId) {
              assignedServiceProviderIds.add(request.assignedServiceProviderId);
            }
          });
          
        // Get the actual user objects for these service providers
        const serviceProviders = await Promise.all(
          Array.from(assignedServiceProviderIds).map(id => storage.getUser(id))
        );
        
        res.json(serviceProviders.filter(Boolean)); // Filter out any undefined results
      } 
      else if (role === "service_provider") {
        // Get all clients whose requests this service provider is assigned to
        const clientIds = new Set<number>();
        
        allRequests
          .filter(request => request.assignedServiceProviderId === userId)
          .forEach(request => {
            clientIds.add(request.clientId);
          });
          
        // Get the actual user objects for these clients
        const clients = await Promise.all(
          Array.from(clientIds).map(id => storage.getUser(id))
        );
        
        res.json(clients.filter(Boolean)); // Filter out any undefined results
      }
      else {
        // For admins, return an empty array (they should be able to contact anyone)
        res.json([]);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assigned contacts" });
    }
  });

  // ===== Service Request Routes =====
  app.get("/api/service-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user!.id;
      const role = req.user!.role;
      
      let requests;
      if (role === "client") {
        requests = await storage.getServiceRequestsByClientId(userId);
      } else if (role === "admin") {
        requests = await storage.getAllServiceRequests();
      } else {
        return res.status(403).send("Unauthorized role");
      }
      
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch service requests" });
    }
  });

  app.get("/api/service-requests/assigned", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user!.id;
      const role = req.user!.role;
      
      let assignedRequests: Array<ServiceRequest> = [];
      
      if (role === "service_provider") {
        // Get requests assigned to this service provider
        const allRequests = await storage.getAllServiceRequests();
        assignedRequests = allRequests.filter(request => 
          request.assignedServiceProviderId === userId);
      } 
      else if (role === "client") {
        // Get client's requests that have been assigned to a service provider
        const clientRequests = await storage.getServiceRequestsByClientId(userId);
        assignedRequests = clientRequests.filter(request => 
          request.assignedServiceProviderId !== null);
      }
      
      res.json(assignedRequests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assigned service requests" });
    }
  });

  app.get("/api/service-requests/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const requestId = parseInt(req.params.id);
      const serviceRequest = await storage.getServiceRequest(requestId);
      
      if (!serviceRequest) {
        return res.status(404).json({ message: "Service request not found" });
      }
      
      // Check permission
      if (req.user!.role === "client" && serviceRequest.clientId !== req.user!.id) {
        return res.status(403).send("Unauthorized access");
      }
      
      res.json(serviceRequest);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch service request" });
    }
  });

  app.post("/api/service-requests", async (req, res) => {
    console.log("Service request submission received:", {
      authenticated: req.isAuthenticated ? req.isAuthenticated() : false,
      session: req.sessionID || "NO_SESSION",
      hasUser: !!req.user,
      user: req.user ? { id: req.user.id, role: req.user.role, username: req.user.username } : null,
      bodyKeys: Object.keys(req.body || {}),
      headers: {
        cookie: !!req.headers.cookie,
        'user-agent': req.headers['user-agent'] ? req.headers['user-agent'].substring(0, 30) + '...' : 'none'
      }
    });
    
    // Additional debug info
    console.log("Auth state details:", {
      isAuthFunction: typeof req.isAuthenticated === 'function',
      sessionID: req.sessionID,
      session: req.session ? 'exists' : 'missing',
      passportExists: req.session && 'passport' in req.session ? 'yes' : 'no',
      user: req.user ? `${(req.user as any).username}` : 'missing'
    });
    
    // If not authenticated, check for direct API credentials
    if (!req.user && req.body && req.body.directAuth) {
      const { userId, username } = req.body.directAuth;
      if (userId && username) {
        try {
          const user = await storage.getUser(userId);
          if (user && user.username === username) {
            console.log(`Direct authentication successful for user: ${username}`);
            // Add user to the request
            req.user = user;
          }
        } catch (error) {
          console.error("Direct authentication error:", error);
        }
      }
    }
    
    // Attempt to recover from auth issues
    if (req.session && 'passport' in req.session && (req.session as any).passport?.user && !req.user) {
      try {
        console.log("Attempting to recover user from passport data");
        const userId = (req.session as any).passport.user;
        if (typeof userId === 'number') {
          const user = await storage.getUser(userId);
          if (user) {
            console.log(`Recovered user ${user.username} (${user.id}) from passport data`);
            req.user = user;
          }
        }
      } catch (recoverError) {
        console.error("Failed to recover user from passport data:", recoverError);
      }
    }
    
    // Enhanced authentication check
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      console.log("Service request rejected: User not authenticated");
      return res.status(401).json({ message: "Authentication required", code: "AUTH_REQUIRED" });
    }
    
    if (req.user.role !== "client") {
      console.log(`Service request rejected: Invalid role - ${req.user.role}`);
      return res.status(403).json({ message: "Only clients can create service requests", code: "INVALID_ROLE" });
    }
    
    try {
      console.log("Service request data before validation:", {
        ...req.body,
        clientId: req.user!.id
      });
      
      const validated = insertServiceRequestSchema.parse({
        ...req.body,
        clientId: req.user!.id
      });
      
      console.log("Service request validated successfully");
      
      // Process request data
      const requestData = { ...validated };
      
      // Process attachments if any
      if (validated.attachments && Array.isArray(validated.attachments)) {
        // Validate each attachment has required fields
        requestData.attachments = validated.attachments.map(att => ({
          name: att.name,
          url: att.url,
          type: att.type,
          size: att.size
        }));
      }
      
      console.log("Creating service request in storage");
      const serviceRequest = await storage.createServiceRequest(requestData);
      console.log("Service request created successfully:", serviceRequest.id);
      
      // Get admin users to notify them
      const admins = await storage.getUsersByRole("admin");
      console.log(`Notifying ${admins.length} admins about new service request`);
      
      // Create notifications for all admins
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          title: "New Service Request",
          message: `New ${validated.serviceType} service request submitted`,
          type: "service_request",
          priority: "high",
          relatedItemId: serviceRequest.id,
          relatedItemType: "service_request",
          emoji: "🔔",
          actionUrl: `/service-requests/${serviceRequest.id}`
        });
      }

      console.log("Service request process completed successfully");
      res.status(201).json(serviceRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Service request validation error:", JSON.stringify(error.errors));
        return res.status(400).json({ 
          message: "Validation failed", 
          code: "VALIDATION_ERROR",
          errors: error.errors 
        });
      }
      
      console.error("Service request creation error:", error);
      res.status(500).json({ 
        message: "Failed to create service request", 
        code: "SERVER_ERROR",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.patch("/api/service-requests/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const requestId = parseInt(req.params.id);
      const serviceRequest = await storage.getServiceRequest(requestId);
      
      if (!serviceRequest) {
        return res.status(404).json({ message: "Service request not found" });
      }
      
      const role = req.user!.role;
      
      // Admin can update any field
      if (role === "admin") {
        const updatedRequest = await storage.updateServiceRequest(requestId, req.body);
        
        // If assigning a service provider, send notifications to both parties
        if (req.body.assignedServiceProviderId && 
            req.body.assignedServiceProviderId !== serviceRequest.assignedServiceProviderId) {
          
          // Notify the service provider
          await storage.createNotification({
            userId: req.body.assignedServiceProviderId,
            title: "New Service Request Assigned",
            message: `You've been assigned a new ${serviceRequest.serviceType} service request`,
            type: "service_request",
            priority: "high",
            relatedItemId: requestId,
            relatedItemType: "service_request",
            emoji: "🔔",
            actionUrl: `/service-requests/${requestId}`
          });
          
          // Notify the client
          await storage.createNotification({
            userId: serviceRequest.clientId,
            title: "Service Provider Assigned",
            message: `A service provider has been assigned to your request`,
            type: "service_request",
            priority: "normal",
            relatedItemId: requestId,
            relatedItemType: "service_request",
            emoji: "👷",
            actionUrl: `/service-requests/${requestId}`
          });
        }
        
        res.json(updatedRequest);
      } 
      // Service providers can only update status of requests assigned to them
      else if (role === "service_provider" && 
               serviceRequest.assignedServiceProviderId === req.user!.id &&
               req.body.status) {
        
        // Only allow status updates for service providers
        const updatedRequest = await storage.updateServiceRequest(requestId, {
          status: req.body.status
        });
        
        // Notify the client about status change
        await storage.createNotification({
          userId: serviceRequest.clientId,
          title: "Service Request Updated",
          message: `Your service request status has been updated to: ${req.body.status}`,
          type: "service_request",
          priority: "normal",
          relatedItemId: requestId,
          relatedItemType: "service_request",
          emoji: "📝",
          actionUrl: `/service-requests/${requestId}`
        });
        
        res.json(updatedRequest);
      } 
      else {
        return res.status(403).send("Unauthorized to update this service request");
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update service request" });
    }
  });

  // Batch publish service requests
  app.post("/api/service-requests/publish-all", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Only admin users can publish all requests
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Only administrators can publish all service requests" });
      }
      
      const { requestIds } = req.body;
      
      if (!Array.isArray(requestIds) || requestIds.length === 0) {
        return res.status(400).json({ message: "Request IDs must be provided as an array" });
      }
      
      const results = [];
      const errors = [];
      
      // Process each request
      for (const requestId of requestIds) {
        try {
          // Get the service request
          const serviceRequest = await storage.getServiceRequest(requestId);
          
          if (!serviceRequest) {
            errors.push({ id: requestId, error: "Service request not found" });
            continue;
          }
          
          // Skip if already published or completed
          if (serviceRequest.status === 'published' || 
              serviceRequest.status === 'completed' || 
              serviceRequest.status === 'in_progress') {
            results.push({ 
              id: requestId, 
              status: 'skipped', 
              message: `Already in status: ${serviceRequest.status}` 
            });
            continue;
          }
          
          // Update to published status
          const updatedRequest = await storage.updateServiceRequest(requestId, { status: 'published' });
          
          // Get all service providers with matching serviceType
          const providers = await storage.getServiceProviders(serviceRequest.serviceType);
          
          // Send a notification to each relevant provider
          for (const provider of providers) {
            await storage.createNotification({
              userId: provider.id,
              title: "New Service Request Available",
              message: `A new ${serviceRequest.serviceType} service request is available for bidding.`,
              type: "service_request",
              priority: "medium",
              relatedItemId: serviceRequest.id,
              relatedItemType: "service_request",
              emoji: "📋",
              read: false,
              actionUrl: `/service-requests/${serviceRequest.id}`
            });
          }
          
          results.push({ id: requestId, status: 'published', request: updatedRequest });
        } catch (error) {
          console.error(`Error publishing request ${requestId}:`, error);
          errors.push({ id: requestId, error: "Failed to publish" });
        }
      }
      
      res.json({
        success: true,
        published: results.filter(r => r.status === 'published').length,
        skipped: results.filter(r => r.status === 'skipped').length,
        errors: errors.length,
        results,
        errorDetails: errors
      });
    } catch (error) {
      console.error("Error batch publishing service requests:", error);
      res.status(500).json({ message: "Failed to publish service requests" });
    }
  });

  // Ultra-minimal admin publish page
  app.get("/admin-minimal", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Publish Service Requests | Artisans Ghana</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f9fafb;
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
    }
    
    @media (max-width: 600px) {
      body {
        padding: 16px;
      }
    }
    
    .container {
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      padding: 24px;
      width: 100%;
    }
    
    .header {
      margin-bottom: 24px;
      text-align: center;
    }
    
    h1 {
      color: #2a41e8;
      font-size: 1.8rem;
      margin-bottom: 8px;
    }
    
    @media (max-width: 480px) {
      h1 {
        font-size: 1.5rem;
      }
    }
    
    .subheader {
      color: #666;
      font-size: 1rem;
      margin-bottom: 24px;
    }
    
    .btn {
      display: block;
      width: 100%;
      background-color: #10B981;
      color: white;
      border: none;
      padding: 14px 20px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.2s;
      margin: 24px 0;
      box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
    }
    
    .btn:hover {
      background-color: #059669;
      box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
    }
    
    .btn:disabled {
      background-color: #94d3be;
      cursor: not-allowed;
    }
    
    .info-panel {
      background-color: #e0f2fe;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      border-left: 4px solid #0284c7;
    }
    
    .info-title {
      font-weight: bold;
      color: #075985;
      margin-bottom: 8px;
    }
    
    .result {
      display: none;
      padding: 16px;
      border-radius: 8px;
      margin-top: 24px;
      animation: fadeIn 0.3s;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .success {
      background-color: #d1fae5;
      border-left: 4px solid #059669;
    }
    
    .error {
      background-color: #fee2e2;
      border-left: 4px solid #dc2626;
    }
    
    .result-title {
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .success .result-title {
      color: #064e3b;
    }
    
    .error .result-title {
      color: #7f1d1d;
    }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-top: 16px;
    }
    
    .stat-item {
      background-color: white;
      border-radius: 6px;
      padding: 12px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    
    .stat-label {
      font-size: 0.85rem;
      color: #666;
    }
    
    .stat-value {
      font-weight: bold;
      font-size: 1.2rem;
      margin-top: 4px;
      color: #333;
    }
    
    .loader {
      display: none;
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 0.8s linear infinite;
      margin-right: 8px;
      vertical-align: middle;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* Footer */
    .footer {
      margin-top: 32px;
      text-align: center;
      font-size: 0.85rem;
      color: #666;
    }
    
    .footer a {
      color: #2a41e8;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Artisans Ghana Admin</h1>
      <div class="subheader">Service Request Publishing</div>
    </div>
    
    <div class="info-panel">
      <div class="info-title">What does this do?</div>
      <p>This tool publishes pending service requests to make them visible to service providers. After publishing, providers will receive notifications about requests matching their service type.</p>
    </div>
    
    <button id="publishBtn" class="btn">
      <span id="loader" class="loader"></span>
      <span id="btnText">Publish All Service Requests</span>
    </button>
    
    <div id="result" class="result">
      <!-- Results will appear here -->
    </div>
    
    <div class="footer">
      <a href="/">Return to dashboard</a>
    </div>
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const publishBtn = document.getElementById('publishBtn');
      const result = document.getElementById('result');
      const loader = document.getElementById('loader');
      const btnText = document.getElementById('btnText');
      
      publishBtn.addEventListener('click', function() {
        // Show loading state
        publishBtn.disabled = true;
        loader.style.display = 'inline-block';
        btnText.textContent = 'Publishing...';
        result.style.display = 'none';
        
        // Call the API
        fetch('/api/direct-publish-all-requests')
          .then(response => response.json())
          .then(data => {
            // Display results
            result.style.display = 'block';
            
            if (data.success === false) {
              result.className = 'result error';
              result.innerHTML = '<div class="result-title">Error</div>' +
                                '<p>' + data.message + '</p>';
            } else {
              result.className = 'result success';
              result.innerHTML = '<div class="result-title">Success</div>' +
                                '<p>' + data.message + '</p>';
              
              if (data.published !== undefined) {
                // Add stats grid for the results
                result.innerHTML += '<div class="stats">' +
                                    '<div class="stat-item"><div class="stat-label">Published</div><div class="stat-value">' + data.published + '</div></div>' +
                                    '<div class="stat-item"><div class="stat-label">Skipped</div><div class="stat-value">' + data.skipped + '</div></div>' +
                                    '<div class="stat-item"><div class="stat-label">Failed</div><div class="stat-value">' + data.errors + '</div></div>' +
                                    '<div class="stat-item"><div class="stat-label">Notifications</div><div class="stat-value">' + (data.notificationsSent || 0) + '</div></div>' +
                                  '</div>';
              }
            }
          })
          .catch(error => {
            // Handle errors
            result.style.display = 'block';
            result.className = 'result error';
            result.innerHTML = '<div class="result-title">Error</div>' +
                              '<p>Failed to publish service requests: ' + error.message + '</p>';
          })
          .finally(() => {
            // Reset button state
            publishBtn.disabled = false;
            loader.style.display = 'none';
            btnText.textContent = 'Publish All Service Requests';
          });
      });
    });
  </script>
</body>
</html>
    `);
  });
  
  // Keep the original endpoint too
  app.get("/admin-publish-all", (req, res) => {
    res.redirect("/admin-minimal");
  });
  
  // Super basic version
  app.get("/admin-publish", (req, res) => {
    res.send(`
      <html>
        <head>
          <title>Simple Publish</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h1>Publish Service Requests</h1>
          <p>Click the button below to publish all service requests:</p>
          <button 
            onclick="fetch('/api/direct-publish-all-requests').then(r=>r.json()).then(data=>{
              document.getElementById('result').innerHTML = 'Result: ' + data.message;
              document.getElementById('result').style.display = 'block';
            })"
            style="background: green; color: white; border: none; padding: 10px 20px; cursor: pointer; font-size: 16px; border-radius: 4px;"
          >
            Publish All Requests
          </button>
          <div id="result" style="margin-top: 20px; padding: 10px; border: 1px solid #ccc; display: none;"></div>
        </body>
      </html>
    `);
  });

  // Direct endpoint for publishing all service requests (for admin use)
  app.get("/api/direct-publish-all-requests", async (req, res) => {
    try {
      console.log("Direct publish all requests endpoint called");
      
      // Get all eligible service requests for publishing (pending or approved)
      const allRequests = await storage.getAllServiceRequests();
      const eligibleRequests = allRequests.filter(
        req => req.status === "pending_admin" || req.status === "approved"
      );
      
      if (eligibleRequests.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No eligible service requests found for publishing",
          published: 0,
          skipped: 0,
          errors: 0
        });
      }
      
      console.log(`Found ${eligibleRequests.length} eligible requests for publishing`);
      
      const results = [];
      const errors = [];
      let notificationCount = 0;
      
      // Get all service providers
      const serviceProviders = await storage.getServiceProviders();
      
      // Process each eligible request
      for (const request of eligibleRequests) {
        try {
          // Skip if already published
          if (request.status === "published") {
            results.push({
              id: request.id,
              status: "skipped",
              message: `Already in status: ${request.status}`
            });
            continue;
          }
          
          // Update to published status
          await storage.updateServiceRequest(request.id, { status: "published" });
          
          // Get service providers that match the service type
          const matchingProviders = !request.serviceType ? 
            serviceProviders : 
            serviceProviders.filter(
              provider => 
                provider.serviceType === request.serviceType || 
                !provider.serviceType // Include providers without specific type
            );
          
          // Send notification to each matching provider
          for (const provider of matchingProviders) {
            await storage.createNotification({
              userId: provider.id,
              title: "New Service Request Available",
              message: `A new ${request.serviceType || "service"} request is available for bidding`,
              type: "service_request",
              priority: "medium",
              relatedItemId: request.id,
              relatedItemType: "service_request",
              emoji: "📋",
              actionUrl: `/service-requests/${request.id}`
            });
            notificationCount++;
          }
          
          results.push({ 
            id: request.id, 
            status: "published", 
            serviceType: request.serviceType || "general"
          });
        } catch (error) {
          console.error(`Error publishing request ${request.id}:`, error);
          errors.push({ id: request.id, error: "Failed to publish" });
        }
      }
      
      console.log(`Successfully published ${results.filter(r => r.status === "published").length} service requests`);
      
      return res.status(200).json({
        success: true,
        message: `Published ${results.filter(r => r.status === "published").length} service requests`,
        published: results.filter(r => r.status === "published").length,
        skipped: results.filter(r => r.status === "skipped").length,
        errors: errors.length,
        notificationsSent: notificationCount,
        results,
        errorDetails: errors
      });
    } catch (error) {
      console.error("Error in direct publish all requests:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to publish service requests",
        error: error.message
      });
    }
  });

  // ===== Notifications Routes =====
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user!.id;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });
  
  app.get("/api/notifications/unread-count", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user!.id;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread notifications count" });
    }
  });
  
  app.post("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "admin") {
      return res.status(403).send("Only administrators can create notifications");
    }
    
    try {
      const validated = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(validated);
      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create notification" });
    }
  });
  
  app.patch("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const notificationId = parseInt(req.params.id);
      const notification = await storage.markNotificationAsRead(notificationId);
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });
  
  app.post("/api/notifications/mark-all-read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user!.id;
      await storage.markAllNotificationsAsRead(userId);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });
  
  app.delete("/api/notifications/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const notificationId = parseInt(req.params.id);
      await storage.deleteNotification(notificationId);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });
  
  // ===== Admin Communication Routes =====
  // Route to send direct message to admin
  app.post("/api/contact-admin", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // First, find all admin users
      const admins = await storage.getUsersByRole("admin");
      if (!admins.length) {
        return res.status(404).json({ message: "No admin users found" });
      }
      
      const { subject, message } = req.body;
      if (!subject || !message) {
        return res.status(400).json({ message: "Subject and message are required" });
      }
      
      const sender = req.user!;
      
      // Create a notification for each admin
      for (const admin of admins) {
        const notification = insertNotificationSchema.parse({
          userId: admin.id,
          title: `Message from ${sender.fullName}`,
          message: message.length > 50 ? message.substring(0, 50) + "..." : message,
          type: "contact_request",
          priority: "high",
          emoji: "📨", // Envelope emoji
          actionUrl: "/admin/messages"
        });
        
        await storage.createNotification(notification);
        
        // Also create a message record for direct conversation
        const messageRecord = insertMessageSchema.parse({
          senderId: sender.id,
          receiverId: admin.id,
          content: `${subject}\n\n${message}`,
          projectId: null,
        });
        
        await storage.createMessage(messageRecord);
      }
      
      res.status(201).json({ message: "Your message has been sent to the administrators" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to contact admin" });
    }
  });
  
  // Route for admin resource requests
  app.post("/api/admin-request", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // First, find all admin users
      const admins = await storage.getUsersByRole("admin");
      if (!admins.length) {
        return res.status(404).json({ message: "No admin users found" });
      }
      
      const { requestType, requestDetails } = req.body;
      if (!requestType || !requestDetails) {
        return res.status(400).json({ message: "Request type and details are required" });
      }
      
      const sender = req.user!;
      
      // Map the request type to a friendly name and emoji
      const requestTypeMap: Record<string, { name: string, emoji: string, priority: string }> = {
        "payment_issue": { 
          name: "Payment Issue", 
          emoji: "💰",
          priority: "high"
        },
        "account_help": { 
          name: "Account Help", 
          emoji: "🔑",
          priority: "normal" 
        },
        "technical_problem": { 
          name: "Technical Problem", 
          emoji: "🔧",
          priority: "high" 
        },
        "feature_request": { 
          name: "Feature Request", 
          emoji: "✨",
          priority: "low" 
        },
        "complaint": { 
          name: "Complaint",

          emoji: "⚠️",
          priority: "high" 
        },
        "other": { 
          name: "Other Request", 
          emoji: "📝",
          priority: "normal" 
        },
      };
      
      const requestInfo = requestTypeMap[requestType] || { name: "Request", emoji: "📝", priority: "normal" };
      
      // Create a notification for each admin
      for (const admin of admins) {
        const notification = insertNotificationSchema.parse({
          userId: admin.id,
          title: `${requestInfo.name} from ${sender.fullName}`,
          message: requestDetails.length > 50 ? requestDetails.substring(0, 50) + "..." : requestDetails,
          type: "admin_request",
          priority: requestInfo.priority,
          emoji: requestInfo.emoji,
          relatedItemId: sender.id,
          relatedItemType: "user",
          actionUrl: "/admin/requests"
        });
        
        await storage.createNotification(notification);
      }
      
      res.status(201).json({ 
        message: `Your ${requestInfo.name.toLowerCase()} has been submitted to the administrators` 
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to submit request" });
    }
  });
  
  // ===== Supplier Routes =====
  app.get("/api/suppliers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const suppliers = await storage.getAllSuppliers();
      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });
  
  app.get("/api/suppliers/active", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const suppliers = await storage.getActiveSuppliers();
      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active suppliers" });
    }
  });
  
  app.post("/api/suppliers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "admin") {
      return res.status(403).send("Only admins can add suppliers");
    }
    
    try {
      const validated = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(validated);
      res.status(201).json(supplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create supplier" });
    }
  });
  
  app.patch("/api/suppliers/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "admin") {
      return res.status(403).send("Only admins can update suppliers");
    }
    
    try {
      const supplierId = parseInt(req.params.id);
      const supplier = await storage.getSupplier(supplierId);
      
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      const updatedSupplier = await storage.updateSupplier(supplierId, req.body);
      res.json(updatedSupplier);
    } catch (error) {
      res.status(500).json({ message: "Failed to update supplier" });
    }
  });
  
  app.get("/api/suppliers/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const supplierId = parseInt(req.params.id);
      const supplier = await storage.getSupplier(supplierId);
      
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      res.json(supplier);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch supplier" });
    }
  });
  
  app.get("/api/suppliers/:id/materials", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const supplierId = parseInt(req.params.id);
      const materials = await storage.getMaterialsBySupplier(supplierId);
      res.json(materials);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch supplier materials" });
    }
  });
  
  // ===== User Skills Routes =====
  app.get("/api/skills", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const skill = req.query.skill as string | undefined;
      
      if (userId) {
        const skills = await storage.getUserSkills(userId);
        res.json(skills);
      } else if (skill) {
        const skills = await storage.getUserSkillsBySkill(skill);
        res.json(skills);
      } else {
        res.status(400).json({ message: "Either userId or skill query parameter is required" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch skills" });
    }
  });
  
  app.get("/api/skills/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const skillId = parseInt(req.params.id);
      const skill = await storage.getUserSkill(skillId);
      
      if (!skill) {
        return res.status(404).json({ message: "Skill not found" });
      }
      
      res.json(skill);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch skill" });
    }
  });
  
  app.post("/api/skills", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // If userId is not provided, use the authenticated user's ID
      if (!req.body.userId) {
        req.body.userId = req.user!.id;
      }
      
      // Only allow users to add skills for themselves or admin users to add for anyone
      if (req.body.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "You can only add skills for yourself" });
      }
      
      const validated = insertUserSkillSchema.parse(req.body);
      const newSkill = await storage.createUserSkill(validated);
      
      res.status(201).json(newSkill);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid skill data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create skill" });
    }
  });
  
  app.put("/api/skills/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const skillId = parseInt(req.params.id);
      const skill = await storage.getUserSkill(skillId);
      
      if (!skill) {
        return res.status(404).json({ message: "Skill not found" });
      }
      
      // Only allow users to update their own skills or admin users to update anyone's
      if (skill.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "You can only update your own skills" });
      }
      
      const updatedSkill = await storage.updateUserSkill(skillId, req.body);
      res.json(updatedSkill);
    } catch (error) {
      res.status(500).json({ message: "Failed to update skill" });
    }
  });
  
  app.delete("/api/skills/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const skillId = parseInt(req.params.id);
      const skill = await storage.getUserSkill(skillId);
      
      if (!skill) {
        return res.status(404).json({ message: "Skill not found" });
      }
      
      // Only allow users to delete their own skills or admin users to delete anyone's
      if (skill.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "You can only delete your own skills" });
      }
      
      await storage.deleteUserSkill(skillId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete skill" });
    }
  });
  
  // ===== Project Tasks Routes =====
  app.get("/api/projects/:projectId/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.projectId);
      const status = req.query.status as string | undefined;
      const phase = req.query.phase as string | undefined;
      
      let tasks;
      if (status) {
        tasks = await storage.getTasksByStatus(projectId, status);
      } else if (phase) {
        tasks = await storage.getTasksByPhase(projectId, phase);
      } else {
        tasks = await storage.getProjectTasks(projectId);
      }
      
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });
  
  app.get("/api/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : req.user!.id;
      
      // Users can only see their own tasks unless they're admin
      if (userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "You can only view your own tasks" });
      }
      
      const tasks = await storage.getTasksByUser(userId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });
  
  app.get("/api/tasks/requiring-skills", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const skills = req.query.skills as string[];
      
      if (!skills || !Array.isArray(skills) || skills.length === 0) {
        return res.status(400).json({ message: "Skills query parameter is required" });
      }
      
      const tasks = await storage.getTasksRequiringSkills(skills);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });
  
  app.get("/api/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });
  
  app.post("/api/projects/:projectId/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Verify project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if user has permission to create tasks for this project
      // Admins, clients, project managers, and team members with appropriate permissions can create tasks
      const isProjectClient = project.clientId === req.user!.id;
      const isAdmin = req.user!.role === "admin";
      
      // Check if user is a team member with task creation permission
      let isAuthorizedTeamMember = false;
      if (project.teamMembers && typeof project.teamMembers === 'object') {
        // Use type assertion to handle teamMembers properly
        const teamMembersArray = Array.isArray(project.teamMembers) 
          ? project.teamMembers 
          : Object.values(project.teamMembers as Record<string, any>);
        
        const teamMember = teamMembersArray.find(
          (member: any) => member.userId === req.user!.id
        );
        
        if (teamMember) {
          const memberRole = teamMember.role;
          const permissions = getPermissionsForRole(memberRole);
          isAuthorizedTeamMember = permissions.includes('create_timeline') || 
                                  permissions.includes('manage_team') ||
                                  permissions.includes('edit_project');
        }
      }
      
      if (!isProjectClient && !isAdmin && !isAuthorizedTeamMember) {
        return res.status(403).json({ message: "You don't have permission to create tasks for this project" });
      }
      
      // Set creator as the assignee if not specified
      if (!req.body.assignedByUserId) {
        req.body.assignedByUserId = req.user!.id;
      }
      
      // Parse and validate
      const taskData = insertProjectTaskSchema.parse({
        ...req.body,
        projectId
      });
      
      // Create the task
      const newTask = await storage.createTask(taskData);
      
      res.status(201).json(newTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });
  
  app.put("/api/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Get project to check permissions
      const project = await storage.getProject(task.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if user has permission to update this task
      const isProjectClient = project.clientId === req.user!.id;
      const isAdmin = req.user!.role === "admin";
      const isTaskAssignee = task.assignedToId === req.user!.id;
      const isTaskAssigner = task.assignedByUserId === req.user!.id;
      
      // Check if user is a team member with task update permission
      let isAuthorizedTeamMember = false;
      if (project.teamMembers && typeof project.teamMembers === 'object') {
        // Use type assertion to handle teamMembers properly
        const teamMembersArray = Array.isArray(project.teamMembers) 
          ? project.teamMembers 
          : Object.values(project.teamMembers as Record<string, any>);
        
        const teamMember = teamMembersArray.find(
          (member: any) => member.userId === req.user!.id
        );
        
        if (teamMember) {
          const memberRole = teamMember.role;
          const permissions = getPermissionsForRole(memberRole);
          isAuthorizedTeamMember = permissions.includes('create_timeline') || 
                                  permissions.includes('manage_team') ||
                                  permissions.includes('edit_project') ||
                                  permissions.includes('approve_changes');
        }
      }
      
      if (!isProjectClient && !isAdmin && !isTaskAssignee && !isTaskAssigner && !isAuthorizedTeamMember) {
        return res.status(403).json({ message: "You don't have permission to update this task" });
      }
      
      // Update the task
      const updatedTask = await storage.updateTask(taskId, req.body);
      
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task" });
    }
  });
  
  app.delete("/api/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Get project to check permissions
      const project = await storage.getProject(task.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Only project client, admin, or task assigner can delete tasks
      const isProjectClient = project.clientId === req.user!.id;
      const isAdmin = req.user!.role === "admin";
      const isTaskAssigner = task.assignedByUserId === req.user!.id;
      
      if (!isProjectClient && !isAdmin && !isTaskAssigner) {
        return res.status(403).json({ message: "You don't have permission to delete this task" });
      }
      
      await storage.deleteTask(taskId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });
  
  app.get("/api/tasks/:id/recommended-users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const recommendedUsers = await storage.getRecommendedUsersForTask(taskId);
      
      // Remove password field for security
      const filteredUsers = recommendedUsers.map(({ password, ...user }) => user);
      
      res.json(filteredUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get recommended users" });
    }
  });
  
  // ===== Site Materials Routes =====
  app.get("/api/projects/:projectId/site-materials", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.projectId);
      const siteMaterials = await storage.getSiteMaterials(projectId);
      
      // Enhance the response with material details
      const enhancedMaterials = await Promise.all(
        siteMaterials.map(async (material) => {
          const materialDetails = await storage.getMaterial(material.materialId);
          return {
            ...material,
            materialDetails: materialDetails || null
          };
        })
      );
      
      res.json(enhancedMaterials);
    } catch (error) {
      console.error("Error fetching site materials:", error);
      res.status(500).json({ message: "Failed to fetch site materials" });
    }
  });
  
  app.get("/api/site-materials/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const siteMaterial = await storage.getSiteMaterial(id);
      
      if (!siteMaterial) {
        return res.status(404).json({ message: "Site material not found" });
      }
      
      // Enhance with material details
      const materialDetails = await storage.getMaterial(siteMaterial.materialId);
      
      res.json({
        ...siteMaterial,
        materialDetails: materialDetails || null
      });
    } catch (error) {
      console.error("Error fetching site material:", error);
      res.status(500).json({ message: "Failed to fetch site material" });
    }
  });
  
  app.post("/api/projects/:projectId/site-materials", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Make sure project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Validate request body
      const validated = insertSiteMaterialSchema.parse({
        ...req.body,
        projectId
      });
      
      // Create site material
      const siteMaterial = await storage.createSiteMaterial(validated);
      
      // Fetch material details for enhanced response
      const materialDetails = await storage.getMaterial(siteMaterial.materialId);
      
      // Create notification for project team
      await createProjectNotification({
        projectId,
        title: "New Material on Site",
        message: `New material "${materialDetails?.name}" has been added to project site inventory`,
        type: "material",
        priority: "normal",
        emoji: "📦"
      });
      
      res.status(201).json({
        ...siteMaterial,
        materialDetails: materialDetails || null
      });
    } catch (error) {
      console.error("Error creating site material:", error);
      res.status(500).json({ message: "Failed to add site material" });
    }
  });
  

  
  app.patch("/api/site-materials/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      // Make sure site material exists
      const existingSiteMaterial = await storage.getSiteMaterial(id);
      if (!existingSiteMaterial) {
        return res.status(404).json({ message: "Site material not found" });
      }
      
      // Update site material
      const updatedSiteMaterial = await storage.updateSiteMaterial(id, updates);
      
      // Fetch material details for enhanced response
      const materialDetails = await storage.getMaterial(updatedSiteMaterial.materialId);
      
      // Create notification if quantity is updated
      if (updates.quantityAvailable !== undefined && 
          updates.quantityAvailable !== existingSiteMaterial.quantityAvailable) {
        await createProjectNotification({
          projectId: updatedSiteMaterial.projectId,
          title: "Site Material Updated",
          message: `Quantity of "${materialDetails?.name}" has been updated to ${updates.quantityAvailable} ${materialDetails?.unit}`,
          type: "material",
          priority: "low",
          emoji: "🔄"
        });
      }
      
      res.json({
        ...updatedSiteMaterial,
        materialDetails: materialDetails || null
      });
    } catch (error) {
      console.error("Error updating site material:", error);
      res.status(500).json({ message: "Failed to update site material" });
    }
  });
  
  app.delete("/api/site-materials/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      
      // Make sure site material exists
      const siteMaterial = await storage.getSiteMaterial(id);
      if (!siteMaterial) {
        return res.status(404).json({ message: "Site material not found" });
      }
      
      // Fetch material details before deleting
      const materialDetails = await storage.getMaterial(siteMaterial.materialId);
      
      // Delete site material
      await storage.deleteSiteMaterial(id);
      
      // Create notification
      await createProjectNotification({
        projectId: siteMaterial.projectId,
        title: "Site Material Removed",
        message: `"${materialDetails?.name}" has been removed from project site inventory`,
        type: "material",
        priority: "low",
        emoji: "🗑️"
      });
      
      res.status(200).json({ message: "Site material successfully deleted" });
    } catch (error) {
      console.error("Error deleting site material:", error);
      res.status(500).json({ message: "Failed to delete site material" });
    }
  });
  
  // Helper route to seed sample site materials for a project (for development)
  app.post("/api/projects/:projectId/seed-site-materials", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Make sure project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get all public materials for seed data
      const materials = await storage.getAllMaterials();
      if (materials.length === 0) {
        return res.status(400).json({ message: "No materials available for seeding" });
      }
      
      const sampleLocations = [
        "North side of site", 
        "Main storage area", 
        "Building foundation", 
        "Basement storage", 
        "Equipment shed",
        "South entrance"
      ];
      
      const sampleStatuses = ["available", "reserved", "depleted", "damaged"];
      
      // Create sample site materials (up to 5 materials)
      const maxSamples = Math.min(5, materials.length);
      const created = [];
      
      for (let i = 0; i < maxSamples; i++) {
        const material = materials[i];
        const quantity = Math.floor(Math.random() * 50) + 1;
        const location = sampleLocations[Math.floor(Math.random() * sampleLocations.length)];
        const status = sampleStatuses[Math.floor(Math.random() * sampleStatuses.length)];
        
        const siteMaterial = await storage.createSiteMaterial({
          projectId,
          materialId: material.id,
          quantity,
          unit: material.unit,
          location,
          status,
          notes: "Sample data for testing",
          addedBy: req.user.id
        });
        
        created.push({
          ...siteMaterial,
          materialDetails: material
        });
      }
      
      res.status(201).json(created);
    } catch (error) {
      console.error("Error seeding site materials:", error);
      res.status(500).json({ message: "Failed to seed site materials" });
    }
  });

  // ===== Task Comments Routes =====
  app.get("/api/tasks/:taskId/comments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const taskId = parseInt(req.params.taskId);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const comments = await storage.getTaskComments(taskId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });
  
  app.post("/api/tasks/:taskId/comments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const taskId = parseInt(req.params.taskId);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Add the authenticated user as the comment author
      const commentData = insertTaskCommentSchema.parse({
        ...req.body,
        taskId,
        userId: req.user!.id
      });
      
      const newComment = await storage.createTaskComment(commentData);
      res.status(201).json(newComment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create comment" });
    }
  });
  
  app.delete("/api/comments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const commentId = parseInt(req.params.id);
      
      // Only admins can delete comments or the user who created the comment
      // We'd need to get the comment first to check the user ID, but there's no getTaskComment method
      // Assuming only admins can delete comments for simplicity
      if (req.user!.role !== "admin") {
        return res.status(403).json({ message: "Only admins can delete comments" });
      }
      
      await storage.deleteTaskComment(commentId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });
  
  // ===== Inventory Routes =====
  app.get("/api/inventory", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const inventory = await storage.getAllInventory();
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });
  
  app.get("/api/inventory/available", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const materials = await storage.getAvailableMaterialsWithInventory();
      res.json(materials);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch available materials" });
    }
  });
  
  app.get("/api/inventory/material/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const materialId = parseInt(req.params.id);
      const inventory = await storage.getInventoryByMaterial(materialId);
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch material inventory" });
    }
  });
  
  // ===== Public Material APIs (accessible without authentication) =====
  
  // Get all available materials (for clients to browse) - PUBLIC ENDPOINT
  app.get("/api/materials/public", async (req, res) => {
    // This is a public API endpoint - no authentication required
    try {
      // Get all materials
      let allMaterials = await storage.getAllMaterials();
      
      // If no materials exist, create sample materials
      if (!allMaterials || allMaterials.length === 0) {
        console.log("No materials found. Creating sample materials...");
        
        // Find a supplier to link materials to, or create one if needed
        let suppliers = await storage.getAllSuppliers();
        let supplierId;
        
        // Create a default supplier if none exists
        if (!suppliers || suppliers.length === 0) {
          console.log("No suppliers found. Creating a default supplier...");
          
          // First find an admin user to link the supplier to
          const users = await storage.getAllUsers();
          const adminUser = users.find(user => user.role === "admin") || users[0];
          
          // Create default supplier
          const defaultSupplier = await storage.createSupplier({
            name: "Ghana Building Materials Ltd",
            description: "Leading supplier of quality construction materials in Ghana",
            contactEmail: "supplier@example.com",
            contactPhone: "+233 20 123 4567",
            address: "15 Industrial Road, Accra, Ghana",
            businessRegistrationNumber: "GBM-12345-2024",
            specialties: ["cement", "timber", "roofing", "electrical"],
            rating: 4.8,
            verificationStatus: "verified",
            userId: adminUser.id,
            active: true
          });
          
          supplierId = defaultSupplier.id;
          console.log(`Created default supplier with ID: ${supplierId}`);
          
          // Refresh suppliers
          suppliers = await storage.getAllSuppliers();
        } else {
          supplierId = suppliers[0].id;
          console.log(`Using existing supplier with ID: ${supplierId}`);
        }
        
        // Create sample materials
        const sampleMaterials = [
          {
            name: "GHACEM Super Strong Cement",
            description: "Premium Ghanaian Portland cement for durable foundations",
            category: "foundation",
            subcategory: "cement",
            price: 7500, // ₵75.00
            unit: "bag",
            inStock: true,
            reviewCount: 158,
            brand: "GHACEM",
            featured: true,
            imageUrl: "https://images.unsplash.com/photo-1517911478175-54994cca56d7?q=80&w=500",
            supplierId,
            weight: 50
          },
          {
            name: "Golden West Timber Planks",
            description: "High-quality timber planks for general construction",
            category: "lumber",
            subcategory: "timber",
            price: 12000, // ₵120.00
            unit: "piece",
            inStock: true,
            reviewCount: 82,
            brand: "Golden West",
            featured: false,
            imageUrl: "https://images.unsplash.com/photo-1501139083538-0139583c060f?q=80&w=500",
            supplierId,
            weight: 30
          },
          {
            name: "Kumasi Roofing Sheets",
            description: "Corrugated metal roofing sheets, weather-resistant with UV protection",
            category: "roofing",
            subcategory: "metal",
            price: 8500, // ₵85.00
            unit: "sheet",
            inStock: true,
            reviewCount: 46,
            brand: "Kumasi Metals",
            featured: true,
            imageUrl: "https://images.unsplash.com/photo-1622021211530-8c6af92d114b?q=80&w=500",
            supplierId,
            weight: 15
          },
          {
            name: "Tema Glass Premium Window Panes",
            description: "Clear tempered glass for windows and doors",
            category: "glass",
            subcategory: "window",
            price: 15000, // ₵150.00
            unit: "square meter",
            inStock: true,
            reviewCount: 34,
            brand: "Tema Glass",
            featured: false,
            imageUrl: "https://images.unsplash.com/photo-1553908839-cbe3e588536b?q=80&w=500",
            supplierId,
            weight: 25
          },
          {
            name: "Accra Plumbing PVC Pipes",
            description: "Heavy-duty PVC pipes for water supply systems",
            category: "plumbing",
            subcategory: "pipes",
            price: 3500, // ₵35.00
            unit: "piece",
            inStock: true,
            reviewCount: 127,
            brand: "Accra Plumbing",
            featured: true,
            imageUrl: "https://images.unsplash.com/photo-1534427840435-6531bfa887a0?q=80&w=500",
            supplierId,
            weight: 4
          },
          {
            name: "Akosombo Ceramic Floor Tiles",
            description: "Durable and elegant floor tiles for indoor use",
            category: "tiles",
            subcategory: "floor",
            price: 6000, // ₵60.00
            unit: "square meter",
            inStock: true,
            reviewCount: 92,
            brand: "Akosombo Ceramics",
            featured: true,
            imageUrl: "https://images.unsplash.com/photo-1585661034322-073a8f7a136d?q=80&w=500",
            supplierId,
            weight: 20
          },
          {
            name: "Ghana Steel Reinforcement Bars",
            description: "High-tensile steel bars for concrete reinforcement",
            category: "structure",
            subcategory: "reinforcement",
            price: 9500, // ₵95.00
            unit: "bar",
            inStock: true,
            reviewCount: 65,
            brand: "Ghana Steel",
            featured: false,
            imageUrl: "https://images.unsplash.com/photo-1603807617198-0876cb0c5681?q=80&w=500",
            supplierId,
            weight: 60
          },
          {
            name: "Takoradi Electric Wiring Set",
            description: "Complete electrical wiring kit for residential buildings",
            category: "electrical",
            subcategory: "wiring",
            price: 25000, // ₵250.00
            unit: "set",
            inStock: true,
            reviewCount: 38,
            brand: "Takoradi Electrics",
            featured: true,
            imageUrl: "https://images.unsplash.com/photo-1619032208107-4fa43191d0d7?q=80&w=500",
            supplierId,
            weight: 10
          }
        ];
        
        // Insert sample materials
        for (const material of sampleMaterials) {
          await storage.createMaterial(material);
        }
        
        // Get all materials again after adding samples
        allMaterials = await storage.getAllMaterials();
      }
      
      // Add supplier info to each material
      const materialsWithSupplierInfo = await Promise.all(
        allMaterials.map(async (material) => {
          const supplier = await storage.getSupplier(material.supplierId);
          return {
            ...material,
            supplierName: supplier ? supplier.name : null,
            supplierVerified: supplier ? supplier.verificationStatus === "verified" : false
          };
        })
      );
      
      res.json(materialsWithSupplierInfo);
    } catch (error) {
      console.error("Error in /api/materials/public:", error);
      res.status(500).json({ message: "Failed to fetch materials" });
    }
  });
  
  // Get material details by ID (public)
  app.get("/api/materials/public/:id", async (req, res) => {
    try {
      const materialId = parseInt(req.params.id);
      const material = await storage.getMaterial(materialId);
      
      if (!material) {
        return res.status(404).json({ message: "Material not found" });
      }
      
      // Get supplier info
      const supplier = await storage.getSupplier(material.supplierId);
      
      // Get inventory info
      const inventory = await storage.getInventoryByMaterial(materialId);
      
      res.json({
        ...material,
        supplierName: supplier ? supplier.name : null,
        supplierVerified: supplier ? supplier.verificationStatus === "verified" : false,
        inventory: inventory || []
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch material" });
    }
  });
  
  app.get("/api/inventory/supplier/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const supplierId = parseInt(req.params.id);
      const inventory = await storage.getInventoryBySupplier(supplierId);
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch supplier inventory" });
    }
  });

  // ===== Supplier Dashboard API Routes =====
  
  // Get supplier profile for the authenticated user
  app.get("/api/suppliers/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Check if user has supplier role
      if (req.user!.role !== "supplier") {
        return res.status(403).json({ message: "Only suppliers can access this resource" });
      }
      
      // Get supplier profile linked to the user
      const suppliers = await storage.getAllSuppliers();
      const supplier = suppliers.find(s => s.userId === req.user!.id);
      
      if (!supplier) {
        return res.status(404).json({ message: "Supplier profile not found" });
      }
      
      res.json(supplier);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch supplier profile" });
    }
  });
  
  // Get materials for the authenticated supplier
  app.get("/api/suppliers/materials", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Check if user has supplier role
      if (req.user!.role !== "supplier") {
        return res.status(403).json({ message: "Only suppliers can access this resource" });
      }
      
      // Get supplier profile linked to the user
      const suppliers = await storage.getAllSuppliers();
      const supplier = suppliers.find(s => s.userId === req.user!.id);
      
      if (!supplier) {
        return res.status(404).json({ message: "Supplier profile not found" });
      }
      
      // Get materials for this supplier
      const materials = await storage.getMaterialsBySupplier(supplier.id);
      res.json(materials);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch supplier materials" });
    }
  });
  
  // Add a new material
  app.post("/api/materials", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Check if user has supplier role
      if (req.user!.role !== "supplier") {
        return res.status(403).json({ message: "Only suppliers can add materials" });
      }
      
      // Get supplier ID for the authenticated user
      const suppliers = await storage.getAllSuppliers();
      const supplier = suppliers.find(s => s.userId === req.user!.id);
      
      if (!supplier) {
        return res.status(404).json({ message: "Supplier profile not found" });
      }
      
      // Add supplierId to the material data if not provided
      const materialData = {
        ...req.body,
        supplierId: req.body.supplierId || supplier.id
      };
      
      // Validate material data
      const validated = insertMaterialSchema.parse(materialData);
      
      // Create material
      const material = await storage.createMaterial(validated);
      
      // Create initial inventory record for this material
      await storage.createInventoryItem({
        materialId: material.id,
        supplierId: supplier.id,
        quantityAvailable: 0,
        status: "out_of_stock"
      });
      
      res.status(201).json(material);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create material" });
    }
  });
  
  // Get specific material with supplier verification
  app.get("/api/suppliers/materials/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Check if user has supplier role
      if (req.user!.role !== "supplier") {
        return res.status(403).json({ message: "Only suppliers can access this resource" });
      }
      
      // Get supplier profile linked to the user
      const suppliers = await storage.getAllSuppliers();
      const supplier = suppliers.find(s => s.userId === req.user!.id);
      
      if (!supplier) {
        return res.status(404).json({ message: "Supplier profile not found" });
      }
      
      // Get the material
      const materialId = parseInt(req.params.id);
      const material = await storage.getMaterial(materialId);
      
      if (!material) {
        return res.status(404).json({ message: "Material not found" });
      }
      
      // Verify material belongs to this supplier
      if (material.supplierId !== supplier.id) {
        return res.status(403).json({ message: "You don't have permission to access this material" });
      }
      
      res.json(material);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch material" });
    }
  });
  
  // Update material with supplier verification
  app.patch("/api/materials/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Check if user has supplier role
      if (req.user!.role !== "supplier" && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Only suppliers or admins can update materials" });
      }
      
      const materialId = parseInt(req.params.id);
      const material = await storage.getMaterial(materialId);
      
      if (!material) {
        return res.status(404).json({ message: "Material not found" });
      }
      
      // For suppliers, verify material belongs to them
      if (req.user!.role === "supplier") {
        // Get supplier profile linked to the user
        const suppliers = await storage.getAllSuppliers();
        const supplier = suppliers.find(s => s.userId === req.user!.id);
        
        if (!supplier) {
          return res.status(404).json({ message: "Supplier profile not found" });
        }
        
        if (material.supplierId !== supplier.id) {
          return res.status(403).json({ message: "You don't have permission to update this material" });
        }
      }
      
      // Update material
      const updatedMaterial = await storage.updateMaterial(materialId, req.body);
      res.json(updatedMaterial);
    } catch (error) {
      res.status(500).json({ message: "Failed to update material" });
    }
  });
  
  // Delete material with supplier verification
  app.delete("/api/materials/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Check if user has supplier role
      if (req.user!.role !== "supplier" && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Only suppliers or admins can delete materials" });
      }
      
      const materialId = parseInt(req.params.id);
      const material = await storage.getMaterial(materialId);
      
      if (!material) {
        return res.status(404).json({ message: "Material not found" });
      }
      
      // For suppliers, verify material belongs to them
      if (req.user!.role === "supplier") {
        // Get supplier profile linked to the user
        const suppliers = await storage.getAllSuppliers();
        const supplier = suppliers.find(s => s.userId === req.user!.id);
        
        if (!supplier) {
          return res.status(404).json({ message: "Supplier profile not found" });
        }
        
        if (material.supplierId !== supplier.id) {
          return res.status(403).json({ message: "You don't have permission to delete this material" });
        }
      }
      
      // Delete material
      await storage.deleteMaterial(materialId);
      
      // Also delete related inventory items
      await storage.deleteInventoryItemsByMaterial(materialId);
      
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete material" });
    }
  });
  
  // Get orders for supplier's materials
  app.get("/api/suppliers/orders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Check if user has supplier role
      if (req.user!.role !== "supplier") {
        return res.status(403).json({ message: "Only suppliers can access this resource" });
      }
      
      // Get supplier profile linked to the user
      const suppliers = await storage.getAllSuppliers();
      const supplier = suppliers.find(s => s.userId === req.user!.id);
      
      if (!supplier) {
        return res.status(404).json({ message: "Supplier profile not found" });
      }
      
      // Get all orders
      const allOrders = await storage.getAllOrders();
      
      // Get materials for this supplier
      const supplierMaterials = await storage.getMaterialsBySupplier(supplier.id);
      const supplierMaterialIds = supplierMaterials.map(m => m.id);
      
      // Filter orders that contain this supplier's materials
      const supplierOrders = allOrders.filter(order => {
        // Check if order items include any of this supplier's materials
        const items = order.items as { materialId: number; quantity: number; price: number }[];
        return items.some(item => supplierMaterialIds.includes(item.materialId));
      });
      
      res.json(supplierOrders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch supplier orders" });
    }
  });
  
  // Update inventory for a material
  app.patch("/api/inventory/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Check if user has supplier role
      if (req.user!.role !== "supplier" && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Only suppliers or admins can update inventory" });
      }
      
      const inventoryId = parseInt(req.params.id);
      const inventoryItem = await storage.getInventoryItem(inventoryId);
      
      if (!inventoryItem) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      // For suppliers, verify inventory belongs to them
      if (req.user!.role === "supplier") {
        // Get supplier profile linked to the user
        const suppliers = await storage.getAllSuppliers();
        const supplier = suppliers.find(s => s.userId === req.user!.id);
        
        if (!supplier) {
          return res.status(404).json({ message: "Supplier profile not found" });
        }
        
        if (inventoryItem.supplierId !== supplier.id) {
          return res.status(403).json({ message: "You don't have permission to update this inventory" });
        }
      }
      
      // Update inventory item
      const updatedItem = await storage.updateInventoryItem(inventoryId, {
        ...req.body,
        lastUpdated: new Date()
      });
      
      // If inventory is updated with zero quantity, update material inStock status
      if (req.body.quantityAvailable !== undefined) {
        const material = await storage.getMaterial(inventoryItem.materialId);
        if (material) {
          const updateStatus = req.body.quantityAvailable > 0 ? 
            { inStock: true } : 
            { inStock: false };
          
          await storage.updateMaterial(material.id, updateStatus);
        }
      }
      
      res.json(updatedItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to update inventory" });
    }
  });

  // ===== File Upload Routes =====
  // Ensure uploads directory exists with absolute path
  const uploadsDir = path.join(process.cwd(), 'public/uploads');
  if (!fs.existsSync(uploadsDir)) {
    console.log('Creating uploads directory:', uploadsDir);
    fs.mkdirSync(uploadsDir, { recursive: true });
  } else {
    console.log('Uploads directory exists at:', uploadsDir);
  }

  // Check if directory is writable
  try {
    const testFile = path.join(uploadsDir, 'test-write-access.txt');
    fs.writeFileSync(testFile, 'Testing write access');
    fs.unlinkSync(testFile);
    console.log('Uploads directory is writable.');
  } catch (error) {
    console.error('ERROR: Uploads directory is not writable:', error);
  }

  // Configure multer storage with absolute path
  const storageConfig = multer.diskStorage({
    destination: (req, file, cb) => {
      console.log('Upload request received for file:', file.originalname);
      console.log('Saving file to absolute path:', uploadsDir);
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
      console.log('Generated filename for upload:', uniqueFilename);
      cb(null, uniqueFilename);
    }
  });

  // File filter to validate file types
  const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Accept images, PDFs, and common document formats
    const validTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 
      'application/pdf',
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (validTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'));
    }
  };

  // Initialize multer upload with updated file size limit
  const upload = multer({ 
    storage: storageConfig,
    fileFilter: (req, file, cb) => {
      // Accept images, videos, PDFs, and common document formats
      const validTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 
        'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/3gpp', 'video/webm',
        'application/pdf',
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (validTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Only images, videos, PDFs, and documents are allowed.`));
      }
    },
    limits: {
      fileSize: 15 * 1024 * 1024, // Increased to 15MB to support videos
    }
  });
  
  // Endpoint for sending messages with image attachments
  app.post("/api/messages/with-images", upload.array('images', 5), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Check if required fields are present
      if (!req.body.content || !req.body.receiverId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Convert receiverId to number
      const receiverId = parseInt(req.body.receiverId);
      let projectId = null;
      
      if (req.body.projectId && !isNaN(parseInt(req.body.projectId))) {
        projectId = parseInt(req.body.projectId);
      }
      
      if (isNaN(receiverId)) {
        return res.status(400).json({ message: "Invalid receiverId" });
      }
      
      // Get uploaded images
      const files = req.files as Express.Multer.File[];
      const imageUrls: string[] = [];
      
      if (files && files.length > 0) {
        // Process each uploaded image
        files.forEach(file => {
          // Generate relative URL to the uploaded file
          const imageUrl = `/uploads/${file.filename}`;
          imageUrls.push(imageUrl);
        });
      }
      
      // Create message data
      const messageData = {
        senderId: req.user!.id,
        receiverId: receiverId,
        projectId: projectId,
        content: req.body.content,
        images: imageUrls
      };
      
      // Validate and create the message
      const validated = insertMessageSchema.parse(messageData);
      const message = await storage.createMessage(validated);
      
      // Add notification for the receiver with special handling for image messages
      await storage.createNotification({
        userId: receiverId,
        title: "New Message with Images",
        message: imageUrls.length === 1 
          ? "You received a message with an image" 
          : `You received a message with ${imageUrls.length} images`,
        type: "message",
        priority: "normal",
        relatedItemId: message.id,
        relatedItemType: "message",
        emoji: "📷",
        actionUrl: "/messages"
      });
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error in message with images upload:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Failed to send message with images" });
    }
  });

  // Test upload endpoint that doesn't require authentication
  app.post('/api/test-upload', upload.single('file'), (req, res) => {
    console.log('Test upload request received:', req.body);
    console.log('Test upload headers:', req.headers);
    
    try {
      if (!req.file) {
        console.error('No file in test-upload request:', req.body);
        return res.status(400).json({ message: 'No file uploaded' });
      }

      console.log('Test file uploaded successfully:', req.file);
      
      // Get the base URL dynamically
      const protocol = req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;
      
      // Check if file was saved
      if (!fs.existsSync(req.file.path)) {
        console.error('File does not exist after test upload at path:', req.file.path);
      } else {
        console.log('Test file successfully saved and verified at:', req.file.path);
      }
      
      // Create response with file details
      const fileDetails = {
        name: req.file.originalname,
        url: `${baseUrl}/uploads/${req.file.filename}`,
        path: req.file.path,
        type: req.file.mimetype,
        size: req.file.size
      };
      
      res.status(201).json({
        success: true,
        message: 'Test upload successful',
        fileDetails
      });
    } catch (error) {
      console.error('Test file upload error:', error);
      res.status(500).json({ message: 'Failed to upload test file', error: String(error) });
    }
  });

  // General file upload endpoint
  app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    console.log('Regular upload request received:', req.body);
    
    try {
      if (!req.file) {
        console.error('No file in regular upload request:', req.body);
        return res.status(400).json({ message: 'No file uploaded' });
      }

      console.log('Regular file uploaded successfully:', req.file);
      
      // Check if file was saved
      if (!fs.existsSync(req.file.path)) {
        console.error('File does not exist after regular upload at path:', req.file.path);
      } else {
        console.log('Regular file successfully saved and verified at:', req.file.path);
      }
      
      // Use relative URL instead of full URL with domain, as this is more reliable
      // Especially with domain changes or Replit deployments
      const url = `/uploads/${req.file.filename}`;
      
      console.log('Generated image URL for client:', url);
      
      // Create response with file details
      const fileDetails = {
        name: req.file.originalname,
        url: url,
        type: req.file.mimetype,
        size: req.file.size
      };
      
      res.status(201).json(fileDetails);
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ message: 'Failed to upload file' });
    }
  });
  
  // GET endpoint for project documents
  app.get('/api/projects/:projectId/documents', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const projectId = parseInt(req.params.projectId);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    try {
      // Get the project
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Check permission
      const isClient = req.user.id === project.clientId;
      const isTeamMember = project.teamMembers && Array.isArray(project.teamMembers) && 
        project.teamMembers.some((member: any) => member.userId === req.user.id);
      
      if (!isClient && !isTeamMember && req.user.role !== "admin") {
        return res.status(403).json({ message: 'You do not have permission to view documents for this project' });
      }
      
      // Format documents for frontend with necessary IDs
      const attachments = Array.isArray(project.attachments) ? project.attachments : [];
      const formattedDocuments = attachments.map((doc, index) => ({
        id: index + 1, // Generate IDs for documents if they don't have them
        name: doc.name || 'Unnamed Document',
        type: doc.type || 'document',
        url: doc.url,
        projectId: projectId,
        uploadedBy: doc.uploadedBy?.userId || req.user.id,
        createdAt: doc.uploadedAt || new Date().toISOString()
      }));
      
      res.json(formattedDocuments);
    } catch (error) {
      console.error('Error fetching project documents:', error);
      res.status(500).json({ message: 'Failed to fetch project documents' });
    }
  });
  
  // Project-specific file upload endpoint (for building plans and documents)
  app.post('/api/projects/:projectId/documents', upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const projectId = parseInt(req.params.projectId);
    
    // Make sure projectId is valid
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      // Get the project to check permissions
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Allow upload if user is the client or on the project team with contractor or project_manager role
      const isClient = req.user.id === project.clientId;
      const isTeamMember = project.teamMembers && Array.isArray(project.teamMembers) && 
        project.teamMembers.some((member: any) => 
          member.userId === req.user.id && 
          (member.role === "contractor" || member.role === "project_manager")
        );
        
      if (!isClient && !isTeamMember && req.user.role !== "admin") {
        return res.status(403).json({ message: 'You do not have permission to upload documents to this project' });
      }

      // Use relative URL instead of full URL with domain
      const url = `/uploads/${req.file.filename}`;
      console.log('Generated document URL for client:', url);
      
      // Get document type from the form
      const documentType = req.body.type || 'document';
      
      // Create file details with document type specified by the client
      const fileDetails = {
        name: req.body.name || req.file.originalname,
        url: url,
        type: documentType,
        size: req.file.size,
        uploadedBy: {
          userId: req.user.id,
          username: req.user.username,
          role: isClient ? "client" : "team"
        },
        uploadedAt: new Date().toISOString()
      };
      
      // Append to project attachments
      const attachments = Array.isArray(project.attachments) ? project.attachments : [];
      const updatedProject = await storage.updateProjectDocuments(projectId, [...attachments, fileDetails]);
      
      // Format the document for the response with an ID
      const documentWithId = {
        id: attachments.length + 1,
        name: fileDetails.name,
        type: fileDetails.type,
        url: fileDetails.url,
        projectId: projectId,
        uploadedBy: fileDetails.uploadedBy.userId,
        createdAt: fileDetails.uploadedAt
      };
      
      res.status(201).json({
        document: documentWithId,
        message: 'Document uploaded successfully'
      });
    } catch (error) {
      console.error('Project document upload error:', error);
      res.status(500).json({ message: 'Failed to upload document' });
    }
  });

  // Mobile-friendly video upload endpoint
  app.post('/api/projects/:projectId/video-upload', (req, res, next) => {
    console.log('📱 VIDEO UPLOAD ENDPOINT HIT');
    console.log('- Headers:', Object.keys(req.headers));
    console.log('- Content Type:', req.headers['content-type']);
    console.log('- Body Keys:', Object.keys(req.body || {}));
    console.log('- Has Files:', !!req.files);
    
    // Continue to multer for processing
    next();
  }, upload.single('video'), async (req, res) => {
    console.log('📱 VIDEO UPLOAD PROCESSING:');
    console.log('- Auth:', req.isAuthenticated());
    
    if (!req.isAuthenticated()) {
      console.log('Video upload: User not authenticated');
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        authenticated: false
      });
    }
    
    console.log('- User:', req.user.username, '(ID:', req.user.id, ')');
    const projectId = parseInt(req.params.projectId);
    
    if (isNaN(projectId)) {
      console.log('- Error: Invalid project ID:', req.params.projectId);
      return res.status(400).json({ 
        success: false,
        error: 'Invalid project ID',
        received: req.params.projectId
      });
    }
    
    console.log('- Project ID:', projectId);
    
    try {
      if (!req.file) {
        console.log('- Error: No video file in request');
        console.log('- Request body:', JSON.stringify(req.body));
        return res.status(400).json({
          success: false,
          error: 'No video received',
          requestBody: Object.keys(req.body || {}),
          contentType: req.headers['content-type']
        });
      }
      
      // If we made it here, we have a file - success!
      console.log('- Success! Video file received:', req.file.originalname);
      console.log('- Saved as:', req.file.filename);
      
      // Get the project
      const project = await storage.getProject(projectId);
      
      if (!project) {
        console.log('- Error: Project not found:', projectId);
        return res.status(404).json({ 
          success: false,
          error: 'Project not found', 
          projectId 
        });
      }
      
      // Create a relative URL for the video
      const url = `/uploads/${req.file.filename}`;
      console.log('- Video URL:', url);
      
      // Create the video details
      const videoDetails = {
        id: Date.now(),
        name: req.file.originalname,
        url: url,
        type: req.file.mimetype,
        size: req.file.size,
        mediaType: 'video',
        uploadedBy: {
          userId: req.user.id,
          username: req.user.username,
          role: req.user.role
        },
        uploadedAt: new Date().toISOString()
      };
      
      // Add the video to the project
      const videos = Array.isArray(project.videos) ? project.videos : [];
      const updatedProject = await storage.updateProject(projectId, {
        ...project,
        videos: [...videos, videoDetails]
      });
      
      // Return success response
      return res.status(201).json({
        success: true,
        message: 'Video uploaded successfully',
        videoDetails
      });
      
    } catch (error) {
      console.error('- Error in video upload:', error);
      return res.status(500).json({
        success: false,
        error: 'Server error processing video',
        message: error.message
      });
    }
  });

  // Mobile-friendly image upload endpoint for better iOS testing
  app.post('/api/projects/:projectId/mobile-upload', (req, res, next) => {
    console.log('📱 MOBILE UPLOAD ENDPOINT HIT');
    console.log('- Headers:', Object.keys(req.headers));
    console.log('- Content Type:', req.headers['content-type']);
    console.log('- Body Keys:', Object.keys(req.body || {}));
    console.log('- Has Files:', !!req.files);
    
    // Continue to multer for processing
    next(); 
  }, upload.single('image'), async (req, res) => {
    console.log('📱 MOBILE UPLOAD PROCESSING:');
    console.log('- Auth:', req.isAuthenticated());
    
    if (!req.isAuthenticated()) {
      console.log('Mobile upload: User not authenticated');
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        authenticated: false
      });
    }
    
    console.log('- User:', req.user.username, '(ID:', req.user.id, ')');
    const projectId = parseInt(req.params.projectId);
    
    if (isNaN(projectId)) {
      console.log('- Error: Invalid project ID:', req.params.projectId);
      return res.status(400).json({ 
        success: false,
        error: 'Invalid project ID',
        received: req.params.projectId
      });
    }
    
    console.log('- Project ID:', projectId);
    
    try {
      if (!req.file) {
        console.log('- Error: No file in request');
        console.log('- Request body:', JSON.stringify(req.body));
        return res.status(400).json({
          success: false,
          error: 'No image received',
          requestBody: Object.keys(req.body || {}),
          contentType: req.headers['content-type']
        });
      }
      
      // If we made it here, we have a file - success!
      console.log('- Success! File received:', req.file.originalname);
      console.log('- Saved as:', req.file.filename);
      
      // Get the project
      const project = await storage.getProject(projectId);
      
      if (!project) {
        console.log('- Error: Project not found:', projectId);
        return res.status(404).json({ 
          success: false,
          error: 'Project not found', 
          projectId 
        });
      }
      
      // Create a relative URL for the image
      const url = `/uploads/${req.file.filename}`;
      console.log('- Image URL:', url);
      
      // Create the image details
      const imageDetails = {
        id: Date.now(),
        name: req.file.originalname,
        url: url,
        type: req.file.mimetype,
        size: req.file.size,
        isMainImage: !project.mainImage,
        uploadedBy: {
          userId: req.user.id,
          username: req.user.username,
          role: req.user.role
        },
        uploadedAt: new Date().toISOString()
      };
      
      // Add the image to the project
      let updatedProject;
      if (imageDetails.isMainImage) {
        console.log('- Setting as main image');
        updatedProject = await storage.updateProject(projectId, {
          ...project,
          mainImage: imageDetails
        });
      } else {
        console.log('- Adding as additional image');
        const additionalImages = Array.isArray(project.additionalImages) ? project.additionalImages : [];
        updatedProject = await storage.updateProject(projectId, {
          ...project,
          additionalImages: [...additionalImages, imageDetails]
        });
      }
      
      // Return success response
      return res.status(201).json({
        success: true,
        message: 'Image uploaded successfully',
        imageDetails
      });
      
    } catch (error) {
      console.error('- Error in mobile upload:', error);
      return res.status(500).json({
        success: false,
        error: 'Server error processing image',
        message: error.message
      });
    }
  });

  // Project image upload endpoint
  app.post('/api/projects/:projectId/images', (req, res, next) => {
    // Debug middleware to log request details before multer processes it
    console.log('📷 IMAGE UPLOAD REQUEST RECEIVED:');
    console.log('- Headers:', Object.keys(req.headers));
    console.log('- Content Type:', req.headers['content-type']);
    console.log('- Body Fields:', Object.keys(req.body || {}));
    
    // Continue to multer middleware
    next();
  }, upload.single('image'), async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('User not authenticated for upload');
      return res.sendStatus(401);
    }
    
    console.log('Authenticated user for upload:', req.user.username, req.user.id);
    const projectId = parseInt(req.params.projectId);
    
    // Make sure projectId is valid
    if (isNaN(projectId)) {
      console.log('Invalid project ID:', req.params.projectId);
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    try {
      if (!req.file) {
        console.error('No file in request:', req.body);
        return res.status(400).json({ 
          message: 'No image uploaded',
          details: 'The image file was not properly included in the request'
        });
      }
      
      console.log('✅ File uploaded successfully:', req.file.filename);
      console.log('- File details:', {
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      });
      
      // Validate the file is an image
      if (!req.file.mimetype.startsWith('image/')) {
        console.log('Rejected file with invalid mimetype:', req.file.mimetype);
        return res.status(400).json({ message: 'Uploaded file is not an image' });
      }
      
      // Get the project to check permissions
      const project = await storage.getProject(projectId);
      
      if (!project) {
        console.log('Project not found:', projectId);
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Allow upload if user is the client or contractor
      const isClient = req.user.id === project.clientId;
      const isContractor = project.teamMembers && Array.isArray(project.teamMembers) && 
        project.teamMembers.some((member: any) => 
          member.userId === req.user.id && member.role === "contractor"
        );
        
      if (!isClient && !isContractor && req.user.role !== "admin") {
        console.log('Permission denied for upload. User role:', req.user.role);
        return res.status(403).json({ message: 'Only the client or contractor can upload project images' });
      }

      console.log('🖼️ File saved at:', req.file.path);
      
      // Verify file exists after upload
      if (!fs.existsSync(req.file.path)) {
        console.error('⚠️ ERROR: File does not exist after upload at path:', req.file.path);
        return res.status(500).json({ message: 'File upload failed - file not saved properly' });
      } else {
        console.log('✅ File successfully saved and verified at:', req.file.path);
      }
      
      // Use relative URL instead of full URL with domain
      const url = `/uploads/${req.file.filename}`;
      console.log('Generated project image URL for client:', url);
      
      // Create image details with relative URL
      const imageDetails = {
        id: Date.now(), // Generate a unique ID for the image
        name: req.file.originalname,
        url: url, // Use relative URL which is more reliable with domain changes
        type: req.file.mimetype,
        size: req.file.size,
        isMainImage: !project.mainImage, // Make it the main image if no main image exists
        uploadedBy: {
          userId: req.user.id,
          username: req.user.username,
          role: isClient ? "client" : "contractor"
        },
        uploadedAt: new Date().toISOString(),
        comments: [] // Initialize empty comments array
      };
      
      // Add project image
      // If this is set to be the main image, set it as project.mainImage
      // Otherwise, add it to project.additionalImages array
      let updatedProject;
      
      if (imageDetails.isMainImage) {
        updatedProject = await storage.updateProject(projectId, {
          ...project,
          mainImage: imageDetails
        });
      } else {
        const additionalImages = Array.isArray(project.additionalImages) ? project.additionalImages : [];
        updatedProject = await storage.updateProject(projectId, {
          ...project,
          additionalImages: [...additionalImages, imageDetails]
        });
      }
      
      res.status(201).json({
        imageDetails,
        message: 'Project image uploaded successfully'
      });
    } catch (error) {
      console.error('Project image upload error:', error);
      res.status(500).json({ message: 'Failed to upload project image' });
    }
  });
  
  // Update project main image
  app.put('/api/projects/:projectId/main-image', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const projectId = parseInt(req.params.projectId);
    const { imageIndex } = req.body;
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    if (imageIndex === undefined) {
      return res.status(400).json({ message: 'Image index is required' });
    }
    
    try {
      // Get the project to check permissions
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Allow change if user is the client or contractor
      const isClient = req.user.id === project.clientId;
      const isContractor = project.teamMembers && Array.isArray(project.teamMembers) && 
        project.teamMembers.some((member: any) => 
          member.userId === req.user.id && member.role === "contractor"
        );
        
      if (!isClient && !isContractor && req.user.role !== "admin") {
        return res.status(403).json({ message: 'Only the client or contractor can change the main project image' });
      }
      
      const additionalImages = Array.isArray(project.additionalImages) ? project.additionalImages : [];
      
      // If imageIndex is -1, we're removing the main image
      if (imageIndex === -1) {
        // Remove main image
        const updatedProject = await storage.updateProject(projectId, {
          ...project,
          mainImage: null
        });
        
        return res.status(200).json({
          message: 'Main project image removed successfully'
        });
      }
      
      // Check if imageIndex is valid
      if (imageIndex < 0 || imageIndex >= additionalImages.length) {
        return res.status(400).json({ message: 'Invalid image index' });
      }
      
      // Get the selected image
      const selectedImage = additionalImages[imageIndex];
      
      // Remove the selected image from additionalImages
      const newAdditionalImages = [
        ...additionalImages.slice(0, imageIndex),
        ...additionalImages.slice(imageIndex + 1)
      ];
      
      // If there was a previous main image, add it to additional images
      if (project.mainImage) {
        newAdditionalImages.push(project.mainImage);
      }
      
      // Update project with new main image and additional images
      const updatedProject = await storage.updateProject(projectId, {
        ...project,
        mainImage: selectedImage,
        additionalImages: newAdditionalImages
      });
      
      res.status(200).json({
        message: 'Main project image updated successfully'
      });
    } catch (error) {
      console.error('Update main project image error:', error);
      res.status(500).json({ message: 'Failed to update main project image' });
    }
  });
  
  // Delete project image
  app.delete('/api/projects/:projectId/images/:imageIndex', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const projectId = parseInt(req.params.projectId);
    const imageIndex = parseInt(req.params.imageIndex);
    const isMainImage = req.query.isMainImage === 'true';
    
    if (isNaN(projectId) || isNaN(imageIndex)) {
      return res.status(400).json({ message: 'Invalid project ID or image index' });
    }
    
    try {
      // Get the project to check permissions
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Allow deletion if user is the client or contractor
      const isClient = req.user.id === project.clientId;
      const isContractor = project.teamMembers && Array.isArray(project.teamMembers) && 
        project.teamMembers.some((member: any) => 
          member.userId === req.user.id && member.role === "contractor"
        );
        
      if (!isClient && !isContractor && req.user.role !== "admin") {
        return res.status(403).json({ message: 'Only the client or contractor can delete project images' });
      }
      
      if (isMainImage) {
        // Remove main image
        const updatedProject = await storage.updateProject(projectId, {
          ...project,
          mainImage: null
        });
      } else {
        const additionalImages = Array.isArray(project.additionalImages) ? project.additionalImages : [];
        
        // Check if imageIndex is valid
        if (imageIndex < 0 || imageIndex >= additionalImages.length) {
          return res.status(400).json({ message: 'Invalid image index' });
        }
        
        // Remove the image from additionalImages
        const newAdditionalImages = [
          ...additionalImages.slice(0, imageIndex),
          ...additionalImages.slice(imageIndex + 1)
        ];
        
        // Update project with new additional images
        const updatedProject = await storage.updateProject(projectId, {
          ...project,
          additionalImages: newAdditionalImages
        });
      }
      
      res.status(200).json({
        message: 'Project image deleted successfully'
      });
    } catch (error) {
      console.error('Delete project image error:', error);
      res.status(500).json({ message: 'Failed to delete project image' });
    }
  });
  
  // Add comment to project image
  app.post('/api/projects/:projectId/images/:imageId/comments', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const projectId = parseInt(req.params.projectId);
    const imageId = parseInt(req.params.imageId);
    const { comment } = req.body;
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    if (isNaN(imageId)) {
      return res.status(400).json({ message: 'Invalid image ID' });
    }
    
    if (!comment || typeof comment !== 'string' || comment.trim() === '') {
      return res.status(400).json({ message: 'Comment text is required' });
    }
    
    try {
      // Get the project
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Check if user is a team member or client for this project
      const isClient = req.user.id === project.clientId;
      const isTeamMember = project.teamMembers && Array.isArray(project.teamMembers) && 
        project.teamMembers.some((member: any) => member.userId === req.user.id);
        
      if (!isClient && !isTeamMember && req.user.role !== "admin") {
        return res.status(403).json({ message: 'You do not have permission to comment on this project' });
      }
      
      // Find the image
      let imageFound = false;
      let updatedProject = { ...project };
      
      // Prepare the comment object
      const newComment = {
        id: Date.now(),
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        text: comment.trim(),
        timestamp: new Date().toISOString()
      };
      
      // Check main image
      if (project.mainImage && project.mainImage.id === imageId) {
        imageFound = true;
        
        // Add comment to the main image
        const comments = Array.isArray(project.mainImage.comments) 
          ? [...project.mainImage.comments, newComment] 
          : [newComment];
        
        updatedProject.mainImage = {
          ...project.mainImage,
          comments
        };
      } 
      
      // If not found in main image, check additional images
      if (!imageFound && project.additionalImages && Array.isArray(project.additionalImages)) {
        const additionalImages = [...project.additionalImages];
        
        for (let i = 0; i < additionalImages.length; i++) {
          if (additionalImages[i].id === imageId) {
            imageFound = true;
            
            // Add comment to this image
            const comments = Array.isArray(additionalImages[i].comments) 
              ? [...additionalImages[i].comments, newComment] 
              : [newComment];
            
            additionalImages[i] = {
              ...additionalImages[i],
              comments
            };
            
            break;
          }
        }
        
        if (imageFound) {
          updatedProject.additionalImages = additionalImages;
        }
      }
      
      if (!imageFound) {
        return res.status(404).json({ message: 'Image not found in project' });
      }
      
      // Update the project
      await storage.updateProject(projectId, updatedProject);
      
      // Notify the image uploader if it's not the commenter
      if (project.mainImage && project.mainImage.id === imageId && 
          project.mainImage.uploadedBy && 
          project.mainImage.uploadedBy.userId !== req.user.id) {
        // Generate notification for main image owner
        await storage.createNotification({
          userId: project.mainImage.uploadedBy.userId,
          title: "New Comment on Your Project Image",
          message: `${req.user.username} commented on your image: "${comment.length > 20 ? comment.substring(0, 20) + '...' : comment}"`,
          type: "comment",
          priority: "normal", 
          relatedItemId: projectId,
          relatedItemType: "project_image",
          emoji: "💬",
          actionUrl: `/projects/${projectId}`
        });
      } else if (!imageFound && project.additionalImages) {
        // Find the image owner in additional images
        for (const img of project.additionalImages) {
          if (img.id === imageId && 
              img.uploadedBy && 
              img.uploadedBy.userId !== req.user.id) {
            // Generate notification for additional image owner
            await storage.createNotification({
              userId: img.uploadedBy.userId,
              title: "New Comment on Your Project Image",
              message: `${req.user.username} commented on your image: "${comment.length > 20 ? comment.substring(0, 20) + '...' : comment}"`,
              type: "comment",
              priority: "normal",
              relatedItemId: projectId,
              relatedItemType: "project_image",
              emoji: "💬",
              actionUrl: `/projects/${projectId}`
            });
            break;
          }
        }
      }
      
      res.status(201).json({
        message: 'Comment added successfully',
        comment: newComment
      });
    } catch (error) {
      console.error('Add image comment error:', error);
      res.status(500).json({ message: 'Failed to add comment to image' });
    }
  });

  // Site reports
  app.get('/api/projects/:projectId/reports', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const projectId = parseInt(req.params.projectId);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    try {
      // Get the project to check permissions
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Check if user is a team member, client, or admin for this project
      const isClient = req.user.id === project.clientId;
      const isTeamMember = project.teamMembers && Array.isArray(project.teamMembers) && 
        project.teamMembers.some((member: any) => member.userId === req.user.id);
        
      if (!isClient && !isTeamMember && req.user.role !== "admin") {
        return res.status(403).json({ message: 'You do not have permission to view reports for this project' });
      }
      
      // Get reports from storage
      const reports = project.siteReports || [];
      
      res.json(reports);
    } catch (error) {
      console.error('Get site reports error:', error);
      res.status(500).json({ message: 'Failed to get site reports' });
    }
  });
  
  app.post('/api/projects/:projectId/reports', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const projectId = parseInt(req.params.projectId);
    const { 
      title, 
      description, 
      date, 
      type, 
      weather, 
      workforcePresent, 
      materialsUsed, 
      equipmentUsed, 
      progressMade, 
      challenges, 
      actions, 
      safetyIncidents, 
      photos 
    } = req.body;
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }
    
    try {
      // Get the project to check permissions
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Check if user is a team member with contractor role, project manager, or admin
      const isTeamMember = project.teamMembers && Array.isArray(project.teamMembers) && 
        project.teamMembers.some((member: any) => 
          member.userId === req.user.id && 
          (member.role === "contractor" || member.role === "project_manager" || member.role === "inspector")
        );
        
      if (!isTeamMember && req.user.role !== "admin") {
        return res.status(403).json({ message: 'Only contractors, project managers, and inspectors can create site reports' });
      }
      
      // Generate a new report
      const newReport = {
        id: Date.now(),
        title,
        description,
        date: date || new Date().toISOString(),
        type: type || "general",
        weather: weather || null,
        workforcePresent: workforcePresent || null,
        materialsUsed: materialsUsed || null,
        equipmentUsed: equipmentUsed || null,
        progressMade: progressMade || null,
        challenges: challenges || null,
        actions: actions || null,
        safetyIncidents: safetyIncidents || null,
        photos: photos || [],
        createdBy: {
          userId: req.user.id,
          username: req.user.username,
          role: req.user.role
        },
        createdAt: new Date().toISOString(),
        comments: []
      };
      
      // Add the report to the project
      const existingReports = Array.isArray(project.siteReports) ? project.siteReports : [];
      const updatedProject = await storage.updateProject(projectId, {
        ...project,
        siteReports: [...existingReports, newReport]
      });
      
      // Notify the client
      if (project.clientId !== req.user.id) {
        await storage.createNotification({
          userId: project.clientId,
          title: "New Site Report",
          message: `A new site report "${title}" has been added to your project`,
          type: "project",
          priority: "normal",
          relatedItemId: projectId,
          relatedItemType: "project_report",
          emoji: "📋",
          actionUrl: `/projects/${projectId}`
        });
      }
      
      // Notify other team members
      if (project.teamMembers && Array.isArray(project.teamMembers)) {
        for (const member of project.teamMembers) {
          if (member.userId !== req.user.id) {
            await storage.createNotification({
              userId: member.userId,
              title: "New Site Report",
              message: `A new site report "${title}" has been added by ${req.user.username}`,
              type: "project",
              priority: "normal",
              relatedItemId: projectId,
              relatedItemType: "project_report",
              emoji: "📋",
              actionUrl: `/projects/${projectId}`
            });
          }
        }
      }
      
      res.status(201).json({
        message: 'Site report created successfully',
        report: newReport
      });
    } catch (error) {
      console.error('Create site report error:', error);
      res.status(500).json({ message: 'Failed to create site report' });
    }
  });
  
  app.post('/api/projects/:projectId/reports/:reportId/comments', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const projectId = parseInt(req.params.projectId);
    const reportId = parseInt(req.params.reportId);
    const { comment } = req.body;
    
    if (isNaN(projectId) || isNaN(reportId)) {
      return res.status(400).json({ message: 'Invalid project ID or report ID' });
    }
    
    if (!comment || typeof comment !== 'string' || comment.trim() === '') {
      return res.status(400).json({ message: 'Comment text is required' });
    }
    
    try {
      // Get the project
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Check if user is a team member, client, or admin for this project
      const isClient = req.user.id === project.clientId;
      const isTeamMember = project.teamMembers && Array.isArray(project.teamMembers) && 
        project.teamMembers.some((member: any) => member.userId === req.user.id);
        
      if (!isClient && !isTeamMember && req.user.role !== "admin") {
        return res.status(403).json({ message: 'You do not have permission to comment on this report' });
      }
      
      // Find the report
      let reportFound = false;
      let updatedProject = { ...project };
      
      if (!project.siteReports || !Array.isArray(project.siteReports)) {
        return res.status(404).json({ message: 'No reports found for this project' });
      }
      
      const reports = [...project.siteReports];
      
      for (let i = 0; i < reports.length; i++) {
        if (reports[i].id === reportId) {
          reportFound = true;
          
          // Create new comment
          const newComment = {
            id: Date.now(),
            userId: req.user.id,
            username: req.user.username,
            role: req.user.role,
            text: comment.trim(),
            timestamp: new Date().toISOString()
          };
          
          // Add comment to report
          const comments = Array.isArray(reports[i].comments) ? [...reports[i].comments, newComment] : [newComment];
          
          reports[i] = {
            ...reports[i],
            comments
          };
          
          break;
        }
      }
      
      if (!reportFound) {
        return res.status(404).json({ message: 'Report not found' });
      }
      
      // Update project with new report comments
      updatedProject.siteReports = reports;
      await storage.updateProject(projectId, updatedProject);
      
      // Notify the report creator if it's not the commenter
      const report = reports.find(r => r.id === reportId);
      if (report && report.createdBy && report.createdBy.userId !== req.user.id) {
        await storage.createNotification({
          userId: report.createdBy.userId,
          title: "New Comment on Your Site Report",
          message: `${req.user.username} commented on your report: "${comment.length > 20 ? comment.substring(0, 20) + '...' : comment}"`,
          type: "comment",
          priority: "normal",
          relatedItemId: projectId,
          relatedItemType: "project_report",
          emoji: "💬",
          actionUrl: `/projects/${projectId}`
        });
      }
      
      res.status(201).json({
        message: 'Comment added successfully'
      });
    } catch (error) {
      console.error('Add report comment error:', error);
      res.status(500).json({ message: 'Failed to add comment to report' });
    }
  });

  // Project expenses API endpoints
  app.get('/api/projects/:projectId/expenses', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const projectId = parseInt(req.params.projectId);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    try {
      console.log(`Fetching expenses for project ${projectId}`);
      
      // Use direct database connection to avoid any ORM issues
      const { pool } = await import('./db');
      
      // Fetch project with direct SQL
      const projectResult = await pool.query(
        `SELECT * FROM projects WHERE id = $1`,
        [projectId]
      );
      
      if (projectResult.rows.length === 0) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const project = projectResult.rows[0];
      
      // Check if user is the client, team member, or admin
      const isClient = req.user.id === project.client_id;
      
      // Parse team members
      let teamMembers = [];
      if (project.team_members) {
        if (typeof project.team_members === 'string') {
          try {
            teamMembers = JSON.parse(project.team_members);
          } catch (e) {
            console.error("Error parsing team members:", e);
            teamMembers = [];
          }
        } else {
          teamMembers = project.team_members;
        }
      }
      
      // Ensure teamMembers is an array
      if (!Array.isArray(teamMembers)) {
        teamMembers = Object.values(teamMembers || {});
      }
      
      const isTeamMember = teamMembers.some((member: any) => 
        member && typeof member === 'object' && member.userId === req.user.id
      );
      
      if (!isClient && !isTeamMember && req.user.role !== "admin") {
        return res.status(403).json({ message: 'You do not have permission to view expenses for this project' });
      }
      
      // Query expenses from project_expenses table
      const expensesResult = await pool.query(
        `SELECT pe.*, u.username as added_by_username 
         FROM project_expenses pe
         JOIN users u ON pe.added_by = u.id
         WHERE pe.project_id = $1
         ORDER BY pe.date DESC`,
        [projectId]
      );
      
      const expenses = expensesResult.rows;
      
      console.log(`Found ${expenses.length} expenses for project ${projectId}`);
      
      // Calculate totals by category
      const categories: { [key: string]: number } = {};
      let totalSpent = 0;
      
      for (const expense of expenses) {
        const category = expense.category || 'Other';
        const amount = typeof expense.amount === 'number' ? expense.amount : 0;
        
        if (!categories[category]) {
          categories[category] = 0;
        }
        
        categories[category] += amount;
        totalSpent += amount;
      }
      
      res.json({
        expenses,
        summary: {
          totalSpent,
          categories
        }
      });
    } catch (error) {
      console.error('Get project expenses error:', error);
      res.status(500).json({ 
        message: 'Failed to get project expenses',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.post('/api/projects/:projectId/expenses', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const projectId = parseInt(req.params.projectId);
    const { 
      title, 
      description, 
      amount, 
      date, 
      category, 
      paymentMethod, 
      vendor, 
      receiptImage, 
      invoiceNumber 
    } = req.body;
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    if (!title || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ message: 'Title and a valid amount are required' });
    }
    
    try {
      console.log(`Adding expense to project ${projectId}: ${title} - ${amount}`);
      
      // Use direct database connection to avoid any ORM issues
      const { pool } = await import('./db');
      
      // Get the project to check permissions
      const projectResult = await pool.query(
        `SELECT * FROM projects WHERE id = $1`,
        [projectId]
      );
      
      if (projectResult.rows.length === 0) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      const project = projectResult.rows[0];
      
      // Check if user is the client, admin, or has appropriate team role
      const isClient = req.user.id === project.client_id;
      
      // Parse team members
      let teamMembers = [];
      if (project.team_members) {
        if (typeof project.team_members === 'string') {
          try {
            teamMembers = JSON.parse(project.team_members);
          } catch (e) {
            console.error("Error parsing team members:", e);
            teamMembers = [];
          }
        } else {
          teamMembers = project.team_members;
        }
      }
      
      // Ensure teamMembers is an array
      if (!Array.isArray(teamMembers)) {
        teamMembers = Object.values(teamMembers || {});
      }
      
      const isTeamMember = teamMembers.some((member: any) => 
        member && typeof member === 'object' && member.userId === req.user.id &&
        (member.role === "contractor" || member.role === "project_manager")
      );
        
      if (!isClient && !isTeamMember && req.user.role !== "admin") {
        return res.status(403).json({ message: 'Only the client, contractor, or project manager can record expenses' });
      }
      
      // Insert into the project_expenses table
      const insertResult = await pool.query(
        `INSERT INTO project_expenses (
          project_id, 
          title, 
          amount, 
          category, 
          date, 
          description, 
          payment_method, 
          vendor, 
          invoice_number, 
          receipt_image,
          added_by
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        RETURNING *`,
        [
          projectId,
          title,
          amount,
          category || 'Other',
          date ? new Date(date) : new Date(),
          description || null,
          paymentMethod || null,
          vendor || null,
          invoiceNumber || null,
          receiptImage || null,
          req.user.id
        ]
      );
      
      if (insertResult.rows.length === 0) {
        throw new Error("Failed to insert new expense");
      }
      
      const newExpense = insertResult.rows[0];
      
      // Create notifications for team members and client using direct SQL
      // First, create notifications for team members
      for (const member of teamMembers) {
        if (member.userId !== req.user.id) {
          await pool.query(
            `INSERT INTO notifications 
             (user_id, title, message, type, priority, emoji, related_item_id, related_item_type, action_url) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              member.userId,
              "New Project Expense",
              `A new expense of ${amount.toLocaleString('en-US', { style: 'currency', currency: 'GHS', currencyDisplay: 'symbol' })} was recorded by ${req.user.username}`,
              "expense",
              "normal",
              "💰",
              projectId,
              "project_expense",
              `/projects/${projectId}`
            ]
          );
        }
      }
      
      // Notify client if they're not the one adding the expense
      if (!isClient && project.client_id !== req.user.id) {
        await pool.query(
          `INSERT INTO notifications 
           (user_id, title, message, type, priority, emoji, related_item_id, related_item_type, action_url) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            project.client_id,
            "New Project Expense",
            `A new expense of ${amount.toLocaleString('en-US', { style: 'currency', currency: 'GHS', currencyDisplay: 'symbol' })} was recorded by ${req.user.username}`,
            "expense",
            "high",
            "💰",
            projectId,
            "project_expense",
            `/projects/${projectId}`
          ]
        );
      }
      
      console.log(`Successfully added expense to project ${projectId}`);
      
      res.status(201).json({
        message: 'Expense recorded successfully',
        expense: newExpense
      });
    } catch (error) {
      console.error('Record expense error:', error);
      res.status(500).json({ 
        message: 'Failed to record expense',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.put('/api/projects/:projectId/expenses/:expenseId/approve', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const projectId = parseInt(req.params.projectId);
    const expenseId = parseInt(req.params.expenseId);
    
    if (isNaN(projectId) || isNaN(expenseId)) {
      return res.status(400).json({ message: 'Invalid project ID or expense ID' });
    }
    
    try {
      console.log(`Approving expense ${expenseId} for project ${projectId}`);
      
      // Use direct database connection to avoid any ORM issues
      const { pool } = await import('./db');
      
      // Get the project with direct SQL
      const projectResult = await pool.query(
        `SELECT * FROM projects WHERE id = $1`,
        [projectId]
      );
      
      if (projectResult.rows.length === 0) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      const project = projectResult.rows[0];
      
      // Only client or admin can approve expenses
      const isClient = req.user.id === project.client_id;
      
      if (!isClient && req.user.role !== "admin") {
        return res.status(403).json({ message: 'Only the client or admin can approve expenses' });
      }
      
      // Get the expense from the database
      const expenseResult = await pool.query(
        `SELECT pe.*, u.username as added_by_username 
         FROM project_expenses pe
         JOIN users u ON pe.added_by = u.id
         WHERE pe.project_id = $1 AND pe.id = $2`,
        [projectId, expenseId]
      );
      
      if (expenseResult.rows.length === 0) {
        return res.status(404).json({ message: 'Expense not found' });
      }
      
      const expense = expenseResult.rows[0];
      
      // Check if there's a status field, and if not, we'll add one
      // This is a temporary check as we transition to the new system
      if (expense.status === "approved") {
        return res.status(400).json({ message: 'This expense is already approved' });
      }
      
      console.log(`Updating expense ${expenseId} status to approved`);
      
      // Update the expense record with approved status
      const updateResult = await pool.query(
        `UPDATE project_expenses 
         SET status = 'approved', 
             approved_by = $1,
             approved_at = NOW()
         WHERE id = $2 AND project_id = $3
         RETURNING *`,
        [req.user.id, expenseId, projectId]
      );
      
      if (updateResult.rows.length === 0) {
        throw new Error("Failed to update expense with approved status");
      }
      
      const expenseTitle = expense.title;
      const expenseRecordedByUserId = expense.added_by;
      
      console.log(`Successfully approved expense ${expenseId}`);
      
      // Notify the expense recorder about approval using direct SQL
      if (expenseRecordedByUserId && expenseRecordedByUserId !== req.user.id) {
        await pool.query(
          `INSERT INTO notifications 
           (user_id, title, message, type, priority, emoji, related_item_id, related_item_type, action_url) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            expenseRecordedByUserId,
            "Expense Approved",
            `Your expense "${expenseTitle}" has been approved by ${req.user.username}`,
            "expense",
            "normal",
            "✅",
            projectId,
            "project_expense",
            `/projects/${projectId}`
          ]
        );
        
        console.log(`Sent notification to user ${expenseRecordedByUserId}`);
      }
      
      res.status(200).json({
        message: 'Expense approved successfully'
      });
    } catch (error) {
      console.error('Approve expense error:', error);
      res.status(500).json({ 
        message: 'Failed to approve expense',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Reject expense endpoint
  app.put('/api/projects/:projectId/expenses/:expenseId/reject', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const projectId = parseInt(req.params.projectId);
    const expenseId = parseInt(req.params.expenseId);
    
    if (isNaN(projectId) || isNaN(expenseId)) {
      return res.status(400).json({ message: 'Invalid project ID or expense ID' });
    }
    
    try {
      console.log(`Rejecting expense ${expenseId} for project ${projectId}`);
      
      // Use direct database connection to avoid any ORM issues
      const { pool } = await import('./db');
      
      // Get the project with direct SQL
      const projectResult = await pool.query(
        `SELECT * FROM projects WHERE id = $1`,
        [projectId]
      );
      
      if (projectResult.rows.length === 0) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      const project = projectResult.rows[0];
      
      // Only client or admin can reject expenses
      const isClient = req.user.id === project.client_id;
      
      if (!isClient && req.user.role !== "admin") {
        return res.status(403).json({ message: 'Only the client or admin can reject expenses' });
      }
      
      // Get the expense from the database
      const expenseResult = await pool.query(
        `SELECT pe.*, u.username as added_by_username 
         FROM project_expenses pe
         JOIN users u ON pe.added_by = u.id
         WHERE pe.project_id = $1 AND pe.id = $2`,
        [projectId, expenseId]
      );
      
      if (expenseResult.rows.length === 0) {
        return res.status(404).json({ message: 'Expense not found' });
      }
      
      const expense = expenseResult.rows[0];
      
      if (expense.status === "rejected") {
        return res.status(400).json({ message: 'This expense is already rejected' });
      }
      
      if (expense.status === "approved") {
        return res.status(400).json({ message: 'This expense has already been approved and cannot be rejected' });
      }
      
      console.log(`Updating expense ${expenseId} status to rejected`);
      
      // Update the expense record with rejected status
      const updateResult = await pool.query(
        `UPDATE project_expenses 
         SET status = 'rejected', 
             rejected_by = $1,
             rejected_at = NOW()
         WHERE id = $2 AND project_id = $3
         RETURNING *`,
        [req.user.id, expenseId, projectId]
      );
      
      if (updateResult.rows.length === 0) {
        throw new Error("Failed to update expense with rejected status");
      }
      
      const expenseTitle = expense.title;
      const expenseRecordedByUserId = expense.added_by;
      
      console.log(`Successfully rejected expense ${expenseId}`);
      
      // Notify the expense recorder about rejection using direct SQL
      if (expenseRecordedByUserId && expenseRecordedByUserId !== req.user.id) {
        await pool.query(
          `INSERT INTO notifications 
           (user_id, title, message, type, priority, emoji, related_item_id, related_item_type, action_url) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            expenseRecordedByUserId,
            "Expense Rejected",
            `Your expense "${expenseTitle}" has been rejected by ${req.user.username}`,
            "expense",
            "high",
            "❌",
            projectId,
            "project_expense",
            `/projects/${projectId}`
          ]
        );
        
        console.log(`Sent notification to user ${expenseRecordedByUserId}`);
      }
      
      res.status(200).json({
        message: 'Expense rejected successfully'
      });
    } catch (error) {
      console.error('Reject expense error:', error);
      res.status(500).json({ 
        message: 'Failed to reject expense',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.delete('/api/projects/:projectId/expenses/:expenseId', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const projectId = parseInt(req.params.projectId);
    const expenseId = parseInt(req.params.expenseId);
    
    if (isNaN(projectId) || isNaN(expenseId)) {
      return res.status(400).json({ message: 'Invalid project ID or expense ID' });
    }
    
    try {
      console.log(`Deleting expense ${expenseId} from project ${projectId}`);
      
      // Use direct database connection to avoid any ORM issues
      const { pool } = await import('./db');
      
      // Get the project with direct SQL
      const projectResult = await pool.query(
        `SELECT * FROM projects WHERE id = $1`,
        [projectId]
      );
      
      if (projectResult.rows.length === 0) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      const project = projectResult.rows[0];
      
      // Check if user is the client or admin
      const isClient = req.user.id === project.client_id;
      
      // Get the expense to delete from the database
      const expenseResult = await pool.query(
        `SELECT pe.*, u.username as added_by_username 
         FROM project_expenses pe
         JOIN users u ON pe.added_by = u.id
         WHERE pe.project_id = $1 AND pe.id = $2`,
        [projectId, expenseId]
      );
      
      if (expenseResult.rows.length === 0) {
        return res.status(404).json({ message: 'Expense not found' });
      }
      
      const expense = expenseResult.rows[0];
      
      // Check permissions
      const isRecorder = expense.added_by === req.user.id;
      
      if (!isClient && !isRecorder && req.user.role !== "admin") {
        return res.status(403).json({ message: 'You do not have permission to delete this expense' });
      }
      
      // Store the expense details for notifications
      const expenseTitle = expense.title;
      const expenseRecordedByUserId = expense.added_by;
      
      console.log(`Deleting expense ${expenseId} from database`);
      
      // Delete the expense from the database
      const deleteResult = await pool.query(
        `DELETE FROM project_expenses
         WHERE id = $1 AND project_id = $2
         RETURNING id`,
        [expenseId, projectId]
      );
      
      if (deleteResult.rows.length === 0) {
        throw new Error("Failed to delete expense from database");
      }
      
      console.log(`Successfully removed expense from project ${projectId}`);
      
      // Notify relevant parties about deletion using direct SQL
      if (isClient && !isRecorder && expenseRecordedByUserId) {
        // Client deleted expense recorded by someone else
        await pool.query(
          `INSERT INTO notifications 
           (user_id, title, message, type, priority, emoji, related_item_id, related_item_type, action_url) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            expenseRecordedByUserId,
            "Expense Deleted",
            `Your expense "${expenseTitle}" was deleted by the client`,
            "expense",
            "normal",
            "🗑️",
            projectId,
            "project_expense",
            `/projects/${projectId}`
          ]
        );
        
        console.log(`Sent deletion notification to expense recorder ${expenseRecordedByUserId}`);
      } else if (isRecorder && !isClient) {
        // Recorder deleted their own expense, notify client
        await pool.query(
          `INSERT INTO notifications 
           (user_id, title, message, type, priority, emoji, related_item_id, related_item_type, action_url) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            project.client_id,
            "Expense Deleted",
            `An expense "${expenseTitle}" was deleted by ${req.user.username}`,
            "expense",
            "normal",
            "🗑️",
            projectId,
            "project_expense",
            `/projects/${projectId}`
          ]
        );
        
        console.log(`Sent deletion notification to client ${project.client_id}`);
      }
      
      res.status(200).json({
        message: 'Expense deleted successfully'
      });
    } catch (error) {
      console.error('Delete expense error:', error);
      res.status(500).json({ 
        message: 'Failed to delete expense',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Update project location
  app.put('/api/projects/:projectId/location', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const projectId = parseInt(req.params.projectId);
    const { location, coordinates } = req.body;
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    if (!location || !coordinates || !coordinates.lat || !coordinates.lng) {
      return res.status(400).json({ 
        message: 'Location and coordinates are required. Coordinates must include lat and lng values.' 
      });
    }
    
    try {
      // Get the project to check permissions
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Allow location update if user is the client or contractor
      const isClient = req.user.id === project.clientId;
      const isContractor = project.teamMembers && Array.isArray(project.teamMembers) && 
        project.teamMembers.some((member: any) => 
          member.userId === req.user.id && member.role === "contractor"
        );
        
      if (!isClient && !isContractor && req.user.role !== "admin") {
        return res.status(403).json({ message: 'Only the client or contractor can update project location' });
      }
      
      // Update project location
      const updatedProject = await storage.updateProject(projectId, {
        ...project,
        location,
        coordinates
      });
      
      // Create a notification for other team members
      if (project.teamMembers && Array.isArray(project.teamMembers)) {
        const updaterRole = isClient ? "Client" : "Contractor";
        const notificationMessage = `Project location updated by ${updaterRole}`;
        
        // Notify team members except the updater
        for (const member of project.teamMembers) {
          if (member.userId !== req.user.id) {
            await storage.createNotification({
              userId: member.userId,
              title: "Project Location Updated",
              message: notificationMessage,
              type: "project",
              priority: "normal",
              relatedItemId: projectId,
              relatedItemType: "project",
              emoji: "📍",
              actionUrl: `/projects/${projectId}`
            });
          }
        }
        
        // Notify client if contractor updated location
        if (!isClient && project.clientId !== req.user.id) {
          await storage.createNotification({
            userId: project.clientId,
            title: "Project Location Updated",
            message: notificationMessage,
            type: "project",
            priority: "normal",
            relatedItemId: projectId,
            relatedItemType: "project",
            emoji: "📍",
            actionUrl: `/projects/${projectId}`
          });
        }
      }
      
      res.status(200).json({
        message: 'Project location updated successfully',
        location,
        coordinates
      });
    } catch (error) {
      console.error('Update project location error:', error);
      res.status(500).json({ message: 'Failed to update project location' });
    }
  });

  // Serve static files from the uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

  // Development route for generating a test invitation link
  // Only for debugging purposes
  app.get("/api/dev/create-test-invitation", async (req, res) => {
    try {
      // Generate a random token for testing purposes
      const inviteToken = `test-${Math.random().toString(36).substring(2, 12)}`;
      
      // Generate a link for the frontend to use
      const domain = req.headers.host || "localhost:5000";
      const protocol = req.headers['x-forwarded-proto'] || "http";
      const invitationLink = `${protocol}://${domain}/join/${inviteToken}`;
      
      console.log(`Created test invitation link: ${invitationLink}`);
      
      res.json({
        invitationLink,
        inviteToken,
        message: "Test invitation created for UI testing"
      });
    } catch (error) {
      console.error("Error creating test invitation:", error);
      res.status(500).json({ message: "Failed to create test invitation", error: String(error) });
    }
  });

  // Special direct endpoint to fetch service requests without session authentication
  app.post("/api/direct/service-requests/fetch", async (req, res) => {
    try {
      // Check if there's a direct user ID and username for authentication
      const { userId, username } = req.body;
      
      console.log("Direct fetch service requests:", {
        userId,
        username
      });
      
      if (!userId || !username) {
        return res.status(400).json({ 
          message: "Missing required fields",
          details: "userId and username are required"
        });
      }
      
      // Verify the user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      if (user.username !== username) {
        return res.status(401).json({ message: "Username mismatch" });
      }
      
      console.log("Direct fetch user verified:", user.username);
      
      // Get the service requests based on user role
      let serviceRequests = [];
      
      if (user.role === "client") {
        // Clients see their own requests
        serviceRequests = await storage.getServiceRequestsByClientId(user.id);
      } else if (user.role === "service_provider") {
        // Service providers see requests assigned to them
        serviceRequests = await storage.getServiceRequestsByProviderId(user.id);
      } else if (user.role === "admin") {
        // Admins see all requests
        serviceRequests = await storage.getAllServiceRequests();
      }
      
      console.log(`Fetched ${serviceRequests.length} service requests for ${user.username}`);
      return res.status(200).json(serviceRequests);
    } catch (error) {
      console.error("Error fetching service requests:", error);
      return res.status(500).json({ 
        message: "Failed to fetch service requests", 
        error: String(error) 
      });
    }
  });
  
  // Direct admin API endpoints for a more stable admin dashboard
  // These endpoints use a simpler authentication method as fallback for when session auth fails
  
  app.post('/api/direct-admin/clients', async (req, res) => {
    try {
      const { adminUsername } = req.body;
      
      // First try regular authentication
      if (req.isAuthenticated && req.isAuthenticated() && req.user?.role === 'admin') {
        const clients = await storage.getUsersByRole('client');
        return res.json(clients);
      }
      
      // Fallback: Check if the provided admin username is valid
      const adminUser = await storage.getUserByUsername(adminUsername);
      if (!adminUser || adminUser.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const clients = await storage.getUsersByRole('client');
      return res.json(clients);
    } catch (error) {
      console.error('Error getting clients:', error);
      res.status(500).json({ message: 'Error fetching clients' });
    }
  });
  
  app.post('/api/direct-admin/service-providers', async (req, res) => {
    try {
      const { adminUsername } = req.body;
      
      // First try regular authentication
      if (req.isAuthenticated && req.isAuthenticated() && req.user?.role === 'admin') {
        const providers = await storage.getUsersByRole('service_provider');
        return res.json(providers);
      }
      
      // Fallback: Check if the provided admin username is valid
      const adminUser = await storage.getUserByUsername(adminUsername);
      if (!adminUser || adminUser.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const providers = await storage.getUsersByRole('service_provider');
      return res.json(providers);
    } catch (error) {
      console.error('Error getting service providers:', error);
      res.status(500).json({ message: 'Error fetching service providers' });
    }
  });
  
  /* COMMENTED OUT DUPLICATE ENDPOINT 
  app.post('/api/direct-admin/projects', async (req, res) => {
    try {
      const { adminUsername } = req.body;
      
      // First try regular authentication
      if (req.isAuthenticated && req.isAuthenticated() && req.user?.role === 'admin') {
        const projects = await storage.getAllProjects();
        return res.json(projects);
      }
      
      // Fallback: Check if the provided admin username is valid
      const adminUser = await storage.getUserByUsername(adminUsername);
      if (!adminUser || adminUser.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const projects = await storage.getAllProjects();
      return res.json(projects);
    } catch (error) {
      console.error('Error getting projects:', error);
      res.status(500).json({ message: 'Error fetching projects' });
    }
  });
  */
  
  app.post('/api/direct-admin/service-requests', async (req, res) => {
    try {
      const { adminUsername } = req.body;
      
      // First try regular authentication
      if (req.isAuthenticated && req.isAuthenticated() && req.user?.role === 'admin') {
        const requests = await storage.getAllServiceRequests();
        return res.json(requests);
      }
      
      // Fallback: Check if the provided admin username is valid
      const adminUser = await storage.getUserByUsername(adminUsername);
      if (!adminUser || adminUser.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const requests = await storage.getAllServiceRequests();
      return res.json(requests);
    } catch (error) {
      console.error('Error getting service requests:', error);
      res.status(500).json({ message: 'Error fetching service requests' });
    }
  });

  // Direct admin API endpoints that use explicit authentication instead of session
  
  // Direct admin verify endpoint
  app.post("/api/direct-admin/verify", async (req, res) => {
    try {
      const { adminUsername } = req.body;
      
      if (!adminUsername) {
        return res.status(400).json({ message: "Admin username is required" });
      }
      
      // Verify this is an admin
      const isAdmin = await verifyAdminUsername(adminUsername);
      
      if (!isAdmin) {
        return sendAdminUnauthorized(res);
      }
      
      // Get the admin user details
      const admin = await storage.getUserByUsername(adminUsername, true);
      
      return res.json({
        isAdmin: true,
        adminId: admin?.id,
        adminUsername: admin?.username,
        fullName: admin?.fullName || null
      });
    } catch (error) {
      console.error("Error in direct admin verify endpoint:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Verify if a username belongs to an admin
  async function verifyAdminUsername(adminUsername: string): Promise<boolean> {
    try {
      console.log("Looking up user by username:", adminUsername);
      const user = await storage.getUserByUsername(adminUsername, true); // Use case-insensitive search
      
      if (!user) {
        console.log(`User ${adminUsername} not found`);
        return false;
      }
      
      console.log(`Found user with case-insensitive query: ${user.username} (ID: ${user.id})`);
      
      // Check if this user is an admin
      return user.role === 'admin';
    } catch (error) {
      console.error("Error verifying admin:", error);
      return false;
    }
  }
  
  // Helper to send an error response for unauthorized admin access attempts
  function sendAdminUnauthorized(res: Response): void {
    res.status(401).json({
      message: "Unauthorized: Admin access required",
      error: "ADMIN_AUTH_FAILED"
    });
  }
  
  // Direct admin endpoint for service requests
  app.post("/api/direct-admin/service-requests", async (req, res) => {
    try {
      const { adminUsername } = req.body;
      
      if (!adminUsername) {
        return res.status(400).json({ message: "Admin username is required" });
      }
      
      // Verify this is an admin
      const isAdmin = await verifyAdminUsername(adminUsername);
      if (!isAdmin) {
        return sendAdminUnauthorized(res);
      }
      
      // Admin is verified, fetch all service requests
      const serviceRequests = await storage.getAllServiceRequests();
      return res.json(serviceRequests);
    } catch (error) {
      console.error("Error in direct admin service requests endpoint:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Direct admin endpoint for clients
  app.post("/api/direct-admin/clients", async (req, res) => {
    try {
      const { adminUsername } = req.body;
      
      if (!adminUsername) {
        return res.status(400).json({ message: "Admin username is required" });
      }
      
      // Verify this is an admin
      const isAdmin = await verifyAdminUsername(adminUsername);
      if (!isAdmin) {
        return sendAdminUnauthorized(res);
      }
      
      // Admin is verified, fetch all clients
      const users = await storage.getAllUsers();
      const clients = users.filter(user => user.role === 'client');
      return res.json(clients);
    } catch (error) {
      console.error("Error in direct admin clients endpoint:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Direct admin endpoint for service providers
  app.post("/api/direct-admin/service-providers", async (req, res) => {
    try {
      const { adminUsername } = req.body;
      
      if (!adminUsername) {
        return res.status(400).json({ message: "Admin username is required" });
      }
      
      // Verify this is an admin
      const isAdmin = await verifyAdminUsername(adminUsername);
      if (!isAdmin) {
        return sendAdminUnauthorized(res);
      }
      
      // Admin is verified, fetch all service providers
      const users = await storage.getAllUsers();
      const serviceProviders = users.filter(user => user.role === 'service_provider');
      return res.json(serviceProviders);
    } catch (error) {
      console.error("Error in direct admin service providers endpoint:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Direct admin endpoint for projects
  /* COMMENTED OUT DUPLICATE ENDPOINT
  app.post("/api/direct-admin/projects", async (req, res) => {
    try {
      const { adminUsername } = req.body;
      
      if (!adminUsername) {
        return res.status(400).json({ message: "Admin username is required" });
      }
      
      // Verify this is an admin
      const isAdmin = await verifyAdminUsername(adminUsername);
      if (!isAdmin) {
        return sendAdminUnauthorized(res);
      }
      
      // Admin is verified, fetch all projects
      const projects = await storage.getAllProjects();
      return res.json(projects);
    } catch (error) {
      console.error("Error in direct admin projects endpoint:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  */
  
  // Special direct endpoint for fetching service requests with authentication challenges
  app.post("/api/direct/service-requests/fetch-legacy", async (req, res) => {
    try {
      // Check if there's a direct user ID and username for authentication
      const { userId, username } = req.body;
      
      console.log("Direct service requests fetch attempt:", {
        userId,
        username
      });
      
      if (!userId || !username) {
        return res.status(400).json({ 
          message: "Missing required fields",
          details: "userId and username are required"
        });
      }
      
      // Verify the user exists
      const user = await storage.getUser(userId);
      if (!user || user.username !== username) {
        return res.status(401).json({ 
          message: "Invalid user credentials" 
        });
      }
      
      // Get service requests based on user role
      let serviceRequests = [];
      if (user.role === "client") {
        // Clients see their own requests
        serviceRequests = await storage.getServiceRequestsByClientId(userId);
      } else if (user.role === "service_provider") {
        // Service providers see requests assigned to them
        serviceRequests = await storage.getServiceRequestsByProviderId(userId);
      } else if (user.role === "admin") {
        // Admins see all requests
        serviceRequests = await storage.getAllServiceRequests();
      }
      
      console.log(`Direct endpoint: Fetched ${serviceRequests.length} service requests for ${username}`);
      return res.status(200).json(serviceRequests);
    } catch (error) {
      console.error("Error in direct service requests fetch:", error);
      return res.status(500).json({ 
        message: "Failed to fetch service requests", 
        error: String(error) 
      });
    }
  });
  
  // Special direct endpoint for fetching admin dashboard notifications without session authentication
  // This endpoint was moved to line 7758 to avoid conflicts
  
  // Direct admin service requests endpoint (legacy)
  app.post("/api/direct-admin/service-requests-legacy", async (req, res) => {
    try {
      // Validate admin user
      const { adminUsername } = req.body;
      if (!adminUsername) {
        return res.status(400).json({ error: "Admin username is required" });
      }
      
      const admin = await storage.getUserByUsername(adminUsername);
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      // Get all service requests
      const serviceRequests = await storage.getAllServiceRequests();
      res.json(serviceRequests);
    } catch (error) {
      console.error("Error in direct admin service requests endpoint:", error);
      res.status(500).json({ error: "Server error fetching service requests" });
    }
  });
  
  // Direct admin clients endpoint (legacy)
  app.post("/api/direct-admin/clients-legacy", async (req, res) => {
    try {
      // Validate admin user
      const { adminUsername } = req.body;
      if (!adminUsername) {
        return res.status(400).json({ error: "Admin username is required" });
      }
      
      const admin = await storage.getUserByUsername(adminUsername);
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      // Get all clients
      const clients = await storage.getUsersByRole("client");
      res.json(clients);
    } catch (error) {
      console.error("Error in direct admin clients endpoint:", error);
      res.status(500).json({ error: "Server error fetching clients" });
    }
  });
  
  // Direct admin service providers endpoint (legacy)
  app.post("/api/direct-admin/service-providers-legacy", async (req, res) => {
    try {
      // Validate admin user
      const { adminUsername } = req.body;
      if (!adminUsername) {
        return res.status(400).json({ error: "Admin username is required" });
      }
      
      const admin = await storage.getUserByUsername(adminUsername);
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      // Get all service providers
      const serviceProviders = await storage.getUsersByRole("service_provider");
      res.json(serviceProviders);
    } catch (error) {
      console.error("Error in direct admin service providers endpoint:", error);
      res.status(500).json({ error: "Server error fetching service providers" });
    }
  });
  
  // Direct admin projects endpoint
  /* COMMENTED OUT DUPLICATE ENDPOINT
  app.post("/api/direct-admin/projects", async (req, res) => {
    try {
      // Validate admin user
      const { adminUsername } = req.body;
      if (!adminUsername) {
        return res.status(400).json({ error: "Admin username is required" });
      }
      
      const admin = await storage.getUserByUsername(adminUsername);
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      // Get all projects
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error in direct admin projects endpoint:", error);
      res.status(500).json({ error: "Server error fetching projects" });
    }
  });
  */
  
  // Simple admin dashboard - accessible from /admin-simple 
  app.get("/admin-simple", async (req, res) => {
    try {
      // Get data for the dashboard
      const storage = (await import('./storage')).storage;
      
      // Get the basic data for admin dashboard
      const clients = await storage.getUsersByRole("client");
      const serviceProviders = await storage.getUsersByRole("service_provider");
      const projects = await storage.getAllProjects();
      const serviceRequests = await storage.getAllServiceRequests();
      
      // Get notifications from the admin user
      const adminUserId = 3; // Admin user ID is 3
      const notifications = await storage.getUserNotifications(adminUserId) || [];
      
      // Render a simple server-side HTML admin dashboard
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Admin Dashboard | Artisans Ghana</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; }
            .stats-card { transition: all 0.3s ease; }
            .stats-card:hover { transform: translateY(-5px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
          </style>
        </head>
        <body class="bg-gray-100 min-h-screen">
          <header class="bg-blue-600 text-white p-4 shadow-md">
            <div class="container mx-auto">
              <div class="flex justify-between items-center">
                <h1 class="text-2xl font-bold">Artisans Admin Dashboard</h1>
                <a href="/admin-dashboard" class="bg-white text-blue-600 px-4 py-2 rounded shadow hover:bg-blue-50">Go to Main Dashboard</a>
              </div>
            </div>
          </header>
          
          <main class="container mx-auto py-8 px-4">
            <!-- Stats Overview -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div class="bg-white p-6 rounded-lg shadow stats-card">
                <div class="flex items-center">
                  <div class="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-gray-500 text-sm">Total Clients</p>
                    <p class="text-3xl font-bold">${clients.length}</p>
                  </div>
                </div>
              </div>
              
              <div class="bg-white p-6 rounded-lg shadow stats-card">
                <div class="flex items-center">
                  <div class="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-gray-500 text-sm">Active Projects</p>
                    <p class="text-3xl font-bold">${projects.filter(p => p.status === 'in_progress').length}</p>
                  </div>
                </div>
              </div>
              
              <div class="bg-white p-6 rounded-lg shadow stats-card">
                <div class="flex items-center">
                  <div class="p-3 rounded-full bg-yellow-100 text-yellow-600 mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-gray-500 text-sm">Service Requests</p>
                    <p class="text-3xl font-bold">${serviceRequests.length}</p>
                  </div>
                </div>
              </div>
              
              <div class="bg-white p-6 rounded-lg shadow stats-card">
                <div class="flex items-center">
                  <div class="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-gray-500 text-sm">Service Providers</p>
                    <p class="text-3xl font-bold">${serviceProviders.length}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Recent Service Requests -->
            <div class="bg-white rounded-lg shadow overflow-hidden mb-8">
              <div class="bg-blue-50 p-4 border-b border-blue-100">
                <h2 class="text-xl font-semibold text-blue-800">Recent Service Requests</h2>
              </div>
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    ${serviceRequests.slice(0, 10).map(req => {
                      const client = clients.find(c => c.id === req.clientId);
                      const clientName = client ? (client.fullName || client.username) : 'Unknown Client';
                      
                      // Format status
                      let statusClass = 'bg-gray-100 text-gray-800';
                      if (req.status === 'pending_admin' || req.status === 'pending') {
                        statusClass = 'bg-yellow-100 text-yellow-800';
                      } else if (req.status === 'approved') {
                        statusClass = 'bg-green-100 text-green-800';
                      } else if (req.status === 'published') {
                        statusClass = 'bg-blue-100 text-blue-800';
                      } else if (req.status === 'in_progress') {
                        statusClass = 'bg-indigo-100 text-indigo-800';
                      } else if (req.status === 'completed') {
                        statusClass = 'bg-purple-100 text-purple-800';
                      } else if (req.status === 'rejected') {
                        statusClass = 'bg-red-100 text-red-800';
                      }
                      
                      return `
                        <tr>
                          <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm font-medium text-gray-900">${clientName}</div>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm text-gray-900">${req.serviceType}</div>
                            <div class="text-xs text-gray-500">${req.requestType}</div>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${req.location}</td>
                          <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                              ${req.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${new Date(req.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>
            
            <!-- Active Projects -->
            <div class="bg-white rounded-lg shadow overflow-hidden">
              <div class="bg-green-50 p-4 border-b border-green-100">
                <h2 class="text-xl font-semibold text-green-800">Active Projects</h2>
              </div>
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Name</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    ${projects.slice(0, 10).map(project => {
                      const client = clients.find(c => c.id === project.clientId);
                      const clientName = client ? (client.fullName || client.username) : 'Unknown Client';
                      
                      // Format status
                      let statusClass = 'bg-gray-100 text-gray-800';
                      if (project.status === 'planning') {
                        statusClass = 'bg-blue-100 text-blue-800';
                      } else if (project.status === 'in_progress') {
                        statusClass = 'bg-green-100 text-green-800';
                      } else if (project.status === 'completed') {
                        statusClass = 'bg-purple-100 text-purple-800';
                      } else if (project.status === 'paused') {
                        statusClass = 'bg-yellow-100 text-yellow-800';
                      } else if (project.status === 'cancelled') {
                        statusClass = 'bg-red-100 text-red-800';
                      }
                      
                      return `
                        <tr>
                          <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm font-medium text-gray-900">${project.name || 'Unnamed Project'}</div>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm text-gray-900">${clientName}</div>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${project.location || 'Unknown Location'}</td>
                          <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                              ${project.status}
                            </span>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₵${project.budget ? project.budget.toLocaleString() : 'N/A'}
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
          
          <footer class="bg-gray-800 text-white py-6 mt-12">
            <div class="container mx-auto px-4">
              <p class="text-center">&copy; ${new Date().getFullYear()} Artisans Construction Management Platform.</p>
            </div>
          </footer>
        </body>
        </html>
      `);
    } catch (error) {
      console.error('Error rendering admin server page:', error);
      res.status(500).send(`
        <html>
          <head>
            <title>Admin Dashboard Error</title>
            <style>
              body {
                font-family: system-ui, sans-serif;
                margin: 0;
                padding: 20px;
                background: #f3f4f6;
                color: #1f2937;
              }
              .container {
                max-width: 600px;
                margin: 100px auto;
                background: white;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              }
              h1 {
                color: #ef4444;
              }
              pre {
                background: #f3f4f6;
                padding: 12px;
                border-radius: 4px;
                overflow-x: auto;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Error Loading Admin Dashboard</h1>
              <p>Sorry, an error occurred while loading the admin dashboard:</p>
              <pre>${error.message}</pre>
              <p>Please try again later or contact technical support.</p>
            </div>
          </body>
        </html>
      `);
    }
  });
  
  // Completely static admin dashboard with no authentication - for emergency use only
  app.get("/admin-static", async (req, res) => {
    try {
      const clients = await storage.getUsersByRole("client");
      const serviceProviders = await storage.getUsersByRole("service_provider");
      const projects = await storage.getAllProjects();
      const serviceRequests = await storage.getAllServiceRequests();
      
      // Simple data for the dashboard - as JSON string literals
      const clientsJson = JSON.stringify(clients);
      const providersJson = JSON.stringify(serviceProviders);
      const projectsJson = JSON.stringify(projects);
      const requestsJson = JSON.stringify(serviceRequests);
      
      // Send a completely standalone HTML page with embedded data
      res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Static Dashboard</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <style>
    body { font-family: system-ui, sans-serif; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
    .stats-card { transition: all 0.3s ease; }
    .stats-card:hover { transform: translateY(-5px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
    @media (max-width: 768px) {
      table { font-size: 14px; }
    }
  </style>
</head>
<body class="bg-gray-100">
  <div class="container pt-8 pb-20">
    <header class="bg-blue-600 text-white p-6 rounded-lg shadow-lg mb-8">
      <div class="flex flex-col md:flex-row justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold">Admin Static Dashboard</h1>
          <p class="opacity-80 mt-1">Artisans Construction Management Platform</p>
        </div>
        <div class="mt-4 md:mt-0">
          <a href="/" class="bg-white text-blue-600 px-4 py-2 rounded shadow hover:bg-blue-50">
            Return to Home
          </a>
        </div>
      </div>
    </header>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-white p-6 rounded-lg shadow stats-card">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p class="text-gray-500 text-sm">Clients</p>
            <p class="text-3xl font-bold" id="client-count">-</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white p-6 rounded-lg shadow stats-card">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-green-100 text-green-600 mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <p class="text-gray-500 text-sm">Projects</p>
            <p class="text-3xl font-bold" id="project-count">-</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white p-6 rounded-lg shadow stats-card">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
          </div>
          <div>
            <p class="text-gray-500 text-sm">Service Providers</p>
            <p class="text-3xl font-bold" id="provider-count">-</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white p-6 rounded-lg shadow stats-card">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-yellow-100 text-yellow-600 mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p class="text-gray-500 text-sm">Service Requests</p>
            <p class="text-3xl font-bold" id="request-count">-</p>
          </div>
        </div>
      </div>
    </div>
    
    <div class="bg-white rounded-lg shadow-md overflow-hidden mb-8">
      <div class="bg-blue-600 text-white p-4">
        <h2 class="text-xl font-semibold">Service Requests</h2>
      </div>
      <div class="overflow-auto" style="max-height: 400px">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50 sticky top-0">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service Type</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200" id="requests-table-body">
            <tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="bg-white rounded-lg shadow-md overflow-hidden mb-8">
      <div class="bg-blue-600 text-white p-4">
        <h2 class="text-xl font-semibold">Projects</h2>
      </div>
      <div class="overflow-auto" style="max-height: 400px">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50 sticky top-0">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200" id="projects-table-body">
            <tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="bg-white rounded-lg shadow-md overflow-hidden">
      <div class="bg-blue-600 text-white p-4">
        <h2 class="text-xl font-semibold">Actions</h2>
      </div>
      <div class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button id="publish-btn" class="bg-green-600 text-white px-4 py-3 rounded shadow hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-colors">
            Publish All Pending Service Requests
          </button>
          <button id="refresh-btn" class="bg-blue-600 text-white px-4 py-3 rounded shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors">
            Refresh Dashboard Data
          </button>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Preloaded data from server
    const clients = ${clientsJson};
    const serviceProviders = ${providersJson};
    const projects = ${projectsJson};
    const serviceRequests = ${requestsJson};
    
    // Create client lookup map for easier reference
    const clientMap = {};
    clients.forEach(client => {
      clientMap[client.id] = client.username || client.fullName || 'Unknown';
    });
    
    // Update dashboard stats
    document.getElementById('client-count').textContent = clients.length;
    document.getElementById('provider-count').textContent = serviceProviders.length;
    document.getElementById('project-count').textContent = projects.length;
    document.getElementById('request-count').textContent = serviceRequests.length;
    
    // Format date helper
    function formatDate(dateStr) {
      return new Date(dateStr).toLocaleDateString();
    }
    
    // Get appropriate status display class
    function getStatusClass(status) {
      if (!status) return 'bg-gray-100 text-gray-800';
      
      status = status.toLowerCase();
      if (status.includes('pending')) return 'bg-yellow-100 text-yellow-800';
      if (status.includes('approved')) return 'bg-green-100 text-green-800';
      if (status.includes('publish')) return 'bg-blue-100 text-blue-800';
      if (status.includes('progress')) return 'bg-indigo-100 text-indigo-800';
      if (status.includes('complete')) return 'bg-purple-100 text-purple-800';
      if (status.includes('reject')) return 'bg-red-100 text-red-800';
      
      return 'bg-gray-100 text-gray-800';
    }
    
    // Render service requests table
    function renderServiceRequests() {
      const tableBody = document.getElementById('requests-table-body');
      
      if (serviceRequests.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No service requests found</td></tr>';
        return;
      }
      
      tableBody.innerHTML = serviceRequests.map(req => {
        const clientName = clientMap[req.clientId] || 'Unknown Client';
        const statusClass = getStatusClass(req.status);
        const displayStatus = req.status?.replace(/_/g, ' ') || 'Unknown';
        
        return \`
          <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">\${req.id}</td>
            <td class="px-6 py-4 whitespace-nowrap">\${clientName}</td>
            <td class="px-6 py-4 whitespace-nowrap">\${req.serviceType || 'Unknown'}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full \${statusClass}">
                \${displayStatus}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">\${formatDate(req.createdAt)}</td>
          </tr>
        \`;
      }).join('');
    }
    
    // Render projects table
    function renderProjects() {
      const tableBody = document.getElementById('projects-table-body');
      
      if (projects.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No projects found</td></tr>';
        return;
      }
      
      tableBody.innerHTML = projects.map(project => {
        const clientName = clientMap[project.clientId] || 'Unknown Client';
        const statusClass = getStatusClass(project.status);
        
        return \`
          <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">\${project.id}</td>
            <td class="px-6 py-4 whitespace-nowrap">\${project.name || 'Unnamed Project'}</td>
            <td class="px-6 py-4 whitespace-nowrap">\${clientName}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full \${statusClass}">
                \${project.status || 'Unknown'}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">\${project.location || 'Unknown'}</td>
          </tr>
        \`;
      }).join('');
    }
    
    // Publish all pending service requests
    document.getElementById('publish-btn').addEventListener('click', async () => {
      try {
        const btn = document.getElementById('publish-btn');
        btn.textContent = 'Publishing...';
        btn.disabled = true;
        
        const response = await fetch('/api/direct-publish-all-requests');
        const result = await response.json();
        
        if (result.success) {
          alert('Successfully published ' + (result.count || 'all') + ' service requests');
          window.location.reload();
        } else {
          alert('Failed to publish requests: ' + (result.message || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error publishing requests:', error);
        alert('Error publishing requests. See console for details.');
      } finally {
        const btn = document.getElementById('publish-btn');
        btn.textContent = 'Publish All Pending Service Requests';
        btn.disabled = false;
      }
    });
    
    // Refresh dashboard data
    document.getElementById('refresh-btn').addEventListener('click', () => {
      window.location.reload();
    });
    
    // Initial render
    renderServiceRequests();
    renderProjects();
  </script>
</body>
</html>
      `);
    } catch (error) {
      console.error('Error rendering static admin dashboard:', error);
      res.status(500).send(`
        <html>
          <head><title>Error</title></head>
          <body style="font-family:system-ui; padding:40px; max-width:800px; margin:0 auto;">
            <h1 style="color:#e53e3e">Error Rendering Admin Dashboard</h1>
            <p>There was a problem loading the dashboard data.</p>
            <pre style="background:#f7fafc; padding:15px; border-radius:5px;">${error.message}</pre>
            <p><a href="javascript:window.location.reload()">Try Again</a> | <a href="/">Go Home</a></p>
          </body>
        </html>
      `);
    }
  });
  
  // Direct endpoint for approving a single service request
  app.get("/api/direct-approve-request/:id", async (req, res) => {
    try {
      const requestId = parseInt(req.params.id, 10);
      if (isNaN(requestId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid request ID"
        });
      }
      
      const serviceRequest = await storage.getServiceRequest(requestId);
      if (!serviceRequest) {
        return res.status(404).json({
          success: false,
          message: "Service request not found"
        });
      }
      
      const updatedRequest = await storage.updateServiceRequest(requestId, {
        status: "published_for_bidding"
      });
      
      // Create notification for service providers
      const serviceProviders = await storage.getUsersByRole("service_provider");
      for (const provider of serviceProviders) {
        await storage.createNotification({
          userId: provider.id,
          title: "New Service Request Available",
          message: `A new ${updatedRequest.serviceType} service request is now available for bidding`,
          type: "bidding_opportunity",
          priority: "medium",
          relatedItemId: updatedRequest.id,
          relatedItemType: "service_request",
          emoji: "🔔",
          actionUrl: `/service-requests/bid/${updatedRequest.id}`
        });
      }
      
      return res.json({
        success: true,
        message: `Successfully published service request #${requestId}`,
        request: updatedRequest
      });
    } catch (error) {
      console.error("Error approving service request:", error);
      return res.status(500).json({
        success: false,
        message: "Server error approving service request"
      });
    }
  });
  
  // Direct endpoint to publish all service requests
  app.get("/api/direct-publish-all-requests", async (req, res) => {
    try {
      // Get all pending or admin-pending service requests
      const pendingRequests = await storage.getServiceRequestsByStatus('pending_admin,pending');
      
      if (pendingRequests.length === 0) {
        return res.json({ 
          success: true, 
          message: "No pending service requests found to publish" 
        });
      }
      
      // Update each request to published status
      const publishedRequests = [];
      for (const request of pendingRequests) {
        const updatedRequest = await storage.updateServiceRequest(request.id, { 
          status: 'published'
        });
        publishedRequests.push(updatedRequest);
        
        // Create notification for service providers
        const serviceProviders = await storage.getUsersByRole("service_provider");
        for (const provider of serviceProviders) {
          await storage.createNotification({
            userId: provider.id,
            title: "New Service Request Available",
            message: `A new ${request.serviceType} service request is now available for bidding`,
            type: "bidding_opportunity",
            priority: "medium",
            relatedItemId: request.id,
            relatedItemType: "service_request",
            emoji: "🔔",
            actionUrl: `/service-requests/bid/${request.id}`
          });
        }
      }
      
      return res.json({ 
        success: true, 
        message: `Published ${publishedRequests.length} service requests for bidding`,
        count: publishedRequests.length
      });
    } catch (error) {
      console.error("Error publishing all service requests:", error);
      return res.status(500).json({ 
        success: false,
        message: "Failed to publish service requests"
      });
    }
  });
  
  // Direct endpoint to get service requests for admin dashboard
  app.post("/api/direct-admin/service-requests", async (req, res) => {
    try {
      // Validate admin user
      const { adminUsername } = req.body;
      if (!adminUsername) {
        return res.status(400).json({ error: "Admin username is required" });
      }
      
      const admin = await storage.getUserByUsername(adminUsername);
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      // Get service requests - prioritize pending requests
      const pendingRequests = await storage.getServiceRequestsByStatus('pending_admin,pending');
      const otherRequests = await storage.getServiceRequestsByStatus('submitted,approved,rejected,completed,published_for_bidding');
      
      // Combine and send all requests, with pending ones first
      const allRequests = [...pendingRequests, ...otherRequests];
      
      // Enhance service requests with client info
      const enhancedRequests = [];
      for (const request of allRequests) {
        let clientName = "Unknown";
        if (request.clientId) {
          const client = await storage.getUser(request.clientId);
          if (client) {
            clientName = client.fullName || client.username;
          }
        }
        
        enhancedRequests.push({
          ...request,
          clientName
        });
      }
      
      res.json(enhancedRequests);
    } catch (error) {
      console.error("Error in direct admin service requests endpoint:", error);
      res.status(500).json({ error: "Server error fetching service requests" });
    }
  });
  
  // Direct admin projects endpoint
  app.post("/api/direct-admin/projects-legacy", async (req, res) => {
    try {
      // Validate admin user
      const { adminUsername } = req.body;
      if (!adminUsername) {
        return res.status(400).json({ error: "Admin username is required" });
      }
      
      const admin = await storage.getUserByUsername(adminUsername);
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      // Get all projects
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error in direct admin projects endpoint:", error);
      res.status(500).json({ error: "Server error fetching projects" });
    }
  });
  
  // NEW Direct admin notifications endpoint
  // This endpoint has been moved further down to avoid duplication
  
  // NEW Direct admin mark notification as read
  app.post("/api/direct-admin/notifications/mark-read", async (req, res) => {
    try {
      const { adminUsername, notificationId } = req.body;
      
      if (!adminUsername || !notificationId) {
        return res.status(400).json({ message: "Missing required parameters" });
      }
      
      const admin = await storage.getUserByUsername(adminUsername);
      
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const notification = await storage.getNotification(notificationId);
      
      if (!notification || notification.userId !== admin.id) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      await storage.markNotificationAsRead(notificationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // NEW Direct admin mark all notifications as read
  app.post("/api/direct-admin/notifications/mark-all-read", async (req, res) => {
    try {
      const { adminUsername } = req.body;
      
      if (!adminUsername) {
        return res.status(400).json({ message: "Missing admin username" });
      }
      
      const admin = await storage.getUserByUsername(adminUsername);
      
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      await storage.markAllNotificationsAsRead(admin.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Direct endpoint to get clients for admin dashboard
  app.post("/api/direct-admin/clients", async (req, res) => {
    try {
      // Validate admin user
      const { adminUsername } = req.body;
      if (!adminUsername) {
        return res.status(400).json({ error: "Admin username is required" });
      }
      
      const admin = await storage.getUserByUsername(adminUsername);
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      // Get all clients
      const clients = await storage.getUsersByRole("client");
      res.json(clients);
    } catch (error) {
      console.error("Error in direct admin clients endpoint:", error);
      res.status(500).json({ error: "Server error fetching clients" });
    }
  });
  
  // Direct endpoint to publish all pending service requests for bidding
  app.get("/api/direct-publish-all-requests", async (req, res) => {
    try {
      // Get all pending service requests
      const pendingRequests = await storage.getServiceRequestsByStatus("pending_approval");
      
      if (!pendingRequests || pendingRequests.length === 0) {
        return res.json({
          success: true,
          message: "No pending service requests found to publish",
          count: 0
        });
      }
      
      // Update each pending request to published for bidding
      const updatePromises = [];
      const notificationPromises = [];
      
      // First update all requests
      for (const request of pendingRequests) {
        updatePromises.push(
          storage.updateServiceRequest(request.id, {
            status: 'published_for_bidding'
          })
        );
      }
      
      await Promise.all(updatePromises);
      
      // Then create notifications for each request
      const serviceProviders = await storage.getUsersByRole("service_provider");
      
      for (const request of pendingRequests) {
        // Get client information for notification
        const client = await storage.getUser(request.clientId);
        const clientName = client ? (client.fullName || client.username) : 'Unknown Client';
        
        // Notify service providers
        for (const provider of serviceProviders) {
          notificationPromises.push(
            storage.createNotification({
              userId: provider.id,
              title: "New Project Opportunity",
              message: `A new ${request.serviceType} service request from ${clientName} is available for bidding`,
              type: "service_request",
              priority: "high",
              relatedItemId: request.id,
              relatedItemType: "service_request",
              emoji: "💼",
              actionUrl: `/service-requests/${request.id}`
            })
          );
        }
        
        // Notify the client
        notificationPromises.push(
          storage.createNotification({
            userId: request.clientId,
            title: "Request Published",
            message: `Your ${request.serviceType} service request has been published for bidding`,
            type: "service_request",
            priority: "medium",
            relatedItemId: request.id,
            relatedItemType: "service_request",
            emoji: "✅",
            actionUrl: `/service-requests/${request.id}`
          })
        );
      }
      
      await Promise.all(notificationPromises);
      
      console.log(`Published ${pendingRequests.length} service requests for bidding`);
      
      return res.json({
        success: true,
        message: `Successfully published ${pendingRequests.length} service requests for bidding`,
        count: pendingRequests.length
      });
    } catch (error) {
      console.error("Error publishing all service requests:", error);
      return res.status(500).json({
        success: false,
        message: "Server error publishing service requests",
        error: String(error)
      });
    }
  });
  
  // Direct API endpoint for service requests available for bidding
  app.post("/api/bidding-requests-direct", async (req, res) => {
    try {
      // Verify request has necessary data
      const { userId, username, role } = req.body;
      
      if (!userId || !username) {
        return res.status(400).json({ 
          message: "Missing credentials",
          details: "userId and username are required"
        });
      }
      
      // Verify the user exists and credentials match
      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.username !== username) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      if (user.role !== 'service_provider') {
        return res.status(403).json({ message: "User is not a service provider" });
      }
      
      console.log(`Direct bidding requests fetch for service provider: ${username} (ID: ${userId})`);
      
      // Get all service requests that are published for bidding
      const requests = await storage.getServiceRequestsByStatus("published_for_bidding");
      
      // Get all bids by this service provider
      const providerBids = await storage.getBidsByServiceProvider(parseInt(userId));
      
      // Map to keep track of which requests the provider has already bid on
      const bidMap = {};
      for (const bid of providerBids) {
        bidMap[bid.serviceRequestId] = bid;
      }
      
      // Combine the requests with bid information, but hide client personal information
      const requestsWithBidInfo = requests.map(request => {
        const bid = bidMap[request.id];
        
        // Create a version without client personal information
        return {
          ...request,
          clientId: undefined, // Hide client ID
          userBidStatus: bid ? bid.status : null,
          bidAmount: bid ? bid.bidAmount : null,
          bidId: bid ? bid.id : null,
          pointsToUse: bid ? bid.pointsToUse : null
        };
      });

      return res.json(requestsWithBidInfo);
    } catch (error) {
      console.error("Error fetching bidding requests:", error);
      return res.status(500).json({ message: "Failed to fetch bidding requests" });
    }
  });

  // Endpoint to get service requests available for bidding (for service providers)
  app.get("/api/service-requests/bidding", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required", code: "AUTH_REQUIRED" });
    }
    
    // Only service providers can view bidding opportunities
    if (req.user!.role !== "service_provider") {
      return res.status(403).json({ message: "Access denied", code: "FORBIDDEN" });
    }
    
    try {
      const serviceProviderId = req.user!.id;
      
      // Get all service requests that are published for bidding
      const requests = await storage.getServiceRequestsByStatus("published_for_bidding");
      
      // Get all bids by this service provider
      const providerBids = await storage.getBidsByServiceProvider(serviceProviderId);
      
      // Map to keep track of which requests the provider has already bid on
      const bidMap = {};
      for (const bid of providerBids) {
        bidMap[bid.serviceRequestId] = bid;
      }
      
      // Combine the requests with bid information, but hide client personal information
      const requestsWithBidInfo = requests.map(request => {
        const bid = bidMap[request.id];
        
        // Create a version without client personal information
        const clientId = request.clientId; // Save for reference but don't expose directly
        
        return {
          ...request,
          // Replace clientId with a generic identifier
          clientId: undefined, // Remove actual client ID
          clientIdentifier: `Client-${request.id}`, // Generic identifier
          // Hide any other client personal info that might be present in the request
          clientUsername: undefined,
          clientEmail: undefined,
          clientPhone: undefined,
          clientContact: undefined,
          clientName: undefined,
          // Add bid information
          bidStatus: bid ? bid.status : undefined,
          bidId: bid ? bid.id : undefined,
          bidAmount: bid ? bid.amount : undefined,
          bidPoints: bid ? bid.pointsUsed : undefined
        };
      });
      
      return res.json(requestsWithBidInfo);
    } catch (error) {
      console.error("Error fetching service requests for bidding:", error);
      return res.status(500).json({ message: "Server error fetching bidding opportunities" });
    }
  });
  
  // Endpoint to create a new bid
  app.post("/api/bids", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required", code: "AUTH_REQUIRED" });
    }
    
    // Only service providers can create bids
    if (req.user!.role !== "service_provider") {
      return res.status(403).json({ message: "Only service providers can submit bids", code: "FORBIDDEN" });
    }
    
    try {
      const { serviceRequestId, amount, description, timeframe, pointsToUse } = req.body;
      const serviceProviderId = req.user!.id;
      
      // Verify service request exists and is open for bidding
      const serviceRequest = await storage.getServiceRequest(serviceRequestId);
      if (!serviceRequest) {
        return res.status(404).json({ message: "Service request not found" });
      }
      
      if (serviceRequest.status !== "published_for_bidding" && serviceRequest.status !== "bidding") {
        return res.status(400).json({ message: "This service request is not open for bidding" });
      }
      
      // Check if provider already has a bid for this request
      const existingBids = await storage.getBidsByServiceRequest(serviceRequestId);
      const providerExistingBid = existingBids.find(bid => bid.serviceProviderId === serviceProviderId);
      
      if (providerExistingBid) {
        return res.status(400).json({ message: "You already have a bid for this service request" });
      }
      
      // Verify provider has enough points
      const provider = await storage.getUser(serviceProviderId);
      if (!provider) {
        return res.status(404).json({ message: "Service provider not found" });
      }
      
      if (provider.points < pointsToUse) {
        return res.status(400).json({ message: `Insufficient points. You have ${provider.points} points but the bid requires ${pointsToUse} points.` });
      }
      
      // Deduct points from the provider
      const updatedProvider = await storage.updateUserPoints(serviceProviderId, provider.points - pointsToUse);
      
      // Create the bid
      const bid = await storage.createBid({
        serviceRequestId,
        serviceProviderId,
        providerId: serviceProviderId, // For compatibility
        amount,
        description,
        timeframe,
        pointsUsed: pointsToUse,
        status: "pending",
        createdAt: new Date().toISOString()
      });
      
      // Notify the admin
      await storage.createNotification({
        userId: 3, // Admin user ID
        title: "New Bid Received",
        message: `A new bid has been submitted for service request #${serviceRequestId}`,
        type: "bidding",
        priority: "medium",
        relatedItemId: serviceRequestId,
        relatedItemType: "service_request",
        emoji: "📝",
        read: false,
        actionUrl: `/admin-bidding`
      });
      
      // Notify the client
      await storage.createNotification({
        userId: serviceRequest.clientId,
        title: "New Bid on Your Request",
        message: `A service provider has submitted a bid for your request`,
        type: "bidding",
        priority: "high",
        relatedItemId: serviceRequestId,
        relatedItemType: "service_request",
        emoji: "💰",
        read: false,
        actionUrl: `/service-requests/${serviceRequestId}`
      });
      
      res.status(201).json(bid);
    } catch (error) {
      console.error("Error creating bid:", error);
      res.status(500).json({ message: "Server error creating bid" });
    }
  });
  
  // Endpoint to get user points
  app.get("/api/user/points", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required", code: "AUTH_REQUIRED" });
    }
    
    try {
      const userId = req.user!.id;
      const points = await storage.getUserPoints(userId);
      return res.json({ points });
    } catch (error) {
      console.error("Error fetching user points:", error);
      return res.status(500).json({ message: "Server error fetching user points" });
    }
  });
  
  // Direct endpoint to approve individual service requests
  app.get("/api/direct-approve-request/:id", async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      
      if (isNaN(requestId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid service request ID" 
        });
      }
      
      // Get the service request
      const serviceRequest = await storage.getServiceRequest(requestId);
      
      if (!serviceRequest) {
        return res.status(404).json({ 
          success: false, 
          message: "Service request not found" 
        });
      }
      
      // Check if it's in a pending state
      if (!serviceRequest.status.includes('pending')) {
        return res.status(400).json({ 
          success: false, 
          message: `Service request is already in '${serviceRequest.status}' state` 
        });
      }
      
      // Update to approved and published for bidding
      const updatedRequest = await storage.updateServiceRequest(requestId, {
        status: 'published_for_bidding'
      });
      
      // Get client information for notification
      const client = await storage.getUser(serviceRequest.clientId);
      const clientName = client ? (client.fullName || client.username) : 'Unknown Client';
      
      // Create notification for service providers
      const serviceProviders = await storage.getUsersByRole("service_provider");
      for (const provider of serviceProviders) {
        await storage.createNotification({
          userId: provider.id,
          title: "New Project Opportunity",
          message: `A new ${serviceRequest.serviceType} service request from ${clientName} is available for bidding`,
          type: "service_request",
          priority: "high",
          relatedItemId: serviceRequest.id,
          relatedItemType: "service_request",
          emoji: "💼",
          actionUrl: `/service-requests/${serviceRequest.id}`
        });
      }
      
      // Notify the client
      await storage.createNotification({
        userId: serviceRequest.clientId,
        title: "Request Published",
        message: `Your ${serviceRequest.serviceType} service request has been published for bidding`,
        type: "service_request",
        priority: "medium",
        relatedItemId: serviceRequest.id,
        relatedItemType: "service_request",
        emoji: "✅",
        actionUrl: `/service-requests/${serviceRequest.id}`
      });
      
      console.log(`Service request #${requestId} approved and published for bidding`);
      
      return res.json({ 
        success: true, 
        message: "Service request approved and published for bidding",
        serviceRequest: updatedRequest
      });
    } catch (error) {
      console.error(`Error approving service request:`, error);
      return res.status(500).json({ 
        success: false, 
        message: "Server error approving service request" 
      });
    }
  });
  
  // Direct endpoint to get admin notifications
  app.post("/api/direct-admin/notifications", async (req, res) => {
    try {
      // Validate admin user
      const { adminUsername } = req.body;
      if (!adminUsername) {
        return res.status(400).json({ message: "Missing user admin username" });
      }
      
      const admin = await storage.getUserByUsername(adminUsername);
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      console.log("Direct admin notifications request user verified:", admin.username);
      
      // Get all notifications for this admin
      const notifications = await storage.getUserNotifications(admin.id);
      
      // Map read property to isRead to match frontend expectations
      const formattedNotifications = notifications.map(notification => ({
        ...notification,
        isRead: notification.read
      }));
      
      res.json(formattedNotifications);
    } catch (error) {
      console.error("Error in direct admin notifications endpoint:", error);
      res.status(500).json({ message: "Server error fetching notifications" });
    }
  });
  
  // Direct endpoint to get service providers for admin dashboard
  app.post("/api/direct-admin/service-providers", async (req, res) => {
    try {
      // Validate admin user
      const { adminUsername } = req.body;
      if (!adminUsername) {
        return res.status(400).json({ error: "Admin username is required" });
      }
      
      const admin = await storage.getUserByUsername(adminUsername);
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      // Get all service providers
      const providers = await storage.getUsersByRole("service_provider");
      res.json(providers);
    } catch (error) {
      console.error("Error in direct admin service providers endpoint:", error);
      res.status(500).json({ error: "Server error fetching service providers" });
    }
  });
  
  // Special direct endpoint for creating service requests with authentication challenges
  app.post("/api/direct/service-requests/create", async (req, res) => {
    try {
      // Check if there's a direct user ID and username for authentication
      const { userId, username, serviceRequest: serviceRequestData } = req.body;
      
      console.log("Direct service request submission received:", {
        userId,
        username,
        dataKeys: Object.keys(serviceRequestData || {}),
      });
      
      if (!userId || !username || !serviceRequestData) {
        return res.status(400).json({ 
          message: "Missing required fields",
          details: "userId, username, and serviceRequest are required"
        });
      }
      
      // Verify the user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      if (user.username !== username) {
        return res.status(401).json({ message: "Username mismatch" });
      }
      
      console.log("Direct service request user verified:", user.username);
      
      // Validate service request data
      const validationResult = insertServiceRequestSchema.safeParse({
        ...serviceRequestData,
        clientId: user.id
      });
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid service request data", 
          errors: validationResult.error.format()
        });
      }
      
      console.log("Direct service request validated successfully");
      
      // Create service request
      const serviceRequest = await storage.createServiceRequest(validationResult.data);
      console.log("Direct service request created successfully:", serviceRequest.id);
      
      // Notify administrators
      const admins = await storage.getUsersByRole("admin");
      console.log(`Notifying ${admins.length} admins about new service request`);
      
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          title: "New Service Request",
          message: `New ${serviceRequestData.serviceType} service request submitted by ${user.username}`,
          type: "service_request",
          priority: "high",
          relatedItemId: serviceRequest.id,
          relatedItemType: "service_request",
          emoji: "🔔",
          actionUrl: `/service-requests/${serviceRequest.id}`
        });
      }
      
      console.log("Direct service request process completed successfully");
      return res.status(201).json(serviceRequest);
    } catch (error) {
      console.error("Error creating direct service request:", error);
      return res.status(500).json({ 
        message: "Failed to create direct service request", 
        error: String(error) 
      });
    }
  });

  const httpServer = createServer(app);
  
  // Set up WebSocket server on a distinct path
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });
  
  // Store connected clients with their user info
  const clients = new Map();
  
  // Store message history (limited to 1000 recent messages)
  let chatHistory: ChatMessage[] = [];
  
  /**
   * Send a real-time notification to a connected client
   * @param userId The ID of the user to send the notification to
   * @param notification The notification object to send
   * @returns True if notification was sent, false if user is not connected
   */
  async function sendRealTimeNotification(userId: number, notification: any): Promise<boolean> {
    const client = clients.get(userId);
    if (client && client.socket.readyState === WebSocket.OPEN) {
      try {
        client.socket.send(JSON.stringify({
          type: 'notification',
          notification
        }));
        console.log(`Real-time notification sent to user ${userId}`);
        return true;
      } catch (error) {
        console.error(`Error sending real-time notification to user ${userId}:`, error);
        return false;
      }
    }
    return false;
  }
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    let userId: number | null = null;
    let username: string | null = null;
    let userRole: string | null = null;

    ws.on('message', async (message) => {
      try {
        const messageString = message.toString();
        console.log('WebSocket message received:', messageString);
        const data = JSON.parse(messageString);
        
        if (data.type === 'auth') {
          // Authenticate user
          userId = data.userId;
          username = data.username;
          userRole = data.role;
          
          if (userId && username) {
            // Store client connection
            clients.set(userId, {
              userId,
              username,
              role: userRole,
              socket: ws
            });
            
            // Send message history to newly connected client
            ws.send(JSON.stringify({
              type: 'history',
              messages: chatHistory
            }));
            
            // Send any unread notifications
            try {
              const unreadNotifications = await storage.getUnreadNotificationsByUserId(userId);
              if (unreadNotifications.length > 0) {
                ws.send(JSON.stringify({
                  type: 'notifications',
                  notifications: unreadNotifications
                }));
              }
            } catch (error) {
              console.error('Error fetching unread notifications:', error);
            }
            
            console.log(`User authenticated: ${username} (ID: ${userId})`);
          }
        } else if (data.type === 'message' && userId) {
          // Handle new message
          const messageData = data.message;
          
          if (!messageData.receiverId || !messageData.content) {
            console.error('Invalid message format');
            return;
          }
          
          // Get sender details
          const user = await storage.getUser(userId);
          if (!user) {
            console.error(`User not found: ${userId}`);
            return;
          }
          
          // Add user details to message
          const newMessage: ChatMessage = {
            ...messageData,
            senderId: userId,
            senderName: user.fullName || user.username,
            timestamp: messageData.timestamp || new Date().toISOString()
          };
          
          // Optional: Get project details if projectId is provided
          if (newMessage.projectId) {
            const project = await storage.getProject(newMessage.projectId);
            if (project) {
              newMessage.projectName = project.name;
            }
          }
          
          // Optional: Get receiver details
          const receiver = await storage.getUser(newMessage.receiverId);
          if (receiver) {
            newMessage.receiverName = receiver.fullName || receiver.username;
          }
          
          // Save message to history
          chatHistory.push(newMessage);
          if (chatHistory.length > 1000) {
            // Keep history manageable by limiting to last 1000 messages
            chatHistory = chatHistory.slice(-1000);
          }
          
          // Send message to recipient if online
          const recipientClient = clients.get(newMessage.receiverId);
          if (recipientClient && recipientClient.socket.readyState === WebSocket.OPEN) {
            recipientClient.socket.send(JSON.stringify({
              type: 'message',
              message: newMessage
            }));
          }
          
          // Send confirmation back to sender
          ws.send(JSON.stringify({
            type: 'message',
            message: newMessage
          }));
          
          // Create a smart notification for the recipient
          try {
            // Create a notification using the smart notification system
            const notification = await createMessageNotification(
              newMessage.receiverId,
              newMessage.senderName,
              newMessage.content,
              Date.now(), // Use current timestamp as temporary message ID
              newMessage.projectId,
              newMessage.projectName
            );
            
            // Send a real-time notification to recipient if they're online
            await sendRealTimeNotification(newMessage.receiverId, notification);
          } catch (error) {
            console.error('Failed to create notification', error);
          }
        } else if (data.type === 'mark_read' && userId) {
          // Mark notifications as read
          const { notificationIds } = data;
          if (Array.isArray(notificationIds) && notificationIds.length > 0) {
            try {
              await storage.markNotificationsAsRead(notificationIds);
              ws.send(JSON.stringify({
                type: 'notifications_marked_read',
                notificationIds
              }));
            } catch (error) {
              console.error('Error marking notifications as read:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      if (userId) {
        clients.delete(userId);
      }
    });
  });
  
  // Admin endpoint to get specific project details with client information
  app.post("/api/direct-admin/projects/:projectId", async (req, res) => {
    try {
      const { adminUsername } = req.body;
      const projectId = parseInt(req.params.projectId);
      
      console.log(`Admin ${adminUsername} is requesting project #${projectId}`);
      
      // Verify admin access
      const admin = await storage.getUserByUsername(adminUsername);
      
      if (!admin || admin.role !== 'admin') {
        console.log(`Admin verification failed for ${adminUsername}`);
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // Get the project
      const project = await storage.getProject(projectId);
      if (!project) {
        console.log(`Project #${projectId} not found`);
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get client details
      const client = await storage.getUser(project.clientId);
      
      // Create enriched project object with client details
      const enrichedProject = {
        ...project,
        clientDetails: client ? {
          id: client.id,
          username: client.username,
          email: client.email,
          fullName: client.fullName,
          phone: client.phone,
          address: client.address,
          role: client.role,
          createdAt: client.createdAt
        } : null
      };
      
      console.log(`Sending enriched project #${projectId} to admin ${adminUsername}`);
      
      res.json(enrichedProject);
    } catch (error) {
      console.error("Admin get project error:", error);
      res.status(500).json({ message: "Server error fetching project" });
    }
  });
  
  // Direct API endpoint for service provider bidding requests
  app.post("/api/provider-bidding-direct", async (req, res) => {
    try {
      const { userId, username, role } = req.body;
      
      if (!userId || !username) {
        return res.status(400).json({ 
          message: "Missing credentials",
          details: "userId and username are required"
        });
      }
      
      // Verify the user exists and credentials match
      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.username !== username) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      if (user.role !== 'service_provider') {
        return res.status(403).json({ message: "User is not a service provider" });
      }
      
      console.log(`Direct bidding requests fetch for service provider: ${username} (ID: ${userId})`);
      
      // Get all service requests that are published for bidding
      const requests = await storage.getServiceRequestsByStatus("published_for_bidding");
      
      // Get all bids by this service provider
      const providerBids = await storage.getBidsByServiceProvider(parseInt(userId));
      
      // Map to keep track of which requests the provider has already bid on
      const bidMap = {};
      for (const bid of providerBids) {
        bidMap[bid.serviceRequestId] = bid;
      }
      
      // Combine the requests with bid information, but hide client personal information
      const requestsWithBidInfo = requests.map(request => {
        const bid = bidMap[request.id];
        
        // Create a version without client personal information
        return {
          ...request,
          clientId: undefined, // Hide client ID
          clientIdentifier: `Client-${request.id}`, // Generic identifier
          userBidStatus: bid ? bid.status : null,
          bidAmount: bid ? bid.amount : null,
          bidId: bid ? bid.id : null,
          bidPoints: bid ? bid.pointsUsed : null
        };
      });

      return res.json(requestsWithBidInfo);
    } catch (error) {
      console.error("Error fetching bidding requests:", error);
      return res.status(500).json({ message: "Failed to fetch bidding requests" });
    }
  });
  
  return httpServer;
}
