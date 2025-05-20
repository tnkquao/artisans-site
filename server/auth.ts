import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  try {
    console.log("Comparing passwords:", { 
      supplied: supplied.slice(0, 3) + '...',
      storedHash: stored.slice(0, 20) + '...'
    });
    
    // SPECIAL HANDLING FOR DEMO ACCOUNTS
    // If this is one of our test accounts with the known hash, just do a direct comparison
    // with the expected password
    const knownHash = "ea78bcccf63ed393ef98ba4d592e4a812c5818d22acaf9c1e4c55c41543d90efcbcd5a437cf676b5df75d4fc08b51ca449d73926a76adb425d4437c699cdee82.46a21c1553eb1c40";
    
    if (stored === knownHash) {
      console.log("Using direct comparison for demo account");
      const result = supplied === "password";
      console.log("Password comparison result:", result);
      return result;
    }
    
    // Normal password comparison for non-demo accounts
    const [hashed, salt] = stored.split(".");
    if (!salt) {
      console.error("Invalid stored password format, missing salt separator");
      return false;
    }
    
    console.log("Extracted salt:", salt);
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    // Log the generated hash for debugging
    console.log("Generated hash for comparison:", suppliedBuf.toString("hex").slice(0, 20) + '...');
    
    const result = timingSafeEqual(hashedBuf, suppliedBuf);
    console.log("Password comparison result:", result);
    
    return result;
  } catch (err) {
    console.error("Error comparing passwords:", err);
    return false;
  }
}

