import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  ClipboardList,
  Calendar,
  TrendingUp,
  Gauge,
  AlertTriangle,
  Download,
  Clock,
  CheckCircle2,
  DollarSign,
  Package2,
  Users,
} from "lucide-react";
import { format } from "date-fns";

export interface ProjectReportsProps {
  project: any;
  timelineEntries: any[];
  expenses: any[];
  siteMaterials: any[];
  teamMembers: any[];
}

// Utility function to format currency
const formatCurrency = (amount: number) => {
  return `₵${amount.toFixed(2)}`;
};

// Utility function to format date
const formatDate = (dateString: string | Date) => {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return format(date, "MMM d, yyyy");
  } catch (error) {
    return String(dateString);
  }
};

export function ProjectReports({ 
  project, 
  timelineEntries, 
  expenses, 
  siteMaterials,
  teamMembers
}: ProjectReportsProps) {
  const [activeTab, setActiveTab] = useState("progress");
  
  // Calculate progress statistics
  const progressStats = useMemo(() => {
    // Filter timeline entries to get only progress updates
    const progressUpdates = timelineEntries.filter(entry => 
      entry.type === 'progress_update' || entry.type === 'milestone'
    );
    
    // Calculate average days between updates
    let daysBetweenUpdates = 0;
    if (progressUpdates.length > 1) {
      const sortedUpdates = [...progressUpdates].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      let totalDays = 0;
      for (let i = 1; i < sortedUpdates.length; i++) {
        const prevDate = new Date(sortedUpdates[i-1].date);
        const currDate = new Date(sortedUpdates[i].date);
        const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        totalDays += diffDays;
      }
      daysBetweenUpdates = Math.round(totalDays / (sortedUpdates.length - 1));
    }
    
    // Find milestone completion dates
    const milestones = timelineEntries.filter(entry => entry.type === 'milestone')
      .map(entry => ({
        title: entry.title,
        date: formatDate(entry.date),
        description: entry.description,
      }));
    
    // Get recent progress updates (last 3)
    const recentUpdates = [...timelineEntries]
      .filter(entry => entry.type === 'progress_update')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3)
      .map(entry => ({
        title: entry.title,
        date: formatDate(entry.date),
        description: entry.description,
        completionPercentage: entry.completionPercentage
      }));
    
    return {
      totalUpdates: progressUpdates.length,
      daysBetweenUpdates,
      milestones,
      recentUpdates,
      currentProgress: project.progress || 0
    };
  }, [timelineEntries, project.progress]);
  
  // Calculate financial statistics
  const financialStats = useMemo(() => {
    if (!expenses || expenses.length === 0) {
      return {
        totalSpent: 0,
        categoriesBreakdown: [],
        recentExpenses: [],
        monthlySpending: []
      };
    }
    
    // Calculate total spent
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Calculate spending by category
    const categoriesMap = new Map();
    expenses.forEach(expense => {
      const category = expense.category || 'Uncategorized';
      categoriesMap.set(category, (categoriesMap.get(category) || 0) + expense.amount);
    });
    
    const categoriesBreakdown = Array.from(categoriesMap.entries())
      .map(([category, amount]) => ({
        category,
        amount: amount as number,
        percentage: Math.round(((amount as number) / totalSpent) * 100)
      }))
      .sort((a, b) => b.amount - a.amount);
    
    // Get recent expenses (last 5)
    const recentExpenses = [...expenses]
      .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())
      .slice(0, 5)
      .map(expense => ({
        title: expense.title,
        amount: expense.amount,
        category: expense.category,
        date: formatDate(expense.date || expense.createdAt),
        vendor: expense.vendor,
      }));
    
    // Calculate monthly spending
    const monthlyMap = new Map();
    expenses.forEach(expense => {
      const date = new Date(expense.date || expense.createdAt);
      const monthYear = format(date, "MMM yyyy");
      monthlyMap.set(monthYear, (monthlyMap.get(monthYear) || 0) + expense.amount);
    });
    
    const monthlySpending = Array.from(monthlyMap.entries())
      .map(([month, amount]) => ({
        month,
        amount: amount as number
      }))
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      });
    
    return {
      totalSpent,
      categoriesBreakdown,
      recentExpenses,
      monthlySpending
    };
  }, [expenses]);
  
  // Calculate materials statistics
  const materialsStats = useMemo(() => {
    if (!siteMaterials || siteMaterials.length === 0) {
      return {
        totalMaterials: 0,
        totalValue: 0,
        materialsBreakdown: [],
        materialsByLocation: [],
        recentlyAdded: []
      };
    }
    
    // Calculate total materials and value
    const totalMaterials = siteMaterials.length;
    const totalValue = siteMaterials.reduce((sum, material) => {
      const price = material.price || 0;
      const quantity = material.quantity || 1;
      return sum + (price * quantity);
    }, 0);
    
    // Group materials by category
    const categoriesMap = new Map();
    siteMaterials.forEach(material => {
      const category = material.category || 'Uncategorized';
      categoriesMap.set(category, (categoriesMap.get(category) || 0) + 1);
    });
    
    const materialsBreakdown = Array.from(categoriesMap.entries())
      .map(([category, count]) => ({
        category,
        count: count as number,
        percentage: Math.round(((count as number) / totalMaterials) * 100)
      }))
      .sort((a, b) => b.count - a.count);
    
    // Group materials by location
    const locationsMap = new Map();
    siteMaterials.forEach(material => {
      const location = material.location || 'Unknown';
      locationsMap.set(location, (locationsMap.get(location) || 0) + 1);
    });
    
    const materialsByLocation = Array.from(locationsMap.entries())
      .map(([location, count]) => ({
        location,
        count: count as number
      }))
      .sort((a, b) => b.count - a.count);
    
    // Get recently added materials (last 5)
    const recentlyAdded = [...siteMaterials]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(material => ({
        name: material.name,
        quantity: material.quantity || 1,
        unit: material.unit || '',
        category: material.category || 'Uncategorized',
        date: formatDate(material.createdAt),
      }));
    
    return {
      totalMaterials,
      totalValue,
      materialsBreakdown,
      materialsByLocation,
      recentlyAdded
    };
  }, [siteMaterials]);
  
  // Calculate team statistics
  const teamStats = useMemo(() => {
    if (!teamMembers || teamMembers.length === 0) {
      return {
        totalMembers: 0,
        roleBreakdown: [],
        joinDates: []
      };
    }
    
    // Calculate total team members
    const totalMembers = teamMembers.length;
    
    // Group members by role
    const rolesMap = new Map();
    teamMembers.forEach(member => {
      const role = member.role || 'Unknown';
      rolesMap.set(role, (rolesMap.get(role) || 0) + 1);
    });
    
    const roleBreakdown = Array.from(rolesMap.entries())
      .map(([role, count]) => ({
        role,
        count: count as number,
        percentage: Math.round(((count as number) / totalMembers) * 100)
      }))
      .sort((a, b) => b.count - a.count);
    
    // Get team member join dates
    const joinDates = [...teamMembers]
      .sort((a, b) => new Date(a.joinedAt || a.createdAt).getTime() - new Date(b.joinedAt || b.createdAt).getTime())
      .map(member => ({
        username: member.username || `Member ${member.userId}`,
        role: member.role,
        joinDate: formatDate(member.joinedAt || member.createdAt),
      }));
    
    return {
      totalMembers,
      roleBreakdown,
      joinDates
    };
  }, [teamMembers]);
  
  // Calculate project overview statistics
  const overviewStats = useMemo(() => {
    // Project start date and duration
    const startDate = project.startDate || project.createdAt;
    const estimatedCompletion = project.estimatedCompletion;
    
    let durationInDays = 0;
    let daysRemaining = 0;
    
    if (startDate && estimatedCompletion) {
      const start = new Date(startDate);
      const end = new Date(estimatedCompletion);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      durationInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const today = new Date();
      const remainingTime = Math.abs(end.getTime() - today.getTime());
      daysRemaining = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));
      
      // If past the estimated completion date, set to 0
      if (today > end) {
        daysRemaining = 0;
      }
    }
    
    // Calculate on-time status and percentage complete
    const onSchedule = project.delayStatus === 'on_schedule' || !project.delayStatus;
    const percentComplete = project.progress || 0;
    
    // Calculate team size
    const teamSize = teamMembers?.length || 0;
    
    // Calculate total expenses
    const totalExpenses = expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
    
    return {
      startDate: startDate ? formatDate(startDate) : 'Not set',
      estimatedCompletion: estimatedCompletion ? formatDate(estimatedCompletion) : 'Not set',
      durationInDays,
      daysRemaining,
      onSchedule,
      percentComplete,
      teamSize,
      totalExpenses
    };
  }, [project, teamMembers, expenses]);
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 mb-6">
          <TabsTrigger value="overview" className="flex items-center text-xs sm:text-sm">
            <ClipboardList className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Overview</span>
            <span className="sm:hidden">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center text-xs sm:text-sm">
            <TrendingUp className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Progress</span>
            <span className="sm:hidden">Progress</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center text-xs sm:text-sm">
            <DollarSign className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Financial</span>
            <span className="sm:hidden">Financial</span>
          </TabsTrigger>
          <TabsTrigger value="materials" className="flex items-center text-xs sm:text-sm">
            <Package2 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Materials</span>
            <span className="sm:hidden">Materials</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center text-xs sm:text-sm">
            <Users className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Team</span>
            <span className="sm:hidden">Team</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Report */}
        <TabsContent value="overview">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Project Overview</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Key metrics and performance indicators for your project
                </p>
              </div>
              <Button variant="outline" size="sm" className="self-start">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground mb-1 flex items-center">
                      <Calendar className="h-4 w-4 mr-1 text-primary" />
                      Timeline
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-xs text-muted-foreground">Started</span>
                        <p className="font-medium">{overviewStats.startDate}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Completion</span>
                        <p className="font-medium">{overviewStats.estimatedCompletion}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Duration</span>
                        <p className="font-medium">{overviewStats.durationInDays} days</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Remaining</span>
                        <p className="font-medium">{overviewStats.daysRemaining} days</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground mb-1 flex items-center">
                      <Gauge className="h-4 w-4 mr-1 text-primary" />
                      Progress Status
                    </span>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold">{overviewStats.percentComplete}%</span>
                        <Badge variant={overviewStats.onSchedule ? "outline" : "destructive"}>
                          {overviewStats.onSchedule ? (
                            <><CheckCircle2 className="h-3 w-3 mr-1" /> On Schedule</>
                          ) : (
                            <><AlertTriangle className="h-3 w-3 mr-1" /> Delayed</>
                          )}
                        </Badge>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary"
                          style={{ width: `${overviewStats.percentComplete}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground mb-1 flex items-center">
                      <Users className="h-4 w-4 mr-1 text-primary" />
                      Team & Activities
                    </span>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Team Size</span>
                        <span className="font-medium">{overviewStats.teamSize} members</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Timeline Updates</span>
                        <span className="font-medium">{progressStats.totalUpdates} entries</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Update Frequency</span>
                        <span className="font-medium">
                          {progressStats.daysBetweenUpdates 
                            ? `Every ${progressStats.daysBetweenUpdates} days` 
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground mb-1 flex items-center">
                      <DollarSign className="h-4 w-4 mr-1 text-primary" />
                      Financial Summary
                    </span>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-muted-foreground">Total Spent</span>
                        <p className="text-2xl font-bold">{formatCurrency(overviewStats.totalExpenses)}</p>
                      </div>
                      {financialStats.categoriesBreakdown.length > 0 && (
                        <div>
                          <span className="text-xs text-muted-foreground">Top Expense</span>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">
                              {financialStats.categoriesBreakdown[0].category}
                            </span>
                            <span className="text-sm">
                              {financialStats.categoriesBreakdown[0].percentage}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-3 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2 text-primary" />
                    Recent Progress Updates
                  </h4>
                  
                  {progressStats.recentUpdates.length > 0 ? (
                    <div className="space-y-3">
                      {progressStats.recentUpdates.map((update, index) => (
                        <div key={index} className="border-b pb-2 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-sm">{update.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {update.completionPercentage}%
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">{update.description}</p>
                          <div className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {update.date}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No progress updates recorded yet
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-3 flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-primary" />
                    Recent Expenses
                  </h4>
                  
                  {financialStats.recentExpenses.length > 0 ? (
                    <div className="space-y-3">
                      {financialStats.recentExpenses.map((expense, index) => (
                        <div key={index} className="border-b pb-2 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-sm">{expense.title}</span>
                            <span className="text-sm font-medium">{formatCurrency(expense.amount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">
                              {expense.category} • {expense.vendor || 'Unknown vendor'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {expense.date}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No expenses recorded yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* Progress Report */}
        <TabsContent value="progress">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Progress Report</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Detailed analysis of project milestones and progress updates
                </p>
              </div>
              <Button variant="outline" size="sm" className="self-start">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center p-2">
                    <Gauge className="h-10 w-10 text-primary mb-2" />
                    <h3 className="text-3xl font-bold mb-1">{project.progress || 0}%</h3>
                    <p className="text-sm text-muted-foreground">Current Completion</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center p-2">
                    <TrendingUp className="h-10 w-10 text-primary mb-2" />
                    <h3 className="text-3xl font-bold mb-1">{progressStats.totalUpdates}</h3>
                    <p className="text-sm text-muted-foreground">Progress Updates</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center p-2">
                    <Clock className="h-10 w-10 text-primary mb-2" />
                    <h3 className="text-3xl font-bold mb-1">
                      {progressStats.daysBetweenUpdates || "N/A"}
                    </h3>
                    <p className="text-sm text-muted-foreground">Days Between Updates</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-3 flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-primary" />
                    Completed Milestones
                  </h4>
                  
                  {progressStats.milestones.length > 0 ? (
                    <div className="space-y-3">
                      {progressStats.milestones.map((milestone, index) => (
                        <div key={index} className="border-b pb-2 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-sm">{milestone.title}</span>
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              {milestone.date}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{milestone.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No milestones recorded yet
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-3 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2 text-primary" />
                    Progress Timeline
                  </h4>
                  
                  {progressStats.recentUpdates.length > 0 ? (
                    <div className="relative pl-5 space-y-5 before:absolute before:inset-y-0 before:left-0 before:ml-[7px] before:border-l-2 before:border-primary/20">
                      {progressStats.recentUpdates.map((update, index) => (
                        <div key={index} className="relative">
                          <div className="absolute left-0 top-[6px] -translate-x-[16px] h-3 w-3 rounded-full bg-primary"></div>
                          <div>
                            <span className="font-medium text-sm">{update.title}</span>
                            <p className="text-xs text-muted-foreground mb-1">{update.description}</p>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {update.date}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {update.completionPercentage}%
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No progress updates recorded yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* Financial Report */}
        <TabsContent value="financial">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Financial Report</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Detailed breakdown of project expenses and financial metrics
                </p>
              </div>
              <Button variant="outline" size="sm" className="self-start">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center p-2">
                    <DollarSign className="h-10 w-10 text-primary mb-2" />
                    <h3 className="text-3xl font-bold mb-1">{formatCurrency(financialStats.totalSpent)}</h3>
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center p-2">
                    <BarChart3 className="h-10 w-10 text-primary mb-2" />
                    <h3 className="text-3xl font-bold mb-1">
                      {financialStats.categoriesBreakdown.length}
                    </h3>
                    <p className="text-sm text-muted-foreground">Expense Categories</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center p-2">
                    <Clock className="h-10 w-10 text-primary mb-2" />
                    <h3 className="text-3xl font-bold mb-1">
                      {financialStats.monthlySpending.length || 0}
                    </h3>
                    <p className="text-sm text-muted-foreground">Months Tracked</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-3 flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2 text-primary" />
                    Expenses by Category
                  </h4>
                  
                  {financialStats.categoriesBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {financialStats.categoriesBreakdown.map((category, index) => (
                        <div key={index}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm">{category.category}</span>
                            <div className="text-sm flex items-center">
                              <span className="font-medium mr-2">{formatCurrency(category.amount)}</span>
                              <Badge variant="outline" className="text-xs">
                                {category.percentage}%
                              </Badge>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary"
                              style={{ width: `${category.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No expense data available
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-3 flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-primary" />
                    Monthly Spending
                  </h4>
                  
                  {financialStats.monthlySpending.length > 0 ? (
                    <div className="space-y-3">
                      {financialStats.monthlySpending.map((month, index) => (
                        <div key={index} className="border-b pb-2 last:border-0 last:pb-0">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">{month.month}</span>
                            <span className="font-medium text-sm">{formatCurrency(month.amount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No monthly spending data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* Materials Report */}
        <TabsContent value="materials">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Materials Report</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Inventory analysis and site materials tracking
                </p>
              </div>
              <Button variant="outline" size="sm" className="self-start">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center p-2">
                    <Package2 className="h-10 w-10 text-primary mb-2" />
                    <h3 className="text-3xl font-bold mb-1">{materialsStats.totalMaterials}</h3>
                    <p className="text-sm text-muted-foreground">Total Materials</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center p-2">
                    <DollarSign className="h-10 w-10 text-primary mb-2" />
                    <h3 className="text-3xl font-bold mb-1">{formatCurrency(materialsStats.totalValue)}</h3>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center p-2">
                    <BarChart3 className="h-10 w-10 text-primary mb-2" />
                    <h3 className="text-3xl font-bold mb-1">
                      {materialsStats.materialsByLocation.length}
                    </h3>
                    <p className="text-sm text-muted-foreground">Storage Locations</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-3 flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2 text-primary" />
                    Materials by Category
                  </h4>
                  
                  {materialsStats.materialsBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {materialsStats.materialsBreakdown.map((category, index) => (
                        <div key={index}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm">{category.category}</span>
                            <div className="text-sm flex items-center">
                              <span className="font-medium mr-2">{category.count} items</span>
                              <Badge variant="outline" className="text-xs">
                                {category.percentage}%
                              </Badge>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary"
                              style={{ width: `${category.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No materials data available
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-3 flex items-center">
                    <Package2 className="h-4 w-4 mr-2 text-primary" />
                    Recently Added Materials
                  </h4>
                  
                  {materialsStats.recentlyAdded.length > 0 ? (
                    <div className="space-y-3">
                      {materialsStats.recentlyAdded.map((material, index) => (
                        <div key={index} className="border-b pb-2 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-sm">{material.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {material.category}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">
                              {material.quantity} {material.unit}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {material.date}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No recent materials added
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* Team Report */}
        <TabsContent value="team">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Team Report</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Project team composition and member contributions
                </p>
              </div>
              <Button variant="outline" size="sm" className="self-start">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center p-2">
                    <Users className="h-10 w-10 text-primary mb-2" />
                    <h3 className="text-3xl font-bold mb-1">{teamStats.totalMembers}</h3>
                    <p className="text-sm text-muted-foreground">Team Members</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center p-2">
                    <BarChart3 className="h-10 w-10 text-primary mb-2" />
                    <h3 className="text-3xl font-bold mb-1">
                      {teamStats.roleBreakdown.length}
                    </h3>
                    <p className="text-sm text-muted-foreground">Distinct Roles</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center p-2">
                    <TrendingUp className="h-10 w-10 text-primary mb-2" />
                    <h3 className="text-3xl font-bold mb-1">
                      {progressStats.totalUpdates || 0}
                    </h3>
                    <p className="text-sm text-muted-foreground">Activity Entries</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-3 flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2 text-primary" />
                    Team Composition
                  </h4>
                  
                  {teamStats.roleBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {teamStats.roleBreakdown.map((role, index) => (
                        <div key={index}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm capitalize">{role.role.replace('_', ' ')}</span>
                            <div className="text-sm flex items-center">
                              <span className="font-medium mr-2">{role.count} members</span>
                              <Badge variant="outline" className="text-xs">
                                {role.percentage}%
                              </Badge>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary"
                              style={{ width: `${role.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No team data available
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-3 flex items-center">
                    <Users className="h-4 w-4 mr-2 text-primary" />
                    Team Timeline
                  </h4>
                  
                  {teamStats.joinDates.length > 0 ? (
                    <div className="relative pl-5 space-y-5 before:absolute before:inset-y-0 before:left-0 before:ml-[7px] before:border-l-2 before:border-primary/20">
                      {teamStats.joinDates.map((member, index) => (
                        <div key={index} className="relative">
                          <div className="absolute left-0 top-[6px] -translate-x-[16px] h-3 w-3 rounded-full bg-primary"></div>
                          <div>
                            <span className="font-medium text-sm">{member.username}</span>
                            <div className="flex justify-between items-center">
                              <Badge variant="outline" className="text-xs capitalize">
                                {member.role?.replace('_', ' ') || 'Member'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3 inline mr-1" />
                                {member.joinDate}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No team data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}