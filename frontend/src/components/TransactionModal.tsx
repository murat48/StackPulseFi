'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { stacksApi } from '@/lib/stacks/api';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  txId?: string;
  title: string;
  description?: string;
}

type TransactionStatus = 'pending' | 'success' | 'failed' | 'unknown';

export default function TransactionModal({ 
  isOpen, 
  onClose, 
  txId, 
  title, 
  description 
}: TransactionModalProps) {
  const [status, setStatus] = useState<TransactionStatus>('pending');
  const [txDetails, setTxDetails] = useState<{ 
    tx_status: string; 
    block_height?: number; 
    fee_rate: number; 
    tx_result?: { repr: string }; 
  } | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (txId && isOpen) {
      const checkStatus = async () => {
        try {
          const details = await stacksApi.getTransactionStatus(txId);
          setTxDetails(details);
          
          if (details.tx_status === 'success') {
            setStatus('success');
          } else if (details.tx_status === 'abort_by_response' || details.tx_status === 'abort_by_post_condition') {
            setStatus('failed');
            setError(details.tx_result?.repr || 'Transaction failed');
          } else {
            setStatus('pending');
            // Continue polling if pending
            setTimeout(checkStatus, 3000);
          }
        } catch (err) {
          console.error('Error checking transaction status:', err);
          setStatus('unknown');
          setError('Could not fetch transaction status');
        }
      };

      checkStatus();
    }
  }, [txId, isOpen]);

  if (!isOpen) return null;

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="text-green-600" size={48} />;
      case 'failed':
        return <AlertCircle className="text-red-600" size={48} />;
      case 'pending':
        return <Loader2 className="text-blue-600 animate-spin" size={48} />;
      default:
        return <AlertCircle className="text-yellow-600" size={48} />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'success':
        return 'Transaction Successful';
      case 'failed':
        return 'Transaction Failed';
      case 'pending':
        return 'Transaction Pending';
      default:
        return 'Transaction Status Unknown';
    }
  };

  const getStatusDescription = () => {
    switch (status) {
      case 'success':
        return 'Your transaction has been confirmed on the blockchain.';
      case 'failed':
        return `Transaction failed: ${error}`;
      case 'pending':
        return 'Please wait while your transaction is being processed...';
      default:
        return 'Unable to determine transaction status.';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {getStatusText()}
          </h3>
          
          <p className="text-gray-600 mb-4">
            {description || getStatusDescription()}
          </p>

          {txId && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-600 mb-1">Transaction ID:</p>
              <p className="text-xs font-mono text-gray-800 break-all">
                {txId}
              </p>
            </div>
          )}

          {txDetails && (
            <div className="text-left">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Transaction Details:</h4>
              <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium">{txDetails.tx_status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Block Height:</span>
                  <span className="font-medium">{txDetails.block_height || 'Pending'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fee:</span>
                  <span className="font-medium">{txDetails.fee_rate} μSTX</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {status === 'success' && (
            <button
              onClick={onClose}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Done
            </button>
          )}
          
          {status === 'failed' && (
            <button
              onClick={onClose}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Close
            </button>
          )}
          
          {status === 'pending' && (
            <button
              onClick={onClose}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Close
            </button>
          )}

          {txId && (
            <a
              href={`https://explorer.stacks.co/txid/${txId}?chain=${process.env.NEXT_PUBLIC_NETWORK || 'testnet'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
            >
              View on Explorer
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
