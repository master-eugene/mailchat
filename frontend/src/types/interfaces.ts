export declare interface IToast {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  position?: 'top' | 'bottom';
  duration?: number;
}
