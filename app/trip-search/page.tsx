"use client";

import { useCallback, useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Search,
  MapPin,
  Clock,
  Users,
  Phone,
  Mail,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useBooking, type Booking } from "../../context/BookingContext";

export default function TripSearch() {
  const {
    fetchBooking,
    state: { isLoading },
  } = useBooking();
  const [bookingRef, setBookingRef] = useState("");
  const [searchResult, setSearchResult] = useState<Booking | null>(null);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailToSend, setEmailToSend] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleSearch = async () => {
    if (!bookingRef.trim()) {
      toast.error("Please enter a booking reference number");
      return;
    }

    try {
      const booking = await fetchBooking(bookingRef.toUpperCase());
      setSearchResult(booking);
      toast.success("Booking found successfully!");
    } catch (error) {
      setSearchResult(null);
      toast.error("Booking not found. Please check your reference number.", {
        description: (error as Error).message,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="w-4 h-4" />;
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "cancelled":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const sendTicketEmail = useCallback(async () => {
    if (!searchResult || !emailToSend) return;

    setIsSendingEmail(true);
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailToSend,
          booking: searchResult,
        }),
      });

      if (!response.ok) throw new Error("Failed to send email");
      toast.success("Ticket sent successfully!");
      setShowEmailInput(false);
    } catch (error) {
      toast.error("Failed to send email", {
        description: (error as Error).message,
      });
    } finally {
      setIsSendingEmail(false);
    }
  }, [searchResult, emailToSend]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Find Your Trip
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Enter your booking reference number to view your trip details, check
            status, or manage your booking.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Search Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="w-5 h-5 text-primary" />
              <span>Search Your Booking</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="bookingRef">Booking Reference Number</Label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Input
                  id="bookingRef"
                  value={bookingRef}
                  onChange={(e) => setBookingRef(e.target.value)}
                  placeholder="e.g., TE12345678"
                  className="flex-1 text-center font-mono text-lg"
                />
                <Button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="w-full sm:w-auto bg-primary hover:bg-blue-700 px-8"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Searching...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Search className="w-4 h-4" />
                      <span>Search</span>
                    </div>
                  )}
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                Your booking reference was sent to your email after booking
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Booking Details</span>
                <Badge
                  className={`${getStatusColor(
                    searchResult.status
                  )} flex items-center space-x-1`}
                >
                  {getStatusIcon(searchResult.status)}
                  <span className="capitalize">{searchResult.status}</span>
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Trip Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span>Trip Information</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reference:</span>
                      <span className="font-mono font-medium">
                        {searchResult.reference}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Route:</span>
                      <span className="font-medium">
                        {searchResult.from} → {searchResult.to}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">
                        {new Date(searchResult.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-medium">{searchResult.time}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Operator:</span>
                      <span className="font-medium">
                        {searchResult.operator}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Passengers:</span>
                      <span className="font-medium">
                        {searchResult.passengers.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-medium">
                        ₦{searchResult.totalAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Booked On:</span>
                      <span className="font-medium">
                        {new Date(
                          searchResult.bookingDate
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Passenger Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Users className="w-5 h-5 text-green-600" />
                  <span>Passenger Details</span>
                </h3>
                <div className="space-y-3">
                  {searchResult.passengers.map(
                    (
                      passenger: { name: string; seat: string },
                      index: number
                    ) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="font-medium">{passenger.name}</span>
                        <Badge variant="normal">Seat {passenger.seat}</Badge>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{searchResult.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-green-600" />
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{searchResult.phone}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {searchResult.status === "confirmed" && (
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
                  {showEmailInput ? (
                    // When email input is shown, use the existing layout
                    <div className="flex flex-col sm:flex-row gap-4 w-full">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          type="email"
                          placeholder="recipient@example.com"
                          value={emailToSend}
                          onChange={(e) => setEmailToSend(e.target.value)}
                          className=""
                        />
                        <Button
                          onClick={sendTicketEmail}
                          disabled={isSendingEmail}
                          className="flex items-center space-x-2 bg-primary hover:bg-blue-700"
                        >
                          {isSendingEmail ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Sending...</span>
                            </div>
                          ) : (
                            <>
                              <Mail className="w-4 h-4" />
                              <span>Send Ticket</span>
                            </>
                          )}
                        </Button>
                      </div>
                      <Link href="/contact">
                        <Button
                          variant="outline"
                          className="flex items-center space-x-2"
                        >
                          <Phone className="w-4 h-4" />
                          <span>Contact Support</span>
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    // When email input is hidden, show buttons with equal width
                    <div className="flex flex-col sm:flex-row gap-4 w-full">
                      <Button
                        variant="outline"
                        className="flex items-center justify-center space-x-2 flex-1"
                        onClick={() => setShowEmailInput(true)}
                      >
                        <Mail className="w-4 h-4" />
                        <span>Email Ticket</span>
                      </Button>
                      <Link href="/contact" className="flex-1">
                        <Button
                          variant="outline"
                          className="flex items-center justify-center space-x-2 w-full"
                        >
                          <Phone className="w-4 h-4" />
                          <span>Contact Support</span>
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
