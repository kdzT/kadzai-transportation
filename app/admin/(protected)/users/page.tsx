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
import {
  MoreVertical,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  User,
} from "lucide-react";
import { toast } from "sonner";
import EditUserModal from "../../../../components/modals/EditUserModal";
import DeleteUserModal from "../../../../components/modals/DeleteUserModal";
import { useAuthStore } from "../../../../lib/store/authStore";
import { useUserStore } from "../../../../lib/store/store";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdBy: string | null;
  modifiedBy: string | null;
}

export default function UsersPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { users, fetchUsers, updateUser, deleteUser } = useUserStore();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [DeleteUser, setDeleteUser] = useState<{
    id: string;
    firstName: string;
    lastName: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (users.length === 0) fetchUsers();
  }, [user, users.length, fetchUsers]);

  const handleEdit = (user: User) => {
    setEditUser(user);
    setMenuOpen(null);
  };

  const handleSaveEdit = async (updatedUser: User) => {
    try {
      await updateUser(updatedUser.id, {
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        isActive: updatedUser.isActive,
      });
      toast.success("User updated successfully");
      setEditUser(null);
    } catch (error) {
      toast.error("Failed to update user", {
        description: (error as Error).message,
      });
    }
  };

  const handleDelete = (id: string) => {
    if (user?.id === id) {
      toast.error("Cannot delete the currently logged-in user");
      return;
    }
    const userToDelete = users.find((u) => u.id === id);
    if (userToDelete) {
      setDeleteUser({
        id,
        firstName: userToDelete.firstName,
        lastName: userToDelete.lastName,
      });
      setMenuOpen(null);
    }
  };

  const confirmDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteUser(id);
      toast.success("User deleted successfully");
      setDeleteUser(null);
    } catch (error) {
      toast.error("Failed to delete user", {
        description: (error as Error).message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) return null;

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
              Users Management
            </h1>
          </div>
          <Button
            onClick={() => router.push("/admin/users/create")}
            className="bg-primary hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New User
          </Button>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>User List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4 mb-4 md:mb-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {user.firstName} {user.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between w-full md:w-auto md:space-x-4">
                    <div className="text-left md:text-right">
                      <div className="text-sm mt-1">
                        {user.isActive ? (
                          <span className="text-green-600">Active</span>
                        ) : (
                          <span className="text-gray-400">Inactive</span>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setMenuOpen(menuOpen === user.id ? null : user.id)
                        }
                      >
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                      {menuOpen === user.id && (
                        <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow-lg z-10">
                          <button
                            className="w-full flex items-center px-4 py-2 hover:bg-gray-100"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </button>
                          <button
                            className="w-full flex items-center px-4 py-2 hover:bg-gray-100 text-red-600"
                            onClick={() => handleDelete(user.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No users found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      {editUser && (
        <EditUserModal
          user={editUser}
          isOpen={!!editUser}
          onClose={() => setEditUser(null)}
          onSave={handleSaveEdit}
        />
      )}
      {DeleteUser && (
        <DeleteUserModal
          user={DeleteUser}
          isOpen={!!deleteUser}
          onClose={() => setDeleteUser(null)}
          onDelete={confirmDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
