"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useTripStore, useBusStore } from "../../lib/store/store";
import { Booking } from "../../shared/types";

interface ViewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
}

export default function ViewBookingModal({
  isOpen,
  onClose,
  booking,
}: ViewBookingModalProps) {
  const { trips } = useTripStore();
  const { buses } = useBusStore();
  const trip = trips.find((t) => t.id === booking.tripId);
  const bus = trip ? buses.find((b) => b.id === trip.busId) : null;

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Booking Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 flex-1 overflow-y-auto">
          <div>
            <h4 className="font-semibold text-gray-900">Reference</h4>
            <p className="font-mono">{booking.reference}</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Trip</h4>
            <p>
              {trip
                ? `${bus?.operator || "Unknown"}: ${trip.from} → ${
                    trip.to
                  } on ${new Date(trip.date).toLocaleDateString()}`
                : "Trip not found"}
            </p>
            <p className="text-sm text-gray-600">
              {trip
                ? `${trip.departureTime} - ${trip.arrivalTime} (${trip.duration})`
                : ""}
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Bus</h4>
            <p>{bus ? `${bus.operator}` : "Bus not found"}</p>
            <p className="text-sm text-gray-600">
              {bus ? `Amenities: ${bus.amenities.join(", ")}` : ""}
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Passengers</h4>
            {booking.passengers.map((passenger, index) => (
              <div key={index} className="text-sm text-gray-600">
                <p>
                  {passenger.name} ({booking.email}, {booking.phone})
                </p>
                <p>Seat: {passenger.seat}</p>
              </div>
            ))}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Total Amount</h4>
            <p>₦{booking.totalAmount.toLocaleString()}</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Status</h4>
            <Badge className={getStatusColor(booking.status)}>
              <span className="capitalize">{booking.status}</span>
            </Badge>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Created At</h4>
            <p>{new Date(booking.createdAt ?? "").toLocaleString()}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
