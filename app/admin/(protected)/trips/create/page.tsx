"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../../components/ui/select";
import { Checkbox } from "../../../../../components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card";
import { ArrowLeft, MapPin, Save } from "lucide-react";
import { toast } from "sonner";
import { useBusStore, useTripStore } from "../../../../../lib/store/store";
import { Trip } from "../../../../../shared/types";
import { useAuthStore } from "lib/store/authStore";

// Predefined routes (replace mockRoutes; can be fetched from an API if available)
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

export default function CreateTrip() {
  const router = useRouter();
  const { buses, fetchBuses, error: busError } = useBusStore();
  const { trips, fetchTrips, createTrip, error: tripError } = useTripStore();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  useEffect(() => {
    if (buses.length === 0) {
      console.log("Fetching buses");
      fetchBuses();
    }
    if (trips.length === 0) {
      console.log("Fetching trips for conflict check");
      fetchTrips();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, buses, trips]);

  useEffect(() => {
    if (!user) return;

    if (busError) {
      console.error(`Bus error: ${busError}`);
      toast.error("Failed to load buses", { description: busError });
    }
    if (tripError) {
      console.error(`Trip error: ${tripError}`);
      toast.error("Failed to load trips", { description: tripError });
    }
  }, [user, busError, tripError]);

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

  const isTripConflict = (
    newTrip: Omit<
      Trip,
      "id" | "createdAt" | "bus" | "duration" | "createdBy" | "modifiedBy"
    > & {
      date: string | Date;
    }
  ) => {
    // Validate date format (YYYY-MM-DD)
    const dateStr =
      typeof newTrip.date === "string"
        ? newTrip.date
        : newTrip.date.toISOString().split("T")[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || isNaN(Date.parse(dateStr))) {
      return false; // Invalid date, skip conflict check to avoid crashing
    }

    const tripDate = new Date(dateStr);
    const tripStart = new Date(`${dateStr}T${newTrip.departureTime}:00`);
    const tripEnd = new Date(`${dateStr}T${newTrip.arrivalTime}:00`);
    if (tripEnd < tripStart) tripEnd.setDate(tripEnd.getDate() + 1);

    return trips.some((t) => {
      const tDateStr =
        typeof t.date === "string"
          ? t.date
          : t.date.toISOString().split("T")[0];
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
    if (!user?.email) {
      toast.error("User authentication required");
      return;
    }
    // Validate ISO 8601 date format (YYYY-MM-DD)
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(formData.date) ||
      isNaN(Date.parse(formData.date))
    ) {
      toast.error(
        "Invalid date format. Please use YYYY-MM-DD (e.g., 2025-08-01)"
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const duration = calculateDuration(
        formData.departureTime,
        formData.arrivalTime
      );

      // Convert date string to proper ISO 8601 format
      const tripDate = new Date(formData.date + "T00:00:00.000Z");

      const newTripData: Omit<
        Trip,
        "id" | "createdAt" | "bus" | "duration" | "createdBy" | "modifiedBy"
      > & {
        date: string | Date;
      } = {
        busId: formData.busId,
        from: formData.from,
        to: formData.to,
        date: new Date(formData.date), // Convert form string to Date object
        departureTime: formData.departureTime,
        arrivalTime: formData.arrivalTime,
        price: parseInt(formData.price),
        isAvailable: formData.isAvailable,
      };

      if (isTripConflict(newTripData)) {
        toast.error("This bus is already assigned to a conflicting trip.");
        return;
      }

      await createTrip({
        busId: formData.busId,
        from: formData.from,
        to: formData.to,
        date: tripDate.toISOString(), // Send as proper ISO 8601 string
        departureTime: formData.departureTime,
        arrivalTime: formData.arrivalTime,
        price: parseInt(formData.price),
        isAvailable: formData.isAvailable,
        duration,
        createdBy: user.email,
        modifiedBy: user.email,
      });

      toast.success("Trip created successfully!");
      router.push("/admin/trips");
    } catch (error: unknown) {
      console.error(`Create trip error: ${(error as Error).message}`);
      toast.error("Failed to create trip", {
        description: (error as Error).message.includes("date")
          ? "Invalid date format. Please use YYYY-MM-DD (e.g., 2025-08-01)"
          : (error as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/admin/trips")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Trips</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="w-6 h-6 text-primary" />
              <span>Create New Trip</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Trip Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="busId">
                      Bus <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.busId}
                      onValueChange={(value) =>
                        handleSelectChange("busId", value)
                      }
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
                  <div className="space-y-2">
                    <Label htmlFor="from">
                      From <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.from}
                      onValueChange={(value) =>
                        handleSelectChange("from", value)
                      }
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
                  <div className="space-y-2">
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
                  <div className="space-y-2">
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
                  <div className="space-y-2">
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
                  <div className="space-y-2">
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
                  <div className="space-y-2">
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
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Availability
                </h3>
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
              {formData.busId &&
                formData.from &&
                formData.to &&
                formData.date && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Preview
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">
                            {buses.find((b) => b.id === formData.busId)
                              ?.operator || "Unknown Bus"}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {formData.from} to {formData.to} •{" "}
                            {new Date(formData.date).toLocaleDateString()} •{" "}
                            {formData.departureTime} - {formData.arrivalTime} •
                            Duration:{" "}
                            {calculateDuration(
                              formData.departureTime,
                              formData.arrivalTime
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            ₦
                            {formData.price
                              ? parseInt(formData.price).toLocaleString()
                              : "0"}
                          </div>
                          <div className="text-sm text-gray-600">per seat</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/trips")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Save className="w-4 h-4" />
                      <span>Create Trip</span>
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
