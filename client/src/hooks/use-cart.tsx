import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { Material } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Simpler cart item interface - we don't store the full material object
export interface CartItem {
  materialId: number;
  name: string;
  price: number;
  unit: string;
  imageUrl: string | null;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (material: Material, quantity?: number) => void;
  removeItem: (materialId: number) => void;
  updateItemQuantity: (materialId: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
  isCartReady: boolean;  // Flag to indicate the cart is loaded and ready
  viewCart: () => void;  // Function to navigate to cart page
}

export const CartContext = createContext<CartContextType | null>(null);

// Key for storing cart data in localStorage
const CART_STORAGE_KEY = 'artisans-cart-v3';

export function CartProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartReady, setIsCartReady] = useState(false);

  // Load cart from localStorage on component mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        console.log("Loading cart from storage:", savedCart);
        const parsedCart = JSON.parse(savedCart);
        
        // Validate structure before using
        if (Array.isArray(parsedCart)) {
          // Make sure all items have the expected properties
          const validItems = parsedCart.filter(item => 
            item && 
            typeof item.materialId === 'number' && 
            typeof item.name === 'string' && 
            typeof item.price === 'number' && 
            typeof item.unit === 'string' && 
            typeof item.quantity === 'number'
          );
          
          setItems(validItems);
        } else {
          console.warn("Invalid cart data structure, resetting cart");
          localStorage.removeItem(CART_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error("Error loading cart from storage:", error);
      // If cart data is corrupt, clear it
      localStorage.removeItem(CART_STORAGE_KEY);
      toast({
        title: "Cart data reset",
        description: "There was an issue with your saved cart data.",
        variant: "destructive",
      });
    } finally {
      setIsCartReady(true);
    }
  }, [toast]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    // Only save after initial load to avoid overwriting with empty array
    if (isCartReady) {
      try {
        console.log("Saving cart to storage:", items);
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch (error) {
        console.error("Error saving cart to storage:", error);
        toast({
          title: "Error saving cart",
          description: "There was a problem saving your cart data.",
          variant: "destructive",
        });
      }
    }
  }, [items, isCartReady, toast]);

  const addItem = (material: Material, quantity = 1) => {
    if (!isCartReady) return;
    
    setItems(prevItems => {
      // Check if item already exists in cart
      const existingItemIndex = prevItems.findIndex(item => item.materialId === material.id);
      
      if (existingItemIndex >= 0) {
        // Update quantity if already in cart
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + quantity
        };
        
        toast({
          title: "Cart updated",
          description: `Updated ${material.name} quantity in your cart.`,
        });
        
        return updatedItems;
      } else {
        // Add new item to cart
        const newItem: CartItem = {
          materialId: material.id,
          name: material.name,
          price: material.price,
          unit: material.unit,
          imageUrl: material.imageUrl,
          quantity
        };
        
        toast({
          title: "Added to cart",
          description: `${material.name} has been added to your cart.`,
        });
        
        return [...prevItems, newItem];
      }
    });
  };

  const removeItem = (materialId: number) => {
    if (!isCartReady) return;
    
    setItems(prevItems => {
      const itemToRemove = prevItems.find(item => item.materialId === materialId);
      if (itemToRemove) {
        toast({
          title: "Removed from cart",
          description: `${itemToRemove.name} has been removed from your cart.`,
        });
      }
      return prevItems.filter(item => item.materialId !== materialId);
    });
  };

  const updateItemQuantity = (materialId: number, quantity: number) => {
    if (!isCartReady) return;
    
    if (quantity <= 0) {
      removeItem(materialId);
      return;
    }
    
    setItems(prevItems => 
      prevItems.map(item => 
        item.materialId === materialId 
          ? { ...item, quantity } 
          : item
      )
    );
  };

  const clearCart = () => {
    if (!isCartReady) return;
    
    setItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
    toast({
      title: "Cart cleared",
      description: "All items have been removed from your cart.",
    });
  };

  // Function to navigate to cart page
  const viewCart = () => {
    navigate("/cart");
  };

  const totalItems = items.reduce((total, item) => total + item.quantity, 0);

  const totalAmount = items.reduce(
    (total, item) => total + (item.price * item.quantity), 
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateItemQuantity,
        clearCart,
        totalItems,
        totalAmount,
        isCartReady,
        viewCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}