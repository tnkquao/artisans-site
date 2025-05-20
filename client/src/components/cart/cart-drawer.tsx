import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/use-cart";
import { ShoppingCart } from "lucide-react";

// Simple cart icon that navigates to the cart page
export function CartDrawer() {
  const { totalItems, viewCart } = useCart();

  return (
    <Button 
      variant="outline" 
      size="icon" 
      className="relative bg-primary/10 border-primary/20 hover:bg-primary/15 text-primary"
      onClick={viewCart}
      aria-label={`View cart with ${totalItems} items`}
    >
      <ShoppingCart className="h-[1.2rem] w-[1.2rem]" />
      {totalItems > 0 && (
        <Badge 
          className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary text-primary-foreground"
        >
          {totalItems}
        </Badge>
      )}
    </Button>
  );
}