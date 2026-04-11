import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Loader2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Messages() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin());
  }, []);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["allMessages", user?.email],
    queryFn: async () => {
      const sent = await base44.entities.Message.filter({ sender_email: user.email }, "-created_date", 200);
      const received = await base44.entities.Message.filter({ receiver_email: user.email }, "-created_date", 200);
      return [...sent, ...received].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!user?.email,
  });

  // Group by conversation partner
  const conversations = {};
  messages.forEach((msg) => {
    const partner = msg.sender_email === user?.email ? msg.receiver_email : msg.sender_email;
    const partnerName = msg.sender_email === user?.email ? msg.receiver_name : msg.sender_name;
    if (!conversations[partner]) {
      conversations[partner] = {
        partnerEmail: partner,
        partnerName: partnerName || partner,
        lastMessage: msg,
        unread: 0,
      };
    }
    if (msg.receiver_email === user?.email && !msg.is_read) {
      conversations[partner].unread++;
    }
  });

  const convList = Object.values(conversations).sort(
    (a, b) => new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date)
  );

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 md:pb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-500 mt-1">Vos conversations</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#1B5E3B]" />
        </div>
      ) : convList.length === 0 ? (
        <div className="text-center py-20">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Aucune conversation pour le moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {convList.map((conv) => (
            <Link
              key={conv.partnerEmail}
              to={createPageUrl("Conversation") + `?partner=${conv.partnerEmail}`}
            >
              <Card className="border-[#f0e8df] hover:shadow-md hover:border-[#1B5E3B]/20 transition-all cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-[#1B5E3B]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-[#1B5E3B]">
                      {conv.partnerName?.[0]?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-gray-900">{conv.partnerName}</span>
                      <span className="text-xs text-gray-400">
                        {format(new Date(conv.lastMessage.created_date), "d MMM HH:mm", { locale: fr })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-500 truncate pr-4">
                        {conv.lastMessage.sender_email === user.email && (
                          <span className="text-gray-400">Vous : </span>
                        )}
                        {conv.lastMessage.content}
                      </p>
                      {conv.unread > 0 && (
                        <Badge className="bg-[#E8634A] text-white border-0 text-xs min-w-[20px] justify-center">
                          {conv.unread}
                        </Badge>
                      )}
                    </div>
                    {conv.lastMessage.meal_title && (
                      <p className="text-xs text-[#1B5E3B] mt-1">
                        📦 {conv.lastMessage.meal_title}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}