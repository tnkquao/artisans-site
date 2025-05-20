import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getQueryFn } from "@/lib/queryClient";
import { Project, ProjectTimeline, Order, Material } from "@shared/schema";
import { CircleDollarSign, CalendarClock, TrendingUp, BarChart as BarChartIcon, PieChart as PieChartIcon, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#A4DE6C", "#D0ED57"];

export default function AnalyticsPage() {
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>("timeline");

  // Fetch projects
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch timelines for selected project
  const { data: timelines, isLoading: timelinesLoading, error: timelinesError } = useQuery<ProjectTimeline[]>({
    queryKey: ["/api/projects", selectedProject, "timeline"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!selectedProject,
  });

  // Fetch orders
  const { data: orders, isLoading: ordersLoading, error: ordersError } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch materials
  const { data: materials, isLoading: materialsLoading, error: materialsError } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Set the first project as default when projects are loaded
  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0].id);
    }
  }, [projects, selectedProject]);

  // Calculate budget data
  const getBudgetData = () => {
    if (!orders || !materials) return [];

    // Group items by category
    const categoryTotals: Record<string, number> = {};
    orders.forEach((order) => {
      const orderItems = order.items as { materialId: number; quantity: number }[];
      orderItems.forEach((item) => {
        const material = materials.find((m) => m.id === item.materialId);
        if (material) {
          const category = material.category;
          const itemTotal = material.price * item.quantity;
          categoryTotals[category] = (categoryTotals[category] || 0) + itemTotal;
        }
      });
    });

    // Convert to array for chart
    return Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value: value / 100, // Convert cents to dollars for display
    }));
  };

  // Calculate timeline progression
  const getTimelineData = () => {
    if (!timelines) return [];

    return timelines
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((timeline) => ({
        name: new Date(timeline.date).toLocaleDateString(),
        progress: timeline.completionPercentage || 0,
      }));
  };

  // Calculate material usage
  const getMaterialUsageData = () => {
    if (!orders || !materials) return [];

    // Count how many times each material was ordered
    const materialCounts: Record<number, number> = {};
    orders.forEach((order) => {
      const orderItems = order.items as { materialId: number; quantity: number }[];
      orderItems.forEach((item) => {
        materialCounts[item.materialId] = (materialCounts[item.materialId] || 0) + item.quantity;
      });
    });

    // Convert to array for chart with material names
    return Object.entries(materialCounts)
      .map(([materialId, count]) => {
        const material = materials.find((m) => m.id === parseInt(materialId));
        return {
          name: material ? material.name : `Material #${materialId}`,
          count,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 most used materials
  };

  // Calculate projected vs actual costs
  const getCostComparisonData = () => {
    if (!projects || !orders) return [];

    // This is a simplified example. In a real application, you would have 
    // budgeted costs stored in the project or separate budget table
    const projectCosts: Record<string, { projected: number; actual: number }> = {};

    // Assume each project has a simplified budget of $5000 per project
    projects.forEach((project) => {
      projectCosts[project.name] = {
        projected: 5000,
        actual: 0,
      };
    });

    // Calculate actual costs from orders
    orders.forEach((order) => {
      const project = projects.find((p) => p.id === order.projectId);
      if (project) {
        projectCosts[project.name].actual += order.totalAmount / 100; // Convert cents to dollars
      }
    });

    // Convert to array for chart
    return Object.entries(projectCosts).map(([name, { projected, actual }]) => ({
      name,
      projected,
      actual,
    }));
  };

  const renderAnalyticsContent = () => {
    if (projectsLoading || timelinesLoading || ordersLoading || materialsLoading) {
      return (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-1/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-1/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
        </div>
      );
    }

    if (projectsError || timelinesError || ordersError || materialsError) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load analytics data. Please try again later.
          </AlertDescription>
        </Alert>
      );
    }

    if (!projects || projects.length === 0) {
      return (
        <Alert>
          <AlertTitle>No Projects</AlertTitle>
          <AlertDescription>
            There are no projects available for analytics. Create a project to see data here.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            <span>Timeline Progress</span>
          </TabsTrigger>
          <TabsTrigger value="budget" className="flex items-center gap-2">
            <CircleDollarSign className="h-4 w-4" />
            <span>Budget Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="materials" className="flex items-center gap-2">
            <BarChartIcon className="h-4 w-4" />
            <span>Materials Usage</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="pt-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Project Progress Timeline</CardTitle>
                <CardDescription>
                  Track project completion percentage over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={getTimelineData()}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="progress"
                      name="Completion %"
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Project Status Overview</CardTitle>
                <CardDescription>
                  Current status of all projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={projects.map((project) => ({
                      name: project.name,
                      progress: project.progress,
                    }))}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="progress" name="Progress %" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="budget" className="pt-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Budget Allocation</CardTitle>
                <CardDescription>
                  Budget allocation by material category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getBudgetData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {getBudgetData().map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`$${value.toFixed(2)}`, "Amount"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Projected vs Actual Costs</CardTitle>
                <CardDescription>
                  Compare projected and actual costs for projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={getCostComparisonData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [`$${value}`, ""]} />
                    <Legend />
                    <Bar dataKey="projected" name="Projected Cost" fill="#8884d8" />
                    <Bar dataKey="actual" name="Actual Cost" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="materials" className="pt-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Materials Used</CardTitle>
                <CardDescription>
                  Most frequently ordered materials
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={getMaterialUsageData()}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Quantity" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Material Cost Distribution</CardTitle>
                <CardDescription>
                  Total cost spent on each material category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getBudgetData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) =>
                        `${name}: $${value.toFixed(2)}`
                      }
                    >
                      {getBudgetData().map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`$${value.toFixed(2)}`, "Amount"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <DashboardLayout title="Project Analytics">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Advanced Analytics</h2>
            <p className="text-muted-foreground">
              Track project timelines, budget allocation, and material usage.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Select
              value={selectedProject?.toString() || ""}
              onValueChange={(value) => setSelectedProject(parseInt(value))}
              disabled={!projects || projects.length === 0}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Projects
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projectsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  projects?.length || 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Active construction projects
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Average Progress
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projectsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  `${Math.round(
                    (projects?.reduce((sum, project) => sum + project.progress, 0) || 0) /
                      (projects?.length || 1)
                  )}%`
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all projects
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Orders
              </CardTitle>
              <BarChartIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {ordersLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  orders?.length || 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Material orders placed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Spent
              </CardTitle>
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {ordersLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  `$${(
                    (orders?.reduce((sum, order) => sum + order.totalAmount, 0) || 0) / 100
                  ).toFixed(2)}`
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Total budget utilized
              </p>
            </CardContent>
          </Card>
        </div>

        {renderAnalyticsContent()}
      </div>
    </DashboardLayout>
  );
}