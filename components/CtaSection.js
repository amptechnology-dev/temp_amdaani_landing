"use client";
import { motion } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import { themeConfig } from "../utils/ThemeConfig";
import { useState, useEffect } from "react";
import {
  Play,
  Clock,
  Download,
  Shield,
} from "lucide-react";

const LANDING_APK_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/app-version/landing-apk`;

export default function CTASection() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const [isVisible, setIsVisible] = useState(false);
  const [latestApk, setLatestApk] = useState(null);
  const [apkLoading, setApkLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchLatestApk = async () => {
      try {
        setApkLoading(true);
        const response = await fetch(LANDING_APK_ENDPOINT, { method: "GET" });
        const result = await response.json();

        if (!response.ok || !result?.success || !result?.data?.apkKey) {
          setLatestApk(null);
          return;
        }

        setLatestApk(result.data);
      } catch {
        setLatestApk(null);
      } finally {
        setApkLoading(false);
      }
    };

    fetchLatestApk();
  }, []);

  const handleAPKDownload = () => {
    if (!latestApk?.apkKey) return;
    window.open(latestApk.apkKey, "_blank", "noopener,noreferrer");
  };

  return (
    <section
      className={`py-20 px-4 sm:px-6 lg:px-8 ${currentTheme.background}`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-left"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={isVisible ? { scale: 1 } : {}}
              transition={{ delay: 0.2, type: "spring" }}
              className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-6 ${
                currentTheme.accentLight
              } ${currentTheme.accent.replace("bg-", "text-")}`}
            >
              <Clock className="w-4 h-4 mr-2" />
              {apkLoading
                ? "Loading latest APK..."
                : latestApk?.version
                ? `Latest APK v${latestApk.version}`
                : "Coming Soon on Play Store"}
            </motion.div>

            <h2
              className={`text-4xl md:text-5xl font-bold mb-6 ${currentTheme.text}`}
            >
              Get Amdaani Now
              <span
                className={`block bg-gradient-to-r ${
                  theme === "light"
                    ? "from-[#1A73E8] to-[#03DAC5]"
                    : "from-[#8AB4F8] to-[#66FFF9]"
                } bg-clip-text text-transparent`}
              >
                On Your Android
              </span>
            </h2>

            <p className={`text-xl mb-8 ${currentTheme.textSecondary}`}>
              Don't wait! Download the APK now and start transforming your
              billing experience today. The fastest and cheapest billing
              solution is ready for you.
            </p>

            {/* Download Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 mb-8"
            >
              {/* APK Download Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAPKDownload}
                disabled={apkLoading || !latestApk?.apkKey}
                className={`px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg flex items-center justify-center space-x-3 ${currentTheme.buttonPrimary}`}
              >
                <AndroidLogo />
                <div className="text-left">
                  <div className="text-sm font-medium opacity-90">
                    {apkLoading
                      ? "Loading APK"
                      : latestApk?.version
                      ? `Download v${latestApk.version}`
                      : "Download Now"}
                  </div>
                  <div className="text-xs">
                    {latestApk?.description || "Direct APK Install"}
                  </div>
                </div>
                <Download className="w-5 h-5" />
              </motion.button>

              {/* Play Store Coming Soon */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-8 py-4 rounded-xl font-semibold text-lg transition-colors border-2 flex items-center justify-center space-x-3 ${currentTheme.buttonSecondary} opacity-80 cursor-not-allowed`}
                disabled
              >
                <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
                  <Play className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium opacity-90">
                    Coming Soon
                  </div>
                  <div className="text-xs">On Play Store</div>
                </div>
              </motion.button>
            </motion.div>

            {/* Security Notice */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isVisible ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.5 }}
              className={`p-4 rounded-xl border ${currentTheme.surfaceVariant} ${currentTheme.outline} mb-6`}
            >
              <div className="flex items-start space-x-3">
                <Shield className={`w-5 h-5 mt-0.5 ${currentTheme.success}`} />
                <div>
                  <h4 className={`font-semibold mb-1 ${currentTheme.text}`}>
                    Safe & Secure Download
                  </h4>
                  <p className={`text-sm ${currentTheme.textSecondary}`}>
                    Our APK is verified and 100% safe to install. You might need
                    to enable "Install from unknown sources" in your Android
                    settings.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Side - Phone Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="relative flex justify-center"
          >
            {/* Phone Mockup */}
            <div className="relative">
              {/* Phone Frame */}
              <div
                className={`w-80 h-[600px] rounded-[3rem] border-[14px] ${
                  theme === "light"
                    ? "border-gray-800 bg-gray-900"
                    : "border-gray-200 bg-white"
                } shadow-2xl`}
              >
                {/* Screen Content */}
                <div
                  className={`h-full rounded-[2rem] overflow-hidden ${
                    theme === "light" ? "bg-gray-800" : "bg-white"
                  }`}
                >
                  {/* Status Bar */}
                  <div
                    className={`h-12 flex items-center justify-between px-6 ${
                      theme === "light" ? "bg-gray-900" : "bg-gray-50"
                    }`}
                  >
                    <span
                      className={`text-xs font-medium ${
                        theme === "light" ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      9:41
                    </span>
                    <div className="flex space-x-1">
                      <div
                        className={`w-1 h-4 rounded-full ${
                          theme === "light" ? "bg-gray-600" : "bg-gray-400"
                        }`}
                      />
                      <div
                        className={`w-1 h-4 rounded-full ${
                          theme === "light" ? "bg-gray-600" : "bg-gray-400"
                        }`}
                      />
                      <div
                        className={`w-1 h-4 rounded-full ${
                          theme === "light" ? "bg-gray-600" : "bg-gray-400"
                        }`}
                      />
                    </div>
                  </div>

                  {/* App Content */}
                  <div className="p-6">
                    {/* Amdaani Logo */}
                    <div className="flex items-center space-x-3 mb-8">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#1A73E8] to-[#03DAC5] flex items-center justify-center">
                        <span className="text-white font-bold text-lg">A</span>
                      </div>
                      <div>
                        <h3
                          className={`text-lg font-bold ${
                            theme === "light" ? "text-white" : "text-gray-900"
                          }`}
                        >
                          Amdaani
                        </h3>
                        <p
                          className={`text-sm ${
                            theme === "light"
                              ? "text-gray-400"
                              : "text-gray-600"
                          }`}
                        >
                          Smart Billing
                        </p>
                      </div>
                    </div>

                    {/* Download Section */}
                    <div
                      className={`text-center p-6 rounded-2xl mb-6 ${
                        theme === "light" ? "bg-gray-700" : "bg-gray-100"
                      }`}
                    >
                      <Download
                        className={`w-12 h-12 mx-auto mb-3 ${
                          theme === "light" ? "text-gray-400" : "text-gray-500"
                        }`}
                      />
                      <h4
                        className={`text-lg font-bold mb-2 ${
                          theme === "light" ? "text-white" : "text-gray-900"
                        }`}
                      >
                        Download Ready
                      </h4>
                      <p
                        className={`text-sm ${
                          theme === "light" ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        APK available for immediate install
                      </p>
                    </div>

                    {/* Download Buttons in App */}
                    <div className="space-y-3">
                      {/* APK Button in App */}
                      <div
                        className={`p-4 rounded-2xl border-2 ${
                          theme === "light"
                            ? "border-[#1A73E8] bg-[#1A73E8]/10"
                            : "border-[#8AB4F8] bg-[#8AB4F8]/10"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-[#3DDC84] rounded flex items-center justify-center">
                            <AndroidLogo className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <p
                              className={`text-xs ${
                                theme === "light"
                                  ? "text-gray-400"
                                  : "text-gray-600"
                              }`}
                            >
                              DOWNLOAD NOW
                            </p>
                            <p
                              className={`font-bold ${
                                theme === "light"
                                  ? "text-white"
                                  : "text-gray-900"
                              }`}
                            >
                              Install APK
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Play Store Coming Soon */}
                      <div
                        className={`p-4 rounded-2xl border ${
                          theme === "light"
                            ? "border-gray-600"
                            : "border-gray-300"
                        } opacity-60`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-500 rounded flex items-center justify-center">
                            <Play className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <p
                              className={`text-xs ${
                                theme === "light"
                                  ? "text-gray-400"
                                  : "text-gray-600"
                              }`}
                            >
                              COMING SOON
                            </p>
                            <p
                              className={`font-bold ${
                                theme === "light"
                                  ? "text-white"
                                  : "text-gray-900"
                              }`}
                            >
                              Google Play
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Feature Preview */}
                    <div className="grid grid-cols-2 gap-3 mt-6">
                      {[
                        { name: "Invoices", icon: "🧾" },
                        { name: "Customers", icon: "👥" },
                        { name: "Products", icon: "📦" },
                        { name: "Reports", icon: "📊" },
                      ].map((item) => (
                        <div
                          key={item.name}
                          className={`p-3 rounded-xl text-center ${
                            theme === "light" ? "bg-gray-700" : "bg-gray-100"
                          }`}
                        >
                          <div className="text-lg mb-1">{item.icon}</div>
                          <span
                            className={`text-xs font-medium ${
                              theme === "light"
                                ? "text-gray-300"
                                : "text-gray-600"
                            }`}
                          >
                            {item.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <motion.div
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className={`absolute -top-4 -right-4 w-20 h-20 rounded-2xl ${currentTheme.accentLight} flex items-center justify-center shadow-lg`}
              >
                <Download
                  className={`w-8 h-8 ${currentTheme.accent.replace(
                    "bg-",
                    "text-"
                  )}`}
                />
              </motion.div>

              <motion.div
                animate={{
                  y: [0, 10, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
                className={`absolute -bottom-4 -left-4 w-16 h-16 rounded-2xl bg-[#3DDC84] flex items-center justify-center shadow-lg`}
              >
                <AndroidLogo className="w-6 h-6 text-white" />
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Installation Guide */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1.0 }}
          className={`mt-16 p-8 rounded-2xl border ${currentTheme.surface} ${currentTheme.outline}`}
        >
          <h3
            className={`text-2xl font-bold mb-6 text-center ${currentTheme.text}`}
          >
            How to Install APK on Android
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: "1",
                title: "Download APK",
                description:
                  "Click the download button above to get the APK file",
              },
              {
                step: "2",
                title: "Allow Installation",
                description:
                  "Enable 'Install from unknown sources' in Settings > Security",
              },
              {
                step: "3",
                title: "Install App",
                description: "Open the downloaded APK file and tap 'Install'",
              },
              {
                step: "4",
                title: "Start Using",
                description: "Open Amdaani and start managing your billing",
              },
            ].map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                animate={isVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 1.2 + index * 0.1 }}
                className="text-center"
              >
                <div
                  className={`w-12 h-12 rounded-full ${currentTheme.accent} flex items-center justify-center mx-auto mb-4`}
                >
                  <span className="text-white font-bold text-lg">
                    {step.step}
                  </span>
                </div>
                <h4 className={`font-bold mb-2 ${currentTheme.text}`}>
                  {step.title}
                </h4>
                <p className={`text-sm ${currentTheme.textSecondary}`}>
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// Android Logo Component
function AndroidLogo({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8453 7.8508 12 7.8508s-3.5902.3931-5.1288 1.0399L4.8489 5.3877a.4161.4161 0 00-.5676-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.7593 11.0567 1 14.7893 1 18.7664c0 .3901.3159.7056.7056.7056h20.5888c.3897 0 .7056-.3155.7056-.7056 0-3.9771-1.7593-7.7097-4.8765-9.445" />
    </svg>
  );
}
