import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Project } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DollarSign,
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Trash2,
  FileText,
  Tag,
  Calendar,
  User,
  ThumbsUp,
  BarChart3,
  X
} from "lucide-react";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Define expense type
interface Expense {
  id: number;
  title: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  paymentMethod: string;
  vendor: string;
  receiptImage: string | null;
  invoiceNumber: string;
  recordedBy: {
    userId: number;
    username: string;
    role: string;
  };
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  approvedBy: {
    userId: number;
    username: string;
    role: string;
    date: string;
  } | null;
  comments: any[];
}

// Summary type
interface ExpenseSummary {
  totalSpent: number;
  categories: { [key: string]: number };
}

// Props type
interface ProjectExpensesProps {
  project: Project;
  canEdit: boolean;
}

// Expense categories
const EXPENSE_CATEGORIES = [
  "Materials",
  "Labor",
  "Equipment",
  "Permits",
  "Transportation",
  "Utilities",
  "Subcontractors",
  "Insurance",
  "Professional Fees",
  "Miscellaneous",
  "Other"
];

// Payment methods
const PAYMENT_METHODS = [
  "Cash",
  "Credit Card",
  "Bank Transfer",
  "Check",
  "Mobile Money",
  "PayPal",
  "Other"
];

export function ProjectExpenses({ project, canEdit }: ProjectExpensesProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [addExpenseDialogOpen, setAddExpenseDialogOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "",
    date: new Date().toISOString().split('T')[0],
    category: "Materials",
    paymentMethod: "Cash",
    vendor: "",
    receiptImage: null as string | null,
    invoiceNumber: ""
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  
  // Determine if user can add expenses (client, contractor, or project manager)
  const isClient = user?.id === project.clientId;
  const isContractorOrManager = project.teamMembers && Array.isArray(project.teamMembers) &&
    project.teamMembers.some(member => 
      member.userId === user?.id && 
      (member.role === "contractor" || member.role === "project_manager")
    );
  const canAddExpenses = canEdit && (isClient || isContractorOrManager || user?.role === "admin");
  
  // Get expenses
  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: [`/api/projects/${project.id}/expenses`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/projects/${project.id}/expenses`);
      return response.json();
    },
    enabled: !!project.id
  });
  
  const expenses: Expense[] = expensesData?.expenses || [];
  const summary: ExpenseSummary = expensesData?.summary || { totalSpent: 0, categories: {} };
  
  // Add expense mutation
  const addExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/projects/${project.id}/expenses`, data);
      return response.json();
    },
    onSuccess: () => {
      // Clear form and close dialog
      resetForm();
      setAddExpenseDialogOpen(false);
      
      // Invalidate expenses query
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/expenses`] });
      
      toast({
        title: "Expense added",
        description: "The expense has been recorded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add expense",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Approve expense mutation
  const approveExpenseMutation = useMutation({
    mutationFn: async (expenseId: number) => {
      const response = await apiRequest("PUT", `/api/projects/${project.id}/expenses/${expenseId}/approve`, {});
      return response.json();
    },
    onSuccess: () => {
      // Invalidate expenses query
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/expenses`] });
      
      toast({
        title: "Expense approved",
        description: "The expense has been approved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve expense",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Reject expense mutation
  const rejectExpenseMutation = useMutation({
    mutationFn: async (expenseId: number) => {
      const response = await apiRequest("PUT", `/api/projects/${project.id}/expenses/${expenseId}/reject`, {});
      return response.json();
    },
    onSuccess: () => {
      // Invalidate expenses query
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/expenses`] });
      
      toast({
        title: "Expense rejected",
        description: "The expense has been rejected successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reject expense",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: number) => {
      const response = await apiRequest("DELETE", `/api/projects/${project.id}/expenses/${expenseId}`);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate expenses query
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/expenses`] });
      
      toast({
        title: "Expense deleted",
        description: "The expense has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete expense",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Reset form
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      amount: "",
      date: new Date().toISOString().split('T')[0],
      category: "Materials",
      paymentMethod: "Cash",
      vendor: "",
      receiptImage: null,
      invoiceNumber: ""
    });
    setFormErrors({});
  };
  
  // Validate form
  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.title.trim()) {
      errors.title = "Title is required";
    }
    
    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      errors.amount = "A valid amount greater than 0 is required";
    }
    
    if (!formData.date) {
      errors.date = "Date is required";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = () => {
    if (!validateForm()) return;
    
    const expenseData = {
      ...formData,
      amount: Number(formData.amount)
    };
    
    addExpenseMutation.mutate(expenseData);
  };
  
  // Format currency using Ghana Cedi symbol
  const formatCurrency = (amount: number) => {
    return `₵${amount.toFixed(2)}`;
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (error) {
      return dateString;
    }
  };
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Approved
        </Badge>;
      case "pending":
        return <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>;
      case "rejected":
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Rejected
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };
  
  // Check if user can approve expenses
  const canApproveExpenses = isClient || user?.role === "admin";
  
  // Check if user can delete an expense
  const canDeleteExpense = (expense: Expense) => {
    const isRecorder = expense.recordedBy?.userId === user?.id;
    return isClient || isRecorder || user?.role === "admin";
  };
  
  // Calculate category percentages for chart
  const getCategoryPercentages = () => {
    if (summary.totalSpent === 0) return [];
    
    return Object.entries(summary.categories).map(([category, amount]) => ({
      category,
      amount,
      percentage: Math.round((amount / summary.totalSpent) * 100)
    })).sort((a, b) => b.amount - a.amount);
  };
  
  // Create percentage bars for each category
  const categoryPercentages = getCategoryPercentages();
  const topCategories = categoryPercentages.slice(0, 5);
  
  // Get expense by status
  const getExpensesByStatus = (status: string) => {
    return expenses.filter(expense => expense.status === status);
  };
  
  const pendingExpenses = getExpensesByStatus("pending");
  const approvedExpenses = getExpensesByStatus("approved");
  const rejectedExpenses = getExpensesByStatus("rejected");
  
  return (
    <Card className="shadow-sm border border-gray-200">
      <CardHeader className="flex justify-between items-center p-6">
        <CardTitle className="text-lg font-semibold text-gray-800">Project Expenses</CardTitle>
        {canAddExpenses && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddExpenseDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        {/* Expense Summary */}
        <div className="bg-muted/30 rounded-lg p-4 mb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center">
                <DollarSign className="mr-1 h-5 w-5 text-muted-foreground" />
                Total Spending
              </h3>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(summary.totalSpent)}
              </p>
            </div>
            <div className="mt-2 sm:mt-0 flex items-center text-sm text-muted-foreground">
              <span className="mr-2">
                {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'} recorded
              </span>
              <Badge variant="outline" className="ml-2">
                {pendingExpenses.length} pending
              </Badge>
            </div>
          </div>
          
          {topCategories.length > 0 && (
            <div className="space-y-2 mt-4">
              <h4 className="text-sm font-medium flex items-center mb-2">
                <BarChart3 className="mr-1 h-4 w-4" />
                Spending by Category
              </h4>
              <div className="space-y-3">
                {topCategories.map(({ category, amount, percentage }) => (
                  <div key={category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{category}</span>
                      <span className="font-medium">{formatCurrency(amount)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={percentage} className="h-2" />
                      <span className="text-xs text-muted-foreground w-8">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Expense List */}
        {expensesLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12 border rounded-md bg-muted/30">
            <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No expenses recorded</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {canAddExpenses 
                ? "Start tracking your project spending by adding your first expense."
                : "No expenses have been recorded for this project yet."}
            </p>
            {canAddExpenses && (
              <Button 
                variant="outline" 
                onClick={() => setAddExpenseDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Record First Expense
              </Button>
            )}
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Expenses</TabsTrigger>
              <TabsTrigger value="pending" className="relative">
                Pending
                {pendingExpenses.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                    {pendingExpenses.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected" className="relative">
                Rejected
                {rejectedExpenses.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                    {rejectedExpenses.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Expense</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          <div className="font-medium">{expense.title}</div>
                          <div className="text-xs text-muted-foreground">
                            By {expense.recordedBy?.username}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell>
                          {formatDate(expense.date)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{expense.category}</Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(expense.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {expense.status === "pending" && canApproveExpenses && (
                              <Button 
                                variant="outline" 
                                size="icon"
                                onClick={() => approveExpenseMutation.mutate(expense.id)}
                                disabled={approveExpenseMutation.isPending}
                                title="Approve expense"
                              >
                                <ThumbsUp className="h-4 w-4 text-green-500" />
                              </Button>
                            )}
                            {canDeleteExpense(expense) && (
                              <Button 
                                variant="outline" 
                                size="icon"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this expense?")) {
                                    deleteExpenseMutation.mutate(expense.id);
                                  }
                                }}
                                disabled={deleteExpenseMutation.isPending}
                                title="Delete expense"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="pending">
              {pendingExpenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p>No pending expenses</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Expense</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Recorded By</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>
                            <div className="font-medium">{expense.title}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {expense.description}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell>
                            {formatDate(expense.date)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              <span>{expense.recordedBy?.username}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {canApproveExpenses && (
                                <div className="flex gap-1">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => approveExpenseMutation.mutate(expense.id)}
                                    disabled={approveExpenseMutation.isPending || rejectExpenseMutation.isPending}
                                    className="flex items-center"
                                  >
                                    <ThumbsUp className="h-3 w-3 mr-1 text-green-500" />
                                    Approve
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => rejectExpenseMutation.mutate(expense.id)}
                                    disabled={approveExpenseMutation.isPending || rejectExpenseMutation.isPending}
                                    className="flex items-center"
                                  >
                                    <X className="h-3 w-3 mr-1 text-red-500" />
                                    Reject
                                  </Button>
                                </div>
                              )}
                              {canDeleteExpense(expense) && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this expense?")) {
                                      deleteExpenseMutation.mutate(expense.id);
                                    }
                                  }}
                                  disabled={deleteExpenseMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="approved">
              {approvedExpenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No approved expenses yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Expense</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Approved By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>
                            <div className="font-medium">{expense.title}</div>
                            {expense.vendor && (
                              <div className="text-xs text-muted-foreground">
                                {expense.vendor}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {expense.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(expense.date)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {expense.approvedBy ? (
                              <div className="text-sm">
                                {expense.approvedBy.username}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="rejected">
              {rejectedExpenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-500 opacity-70" />
                  <p>No rejected expenses</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Expense</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Recorded By</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rejectedExpenses.map((expense) => (
                        <TableRow key={expense.id} className="bg-red-50/30">
                          <TableCell>
                            <div className="font-medium">{expense.title}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {expense.description}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {expense.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(expense.date)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              <span>{expense.recordedBy?.username}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {canApproveExpenses && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => approveExpenseMutation.mutate(expense.id)}
                                  disabled={approveExpenseMutation.isPending}
                                  className="flex items-center"
                                >
                                  <ThumbsUp className="h-3 w-3 mr-1 text-green-500" />
                                  Approve
                                </Button>
                              )}
                              {canDeleteExpense(expense) && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this expense?")) {
                                      deleteExpenseMutation.mutate(expense.id);
                                    }
                                  }}
                                  disabled={deleteExpenseMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
      
      {/* Add Expense Dialog */}
      <Dialog open={addExpenseDialogOpen} onOpenChange={setAddExpenseDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Record New Expense</DialogTitle>
            <DialogDescription>
              Add details about a project expense. Required fields are marked with an asterisk (*).
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <Label htmlFor="title" className="flex items-center">
                  Expense Title <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Cement Purchase"
                  className={formErrors.title ? "border-red-500" : ""}
                />
                {formErrors.title && (
                  <p className="text-red-500 text-xs">{formErrors.title}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="amount" className="flex items-center">
                    Amount (₵) <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className={formErrors.amount ? "border-red-500" : ""}
                  />
                  {formErrors.amount && (
                    <p className="text-red-500 text-xs">{formErrors.amount}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="date" className="flex items-center">
                    Date <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className={formErrors.date ? "border-red-500" : ""}
                  />
                  {formErrors.date && (
                    <p className="text-red-500 text-xs">{formErrors.date}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleSelectChange("category", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) => handleSelectChange("paymentMethod", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Additional details about this expense..."
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor/Supplier</Label>
                  <Input
                    id="vendor"
                    name="vendor"
                    value={formData.vendor}
                    onChange={handleInputChange}
                    placeholder="e.g., ABC Suppliers Ltd."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice/Receipt #</Label>
                  <Input
                    id="invoiceNumber"
                    name="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={handleInputChange}
                    placeholder="e.g., INV-12345"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setAddExpenseDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={addExpenseMutation.isPending}
            >
              {addExpenseMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Record Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}