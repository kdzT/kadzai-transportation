import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";

interface DeleteBookingModalProps {
  booking: {
    reference: string;
    from: string;
    to: string;
    passengers: { name: string; seat: string }[]; // Ensure passengers is typed as an array
  };
  isOpen: boolean;
  onClose: () => void;
  onDelete: (reference: string) => Promise<void>;
  isDeleting: boolean;
}

export default function DeleteBookingModal({
  booking,
  isOpen,
  onClose,
  onDelete,
  isDeleting,
}: DeleteBookingModalProps) {
  const handleDelete = async () => {
    await onDelete(booking.reference);
  };

  // Safe access: get the first passenger, or a default if the array is empty
  const primaryPassenger = booking.passengers?.[0] || {
    name: "N/A",
    seat: "N/A",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Booking</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the booking for{" "}
            <strong>{primaryPassenger.name}</strong> (Seat:{" "}
            {primaryPassenger.seat}) from <strong>{booking.from}</strong> to{" "}
            <strong>{booking.to}</strong> (Ref: {booking.reference})? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Deleting...</span>
              </div>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
