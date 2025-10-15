'use client';

import { useState } from 'react';
import { X, Clock, Users, Sparkles, TrendingUp, Shield, Gift, DollarSign } from 'lucide-react';
import { parseSBTC } from '@/lib/stacks/config';
import { createRetirementFund, createEducationFund } from '@/lib/stacks/wallet';
import { FinishedTxData } from '@stacks/connect';

interface CreateFundModalProps {
    isOpen: boolean;
    onClose: () => void;
    fundType: 'retirement' | 'education';
    onSuccess?: () => void;
}

export default function CreateFundModal({ isOpen, onClose, fundType, onSuccess }: CreateFundModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Retirement Fund Form
    const [retirementForm, setRetirementForm] = useState({
        initialDeposit: '10',
        lockDurationYears: '10'
    });

    // Education Fund Form
    const [educationForm, setEducationForm] = useState({
        initialDeposit: '10',
        guardian: '',
        lockDurationYears: '10',
        goalAmount: '50',
        fundName: ''
    });

    const getApyRate = (years: number) => {
        if (years >= 20) return '20%';
        if (years >= 15) return '16%';
        if (years >= 10) return '12%';
        return '8%';
    };

    const handleCreateRetirement = async () => {
        try {
            setIsLoading(true);
            setMessage({ type: '', text: '' });

            const deposit = BigInt(parseSBTC(retirementForm.initialDeposit));
            const years = parseInt(retirementForm.lockDurationYears);

            if (years < 5) {
                setMessage({ type: 'error', text: 'Minimum lock duration is 5 years' });
                setIsLoading(false);
                return;
            }

            await createRetirementFund(
                deposit,
                years,
                (data: FinishedTxData) => {
                    setMessage({
                        type: 'success',
                        text: `Retirement Fund created successfully! Transaction: ${data.txId.slice(0, 8)}...`
                    });
                    setIsLoading(false);
                    setTimeout(() => {
                        onClose();
                        if (onSuccess) onSuccess();
                    }, 2000);
                },
                () => {
                    setMessage({ type: 'error', text: 'Transaction cancelled' });
                    setIsLoading(false);
                }
            );
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to create retirement fund' });
            setIsLoading(false);
        }
    };

    const handleCreateEducation = async () => {
        try {
            setIsLoading(true);
            setMessage({ type: '', text: '' });

            const deposit = BigInt(parseSBTC(educationForm.initialDeposit));
            const years = parseInt(educationForm.lockDurationYears);
            const goal = BigInt(parseSBTC(educationForm.goalAmount));

            if (years < 5) {
                setMessage({ type: 'error', text: 'Minimum lock duration is 5 years' });
                setIsLoading(false);
                return;
            }

            if (!educationForm.guardian) {
                setMessage({ type: 'error', text: 'Guardian address is required' });
                setIsLoading(false);
                return;
            }

            if (!educationForm.fundName) {
                setMessage({ type: 'error', text: 'Fund name is required' });
                setIsLoading(false);
                return;
            }

            await createEducationFund(
                deposit,
                educationForm.guardian,
                years,
                goal,
                educationForm.fundName,
                (data: FinishedTxData) => {
                    setMessage({
                        type: 'success',
                        text: `Education Fund "${educationForm.fundName}" created! Transaction: ${data.txId.slice(0, 8)}...`
                    });
                    setIsLoading(false);
                    setTimeout(() => {
                        onClose();
                        if (onSuccess) onSuccess();
                    }, 2000);
                },
                () => {
                    setMessage({ type: 'error', text: 'Transaction cancelled' });
                    setIsLoading(false);
                }
            );
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to create fund' });
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const isRetirement = fundType === 'retirement';
    const currentForm = isRetirement ? retirementForm : educationForm;
    const lockYears = parseInt(isRetirement ? retirementForm.lockDurationYears : educationForm.lockDurationYears);
    const apyRate = getApyRate(lockYears);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className={`p-6 border-b border-white/10 ${isRetirement ? 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10' : 'bg-gradient-to-r from-purple-500/10 to-pink-500/10'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {isRetirement ? (
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                    <Clock className="text-white" size={24} />
                                </div>
                            ) : (
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                    <Users className="text-white" size={24} />
                                </div>
                            )}
                            <div>
                                <h2 className="text-2xl font-bold text-white">
                                    {isRetirement ? 'Create Retirement Fund' : 'Create Education Fund'}
                                </h2>
                                <p className="text-white/70 text-sm">
                                    {isRetirement
                                        ? 'Build your future with sBTC yields'
                                        : 'Save for education with guaranteed growth'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                        >
                            <X className="text-white" size={20} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* APY Preview */}
                    <div className={`rounded-2xl p-6 ${isRetirement ? 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30' : 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30'}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-white/70 text-sm mb-1">Estimated APY</div>
                                <div className="text-4xl font-bold text-white flex items-center gap-2">
                                    {apyRate}
                                    <Sparkles className="text-yellow-400" size={24} />
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-white/70 text-sm mb-1">Lock Duration</div>
                                <div className="text-2xl font-bold text-white">{lockYears} years</div>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="text-xs text-white/60 space-y-1">
                                <div>• 5-9 years: 8% APY</div>
                                <div>• 10-14 years: 12% APY</div>
                                <div>• 15-19 years: 16% APY</div>
                                <div>• 20+ years: 20% APY</div>
                            </div>
                        </div>
                    </div>

                    {/* Form Fields */}
                    {isRetirement ? (
                        <div className="space-y-4">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                                    <DollarSign size={16} />
                                    Initial Deposit (sBTC)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    value={retirementForm.initialDeposit}
                                    onChange={(e) => setRetirementForm(prev => ({ ...prev, initialDeposit: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="10.0"
                                />
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                                    <Clock size={16} />
                                    Lock Duration (Years)
                                </label>
                                <select
                                    value={retirementForm.lockDurationYears}
                                    onChange={(e) => setRetirementForm(prev => ({ ...prev, lockDurationYears: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 textcolor-black"
                                >
                                    <option className="text-black" value="5">5 years (8% APY)</option>
                                    <option className="text-black" value="10">10 years (12% APY)</option>
                                    <option className="text-black" value="15">15 years (16% APY)</option>
                                    <option className="text-black" value="20">20 years (20% APY)</option>
                                    <option className="text-black" value="25">25 years (20% APY)</option>
                                </select>
                            </div>

                            {/* Features */}
                            <div className="rounded-xl bg-white/5 p-4 space-y-2">
                                <div className="flex items-center gap-2 text-sm text-white/70">
                                    <Shield className="text-green-400" size={16} />
                                    <span>Secured with sBTC (Bitcoin-backed)</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-white/70">
                                    <TrendingUp className="text-blue-400" size={16} />
                                    <span>Automatic yield compounding</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-white/70">
                                    <Gift className="text-purple-400" size={16} />
                                    <span>Early withdrawal available (20% fee)</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Fund Name
                                </label>
                                <input
                                    type="text"
                                    maxLength={50}
                                    value={educationForm.fundName}
                                    onChange={(e) => setEducationForm(prev => ({ ...prev, fundName: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="e.g., Sarah's College Fund"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Guardian Address
                                </label>
                                <input
                                    type="text"
                                    value={educationForm.guardian}
                                    onChange={(e) => setEducationForm(prev => ({ ...prev, guardian: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                                    placeholder="ST..."
                                />
                                <p className="text-xs text-white/50 mt-1">Person who can withdraw after unlock period</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Initial Deposit (sBTC)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        value={educationForm.initialDeposit}
                                        onChange={(e) => setEducationForm(prev => ({ ...prev, initialDeposit: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="10.0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Goal Amount (sBTC)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        value={educationForm.goalAmount}
                                        onChange={(e) => setEducationForm(prev => ({ ...prev, goalAmount: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="50.0"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Lock Duration (Years)
                                </label>
                                <select
                                    value={educationForm.lockDurationYears}
                                    onChange={(e) => setEducationForm(prev => ({ ...prev, lockDurationYears: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option className="text-black" value="5">5 years (8% APY)</option>
                                    <option className="text-black" value="10">10 years (12% APY)</option>
                                    <option className="text-black" value="15">15 years (16% APY)</option>
                                    <option className="text-black" value="18">18 years (16% APY)</option>
                                    <option className="text-black" value="20">20 years (20% APY)</option>
                                </select>
                            </div>

                            {/* Features */}
                            <div className="rounded-xl bg-white/5 p-4 space-y-2">
                                <div className="flex items-center gap-2 text-sm text-white/70">
                                    <Shield className="text-green-400" size={16} />
                                    <span>Guardian-controlled for safety</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-white/70">
                                    <TrendingUp className="text-blue-400" size={16} />
                                    <span>Anyone can contribute to the fund</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-white/70">
                                    <Gift className="text-purple-400" size={16} />
                                    <span>Goal tracking with progress bar</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Message */}
                    {message.text && (
                        <div className={`rounded-xl p-4 ${message.type === 'success' ? 'bg-green-500/20 border border-green-500/30 text-green-400' : 'bg-red-500/20 border border-red-500/30 text-red-400'}`}>
                            {message.text}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={isRetirement ? handleCreateRetirement : handleCreateEducation}
                            disabled={isLoading}
                            className={`flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-50 ${isRetirement ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600' : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'}`}
                        >
                            {isLoading ? 'Creating...' : `Create ${isRetirement ? 'Retirement' : 'Education'} Fund`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
