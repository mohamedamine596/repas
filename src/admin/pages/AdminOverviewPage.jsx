import React from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ClipboardList, HandHeart, TriangleAlert, UserCheck, UserRoundCheck } from "lucide-react";
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminData } from "../AdminContext";

function StatCard({ icon: Icon, label, value, accentClass }) {
  return (
    <Card className="border-[#E6DCCB] shadow-sm bg-white">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-[#7B6D59]">{label}</p>
            <p className="text-2xl font-bold text-[#1F2937] mt-1">{value}</p>
          </div>
          <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${accentClass}`}>
            <Icon className="w-5 h-5" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminOverviewPage() {
  const navigate = useNavigate();
  const { dashboardStats, donationChartData, activityFeed } = useAdminData();

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={UserCheck}
          label="Total donneurs actifs"
          value={dashboardStats.totalActiveDonors}
          accentClass="bg-[#E7F6E2] text-[#2D6A1F]"
        />
        <StatCard
          icon={UserRoundCheck}
          label="Donneurs en attente"
          value={dashboardStats.totalPendingDonors}
          accentClass="bg-[#FFF2DD] text-[#B06A00]"
        />
        <StatCard
          icon={HandHeart}
          label="Donations aujourd'hui"
          value={dashboardStats.donationsToday}
          accentClass="bg-[#EAF2FF] text-[#1D4ED8]"
        />
        <StatCard
          icon={TriangleAlert}
          label="Signalements ouverts"
          value={dashboardStats.openReports}
          accentClass="bg-[#FDE7E7] text-[#A01616]"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
        <Card className="border-[#E6DCCB] shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#234D1A]">Donations par jour (30 derniers jours)</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={donationChartData} margin={{ top: 12, right: 12, left: -10, bottom: 8 }}>
                  <CartesianGrid stroke="#EFE8D9" strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fill: "#7B6D59", fontSize: 12 }} interval={4} />
                  <YAxis allowDecimals={false} tick={{ fill: "#7B6D59", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid #E6DCCB",
                      backgroundColor: "#FFFEFA",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="donations"
                    stroke="#2D6A1F"
                    strokeWidth={3}
                    dot={{ r: 2, stroke: "#2D6A1F", fill: "#2D6A1F" }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E6DCCB] shadow-sm bg-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base text-[#234D1A]">Activite recente</CardTitle>
            <Bell className="w-4 h-4 text-[#B06A00]" />
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-3 max-h-[320px] overflow-auto pr-1">
              {activityFeed.slice(0, 10).map((event) => (
                <li key={event.id} className="border border-[#EEE5D5] rounded-lg bg-[#FFFCF4] px-3 py-2">
                  <p className="text-sm text-[#344054]">{event.message}</p>
                  <p className="text-[11px] text-[#8B7A64] mt-1">
                    {new Date(event.createdAt).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          className="bg-[#2D6A1F] hover:bg-[#245619] text-white rounded-lg"
          onClick={() => navigate("/admin/donors?status=en_attente")}
        >
          <ClipboardList className="w-4 h-4 mr-2" />
          Valider les donneurs en attente
        </Button>
      </div>
    </div>
  );
}
