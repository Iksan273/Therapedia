import React from "react";


export function SignatureBlock({ client }) {
  return (
    <div className="pt-8 grid grid-cols-2 gap-8 text-xs text-center border-t border-slate-200">
          <div className="space-y-16">
            <p className="font-bold text-slate-700">Orang Tua / Wali Murid,</p>
            <p className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
              ( {client.parentName} )
            </p>
          </div>
          <div className="space-y-16">
            <p className="font-bold text-slate-700">Clinical Assessor / Pediatric OT,</p>
            <p className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
              ( Dr. Maya Chen, S.Tr.Kes )
            </p>
          </div>
        </div>
  );
}
