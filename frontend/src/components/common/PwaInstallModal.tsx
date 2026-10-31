import React from 'react';
import { Download, Share2, PlusSquare, Smartphone, CheckCircle, Sparkles } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { usePwaInstall } from '../../hooks/usePwaInstall';

export interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, triggerInstall, hasNativePrompt } = usePwaInstall();

  const handleInstallClick = async () => {
    const success = await triggerInstall();
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Install LIFORA"
      description="Experience LIFORA as a native mobile application on your device"
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* App Hero Badge */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="w-14 h-14 rounded-2xl bg-[#042420] border border-emerald-500/30 flex items-center justify-center shrink-0 p-1.5 shadow-sm shadow-emerald-500/20">
            <img src="/logo.png" alt="LIFORA" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-zinc-100 text-sm">LIFORA</h4>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PWA v2.0
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Personal life operating system with instant launch and offline support
            </p>
          </div>
        </div>

        {/* State 1: Already Installed */}
        {isInstalled && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-xs font-semibold text-emerald-300">App Already Installed</p>
            <p className="text-xs text-zinc-400">
              LIFORA is already installed and running in standalone display mode on this device.
            </p>
          </div>
        )}

        {/* State 2: iOS Safari Instructions */}
        {!isInstalled && isIOS && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-300 font-medium">To install on your iPhone or iPad:</p>
            <ol className="space-y-2.5 text-xs text-zinc-400">
              <li className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800">
                <div className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-200 flex items-center justify-center shrink-0 font-bold text-[11px]">
                  1
                </div>
                <div className="flex-1">
                  <span>Tap the <strong>Share</strong> button at the bottom of Safari.</span>
                  <div className="mt-1 flex items-center gap-1.5 text-zinc-300">
                    <Share2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px] text-zinc-500">Safari action bar</span>
                  </div>
                </div>
              </li>

              <li className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800">
                <div className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-200 flex items-center justify-center shrink-0 font-bold text-[11px]">
                  2
                </div>
                <div className="flex-1">
                  <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                  <div className="mt-1 flex items-center gap-1.5 text-zinc-300">
                    <PlusSquare className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px] text-zinc-500">Add to Home Screen option</span>
                  </div>
                </div>
              </li>

              <li className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800">
                <div className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-200 flex items-center justify-center shrink-0 font-bold text-[11px]">
                  3
                </div>
                <div className="flex-1">
                  <span>Tap <strong>Add</strong> in the top-right corner to finish.</span>
                </div>
              </li>
            </ol>
          </div>
        )}

        {/* State 3: Chrome / Android Direct Install */}
        {!isInstalled && !isIOS && hasNativePrompt && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-300">
              Install LIFORA directly to your home screen or desktop application launcher for an uninterrupted full-screen experience.
            </p>
            <Button
              variant="primary"
              size="md"
              className="w-full justify-center"
              onClick={handleInstallClick}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Install Application Now
            </Button>
          </div>
        )}

        {/* State 4: Browser doesn't support beforeinstallprompt and isn't iOS (e.g. desktop Firefox or already installed in browser) */}
        {!isInstalled && !isIOS && !hasNativePrompt && (
          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2 text-xs text-zinc-400">
            <p className="text-zinc-300 font-medium">Installing on your browser:</p>
            <p>
              Open your browser menu (usually the three dots or install icon in the URL bar) and select <strong>&quot;Install LIFORA&quot;</strong> or <strong>&quot;Add to Home Screen&quot;</strong>.
            </p>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-zinc-800">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
