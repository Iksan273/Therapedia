import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function GDriveLinkCard({ client, handleSaveGDriveLink }) {
  return (
    <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center">
                6
              </span>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Google Drive Client Link</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Folder arsip berkas asesmen, video observasi, dan dokumen klinis (dapat diakses Asesor & Terapis)
                </CardDescription>
              </div>
            </div>
            {client.gdriveClientLink && (
              <a
                href={client.gdriveClientLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Buka Folder
              </a>
            )}
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                className="border-slate-200 bg-slate-50 text-xs font-mono"
                placeholder="https://drive.google.com/drive/folders/..."
                defaultValue={client.gdriveClientLink || ""}
                onBlur={(e) => handleSaveGDriveLink(e.target.value)}
              />
              <Button
                variant="outline"
                className="border-slate-200 font-bold shrink-0"
                onClick={(e) => {
                  const input = e.currentTarget.previousSibling;
                  if (input) handleSaveGDriveLink(input.value);
                }}
              >
                Simpan Link
              </Button>
            </div>
          </CardContent>
        </Card>
  );
}
