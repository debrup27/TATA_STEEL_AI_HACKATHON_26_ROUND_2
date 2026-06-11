import React from "react";

type ButtonVariant = "default" | "outline";
type ButtonSize = "default" | "icon" | "sm" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  default:
    "bg-[#1b253c] text-white hover:bg-[#2a3555] disabled:bg-zinc-200 disabled:text-zinc-400",
  outline:
    "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900",
};

const sizeStyles: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2 text-sm",
  sm: "h-8 px-3 text-xs",
  lg: "h-12 px-6 text-base",
  icon: "size-9",
};

function Button({
  variant = "default",
  size = "default",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 cursor-pointer disabled:cursor-not-allowed rounded-full ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    />
  );
}

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
