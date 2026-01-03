import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, FileUp, Download, Loader2, FileText, Shield, Eye, EyeOff } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { downloadBlob } from '../services/pdfService';
import FileHistoryManager from '../utils/FileHistoryManager';
import SuccessModal from '../components/SuccessModal';
import ShareModal from '../components/ShareModal';
import { useNavigate } from 'react-router-dom';

const PasswordScreen: React.FC = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isShaking, setIsShaking] = useState(false);
    const [processedFile, setProcessedFile] = useState<{
        data: Uint8Array;
        name: string;
        size: number;
    } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const getPasswordStrength = (pwd: string): { strength: string; color: string; width: string } => {
        if (pwd.length === 0) return { strength: '', color: '', width: '0%' };
        if (pwd.length < 6) return { strength: 'Weak', color: 'bg-red-500', width: '33%' };
        if (pwd.length < 10) return { strength: 'Medium', color: 'bg-yellow-500', width: '66%' };
        return { strength: 'Strong', color: 'bg-green-500', width: '100%' };
    };

    const handleProcess = async () => {
        if (!file || !password) return;

        if (mode === 'encrypt' && password !== confirmPassword) {
            setError("Protocol Error: Passwords do not match.");
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
            return;
        }

        setIsProcessing(true);

        try {
            const arrayBuffer = await file.arrayBuffer();

            // SECURITY FIX: Pass the password to the loader. 
            // If the password is wrong for an encrypted PDF, this will now throw an error.
            const pdfDoc = await PDFDocument.load(arrayBuffer, {
                password
            } as any);

            const isEncrypted = (pdfDoc as any).isEncrypted;

            if (mode === 'decrypt' && !isEncrypted) {
                throw new Error("This document is not password protected. No removal needed.");
            }

            if (mode === 'encrypt') {
                // Encrypt the PDF
                (pdfDoc as any).encrypt({
                    userPassword: password,
                    ownerPassword: password,
                    permissions: {
                        printing: 'highResolution',
                        modifying: false,
                        copying: false,
                        annotating: false,
                        fillingForms: false,
                        contentAccessibility: true,
                        documentAssembly: false,
                    },
                });
            }

            const pdfBytes = await pdfDoc.save();
            const fileName = mode === 'encrypt'
                ? `protected_${file.name}`
                : `unlocked_${file.name}`;

            // Store for sharing
            setProcessedFile({
                data: pdfBytes,
                name: fileName,
                size: pdfBytes.length
            });

            // Download
            downloadBlob(pdfBytes, fileName, 'application/pdf');

            // Add to history
            FileHistoryManager.addEntry({
                fileName,
                operation: mode === 'encrypt' ? 'watermark' : 'split', // Using existing operations
                originalSize: file.size,
                finalSize: pdfBytes.length,
                status: 'success'
            });

            // Show success modal
            setShowSuccessModal(true);

            // Reset state
            setError(null);
            setIsShaking(false);

            setFile(null);
            setPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            console.error("Security Event:", err);

            let userMsg = "Access Denied: Please check your password.";
            if (err.message?.includes("not password protected")) {
                userMsg = "This file is already open and safe. No decryption needed.";
            } else if (err.message?.includes("Invalid password")) {
                userMsg = "Verification Failed: Incorrect password for this document.";
            } else if (err.name === 'PasswordError') {
                userMsg = "Locked Protocol: Incorrect password provided.";
            }

            setError(userMsg);
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);

            FileHistoryManager.addEntry({
                fileName: `password_${mode}_failed_${file.name}`,
                operation: 'watermark',
                status: 'error'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const passwordStrength = getPasswordStrength(password);

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="min-h-screen pb-32 pt-32 max-w-2xl mx-auto px-6"
        >
            <div className="space-y-12">
                {/* Header Section */}
                <div className="space-y-3">
                    <div className="text-technical">Protocol Assets / Neural Security</div>
                    <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Protect</h1>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Apply bit-level encryption schemas to secure asset data</p>
                </div>

                {/* Mode Toggle */}
                <div className="flex gap-4 p-1 bg-black/5 dark:bg-white/5 rounded-3xl">
                    <button
                        onClick={() => {
                            setMode('encrypt');
                            setError(null);
                        }}
                        className={`flex-1 py-4 px-6 rounded-2xl font-black text-[10px] tracking-[0.2em] uppercase transition-all ${mode === 'encrypt'
                            ? 'bg-black dark:bg-white text-white dark:text-black shadow-xl ring-1 ring-black/5 dark:ring-white/5'
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                            }`}
                    >
                        Encrypt
                    </button>
                    <button
                        onClick={() => {
                            setMode('decrypt');
                            setError(null);
                        }}
                        className={`flex-1 py-4 px-6 rounded-2xl font-black text-[10px] tracking-[0.2em] uppercase transition-all ${mode === 'decrypt'
                            ? 'bg-black dark:bg-white text-white dark:text-black shadow-xl ring-1 ring-black/5 dark:ring-white/5'
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                            }`}
                    >
                        Decrypt
                    </button>
                </div>

                {/* File Upload */}
                {!file ? (
                    <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all group">
                        <motion.div
                            whileHover={{ scale: 1.1, rotate: -15 }}
                            className="w-16 h-16 bg-black dark:bg-white text-white dark:text-black rounded-3xl flex items-center justify-center shadow-2xl mb-4"
                        >
                            <Lock size={28} />
                        </motion.div>
                        <span className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Initialize Vault</span>
                        <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                    </label>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="monolith-card p-6 flex items-center gap-5 border-none shadow-xl"
                    >
                        <div className="w-16 h-16 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center shrink-0">
                            <FileText size={28} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-black uppercase tracking-tighter truncate text-gray-900 dark:text-white">{file.name}</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Awaiting Security Handshake</p>
                        </div>
                        <button
                            onClick={() => setFile(null)}
                            className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl"
                        >
                            Change
                        </button>
                    </motion.div>
                )}

                {/* Password Input */}
                {file && (
                    <div className="monolith-card p-8 bg-black/5 dark:bg-white/5 border-none space-y-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Shield size={14} className="text-black dark:text-white" />
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Security Key Definition</h4>
                            </div>
                            <motion.div
                                animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
                                className="relative"
                            >
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (error) setError(null);
                                    }}
                                    placeholder="KEY_SEQUENCE..."
                                    className={`w-full h-16 px-6 pr-14 bg-white dark:bg-black border-none rounded-2xl text-[11px] font-black uppercase tracking-widest text-gray-900 dark:text-white shadow-inner focus:outline-none focus:ring-1 transition-all ${error ? 'ring-rose-500/50' : 'focus:ring-black/20 dark:focus:ring-white/20'
                                        }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </motion.div>

                            {/* Password Strength */}
                            {mode === 'encrypt' && password && (
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                            Entropy Level
                                        </span>
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${passwordStrength.strength === 'Weak' ? 'text-rose-500' :
                                            passwordStrength.strength === 'Medium' ? 'text-amber-500' :
                                                'text-emerald-500'
                                            }`}>
                                            {passwordStrength.strength}
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: passwordStrength.width }}
                                            className={`h-full ${passwordStrength.strength === 'Weak' ? 'bg-rose-500' :
                                                    passwordStrength.strength === 'Medium' ? 'bg-amber-500' :
                                                        'bg-emerald-500'
                                                } transition-all duration-500`}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {mode === 'encrypt' && (
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Verify Key Sequence</h4>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        if (error) setError(null);
                                    }}
                                    placeholder="REPEAT_SEQUENCE..."
                                    className={`w-full h-16 px-6 bg-white dark:bg-black border-none rounded-2xl text-[11px] font-black uppercase tracking-widest text-gray-900 dark:text-white shadow-inner focus:outline-none focus:ring-1 transition-all ${error ? 'ring-rose-500/50' : 'focus:ring-black/20 dark:focus:ring-white/20'
                                        }`}
                                />
                            </div>
                        )}

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-2xl flex items-center gap-4"
                                >
                                    <Lock size={16} className="text-rose-500 shrink-0" />
                                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-relaxed">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Process Button */}
                <button
                    disabled={!file || !password || isProcessing || (mode === 'encrypt' && password !== confirmPassword)}
                    onClick={handleProcess}
                    className={`w-full py-6 rounded-[28px] font-black text-[10px] uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-3 relative overflow-hidden group shadow-2xl ${!file || !password || isProcessing || (mode === 'encrypt' && password !== confirmPassword)
                            ? 'bg-black/5 dark:bg-white/5 text-gray-300 dark:text-gray-700 cursor-not-allowed shadow-none'
                            : 'bg-black dark:bg-white text-white dark:text-black hover:brightness-110 active:scale-95'
                        }`}
                >
                    <motion.div
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear", repeatDelay: 1 }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 dark:via-black/10 to-transparent skew-x-12"
                    />
                    {isProcessing ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : (
                        <>
                            <Shield size={18} strokeWidth={3} />
                            <span>{mode === 'encrypt' ? 'Execute Encryption' : 'Execute Decryption'}</span>
                        </>
                    )}
                </button>
            </div>

            {/* Success Modal */}
            {processedFile && (
                <>
                    <SuccessModal
                        isOpen={showSuccessModal}
                        onClose={() => setShowSuccessModal(false)}
                        operation={mode === 'encrypt' ? 'Password Protection' : 'Password Removal'}
                        fileName={processedFile.name}
                        originalSize={file?.size}
                        finalSize={processedFile.size}
                        onViewFiles={() => {
                            setShowSuccessModal(false);
                            navigate('/my-files');
                        }}
                        onShare={() => {
                            setShowSuccessModal(false);
                            setShowShareModal(true);
                        }}
                    />

                    <ShareModal
                        isOpen={showShareModal}
                        onClose={() => setShowShareModal(false)}
                        fileName={processedFile.name}
                        fileData={processedFile.data}
                        fileType="application/pdf"
                    />
                </>
            )}
        </motion.div>
    );
};

export default PasswordScreen;
