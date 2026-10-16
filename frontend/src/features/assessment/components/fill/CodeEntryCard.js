import React from "react";
import { FileQuestion, KeyRound } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";

export function CodeEntryCard({ value, error, onChange, onSubmit }) {
  return (
    <Card className="rounded-2xl border border-slate-200/90 shadow-sm bg-white overflow-hidden clinical-card">
      <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <FileQuestion className="w-5 h-5 text-[#007AFF]" /> Masukkan Kode Akses Asesmen
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Gunakan kode akses kuesioner yang diberikan klinik (demo: <strong>ASM-2016</strong> atau <strong>ASM-2017</strong>). Kuesioner hanya dapat dikirim satu kali, tetapi Anda boleh berhenti di tengah jalan: jawaban tersimpan otomatis dan dapat dilanjutkan dengan kode yang sama.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 sm:p-6">
        <form onSubmit={onSubmit} className="space-y-4" data-testid="assessment-code-form">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Kode Akses Asesmen</Label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-10 h-12 uppercase border-slate-200 bg-slate-50 focus:bg-white font-mono text-base font-bold"
                placeholder="e.g. SP2-K7M4QX"
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                data-testid="assessment-code-input"
              />
            </div>
            {error && <p className="text-xs font-semibold text-rose-600 mt-1" data-testid="assessment-code-error">{error}</p>}
          </div>
          <Button size="lg" type="submit" className="w-full min-h-12 bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold shadow-md shadow-[#007AFF]/25 cursor-pointer" data-testid="assessment-code-submit-button">
            Buka Instrumen Kuesioner
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
