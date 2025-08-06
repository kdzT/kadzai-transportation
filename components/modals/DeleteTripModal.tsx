"use client";

import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { toast } from "sonner";

interface DeleteTripModalProps {
  trip: {
    id: string;
    operator: string;
    from: string;
    to: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
  isDeleting: boolean;
}

export default function DeleteTripModal({
  trip,
  isOpen,
  onClose,
  onDelete,
  isDeleting,
}: DeleteTripModalProps) {
  const handleDelete = async () => {
    try {
      await onDelete(trip.id);
    } catch (error) {
      toast.error("Failed to delete trip", {
        description: (error as Error).message,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Trip</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p>
            Are you sure you want to delete the trip from{" "}
            <strong>{trip.from}</strong> to <strong>{trip.to}</strong> operated
            by <strong>{trip.operator}</strong>?
          </p>
          <p className="text-red-500 mt-2">This action cannot be undone.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
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
