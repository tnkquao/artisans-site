import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  isFormData: boolean = false,
): Promise<Response> {
  const headers: Record<string, string> = {};
  let body: any = undefined;

  if (data) {
    if (isFormData) {
      // Don't set Content-Type for FormData, let browser set it with boundary
      body = data;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(data);
    }
  }

  // Add cache control header to prevent caching issues
  headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
  headers["Pragma"] = "no-cache";
  headers["Expires"] = "0";
  
  // Add custom header to identify AJAX requests
  headers["X-Requested-With"] = "XMLHttpRequest";

  // Add a random query parameter to prevent caching for GET requests
  const timestamp = new Date().getTime();
  const finalUrl = method.toUpperCase() === 'GET' 
    ? `${url}${url.includes('?') ? '&' : '?'}_t=${timestamp}` 
    : url;

  // Add current path to headers to help with debugging
  headers["X-Current-Path"] = window.location.pathname;
  
  // Check if there's saved auth data in localStorage
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  if (isLoggedIn) {
    // Add an auth indicator header (doesn't contain sensitive data)
    headers["X-Auth-Check"] = "true";
    
    // Get user data and add the ID to the request for extra auth tracking
    try {
      const userData = JSON.parse(localStorage.getItem("userData") || "null");
      if (userData && userData.id) {
        headers["X-User-ID"] = userData.id.toString();
      }
    } catch (e) {
      console.error("Error parsing saved user data:", e);
    }
  }

  try {
    console.log(`API Request: ${method} ${finalUrl}`);
    const res = await fetch(finalUrl, {
      method,
      headers,
      body,
      credentials: "include", // Always include credentials
      cache: "no-store", // Force bypassing the HTTP cache
      mode: "same-origin", // Only send cookies to same origin
    });

    // Enhanced error handling
    if (res.status >= 400) {
      let errorDetail = "";
      try {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorJson = await res.clone().json();
          errorDetail = `: ${JSON.stringify(errorJson)}`;
        } else {
          const errorText = await res.clone().text();
          errorDetail = `: ${errorText.substring(0, 100)}`;
        }
      } catch (e) {
        errorDetail = "";
      }
      
      // Special handling for authentication errors
      if (res.status === 401) {
        // If we get a 401 and we think we're logged in, there's a cookie issue
        if (isLoggedIn && !url.includes('/login') && !url.includes('/logout')) {
          console.warn(`Authentication error detected when logged in - possible cookie/session issue${errorDetail}`);
        }
      } else {
        console.warn(`API request failed with status ${res.status}${errorDetail}`);
      }
    }

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API Request Error for ${method} ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw" | "redirect";
export const getQueryFn: <T>(options?: {
  on401?: UnauthorizedBehavior;
}) => QueryFunction<T> =
  (options) =>
  async ({ queryKey }) => {
    const unauthorizedBehavior = options?.on401 || "throw";
    
    // Add cache-busting query parameter
    const url = queryKey[0] as string;
    const timestamp = new Date().getTime();
    const cacheBusterUrl = `${url}${url.includes('?') ? '&' : '?'}_t=${timestamp}`;
    
    // Prepare headers with caching prevention and AJAX indicator
    const headers: Record<string, string> = {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "X-Requested-With": "XMLHttpRequest", // Identify as AJAX request
      "X-Current-Path": window.location.pathname // Add current path to help with debugging
    };
    
    // Check if there's saved auth data in localStorage
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    if (isLoggedIn) {
      // Add an auth indicator header (doesn't contain sensitive data)
      headers["X-Auth-Check"] = "true";
      
      // Get user data and add the ID to the request for extra auth tracking
      try {
        const userData = JSON.parse(localStorage.getItem("userData") || "null");
        if (userData && userData.id) {
          headers["X-User-ID"] = userData.id.toString();
        }
      } catch (e) {
        console.error("Error parsing saved user data:", e);
      }
    }
    
    try {
      console.log(`Query Request: GET ${cacheBusterUrl}`);
      const res = await fetch(cacheBusterUrl, {
        method: "GET",
        credentials: "include", // Always include credentials
        cache: "no-store", // Force bypassing the HTTP cache
        mode: "same-origin", // Only send cookies to same origin
        headers
      });
      
      // Enhanced error handling with detailed errors
      if (res.status >= 400) {
        let errorDetail = "";
        let errorData = null;
        
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            errorData = await res.clone().json();
            errorDetail = `: ${JSON.stringify(errorData)}`;
          } else {
            const errorText = await res.clone().text();
            errorDetail = `: ${errorText.substring(0, 100)}`;
          }
        } catch (parseError) {
          errorDetail = "";
        }
        
        // Special handling for 401 Unauthorized responses
        if (res.status === 401) {
          // If we're logged in and get a 401, something is wrong with the session
          if (isLoggedIn && !url.includes('/auth') && !url.includes('/login')) {
            console.warn(`Authentication error detected when user should be logged in${errorDetail}`);
            
            // Automatic redirect to auth page if configured
            if (unauthorizedBehavior === "redirect") {
              console.log("Redirecting to auth page due to authentication failure");
              // Use setTimeout to allow the current code to complete
              setTimeout(() => {
                window.location.href = "/auth";
              }, 100);
              return null;
            }
            
            // Return null if configured
            if (unauthorizedBehavior === "returnNull") {
              console.log(`Returning null for 401 response as configured`);
              return null;
            }
            
            // Otherwise throw a detailed error
            throw new Error(`Authentication required: ${errorDetail || "Status 401"}`);
          }
          
          // Non-logged in 401 handling - return null if configured
          if (unauthorizedBehavior === "returnNull") {
            return null;
          }
        } else {
          console.warn(`Query failed with status ${res.status}${errorDetail}`);
        }
      }
      
      // For any error responses
      await throwIfResNotOk(res);
      
      // Return the parsed response
      try {
        return await res.json();
      } catch (error) {
        console.error(`Error parsing JSON response from ${url}:`, error);
        throw new Error(`Invalid JSON response from server`);
      }
    } catch (error) {
      console.error(`Query Error for ${url}:`, error);
      throw error;
    }
  };

// Function to handle authentication errors
function handleAuthError() {
  // Make sure we're actually logged in before taking action
  if (localStorage.getItem("isLoggedIn") === "true") {
    console.warn("Authentication issue detected, clearing session data");
    
    // Clear localStorage login data
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userData");
    
    // If we're not already on the auth page, redirect
    if (!window.location.pathname.startsWith('/auth')) {
      console.log("Redirecting to auth page due to session expiration");
      window.location.href = "/auth";
    }
  }
}

// Create query client with simpler configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }), // Changed to returnNull to avoid unhandled rejections
      refetchInterval: false,
      refetchOnWindowFocus: true, // Refetch when tab becomes active
      staleTime: 1 * 60 * 1000, // Data considered fresh for 1 minute
      retry: 2, // Retry failed requests twice
      retryDelay: 1000, // Wait 1 second between retries
    },
    mutations: {
      retry: 2, // Retry failed mutations twice
      retryDelay: 1000, // Wait 1 second between retries
    },
  },
});

// Create helper function to check for auth errors in responses
// This will be used in the client components that fetch data
export function checkResponseForAuthError(error: any) {
  if (error?.message?.includes('401') || 
      error?.message?.toLowerCase()?.includes('authentication required') ||
      error?.message?.toLowerCase()?.includes('unauthorized')) {
    handleAuthError();
    return true;
  }
  return false;
}
