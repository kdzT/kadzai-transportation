// components/modals/EditTripModal.tsx
import { useState, useEffect } from "react";
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
import { Trip } from "../../shared/types";
import { toast } from "sonner";
import { useBusStore, useTripStore } from "../../lib/store/store";

// Predefined routes (same as in create trip)
const ROUTES = [
  "Abia",
  "Abuja",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

interface EditTripModalProps {
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTrip: Trip & { date: string | Date }) => Promise<void>;
  isSaving: boolean;
}

export default function EditTripModal({
  trip,
  isOpen,
  onClose,
  onSave,
  isSaving,
}: EditTripModalProps) {
  const { buses } = useBusStore();
  const { trips } = useTripStore();

  // Debug log to see what trip data we're receiving
  useEffect(() => {
    console.log("🔍 EditTripModal received trip:", {
      ...trip,
      dateType: typeof trip.date,
      dateValue: trip.date,
    });
  }, [trip]);

  const [formData, setFormData] = useState({
    busId: "",
    from: "",
    to: "",
    date: "",
    departureTime: "",
    arrivalTime: "",
    price: "",
    isAvailable: true,
  });

  // Initialize form data when trip changes
  useEffect(() => {
    if (trip) {
      // Handle different date formats
      let dateString: string;
      if (typeof trip.date === "string") {
        const date = new Date(trip.date);
        dateString = date.toISOString().split("T")[0];
      } else {
        dateString = trip.date.toISOString().split("T")[0];
      }

      console.log("🔧 Parsed date for form:", dateString);

      setFormData({
        busId: trip.busId || "",
        from: trip.from || "",
        to: trip.to || "",
        date: dateString,
        departureTime: trip.departureTime || "",
        arrivalTime: trip.arrivalTime || "",
        price: trip.price?.toString() || "",
        isAvailable: trip.isAvailable ?? true,
      });
    }
  }, [trip]);

  const calculateDuration = (departure: string, arrival: string) => {
    if (!departure || !arrival) return "0h 0m";
    const [depHour, depMin] = departure.split(":").map(Number);
    const [arrHour, arrMin] = arrival.split(":").map(Number);
    let totalMinutes = arrHour * 60 + arrMin - (depHour * 60 + depMin);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const isTripConflict = (newTrip: Trip & { date: string | Date }) => {
    // Validate date format (YYYY-MM-DD)
    const dateStr =
      typeof newTrip.date === "string"
        ? newTrip.date.includes("T")
          ? newTrip.date.split("T")[0]
          : newTrip.date
        : newTrip.date.toISOString().split("T")[0];

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || isNaN(Date.parse(dateStr))) {
      return false; // Invalid date, skip conflict check to avoid crashing
    }

    const tripDate = new Date(dateStr);
    const tripStart = new Date(`${dateStr}T${newTrip.departureTime}:00`);
    const tripEnd = new Date(`${dateStr}T${newTrip.arrivalTime}:00`);
    if (tripEnd < tripStart) tripEnd.setDate(tripEnd.getDate() + 1);

    return trips.some((t) => {
      // Skip the current trip we're editing
      if (t.id === newTrip.id) return false;

      const tDateStr = new Date(t.date).toISOString().split("T")[0];
      // typeof t.date === "string"
      //   ? t.date.includes("T")
      //     ? t.date.split("T")[0]
      //     : t.date
      //   : t.date.toISOString().split("T")[0];

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(tDateStr) ||
        isNaN(Date.parse(tDateStr))
      ) {
        return false; // Skip invalid trip dates
      }

      const tDate = new Date(tDateStr);
      const tStart = new Date(`${tDateStr}T${t.departureTime}:00`);
      const tEnd = new Date(`${tDateStr}T${t.arrivalTime}:00`);
      if (tEnd < tStart) tEnd.setDate(tEnd.getDate() + 1);

      return (
        t.busId === newTrip.busId &&
        tDate.toDateString() === tripDate.toDateString() &&
        tStart <= tripEnd &&
        tEnd >= tripStart
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (
        !formData.busId ||
        !formData.from ||
        !formData.to ||
        !formData.date ||
        !formData.departureTime ||
        !formData.arrivalTime ||
        !formData.price
      ) {
        toast.error("Please fill in all required fields");
        return;
      }
      if (parseInt(formData.price) < 500) {
        toast.error("Price must be at least ₦500");
        return;
      }

      // Validate date format
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(formData.date) ||
        isNaN(Date.parse(formData.date))
      ) {
        toast.error("Invalid date format. Please use YYYY-MM-DD format.");
        return;
      }

      const updatedTrip: Trip & { date: string | Date } = {
        ...trip,
        busId: formData.busId,
        from: formData.from,
        to: formData.to,
        date: new Date(formData.date), // Convert string to Date object
        departureTime: formData.departureTime,
        arrivalTime: formData.arrivalTime,
        duration: calculateDuration(
          formData.departureTime,
          formData.arrivalTime
        ),
        price: parseInt(formData.price),
        isAvailable: formData.isAvailable,
      };

      console.log("📝 Submitting updated trip:", updatedTrip);

      if (isTripConflict(updatedTrip)) {
        toast.error("This bus is already assigned to a conflicting trip.");
        return;
      }

      // Call onSave and wait for it to complete
      await onSave(updatedTrip);

      // Only close the modal after successful save
      onClose();
    } catch (error: unknown) {
      // Error handling is done in the parent component
      console.error("Error saving trip:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Trip</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="busId">
                  Bus <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.busId}
                  onValueChange={(value) => handleSelectChange("busId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bus" />
                  </SelectTrigger>
                  <SelectContent>
                    {buses.map((bus) => (
                      <SelectItem key={bus.id} value={bus.id}>
                        {bus.operator} ({bus.busType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="from">
                  From <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.from}
                  onValueChange={(value) => handleSelectChange("from", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select origin" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUTES.map((route) => (
                      <SelectItem key={route} value={route}>
                        {route}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="to">
                  To <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.to}
                  onValueChange={(value) => handleSelectChange("to", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUTES.map((route) => (
                      <SelectItem key={route} value={route}>
                        {route}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="date">
                  Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="departureTime">
                  Departure Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="departureTime"
                  name="departureTime"
                  type="time"
                  value={formData.departureTime}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="arrivalTime">
                  Arrival Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="arrivalTime"
                  name="arrivalTime"
                  type="time"
                  value={formData.arrivalTime}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="price">
                  Base Price (₦) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="500"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="e.g., 1200"
                  required
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isAvailable"
                name="isAvailable"
                checked={formData.isAvailable}
                onCheckedChange={(checked) =>
                  handleCheckboxChange("isAvailable", checked as boolean)
                }
              />
              <Label htmlFor="isAvailable">Trip Available</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-blue-700"
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving Changes...</span>
                </div>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
