import React from 'react';
import { toast as sonnerToast, ExternalToast } from 'sonner';
import { playToastSound } from './toastSound';

// Re-export sonner types
export type { ExternalToast, ToastT, ToasterProps } from 'sonner';
export { Toaster } from 'sonner';

// Type for toast data
export type ToastData = ExternalToast;

// Default classNames for AMP toast styling (customize in index.css)
const defaultClassNames = {
  toast: 'amp-toast',
  description: 'amp-toast-description',
  actionButton: 'amp-toast-action',
};

// Wrapper that plays sound before showing toast
export const toast = {
  // Success
  success: (message: string | React.ReactNode, data?: ToastData) => {
    playToastSound('success');
    return sonnerToast.success(message, {
      ...data,
      classNames: {
        ...defaultClassNames,
        toast: 'amp-toast amp-toast-success',
        ...data?.classNames,
      },
    });
  },

  // Error
  error: (message: string | React.ReactNode, data?: ToastData) => {
    playToastSound('error');
    return sonnerToast.error(message, {
      ...data,
      classNames: {
        ...defaultClassNames,
        toast: 'amp-toast amp-toast-error',
        ...data?.classNames,
      },
    });
  },

  // Info
  info: (message: string | React.ReactNode, data?: ToastData) => {
    playToastSound('info');
    return sonnerToast.info(message, {
      ...data,
      classNames: {
        ...defaultClassNames,
        toast: 'amp-toast amp-toast-info',
        ...data?.classNames,
      },
    });
  },

  // Warning
  warning: (message: string | React.ReactNode, data?: ToastData) => {
    playToastSound('warning');
    return sonnerToast.warning(message, {
      ...data,
      classNames: {
        ...defaultClassNames,
        toast: 'amp-toast amp-toast-warning',
        ...data?.classNames,
      },
    });
  },

  // Custom (no sound by default, can specify type)
  custom: (
    message: string | React.ReactNode,
    data?: ToastData & { soundType?: 'success' | 'error' | 'info' | 'warning' }
  ) => {
    if (data?.soundType) {
      playToastSound(data.soundType);
    }
    const { soundType, ...options } = data || {};
    return sonnerToast.custom(() => React.createElement(React.Fragment, null, message), options);
  },

  // Message (no sound)
  message: (message: string | React.ReactNode, data?: ToastData) => {
    return sonnerToast.message(message, data);
  },

  // Loading (no sound)
  loading: (message: string | React.ReactNode, data?: ToastData) => {
    return sonnerToast.loading(message, data);
  },

  // Promise (plays sound based on result)
  promise: <ToastData>(
    promise: Promise<ToastData>,
    messages: {
      loading: string | React.ReactNode;
      success: string | React.ReactNode | ((data: ToastData) => string | React.ReactNode);
      error: string | React.ReactNode | ((error: any) => string | React.ReactNode);
    },
    options?: ExternalToast
  ) => {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: (data) => {
        playToastSound('success');
        return typeof messages.success === 'function'
          ? messages.success(data)
          : messages.success;
      },
      error: (err) => {
        playToastSound('error');
        return typeof messages.error === 'function'
          ? messages.error(err)
          : messages.error;
      },
    });
  },

  // Dismiss
  dismiss: sonnerToast.dismiss,

  // Get toasts (utility)
  getToasts: sonnerToast.getToasts,
};

// Export original toast for backward compatibility (no sound)
export { sonnerToast };
