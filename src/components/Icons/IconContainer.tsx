// Professional Icon Container System
// Inspired by Notion, Linear, Figma best practices

import React from 'react';

interface IconContainerProps {
  children: React.ReactNode;
  variant?: 'minimal' | 'soft' | 'outlined' | 'filled';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'default' | 'accent' | 'success' | 'warning' | 'error' | 'neutral';
  shape?: 'square' | 'rounded' | 'circle';
  interactive?: boolean;
  className?: string;
}

export const IconContainer: React.FC<IconContainerProps> = ({
  children,
  variant = 'minimal',
  size = 'md',
  color = 'default',
  shape = 'rounded',
  interactive = true,
  className = ''
}) => {
  const containerClasses = [
    'icon-container',
    `icon-${variant}`,
    `icon-${size}`,
    `icon-${color}`,
    `icon-${shape}`,
    interactive ? 'icon-interactive' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {children}
    </div>
  );
};

// Pre-built icon button component
interface IconButtonProps extends IconContainerProps {
  onClick?: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  title?: string;
  'aria-label'?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  onClick,
  disabled = false,
  title,
  'aria-label': ariaLabel,
  className = '',
  ...containerProps
}) => {
  const buttonClasses = [
    'icon-button',
    disabled ? 'disabled' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      type="button"
    >
      <IconContainer {...containerProps} interactive={!disabled}>
        {children}
      </IconContainer>
    </button>
  );
};

export default IconContainer;