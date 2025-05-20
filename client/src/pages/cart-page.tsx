import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Plus, Minus, Trash2, X, PackageOpen, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/layouts/dashboard-layout";

export default function CartPage() {
  const { items, totalItems, totalAmount, updateItemQuantity, removeItem, clearCart } = useCart();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const handleCheckout = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    // Navigate to checkout page which will need to be created separately
    navigate("/checkout");
  };

  const formatPrice = (price: number) => {
    return `₵${(price / 100).toFixed(2)}`;
  };

  return (
    <DashboardLayout title="Shopping Cart">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mr-4"
            onClick={() => navigate("/materials/browse")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Materials
          </Button>
          <h1 className="text-2xl font-bold flex items-center">
            <ShoppingCart className="mr-2 h-5 w-5" />
            Your Cart
            {totalItems > 0 && (
              <Badge variant="outline" className="ml-2">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </Badge>
            )}
          </h1>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 bg-muted/20 rounded-lg">
            <PackageOpen className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium">Your cart is empty</h3>
            <p className="text-muted-foreground mt-2 mb-6 max-w-md">
              Browse our catalog of construction materials and add items to your cart.
            </p>
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => navigate("/materials/browse")}
            >
              Browse Materials
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="col-span-2 space-y-4">
              <div className="bg-background rounded-md shadow-sm border">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-medium">Cart Items</h2>
                </div>
                
                <div className="divide-y">
                  {items.map((item) => (
                    <div key={item.materialId} className="p-4 flex items-start gap-4">
                      <div 
                        className="h-24 w-24 rounded-md overflow-hidden bg-muted flex-shrink-0" 
                      >
                        {item.imageUrl ? (
                          <img 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-accent">
                            <PackageOpen className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between">
                          <div>
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {formatPrice(item.price)} / {item.unit}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-gray-500 hover:text-red-500 hover:bg-red-50" 
                            onClick={() => removeItem(item.materialId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center border rounded-md">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 rounded-none text-gray-600"
                              onClick={() => updateItemQuantity(item.materialId, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val)) {
                                  updateItemQuantity(item.materialId, val);
                                }
                              }}
                              className="h-9 w-14 text-center border-0"
                            />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 rounded-none text-gray-600"
                              onClick={() => updateItemQuantity(item.materialId, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="font-medium">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  className="border-primary text-primary hover:bg-primary/10"
                  onClick={() => navigate("/materials/browse")}
                >
                  Continue Shopping
                </Button>
                <Button 
                  variant="outline" 
                  className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={clearCart}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Cart
                </Button>
              </div>
            </div>
            
            <div className="col-span-1">
              <div className="bg-background rounded-md shadow-sm p-5 sticky top-4 border">
                <h2 className="text-lg font-medium mb-4">Order Summary</h2>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal ({totalItems} items)</span>
                    <span>{formatPrice(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery Fee</span>
                    <span>Calculated at checkout</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Taxes</span>
                    <span>Calculated at checkout</span>
                  </div>
                  
                  <div className="border-t my-3 pt-3">
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>{formatPrice(totalAmount)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Delivery fees and taxes will be calculated at checkout
                    </p>
                  </div>
                  
                  <Button 
                    className="w-full mt-3 bg-primary hover:bg-primary/90 text-primary-foreground" 
                    size="lg" 
                    onClick={handleCheckout}
                  >
                    Proceed to Checkout
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}