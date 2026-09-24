/**
 * Shared primitives every screen is assembled from.
 *
 * Screens import from this barrel rather than from individual files, so a
 * component can be split or renamed without touching its call sites.
 */
export { Badge, type BadgeProps, type BadgeTone } from './badge';
export { Button, type ButtonProps } from './button';
export { Card, type CardProps } from './card';
export { EmptyState, type EmptyStateProps } from './empty-state';
export { Input, type InputProps } from './input';
export { Skeleton, SkeletonText, type SkeletonProps } from './skeleton';
