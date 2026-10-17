import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

export function QuickInquiryView({ displayedSections }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100 hover:bg-slate-100">
                  <TableHead className="font-bold text-slate-800 text-xs w-12 pl-4">No.</TableHead>
                  <TableHead className="font-bold text-slate-800 text-xs">Pernyataan Klinis</TableHead>
                  <TableHead className="font-bold text-slate-800 text-xs w-36 text-center">Skor (0-5)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedSections.flatMap((sec) => sec.items).map((it, idx) => {
                  return (
                    <TableRow key={it.itemNo || idx} className="text-xs hover:bg-slate-50">
                      <TableCell className="font-bold pl-4 text-slate-500">{it.itemNo}</TableCell>
                      <TableCell className="font-medium text-slate-800">{it.question}</TableCell>
                      <TableCell className="text-center font-black text-blue-600 text-sm">
                        {it.score}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
  );
}
