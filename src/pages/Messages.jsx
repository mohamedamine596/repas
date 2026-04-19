import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/lib/AuthContext";
import { backendApi } from "@/api/backendClient";

export default function Messages() {
  const { user, token, isLoadingAuth, navigateToLogin } = useAuth();

  useEffect(() => {
    if (!isLoadingAuth && !user) {
      navigateToLogin();
    }
  }, [isLoadingAuth, user, navigateToLogin]);

  const { data: convList = [], isLoading } = useQuery({
    queryKey: ["conversations", user?.email],
    queryFn: async () => {
      const data = await backendApi.messages.listConversations(token);
      return Array.isArray(data?.conversations) ? data.conversations : [];
    },
    enabled: !!user?.email && !!token,
  });

  if (isLoadingAuth || !user) return null;

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
                        {format(new Date(conv.lastMessage.createdAt), "d MMM HH:mm", { locale: fr })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-500 truncate pr-4">
                        {conv.lastMessage.fromEmail === user.email && (
                          <span className="text-gray-400">Vous : </span>
                        )}
                        {conv.lastMessage.content}
                      </p>
                      {conv.unreadCount > 0 && (
                        <Badge className="bg-[#E8634A] text-white border-0 text-xs min-w-[20px] justify-center">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
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