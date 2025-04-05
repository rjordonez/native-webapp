
import React from 'react';
import { Badge } from "@/components/ui/badge";

interface ReportHeaderProps {
  title: string;
  date?: Date;
}

const ReportHeader: React.FC<ReportHeaderProps> = ({ title, date = new Date() }) => {
  return (
    <header className="space-y-2 mb-10">
      <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1">Session Report</Badge>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-gray-500">Generated on {date.toLocaleDateString()}</p>
    </header>
  );
};

export default ReportHeader;