"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "../../../../../../components/ui/button";
import { Input } from "../../../../../../components/ui/input";
import { Label } from "../../../../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../../../components/ui/select";
import { Checkbox } from "../../../../../../components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../../../components/ui/card";
import { ArrowLeft, Bus, Save } from "lucide-react";
import { toast } from "sonner";
import {
  useBusStore,
  useBusTypeStore,
} from "../../../../../../lib/store/store";
import {
  Bus as Buss,
  Seat,
  SeatLayoutJson,
} from "../../../../../../shared/types";
import BusLayoutBuilder from "../../../../../../components/ui/BusLayoutBuilder";
import { useAuthStore } from "../../../../../../lib/store/authStore";

export default function EditBus() {
  const router = useRouter();
  const { busId } = useParams();
  const { user } = useAuthStore();
  const {
    currentBus,
    clearCurrentBus,
    fetchBus,
    updateBus,
    error: busError,
  } = useBusStore();
  const {
    busTypes,
    fetchBusTypes,
    isLoading: busTypeLoading,
  } = useBusTypeStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isFormDataInitialized, setIsFormDataInitialized] = useState(false);
  const [formData, setFormData] = useState<
    Partial<Buss> & { seatCount?: number }
  >({
    operator: "",
    busType: "",
    rating: 4.0,
    amenities: [],
    seats: [],
    seatLayout: { rows: 0, columns: 0, arrangement: [] },
    seatCount: 0,
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

  // Dynamically generate rating options (0.0 to 5.0, step 0.1)
  const generateRatingOptions = () => {
    const options: string[] = [];
    for (let i = 0.0; i <= 5.0; i += 0.1) {
      options.push(i.toFixed(1));
    }
    return options;
  };

  useEffect(() => {
    if (!user) return;

    if (busTypes.length === 0 && !busTypeLoading) {
      fetchBusTypes();
    }
  }, [user, router, busTypes.length, busTypeLoading, fetchBusTypes]);

  useEffect(() => {
    // Clear and fetch bus when busId changes
    if (!busId) return;
    clearCurrentBus();
    fetchBus(busId as string);
  }, [busId, clearCurrentBus, fetchBus]);

  useEffect(() => {
    // Only proceed if we have both currentBus and busTypes loaded, and we haven't initialized the form yet
    if (
      !currentBus ||
      busTypes.length === 0 ||
      busTypeLoading ||
      isFormDataInitialized
    )
      return;

    // Find the matching bus type - use exact match first, then case-insensitive
    let matchingBusType = busTypes.find((t) => t.name === currentBus.busType);
    if (!matchingBusType) {
      matchingBusType = busTypes.find(
        (t) => t.name.toLowerCase() === (currentBus.busType || "").toLowerCase()
      );
    }

    if (!matchingBusType && currentBus.busType) {
      toast.warning(
        `Bus type "${currentBus.busType}" is not recognized. Please select a valid bus type.`
      );
    }

    // Ensure rating is a valid number, fallback to 4.0 if invalid
    const rating =
      typeof currentBus.rating === "number" && !isNaN(currentBus.rating)
        ? Math.max(0, Math.min(5, currentBus.rating)) // Clamp between 0 and 5
        : 4.0;

    // Use the exact busType name from the busTypes array if found, otherwise use the original
    const busTypeToUse = matchingBusType
      ? matchingBusType.name
      : currentBus.busType || "";

    const newFormData = {
      operator: currentBus.operator || "",
      busType: busTypeToUse,
      rating,
      amenities: Array.isArray(currentBus.amenities)
        ? currentBus.amenities
        : [],
      seats: currentBus.seats.map((seat) => ({
        ...seat,
        isSelected: false,
        type: "regular" as const, // Ensure type is set
      })),
      seatLayout: currentBus.seatLayout || {
        rows: 0,
        columns: 0,
        arrangement: [],
      },
      seatCount: matchingBusType
        ? matchingBusType.seats
        : currentBus.seats.length,
    };

    setFormData(newFormData);
    setIsFormDataInitialized(true);
  }, [currentBus, busTypes, busTypeLoading, isFormDataInitialized]);

  useEffect(() => {
    if (busError) {
      toast.error("Failed to load bus data", { description: busError });
    }
  }, [busError]);

  useEffect(() => {
    return () => {
      clearCurrentBus();
    };
  }, [clearCurrentBus]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === "busType") {
      const type = busTypes.find((t) => t.name === value);
      setFormData((prev) => ({
        ...prev,
        busType: value,
        seatCount: type ? type.seats : prev.seatCount,
        seats: [],
        seatLayout: { rows: 0, columns: 0, arrangement: [] },
      }));
    } else if (name === "rating") {
      const parsedRating = parseFloat(value);
      if (!isNaN(parsedRating)) {
        setFormData((prev) => ({ ...prev, rating: parsedRating }));
      }
    }
  };

  const handleAmenityChange = (amenity: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      amenities: checked
        ? [...(prev.amenities || []), amenity]
        : (prev.amenities || []).filter((a) => a !== amenity),
    }));
  };

  const handleLayoutChange = (seats: Seat[], seatLayout: SeatLayoutJson) => {
    setFormData((prev) => ({ ...prev, seats, seatLayout }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.operator) {
      toast.error("Please fill in the operator field");
      return;
    }

    if (!formData.busType) {
      toast.error("Please select a bus type");
      return;
    }

    if (!busTypes.find((t) => t.name === formData.busType)) {
      toast.error(
        "Selected bus type is not valid. Please choose from the available options."
      );
      return;
    }

    if (!formData.seatCount) {
      toast.error("Please select a valid bus type with seat count");
      return;
    }

    if (!formData.seats || formData.seats.length === 0) {
      toast.error("Please configure the seat layout");
      return;
    }

    if (formData.seats.length !== formData.seatCount) {
      toast.error(
        `Seat count does not match bus type. Expected ${formData.seatCount} seats, got ${formData.seats.length}`
      );
      return;
    }

    setIsLoading(true);
    try {
      await updateBus(busId as string, {
        operator: formData.operator || "",
        busType: formData.busType || "",
        seatLayout: formData.seatLayout || {
          rows: 0,
          columns: 0,
          arrangement: [],
        },
        amenities: formData.amenities || [],
        rating: formData.rating || 4.0,
      });
      toast.success("Bus updated successfully!");
      router.push("/admin/buses");
    } catch (error: unknown) {
      toast.error("Failed to update bus", {
        description: (error as Error).message,
      });
    } finally {
      setIsLoading(false);
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
                onClick={() => router.push("/admin/buses")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Buses</span>
              </Button>
              {/* <div className="flex items-center space-x-2">
                <Image
                  src="/logo.png"
                  alt="KADZAI TRANSPORT AND LOGISTICS Logo"
                  width={128}
                  height={128}
                />
              </div> */}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bus className="w-6 h-6 text-primary" />
              <span>Edit Bus</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="operator">
                      Bus Operator <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="operator"
                      name="operator"
                      value={formData.operator || ""}
                      onChange={handleInputChange}
                      placeholder="e.g., GIG Express"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="busType">
                      Bus Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      key={`bustype-${formData.busType}-${busTypes.length}`}
                      value={formData.busType || undefined}
                      onValueChange={(value) =>
                        handleSelectChange("busType", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select bus type" />
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
                  <div className="space-y-2">
                    <Label htmlFor="rating">Rating</Label>
                    <Select
                      value={formData.rating?.toFixed(1) || ""}
                      onValueChange={(value) =>
                        handleSelectChange("rating", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select rating" />
                      </SelectTrigger>
                      <SelectContent>
                        {generateRatingOptions().map((r) => (
                          <SelectItem key={r} value={r}>
                            {r} ⭐
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Amenities
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {availableAmenities.map((amenity) => (
                    <div key={amenity} className="flex items-center space-x-2">
                      <Checkbox
                        id={amenity}
                        checked={formData.amenities?.includes(amenity) || false}
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
              {formData.seatCount && formData.seatCount > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Seat Layout Configuration
                  </h3>
                  <BusLayoutBuilder
                    totalSeats={formData.seatCount}
                    onLayoutChange={handleLayoutChange}
                    initialLayout={formData.seatLayout}
                    initialSeats={formData.seats}
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Bus className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>Please select a bus type to configure the seat layout</p>
                </div>
              )}
              {formData.operator &&
                formData.seats &&
                formData.seats.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Preview
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-lg">
                            {formData.operator}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {formData.busType} • {formData.seats.length} seats •
                            Rating: {formData.rating || 4.0}
                          </p>
                        </div>
                      </div>
                      {formData.amenities && formData.amenities.length > 0 && (
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">
                            Amenities:
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {formData.amenities.map((amenity) => (
                              <span
                                key={amenity}
                                className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                              >
                                {amenity}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Layout:</span>
                          <p className="font-medium">
                            {formData.seatLayout?.rows || 0} rows ×{" "}
                            {formData.seatLayout?.columns || 0} columns
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Total Seats:</span>
                          <p className="font-medium">{formData.seats.length}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Available:</span>
                          <p className="font-medium text-green-600">
                            {formData.seats.filter((s) => s.isAvailable).length}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Unavailable:</span>
                          <p className="font-medium text-red-600">
                            {
                              formData.seats.filter((s) => !s.isAvailable)
                                .length
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/buses")}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isLoading ||
                    !formData.seats ||
                    formData.seats.length !== formData.seatCount
                  }
                  className="bg-primary hover:bg-blue-700"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
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
