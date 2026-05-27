"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MAKES, MODELS_BY_MAKE } from "@/lib/cars";
import { cn } from "@/lib/utils";

interface MakeModelComboboxProps {
  make: string;
  model: string;
  onMakeChange: (make: string) => void;
  onModelChange: (model: string) => void;
  placeholder?: string;
}

interface ComboboxInputProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  id?: string;
}

function ComboboxInput({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  id,
}: ComboboxInputProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered =
    value.trim() === ""
      ? options
      : options.filter((o) =>
          o.toLowerCase().includes(value.toLowerCase())
        );

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(e.target as Node)
    ) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  const select = (val: string) => {
    onChange(val);
    setOpen(false);
    setHighlighted(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      setHighlighted(0);
      e.preventDefault();
      return;
    }

    if (!open) return;

    if (e.key === "Escape") {
      setOpen(false);
      setHighlighted(-1);
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlighted >= 0 && highlighted < filtered.length) {
        select(filtered[highlighted]);
      } else {
        setOpen(false);
      }
    }
  };

  useEffect(() => {
    if (highlighted >= 0 && listRef.current) {
      const item = listRef.current.children[highlighted] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlighted]);

  return (
    <div ref={containerRef} className="relative flex-1">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => {
          onChange(e.target.value);
          setHighlighted(-1);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100",
          "placeholder:text-zinc-500 outline-none transition-colors",
          "focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500",
          disabled && "cursor-not-allowed opacity-50"
        )}
      />
      {open && filtered.length > 0 && !disabled && (
        <ul
          ref={listRef}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 py-1 shadow-lg"
        >
          {filtered.map((option, i) => (
            <li
              key={option}
              onMouseDown={(e) => {
                e.preventDefault();
                select(option);
              }}
              onMouseEnter={() => setHighlighted(i)}
              className={cn(
                "cursor-pointer px-3 py-1.5 text-sm text-zinc-100 transition-colors",
                highlighted === i
                  ? "bg-zinc-800 text-zinc-50"
                  : "hover:bg-zinc-800"
              )}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MakeModelCombobox({
  make,
  model,
  onMakeChange,
  onModelChange,
}: MakeModelComboboxProps) {
  const modelOptions = MODELS_BY_MAKE[make] ?? [];
  const makeIsKnown = make in MODELS_BY_MAKE || MAKES.includes(make);

  const handleMakeChange = (newMake: string) => {
    onMakeChange(newMake);
    // Clear model when make changes
    if (newMake !== make) {
      onModelChange("");
    }
  };

  return (
    <div className="flex flex-row gap-2">
      <ComboboxInput
        id="make-combobox"
        value={make}
        onChange={handleMakeChange}
        options={MAKES}
        placeholder="Make (e.g. Porsche)"
      />
      <ComboboxInput
        id="model-combobox"
        value={model}
        onChange={onModelChange}
        options={modelOptions}
        placeholder={makeIsKnown && modelOptions.length === 0 ? "Model" : "Model (e.g. 911)"}
        disabled={!make}
      />
    </div>
  );
}
