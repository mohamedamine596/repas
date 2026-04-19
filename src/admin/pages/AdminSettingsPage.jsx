import React, { useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAdminData } from "../AdminContext";

export default function AdminSettingsPage() {
  const {
    adminAccounts,
    quizQuestions,
    rules,
    emailTemplates,
    addAdminAccount,
    removeAdminAccount,
    updateQuizQuestions,
    updateRules,
    updateEmailTemplates,
  } = useAdminData();

  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", role: "Moderateur" });
  const [quizDraft, setQuizDraft] = useState(() => JSON.parse(JSON.stringify(quizQuestions)));
  const [ruleThreshold, setRuleThreshold] = useState(String(rules.autoSuspensionOpenReports));
  const [templatesDraft, setTemplatesDraft] = useState(() => ({ ...emailTemplates }));
  const [adminToDelete, setAdminToDelete] = useState(null);

  const canAddAdmin = useMemo(
    () => newAdmin.name.trim().length > 1 && newAdmin.email.trim().includes("@"),
    [newAdmin]
  );

  const handleAddAdmin = () => {
    if (!canAddAdmin) {
      toast.error("Nom et email admin requis.");
      return;
    }

    addAdminAccount({
      name: newAdmin.name.trim(),
      email: newAdmin.email.trim().toLowerCase(),
      role: newAdmin.role,
    });
    setNewAdmin({ name: "", email: "", role: "Moderateur" });
    toast.success("Compte admin ajoute avec succes.");
  };

  const saveQuiz = () => {
    updateQuizQuestions(quizDraft);
    toast.success("Questions du quiz mises a jour.");
  };

  const saveRules = () => {
    const numeric = Number(ruleThreshold);
    if (!Number.isFinite(numeric) || numeric < 1) {
      toast.error("Le seuil doit etre un nombre >= 1.");
      return;
    }

    updateRules({ autoSuspensionOpenReports: numeric });
    toast.success("Regles automatiques enregistrees.");
  };

  const saveTemplates = () => {
    updateEmailTemplates(templatesDraft);
    toast.success("Modeles d'email sauvegardes.");
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#234D1A]">Parametres</h2>
        <p className="text-sm text-[#7B6D59]">Configuration des admins, quiz, regles automatiques et emails.</p>
      </div>

      <Card className="border-[#E6DCCB] bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-[#234D1A]">1. Gestion des admins</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input
              value={newAdmin.name}
              onChange={(event) => setNewAdmin((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Nom complet"
              className="border-[#D8CEBC]"
            />
            <Input
              value={newAdmin.email}
              onChange={(event) => setNewAdmin((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="Email"
              className="border-[#D8CEBC]"
            />
            <select
              value={newAdmin.role}
              onChange={(event) => setNewAdmin((prev) => ({ ...prev, role: event.target.value }))}
              className="h-10 rounded-md border border-[#D8CEBC] px-3 text-sm bg-white"
            >
              <option value="Moderateur">Moderateur</option>
              <option value="Super Admin">Super Admin</option>
            </select>
            <Button type="button" className="bg-[#2D6A1F] hover:bg-[#245619] text-white" onClick={handleAddAdmin}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </div>

          <div className="space-y-2">
            {adminAccounts.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between rounded-md border border-[#EEE6D8] px-3 py-2"
              >
                <div>
                  <p className="font-medium text-[#1F2937]">{admin.name}</p>
                  <p className="text-sm text-[#667085]">{admin.email} - {admin.role}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#F5B7B7] text-[#A01616] hover:bg-[#FDE7E7]"
                  onClick={() => setAdminToDelete(admin)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E6DCCB] bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-[#234D1A]">2. Questions du quiz securite alimentaire</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {quizDraft.map((question, index) => (
            <div key={question.id} className="rounded-md border border-[#EEE6D8] p-3 space-y-2">
              <Input
                value={question.question}
                onChange={(event) => {
                  const next = [...quizDraft];
                  next[index].question = event.target.value;
                  setQuizDraft(next);
                }}
                className="border-[#D8CEBC]"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {question.answers.map((answer, answerIndex) => (
                  <Input
                    key={`${question.id}-answer-${answerIndex}`}
                    value={answer}
                    onChange={(event) => {
                      const next = [...quizDraft];
                      next[index].answers[answerIndex] = event.target.value;
                      setQuizDraft(next);
                    }}
                    className="border-[#D8CEBC]"
                    placeholder={`Reponse ${answerIndex + 1}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 text-sm text-[#344054]">
                <span>Bonne reponse:</span>
                <select
                  value={question.correctAnswerIndex}
                  onChange={(event) => {
                    const next = [...quizDraft];
                    next[index].correctAnswerIndex = Number(event.target.value);
                    setQuizDraft(next);
                  }}
                  className="h-8 rounded-md border border-[#D8CEBC] px-2 bg-white"
                >
                  {question.answers.map((_, answerIndex) => (
                    <option key={`${question.id}-correct-${answerIndex}`} value={answerIndex}>
                      Reponse {answerIndex + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}

          <Button type="button" className="bg-[#2D6A1F] hover:bg-[#245619] text-white" onClick={saveQuiz}>
            <Save className="w-4 h-4 mr-2" />
            Enregistrer quiz
          </Button>
        </CardContent>
      </Card>

      <Card className="border-[#E6DCCB] bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-[#234D1A]">3. Regles automatiques</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="text-sm text-[#344054]">Nombre de signalements ouverts avant recommandation de suspension</label>
          <div className="flex gap-2 max-w-[280px]">
            <Input
              type="number"
              min={1}
              value={ruleThreshold}
              onChange={(event) => setRuleThreshold(event.target.value)}
              className="border-[#D8CEBC]"
            />
            <Button type="button" className="bg-[#2D6A1F] hover:bg-[#245619] text-white" onClick={saveRules}>
              Sauvegarder
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E6DCCB] bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-[#234D1A]">4. Modeles d'email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm text-[#344054]">Email OTP</label>
            <Textarea
              value={templatesDraft.otpEmail}
              onChange={(event) =>
                setTemplatesDraft((prev) => ({ ...prev, otpEmail: event.target.value }))
              }
              className="border-[#D8CEBC] min-h-[90px]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-[#344054]">Email de bienvenue</label>
            <Textarea
              value={templatesDraft.welcomeEmail}
              onChange={(event) =>
                setTemplatesDraft((prev) => ({ ...prev, welcomeEmail: event.target.value }))
              }
              className="border-[#D8CEBC] min-h-[90px]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-[#344054]">Email de suspension</label>
            <Textarea
              value={templatesDraft.suspensionNotice}
              onChange={(event) =>
                setTemplatesDraft((prev) => ({ ...prev, suspensionNotice: event.target.value }))
              }
              className="border-[#D8CEBC] min-h-[90px]"
            />
          </div>

          <Button type="button" className="bg-[#2D6A1F] hover:bg-[#245619] text-white" onClick={saveTemplates}>
            <Save className="w-4 h-4 mr-2" />
            Enregistrer modeles
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(adminToDelete)} onOpenChange={(open) => !open && setAdminToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est destructive et supprimera le compte admin selectionne.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#A01616] hover:bg-[#860F0F]"
              onClick={() => {
                if (!adminToDelete) return;
                removeAdminAccount(adminToDelete.id);
                toast.success("Compte admin supprime.");
                setAdminToDelete(null);
              }}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
