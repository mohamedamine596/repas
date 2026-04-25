// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { backendApi } from "@/api/backendClient";
import AuthSplitLayout from "@/components/auth/AuthSplitLayout";
import { Button } from "@/components/ui/button";

const OTP_LENGTH = 6;
const OTP_COOLDOWN_SECONDS = 60;

export default function OtpVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOtp, isLoadingAuth } = useAuth();
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(OTP_COOLDOWN_SECONDS);
  const inputRefs = useRef([]);

  useEffect(() => {
    const fromState = location.state?.email;
    const fromSearch = new URLSearchParams(location.search).get("email");
    const fromStorage = window.localStorage.getItem("ctp_pending_email");
    const resolvedEmail = String(fromState || fromSearch || fromStorage || "")
      .trim()
      .toLowerCase();

    if (!resolvedEmail) {
      toast.error("Adresse email manquante. Recommencez l'inscription.");
      navigate(createPageUrl("Login"));
      return;
    }

    setEmail(resolvedEmail);
    window.localStorage.setItem("ctp_pending_email", resolvedEmail);
  }, [location.search, location.state, navigate]);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  const code = useMemo(() => digits.join(""), [digits]);

  const handleDigitChange = (index, value) => {
    const clean = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = clean;
    setDigits(next);

    if (clean && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) {
      return;
    }

    const next = Array(OTP_LENGTH)
      .fill("")
      .map((_, index) => pasted[index] || "");
    setDigits(next);

    const lastIndex = Math.min(pasted.length, OTP_LENGTH) - 1;
    if (lastIndex >= 0) {
      inputRefs.current[lastIndex]?.focus();
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();

    if (code.length !== OTP_LENGTH) {
      toast.error("Saisissez les 6 chiffres du code OTP.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await verifyOtp({ email, code });
      window.localStorage.removeItem("ctp_pending_email");
      window.localStorage.removeItem("ctp_pending_role");
      toast.success("Email vérifié avec succès.");

      const role = result?.user?.role;
      const status = result?.accountStatus || result?.user?.accountStatus;

      // All users verified → go to dashboard
      if (role === "ADMIN" || role === "ROLE_ADMIN") {
        navigate("/admin/dashboard", { replace: true });
        return;
      }

      if (role === "ROLE_RESTAURANT" || role === "DONOR") {
        navigate("/restaurant/dashboard", { replace: true });
        return;
      }

      // Receivers → dashboard
      navigate("/receveur/dashboard", { replace: true });
    } catch (error) {
      toast.error(error?.message || "Verification impossible");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email || cooldownSeconds > 0) {
      return;
    }

    setIsResending(true);
    try {
      const result = await backendApi.auth.resendOtp({ email });
      setCooldownSeconds(OTP_COOLDOWN_SECONDS);

      const notification = result?.emailNotification;
      if (notification?.delivered) {
        toast.success(result?.message || "Nouveau code OTP envoye.");
      } else if (notification?.skipped) {
        toast.warning(
          "Code regenere, mais email non envoye (SMTP non configure).",
        );
      } else if (notification && notification.delivered === false) {
        toast.warning("Code regenere, mais l'email n'a pas pu etre envoye.");
      } else {
        toast.success(result?.message || "Nouveau code envoye.");
      }

      if (result?.otpDebugCode) {
        toast.info(`DEBUG OTP: ${result.otpDebugCode}`);
      }

      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch (error) {
      if (error?.data?.retryInSeconds) {
        setCooldownSeconds(Number(error.data.retryInSeconds));
      }
      toast.error(error?.message || "Impossible de renvoyer le code");
    } finally {
      setIsResending(false);
    }
  };

  if (isLoadingAuth) {
    return null;
  }

  return (
    <AuthSplitLayout
      eyebrow="Verification"
      title="Confirmez votre email"
      subtitle={`Nous avons envoye un code a 6 chiffres a ${email || "votre adresse email"}.`}
    >
      <form onSubmit={handleVerify} className="space-y-6">
        <div>
          <p className="text-[12px] font-semibold text-[#1d1d1d]">Code OTP</p>
          <div
            className="mt-3 flex items-center gap-2 sm:gap-3"
            onPaste={handlePaste}
          >
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(node) => {
                  inputRefs.current[index] = node;
                }}
                value={digit}
                onChange={(event) =>
                  handleDigitChange(index, event.target.value)
                }
                onKeyDown={(event) => handleKeyDown(index, event)}
                inputMode="numeric"
                maxLength={1}
                className="h-12 w-11 rounded-md border border-[#d9e1d6] bg-[#f3f3f1] text-center text-lg font-semibold text-black outline-none focus:border-[#14531c]"
              />
            ))}
          </div>
        </div>

        <Button
          type="submit"
          className="h-11 w-full rounded-md bg-[#14531c] hover:bg-[#0f4216] text-white font-semibold"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Verification..." : "Verifier mon email"}
        </Button>

        <div className="text-sm text-gray-500 text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || cooldownSeconds > 0}
            className="font-semibold text-[#f97316] hover:text-[#ea580c] disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {cooldownSeconds > 0
              ? `Renvoyer le code (${cooldownSeconds}s)`
              : isResending
                ? "Envoi..."
                : "Renvoyer le code"}
          </button>
        </div>
      </form>
    </AuthSplitLayout>
  );
}
