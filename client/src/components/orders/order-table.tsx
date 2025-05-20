import { Order } from "@shared/schema";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface OrderTableProps {
  orders: Order[];
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function OrderTable({ orders, onLoadMore, hasMore = false }: OrderTableProps) {
  const getStatusBadge = (status: string) => {
    if (status === "delivered") {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          Delivered
        </Badge>
      );
    } else if (status === "in_transit") {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          In Transit
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          Processing
        </Badge>
      );
    }
  };

  const formatDate = (date: Date | string) => {
    try {
      return format(new Date(date), "MMM dd, yyyy");
    } catch (e) {
      return "N/A";
    }
  };

  const formatMaterialsList = (items: any[]) => {
    if (!items || !items.length) return "N/A";
    
    return items
      .map((item) => `${item.name || "Material"}`)
      .join(", ");
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Order ID
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Materials
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Project
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-200">
          {orders.length > 0 ? (
            orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-800">
                    #{order.orderId}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-700">
                    {formatMaterialsList(order.items as any[])}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-700">
                    {order.projectId ? `Project #${order.projectId}` : "N/A"}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  {getStatusBadge(order.status)}
                </TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(order.createdAt)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                No orders found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {hasMore && onLoadMore && (
        <div className="mt-6">
          <Button
            onClick={onLoadMore}
            variant="outline"
            className="w-full py-2 bg-gray-50 text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm"
          >
            Load More Orders
          </Button>
        </div>
      )}
    </div>
  );
}
