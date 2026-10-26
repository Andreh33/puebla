"use client";

import { useEffect } from "react";
import { clear } from "@/lib/cart/store";

/**
 * Client component mínimo que vacía el carrito al montar.
 * No renderiza nada visible — es un efecto de lado.
 */
export function ClearCartOnMount() {
  useEffect(() => {
    clear();
  }, []);

  return null;
}
