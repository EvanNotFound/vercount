import React from "react";
import { cn } from "@/lib/utils";

const Skeleton = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>((props, ref) => {
  const { className, children, ...otherProps } = props;
  return (
    <span
      ref={ref}
      className={cn(
        "inline-block animate-pulse rounded-md bg-primary/10",
        className,
      )}
      {...otherProps}
    >
      <span className="invisible">{children}</span>
    </span>
  );
});

Skeleton.displayName = "Skeleton";

export { Skeleton };
