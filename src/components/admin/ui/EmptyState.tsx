import React from 'react';
import Button from './Button';

interface Props {
  icon:       React.ReactNode;
  title:      string;
  description: string;
  action?:    { label: string; onClick: () => void };
  children?:  React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-[#F4F6F8] border border-[#DDE3EA] flex items-center justify-center text-[#5F6E80] mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-[#1A2B40] mb-1">{title}</h3>
      <p className="text-sm text-[#5F6E80] max-w-xs mb-5">{description}</p>
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}
