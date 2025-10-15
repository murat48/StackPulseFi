'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Shield, AlertTriangle, ExternalLink } from 'lucide-react';

interface RiskAnalysis {
  risk_score: number;
  risk_category: string;
  risk_factors: string[];
  warnings: string[];
  recommendations: string[];
}

interface AIAnalysis {
  risk_score: number;
  risk_level: string;
  strategy: string;
  insights: string[];
  strengths: string[];
  concerns: string[];
  recommended_allocation: string;
  timestamp?: string;
  error?: boolean;
}

interface Protocol {
  id: string;
  name: string;
  protocol: string;
  type: string;
  tvl: number;
  apy: number;
  liquidity: number;
  token: string;
  is_active: boolean;
  url: string;
  audit_status: string;
  chain: string;
  volume_24h?: number;
  risk_analysis?: RiskAnalysis;
  ai_analysis?: AIAnalysis;
}

interface ProtocolCardProps {
  protocol: Protocol;
  compareMode?: boolean;
  isSelected?: boolean;
  onToggleCompare?: () => void;
}

export default function ProtocolCard({ protocol, compareMode = false, isSelected = false, onToggleCompare }: ProtocolCardProps) {
  const { ai_analysis } = protocol;
  
  const getRiskColor = (riskScore: number) => {
    if (riskScore < 30) return 'text-green-600 bg-green-50';
    if (riskScore < 60) return 'text-yellow-600 bg-yellow-50';
    if (riskScore < 80) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'very_high':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(2)}K`;
    }
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow p-6 border ${isSelected ? 'border-blue-500' : 'border-gray-200'}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{protocol.name}</h3>
          <p className="text-sm text-gray-600">{protocol.protocol}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs font-semibold rounded ${protocol.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
            {protocol.is_active ? 'Active' : 'Inactive'}
          </span>
          <a 
            href={protocol.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">TVL</p>
          <p className="text-lg font-bold text-gray-900">{formatNumber(protocol.tvl)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">APY</p>
          <div className="flex items-center gap-1">
            <p className="text-lg font-bold text-gray-900">{protocol.apy.toFixed(2)}%</p>
            {protocol.apy > 10 ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Type</p>
          <p className="text-sm font-medium text-gray-900 capitalize">{protocol.type}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Token</p>
          <p className="text-sm font-medium text-gray-900">{protocol.token}</p>
        </div>
      </div>

      {/* Risk Analysis Section */}
      {protocol.risk_analysis && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Risk Analysis
            </h4>
            <span className={`px-3 py-1 text-xs font-bold rounded-full border-2 ${
              protocol.risk_analysis.risk_category === 'Low Risk' ? 'bg-green-50 text-green-700 border-green-300' :
              protocol.risk_analysis.risk_category === 'Medium Risk' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
              protocol.risk_analysis.risk_category === 'High Risk' ? 'bg-orange-50 text-orange-700 border-orange-300' :
              'bg-red-50 text-red-700 border-red-300'
            }`}>
              {protocol.risk_analysis.risk_category}
            </span>
          </div>
          
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600">Risk Score</span>
              <span className="text-xs font-semibold text-gray-900">{protocol.risk_analysis.risk_score}/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  protocol.risk_analysis.risk_score < 30 ? 'bg-green-500' :
                  protocol.risk_analysis.risk_score < 60 ? 'bg-yellow-500' :
                  protocol.risk_analysis.risk_score < 80 ? 'bg-orange-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${protocol.risk_analysis.risk_score}%` }}
              />
            </div>
          </div>

          {protocol.risk_analysis.warnings && protocol.risk_analysis.warnings.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-xs font-semibold text-red-900">Warnings</span>
              </div>
              <ul className="space-y-1">
                {protocol.risk_analysis.warnings.slice(0, 2).map((warning, idx) => (
                  <li key={idx} className="text-xs text-red-700 flex items-start gap-1">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {protocol.risk_analysis.risk_factors && protocol.risk_analysis.risk_factors.length > 0 && (
            <div className="mb-2">
              <span className="text-xs font-semibold text-gray-700">Risk Factors:</span>
              <ul className="mt-1 space-y-1">
                {protocol.risk_analysis.risk_factors.slice(0, 3).map((factor, idx) => (
                  <li key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pt-2 border-t">
            <span>Audit: <span className={`font-semibold ${protocol.audit_status === 'audited' ? 'text-green-600' : 'text-orange-600'}`}>{protocol.audit_status}</span></span>
          </div>
        </div>
      )}

      {/* AI Analysis Section */}
      {ai_analysis && !ai_analysis.error && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              🤖 AI Analysis
            </h4>
            <span className={`px-2 py-1 text-xs font-semibold rounded border ${getRiskBadgeColor(ai_analysis.risk_level)}`}>
              {ai_analysis.risk_level?.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          {/* Risk Score */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-600">Risk Score</span>
              <span className={`text-xs font-bold ${getRiskColor(ai_analysis.risk_score).split(' ')[0]}`}>
                {ai_analysis.risk_score}/100
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${getRiskColor(ai_analysis.risk_score).split(' ')[1]}`}
                style={{ width: `${ai_analysis.risk_score}%` }}
              />
            </div>
          </div>

          {/* Strategy */}
          <div className="mb-3 p-3 bg-blue-50 rounded">
            <p className="text-xs font-semibold text-blue-900 mb-1">Strategy</p>
            <p className="text-xs text-blue-800">{ai_analysis.strategy}</p>
          </div>

          {/* Top Insights */}
          {ai_analysis.insights && ai_analysis.insights.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-900">Key Insights</p>
              {ai_analysis.insights.slice(0, 2).map((insight, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-blue-600 mt-1.5" />
                  <p className="text-xs text-gray-700 flex-1">{insight}</p>
                </div>
              ))}
            </div>
          )}

          {/* Strengths and Concerns */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {ai_analysis.strengths && ai_analysis.strengths.length > 0 && (
              <div className="p-2 bg-green-50 rounded">
                <div className="flex items-center gap-1 mb-1">
                  <Shield className="w-3 h-3 text-green-600" />
                  <p className="text-xs font-semibold text-green-900">Strengths</p>
                </div>
                <p className="text-xs text-green-800">{ai_analysis.strengths[0]}</p>
              </div>
            )}
            {ai_analysis.concerns && ai_analysis.concerns.length > 0 && (
              <div className="p-2 bg-red-50 rounded">
                <div className="flex items-center gap-1 mb-1">
                  <AlertTriangle className="w-3 h-3 text-red-600" />
                  <p className="text-xs font-semibold text-red-900">Concerns</p>
                </div>
                <p className="text-xs text-red-800">{ai_analysis.concerns[0]}</p>
              </div>
            )}
          </div>

          {/* Recommended Allocation */}
          {ai_analysis.recommended_allocation && (
            <div className="mt-3 p-2 bg-purple-50 rounded">
              <p className="text-xs">
                <span className="font-semibold text-purple-900">Recommended: </span>
                <span className="text-purple-800">{ai_analysis.recommended_allocation}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Audit Status */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-600">
          Audit: <span className="font-semibold text-gray-900 capitalize">{protocol.audit_status}</span>
        </span>
        {onToggleCompare && (
          <button
            onClick={onToggleCompare}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              isSelected
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isSelected ? 'Selected' : 'Compare'}
          </button>
        )}
      </div>
    </div>
  );
}

