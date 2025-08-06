"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { useBusStore } from "../../lib/store/store";
import { Trip, Bus } from "../../shared/types";

interface AvailabilityModalProps {
  trip: Trip & { date: string | Date };
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTrip: Trip & { date: string | Date }) => void;
}

export default function AvailabilityModal({
  trip,
  isOpen,
  onClose,
  onSave,
}: AvailabilityModalProps) {
  const { buses } = useBusStore();
  const [isAvailable, setIsAvailable] = useState(trip.isAvailable);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const bus = buses.find((b: Bus) => b.id === trip.busId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const updatedTrip: Trip & { date: string | Date } = {
        ...trip,
        isAvailable,
      };
      onSave(updatedTrip);
      onClose();
    } catch (error: unknown) {
      console.error(`Availability save error: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Trip Availability</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {bus?.operator || "Unknown Bus"}
            </h3>
            <p className="text-sm text-gray-600">
              {trip.from} to {trip.to} |{" "}
              {new Date(trip.date).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isAvailable"
              checked={isAvailable}
              onCheckedChange={(checked) => setIsAvailable(checked as boolean)}
            />
            <Label htmlFor="isAvailable">Trip Available for Booking</Label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
