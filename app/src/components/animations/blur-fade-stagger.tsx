"use client";

import React, {
  ReactNode,
  Children,
  isValidElement,
  cloneElement,
} from "react";
import BlurFade from "@/components/animations/blur-fade";

export const blurFadeInitialDelay = 0.1;
export const blurFadeDelay = 0.04;

interface BlurFadeStaggerProps {
  children: ReactNode;
  yOffset?: number;
  blur?: string;
  duration?: number;
  inViewMargin?: string;
  initialDelay?: number;
  delayStep?: number;
}

const BlurFadeStagger: React.FC<BlurFadeStaggerProps> = ({
  children,
  yOffset = 8,
  blur = "6px",
  duration = 0.4,
  inViewMargin = "-50px",
  initialDelay = blurFadeInitialDelay,
  delayStep = blurFadeDelay,
}) => {
  const childrenArray = Children.toArray(children);
  let delayCounter = 0; // Initialize delay counter

  return (
    <>
      {childrenArray.map((child, index) => {
        // Check if the child is a valid React element
        if (isValidElement(child)) {
          // Check if the child has a 'continueFrom' prop
          const reactChild = child as React.ReactElement<{continueFrom?: number}>;
          const continueFrom = reactChild.props.continueFrom;

          if (typeof continueFrom === "number") {
            // Set the delayCounter to the specified value
            delayCounter = continueFrom;
            // Render the child as is without wrapping
            return <React.Fragment key={index}>{child}</React.Fragment>;
          }

          // Calculate delay based on the current delayCounter
          const delay = initialDelay + delayStep * delayCounter;

          // Increment the delayCounter for the next element
          delayCounter++;

          // Clone the child without the 'continueFrom' prop to prevent prop leakage
          const childWithoutContinueFrom = cloneElement(reactChild, {
            // Omit 'continueFrom' if it exists
            ...(reactChild.props.continueFrom !== undefined && {
              continueFrom: undefined,
            }),
          });

          // Wrap the child with BlurFade
          return (
            <BlurFade
              key={index}
              delay={delay}
              yOffset={yOffset}
              blur={blur}
              duration={duration}
              inViewMargin={inViewMargin}
            >
              {childWithoutContinueFrom}
            </BlurFade>
          );
        }

        // If not a valid React element, render as is
        return <React.Fragment key={index}>{child}</React.Fragment>;
      })}
    </>
  );
};

export default BlurFadeStagger;
