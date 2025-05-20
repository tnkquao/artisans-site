// Load environment variables before any other imports
import * as dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { checkDatabaseConnection } from "./db";

// Set the USE_MOCK_EMAIL environment variable for development
process.env.USE_MOCK_EMAIL = "true";

// Log environment settings for debugging
console.log("Environment:", {
  NODE_ENV: process.env.NODE_ENV || 'development',
  DOMAIN_NAME: process.env.DOMAIN_NAME || 'not set',
  BASE_URL: process.env.BASE_URL || 'not set',
});

// Check database connection
(async () => {
  try {
    console.log("Checking database connection...");
    const connected = await checkDatabaseConnection();
    if (connected) {
      console.log("Database connection is healthy");
    } else {
      console.warn("Database connection check failed - application will continue but some features may not work");
    }
  } catch (error) {
    console.error("Database connection check error:", error);
    console.warn("Continuing application startup despite database connection issues");
  }
})();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public')); // Serve static files from the public directory

// Add database connection status endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbConnected = await checkDatabaseConnection();
    res.json({
      status: 'ok',
      database: dbConnected ? 'connected' : 'error',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      database: 'error',
      error: error?.message || 'Unknown database error',
      timestamp: new Date().toISOString()
    });
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Add direct admin dashboard route - server-rendered HTML with simple authentication
  app.get("/admin-server", async (req, res, next) => {
    // Skip this route if it's an API request to avoid interfering with the API
    if (req.path.startsWith("/api")) {
      return next();
    }

    // Basic authentication check - this is minimal and should be enhanced in production
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      // If not authenticated, show a simple login page
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Admin Login | Artisans Ghana</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        </head>
        <body class="bg-gray-100 min-h-screen flex items-center justify-center">
          <div class="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
            <div class="px-6 py-8">
              <h2 class="text-center text-3xl font-bold text-gray-900 mb-6">Admin Login Required</h2>
              <p class="text-center text-gray-600 mb-6">Please log in through the main application first.</p>
              <div class="flex justify-center">
                <a href="/auth" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  Go to Login Page
                </a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
    }
    
    // If authenticated, ensure user is admin
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Access Denied | Artisans Ghana</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        </head>
        <body class="bg-gray-100 min-h-screen flex items-center justify-center">
          <div class="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
            <div class="px-6 py-8">
              <div class="flex justify-center mb-6">
                <div class="rounded-full bg-red-100 p-3">
                  <svg class="h-8 w-8 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <h2 class="text-center text-3xl font-bold text-gray-900 mb-6">Access Denied</h2>
              <p class="text-center text-gray-600 mb-6">Only administrators can access this dashboard.</p>
              <div class="flex justify-center">
                <a href="/" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  Return to Home
                </a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
    }

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
      
      // Render a server-side HTML admin dashboard
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Server-side Admin Dashboard | Artisans Ghana</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; }
            .stats-card { transition: all 0.3s ease; }
            .stats-card:hover { transform: translateY(-5px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
          </style>
        </head>
        <body class="bg-gray-100 min-h-screen">
          <header class="bg-indigo-600 shadow-lg">
            <div class="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
              <h1 class="text-3xl font-bold text-white">Artisans Ghana Admin</h1>
              <div class="flex items-center space-x-4">
                <span class="text-sm text-white opacity-90">Server-side Dashboard</span>
                <a href="/" class="px-4 py-2 bg-white text-indigo-700 rounded-md hover:bg-indigo-50 transition">
                  Return to App
                </a>
              </div>
            </div>
          </header>
          
          <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <!-- Stats Section -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div class="stats-card bg-white overflow-hidden shadow-md rounded-lg p-6">
                <div class="flex items-center">
                  <div class="flex-shrink-0 bg-blue-100 rounded-md p-3">
                    <svg class="h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-medium text-gray-500 truncate">Clients</dt>
                      <dd class="flex items-baseline">
                        <div class="text-2xl font-semibold text-gray-900">${clients.length}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              
              <div class="stats-card bg-white overflow-hidden shadow-md rounded-lg p-6">
                <div class="flex items-center">
                  <div class="flex-shrink-0 bg-green-100 rounded-md p-3">
                    <svg class="h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-medium text-gray-500 truncate">Service Providers</dt>
                      <dd class="flex items-baseline">
                        <div class="text-2xl font-semibold text-gray-900">${serviceProviders.length}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              
              <div class="stats-card bg-white overflow-hidden shadow-md rounded-lg p-6">
                <div class="flex items-center">
                  <div class="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                    <svg class="h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-medium text-gray-500 truncate">Active Projects</dt>
                      <dd class="flex items-baseline">
                        <div class="text-2xl font-semibold text-gray-900">${projects.length}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              
              <div class="stats-card bg-white overflow-hidden shadow-md rounded-lg p-6">
                <div class="flex items-center">
                  <div class="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                    <svg class="h-8 w-8 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-medium text-gray-500 truncate">Service Requests</dt>
                      <dd class="flex items-baseline">
                        <div class="text-2xl font-semibold text-gray-900">${serviceRequests.length}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Tabs Section -->
            <div class="bg-white overflow-hidden shadow-md rounded-lg mb-8">
              <div class="px-4 sm:px-6 border-b border-gray-200">
                <div class="flex overflow-x-auto">
                  <button onclick="switchTab('projects')" id="tab-projects" class="py-4 px-1 flex items-center text-sm font-medium text-indigo-600 border-b-2 border-indigo-600 focus:outline-none">
                    <span>Projects</span>
                  </button>
                  <button onclick="switchTab('service-requests')" id="tab-service-requests" class="ml-8 py-4 px-1 flex items-center text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300 focus:outline-none">
                    <span>Service Requests</span>
                  </button>
                  <button onclick="switchTab('notifications')" id="tab-notifications" class="ml-8 py-4 px-1 flex items-center text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300 focus:outline-none">
                    <span>Notifications</span>
                  </button>
                </div>
              </div>
              
              <!-- Projects Tab -->
              <div id="content-projects" class="px-4 py-5 sm:p-6">
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                      <tr>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Name</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      ${projects.map(project => `
                        <tr>
                          <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm font-medium text-gray-900">${project.name || 'Unnamed Project'}</div>
                            <div class="text-sm text-gray-500">ID: ${project.id}</div>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm text-gray-900">${project.location || 'N/A'}</div>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                                project.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                project.status === 'active' ? 'bg-green-100 text-green-800' : 
                                project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-gray-100 text-gray-800'}">
                              ${(project.status || 'unknown').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap">
                            <div class="w-full bg-gray-200 rounded-full h-2.5">
                              <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${project.progress || 0}%"></div>
                            </div>
                            <div class="text-xs text-gray-500 mt-1">${project.progress || 0}%</div>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <!-- Service Requests Tab -->
              <div id="content-service-requests" class="hidden px-4 py-5 sm:p-6">
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                      <tr>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Type</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      ${serviceRequests.map(request => `
                        <tr>
                          <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm font-medium text-gray-900">${request.serviceType || request.requestType || 'N/A'}</div>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm text-gray-900">${request.clientName || ('Client #' + request.clientId)}</div>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm text-gray-900">${request.location || 'N/A'}</div>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${request.status === 'published' ? 'bg-blue-100 text-blue-800' : 
                                request.status === 'approved' ? 'bg-green-100 text-green-800' : 
                                request.status.includes('pending') ? 'bg-yellow-100 text-yellow-800' : 
                                request.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                                'bg-gray-100 text-gray-800'}">
                              ${(request.status || 'unknown').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${new Date(request.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Notifications Tab -->
              <div id="content-notifications" class="hidden px-4 py-5 sm:p-6">
                <div class="space-y-4">
                  ${notifications.map(notification => `
                    <div class="p-4 border rounded-lg ${
                      notification.priority === 'high' ? 'border-red-200 bg-red-50' : 
                      notification.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' : 
                      'border-gray-200 bg-gray-50'
                    }">
                      <div class="flex items-start">
                        <div class="flex-shrink-0">
                          <span class="inline-flex items-center justify-center h-8 w-8 rounded-full ${
                            notification.priority === 'high' ? 'bg-red-100 text-red-600' : 
                            notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' : 
                            'bg-blue-100 text-blue-600'
                          }">
                            ${
                              notification.priority === 'high' ? '⚠️' : 
                              notification.priority === 'medium' ? '📣' : 
                              '📌'
                            }
                          </span>
                        </div>
                        <div class="ml-3 w-0 flex-1">
                          <div class="text-sm font-medium text-gray-900">${notification.title}</div>
                          <div class="mt-1 text-sm text-gray-500">${notification.message}</div>
                          <div class="mt-2 flex space-x-4">
                            <span class="text-xs text-gray-500">${new Date(notification.createdAt).toLocaleString()}</span>
                            ${notification.unread ? '<span class="text-xs font-medium text-indigo-600">Unread</span>' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </main>

          <script>
            function switchTab(tabName) {
              // Hide all content
              document.getElementById('content-projects').classList.add('hidden');
              document.getElementById('content-service-requests').classList.add('hidden');
              document.getElementById('content-notifications').classList.add('hidden');
              
              // Remove active state from all tabs
              document.getElementById('tab-projects').classList.remove('text-indigo-600', 'border-indigo-600');
              document.getElementById('tab-projects').classList.add('text-gray-500', 'border-transparent');
              
              document.getElementById('tab-service-requests').classList.remove('text-indigo-600', 'border-indigo-600');
              document.getElementById('tab-service-requests').classList.add('text-gray-500', 'border-transparent');
              
              document.getElementById('tab-notifications').classList.remove('text-indigo-600', 'border-indigo-600');
              document.getElementById('tab-notifications').classList.add('text-gray-500', 'border-transparent');
              
              // Show selected content and set active state
              document.getElementById('content-' + tabName).classList.remove('hidden');
              document.getElementById('tab-' + tabName).classList.remove('text-gray-500', 'border-transparent');
              document.getElementById('tab-' + tabName).classList.add('text-indigo-600', 'border-indigo-600');
            }
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Error in admin-server route:", error);
      // Forward to next handler if there's an error
      next();
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
