"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../../context/ThemeContext";
import { themeConfig } from "../../../utils/ThemeConfig";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Phone,
  ShieldCheck,
  ArrowLeft,
  Clock,
  CheckCircle,
  Loader2,
} from "lucide-react";
import Navigation from "../../../components/Navigation";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useAuth } from "../../../context/AuthContext";

export default function LoginScreen() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpResendTimer, setOtpResendTimer] = useState(30);
  const [isResendEnabled, setIsResendEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);

  const { sendOtp, verifyOtp } = useAuth();

  // Handle OTP resend timer
  useEffect(() => {
    if (step === "otp" && otpResendTimer > 0) {
      const timer = setTimeout(() => {
        setOtpResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (step === "otp" && otpResendTimer === 0) {
      setIsResendEnabled(true);
    }
  }, [otpResendTimer, step]);

  // Auto-submit OTP when all digits are entered
  useEffect(() => {
    if (otp.length === 6 && step === "otp") {
      handleOtpSubmit();
    }
  }, [otp]);

  // Validate phone number as user types
  useEffect(() => {
    const phoneRegex = /^[6-9]\d{9}$/;
    setIsPhoneValid(phoneRegex.test(phone));
    setError("");
  }, [phone]);

  const handlePhoneSubmit = async () => {
    if (!isPhoneValid) {
      setError("Please enter a valid 10-digit mobile number starting with 6-9");
      return;
    }

    setIsLoading(true);
    // Simulate API call
    setIsLoading(true);
    setError("");

    try {
      const res = await sendOtp(phone);

      if (res.success) {
        setStep("otp");
        setOtp("");
        setOtpResendTimer(30);
        setIsResendEnabled(false);
      } else {
        setError(res.message || "Failed to send OTP");
      }
    } catch (err) {
      setError(err.message || "Failed to send OTP");
    }

    setIsLoading(false);
  };

  const handleOtpSubmit = async () => {
    if (otp.length !== 6) {
      setError("Please enter all 4 digits");
      return;
    }

    setIsLoading(true);
    // Simulate OTP verification
    setIsLoading(true);
    setError("");

    try {
      const res = await verifyOtp(phone, otp);
      console.log(res);

      if (res.success) {
        // AuthContext already sets auth + redirects in verifyOtp()
        return;
      } else {
        setError(res.message || "Invalid OTP");
      }
    } catch (err) {
      setError(err.message || "Invalid OTP");
    }

    setIsLoading(false);
  };

  const handleResendOtp = async () => {
    if (!isResendEnabled) return;

    setIsResendEnabled(false);
    setOtpResendTimer(30);
    setOtp("");
    setError("");

    // Simulate OTP resend
    await new Promise((resolve) => setTimeout(resolve, 800));
  };

  return (
    <>
      <Navigation noLanding={true} />

      <section
        className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${currentTheme.background}`}
      >
        <div className="max-w-md w-full">
          {/* Header Logo/Brand */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{
                background:
                  theme === "light"
                    ? "linear-gradient(135deg, #1A73E8 0%, #4285F4 100%)"
                    : "linear-gradient(135deg, #8AB4F8 0%, #669DF6 100%)",
              }}
            >
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className={`text-3xl font-bold mb-2 ${currentTheme.text}`}>
              Welcome to Amdaani
            </h1>
            <p className={`text-sm ${currentTheme.textSecondary}`}>
              Fastest & most affordable billing solution
            </p>
          </div>

          {/* Main Card */}
          <div
            className={`
          relative w-full p-8 rounded-2xl shadow-lg transition-all duration-300 
          ${currentTheme.surface} border ${currentTheme.outline}
          hover:shadow-xl
        `}
          >
            {/* Back button for OTP screen */}
            {step === "otp" && (
              <button
                onClick={() => {
                  setStep("phone");
                  setError("");
                }}
                className={`absolute top-6 left-6 flex items-center gap-2 p-2 rounded-lg transition-colors
                ${currentTheme.textSecondary} hover:${currentTheme.surfaceVariant} hover:${currentTheme.text}`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back</span>
              </button>
            )}

            <AnimatePresence mode="wait">
              {/* PHONE STEP */}
              {step === "phone" && (
                <motion.div
                  key="phone"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label
                        className={`text-sm font-medium ${currentTheme.text}`}
                      >
                        Mobile Number
                      </label>
                      {phone.length > 0 && (
                        <div className="flex items-center gap-1">
                          {isPhoneValid ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-xs text-green-500">
                                Valid
                              </span>
                            </>
                          ) : (
                            <span
                              className={`text-xs ${currentTheme.textSecondary}`}
                            >
                              {phone.length}/10
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone
                          className={`w-5 h-5 ${currentTheme.textSecondary}`}
                        />
                      </div>
                      <Input
                        value={phone}
                        onChange={(e) =>
                          setPhone(e.target.value.replace(/\D/g, ""))
                        }
                        type="tel"
                        maxLength={10}
                        placeholder="Enter 10-digit mobile number"
                        className={`
                        pl-10 h-12 text-base
                        ${error ? "border-red-500 focus:ring-red-500" : ""}
                      `}
                        disabled={isLoading}
                      />
                    </div>

                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-500 mt-2 flex items-center gap-1"
                      >
                        {error}
                      </motion.p>
                    )}

                    <p className={`text-xs mt-3 ${currentTheme.textSecondary}`}>
                      We'll send a verification code to this number
                    </p>
                  </div>

                  <Button
                    onClick={handlePhoneSubmit}
                    disabled={!isPhoneValid || isLoading}
                    className={`
                    w-full h-12 text-base font-medium rounded-lg transition-all duration-300
                    ${currentTheme.buttonPrimary}
                    ${
                      !isPhoneValid || isLoading
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }
                  `}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending OTP...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div
                        className={`w-full border-t ${currentTheme.outline}`}
                      ></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span
                        className={`px-2 ${currentTheme.surface} ${currentTheme.textSecondary}`}
                      >
                        Secure & encrypted
                      </span>
                    </div>
                  </div>

                  <div
                    className={`text-xs text-center ${currentTheme.textSecondary}`}
                  >
                    <p>By continuing, you agree to our</p>
                    <p className="mt-1">
                      <a
                        href="#"
                        className={`font-medium ${currentTheme.textSecondary} hover:underline`}
                      >
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a
                        href="#"
                        className={`font-medium ${currentTheme.textSecondary} hover:underline`}
                      >
                        Privacy Policy
                      </a>
                    </p>
                  </div>
                </motion.div>
              )}

              {/* OTP STEP */}
              {step === "otp" && (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-2">
                    <h2
                      className={`text-xl font-semibold mb-2 ${currentTheme.text}`}
                    >
                      Enter Verification Code
                    </h2>
                    <p className={`text-sm ${currentTheme.textSecondary}`}>
                      Sent to <span className="font-medium">{phone}</span>
                    </p>
                  </div>

                  {/* Shadcn OTP Input */}
                  <div className="space-y-4 ">
                    <div className="flex justify-center px-8">
                      <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={(value) => setOtp(value)}
                        disabled={isLoading}
                      >
                        <InputOTPGroup className="gap-2">
                          {[0, 1, 2, 3, 4, 5].map((index) => (
                            <InputOTPSlot
                              key={index}
                              index={index}
                              className={`
                                w-12 h-12 text-2xl font-semibold
                                border-2 rounded-lg
                               
                                ${
                                  error
                                    ? "border-red-500"
                                    : currentTheme.outline
                                }
                                transition-all duration-200
                                hover:border-blue-400
                                focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200
                                data-[state=active]:border-blue-500 data-[state=active]:ring-2 data-[state=active]:ring-blue-200
                                ${currentTheme.surface}
                              `}
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-500 text-center"
                      >
                        {error}
                      </motion.p>
                    )}

                    {/* Resend OTP */}
                    <div className="text-center">
                      <button
                        onClick={handleResendOtp}
                        disabled={!isResendEnabled || isLoading}
                        className={`
                        text-sm font-medium transition-colors
                        ${
                          isResendEnabled
                            ? `${currentTheme.accent} hover:underline`
                            : `${currentTheme.textSecondary} cursor-not-allowed`
                        }
                      `}
                      >
                        {isResendEnabled ? (
                          "Resend OTP"
                        ) : (
                          <span className="flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3" />
                            Resend in {otpResendTimer}s
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    onClick={handleOtpSubmit}
                    disabled={otp.length !== 6 || isLoading}
                    className={`
                    w-full h-12 text-base font-medium rounded-lg transition-all duration-300
                    ${currentTheme.buttonPrimary}
                    text-base
                    ${
                      otp.length !== 4 || isLoading
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }
                  `}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify & Continue"
                    )}
                  </Button>

                  <div
                    className={`text-xs text-center ${currentTheme.textSecondary}`}
                  >
                    <p className="mb-2">Didn't receive the code?</p>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={handleResendOtp}
                        disabled={!isResendEnabled}
                        className={`font-medium ${
                          isResendEnabled
                            ? `${currentTheme.text} hover:underline`
                            : `${currentTheme.textSecondary} cursor-not-allowed`
                        }`}
                      >
                        Send via SMS
                      </button>
                      <span className="text-xs">or</span>
                      <button
                        onClick={handleResendOtp}
                        disabled={!isResendEnabled}
                        className={`font-medium ${
                          isResendEnabled
                            ? `${currentTheme.text} hover:underline`
                            : `${currentTheme.textSecondary} cursor-not-allowed`
                        }`}
                      >
                        Call me with the code
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className={`mt-6 text-center ${currentTheme.background}`}>
            <p className={`text-xs ${currentTheme.onBackground}`}>
              Need help?{" "}
              <a
                href="#"
                className={`font-medium ${currentTheme.onBackground} hover:underline`}
              >
                {" "}
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
