import React from 'react';
import './Table.css';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  children: React.ReactNode;
}

export const Table: React.FC<TableProps> & {
  Header: React.FC<React.HTMLAttributes<HTMLTableSectionElement>>;
  Body: React.FC<React.HTMLAttributes<HTMLTableSectionElement>>;
  Row: React.FC<React.HTMLAttributes<HTMLTableRowElement>>;
  Head: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>>;
  Cell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>>;
} = ({ striped = false, hoverable = true, compact = false, className = '', children, ...props }) => {
  return (
    <div className="dori-table-wrapper">
      <table
        className={`dori-table ${striped ? 'dori-table--striped' : ''} ${
          hoverable ? 'dori-table--hover' : ''
        } ${compact ? 'dori-table--compact' : ''} ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  );
};

const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ className = '', children, ...props }) => (
  <thead className={`dori-table__header ${className}`} {...props}>
    {children}
  </thead>
);

const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ className = '', children, ...props }) => (
  <tbody className={`dori-table__body ${className}`} {...props}>
    {children}
  </tbody>
);

const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ className = '', children, ...props }) => (
  <tr className={`dori-table__row ${className}`} {...props}>
    {children}
  </tr>
);

const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ className = '', children, ...props }) => (
  <th className={`dori-table__head ${className}`} {...props}>
    {children}
  </th>
);

const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className = '', children, ...props }) => (
  <td className={`dori-table__cell ${className}`} {...props}>
    {children}
  </td>
);

Table.Header = TableHeader;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Head = TableHead;
Table.Cell = TableCell;
