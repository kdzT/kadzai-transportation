"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useBusTypeStore } from "../../../../../lib/store/store";
import { BusType } from "../../../../../shared/types";
import { useAuthStore } from "lib/store/authStore";

export default function BusTypesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    busTypes,
    fetchBusTypes,
    createBusType,
    updateBusType,
    deleteBusType,
    isLoading: busTypeLoading,
    error: busTypeError,
  } = useBusTypeStore();
  const [formData, setFormData] = useState<
    Partial<Omit<BusType, "seats">> & { seats: string }
  >({
    name: "",
    seats: "",
  });
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;

    if (!busTypeLoading && busTypes.length === 0) {
      console.log("Fetching bus types");
      fetchBusTypes();
    }
  }, [user, router, busTypeLoading, busTypes, fetchBusTypes]);

  useEffect(() => {
    if (busTypeError) {
      console.error(`Bus type error: ${busTypeError}`);
      toast.error("Failed to load bus types", { description: busTypeError });
    }
  }, [busTypeError]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.seats) {
      toast.error("Please fill in all fields");
      return;
    }

    const seats = parseInt(formData.seats, 10);
    if (isNaN(seats) || seats < 1) {
      toast.error("Number of seats must be at least 1");
      return;
    }

    if (
      busTypes.some(
        (type) =>
          type.name.toLowerCase() === formData.name?.toLowerCase() &&
          type.id !== isEditing
      )
    ) {
      toast.error("Bus type name must be unique");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await updateBusType(isEditing, { name: formData.name, seats });
        toast.success("Bus type updated successfully");
      } else {
        await createBusType({ name: formData.name, seats });
        toast.success("Bus type created successfully");
      }
      setFormData({ name: "", seats: "" });
      setIsEditing(null);
    } catch (error: unknown) {
      console.error(
        `Bus type ${isEditing ? "update" : "create"} error: ${
          (error as Error).message
        }`
      );
      toast.error(`Failed to ${isEditing ? "update" : "create"} bus type`, {
        description: (error as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (type: BusType) => {
    setFormData({ name: type.name, seats: type.seats.toString() });
    setIsEditing(type.id);
  };

  const handleDelete = async (id: string) => {
    if (busTypes.length <= 1) {
      toast.error("At least one bus type must exist");
      return;
    }

    if (!confirm("Are you sure you want to delete this bus type?")) {
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteBusType(id);
      toast.success("Bus type deleted successfully");
    } catch (error: unknown) {
      console.error(`Bus type delete error: ${(error as Error).message}`);
      toast.error("Failed to delete bus type", {
        description: (error as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setFormData({ name: "", seats: "" });
    setIsEditing(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/admin/buses")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Buses</span>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">
              Bus Types Management
            </h1>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              {isEditing ? "Edit Bus Type" : "Create Bus Type"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">
                    Bus Type Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Standard"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="seats">
                    Number of Seats <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="seats"
                    name="seats"
                    type="number"
                    min="1"
                    value={formData.seats}
                    onChange={handleInputChange}
                    placeholder="e.g., 48"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-4">
                {isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isSubmitting}
                  >
                    Cancel Edit
                  </Button>
                )}
                <Button
                  type="submit"
                  className="bg-primary hover:bg-blue-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>{isEditing ? "Updating..." : "Creating..."}</span>
                    </div>
                  ) : isEditing ? (
                    "Update Bus Type"
                  ) : (
                    "Create Bus Type"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>All Bus Types</CardTitle>
          </CardHeader>
          <CardContent>
            {busTypeLoading && !isSubmitting ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading bus types...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {busTypes.map((type) => (
                  <div
                    key={type.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {type.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {type.seats} seats
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(type)}
                        disabled={isSubmitting}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(type.id)}
                        disabled={isSubmitting}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
                {busTypes.length === 0 && !busTypeLoading && (
                  <div className="text-center text-gray-500 py-8">
                    No bus types found.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
