import '@tanstack/react-table';

declare module '@tanstack/react-table' {
  // @ts-expect-error
  interface ColumnMeta {
    actions?: boolean;

    className?: string;
    cellClassName?: string;
  }
}
