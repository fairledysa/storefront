"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import type { MalakBootstrap } from "../bootstrap/types";
import type { ThemeAdapterOutput } from "../types";

export type BasitThemeRuntimeValue = {
  /**
   * النسخة النهائية الموحدة من إعدادات الثيم.
   * جميع الصفحات والمكونات يجب أن تعتمد عليها بدل إعادة قراءة الإعدادات.
   */
  theme: ThemeAdapterOutput;
  bootstrap?: MalakBootstrap;
  appearance: Record<string, any>;
  rawOptions: Record<string, any>;
};

const BasitThemeRuntimeContext =
  createContext<BasitThemeRuntimeValue | null>(null);

export function BasitThemeRuntimeProvider({
  value,
  children,
}: {
  value: BasitThemeRuntimeValue;
  children: ReactNode;
}) {
  return (
    <BasitThemeRuntimeContext.Provider value={value}>
      {children}
    </BasitThemeRuntimeContext.Provider>
  );
}

export function useBasitThemeRuntime() {
  const value = useContext(BasitThemeRuntimeContext);

  if (!value) {
    throw new Error(
      "useBasitThemeRuntime must be used inside BasitThemeRuntimeProvider",
    );
  }

  return value;
}

export function useBasitThemeRuntimeOptional() {
  return useContext(BasitThemeRuntimeContext);
}
