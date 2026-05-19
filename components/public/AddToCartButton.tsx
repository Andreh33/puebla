"use client";

import { useState } from "react";
import { ShoppingBag, Check } from "lucide-react";
import { toast } from "sonner";
import { useCart, type CartItem } from "@/lib/cart/use-cart";
import { cn } from "@/lib/utils";

export type AddToCartProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  imageUrl: string | null;
  colorName: string;
  price: number;
};

type Props = {
  product: AddToCartProduct;
  selectedSize: string | null;
  /** Si true, no aceptamos null como talla — bloqueamos hasta que elija. */
  requiresSize: boolean;
  className?: string;
  /** Texto a mostrar (por defecto "Añadir al carrito"). */
  label?: string;
};

export function AddToCartButton({
  product,
  selectedSize,
  requiresSize,
  className,
  label = "Añadir al carrito",
}: Props) {
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const blocked = requiresSize && !selectedSize;

  const handleAdd = () => {
    if (blocked) {
      toast.info("Selecciona una talla para continuar.");
      return;
    }
    const item: CartItem = {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      imageUrl: product.imageUrl,
      colorName: product.colorName,
      size: selectedSize,
      price: product.price,
      qty: 1,
      addedAt: Date.now(),
    };
    addItem(item);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);

    const sizeLabel =
      selectedSize && selectedSize.toUpperCase() !== "ÚNICA"
        ? ` (talla ${selectedSize})`
        : "";
    toast.success(`${product.name}${sizeLabel} añadido al carrito`, {
      action: {
        label: "Ver carrito",
        onClick: () => {
          window.location.href = "/carrito";
        },
      },
    });
  };

  return (
    <button
      type="button"
      onClick={handleAdd}
      aria-disabled={blocked}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700",
        blocked
          ? "cursor-not-allowed bg-zs-blue-900/40 text-white"
          : justAdded
            ? "bg-emerald-600 text-white"
            : "bg-zs-blue-900 text-white hover:bg-zs-blue-800 active:scale-[0.98]",
        className,
      )}
    >
      {justAdded ? (
        <>
          <Check className="h-5 w-5" /> Añadido
        </>
      ) : (
        <>
          <ShoppingBag className="h-5 w-5" /> {label}
        </>
      )}
    </button>
  );
}
