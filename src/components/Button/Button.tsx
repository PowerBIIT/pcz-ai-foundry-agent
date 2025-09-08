// Professional Button Component - Sprint 4.2
// Apple/Microsoft/Bloomberg-level quality with full accessibility

import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost';
  
  /** Button size */
  size?: 'sm' | 'base' | 'lg';
  
  /** Loading state with spinner */
  loading?: boolean;
  
  /** Icon-only button */
  iconOnly?: boolean;
  
  /** Floating action button style */
  fab?: boolean;
  
  /** Expert-specific styling */
  expertType?: 'budget' | 'orders' | 'audit' | 'legal' | 'strategy';
  
  /** Left icon */
  leftIcon?: React.ReactNode;
  
  /** Right icon */
  rightIcon?: React.ReactNode;
  
  /** Badge/counter content */
  badge?: string | number;
  
  /** Full width button */
  fullWidth?: boolean;
  
  /** Button content */
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'base',
  loading = false,
  iconOnly = false,
  fab = false,
  expertType,
  leftIcon,
  rightIcon,
  badge,
  fullWidth = false,
  disabled,
  className = '',
  children,
  style = {},
  ...props
}) => {
  // Build CSS classes
  const classes = [
    'pcz-button',
    `pcz-button--${variant}`,
    `pcz-button--${size}`,
    loading && 'pcz-button--loading',
    iconOnly && 'pcz-button--icon',
    fab && 'pcz-button--fab',
    expertType && `pcz-button--expert-${expertType}`,
    fullWidth && 'pcz-button--full-width',
    className
  ].filter(Boolean).join(' ');

  // Compute final style
  const finalStyle = {
    ...style,
    ...(fullWidth && { width: '100%' })
  };

  // Accessibility props
  const a11yProps = {
    'aria-disabled': disabled || loading,
    'aria-busy': loading,
    ...(loading && { 'aria-label': 'Loading...' })
  };

  return (
    <button
      className={classes}
      style={finalStyle}
      disabled={disabled || loading}
      {...a11yProps}
      {...props}
    >
      {/* Left Icon */}
      {leftIcon && !loading && (
        <span className="pcz-button__icon pcz-button__icon--left">
          {leftIcon}
        </span>
      )}
      
      {/* Button Content */}
      {!iconOnly && children && (
        <span className="pcz-button__label">
          {children}
        </span>
      )}
      
      {/* Icon-only content */}
      {iconOnly && !loading && children}
      
      {/* Right Icon */}
      {rightIcon && !loading && (
        <span className="pcz-button__icon pcz-button__icon--right">
          {rightIcon}
        </span>
      )}
      
      {/* Badge */}
      {badge && !loading && (
        <span className="pcz-button__badge">
          {badge}
        </span>
      )}
    </button>
  );
};

// Export additional button-related components
export interface ButtonGroupProps {
  /** Button group content */
  children: React.ReactNode;
  
  /** Attach buttons together */
  attached?: boolean;
  
  /** Additional CSS classes */
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  attached = false,
  className = ''
}) => {
  const classes = [
    'pcz-button-group',
    attached && 'pcz-button-group--attached',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {children}
    </div>
  );
};

// Predefined expert buttons for quick use
export const ExpertButtons = {
  Budget: (props: Omit<ButtonProps, 'expertType'>) => (
    <Button expertType="budget" leftIcon="💰" {...props} />
  ),
  Orders: (props: Omit<ButtonProps, 'expertType'>) => (
    <Button expertType="orders" leftIcon="📋" {...props} />
  ),
  Audit: (props: Omit<ButtonProps, 'expertType'>) => (
    <Button expertType="audit" leftIcon="🔍" {...props} />
  ),
  Legal: (props: Omit<ButtonProps, 'expertType'>) => (
    <Button expertType="legal" leftIcon="⚖️" {...props} />
  ),
  Strategy: (props: Omit<ButtonProps, 'expertType'>) => (
    <Button expertType="strategy" leftIcon="📈" {...props} />
  )
};

export default Button;