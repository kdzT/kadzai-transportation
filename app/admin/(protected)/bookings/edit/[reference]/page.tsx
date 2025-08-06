"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import {
  useTripStore,
  useBusStore,
  useBookingStore,
} from "../../../../../../lib/store/store";
import { useAuthStore } from "lib/store/authStore";
import { Seat, SeatLayoutJson } from "../../../../../../shared/types";
import { ArrowLeft } from "lucide-react";

interface SeatSelectionProps {
  seats: Seat[];
  seatLayout: SeatLayoutJson;
  selectedSeats: string[];
  onSeatToggle: (seatNumber: string) => void;
  bookedSeats?: string[]; // For edit mode to show already booked seats
}

const SeatSelection: React.FC<SeatSelectionProps> = ({
  seats,
  seatLayout,
  selectedSeats,
  onSeatToggle,
  bookedSeats = [],
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
                      selectedSeats.includes(cell)
                        ? "bg-blue-100 border-blue-400 text-blue-800"
                        : bookedSeats.includes(cell)
                        ? "bg-orange-100 border-orange-400 text-orange-800"
                        : seats.find((s) => s.number === cell)?.isAvailable
                        ? "bg-green-50 border-green-300 hover:bg-green-100 text-green-800"
                        : "bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                    onClick={() => {
                      const seat = seats.find((s) => s.number === cell);
                      if (
                        seat?.isAvailable ||
                        selectedSeats.includes(cell) ||
                        bookedSeats.includes(cell)
                      ) {
                        onSeatToggle(cell);
                      }
                    }}
                    disabled={
                      !seats.find((s) => s.number === cell)?.isAvailable &&
                      !selectedSeats.includes(cell) &&
                      !bookedSeats.includes(cell)
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
      <div className="mt-6 pt-4 border-t border-gray-200 md:flex grid grid-cols-2 items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-50 border border-green-300 rounded" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 border border-blue-400 rounded" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-100 border border-orange-400 rounded" />
          <span>Current Booking</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded" />
          <span>Unavailable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-dashed border-gray-300 rounded" />
          <span>Aisle</span>
        </div>
      </div>
    </div>
  );
};

