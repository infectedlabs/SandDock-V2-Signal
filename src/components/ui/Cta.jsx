"use client";

import React from "react";
import { ArrowRight } from "lucide-react";

/**
 * Primary call to action - the hero's white pill with a blue arrow well.
 * Renders an <a> so it works for both navigation and anchor links.
 */
export function CtaPrimary({ href, children, className = "", ...rest }) {
  return (
    <a href={href} className={`btn-primary group ${className}`} {...rest}>
      <span>{children}</span>
      <span className="btn-primary__arrow">
        <ArrowRight className="w-5 h-5" />
      </span>
    </a>
  );
}

/**
 * Secondary call to action - quiet text link whose arrow nudges on hover.
 */
export function CtaSecondary({ href, children, className = "", ...rest }) {
  return (
    <a href={href} className={`btn-secondary group ${className}`} {...rest}>
      {children}
      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
    </a>
  );
}

/**
 * Section heading: serif eyebrow over a gradient headline, matching the hero's
 * "Trading signals backed by data, / Not Promises" pairing.
 *
 * `align` centres the block for full-width CTA bands.
 */
export function SectionHeading({
  eyebrow,
  title,
  accent,
  description,
  align = "left",
  className = "",
}) {
  const centered = align === "center";
  return (
    <div className={`${centered ? "text-center mx-auto" : "text-left"} max-w-2xl ${className}`}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 className="mt-3 text-[34px] md:text-[46px] font-semibold tracking-tighter leading-[1.05] text-gradient">
        {title}
        {accent && (
          <>
            {" "}
            <span className="text-gradient-accent">{accent}</span>
          </>
        )}
      </h2>
      {description && (
        <p className={`mt-4 text-[16px] md:text-[17px] leading-[1.65] text-white/70 ${centered ? "mx-auto" : ""}`}>
          {description}
        </p>
      )}
    </div>
  );
}
