import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";

interface DeleteBusModalProps {
  bus: { id: string; operator: string };
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>; // Expect an async function
  isLoading: boolean; // <-- Receive loading state
}

export default function DeleteBusModal({
  bus,
  isOpen,
  onClose,
  onDelete,
  isLoading, // <-- Use the prop directly
}: DeleteBusModalProps) {
  const handleDelete = async () => {
    await onDelete(bus.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Bus</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the bus operated by {bus.operator}?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