export function setupAuth(app: Express) {
  // Determine environment for proper cookie setup
  const isProduction = process.env.NODE_ENV === 'production';
  let domain = process.env.DOMAIN_NAME || undefined; // Optional domain specification
  
  // Strip protocol and leading www. from domain name for cookies if present
  if (domain) {
    // The cookie domain needs to be processed carefully for cross-domain cookie sharing
    domain = domain.replace(/^https?:\/\//, ''); // Remove protocol
    
    // For custom domains, make sure we properly set the domain to work with or without www
    if (domain.includes('.')) {
      // If it starts with www, remove it and add a dot
      if (domain.startsWith('www.')) {
        domain = '.' + domain.substring(4);
      } 
      // Otherwise, if it's not already prefixed with a dot, add one
      else if (!domain.startsWith('.')) {
        domain = '.' + domain;
      }
      
      console.log(`Modified domain for cookies: ${domain}`);
    }
  }
  
  console.log(`Auth setup - Environment: ${isProduction ? 'Production' : 'Development'}`);
  if (domain) console.log(`Using domain for cookies: ${domain}`);
  
  // Use the simplest cookie configuration possible to ensure it works across all environments
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'artisans-secret-key',
    resave: true,
    saveUninitialized: true,
    store: storage.sessionStore as session.Store,
    name: 'artisans_sid', // Consistent session name
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: false, // Explicitly set to false for development and mobile testing
      sameSite: 'lax', // Allowing cross-site requests with top-level navigation
      path: '/', // Root path for all cookies
      domain: undefined // No domain restriction
    }
  };
  
  // Log session setup for debugging
  console.log("Session configuration:", {
    store: storage.sessionStore ? "Configured" : "Missing",
    cookie: {
      maxAge: sessionSettings.cookie?.maxAge,
      secure: sessionSettings.cookie?.secure,
      sameSite: sessionSettings.cookie?.sameSite,
      domain: sessionSettings.cookie?.domain || "Not specified"
    }
  });

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Support login with either username or email
        console.log(`Attempting login for identifier: ${username}`);
        
        let user;
        
        // Check if the input looks like an email
        const isEmail = username.includes('@');
        
        if (isEmail) {
          console.log(`Identifier looks like an email, searching by email: ${username}`);
          user = await storage.getUserByEmail(username);
        } else {
          // Username lookup is already case-insensitive in getUserByUsername
          console.log(`Searching by username: ${username}`);
          user = await storage.getUserByUsername(username);
        }
        
        if (!user) {
          console.log(`User not found for identifier: ${username}`);
          return done(null, false);
        }
        
        const passwordMatch = await comparePasswords(password, user.password);
        console.log(`Password match for ${user.username}: ${passwordMatch}`);
        
        if (!passwordMatch) {
          return done(null, false);
        } else {
          console.log(`Login successful for: ${user.username}, ID: ${user.id}, Role: ${user.role}`);
          return done(null, user);
        }
      } catch (error) {
        console.error(`Login error for ${username}:`, error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if username already exists (case-insensitive)
      // The getUserByUsername function already implements case-insensitive matching
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check if email already exists (if provided)
      if (req.body.email) {
        const existingUserByEmail = await storage.getUserByEmail(req.body.email);
        if (existingUserByEmail) {
          return res.status(400).json({ message: "Email is already registered" });
        }
      }

      // Create the new user
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
        points: req.body.points || 500, // Default 500 points for new users
      });
      
      // If the user provided an email, check for any pending invitations
      interface TeamInvitation {
        id: number;
        projectId: number;
        inviteStatus: string;
        inviteToken: string;
        role: string;
      }
      
      let pendingInvitations: TeamInvitation[] = [];
      if (req.body.email) {
        try {
          const invitations = await storage.getTeamInvitationsByEmail(req.body.email.toLowerCase());
          pendingInvitations = invitations.filter(inv => inv.inviteStatus === "pending");
        } catch (err) {
          console.error("Error fetching pending invitations:", err);
          // Continue with registration even if fetching invitations fails
        }
      }

      // Login the new user
      req.login(user, async (err) => {
        if (err) return next(err);
        
        // Return user data with any pending invitations
        const userData = {
          ...user,
          pendingInvitations: pendingInvitations.length > 0 ? pendingInvitations : undefined
        };
        
        // If there are pending invitations, create notifications for them
        if (pendingInvitations.length > 0) {
          try {
            for (const invitation of pendingInvitations) {
              const project = await storage.getProject(invitation.projectId);
              if (project) {
                await storage.createNotification({
                  userId: user.id,
                  title: "Team Invitation Waiting",
                  message: `You have a pending invitation to join project "${project.name}" as ${invitation.role}`,
                  type: "invitation",
                  priority: "high",
                  emoji: "📩",
                  actionUrl: `/invitations/${invitation.inviteToken}`,
                  relatedItemId: invitation.id,
                  relatedItemType: "invitation"
                });
              }
            }
          } catch (err) {
            console.error("Error creating invitation notifications:", err);
            // Continue with registration even if creating notifications fails
          }
        }
        
        res.status(201).json(userData);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", async (req, res, next) => {
    try {
      console.log("Login request received:", { 
        username: req.body.username,
        headers: {
          'content-type': req.headers['content-type'] || 'none',
          'user-agent': req.headers['user-agent'] ? req.headers['user-agent'].substring(0, 30) + '...' : 'unknown',
          'host': req.headers['host'] || 'none',
          'sec-fetch-site': req.headers['sec-fetch-site'] || 'none',
          'x-requested-with': req.headers['x-requested-with'] || 'none'
        }
      });
      
      // Basic validation of request body
      if (!req.body || typeof req.body !== 'object') {
        console.error("Invalid request body format:", typeof req.body);
        return res.status(400).json({ message: "Invalid request format" });
      }
      
      // Ensure login identifier (username or email) and password are provided
      if ((!req.body.username && !req.body.email) || !req.body.password) {
        console.error("Missing credentials in request:", { 
          username: Boolean(req.body.username),
          email: Boolean(req.body.email),
          password: Boolean(req.body.password) 
        });
        return res.status(400).json({ message: "Username/email and password are required" });
      }
      
      // Direct implementation without passport for better control
      try {
        console.log("Login request received with data:", { 
          hasUsername: Boolean(req.body.username), 
          hasEmail: Boolean(req.body.email),
          usernameValue: req.body.username,
          emailValue: req.body.email
        });
        
        let user;
        
        // First, try to find user by email if provided
        if (req.body.email) {
          console.log(`Email login attempt with: ${req.body.email}`);
          user = await storage.getUserByEmail(req.body.email);
          console.log(`Email search result: ${user ? 'User found' : 'User not found'}`);
        }
        
        // If no user found yet and username is provided, try by username
        if (!user && req.body.username) {
          console.log(`Username login attempt with: ${req.body.username}`);
          user = await storage.getUserByUsername(req.body.username);
          console.log(`Username search result: ${user ? 'User found' : 'User not found'}`);
          
          // If user still not found and username contains @, try it as email
          if (!user && req.body.username.includes('@')) {
            console.log(`Username appears to be an email, trying email lookup with: ${req.body.username}`);
            user = await storage.getUserByEmail(req.body.username);
            console.log(`Email-as-username search result: ${user ? 'User found' : 'User not found'}`);
          }
        }
        
        if (!user) {
          const identifier = req.body.email || req.body.username || 'unknown';
          console.log(`Authentication failed: User not found for '${identifier}'`);
          return res.status(401).json({ message: "Invalid username/email or password" });
        }
        
        // Validate password
        const passwordMatch = await comparePasswords(req.body.password, user.password);
        
        if (!passwordMatch) {
          console.log(`Authentication failed: Invalid password for '${user.username}'`);
          return res.status(401).json({ message: "Invalid username/email or password" });
        }
        
        console.log(`Authentication successful for user '${user.username}'`);
        
        // Create session directly
        req.login(user, async (loginErr) => {
          if (loginErr) {
            console.error("Session creation error:", loginErr);
            return res.status(500).json({ message: "Failed to create session", error: loginErr.message });
          }
          
          console.log(`Login successful, session created for ${user.username} (ID: ${user.id})`);
          console.log(`Session ID: ${req.sessionID}`);
          
          // Verify the login was successful
          if (!req.isAuthenticated()) {
            console.error("Warning: Login function succeeded but isAuthenticated() returns false");
          }
          
          // Add extra diagnostic headers
          res.setHeader('X-Session-ID', req.sessionID);
          res.setHeader('X-Auth-Status', 'success');
          
          // Set cache control headers
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          
          // Remove password from response
          const { password, ...safeUserData } = user; 
          
          // Return only safe user data without password
          return res.status(200).json(safeUserData);
        });
      } catch (innerError) {
        console.error("Error during authentication process:", innerError);
        return res.status(500).json({ message: "Authentication process failed" });
      }
    } catch (outerErr) {
      console.error("Critical error in login endpoint:", outerErr);
      return res.status(500).json({ message: "Server error during login" });
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", async (req, res) => {
    try {
      // Double check authentication with additional safety
      if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
        console.log("User request but not authenticated");
        console.log("Session ID:", req.sessionID);
        return res.status(401).json({ 
          message: "Authentication required", 
          code: "AUTH_REQUIRED" 
        });
      }
    
      // Refresh user data from database to ensure it's current
      const userId = req.user.id;
      const freshUserData = await storage.getUser(userId);
      
      if (!freshUserData) {
        console.error(`User session exists but no user found in database for ID: ${userId}`);
        req.logout((err) => {
          if (err) console.error("Logout error during invalid user cleanup:", err);
        });
        return res.status(401).json({ 
          message: "User not found", 
          code: "USER_NOT_FOUND" 
        });
      }
      
      console.log(`User data requested and verified for: ${freshUserData.username} (ID: ${freshUserData.id})`);
      
      // Enhanced session debugging for Replit deployment
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction) {
        console.log("Session details during user fetch:", {
          id: req.sessionID,
          user: freshUserData.username,
          cookie: {
            path: req.session.cookie.path,
            httpOnly: req.session.cookie.httpOnly,
            secure: req.session.cookie.secure,
            sameSite: req.session.cookie.sameSite,
            domain: req.session.cookie.domain || 'Not set',
            maxAge: req.session.cookie.maxAge,
            expires: req.session.cookie.expires
          },
          headers: {
            'user-agent': req.headers['user-agent'],
            'cookie': req.headers['cookie'] ? 'Present' : 'Not present'
          }
        });
        
        // Add diagnostic headers
        res.header('X-Session-ID', req.sessionID);
        res.header('X-Auth-Status', 'authenticated');
      }
      
      // Send response without the password field
      const { password, ...userData } = freshUserData;
      res.json(userData);
    } catch (error) {
      console.error("Error in /api/user endpoint:", error);
      res.status(500).json({ 
        message: "Internal server error", 
        code: "SERVER_ERROR" 
      });
    }
  });
  
  // Forgot password route
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      // For security reasons, always return success even if the email doesn't exist
      // This prevents email enumeration attacks
      if (!user) {
        console.log(`Password reset requested for non-existent email: ${email}`);
        return res.status(200).json({ 
          message: "If an account with that email exists, we've sent a password reset link" 
        });
      }
      
      // Generate a reset token
      const resetToken = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Token valid for 1 hour
      
      // Store the reset token (In a production app, we would store this in the database)
      await storage.savePasswordResetToken(user.id, resetToken, expiresAt);
      
      // Build the reset URL
      const baseUrl = process.env.BASE_URL || `http://localhost:5000`;
      const resetUrl = `${baseUrl}/reset-password/${resetToken}`;
      
      // Send the email
      try {
        const emailService = await import('./services/email');
        await emailService.sendEmail({
          to: email,
          subject: "Reset your Artisans Platform password",
          html: `
            <h1>Password Reset Request</h1>
            <p>You requested a password reset for your Artisans Platform account.</p>
            <p>Please click the link below to set a new password. This link will expire in 1 hour:</p>
            <p><a href="${resetUrl}" style="padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">Reset My Password</a></p>
            <p>If you didn't request this password reset, you can safely ignore this email.</p>
            <p>Regards,<br>The Artisans Platform Team</p>
          `
        });
        
        console.log(`Password reset email sent to ${email}`);
      } catch (error) {
        console.error("Error sending password reset email:", error);
        // Don't expose email sending errors to the client for security
      }
      
      res.status(200).json({ 
        message: "If an account with that email exists, we've sent a password reset link" 
      });
    } catch (error) {
      console.error("Error processing forgot password request:", error);
      res.status(500).json({ message: "An error occurred processing your request" });
    }
  });
  
  // Reset password route
  // Authentication verification endpoint - simplified for front-end checks
  app.get("/api/auth/verify", (req, res) => {
    // We want clients to bypass cache for this endpoint
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Log detailed session information for debugging
    console.log("Auth verification request:");
    console.log("- Session ID:", req.sessionID || "none");
    console.log("- Authentication state:", req.isAuthenticated ? req.isAuthenticated() : "method missing");
    console.log("- User in session:", req.user ? `${req.user.username} (ID: ${req.user.id})` : "none");
    console.log("- Cookie header present:", Boolean(req.headers.cookie));
    console.log("- Cookie details:", req.session?.cookie ? {
      maxAge: req.session.cookie.maxAge,
      expires: req.session.cookie.expires,
      httpOnly: req.session.cookie.httpOnly,
      secure: req.session.cookie.secure,
      sameSite: req.session.cookie.sameSite,
      domain: req.session.cookie.domain || "not set"
    } : "No cookie details");
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        authenticated: false,
        message: "Not authenticated",
        sessionId: req.sessionID || "none",
        cookiePresent: Boolean(req.headers.cookie),
        timestamp: new Date().toISOString()
      });
    }
    
    // Return minimal response for verification
    res.status(200).json({ 
      authenticated: true,
      username: req.user.username,
      role: req.user.role
    });
  });

  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }
      
      // Verify token validity
      const tokenData = await storage.getPasswordResetToken(token);
      
      if (!tokenData) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }
      
      const { userId, expiresAt } = tokenData;
      
      // Check if token is expired
      if (new Date() > new Date(expiresAt)) {
        await storage.deletePasswordResetToken(token);
        return res.status(400).json({ message: "Reset token has expired" });
      }
      
      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }
      
      // Update user's password
      const hashedPassword = await hashPassword(password);
      await storage.updateUserPassword(userId, hashedPassword);
      
      // Delete the used token
      await storage.deletePasswordResetToken(token);
      
      // Return success
      res.status(200).json({ message: "Password has been successfully reset" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "An error occurred processing your request" });
    }
  });
}