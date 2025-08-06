"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import {
  MoreVertical,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  MapPin,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { useTripStore, useBusStore } from "../../../../lib/store/store";
import { Trip } from "../../../../shared/types";
import EditTripModal from "../../../../components/modals/EditTripModal";
import DeleteTripModal from "../../../../components/modals/DeleteTripModal";
import AvailabilityModal from "../../../../components/modals/AvailabilityModal";
import { useAuthStore } from "lib/store/authStore";

export default function TripsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const {
    trips,
    fetchTrips,
    updateTrip,
    deleteTrip,
    isLoading: tripLoading,
    error: tripError,
  } = useTripStore();
  const { buses, fetchBuses, error: busError } = useBusStore();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editTrip, setEditTrip] = useState<Trip | null>(null);
  const [DeleteTrip, setDeleteTrip] = useState<{
    id: string;
    operator: string;
    from: string;
    to: string;
  } | null>(null);
  const [availabilityTrip, setAvailabilityTrip] = useState<Trip | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;

    if (!tripLoading && trips.length === 0) {
      console.log("Fetching trips");
      fetchTrips();
    }
    if (buses.length === 0) {
      console.log("Fetching buses");
      fetchBuses();
    }
  }, [
    user,
    router,
    tripLoading,
    trips.length,
    buses.length,
    fetchTrips,
    fetchBuses,
  ]);

  useEffect(() => {
    if (tripError) {
      console.error(`Trip error: ${tripError}`);
      toast.error("Failed to load trips", { description: tripError });
    }
    if (busError) {
      console.error(`Bus error: ${busError}`);
      toast.error("Failed to load buses", { description: busError });
    }
  }, [tripError, busError]);

  const handleEditTrip = (trip: Trip) => {
    setEditTrip(trip);
    setMenuOpen(null);
  };

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

  const handleSaveEditTrip = async (
    updatedTrip: Trip & { date: string | Date }
  ) => {
    setIsSavingEdit(true);
    try {
      if (!user?.email) {
        toast.error("User authentication required");
        return;
      }

      console.log("🔍 Received updatedTrip:", {
        ...updatedTrip,
        dateType: typeof updatedTrip.date,
        dateValue: updatedTrip.date,
      });

      let isoDateString: string;
      if (updatedTrip.date instanceof Date) {
        isoDateString = updatedTrip.date.toISOString();
      } else if (typeof updatedTrip.date === "string") {
        if (/^\d{4}-\d{2}-\d{2}$/.test(updatedTrip.date)) {
          isoDateString = `${updatedTrip.date}T00:00:00.000Z`;
        } else {
          isoDateString = updatedTrip.date;
        }
      } else {
        toast.error("Invalid date format received");
        return;
      }

      if (isNaN(Date.parse(isoDateString))) {
        toast.error("Invalid date format. Please try again.");
        return;
      }

      const duration = calculateDuration(
        updatedTrip.departureTime,
        updatedTrip.arrivalTime
      );

      const updatePayload = {
        busId: updatedTrip.busId,
        from: updatedTrip.from,
        to: updatedTrip.to,
        date: isoDateString,
        departureTime: updatedTrip.departureTime,
        arrivalTime: updatedTrip.arrivalTime,
        price: updatedTrip.price,
        isAvailable: updatedTrip.isAvailable,
        duration,
        modifiedBy: user.email,
      };

      console.log("📤 Sending update payload:", updatePayload);

      await updateTrip(updatedTrip.id, updatePayload);

      toast.success("Trip updated successfully");
      setEditTrip(null); // Close the modal here after success
    } catch (error: unknown) {
      console.error(`Update trip error: ${(error as Error).message}`);
      toast.error("Failed to update trip", {
        description: (error as Error).message.includes("date")
          ? "Invalid date format. Please use YYYY-MM-DD (e.g., 2025-08-01)"
          : (error as Error).message,
      });
      throw error; // Re-throw to let the modal handle it
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteTrip = (id: string) => {
    const trip = trips.find((t) => t.id === id);
    if (trip) {
      const bus = buses.find((b) => b.id === trip.busId);
      setDeleteTrip({
        id,
        operator: bus?.operator || "Unknown",
        from: trip.from,
        to: trip.to,
      });
    }
    setMenuOpen(null);
  };

  const confirmDeleteTrip = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteTrip(id);
      toast.success("Trip deleted successfully");
      setDeleteTrip(null);
    } catch (error: unknown) {
      console.error(`Delete trip error: ${(error as Error).message}`);
      toast.error("Failed to delete trip", {
        description: (error as Error).message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleManageAvailability = (trip: Trip) => {
    setAvailabilityTrip(trip);
    setMenuOpen(null);
  };

  const handleSaveAvailability = async (
    updatedTrip: Trip & { date: string | Date }
  ) => {
    try {
      const dateString =
        updatedTrip.date instanceof Date
          ? updatedTrip.date.toISOString().split("T")[0]
          : updatedTrip.date;
      await updateTrip(updatedTrip.id, {
        busId: updatedTrip.busId,
        from: updatedTrip.from,
        to: updatedTrip.to,
        date: dateString,
        departureTime: updatedTrip.departureTime,
        arrivalTime: updatedTrip.arrivalTime,
        price: updatedTrip.price,
        isAvailable: updatedTrip.isAvailable,
      });
      toast.success("Trip availability updated successfully");
      setAvailabilityTrip(null);
    } catch (error: unknown) {
      console.error(`Update availability error: ${(error as Error).message}`);
      toast.error("Failed to update trip availability", {
        description: (error as Error).message,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/admin")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden md:flex">Back to Dashboard</span>
            </Button>
            <h1 className="md:text-2xl text-lg font-bold text-gray-900">
              Trip Management
            </h1>
          </div>
          <div className="space-x-2">
            <Button
              onClick={() => router.push("/admin/trips/create")}
              className="bg-primary hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" /> Add New Trip
            </Button>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>All Trips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trips.map((trip) => {
                const bus = buses.find((b) => b.id === trip.busId);
                return (
                  <div
                    key={trip.id}
                    className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4 mb-4 md:mb-0 flex-1">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                        <MapPin className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {bus?.operator || "Unknown"}: {trip.from} to {trip.to}
                        </h3>
                        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {new Date(trip.date).toLocaleDateString()}
                            </span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>
                              {trip.departureTime} - {trip.arrivalTime}
                            </span>
                          </span>
                          <Badge
                            variant={
                              trip.isAvailable ? "default" : "destructive"
                            }
                          >
                            {trip.isAvailable ? "Available" : "Unavailable"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between w-full md:w-auto md:space-x-4">
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          ₦{trip.price.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">per seat</div>
                      </div>
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setMenuOpen(menuOpen === trip.id ? null : trip.id)
                          }
                        >
                          <MoreVertical className="w-5 h-5" />
                        </Button>
                        {menuOpen === trip.id && (
                          <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow-lg z-10">
                            <button
                              className="w-full flex items-center px-4 py-2 hover:bg-gray-100"
                              onClick={() => handleEditTrip(trip)}
                            >
                              <Edit className="w-4 h-4 mr-2" /> Edit Trip
                            </button>
                            <button
                              className="w-full flex items-center px-4 py-2 hover:bg-gray-100"
                              onClick={() => handleManageAvailability(trip)}
                            >
                              <Calendar className="w-4 h-4" /> Availability
                            </button>
                            <button
                              className="w-full flex items-center px-4 py-2 hover:bg-gray-100 text-red-600"
                              onClick={() => handleDeleteTrip(trip.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete Trip
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {trips.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No trips found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      {editTrip && (
        <EditTripModal
          trip={editTrip}
          isOpen={!!editTrip}
          onClose={() => setEditTrip(null)}
          onSave={handleSaveEditTrip}
          isSaving={isSavingEdit}
        />
      )}
      {DeleteTrip && (
        <DeleteTripModal
          trip={DeleteTrip}
          isOpen={!!deleteTrip}
          onClose={() => setDeleteTrip(null)}
          onDelete={confirmDeleteTrip}
          isDeleting={isDeleting}
        />
      )}
      {availabilityTrip && (
        <AvailabilityModal
          trip={availabilityTrip}
          isOpen={!!availabilityTrip}
          onClose={() => setAvailabilityTrip(null)}
          onSave={handleSaveAvailability}
        />
      )}
    </div>
  );
}
