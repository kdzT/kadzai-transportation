"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { toast } from "sonner";
import { useBookingStore } from "../../lib/store/store";
import { Booking } from "../../shared/types";

interface EditBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
}

export default function EditBookingModal({
  isOpen,
  onClose,
  booking,
}: EditBookingModalProps) {
  const { updateBooking } = useBookingStore();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    status: "",
    email: "", // Move email/phone to root level
    phone: "",
    paymentReference: "",
    passengers: [] as Array<{
      id: string;
      name: string;
      seat: string;
      age: number;
      gender: "male" | "female";
    }>,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    field: string
  ) => {
    const newPassengers = [...formData.passengers];
    newPassengers[index] = { ...newPassengers[index], [field]: e.target.value };
    setFormData((prev) => ({ ...prev, passengers: newPassengers }));
  };

  const handleStatusChange = (value: string) => {
    setFormData((prev) => ({ ...prev, status: value as Booking["status"] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (
        !formData.passengers.every((p) => p.name && p.seat) ||
        !formData.email ||
        !formData.phone
      ) {
        toast.error("Please fill in all required fields");
        return;
      }
      await updateBooking(booking.reference, {
        status: formData.status,
        email: formData.email,
        phone: formData.phone,
        paymentReference: formData.paymentReference,
      });
      toast.success("Booking updated successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to update booking", {
        description: (error as Error).message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.passengers.map((passenger, index) => (
              <div key={index} className="border p-4 rounded-lg">
                <h4 className="font-semibold">Passenger {index + 1}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor={`name-${index}`}>Name</Label>
                    <Input
                      id={`name-${index}`}
                      value={passenger.name}
                      onChange={(e) => handleInputChange(e, index, "name")}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor={`email-${index}`}>Email</Label>
                    <Input
                      id={`email-${index}`}
                      type="email"
                      value={booking.email}
                      onChange={(e) => handleInputChange(e, index, "email")}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor={`phone-${index}`}>Phone</Label>
                    <Input
                      id={`phone-${index}`}
                      value={booking.phone}
                      onChange={(e) => handleInputChange(e, index, "phone")}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor={`seatNumber-${index}`}>Seat Number</Label>
                    <Input
                      id={`seatNumber-${index}`}
                      type="number"
                      value={passenger.seat}
                      onChange={(e) =>
                        handleInputChange(e, index, "seatNumber")
                      }
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
