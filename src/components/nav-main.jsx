"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useAuth } from "../../context/AuthContext";

// STAFF role-er jonno ei item gulo sidebar-e dekhabe na.
// Item-er url ba title e ei word thakle hide hobe.
const STAFF_HIDDEN_PATTERNS = [/staff/i, /login[-_\s]?activit/i];

const isHiddenForStaff = (item) =>
  STAFF_HIDDEN_PATTERNS.some(
    (re) => re.test(item?.url || "") || re.test(item?.title || ""),
  );

export function NavMain({ items }) {
  const { isStaff } = useAuth();

  const visibleItems = React.useMemo(() => {
    if (!isStaff) return items;

    return items
      .filter((item) => !isHiddenForStaff(item))
      .map((item) => {
        if (!item.items) return item;
        return {
          ...item,
          items: item.items.filter((subItem) => !isHiddenForStaff(subItem)),
        };
      })
      // sub-item chhilo kintu sob hide hoye gele parent-o dekhabo na
      .filter((item, idx) => {
        const original = items.find((i) => i.title === item.title);
        const hadSubItems = original?.items?.length > 0;
        return !(hadSubItems && item.items.length === 0 && !item.url);
      });
  }, [items, isStaff]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {visibleItems.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item.title}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton asChild>
                        <a href={subItem.url}>
                          <span>{subItem.title}</span>
                        </a>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}