"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { useBooking, Seat } from "../../context/BookingContext";
import { ArrowLeft, User, Crown } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

function SeatSelectionContent() {
  const router = useRouter();
  const { state, dispatch } = useBooking();

  useEffect(() => {
    if (
      !state.selectedTrip ||
      !state.selectedBus ||
      !state.selectedBus.seatLayout
    ) {
      router.push("/search-results");
    }
  }, [state.selectedTrip, state.selectedBus, router]);

  const handleSeatClick = (seat: Seat) => {
    if (!seat.isAvailable) return;

    const isSelected = state.selectedSeats.find((s) => s.id === seat.id);
    const requiredSeats = state.searchData.passengers;

    if (isSelected) {
      dispatch({ type: "TOGGLE_SEAT", payload: seat });
    } else if (state.selectedSeats.length < requiredSeats) {
      dispatch({ type: "TOGGLE_SEAT", payload: seat });
    } else {
      toast.error(
        `You can only select ${requiredSeats} seat${
          requiredSeats > 1 ? "s" : ""
        }`
      );
    }
  };

  const handleContinue = () => {
    if (state.selectedSeats.length !== state.searchData.passengers) {
      toast.error(
        `Please select exactly ${state.searchData.passengers} seat${
          state.searchData.passengers > 1 ? "s" : ""
        }`
      );
      return;
    }

    dispatch({ type: "SET_STEP", payload: 4 });
    router.push("/passenger-info");
  };

  if (
    !state.selectedTrip ||
    !state.selectedBus ||
    !state.selectedBus.seatLayout
  ) {
    return null;
  }

  const renderSeat = (seat: Seat | null, seatNumber: string) => {
    if (!seat) {
      // Render aisle for empty string
      return (
        <div
          key={seatNumber}
          className="w-12 h-12 border-2 border-dashed border-gray-300 rounded-lg"
        />
      );
    }

    const isSelected = state.selectedSeats.find((s) => s.id === seat.id);
    const isPremium = seat.type === "premium";

    return (
      <button
        key={seat.id}
        onClick={() => handleSeatClick(seat)}
        disabled={!seat.isAvailable}
        className={`
          w-12 h-12 rounded-lg border-2 flex items-center justify-center text-xs font-medium transition-all
          ${
            !seat.isAvailable
              ? "bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed"
              : isSelected
              ? "bg-blue-100 border-blue-400 text-blue-800"
              : isPremium
              ? "bg-yellow-50 border-yellow-300 hover:bg-yellow-100 text-yellow-800"
              : "bg-green-50 border-green-300 hover:bg-green-100 text-green-800"
          }
        `}
      >
        {isSelected ? (
          <User className="w-4 h-4" />
        ) : isPremium ? (
          <Crown className="w-4 h-4 text-yellow-600" />
        ) : (
          seat.number
        )}
      </button>
    );
  };

  const renderBusLayout = () => {
    const { seatLayout, seats } = state.selectedBus!;
    if (!seatLayout?.arrangement) return null;

    const { arrangement } = seatLayout;

    return (
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mx-auto max-w-[600px]">
        <div className="text-center mb-6 pb-4 border-b border-gray-200">
          <div className="w-12 h-8 bg-gray-800 rounded mx-auto mb-2"></div>
          <span className="text-xs text-gray-600">Driver</span>
        </div>
        <div className="space-y-3">
          {arrangement.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="flex items-center justify-center gap-2 flex-wrap"
            >
              {row.map((seatNumber, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="flex flex-col items-center gap-1"
                >
                  {renderSeat(
                    seatNumber
                      ? seats.find((s) => s.number === seatNumber) || null
                      : null,
                    `${rowIndex}-${colIndex}`
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/search-results")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Results</span>
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
          {/* Seat Map */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-xl font-medium">Select Your Seats</span>
                  <Badge variant="default">
                    {state.selectedBus.operator} - {state.selectedBus.busType}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>{renderBusLayout()}</CardContent>
            </Card>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Trip Details */}
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
                      <span className="text-red-600">Time:</span>
                      <span>{state.selectedTrip.departureTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Passengers:</span>
                      <span>{state.searchData.passengers}</span>
                    </div>
                  </div>
                </div>

                {/* Selected Seats */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Selected Seats
                  </h4>
                  {state.selectedSeats.length > 0 ? (
                    <div className="space-y-2">
                      {state.selectedSeats.map((seat) => (
                        <div
                          key={seat.id}
                          className="flex justify-between items-center text-sm"
                        >
                          <span>Seat {seat.number}</span>
                          <div className="flex items-center space-x-2">
                            {seat.type === "premium" && (
                              <Crown className="w-3 h-3 text-yellow-600" />
                            )}
                            <span>
                              ₦{state.selectedTrip?.price.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">No seats selected</p>
                  )}
                </div>

                {/* Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total:</span>
                    <span>₦{state.totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Continue Button */}
                <Button
                  onClick={handleContinue}
                  className="w-full bg-primary hover:bg-blue-700"
                  disabled={
                    state.selectedSeats.length !== state.searchData.passengers
                  }
                >
                  Continue to Passenger Info
                </Button>

                <p className="text-xs text-gray-600 text-center">
                  Your seats will be held for 10 minutes while you complete your
                  booking.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SeatSelection() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      }
    >
      <SeatSelectionContent />
    </Suspense>
  );
}
