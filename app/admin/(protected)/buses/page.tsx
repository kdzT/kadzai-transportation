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
  Bus,
  MapPin,
  Users,
  Calendar,
  Menu,
  X,
} from "lucide-react";
import { toast } from "sonner";
// import EditBusModal from "../../../components/modals/EditBusModal";
import DeleteBusModal from "../../../../components/modals/DeleteBusModal";
import EditTripModal from "../../../../components/modals/EditTripModal";
import AvailabilityModal from "../../../../components/modals/AvailabilityModal";
import { useAuthStore } from "../../../../lib/store/authStore";
import {
  useBusStore,
  useTripStore,
  useBusTypeStore,
} from "../../../../lib/store/store";
import { Bus as Buss, Trip } from "../../../../shared/types";

export default function BusesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    buses: storeBuses,
    fetchBuses,
    isLoading: busLoading,
    error: busError,
    // updateBus,
    deleteBuss,
    clearError: clearError,
  } = useBusStore();
  const {
    trips: storeTrips,
    fetchTrips,
    isLoading: tripLoading,
    error: tripError,
  } = useTripStore();
  const {
    busTypes,
    fetchBusTypes,
    isLoading: busTypeLoading,
    error: busTypeError,
    clearError: clearBusError, // Ensure to clear the error when component unmounts
  } = useBusTypeStore();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  // const [editBus, setEditBus] = useState<Buss | null>(null);
  const [deleteBus, setDeleteBus] = useState<{
    id: string;
    operator: string;
  } | null>(null);
  const [editTrip, setEditTrip] = useState<Trip | null>(null);
  const [availabilityTrip, setAvailabilityTrip] = useState<Trip | null>(null);
  const [isDeleting, setIsDeleting] = useState(false); // <-- Add a local loading state for delete
  const [isSavingEdit] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Map store data to BookingContext types
  const buses: Buss[] = storeBuses.map((bus) => ({
    id: bus.id,
    operator: bus.operator,
    busType: bus.busType,
    seats: bus.seats.map((seat) => ({
      id: seat.id,
      number: seat.number,
      isAvailable: seat.isAvailable,
      isSelected: false, // Default for UI
      type: "regular" as const, // Default, adjust based on busType if needed
    })),
    amenities: bus.amenities,
    rating: bus.rating,
  }));

  const trips: Trip[] = storeTrips.map((trip) => ({
    id: trip.id,
    busId: trip.busId,
    from: trip.from,
    to: trip.to,
    date: new Date(trip.date), // Convert string to Date
    departureTime: trip.departureTime,
    arrivalTime: trip.arrivalTime,
    duration: trip.duration || "0h 0m", // Fallback if duration is missing
    price: trip.price,
    isAvailable: trip.isAvailable,
    createdBy: trip.createdBy,
    modifiedBy: trip.modifiedBy,
  }));

  useEffect(() => {
    // Only proceed if user is authenticated
    if (!user) return;

    // Only fetch if data is actually empty (not just changed)
    const fetchPromises: Promise<void>[] = [];

    if (storeBuses.length === 0 && !busLoading) {
      fetchPromises.push(fetchBuses({ limit: 10 }));
    }

    if (storeTrips.length === 0 && !tripLoading) {
      fetchPromises.push(fetchTrips({ limit: 10 }));
    }

    if (busTypes.length === 0 && !busTypeLoading) {
      fetchPromises.push(fetchBusTypes());
    }

    // Execute all fetches concurrently if any are needed
    if (fetchPromises.length > 0) {
      Promise.allSettled(fetchPromises).catch(console.error);
    }
    return () => {
      clearBusError();
      clearError();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user, // Authentication status
    storeBuses, // Needed for auto-updates when items added/deleted
    storeTrips,
    busTypes,
  ]);

  const handleDelete = (id: string) => {
    const bus = buses.find((b) => b.id === id);
    if (bus) setDeleteBus({ id, operator: bus.operator });
    setMenuOpen(null);
  };

  const confirmDelete = async (id: string) => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      await deleteBuss(id);
      toast.success("Bus deleted successfully");
      setDeleteBus(null);
    } catch (error: unknown) {
      toast.error("Failed to delete bus", {
        description: (error as Error).message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveEditTrip = async (updatedTrip: Trip) => {
    try {
      await useTripStore.getState().updateTrip(updatedTrip.id, {
        busId: updatedTrip.busId,
        from: updatedTrip.from,
        to: updatedTrip.to,
        date: updatedTrip.date.toISOString(), // Convert Date to string
        departureTime: updatedTrip.departureTime,
        arrivalTime: updatedTrip.arrivalTime,
        price: updatedTrip.price,
        isAvailable: updatedTrip.isAvailable,
      });
      toast.success("Trip updated successfully");
      setEditTrip(null);
    } catch (error: unknown) {
      toast.error("Failed to update trip", {
        description: (error as Error).message,
      });
    }
  };

  const handleSaveAvailability = async (updatedTrip: Trip) => {
    try {
      await useTripStore.getState().updateTrip(updatedTrip.id, {
        isAvailable: updatedTrip.isAvailable,
      });
      toast.success("Trip availability updated successfully");
      setAvailabilityTrip(null);
    } catch (error: unknown) {
      toast.error("Failed to update trip availability", {
        description: (error as Error).message,
      });
    }
  };

  const handleEdit = (bus: Buss) => {
    router.push(`/admin/buses/edit/${bus.id}`);
    setMenuOpen(null);
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
              Bus Fleet Management
            </h1>
          </div>
          <div className="flex items-center gap-2 relative">
            {/* Desktop buttons */}
            <div className="hidden md:flex space-x-2">
              <Button
                onClick={() => router.push("/admin/buses/bus-types")}
                className="bg-primary hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" /> Manage Bus Types
              </Button>
              <Button
                onClick={() => router.push("/admin/buses/create")}
                className="bg-primary hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" /> Add New Bus
              </Button>
            </div>

            {/* Mobile menu */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>

            {/* Mobile dropdown */}
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border rounded-lg shadow-lg z-50">
                <div className="p-2 space-y-2">
                  <Button
                    onClick={() => {
                      router.push("/admin/buses/bus-types");
                      setIsMenuOpen(false);
                    }}
                    className="w-full justify-start"
                    variant="ghost"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Manage Types
                  </Button>
                  <Button
                    onClick={() => {
                      router.push("/admin/buses/create");
                      setIsMenuOpen(false);
                    }}
                    className="w-full justify-start"
                    variant="ghost"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Bus
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(busLoading || tripLoading || busTypeLoading) && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        )}
        {!busLoading &&
          !tripLoading &&
          !busTypeLoading &&
          !busError &&
          !tripError &&
          !busTypeError && (
            <Card>
              <CardHeader>
                <CardTitle>All Buses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {buses.map((bus) => (
                    <div key={bus.id} className="p-4 border rounded-lg">
                      <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between mb-4">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                            <Bus className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {bus.operator}
                            </h3>
                            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                              <span className="flex items-center space-x-1">
                                <Users className="w-3 h-3" />
                                <span>{bus.seats.length} seats</span>
                              </span>
                              <Badge variant="default">
                                {bus.busType.charAt(0).toUpperCase() +
                                  bus.busType.slice(1).toLowerCase()}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Menu button - absolute on mobile, normal on desktop */}
                        <div className="md:relative absolute right-0 top-0 mt-2 md:mt-0 flex items-start">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setMenuOpen(menuOpen === bus.id ? null : bus.id)
                            }
                          >
                            <MoreVertical className="w-5 h-5" />
                          </Button>
                          {menuOpen === bus.id && (
                            <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow-lg z-10">
                              <button
                                className="w-full flex items-center px-4 py-2 hover:bg-gray-100"
                                onClick={() => handleEdit(bus)}
                              >
                                <Edit className="w-4 h-4 mr-2" /> Edit Bus
                              </button>
                              <button
                                className="w-full flex items-center px-4 py-2 hover:bg-gray-100 text-red-600"
                                onClick={() => handleDelete(bus.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete Bus
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">
                          Assigned Trips
                        </h4>
                        {trips.filter((t) => t.busId === bus.id).length ===
                        0 ? (
                          <p className="text-sm text-gray-500">
                            No trips assigned.
                          </p>
                        ) : (
                          trips
                            .filter((t) => t.busId === bus.id)
                            .map((trip) => (
                              <div
                                key={trip.id}
                                className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 bg-gray-50 rounded-lg mb-2"
                              >
                                <div className="flex items-center space-x-4 mb-2 md:mb-0 flex-1">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {trip.from} to {trip.to}
                                    </div>
                                    <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                                      <span className="flex items-center space-x-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>
                                          {trip.date.toLocaleDateString()}
                                        </span>
                                      </span>
                                      <span className="flex items-center space-x-1">
                                        <MapPin className="w-3 h-3" />
                                        <span>
                                          {trip.departureTime} -{" "}
                                          {trip.arrivalTime}
                                        </span>
                                      </span>
                                      <Badge
                                        variant={
                                          trip.isAvailable
                                            ? "default"
                                            : "destructive"
                                        }
                                      >
                                        {trip.isAvailable
                                          ? "Available"
                                          : "Unavailable"}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between w-full md:w-auto md:space-x-4">
                                  <div className="text-right">
                                    <div className="font-semibold text-gray-900">
                                      ₦{trip.price.toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  ))}
                  {buses.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      No buses found.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
      </div>
      {deleteBus && (
        <DeleteBusModal
          bus={deleteBus}
          isOpen={!!deleteBus}
          onClose={() => setDeleteBus(null)}
          onDelete={confirmDelete}
          isLoading={isDeleting} // <-- Pass the state here
        />
      )}
      {editTrip && (
        <EditTripModal
          trip={editTrip}
          isOpen={!!editTrip}
          onClose={() => setEditTrip(null)}
          onSave={handleSaveEditTrip}
          isSaving={isSavingEdit}
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
