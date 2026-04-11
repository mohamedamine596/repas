import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Check, ChevronDown } from "lucide-react";

function useIsMobile() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

/**
 * On desktop: renders a normal shadcn Select.
 * On touch devices: renders a bottom-sheet Drawer picker.
 */
export function MobileSelect({
  value,
  onValueChange,
  placeholder,
  options,
  className,
  triggerClassName,
  disabled,
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((o) => o.value === value);

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={triggerClassName || className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 select-none ${
          triggerClassName || className || ""
        }`}
      >
        <span className={selectedOption ? "" : "text-muted-foreground"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-base">{placeholder}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-1">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-colors select-none ${
                  value === o.value
                    ? "bg-[#1B5E3B] text-white"
                    : "hover:bg-gray-50 text-gray-800 active:bg-gray-100"
                }`}
                onClick={() => {
                  onValueChange(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
                {value === o.value && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}