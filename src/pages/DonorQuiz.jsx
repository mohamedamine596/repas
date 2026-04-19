// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { backendApi } from "@/api/backendClient";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";
import AuthSplitLayout from "@/components/auth/AuthSplitLayout";
import { Button } from "@/components/ui/button";

const LETTERS = ["A", "B", "C", "D"];

export default function DonorQuiz() {
  const navigate = useNavigate();
  const { user, token, isLoadingAuth, checkAppState } = useAuth();
  const [answers, setAnswers] = useState(Array(5).fill(null));
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["donorQuizStatus", token],
    queryFn: () => backendApi.auth.donorQuizStatus(token),
    enabled: !!token && user?.role === "DONOR",
  });

  const accountStatus = data?.quiz?.accountStatus || user?.accountStatus;
  const documentUploaded = Boolean(data?.quiz?.documentUploaded);
  const questions = data?.questions || [];

  useEffect(() => {
    if (questions.length > 0 && answers.length !== questions.length) {
      setAnswers(Array(questions.length).fill(null));
    }
  }, [answers.length, questions.length]);

  useEffect(() => {
    if (data?.quiz?.cooldownRemainingSeconds) {
      setCooldownSeconds(Number(data.quiz.cooldownRemainingSeconds));
    }
  }, [data?.quiz?.cooldownRemainingSeconds]);

  const submitMutation = useMutation({
    mutationFn: () => backendApi.auth.submitDonorQuiz(token, { answers }),
    onSuccess: async (response) => {
      setResult(response);
      if (response?.passed) {
        await checkAppState();
        toast.success("Quiz valide. Votre compte passe en revision admin.");
        navigate(createPageUrl("DonorPendingReview"), { replace: true });
        return;
      }

      if (response?.retryAvailableAt) {
        const retryAt = new Date(response.retryAvailableAt).getTime();
        const delta = Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
        setCooldownSeconds(delta);
      }

      toast.error(response?.message || "Quiz non valide");
      await refetch();
    },
    onError: (error) => {
      if (error?.data?.cooldownRemainingSeconds) {
        setCooldownSeconds(Number(error.data.cooldownRemainingSeconds));
      }
      toast.error(error?.message || "Impossible d'envoyer le quiz");
    },
  });

  useEffect(() => {
    if (isLoadingAuth) {
      return;
    }

    if (!user) {
      navigate(createPageUrl("Login"), { replace: true });
      return;
    }

    if (user.role !== "DONOR") {
      navigate("/receveur/dashboard", { replace: true });
    }
  }, [isLoadingAuth, navigate, user]);

  useEffect(() => {
    if (!accountStatus) {
      return;
    }

    if (accountStatus === "pending_admin_review") {
      navigate(createPageUrl("DonorPendingReview"), { replace: true });
      return;
    }

    if (accountStatus === "active") {
      navigate("/donneur/dashboard", { replace: true });
    }
  }, [accountStatus, navigate]);

  useEffect(() => {
    if (!isLoading && !isFetching && accountStatus === "email_verified" && !documentUploaded) {
      navigate(createPageUrl("DonorDocumentUpload"), { replace: true });
    }
  }, [accountStatus, documentUploaded, isFetching, isLoading, navigate]);

  const missingAnswerCount = useMemo(
    () =>
      questions.reduce(
        (count, _question, index) =>
          answers[index] === null || answers[index] === undefined ? count + 1 : count,
        0
      ),
    [answers, questions]
  );

  const submitQuiz = async (event) => {
    event.preventDefault();

    if (!documentUploaded) {
      toast.error("Document manquant. Vous allez etre redirige vers la page de televersement.");
      navigate(createPageUrl("DonorDocumentUpload"), { replace: true });
      return;
    }

    if (missingAnswerCount > 0) {
      toast.error(`Repondez a toutes les questions avant validation (${missingAnswerCount} manquante(s)).`);
      return;
    }

    submitMutation.mutate();
  };

  if (isLoadingAuth || !user) {
    return null;
  }

  if (isLoading) {
    return (
      <AuthSplitLayout
        eyebrow="Quiz"
        title="Chargement du quiz"
        subtitle="Nous preparons vos questions de securite alimentaire."
      >
        <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-[#14531c] animate-spin" />
      </AuthSplitLayout>
    );
  }

  if (accountStatus === "pending_admin_review" || accountStatus === "active") {
    return null;
  }

  if (accountStatus === "suspended") {
    return (
      <AuthSplitLayout
        eyebrow="Compte"
        title="Compte suspendu"
        subtitle="Votre compte donneur est actuellement suspendu. Contactez l'administration pour plus d'informations."
      >
        <Button
          type="button"
          className="h-11 w-full rounded-md bg-[#14531c] hover:bg-[#0f4216] text-white"
          onClick={() => navigate(createPageUrl("Login"))}
        >
          Retour a la connexion
        </Button>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout
      eyebrow="Securite"
      title="Quiz securite alimentaire"
      subtitle="Etape 2/2: repondez aux 5 questions. Il faut 4/5 ou 5/5 pour valider votre profil donneur."
    >
      <form onSubmit={submitQuiz} className="space-y-5">
        {questions.map((question, index) => (
          <div key={question.id} className="rounded-xl border border-[#e3eadf] bg-[#fafcf8] p-4">
            <p className="text-sm font-semibold text-[#173923]">Q{index + 1}. {question.question}</p>
            <div className="mt-3 grid gap-2">
              {question.options.map((option, optionIndex) => {
                const checked = answers[index] === optionIndex;
                return (
                  <label
                    key={`${question.id}-${optionIndex}`}
                    className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition ${
                      checked
                        ? "border-[#2d6a1f] bg-[#ecf6e8] text-[#13371e]"
                        : "border-[#dbe5d5] bg-white text-gray-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${index}`}
                      value={optionIndex}
                      checked={checked}
                      onChange={() => {
                        const next = [...answers];
                        next[index] = optionIndex;
                        setAnswers(next);
                      }}
                      className="h-4 w-4 accent-[#2d6a1f]"
                    />
                    <span className="font-semibold text-[#2d6a1f]">{LETTERS[optionIndex]})</span>
                    <span>{option}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {(data?.quiz?.attempts || result?.attempts || 0) > 0 ? (
          <p className="text-xs text-gray-500">
            Tentatives: {result?.attempts ?? data?.quiz?.attempts ?? 0}/{data?.quiz?.maxAttempts ?? 2}
          </p>
        ) : null}

        {cooldownSeconds > 0 ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Nouvelle tentative disponible dans {cooldownSeconds} secondes.
          </p>
        ) : null}

        {result?.passed === false && Array.isArray(result?.wrongAnswers) && result.wrongAnswers.length > 0 ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-red-700">
              Resultat: {result.score}/{result.total}. Reponses incorrectes:
            </p>
            {result.wrongAnswers.map((item) => (
              <div key={item.questionIndex} className="text-sm text-red-800">
                <p className="font-semibold">Q{item.questionIndex + 1}: {item.question}</p>
                <p className="text-red-700">Explication: {item.explanation}</p>
              </div>
            ))}
          </div>
        ) : null}

        <Button
          type="submit"
          className="h-11 w-full rounded-md bg-[#14531c] hover:bg-[#0f4216] text-white font-semibold"
          disabled={
            submitMutation.isPending ||
            cooldownSeconds > 0
          }
        >
          {submitMutation.isPending ? "Validation..." : "Valider le quiz"}
        </Button>

        {missingAnswerCount > 0 ? (
          <p className="text-xs text-slate-600">
            Il reste {missingAnswerCount} question(s) a completer.
          </p>
        ) : null}
      </form>
    </AuthSplitLayout>
  );
}