export default function EditBookingPage() {
  const router = useRouter();
  const params = useParams();
  const { trips, fetchTrips } = useTripStore();
  const { buses, fetchBuses } = useBusStore();
  const { user } = useAuthStore();

  const { updateBooking, fetchBooking, currentBooking, isLoading } =
    useBookingStore();

  const bookingReference = params?.reference as string;

  const [initialLoad, setInitialLoad] = useState(false);
  const [formData, setFormData] = useState<{
    email: string;
    phone: string;
    status: string;
    passengers: {
      id?: string;
      name: string;
      seat: string;
      age: number;
      gender: "male" | "female";
    }[];
  }>({
    email: "",
    phone: "",
    status: "confirmed",
    passengers: [],
  });
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [originalBookedSeats, setOriginalBookedSeats] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    if (trips.length === 0) fetchTrips();
    if (buses.length === 0) fetchBuses();
  }, [user, router, trips.length, buses.length, fetchTrips, fetchBuses]);

  // Load booking data
  useEffect(() => {
    if (bookingReference && !initialLoad) {
      fetchBooking(bookingReference).then(() => {
        setInitialLoad(true);
      });
    }
  }, [bookingReference, fetchBooking, initialLoad]);

  // Populate form data when booking is loaded
  useEffect(() => {
    if (currentBooking && initialLoad) {
      const booking = currentBooking;
      console.log(
        "Current booking structure:",
        JSON.stringify(booking, null, 2)
      );

      setFormData({
        email: booking.email,
        phone: booking.phone,
        status: booking.status,
        passengers: booking.passengers.map((p) => ({
          id: p.id,
          name: p.name,
          seat: p.seat,
          age: p.age,
          gender: p.gender,
        })),
      });

      const bookedSeatNumbers = booking.passengers.map((p) => p.seat);
      setSelectedSeats(bookedSeatNumbers);
      setOriginalBookedSeats(bookedSeatNumbers);
    }
  }, [currentBooking, initialLoad]);

  // Get the current trip and bus data
  const selectedTrip = currentBooking?.trip;
  const selectedBus = currentBooking?.trip?.bus;

  const handleSeatToggle = (seatNumber: string) => {
    const isCurrentlySelected = selectedSeats.includes(seatNumber);

    if (isCurrentlySelected) {
      // Remove seat and its passenger
      setSelectedSeats((prev) => prev.filter((s) => s !== seatNumber));
      setFormData((prev) => ({
        ...prev,
        passengers: prev.passengers.filter((p) => p.seat !== seatNumber),
      }));
    } else {
      // Add seat
      setSelectedSeats((prev) => [...prev, seatNumber]);

      // Check if this seat had original passenger data
      const originalPassenger = currentBooking?.passengers.find(
        (p) => p.seat === seatNumber
      );

      setFormData((prev) => ({
        ...prev,
        passengers: [
          ...prev.passengers,
          originalPassenger
            ? {
                id: originalPassenger.id,
                name: originalPassenger.name,
                seat: seatNumber,
                age: originalPassenger.age,
                gender: originalPassenger.gender,
              }
            : {
                name: "",
                seat: seatNumber,
                age: 0,
                gender: "male" as const,
              },
        ],
      }));
    }
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
    if (!formData.email || !formData.phone) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (formData.passengers.some((p) => !p.name || !p.seat || !p.age)) {
      toast.error("Please complete all passenger details");
      return;
    }

    try {
      // Update booking with full passenger data
      const updateData = {
        status: formData.status,
        email: formData.email,
        phone: formData.phone,
        passengers: formData.passengers.map((p) => ({
          id: p.id,
          name: p.name,
          seat: p.seat,
          age: p.age,
          gender: p.gender,
        })),
        totalAmount: formData.passengers.length * (selectedTrip?.price || 0),
      };

      await updateBooking(bookingReference, updateData);
      toast.success("Booking updated successfully");
      router.push("/admin/bookings");
    } catch (error) {
      toast.error("Failed to update booking", {
        description: (error as Error).message,
      });
    }
  };

  if (!initialLoad) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentBooking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Booking Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            The booking with reference {bookingReference} could not be found.
          </p>
          <Button onClick={() => router.push("/admin/bookings")}>
            Back to Bookings
          </Button>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-900">
              Edit Booking - {bookingReference}
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Trip Information (Read-only) */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Trip Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Route:</span> {selectedTrip?.from}{" "}
                → {selectedTrip?.to}
              </div>
              <div>
                <span className="font-medium">Date:</span>{" "}
                {new Date(selectedTrip?.date || "").toLocaleDateString()}
              </div>
              <div>
                <span className="font-medium">Time:</span>{" "}
                {selectedTrip?.departureTime}
              </div>
              <div>
                <span className="font-medium">Price per seat:</span>₦
                {selectedTrip?.price}
              </div>
            </div>
          </div>

          {/* Status field */}
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
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

          {/* Seat Selection */}
          {selectedBus && (
            <div>
              <Label>Seat Selection</Label>
              <p className="text-sm text-gray-600 mb-4">
                Orange seats are your original booking. Select/deselect seats to
                modify your booking.
              </p>
              <SeatSelection
                seats={selectedBus.seats}
                seatLayout={selectedBus.seatLayout}
                selectedSeats={selectedSeats}
                onSeatToggle={handleSeatToggle}
                bookedSeats={originalBookedSeats}
              />
            </div>
          )}

          {/* Passengers */}
          {selectedSeats.length > 0 && (
            <div>
              <Label>Passengers ({selectedSeats.length} seats selected)</Label>
              <div className="space-y-4 mt-2">
                {formData.passengers
                  .sort((a, b) => a.seat.localeCompare(b.seat)) // Sort by seat number
                  .map((passenger, index) => (
                    <div
                      key={`${passenger.seat}-${passenger.id || index}`}
                      className="border p-4 rounded-lg bg-white space-y-4"
                    >
                      <h4 className="font-semibold text-lg">
                        Passenger for Seat {passenger.seat}
                        {originalBookedSeats.includes(passenger.seat) && (
                          <span className="ml-2 text-sm text-orange-600 font-normal">
                            (Original booking)
                          </span>
                        )}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor={`name-${index}`}>Name *</Label>
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
                            placeholder="Enter passenger name"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`age-${index}`}>Age *</Label>
                          <Input
                            id={`age-${index}`}
                            type="number"
                            min="1"
                            max="120"
                            value={passenger.age || ""}
                            onChange={(e) =>
                              handlePassengerChange(
                                index,
                                "age",
                                parseInt(e.target.value) || 0
                              )
                            }
                            required
                            placeholder="Age"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`gender-${index}`}>Gender *</Label>
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

              {/* Total Amount */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total Amount:</span>
                  <span>
                    ₦
                    {(
                      selectedSeats.length * (selectedTrip?.price || 0)
                    ).toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedSeats.length} seat(s) × ₦{selectedTrip?.price} per
                  seat
                </p>
              </div>
            </div>
          )}

          {selectedSeats.length === 0 && (
            <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg">
              Please select at least one seat to continue
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-6 border-t">
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
                    <span>Updating...</span>
                  </div>
                ) : (
                  "Update Booking"
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
