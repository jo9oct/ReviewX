import {
  Children,
  cloneElement,
  isValidElement,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Hand-rolled form primitives for the ReviewX design system. These are the only
 * UI building blocks the app needs, so they intentionally avoid the Radix/shadcn
 * dependency tree and style themselves directly from the tokens in styles.css.
 */

/* -------------------------------------------------------------------------- */
/* Button                                                                     */
/* -------------------------------------------------------------------------- */

const BUTTON_BASE =
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

const BUTTON_VARIANTS = {
  default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
  destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
  outline:
    "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
  secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  link: "text-primary underline-offset-4 hover:underline",
} as const;

const BUTTON_SIZES = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-10 rounded-md px-8",
  icon: "h-9 w-9",
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;
export type ButtonSize = keyof typeof BUTTON_SIZES;

function buttonClass({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  className?: string | undefined;
} = {}) {
  return cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className);
}

export type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  /** Render the single child element (e.g. a router `<Link />`) as the button. */
  asChild?: boolean | undefined;
};

export function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  children,
  ...props
}: ButtonProps) {
  const classes = buttonClass({ variant, size, className });

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string | undefined }>;
    return cloneElement(child, { className: cn(classes, child.props.className) });
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Input                                                                      */
/* -------------------------------------------------------------------------- */

export type InputProps = ComponentProps<"input">;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Switch                                                                     */
/* -------------------------------------------------------------------------- */

export type SwitchProps = Omit<ComponentProps<"button">, "onChange"> & {
  checked?: boolean | undefined;
  defaultChecked?: boolean | undefined;
  onCheckedChange?: ((checked: boolean) => void) | undefined;
};

export function Switch({
  className,
  checked,
  defaultChecked = false,
  onCheckedChange,
  onClick,
  ...props
}: SwitchProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultChecked);
  const isChecked = checked ?? uncontrolled;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      onClick={(event) => {
        if (checked === undefined) setUncontrolled(!isChecked);
        onCheckedChange?.(!isChecked);
        onClick?.(event);
      }}
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        isChecked ? "bg-primary" : "bg-input",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
          isChecked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Progress                                                                   */
/* -------------------------------------------------------------------------- */

export type ProgressProps = Omit<ComponentProps<"div">, "children"> & {
  value?: number | undefined;
  /** Accessible label describing what is being measured (e.g. "Analysis progress"). */
  "aria-label"?: string | undefined;
};

export function Progress({ className, value = 0, "aria-label": ariaLabel, ...props }: ProgressProps) {
  const percent = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={ariaLabel ?? "Progress"}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className)}
      {...props}
    >
      <div
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - percent}%)` }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Select                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A native `<select>` dressed in the design system. The compound shape is kept
 * so call sites read like the rest of the app, but only `SelectTrigger`'s
 * className and the `SelectItem` values/labels are used — the browser renders
 * the popup, which keeps the control keyboard- and screen-reader-friendly.
 */
export type SelectProps = {
  value?: string | undefined;
  defaultValue?: string | undefined;
  onValueChange?: ((value: string) => void) | undefined;
  className?: string | undefined;
  children?: ReactNode | undefined;
};

type SelectItemElement = ReactElement<{ value?: string | undefined; children?: ReactNode }>;

function collectItems(node: ReactNode, items: SelectItemElement[]) {
  Children.forEach(node, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === SelectItem) {
      items.push(child as SelectItemElement);
      return;
    }
    const { children } = child.props as { children?: ReactNode | undefined };
    if (children) collectItems(children, items);
  });
}

export function Select({ value, defaultValue, onValueChange, className, children }: SelectProps) {
  let triggerClassName: string | undefined = undefined;
  const items: SelectItemElement[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === SelectTrigger) {
      triggerClassName = (child.props as { className?: string | undefined }).className;
      return;
    }
    if (child.type === SelectContent) {
      collectItems((child.props as { children?: ReactNode | undefined }).children, items);
    }
  });

  const [uncontrolled, setUncontrolled] = useState<string | undefined>(defaultValue);
  const selected = value ?? uncontrolled ?? items[0]?.props.value ?? "";

  return (
    <div className={cn("relative", className)}>
      <select
        value={selected}
        onChange={(event) => {
          if (value === undefined) setUncontrolled(event.target.value);
          onValueChange?.(event.target.value);
        }}
        className={cn(
          "h-9 w-full cursor-pointer appearance-none rounded-md border border-input bg-transparent py-2 pl-3 pr-8 text-sm shadow-sm ring-offset-background transition-colors focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>option]:bg-popover [&>option]:text-popover-foreground",
          triggerClassName,
        )}
      >
        {items.map((item, index) => (
          <option key={item.props.value ?? index} value={item.props.value}>
            {item.props.children}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 opacity-50" />
    </div>
  );
}

/** Read by `Select` to style the control; the element itself renders nothing. */
export function SelectTrigger(_props: ComponentProps<"div">) {
  return null;
}

/** Read by `Select` to label the control; the element itself renders nothing. */
export function SelectValue(_props: { placeholder?: ReactNode | undefined }) {
  return null;
}

/** Read by `Select` to find the options; the element itself renders nothing. */
export function SelectContent(_props: { className?: string | undefined; children?: ReactNode }) {
  return null;
}

/** Read by `Select` to build the `<option>` list; the element itself renders nothing. */
export function SelectItem(_props: { value: string; children?: ReactNode }) {
  return null;
}
