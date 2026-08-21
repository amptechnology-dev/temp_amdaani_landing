"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../../context/ThemeContext";
import { themeConfig } from "../../../utils/ThemeConfig";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Phone, Mail, ArrowLeft, Clock, CheckCircle, Loader2, FileCheck2, X, Check,
} from "lucide-react";
import Navigation from "../../../components/Navigation";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "../../../context/AuthContext";

const STEP_PHONE = "PHONE";
const STEP_OTP = "OTP";
const STEP_EMAIL = "EMAIL";
const STEP_EMAIL_OTP = "EMAIL_OTP";
const STEP_NEW_PHONE = "NEW_PHONE";

function TermsModal({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] cursor-pointer"
          />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-[92vw] max-w-lg max-h-[80vh] rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-blue-500" /> Terms &amp; Conditions
              </h3>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5 space-y-3 text-sm leading-relaxed opacity-80">
              <p>AMDAANI is provided by AMP Technology for billing, invoicing and business management. By logging in you agree to our Terms &amp; Conditions and Privacy Policy.</p>
              <p>
                Read the full document at{" "}
                <a href="/terms" target="_blank" className="text-blue-500 underline cursor-pointer">amdaani.com/terms</a>.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function LoginScreen() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const {
    sendOtp, verifyOtp, sendEmailOtp, verifyEmailOtp, changePhoneNumber,
  } = useAuth();

  const [step, setStep] = useState(STEP_PHONE);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const [timer, setTimer] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [termsOpen, setTermsOpen] = useState(false);

  const isPhoneValid = /^[6-9]\d{9}$/.test(phone);
  const isNewPhoneValid = /^[6-9]\d{9}$/.test(newPhone);
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  useEffect(() => { setError(""); }, [step]);

  useEffect(() => {
    let t;
    if (timerActive && timer > 0) t = setTimeout(() => setTimer((p) => p - 1), 1000);
    else if (timer === 0) setTimerActive(false);
    return () => clearTimeout(t);
  }, [timer, timerActive]);

  useEffect(() => {
    if (otp.length === 6 && step === STEP_OTP) handleVerifyOtp();
  }, [otp]);

  useEffect(() => {
    if (emailOtp.length === 6 && step === STEP_EMAIL_OTP) handleVerifyEmailOtp();
  }, [emailOtp]);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const maskedPhone = (p) => (p && p.length >= 4 ? p.replace(/.(?=.{4})/g, "*") : p);
  const maskedEmail = (e) => {
    if (!e || !e.includes("@")) return e;
    const [l, d] = e.split("@");
    return `${l.slice(0, 2)}***@${d}`;
  };

  const handleSendOtp = async () => {
    if (!isPhoneValid) return setError("Enter a valid 10-digit mobile number starting with 6-9");
    setIsLoading(true);
    setError("");
    try {
      const res = await sendOtp(phone);
      if (res.success) {
        setStep(STEP_OTP);
        setOtp("");
        setTimer(60);
        setTimerActive(true);
      } else setError(res.message || "Failed to send OTP");
    } catch (err) {
      setError(err.message || "Failed to send OTP");
    }
    setIsLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await verifyOtp(phone, otp);
      if (!res.success) {
        setOtp("");
        setError(res.message || "Invalid OTP");
      }
    } catch (err) {
      setOtp("");
      setError(err.message || "Invalid OTP");
    }
    setIsLoading(false);
  };

  const handleResendOtp = async () => {
    if (timerActive) return;
    setOtp("");
    setTimer(60);
    setTimerActive(true);
    setError("");
    await sendOtp(phone);
  };

  const handleSendEmailOtp = async () => {
    if (!isEmailValid) return setError("Enter a valid email address");
    setIsLoading(true);
    setError("");
    try {
      const res = await sendEmailOtp(email);
      if (res.success) {
        setStep(STEP_EMAIL_OTP);
        setEmailOtp("");
        setTimer(60);
        setTimerActive(true);
      } else setError(res.message || "Failed to send OTP");
    } catch (err) {
      setError(err.message || "Failed to send OTP");
    }
    setIsLoading(false);
  };

  const handleVerifyEmailOtp = async () => {
    if (emailOtp.length !== 6) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await verifyEmailOtp(email, emailOtp);
      if (res.success) setStep(STEP_NEW_PHONE);
      else {
        setEmailOtp("");
        setError(res.message || "Invalid OTP");
      }
    } catch (err) {
      setEmailOtp("");
      setError(err.message || "Invalid OTP");
    }
    setIsLoading(false);
  };

  const handleResendEmailOtp = async () => {
    if (timerActive) return;
    setEmailOtp("");
    setTimer(60);
    setTimerActive(true);
    await sendEmailOtp(email);
  };

  const handleChangePhoneNumber = async () => {
    if (!isNewPhoneValid) return setError("Enter a valid 10-digit mobile number");
    setIsLoading(true);
    setError("");
    try {
      const res = await changePhoneNumber(newPhone);
      if (res.success) {
        setPhone(""); setOtp(""); setEmail(""); setEmailOtp(""); setNewPhone("");
        setTimerActive(false); setTimer(60);
        setStep(STEP_PHONE);
      } else setError(res.message || "Failed to update number");
    } catch (err) {
      setError(err.message || "Failed to update number");
    }
    setIsLoading(false);
  };

  const subtitle = {
    [STEP_PHONE]: "Sign in to continue",
    [STEP_OTP]: `Verify the OTP sent to ${maskedPhone(phone)}`,
    [STEP_EMAIL]: "Verify your email to change number",
    [STEP_EMAIL_OTP]: `Enter the OTP sent to ${maskedEmail(email)}`,
    [STEP_NEW_PHONE]: "Enter your new phone number",
  }[step];

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${currentTheme.background}`}>
      <Navigation noLanding={true} />

      <section className="flex-1 min-h-0 flex items-center justify-center p-4 overflow-y-auto">
        <div className="max-w-md w-full">
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 shadow-lg shadow-blue-500/20 bg-white ring-1 ring-slate-200/70 overflow-hidden relative">
              <Image
                src="/images/Tapplogo.png"
                alt="AMDAANI logo"
                fill
                className="object-contain p-2"
                sizes="56px"
                priority
              />
            </div>
            <h1 className={`text-2xl font-bold mb-1 ${currentTheme.text}`}>Welcome to AMDAANI</h1>
            <p className={`text-sm ${currentTheme.textSecondary}`}>{subtitle}</p>
          </div>

          <div className={`relative w-full p-6 rounded-3xl shadow-xl transition-all duration-300 ${currentTheme.surface} border ${currentTheme.outline}`}>
            {step !== STEP_PHONE && (
              <button
                onClick={() => {
                  if (step === STEP_OTP) setStep(STEP_PHONE);
                  if (step === STEP_EMAIL) setStep(STEP_PHONE);
                  if (step === STEP_EMAIL_OTP) setStep(STEP_EMAIL);
                  if (step === STEP_NEW_PHONE) setStep(STEP_EMAIL_OTP);
                  setError("");
                }}
                className={`absolute top-5 left-5 flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer ${currentTheme.textSecondary} hover:${currentTheme.text}`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back</span>
              </button>
            )}

            <AnimatePresence mode="wait">
              {/* PHONE */}
              {step === STEP_PHONE && (
                <motion.div key="phone" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }} className="space-y-4 pt-2">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`text-sm font-semibold ${currentTheme.text}`}>Mobile Number</label>
                      {phone.length > 0 && (
                        isPhoneValid ? (
                          <span className="flex items-center gap-1 text-xs text-green-500">
                            <CheckCircle className="w-3.5 h-3.5" /> Valid
                          </span>
                        ) : (
                          <span className={`text-xs ${currentTheme.textSecondary}`}>{phone.length}/10</span>
                        )
                      )}
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 opacity-45" />
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                        type="tel" maxLength={10} placeholder="Enter 10-digit mobile number"
                        disabled={isLoading}
                        className={`pl-10 h-12 text-base rounded-xl ${error ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                        onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                      />
                    </div>
                    {error && <p className="text-sm text-red-500 mt-1.5">{error}</p>}
                    <p className={`text-xs mt-2 ${currentTheme.textSecondary}`}>We'll send a verification code to this number</p>
                  </div>

                  <Button
                    onClick={handleSendOtp}
                    disabled={!isPhoneValid || isLoading}
                    className={`w-full h-12 text-base font-semibold rounded-xl cursor-pointer ${currentTheme.buttonPrimary} ${(!isPhoneValid || isLoading) ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isLoading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending OTP...</>) : "Continue"}
                  </Button>

                  <div className="relative my-3">
                    <div className="absolute inset-0 flex items-center"><div className={`w-full border-t ${currentTheme.outline}`} /></div>
                    <div className="relative flex justify-center text-sm">
                      <span className={`px-2 ${currentTheme.surface} ${currentTheme.textSecondary}`}>Secure &amp; encrypted</span>
                    </div>
                  </div>

                  <div className={`text-xs text-center ${currentTheme.textSecondary}`}>
                    <p>By continuing, you agree to our{" "}
                      <button onClick={() => setTermsOpen(true)} className="font-medium underline cursor-pointer">
                        Terms of Service and Privacy Policy
                      </button>
                    </p>
                  </div>
                </motion.div>
              )}

              {/* PHONE OTP */}
              {step === STEP_OTP && (
                <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-5 pt-6">
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otp} onChange={setOtp} disabled={isLoading}>
                      <InputOTPGroup className="gap-2">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <InputOTPSlot key={i} index={i}
                            className={`w-12 h-12 text-xl font-semibold border-2 rounded-xl ${error ? "border-red-500" : currentTheme.outline} ${currentTheme.surface}`} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                  <div className="text-center">
                    {timerActive ? (
                      <span className={`inline-flex items-center gap-1.5 text-sm ${currentTheme.textSecondary}`}>
                        <Clock className="w-3.5 h-3.5" /> Resend OTP in {formatTime(timer)}
                      </span>
                    ) : (
                      <button onClick={handleResendOtp} className="text-sm font-semibold text-blue-500 hover:underline cursor-pointer">
                        Resend OTP
                      </button>
                    )}
                  </div>

                  <Button
                    onClick={handleVerifyOtp}
                    disabled={otp.length !== 6 || isLoading}
                    className={`w-full h-12 text-base font-semibold rounded-xl cursor-pointer ${currentTheme.buttonPrimary} ${(otp.length !== 6 || isLoading) ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isLoading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>) : "Verify & Continue"}
                  </Button>
                </motion.div>
              )}

              {/* EMAIL entry */}
              {step === STEP_EMAIL && (
                <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-5 pt-6">
                  <div>
                    <label className={`text-sm font-semibold ${currentTheme.text}`}>Registered Email</label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 opacity-45" />
                      <Input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email" placeholder="you@example.com" disabled={isLoading}
                        className={`pl-10 h-12 text-base rounded-xl ${error ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                        onKeyDown={(e) => e.key === "Enter" && handleSendEmailOtp()}
                      />
                    </div>
                    {error && <p className="text-sm text-red-500 mt-1.5">{error}</p>}
                  </div>

                  <Button
                    onClick={handleSendEmailOtp}
                    disabled={!isEmailValid || isLoading}
                    className={`w-full h-12 text-base font-semibold rounded-xl cursor-pointer ${currentTheme.buttonPrimary} ${(!isEmailValid || isLoading) ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isLoading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending OTP...</>) : "Send OTP to Email"}
                  </Button>
                </motion.div>
              )}

              {/* EMAIL OTP */}
              {step === STEP_EMAIL_OTP && (
                <motion.div key="emailOtp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-5 pt-6">
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={emailOtp} onChange={setEmailOtp} disabled={isLoading}>
                      <InputOTPGroup className="gap-2">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <InputOTPSlot key={i} index={i}
                            className={`w-12 h-12 text-xl font-semibold border-2 rounded-xl ${error ? "border-red-500" : currentTheme.outline} ${currentTheme.surface}`} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                  <div className="text-center">
                    {timerActive ? (
                      <span className={`inline-flex items-center gap-1.5 text-sm ${currentTheme.textSecondary}`}>
                        <Clock className="w-3.5 h-3.5" /> Resend OTP in {formatTime(timer)}
                      </span>
                    ) : (
                      <button onClick={handleResendEmailOtp} className="text-sm font-semibold text-blue-500 hover:underline cursor-pointer">
                        Resend OTP
                      </button>
                    )}
                  </div>

                  <Button
                    onClick={handleVerifyEmailOtp}
                    disabled={emailOtp.length !== 6 || isLoading}
                    className={`w-full h-12 text-base font-semibold rounded-xl cursor-pointer ${currentTheme.buttonPrimary} ${(emailOtp.length !== 6 || isLoading) ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isLoading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>) : "Verify & Continue"}
                  </Button>
                </motion.div>
              )}

              {/* NEW PHONE */}
              {step === STEP_NEW_PHONE && (
                <motion.div key="newPhone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-5 pt-6">
                  <div>
                    <label className={`text-sm font-semibold ${currentTheme.text}`}>New Phone Number</label>
                    <div className="relative mt-1.5">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 opacity-45" />
                      <Input
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ""))}
                        type="tel" maxLength={10} placeholder="Enter new 10-digit number" disabled={isLoading}
                        className={`pl-10 h-12 text-base rounded-xl ${error ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                        onKeyDown={(e) => e.key === "Enter" && handleChangePhoneNumber()}
                      />
                    </div>
                    {error && <p className="text-sm text-red-500 mt-1.5">{error}</p>}
                  </div>

                  <Button
                    onClick={handleChangePhoneNumber}
                    disabled={!isNewPhoneValid || isLoading}
                    className={`w-full h-12 text-base font-semibold rounded-xl cursor-pointer ${currentTheme.buttonPrimary} ${(!isNewPhoneValid || isLoading) ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isLoading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...</>) : "Update Number"}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {step === STEP_PHONE && (
              <div className="text-center mt-4">
                <button onClick={() => { setEmail(""); setEmailOtp(""); setError(""); setStep(STEP_EMAIL); }}
                  className="text-sm font-medium text-blue-500 hover:underline cursor-pointer">
                  Change Number?
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 text-center">
            <p className={`text-xs ${currentTheme.textSecondary}`}>
              Need help? <a href="#" className="font-medium underline cursor-pointer">Contact Support</a>
            </p>
          </div>
        </div>
      </section>

      <TermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />
    </div>
  );
}