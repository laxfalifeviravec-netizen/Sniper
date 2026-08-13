"use client";

import { useEffect, useState, useCallback } from "react";
import type { Category, Product } from "@/types";

export interface CartLine {
  product_id: string;
  name: string;
  brand: string;
  category: Category;
  price_cents: number;
  qty: number;
}

const CART_KEY = "rideforge_cart";
const listeners = new Set<() => void>();

function read(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

function write(lines: CartLine[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_KEY, JSON.stringify(lines));
  listeners.forEach((l) => l());
}

export function addToCart(product: Product, qty = 1): void {
  const lines = read();
  const existing = lines.find((l) => l.product_id === product.id);
  if (existing) {
    existing.qty += qty;
  } else {
    lines.push({
      product_id: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      price_cents: product.price_cents,
      qty,
    });
  }
  write(lines);
}

export function removeFromCart(productId: string): void {
  write(read().filter((l) => l.product_id !== productId));
}

export function updateCartQty(productId: string, qty: number): void {
  const lines = read();
  const line = lines.find((l) => l.product_id === productId);
  if (!line) return;
  if (qty <= 0) {
    write(lines.filter((l) => l.product_id !== productId));
  } else {
    line.qty = qty;
    write(lines);
  }
}

export function clearCart(): void {
  write([]);
}

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    setLines(read());
    const listener = () => setLines(read());
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const subtotal = lines.reduce((sum, l) => sum + l.price_cents * l.qty, 0);
  const count = lines.reduce((sum, l) => sum + l.qty, 0);

  return {
    lines,
    subtotal,
    count,
    addToCart: useCallback((product: Product, qty = 1) => addToCart(product, qty), []),
    removeFromCart: useCallback((id: string) => removeFromCart(id), []),
    updateCartQty: useCallback((id: string, qty: number) => updateCartQty(id, qty), []),
    clearCart: useCallback(() => clearCart(), []),
  };
}
