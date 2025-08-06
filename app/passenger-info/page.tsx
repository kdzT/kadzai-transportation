"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { useBooking, Passenger } from "../../context/BookingContext";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

function PassengerInfoContent() {
  const router = useRouter();
  const { state, dispatch } = useBooking();

  const [formData, setFormData] = useState<{
    email: string;
    phone: string;
    passengers: Passenger[];
  }>({
    email: "",
    phone: "",
    passengers: state.selectedSeats.map((seat) => ({
      name: "",
      seat: seat.number,
      age: 0,
      gender: "male" as const,
    })),
  });

  useEffect(() => {
    if (
      !state.selectedTrip ||
      !state.selectedBus ||
      state.selectedSeats.length === 0
    ) {
      router.push("/seat-selection");
    }
  }, [state.selectedTrip, state.selectedBus, state.selectedSeats, router]);

  const handleInputChange = (field: "email" | "phone", value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePassengerChange = (
    index: number,
    field: "name" | "age" | "gender",
    value: string | number
  ) => {
    const newPassengers = [...formData.passengers];
    if (field === "age") {
      const ageValue = parseInt(String(value), 10);
      newPassengers[index] = {
        ...newPassengers[index],
        [field]: isNaN(ageValue) ? 0 : ageValue, // Ensure age is a number, default to 0 only for invalid input
      };
    } else {
      newPassengers[index] = { ...newPassengers[index], [field]: value };
    }
    setFormData((prev) => ({ ...prev, passengers: newPassengers }));
  };

  const validateForm = () => {
    const { email, phone, passengers } = formData;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return false;
    }

    const phoneRegex = /^(\+234|0)[789]\d{9}$/;
    if (!phone || !phoneRegex.test(phone)) {
      toast.error("Please enter a valid Nigerian phone number");
      return false;
    }

    if (passengers.length !== state.selectedSeats.length) {
      toast.error("Please provide details for all selected seats");
      return false;
    }

    for (let i = 0; i < passengers.length; i++) {
      const { name, age } = passengers[i];
      if (!name) {
        toast.error(`Please fill in the name for passenger ${i + 1}`);
        return false;
      }
      if (!age || age < 1 || age > 120) {
        toast.error(`Please enter a valid age (1-120) for passenger ${i + 1}`);
        return false;
      }
    }

    return true;
  };

  const handleContinue = () => {
    if (!validateForm()) return;

    // Ensure age is a number in the dispatched passengers
    const passengersWithNumberAge = formData.passengers.map((p) => ({
      ...p,
      age: Number(p.age), // Explicitly convert to number
    }));

    dispatch({ type: "SET_PASSENGERS", payload: passengersWithNumberAge });
    dispatch({
      type: "SET_CONTACT_INFO",
      payload: { email: formData.email, phone: formData.phone },
    });
    dispatch({ type: "SET_STEP", payload: 5 });
    router.push("/payment");
  };

  if (
    !state.selectedTrip ||
    !state.selectedBus ||
    state.selectedSeats.length === 0
  ) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/seat-selection")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Seat Selection</span>
              </Button>
              <div className="flex items-center space-x-2">
                <Image
                  src="/logo.png"
                  alt="KADZAI TRANSPORT AND LOGISTICS Logo"
                  width={128}
                  height={128}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Passenger Information</CardTitle>
                <p className="text-sm text-gray-600">
                  Please provide information for all passengers. The contact
                  details will be used for booking confirmation.
                </p>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Contact Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="flex items-center space-x-1"
                      >
                        <Mail className="w-4 h-4" />
                        <span>
                          Email <span className="text-red-500">*</span>
                        </span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        placeholder="Enter email address"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="phone"
                        className="flex items-center space-x-1"
                      >
                        <Phone className="w-4 h-4" />
                        <span>
                          Phone <span className="text-red-500">*</span>
                        </span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          handleInputChange("phone", e.target.value)
                        }
                        placeholder="e.g., +2348012345678"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Passenger Details ({state.selectedSeats.length} seats
                    selected)
                  </h3>
                  {formData.passengers
                    .sort((a, b) => a.seat.localeCompare(b.seat))
                    .map((passenger, index) => (
                      <div
                        key={`${passenger.seat}-${index}`}
                        className="border border-gray-200 rounded-lg p-6"
                      >
                        <div className="flex items-center space-x-2 mb-4">
                          <h3 className="text-lg font-semibold">
                            Passenger {index + 1}
                          </h3>
                          <div className="text-sm text-gray-600">
                            - Seat {passenger.seat}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`name-${index}`}>
                              Name <span className="text-red-500">*</span>
                            </Label>
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
                              placeholder="Enter full name"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`age-${index}`}>
                              {/* <Calendar className="w-4 h-4" /> */}
                              <span>
                                Age <span className="text-red-500">*</span>
                              </span>
                            </Label>
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
                                  e.target.value
                                )
                              }
                              placeholder="Age"
                              required
                            />
                          </div>
                          <div className="space-y-2">
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
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/seat-selection")}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleContinue}
                    className="bg-primary hover:bg-blue-700"
                  >
                    Proceed to Payment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Trip Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Route:</span>
                      <span>
                        {state.selectedTrip.from} → {state.selectedTrip.to}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span>
                        {new Date(state.searchData.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span>{state.selectedTrip.departureTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bus:</span>
                      <span>{state.selectedBus.operator}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Selected Seats
                  </h4>
                  <div className="space-y-2">
                    {state.selectedSeats
                      .sort((a, b) => a.number.localeCompare(b.number))
                      .map((seat) => (
                        <div
                          key={seat.id}
                          className="flex justify-between items-center text-sm"
                        >
                          <span>Seat {seat.number}</span>
                          <span>
                            ₦{state.selectedTrip?.price.toLocaleString()}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total Amount:</span>
                    <span>₦{state.totalAmount.toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {state.selectedSeats.length} seat(s) × ₦
                    {state.selectedTrip.price.toLocaleString()} per seat
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PassengerInfo() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      }
    >
      <PassengerInfoContent />
    </Suspense>
  );
}
