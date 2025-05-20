import { ProjectTimeline } from "@shared/schema";
import { format } from "date-fns";
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Clock } from "lucide-react";

interface ProgressTimelineProps {
  timelineItems: ProjectTimeline[];
  projectName: string;
}

export function ProgressTimeline({ timelineItems, projectName }: ProgressTimelineProps) {
  const getStatusIcon = (status: string) => {
    if (status === "completed") {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    } else if (status === "in_progress") {
      return <Clock className="w-4 h-4 text-primary" />;
    } else {
      return <Circle className="w-4 h-4 text-gray-300" />;
    }
  };

  const formatDate = (date: Date | string) => {
    try {
      return format(new Date(date), "MMM dd, yyyy");
    } catch (e) {
      return "Invalid Date";
    }
  };

  // Sort timeline items by date, most recent first
  const sortedItems = [...timelineItems].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <Card>
      <CardHeader className="px-6 py-4 flex justify-between items-center">
        <CardTitle className="text-lg font-semibold text-gray-800">
          Project Timeline - {projectName}
        </CardTitle>
        <div className="flex space-x-2">
          <button className="text-sm text-gray-500 hover:text-gray-700">
            <i className="fas fa-filter"></i>
          </button>
          <button className="text-sm text-gray-500 hover:text-gray-700">
            <i className="fas fa-download"></i>
          </button>
        </div>
      </CardHeader>
      <CardContent className="px-6 py-2">
        <div className="relative pl-8 space-y-6">
          {/* Vertical Timeline Line */}
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200"></div>
          
          {sortedItems.length > 0 ? (
            sortedItems.map((item) => (
              <div key={item.id} className="relative">
                <div className="absolute left-[-1.75rem] top-1 w-4 h-4">
                  {getStatusIcon(item.status)}
                </div>
                <div>
                  <div className="flex justify-between">
                    <h4 className={`text-sm font-medium ${
                      item.status === "pending" ? "text-gray-400" : ""
                    }`}>
                      {item.title}
                    </h4>
                    <span className={`text-xs ${
                      item.status === "pending" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      {item.status === "in_progress" ? 
                        "In Progress" : 
                        item.status === "pending" ? 
                          "Pending" : 
                          formatDate(item.date)}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${
                    item.status === "pending" ? "text-gray-400" : "text-gray-600"
                  }`}>
                    {item.description}
                  </p>
                  
                  {item.status === "in_progress" && item.completionPercentage && (
                    <div className="mt-2 progress-bar" style={{ maxWidth: "200px" }}>
                      <Progress value={item.completionPercentage} className="h-2" />
                    </div>
                  )}
                  
                  {item.images && item.images.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(item.images as string[]).map((image, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={image} 
                            alt={`${item.title} photo ${index + 1}`} 
                            className="w-16 h-16 rounded-md object-cover border border-gray-200 cursor-pointer"
                            onClick={() => window.open(image, '_blank')}
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                            <div className="text-white text-xs">View</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-4 text-center text-gray-500">
              No timeline entries yet.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
