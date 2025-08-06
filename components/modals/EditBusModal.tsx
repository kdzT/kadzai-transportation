// components/modals/EditBusModal.tsx
import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Bus, Seat, BusType } from "../../context/BookingContext"; // Updated import
import { toast } from "sonner";

interface EditBusModalProps {
  bus: Bus;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedBus: Bus) => void;
  busTypes: BusType[]; // Added
}

export default function EditBusModal({
  bus,
  isOpen,
  onClose,
  onSave,
  busTypes,
}: EditBusModalProps) {
  const [formData, setFormData] = useState({
    operator: bus.operator,
    busType: bus.busType,
    rating: bus.rating.toString(),
    amenities: bus.amenities,
  });

  const availableAmenities = [
    "AC",
    "WiFi",
    "Entertainment",
    "Charging Port",
    "Snacks",
    "Refreshments",
    "Reclining Seats",
    "Blanket",
  ];

  const generateSeats = (busType: string): Seat[] => {
    const seats: Seat[] = [];
    const type = busTypes.find((t) => t.name === busType);
    const seatCount = type ? type.seats : busType === "luxury" ? 32 : 48;
    const layout =
      busType === "luxury"
        ? ["A", "B", "C", "D"]
        : ["A", "B", "C", "D", "E", "F"];
    const rows = Math.ceil(seatCount / layout.length);

    for (let row = 1; row <= rows; row++) {
      const seatRow = String(row).padStart(2, "0");
      layout.forEach((letter) => {
        seats.push({
          id: `${seatRow}${letter}`,
          number: `${seatRow}${letter}`,
          isAvailable: true,
          isSelected: false,
          type: busType === "luxury" && row <= 2 ? "premium" : "regular",
          price:
            busType === "luxury" && row <= 2
              ? 1500
              : busType === "luxury"
              ? 1200
              : 800,
        });
      });
    }
    return seats;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAmenityChange = (amenity: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      amenities: checked
        ? [...prev.amenities, amenity]
        : prev.amenities.filter((a) => a !== amenity),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.operator) {
      toast.error("Please fill in the operator field");
      return;
    }

    const updatedBus: Bus = {
      ...bus,
      operator: formData.operator,
      busType: formData.busType,
      rating: parseFloat(formData.rating),
      amenities: formData.amenities,
      seats: generateSeats(formData.busType),
    };
    onSave(updatedBus);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Bus</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="operator">
                  Bus Operator <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="operator"
                  name="operator"
                  value={formData.operator}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="busType">Bus Type</Label>
                <Select
                  value={formData.busType}
                  onValueChange={(value) =>
                    handleSelectChange("busType", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {busTypes.map((type) => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.name} ({type.seats} seats)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="rating">Rating</Label>
                <Select
                  value={formData.rating}
                  onValueChange={(value) => handleSelectChange("rating", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "3.0",
                      "3.5",
                      "4.0",
                      "4.2",
                      "4.5",
                      "4.7",
                      "4.8",
                      "5.0",
                    ].map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Amenities</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {availableAmenities.map((amenity) => (
                  <div key={amenity} className="flex items-center space-x-2">
                    <Checkbox
                      id={amenity}
                      checked={formData.amenities.includes(amenity)}
                      onCheckedChange={(checked) =>
                        handleAmenityChange(amenity, checked as boolean)
                      }
                    />
                    <Label htmlFor={amenity} className="text-sm">
                      {amenity}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-blue-700">
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
