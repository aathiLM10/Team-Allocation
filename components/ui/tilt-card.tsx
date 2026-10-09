'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // Maximum tilt angle in degrees (default: 5)
  enableGlare?: boolean;
}

export function TiltCard({
  children,
  className = '',
  maxTilt = 5,
  enableGlare = true,
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [glareStyle, setGlareStyle] = useState<React.CSSProperties>({ opacity: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const isTouchDeviceRef = useRef(false);

  useEffect(() => {
    // Check if device is touch or prefers reduced motion
    if (typeof window !== 'undefined') {
      isTouchDeviceRef.current =
        window.matchMedia('(hover: none)').matches ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isTouchDeviceRef.current || !cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Calculate tilt angles normalized between -maxTilt and +maxTilt
      const rotateX = ((centerY - y) / centerY) * maxTilt;
      const rotateY = ((x - centerX) / centerX) * maxTilt;

      setStyle({
        transform: `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`,
        transition: 'transform 0.08s ease-out',
      });

      if (enableGlare) {
        const glareX = (x / rect.width) * 100;
        const glareY = (y / rect.height) * 100;
        setGlareStyle({
          opacity: 0.15,
          background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.8) 0%, transparent 60%)`,
          transition: 'opacity 0.15s ease-out',
        });
      }
    },
    [maxTilt, enableGlare]
  );

  const handleMouseEnter = useCallback(() => {
    if (isTouchDeviceRef.current) return;
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isTouchDeviceRef.current) return;
    setIsHovered(false);
    setStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)',
      transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    });
    setGlareStyle({
      opacity: 0,
      transition: 'opacity 0.3s ease-out',
    });
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={style}
      className={`relative transform-style-3d will-change-transform ${className}`}
    >
      {children}
      {enableGlare && isHovered && (
        <div
          className="pointer-events-none absolute inset-0 z-20 rounded-2xl overflow-hidden"
          style={glareStyle}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
