"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { useBooking, Trip, Bus, Seat } from "../../context/BookingContext";
import {
  Clock,
  MapPin,
  Star,
  Wifi,
  Zap,
  Coffee,
  Tv,
  ArrowLeft,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

const amenityIcons = {
  AC: Zap,
  WiFi: Wifi,
  Entertainment: Tv,
  "Charging Port": Zap,
  Snacks: Coffee,
  Refreshments: Coffee,
  "Reclining Seats": MapPin,
  Blanket: MapPin,
};

function SearchResultsContent() {
  const router = useRouter();
  const { state, dispatch, fetchTrips } = useBooking();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);

  useEffect(() => {
    // Create a stable reference for search criteria
    const searchArgs = {
      from: state.searchData.from,
      to: state.searchData.to,
      date: state.searchData.date,
    };

    if (!searchArgs.from || !searchArgs.to || !searchArgs.date) {
      router.push("/");
      return;
    }

    const loadTrips = async () => {
      if (trips.length > 0) return; // Prevent re-fetch if we already have results
      setIsLoadingTrips(true);

      try {
        const fetchedTrips = await fetchTrips({
          ...searchArgs,
          limit: 10,
          offset: 0,
        });
        setTrips(fetchedTrips);
      } catch (error) {
        toast.error("Failed to fetch trips", {
          description: (error as Error).message,
        });
      } finally {
        setIsLoadingTrips(false);
      }
    };

    loadTrips();
    // Only run when essential values change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.searchData.from,
    state.searchData.to,
    state.searchData.date,
    router,
  ]);

  const handleSelectTrip = (trip: Trip) => {
    dispatch({ type: "SET_SELECTED_TRIP", payload: trip });

    // Only dispatch if bus exists
    if (trip.bus) {
      dispatch({ type: "SET_SELECTED_BUS", payload: trip.bus });
    }

    dispatch({ type: "SET_STEP", payload: 3 });
    router.push("/seat-selection");
  };

  const availableSeats = (bus: Bus) =>
    bus.seats.filter((seat: Seat) => seat.isAvailable).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Search</span>
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
        {/* Search Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* This will be the top row on mobile */}
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-primary" />
              <span className="font-semibold">{state.searchData.from}</span>
              <span className="text-gray-400">→</span>
              <span className="font-semibold">{state.searchData.to}</span>
            </div>

            {/* This will be the bottom row on mobile */}
            <div className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-green-600" />
                <span>
                  {new Date(state.searchData.date).toLocaleDateString()}
                </span>
              </div>
              <Badge variant="normal">
                {state.searchData.passengers} passenger
                {state.searchData.passengers > 1 ? "s" : ""}
              </Badge>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Available Trips ({trips.length})
          </h2>

          {isLoadingTrips ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading trips...</p>
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No trips found for this route and date.
            </div>
          ) : (
            trips.map((trip) => {
              const bus = trip.bus;
              return (
                <Card
                  key={trip.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                      {/* Trip Info */}
                      <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">
                              {bus?.operator}
                            </h3>
                            <div className="flex items-center space-x-1 mt-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="text-sm text-gray-600">
                                {bus?.rating}
                              </span>
                              <Badge
                                variant={
                                  bus?.busType === "Luxury"
                                    ? "default"
                                    : "normal"
                                }
                                className="ml-2"
                              >
                                {bus?.busType}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-6 mb-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">
                              {trip.departureTime}
                            </div>
                            <div className="text-sm text-gray-600">
                              {trip.from}
                            </div>
                          </div>
                          <div className="flex-1 text-center">
                            <div className="text-sm text-gray-600 mb-1">
                              {trip.duration}
                            </div>
                            <div className="w-full h-px bg-gray-300 relative">
                              <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-primary rounded-full -mt-1"></div>
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">
                              {trip.arrivalTime}
                            </div>
                            <div className="text-sm text-gray-600">
                              {trip.to}
                            </div>
                          </div>
                        </div>

                        {/* Amenities */}
                        <div className="flex flex-wrap gap-2">
                          {bus?.amenities.map((amenity) => {
                            const IconComponent =
                              amenityIcons[
                                amenity as keyof typeof amenityIcons
                              ] || MapPin;
                            return (
                              <div
                                key={amenity}
                                className="flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded text-xs"
                              >
                                <IconComponent className="w-3 h-3" />
                                <span>{amenity}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Availability & Price */}
                      <div className="lg:col-span-1 text-center lg:text-center">
                        <div className="mb-4">
                          <div className="text-sm text-gray-600">
                            Available Seats
                          </div>
                          <div className="text-lg font-semibold text-green-600">
                            {trip.bus ? availableSeats(trip.bus) : 0} seats
                          </div>
                        </div>
                      </div>

                      {/* Price & Action */}
                      <div className="lg:col-span-1 flex flex-col justify-center items-end">
                        <div className="text-right mb-4">
                          <div className="text-sm text-gray-600">
                            Starting from
                          </div>
                          <div className="text-3xl font-bold text-gray-900">
                            ₦{trip.price.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600">
                            per person
                          </div>
                        </div>
                        <Button
                          onClick={() => handleSelectTrip(trip)}
                          className="w-full lg:w-auto bg-primary hover:bg-blue-700"
                          disabled={
                            !trip.bus ||
                            availableSeats(trip.bus) <
                              state.searchData.passengers
                          }
                        >
                          {!trip.bus ||
                          availableSeats(trip.bus) < state.searchData.passengers
                            ? "Not Available"
                            : "Select Seats"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchResults() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      }
    >
      <SearchResultsContent />
    </Suspense>
  );
}
