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
import { Input } from "../../../../components/ui/input";
import { useBookingStore, useTripStore } from "../../../../lib/store/store"; // Updated import
import ViewBookingModal from "../../../../components/modals/ViewBookingModal"; // New import
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Edit,
  Eye,
  ArrowLeft,
  Ticket,
  Users,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { Booking } from "../../../../shared/types";
import { useAuthStore } from "lib/store/authStore";
import { toast } from "sonner";
import DeleteBookingModal from "components/modals/DeleteBookingModal";

export default function BookingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const { bookings, isLoading, error, total, fetchBookings, deleteBooking } =
    useBookingStore();

  const { fetchTrips } = useTripStore();

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Search state
  const [searchReference, setSearchReference] = useState("");
  const [searchResult, setSearchResult] = useState<Booking | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // States for the delete modal
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Since ProtectedRoute wraps this page, we only fetch if the data isn't already loaded.
    if (bookings.length === 0) {
      fetchBookings({ limit: itemsPerPage, offset: 0 });
    }
  }, [user, fetchBookings, bookings]);

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const offset = (page - 1) * itemsPerPage;
    fetchBookings({ limit: itemsPerPage, offset });
  };

  // Handle search
  const handleSearch = async () => {
    if (!searchReference.trim()) {
      setSearchResult(null);
      return;
    }

    setIsSearching(true);
    try {
      // Search for booking by reference
      const foundBooking = bookings.find((b) =>
        b.reference.toLowerCase().includes(searchReference.toLowerCase())
      );

      if (foundBooking) {
        setSearchResult(foundBooking);
      } else {
        // If not found in current page, try fetching from API
        setSearchResult(null);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResult(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchReference("");
    setSearchResult(null);
    setCurrentPage(1);
    fetchBookings({ limit: itemsPerPage, offset: 0 });
  };

  const handleDeleteBooking = (booking: Booking) => {
    setBookingToDelete(booking);
  };

  const confirmDeleteBooking = async (reference: string) => {
    setIsDeleting(true);
    try {
      await deleteBooking(reference);
      toast.success("Booking deleted successfully");
      setBookingToDelete(null); // Close modal on success

      // Refresh the current page
      const offset = (currentPage - 1) * itemsPerPage;
      fetchBookings({ limit: itemsPerPage, offset });
      fetchTrips();
    } catch (error) {
      toast.error("Failed to delete booking", {
        description: (error as Error).message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle edit booking navigation
  const handleEditBooking = (booking: Booking) => {
    router.push(`/admin/bookings/edit/${booking.reference}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="w-4 h-4" />;
      case "cancelled":
        return <AlertCircle className="w-4 h-4" />;
      case "completed":
        return <Clock className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const totalPages = Math.ceil(total / itemsPerPage);
  const displayedBookings = searchResult ? [searchResult] : bookings;

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
              Bookings Management
            </h1>
          </div>
          <Button
            onClick={() => router.push("/admin/bookings/create")}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Booking</span>
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by booking reference..."
                    value={searchReference}
                    onChange={(e) => setSearchReference(e.target.value)}
                    className="pl-10"
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
              </div>
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? "Searching..." : "Search"}
              </Button>
              {searchResult && (
                <Button variant="outline" onClick={handleClearSearch}>
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                {searchResult ? "Search Result" : `All Bookings (${total})`}
              </span>
              {!searchResult && totalPages > 1 && (
                <span className="text-sm font-normal text-gray-500">
                  Page {currentPage} of {totalPages}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && displayedBookings.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="text-center text-red-600 py-8">
                Error: {error}
              </div>
            ) : (
              <div className="space-y-4">
                {displayedBookings.map((booking) => (
                  <div
                    key={booking.reference}
                    className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4 mb-4 md:mb-0 flex-1">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                        <Ticket className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 font-mono">
                          {booking.reference}
                        </h3>
                        <div className="text-sm text-gray-600">
                          {booking.from} → {booking.to} on{" "}
                          {new Date(booking.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <Users className="w-3 h-3 mr-1" />
                          <span>
                            {booking.passengers.length} Passenger
                            {booking.passengers.length > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between w-full md:w-auto md:space-x-4">
                      <div className="text-left md:text-right">
                        <div className="font-semibold text-lg text-gray-900">
                          ₦{booking.totalAmount.toLocaleString()}
                        </div>
                        <Badge
                          className={`${getStatusColor(
                            booking.status
                          )} mt-1 w-full justify-center`}
                        >
                          {getStatusIcon(booking.status)}
                          <span className="ml-1 capitalize">
                            {booking.status}
                          </span>
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setIsViewModalOpen(true);
                          }}
                          title="View booking details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditBooking(booking)}
                          title="Edit booking"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteBooking(booking)} // Pass the whole booking object
                          className="text-red-600 hover:text-red-700"
                          title="Delete booking"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {displayedBookings.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    {searchResult === null && searchReference
                      ? `No booking found with reference "${searchReference}"`
                      : "No bookings found."}
                  </div>
                )}
              </div>
            )}

            {/* Pagination */}
            {!searchResult && totalPages > 1 && !isLoading && (
              <div className="flex items-center justify-center space-x-2 mt-6 pt-6 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={
                          currentPage === pageNum ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      {selectedBooking && (
        <>
          <ViewBookingModal
            isOpen={isViewModalOpen}
            onClose={() => {
              setIsViewModalOpen(false);
              setSelectedBooking(null);
            }}
            booking={selectedBooking}
          />
        </>
      )}
      {bookingToDelete && (
        <DeleteBookingModal
          isOpen={!!bookingToDelete}
          onClose={() => setBookingToDelete(null)}
          onDelete={confirmDeleteBooking}
          booking={bookingToDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
