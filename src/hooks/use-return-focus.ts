"use client";

import { useRef } from "react";

type FocusEventLike = { defaultPrevented: boolean; preventDefault: () => void };

/**
 * Dialog/sheet Radix yang dibuka lewat state (bukan `Trigger`) tidak tahu pemicunya,
 * sehingga fokus jatuh ke <body> saat ditutup. Hook ini mengingat elemen yang fokus
 * ketika dialog dibuka lalu mengembalikan fokus ke sana saat ditutup.
 */
export function useReturnFocus<T extends FocusEventLike, U extends FocusEventLike>(
  onOpenAutoFocus?: (event: T) => void,
  onCloseAutoFocus?: (event: U) => void,
) {
  const returnTo = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: (event: T) => {
      const active = document.activeElement;
      returnTo.current = active instanceof HTMLElement && active !== document.body ? active : null;
      onOpenAutoFocus?.(event);
    },
    onCloseAutoFocus: (event: U) => {
      onCloseAutoFocus?.(event);
      const target = returnTo.current;
      if (!event.defaultPrevented && target?.isConnected) {
        event.preventDefault();
        target.focus();
      }
    },
  };
}
