import React, { useState, useEffect } from 'react';
import { useSync } from '../../context/SyncContext';
import { db } from '../../offline/db';
import { Button } from './Button';
import { Badge } from './Badge';
import {
  X,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Clock,
  ShieldCheck,
  FileText
} from 'lucide-react';

export function SyncDrawer({ isOpen, onClose }) {
  const { connState, queueCounts, isSyncing, triggerSync, retryFailed, resolveConflict } = useSync();
  const [activeTab, setActiveTab] = useState('PENDING');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTabItems = async () => {
    setLoading(true);
    try {
      if (activeTab === 'PENDING') {
        const list = await db.sync_queue.where('status').equals('PENDING').toArray();
        setItems(list);
      } else if (activeTab === 'FAILED') {
        const list = await db.sync_queue.where('status').equals('FAILED').toArray();
        setItems(list);
      } else if (activeTab === 'CONFLICT') {
        const list = await db.sync_queue.where('status').equals('CONFLICT').toArray();
        setItems(list);
      } else if (activeTab === 'SYNCED') {
        const list = await db.sync_queue.where('status').equals('SYNCED').reverse().limit(30).toArray();
        setItems(list);
      }
    } catch (e) {
      console.error('Failed to load drawer items:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTabItems();
    }
  }, [isOpen, activeTab, queueCounts]);

  if (!isOpen) return null;

  const isReachable = connState === 'ONLINE_REACHABLE';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-900 text-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-5 h-5 text-teal-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <h2 className="text-base font-extrabold text-white">Synchronization Hub</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Connectivity Pill */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold">Network State:</span>
            {connState === 'ONLINE_REACHABLE' && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-full font-bold">
                <Wifi className="w-3.5 h-3.5" /> Online & Reachable
              </span>
            )}
            {connState === 'ONLINE_UNREACHABLE' && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-full font-bold">
                <WifiOff className="w-3.5 h-3.5" /> Server Unreachable
              </span>
            )}
            {connState === 'OFFLINE' && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/20 text-red-300 rounded-full font-bold">
                <WifiOff className="w-3.5 h-3.5" /> Offline Mode
              </span>
            )}
          </div>

          {/* Controls Bar */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="primary"
              onClick={triggerSync}
              disabled={isSyncing || !isReachable}
              icon={RefreshCw}
              className="flex-1 text-xs py-2 bg-teal-600 hover:bg-teal-700"
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
            {queueCounts.failed > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={retryFailed}
                disabled={isSyncing || !isReachable}
                icon={RotateCcw}
                className="text-xs py-2 text-white border-slate-700 hover:bg-slate-800"
              >
                Retry Failed ({queueCounts.failed})
              </Button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 text-xs overflow-x-auto">
          {[
            { key: 'PENDING', label: `Pending (${queueCounts.pending})` },
            { key: 'FAILED', label: `Failed (${queueCounts.failed})` },
            { key: 'CONFLICT', label: `Conflicts (${queueCounts.conflict})` },
            { key: 'SYNCED', label: `Synced (${queueCounts.synced})` }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition-colors flex-1 text-center ${
                activeTab === tab.key
                  ? 'border-teal-600 text-teal-800 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Drawer Body Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Loading queue items...</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center space-y-2 text-slate-400">
              <CheckCircle className="w-8 h-8 mx-auto text-slate-300" />
              <p>No records in this queue category.</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.client_uuid} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    #{item.client_uuid.substring(0, 8)}
                  </span>
                  <Badge variant={item.priority === 'CRITICAL' ? 'critical' : item.priority === 'HIGH' ? 'warning' : 'info'} size="sm">
                    {item.entity_type?.replace(/_/g, ' ')}
                  </Badge>
                </div>

                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <p>Operation: <strong className="text-slate-800">{item.operation}</strong></p>
                  <p className="font-mono text-slate-400">Created: {new Date(item.created_at).toLocaleTimeString()}</p>
                  {item.last_error && (
                    <p className="text-red-700 font-semibold bg-red-50 p-1.5 rounded border border-red-100 mt-1">
                      Error: {item.last_error}
                    </p>
                  )}
                </div>

                {/* Conflict Resolution Buttons */}
                {activeTab === 'CONFLICT' && (
                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveConflict(item.client_uuid, 'USE_SERVER')}
                    >
                      Use Server Data
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => resolveConflict(item.client_uuid, 'FORCE_LOCAL')}
                    >
                      Keep Local Payload
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 text-center">
          RuralCare AI Unified Synchronization Engine • Dexie IndexedDB v3
        </div>
      </div>
    </div>
  );
}
