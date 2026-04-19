import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/lib/AuthContext";
import { backendApi } from "@/api/backendClient";

export default function Conversation() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const partnerEmail = urlParams.get("partner");

  const { user, token, isLoadingAuth, navigateToLogin } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!isLoadingAuth && !user) {
      navigateToLogin();
    }
  }, [isLoadingAuth, user, navigateToLogin]);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["conversation", user?.email, partnerEmail],
    queryFn: async () => {
      const data = await backendApi.messages.listWithPartner(token, partnerEmail);
      const list = Array.isArray(data?.messages) ? data.messages : [];

      for (const msg of list) {
        if (msg.toEmail === user.email && !msg.isRead) {
          await backendApi.messages.markRead(token, msg.id);
        }
      }

      return list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    },
    enabled: !!user?.email && !!partnerEmail && !!token,
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: () => backendApi.messages.send(token, { toEmail: partnerEmail, content: newMessage }),
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["conversation", user?.email, partnerEmail] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const partnerName =
    messages.find((m) => m.fromEmail === partnerEmail)?.fromEmail ||
    messages.find((m) => m.toEmail === partnerEmail)?.toEmail ||
    partnerEmail;

  if (isLoadingAuth || !user) return null;

  return (
    <div className="max-w-2xl mx-auto flex flex-col" style={{ height: "calc(100vh - 160px)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-[#f0e8df]">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-9 h-9 rounded-full bg-[#1B5E3B]/10 flex items-center justify-center">
          <span className="text-sm font-bold text-[#1B5E3B]">
            {partnerName?.[0]?.toUpperCase() || "?"}
          </span>
        </div>
        <div>
          <p className="font-semibold text-sm">{partnerName}</p>
          <p className="text-xs text-gray-400">{partnerEmail}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-[#1B5E3B]" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">Commencez la conversation !</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.fromEmail === user.email;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    isMe
                      ? "bg-[#1B5E3B] text-white rounded-br-md"
                      : "bg-white border border-[#f0e8df] text-gray-800 rounded-bl-md"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? "text-white/60" : "text-gray-400"}`}>
                    {format(new Date(msg.createdAt), "HH:mm", { locale: fr })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="pt-3 border-t border-[#f0e8df]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newMessage.trim()) sendMutation.mutate();
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="Votre message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
          />
          <Button
            type="submit"
            className="bg-[#1B5E3B] hover:bg-[#154d30] text-white rounded-xl"
            disabled={!newMessage.trim() || sendMutation.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}