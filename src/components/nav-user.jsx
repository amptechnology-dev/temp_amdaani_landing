"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "../../context/AuthContext";
import { SwitchStoreDialog, CreateStoreDialog } from "./StoreDialogs";

export function NavUser({ user }) {
  const { isMobile } = useSidebar();
  const { isStaff, logout } = useAuth();
  const router = useRouter();

  const [switchOpen, setSwitchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          {/* modal={false}: dropdown theke dialog kholle focus/pointer lock hoy na */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {!isStaff && (
                <>
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => router.push("/dashboard/pricing")}
                      className="cursor-pointer"
                    >
                      <Sparkles />
                      Upgrade to Pro
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => router.push("/dashboard/settings")}
                  className="cursor-pointer"
                >
                  <BadgeCheck />
                  Account
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setSwitchOpen(true)}
                  className="cursor-pointer"
                >
                  <ArrowLeftRight />
                  Switch Store
                </DropdownMenuItem>

                {!isStaff && (
                  <DropdownMenuItem
                    onClick={() => router.push("/dashboard/pricing/plan-details")}
                    className="cursor-pointer"
                  >
                    <CreditCard />
                    Billing
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <Bell />
                  Notifications
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer">
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <SwitchStoreDialog
        open={switchOpen}
        onClose={() => setSwitchOpen(false)}
        onAddStore={() => setCreateOpen(true)}
      />
      <CreateStoreDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setSwitchOpen(true)}
      />
    </>
  );
}