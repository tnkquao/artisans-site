import { Material } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MaterialCardProps {
  material: Material;
  onAddToOrder: (material: Material) => void;
}

export function MaterialCard({ material, onAddToOrder }: MaterialCardProps) {
  const formatPrice = (price: number) => {
    return `₵${(price / 100).toFixed(2)}`;
  };

  return (
    <Card className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="h-36 overflow-hidden">
        <img
          src={material.imageUrl || `https://source.unsplash.com/random/500x400/?construction,material,${material.id}`}
          alt={material.name}
          className="w-full h-full object-cover"
        />
      </div>
      <CardContent className="p-4">
        <h4 className="font-medium">{material.name}</h4>
        <p className="text-sm text-gray-500 mt-1">{material.description}</p>
        <div className="flex justify-between items-center mt-3">
          <span className="font-medium text-primary">
            {formatPrice(material.price)} / {material.unit}
          </span>
          <Button 
            onClick={() => onAddToOrder(material)} 
            className="text-sm text-white bg-secondary hover:bg-secondary-light py-1 px-3 rounded"
          >
            Add to Order
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
