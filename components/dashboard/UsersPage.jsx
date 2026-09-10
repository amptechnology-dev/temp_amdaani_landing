"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTheme } from "../../context/ThemeContext";
import { themeConfig } from "../../utils/ThemeConfig";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { motion } from "framer-motion";
import { Formik, Form, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast } from "sonner";

import {
  Loader2,
  Plus,
  Trash,
  Search,
  User,
  Phone,
  Mail,
  MoreVertical,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  X,
} from "lucide-react";

// shadcn components
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";

// ---------- helper: debounce (same pattern as CustomersPage) ----------
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// ---------- validation schema (mirrors AddUserBottomSheet's Yup schema) ----------
const userSchema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
  phone: Yup.string()
    .required("Phone is required")
    .matches(/^[0-9]{10,12}$/, "Enter a valid phone number"),
  role: Yup.string().required("Role is required"),
  email: Yup.string().email("Enter a valid email").nullable(),
});

const extractErrorMessage = (error) => {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message) return error.message;
  return "An unexpected error occurred";
};

export default function UsersPage() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const { authState } = useAuth();
  const currentUserId = authState?.user?._id;

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRolesLoading, setIsRolesLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);

  const [selectedUser, setSelectedUser] = useState(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ---------- fetch users ----------
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/store/users");
      if (res?.success && res?.data) {
        setUsers(res.data);
      }
    } catch (error) {
      toast.error(`Failed to load users: ${extractErrorMessage(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- fetch roles for dropdown ----------
  const fetchRoles = async () => {
    try {
      setIsRolesLoading(true);
      const res = await api.get("/role");
      if (res?.success) {
        setRoles(res.data.map((r) => ({ label: r.name, value: r._id })));
      }
    } catch (error) {
      toast.error(`Failed to load roles: ${extractErrorMessage(error)}`);
    } finally {
      setIsRolesLoading(false);
    }
  };

  useEffect(() => {
    if (!authState?.isAuthenticated) return;
    fetchUsers();
    fetchRoles();
  }, [authState?.isAuthenticated]);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await fetchUsers();
      toast.success("Users refreshed successfully!");
    } catch {
      toast.error("Failed to refresh users");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // ---------- add / edit submit ----------
  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const payload = {
        name: values.name,
        phone: values.phone,
        role: values.role,
        ...(values.email?.trim() && { email: values.email.trim() }),
      };

      let res;
      if (selectedUser) {
        res = await api.put(`/store/users/${selectedUser._id}`, payload);
      } else {
        res = await api.post("/store/users", payload);
      }

      if (res?.success) {
        toast.success(
          res.message ||
            (selectedUser ? "User updated successfully!" : "User created successfully!"),
        );
        resetForm();
        setIsUserDialogOpen(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        throw new Error(res?.message || "Operation failed");
      }
    } catch (error) {
      toast.error(extractErrorMessage(error) || "Failed to save user.");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- delete ----------
  const handleDeletePress = (u) => {
    setSelectedUser(u);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/store/users/${selectedUser._id}`);
      if (res?.success) {
        toast.success(res.message || "User deleted successfully");
        fetchUsers();
      } else {
        toast.error(res?.message || "Failed to delete user");
      }
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setIsUserDialogOpen(true);
  };

  const handleEditUser = (u) => {
    setSelectedUser(u);
    setIsUserDialogOpen(true);
  };

  const initialValues = {
    name: selectedUser?.name || "",
    phone: selectedUser?.phone || "",
    role: selectedUser?.role?._id || selectedUser?.role || "",
    email: selectedUser?.email || "",
  };

  // ---------- client-side filter ----------
  const filteredUsers = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.name?.toLowerCase().includes(q),
    );
  }, [users, debouncedSearch]);

  return (
    <div className={`min-h-screen p-3 md:p-4 ${currentTheme.background}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className={`text-xl md:text-2xl font-bold ${currentTheme.text}`}>
            Users
          </h1>
          <p className={`text-sm ${currentTheme.textSecondary}`}>
            Manage store users, roles and access
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-sm h-9"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`w-4 h-4 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            onClick={handleAddUser}
            size="sm"
            className={`text-sm h-9 px-4 ${currentTheme.buttonPrimary}`}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add User
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name, phone, email or role…"
            className="pl-9 h-9 text-sm rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <X
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 cursor-pointer text-gray-400"
            />
          )}
        </div>
      </div>

      {/* ===== Table ===== */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 bg-slate-50">
          <span className="text-base font-semibold text-slate-700">Users</span>
          <span className="text-sm text-slate-400">
            Showing {filteredUsers.length} of {users.length}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-14 text-slate-400 text-sm">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <User className="w-11 h-11 text-slate-300 mb-2" />
            <p className="text-base font-semibold text-slate-700">
              {searchTerm ? "No Users Found" : "No Users Yet"}
            </p>
            <p className="text-sm text-slate-400 max-w-xs mt-0.5">
              {searchTerm
                ? `No users match "${searchTerm}".`
                : "Add your first user to give them store access."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-200">
                  <th className="text-left font-semibold px-3 py-2 w-8">#</th>
                  <th className="text-left font-semibold px-3 py-2">User</th>
                  <th className="text-left font-semibold px-3 py-2">Contact</th>
                  <th className="text-left font-semibold px-3 py-2">Role</th>
                  <th className="text-center font-semibold px-3 py-2">Status</th>
                  <th className="text-center font-semibold px-3 py-2 w-16">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, index) => (
                  <motion.tr
                    key={u._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => handleEditUser(u)}
                    className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-blue-50/60 transition-colors ${
                      index % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                    }`}
                  >
                    <td className="px-3 py-2 text-slate-400 text-sm align-middle">
                      {index + 1}
                    </td>

                    <td className="px-3 py-2 align-middle">
                      <div className="flex items-center gap-2 min-w-0">
                        {u.isVerified ? (
                          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                        <span className="font-medium text-slate-800 truncate text-sm">
                          {u.name || "No Name"}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-2 text-slate-500 text-sm align-middle">
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" />
                          {u.phone || "-"}
                        </span>
                        {u.email && (
                          <span className="flex items-center gap-1.5 truncate max-w-[180px]">
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{u.email}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-2 align-middle">
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
                        {u.role?.name?.toUpperCase() || "-"}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-center align-middle">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold text-white ${
                          u.isActive ? "bg-emerald-500" : "bg-red-500"
                        }`}
                      >
                        {u.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>

                    <td
                      className="px-3 py-2 align-middle"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center">
                        {currentUserId !== u._id ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleDeletePress(u)}
                                className="text-red-600 text-sm"
                              >
                                <Trash className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-xs text-slate-300">You</span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------- Add/Edit User Dialog ---------------- */}
      <Dialog
        open={isUserDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsUserDialogOpen(false);
            setSelectedUser(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{selectedUser ? "Edit User" : "Add User"}</DialogTitle>
            <DialogDescription>
              {selectedUser
                ? "Update user details below."
                : "Enter user details to grant store access."}
            </DialogDescription>
          </DialogHeader>

          <Formik
            initialValues={initialValues}
            validationSchema={userSchema}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({ isSubmitting, handleChange, handleBlur, values, errors, touched, setFieldValue }) => (
              <Form className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={values.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter full name"
                    className={`mt-1 ${errors.name && touched.name ? "border-red-500" : ""}`}
                  />
                  <ErrorMessage name="name" component="div" className="text-red-500 text-sm mt-1" />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={values.phone}
                    onChange={(e) =>
                      setFieldValue("phone", e.target.value.replace(/[^0-9]/g, ""))
                    }
                    onBlur={handleBlur}
                    placeholder="Enter phone number"
                    maxLength={12}
                    className={`mt-1 ${errors.phone && touched.phone ? "border-red-500" : ""}`}
                  />
                  <ErrorMessage name="phone" component="div" className="text-red-500 text-sm mt-1" />
                </div>

                <div>
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    name="email"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter email"
                    className={`mt-1 ${errors.email && touched.email ? "border-red-500" : ""}`}
                  />
                  <ErrorMessage name="email" component="div" className="text-red-500 text-sm mt-1" />
                </div>

                <div>
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={values.role}
                    onValueChange={(v) => setFieldValue("role", v)}
                    disabled={isRolesLoading}
                  >
                    <SelectTrigger
                      className={`mt-1 ${errors.role && touched.role ? "border-red-500" : ""}`}
                    >
                      <SelectValue placeholder={isRolesLoading ? "Loading roles..." : "Select role"} />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <ErrorMessage name="role" component="div" className="text-red-500 text-sm mt-1" />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsUserDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {selectedUser ? "Update User" : "Add User"}
                  </Button>
                </DialogFooter>
              </Form>
            )}
          </Formik>
        </DialogContent>
      </Dialog>

      {/* ---------------- Delete Confirmation Dialog ---------------- */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{selectedUser?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash className="w-4 h-4 mr-2" />
              )}
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}