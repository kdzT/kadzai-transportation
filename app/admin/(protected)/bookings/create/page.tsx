"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import {
  useTripStore,
  useBusStore,
  useBookingStore,
} from "../../../../../lib/store/store";
import { Booking, Seat, SeatLayoutJson } from "../../../../../shared/types";
import { ArrowLeft } from "lucide-react";
import { useAuthStore } from "lib/store/authStore";

interface SeatSelectionProps {
  seats: Seat[];
  seatLayout: SeatLayoutJson;
  selectedSeats: string[];
  onSeatToggle: (seatNumber: string) => void;
}

const SeatSelection: React.FC<SeatSelectionProps> = ({
  seats,
  seatLayout,
  selectedSeats,
  onSeatToggle,
}) => {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mx-auto max-w-[600px]">
      <div className="text-center mb-6 pb-4 border-b border-gray-200">
        <span className="text-xs text-gray-600">Driver</span>
      </div>
      <div className="space-y-3">
        {seatLayout.arrangement.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex items-center justify-center gap-2 flex-wrap"
          >
            {row.map((cell, colIndex) => (
              <div key={colIndex} className="flex flex-col items-center gap-1">
                {cell === "" ? (
                  <div className="w-12 h-12 border-2 border-dashed border-gray-300 rounded-lg" />
                ) : (
                  <button
                    type="button"
                    className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-xs font-medium transition-all ${
                      seats.find((s) => s.number === cell)?.isAvailable &&
                      !selectedSeats.includes(cell)
                        ? "bg-green-50 border-green-300 hover:bg-green-100 text-green-800"
                        : "bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                    onClick={() =>
                      seats.find((s) => s.number === cell)?.isAvailable &&
                      onSeatToggle(cell)
                    }
                    disabled={
                      !seats.find((s) => s.number === cell)?.isAvailable
                    }
                  >
                    {cell}
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-50 border border-green-300 rounded" />
          <span>Available Seat</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded" />
          <span>Unavailable/Selected Seat</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-dashed border-gray-300 rounded" />
          <span>Aisle</span>
        </div>
      </div>
    </div>
  );
};

export default function CreateBookingPage() {
  const router = useRouter();
  const { trips, fetchTrips } = useTripStore();
  const { buses, fetchBuses } = useBusStore();
  const { user } = useAuthStore();

  const { createBooking, isLoading } = useBookingStore();
  const [formData, setFormData] = useState<{
    tripId: string;
    email: string;
    phone: string;
    passengers: {
      name: string;
      seat: string;
      age: number;
      gender: "male" | "female";
    }[];
  }>({
    tripId: "",
    email: "",
    phone: "",
    passengers: [],
  });
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    if (trips.length === 0) fetchTrips();
    if (buses.length === 0) fetchBuses();
  }, [user, router, trips, buses, fetchTrips, fetchBuses]);

  const handleTripChange = (tripId: string) => {
    setFormData((prev) => ({
      ...prev,
      tripId,
      passengers: [],
      email: "",
      phone: "",
    }));
    setSelectedSeats([]);
  };

  const handleSeatToggle = (seatNumber: string) => {
    setSelectedSeats((prev) =>
      prev.includes(seatNumber)
        ? prev.filter((s) => s !== seatNumber)
        : [...prev, seatNumber]
    );
    setFormData((prev) => ({
      ...prev,
      passengers: selectedSeats.includes(seatNumber)
        ? prev.passengers.filter((p) => p.seat !== seatNumber)
        : [
            ...prev.passengers,
            { name: "", seat: seatNumber, age: 0, gender: "male" },
          ],
    }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePassengerChange = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const newPassengers = [...formData.passengers];
    newPassengers[index] = { ...newPassengers[index], [field]: value };
    setFormData((prev) => ({ ...prev, passengers: newPassengers }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tripId || !formData.email || !formData.phone) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (formData.passengers.some((p) => !p.name || !p.seat || !p.age)) {
      toast.error("Please complete all passenger details");
      return;
    }
    try {
      const selectedTrip = trips.find((t) => t.id === formData.tripId);

      const rawDate = new Date(selectedTrip?.date || "");
      const bookingDate = new Date(
        Date.UTC(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate())
      );

      const bookingData: Omit<Booking, "id" | "createdAt" | "status"> = {
        tripId: formData.tripId,
        email: formData.email,
        phone: formData.phone,
        passengers: formData.passengers.map((p) => ({
          ...p,
          id: crypto.randomUUID(),
        })),
        busId: selectedTrip?.busId || "",
        from: selectedTrip?.from || "",
        to: selectedTrip?.to || "",
        date: bookingDate.toISOString(), // Send as proper ISO 8601 string
        time: selectedTrip?.departureTime || "",
        operator:
          buses.find((b) => b.id === selectedTrip?.busId)?.operator || "",
        totalAmount: formData.passengers.length * (selectedTrip?.price || 0),
        bookingDate: new Date().toISOString().split("T")[0],
        reference: `REF-${Date.now()}`,
      };
      await createBooking({ ...bookingData, status: "confirmed" });
      toast.success("Booking created successfully");
      router.push("/admin/bookings");
    } catch (error) {
      toast.error("Failed to create booking", {
        description: (error as Error).message,
      });
    }
  };

  const selectedTrip = trips.find((t) => t.id === formData.tripId);
  const selectedBus = selectedTrip
    ? buses.find((b) => b.id === selectedTrip.busId)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/admin/bookings")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Bookings</span>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Create Booking</h1>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="tripId">Select Trip</Label>
            <Select value={formData.tripId} onValueChange={handleTripChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a trip" />
              </SelectTrigger>
              <SelectContent>
                {trips.map((trip) => (
                  <SelectItem key={trip.id} value={trip.id}>
                    {trip.from} → {trip.to} on{" "}
                    {new Date(trip.date).toLocaleDateString()} at{" "}
                    {trip.departureTime}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedTrip && selectedBus && (
            <>
              <div>
                <Label>Seat Selection</Label>
                <SeatSelection
                  seats={selectedBus.seats}
                  seatLayout={selectedBus.seatLayout}
                  selectedSeats={selectedSeats}
                  onSeatToggle={handleSeatToggle}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  required
                />
              </div>
              {selectedSeats.length > 0 && (
                <div>
                  <Label>Passengers</Label>
                  {formData.passengers.map((passenger, index) => (
                    <div
                      key={passenger.seat}
                      className="border p-4 rounded-lg mt-2 space-y-4"
                    >
                      <h4 className="font-semibold">
                        Passenger for Seat {passenger.seat}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`name-${index}`}>Name</Label>
                          <Input
                            id={`name-${index}`}
                            value={passenger.name}
                            onChange={(e) =>
                              handlePassengerChange(
                                index,
                                "name",
                                e.target.value
                              )
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor={`age-${index}`}>Age</Label>
                          <Input
                            id={`age-${index}`}
                            type="number"
                            value={passenger.age || ""}
                            onChange={(e) =>
                              handlePassengerChange(
                                index,
                                "age",
                                Number(e.target.value)
                              )
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor={`gender-${index}`}>Gender</Label>
                          <Select
                            value={passenger.gender}
                            onValueChange={(value) =>
                              handlePassengerChange(
                                index,
                                "gender",
                                value as "male" | "female"
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/bookings")}
            >
              Cancel
            </Button>
            {selectedSeats.length > 0 && (
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </div>
                ) : (
                  "Create Booking"
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
