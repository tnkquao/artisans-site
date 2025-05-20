import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3,
  PieChart,
  FileText,
  Download,
  Calendar,
  Filter,
  ArrowDownUp,
  Printer,
  FileDown,
  Table as TableIcon
} from "lucide-react";
import AdminDashboardLayout from "@/components/admin/admin-dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useDirectAdminAuth } from "@/hooks/use-direct-admin-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, subDays, subMonths } from "date-fns";

interface ReportData {
  title: string;
  description: string;
  dateRange: {
    from: string;
    to: string;
  };
  data: any; // Generic data structure for different report types
}

export default function AdminReportsPage() {
  const { adminUser } = useDirectAdminAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("financial");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");
  const [reportFormat, setReportFormat] = useState<"table" | "chart">("table");

  // Get date range based on selection
  const getDateRange = () => {
    const today = new Date();
    let fromDate;

    switch (dateRange) {
      case "7d":
        fromDate = subDays(today, 7);
        break;
      case "30d":
        fromDate = subDays(today, 30);
        break;
      case "90d":
        fromDate = subDays(today, 90);
        break;
      case "1y":
        fromDate = subMonths(today, 12);
        break;
      default:
        fromDate = subDays(today, 30);
    }

    return {
      from: format(fromDate, 'yyyy-MM-dd'),
      to: format(today, 'yyyy-MM-dd')
    };
  };

  // Query to get financial reports
  const { 
    data: financialReports, 
    isLoading: isLoadingFinancial
  } = useQuery<ReportData>({
    queryKey: ["/api/direct-admin/reports/financial", dateRange],
    queryFn: async () => {
      if (!adminUser || adminUser.role !== 'admin') {
        return {
          title: "Financial Report",
          description: "Overview of financial performance",
          dateRange: getDateRange(),
          data: {}
        };
      }
      
      try {
        const range = getDateRange();
        const response = await apiRequest("POST", "/api/direct-admin/reports/financial", {
          adminUsername: adminUser.username,
          dateRange: range
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch financial reports");
        }
        
        return await response.json();
      } catch (error) {
        console.error("Error fetching financial reports:", error);
        throw error;
      }
    },
    staleTime: 60000,
    enabled: adminUser?.role === 'admin' && activeTab === "financial",
  });

  // Query to get service provider performance reports
  const { 
    data: providerReports, 
    isLoading: isLoadingProviders
  } = useQuery<ReportData>({
    queryKey: ["/api/direct-admin/reports/providers", dateRange],
    queryFn: async () => {
      if (!adminUser || adminUser.role !== 'admin') {
        return {
          title: "Service Provider Performance",
          description: "Analysis of service provider performance",
          dateRange: getDateRange(),
          data: {}
        };
      }
      
      try {
        const range = getDateRange();
        const response = await apiRequest("POST", "/api/direct-admin/reports/providers", {
          adminUsername: adminUser.username,
          dateRange: range
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch service provider reports");
        }
        
        return await response.json();
      } catch (error) {
        console.error("Error fetching service provider reports:", error);
        throw error;
      }
    },
    staleTime: 60000,
    enabled: adminUser?.role === 'admin' && activeTab === "providers",
  });

  // Query to get materials and orders reports
  const { 
    data: materialsReports, 
    isLoading: isLoadingMaterials
  } = useQuery<ReportData>({
    queryKey: ["/api/direct-admin/reports/materials", dateRange],
    queryFn: async () => {
      if (!adminUser || adminUser.role !== 'admin') {
        return {
          title: "Materials & Orders Report",
          description: "Analysis of material orders and inventory",
          dateRange: getDateRange(),
          data: {}
        };
      }
      
      try {
        const range = getDateRange();
        const response = await apiRequest("POST", "/api/direct-admin/reports/materials", {
          adminUsername: adminUser.username,
          dateRange: range
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch materials reports");
        }
        
        return await response.json();
      } catch (error) {
        console.error("Error fetching materials reports:", error);
        throw error;
      }
    },
    staleTime: 60000,
    enabled: adminUser?.role === 'admin' && activeTab === "materials",
  });

  // Query to get project progress reports
  const { 
    data: projectReports, 
    isLoading: isLoadingProjects
  } = useQuery<ReportData>({
    queryKey: ["/api/direct-admin/reports/projects", dateRange],
    queryFn: async () => {
      if (!adminUser || adminUser.role !== 'admin') {
        return {
          title: "Project Progress Report",
          description: "Overview of project timelines and milestones",
          dateRange: getDateRange(),
          data: {}
        };
      }
      
      try {
        const range = getDateRange();
        const response = await apiRequest("POST", "/api/direct-admin/reports/projects", {
          adminUsername: adminUser.username,
          dateRange: range
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch project reports");
        }
        
        return await response.json();
      } catch (error) {
        console.error("Error fetching project reports:", error);
        throw error;
      }
    },
    staleTime: 60000,
    enabled: adminUser?.role === 'admin' && activeTab === "projects",
  });

  // Get the current report data based on active tab
  const getCurrentReportData = (): ReportData | undefined => {
    switch (activeTab) {
      case "financial":
        return financialReports;
      case "providers":
        return providerReports;
      case "materials":
        return materialsReports;
      case "projects":
        return projectReports;
      default:
        return undefined;
    }
  };

  // Check if current report is loading
  const isLoadingCurrentReport = () => {
    switch (activeTab) {
      case "financial":
        return isLoadingFinancial;
      case "providers":
        return isLoadingProviders;
      case "materials":
        return isLoadingMaterials;
      case "projects":
        return isLoadingProjects;
      default:
        return false;
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Format currency with Ghana Cedi symbol
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Handle export report
  const handleExportReport = (format: 'csv' | 'pdf') => {
    const reportData = getCurrentReportData();
    if (!reportData) return;

    try {
      toast({
        title: "Report Exported",
        description: `${reportData.title} has been exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Could not export report",
        variant: "destructive",
      });
    }
  };

  // Handle print report
  const handlePrintReport = () => {
    window.print();
  };

  // Placeholder functions for displaying chart or table data
  // In a real implementation, these would render actual charts with libraries like recharts
  const renderChartView = (reportData: ReportData | undefined) => {
    if (!reportData) return null;

    return (
      <div className="p-6 bg-muted/20 rounded-md flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="mb-2">Chart visualization would appear here</p>
          <p className="text-muted-foreground text-sm">Using real data from the {reportData.title}</p>
        </div>
      </div>
    );
  };

  const renderTableView = (reportData: ReportData | undefined) => {
    if (!reportData) return null;

    // This is just a placeholder. In reality, we would use the actual data structure
    // from the API response to render the appropriate table
    return (
      <Card className="border border-border/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* In a real implementation, we would map over reportData.data */}
            <TableRow>
              <TableCell className="font-medium">Example data row 1</TableCell>
              <TableCell>Category A</TableCell>
              <TableCell className="text-right">{formatCurrency(1250)}</TableCell>
              <TableCell className="text-right">{formatDate('2025-04-15')}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Example data row 2</TableCell>
              <TableCell>Category B</TableCell>
              <TableCell className="text-right">{formatCurrency(850)}</TableCell>
              <TableCell className="text-right">{formatDate('2025-04-10')}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Example data row 3</TableCell>
              <TableCell>Category A</TableCell>
              <TableCell className="text-right">{formatCurrency(2400)}</TableCell>
              <TableCell className="text-right">{formatDate('2025-04-05')}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    );
  };

  return (
    <AdminDashboardLayout title="Reports & Analytics">
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <CardTitle className="text-2xl font-bold">
                  <FileText className="inline-block mr-2 h-6 w-6" />
                  Reports & Analytics
                </CardTitle>
                <CardDescription>
                  Generate and analyze custom reports for your business
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleExportReport('csv')}
                  className="flex items-center gap-1"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleExportReport('pdf')}
                  className="flex items-center gap-1"
                >
                  <FileDown className="h-4 w-4" />
                  Export PDF
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handlePrintReport}
                  className="flex items-center gap-1"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab} 
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <TabsList className="grid md:grid-cols-4 grid-cols-2 w-full md:w-auto">
                  <TabsTrigger value="financial">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Financial
                  </TabsTrigger>
                  <TabsTrigger value="providers">
                    <PieChart className="h-4 w-4 mr-2" />
                    Providers
                  </TabsTrigger>
                  <TabsTrigger value="materials">
                    <FileText className="h-4 w-4 mr-2" />
                    Materials
                  </TabsTrigger>
                  <TabsTrigger value="projects">
                    <Calendar className="h-4 w-4 mr-2" />
                    Projects
                  </TabsTrigger>
                </TabsList>

                <div className="flex gap-2 w-full md:w-auto">
                  <Select 
                    value={dateRange} 
                    onValueChange={(value) => setDateRange(value as any)}
                  >
                    <SelectTrigger className="w-full md:w-[140px]">
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Time Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="1y">Last year</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select 
                    value={reportFormat} 
                    onValueChange={(value) => setReportFormat(value as any)}
                  >
                    <SelectTrigger className="w-full md:w-[120px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="table">
                        <div className="flex items-center">
                          <TableIcon className="h-4 w-4 mr-2" />
                          Table
                        </div>
                      </SelectItem>
                      <SelectItem value="chart">
                        <div className="flex items-center">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Chart
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isLoadingCurrentReport() ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-1">
                      {getCurrentReportData()?.title}
                    </h2>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {formatDate(getCurrentReportData()?.dateRange.from || '')} - {formatDate(getCurrentReportData()?.dateRange.to || '')}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-2">
                      {getCurrentReportData()?.description}
                    </p>
                  </div>

                  <div>
                    {reportFormat === 'chart' ? (
                      renderChartView(getCurrentReportData())
                    ) : (
                      renderTableView(getCurrentReportData())
                    )}
                  </div>

                  <TabsContent value="financial">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-medium">Total Revenue</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{formatCurrency(45250)}</div>
                          <p className="text-xs text-muted-foreground">
                            <span className="text-green-500">+12.5%</span> from previous period
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-medium">Orders Completed</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">186</div>
                          <p className="text-xs text-muted-foreground">
                            <span className="text-green-500">+8.3%</span> from previous period
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-medium">Average Order Value</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{formatCurrency(243.28)}</div>
                          <p className="text-xs text-muted-foreground">
                            <span className="text-green-500">+4.2%</span> from previous period
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="providers">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-medium">Total Providers</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">24</div>
                          <p className="text-xs text-muted-foreground">
                            <span className="text-green-500">+4</span> new this period
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-medium">Avg. Response Time</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">3.5 hours</div>
                          <p className="text-xs text-muted-foreground">
                            <span className="text-green-500">-15%</span> from previous period
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-medium">Avg. Rating</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">4.7/5</div>
                          <p className="text-xs text-muted-foreground">
                            <span className="text-green-500">+0.2</span> from previous period
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="materials">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-medium">Total Materials</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">152</div>
                          <p className="text-xs text-muted-foreground">
                            <span className="text-green-500">+12</span> new this period
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-medium">Total Orders Value</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{formatCurrency(68450)}</div>
                          <p className="text-xs text-muted-foreground">
                            <span className="text-green-500">+18.2%</span> from previous period
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-medium">Low Stock Items</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">7</div>
                          <p className="text-xs text-muted-foreground">
                            <span className="text-red-500">+3</span> from previous period
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="projects">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-medium">Active Projects</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">38</div>
                          <p className="text-xs text-muted-foreground">
                            <span className="text-green-500">+5</span> from previous period
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-medium">Avg. Completion Time</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">4.5 months</div>
                          <p className="text-xs text-muted-foreground">
                            <span className="text-green-500">-0.5 months</span> from previous avg.
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-medium">On-time Completion</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">92%</div>
                          <p className="text-xs text-muted-foreground">
                            <span className="text-green-500">+4%</span> from previous period
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
}