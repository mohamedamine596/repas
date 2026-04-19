import React from "react";

const STATUS_STYLES = {
  actif: "bg-[#E5F6E2] text-[#1F5A14] border-[#BCE2B5]",
  en_attente: "bg-[#FFF3DD] text-[#9A5A00] border-[#F4CB83]",
  suspendu: "bg-[#FDE7E7] text-[#9E1C1C] border-[#F5B7B7]",
  disponible: "bg-[#ECF8E8] text-[#1D5C12] border-[#CBE9BF]",
  reclame: "bg-[#EAF3FF] text-[#154F9E] border-[#C3D8F8]",
  expire: "bg-[#F2F4F7] text-[#475467] border-[#D0D5DD]",
  ouvert: "bg-[#FDE7E7] text-[#9E1C1C] border-[#F5B7B7]",
  resolu: "bg-[#E8F5E8] text-[#1B5E20] border-[#BCE2BF]",
  recommendation: "bg-[#FDE7E7] text-[#A01616] border-[#F5B7B7]",
};

export default function StatusPill({ value, children, className = "" }) {
  const style = STATUS_STYLES[value] || "bg-white text-[#344054] border-[#D0D5DD]";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold ${style} ${className}`}>
      {children || value}
    </span>
  );
}
