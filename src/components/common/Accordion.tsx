import React, { ReactNode, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

type AccordionItemProps = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  disabled?: boolean;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
};

type AccordionProps = {
  children: ReactNode;
  className?: string;
  allowMultiple?: boolean;
  defaultOpenItems?: number[];
};

type AccordionContextType = {
  allowMultiple: boolean;
  openItems: Set<number>;
  toggleItem: (index: number) => void;
};

// Create a simple context for accordion state management
const AccordionContext = React.createContext<AccordionContextType | null>(null);

const useAccordionContext = () => {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error('AccordionItem must be used within an Accordion');
  }
  return context;
};

export const Accordion = ({ 
  children, 
  className, 
  allowMultiple = false,
  defaultOpenItems = []
}: AccordionProps) => {
  const [openItems, setOpenItems] = useState<Set<number>>(
    new Set(defaultOpenItems)
  );

  const toggleItem = (index: number) => {
    setOpenItems(prev => {
      const newOpenItems = new Set(prev);
      
      if (allowMultiple) {
        if (newOpenItems.has(index)) {
          newOpenItems.delete(index);
        } else {
          newOpenItems.add(index);
        }
      } else {
        // Single item mode - close all others
        newOpenItems.clear();
        if (!prev.has(index)) {
          newOpenItems.add(index);
        }
      }
      
      return newOpenItems;
    });
  };

  return (
    <AccordionContext.Provider value={{ allowMultiple, openItems, toggleItem }}>
      <div className={clsx('space-y-2', className)}>
        {React.Children.map(children, (child, index) => 
          React.isValidElement(child) 
            ? React.cloneElement(child, { index })
            : child
        )}
      </div>
    </AccordionContext.Provider>
  );
};

export const AccordionItem = ({ 
  title, 
  children, 
  defaultOpen = false,
  disabled = false,
  className,
  headerClassName,
  contentClassName,
  index
}: AccordionItemProps & { index?: number }) => {
  const { openItems, toggleItem } = useAccordionContext();
  const isOpen = openItems.has(index ?? 0);

  const handleToggle = () => {
    if (!disabled && index !== undefined) {
      toggleItem(index);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className={clsx('border border-slate-200 rounded-lg bg-white shadow-sm', className)}>
      <button
        className={clsx(
          'w-full px-4 py-3 text-left flex items-center justify-between gap-3',
          'hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2',
          'transition-colors duration-150',
          disabled && 'opacity-50 cursor-not-allowed hover:bg-white',
          headerClassName
        )}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-disabled={disabled}
      >
        <span className={clsx(
          'font-medium text-slate-900 flex-1',
          disabled && 'text-slate-500'
        )}>
          {title}
        </span>
        <ChevronDown 
          className={clsx(
            'h-5 w-5 text-slate-500 transition-transform duration-200 flex-shrink-0',
            isOpen && 'rotate-180',
            disabled && 'text-slate-400'
          )}
          aria-hidden="true"
        />
      </button>
      
      <div
        className={clsx(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        )}
        aria-hidden={!isOpen}
      >
        <div className={clsx('px-4 py-3 border-t border-slate-200', contentClassName)}>
          {children}
        </div>
      </div>
    </div>
  );
};

// Compound component pattern for easy usage
Accordion.Item = AccordionItem;