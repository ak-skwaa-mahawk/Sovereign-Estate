import React, { useState, useEffect, useCallback } from 'react';
import { 
  HardDrive, 
  Table, 
  Mail, 
  FileText, 
  RefreshCw, 
  ExternalLink, 
  Send, 
  Plus, 
  Check, 
  AlertCircle, 
  X, 
  Search,
  Lock,
  Download,
  Share2,
  Inbox
} from 'lucide-react';
import { ConfirmationDialog } from './ConfirmationDialog';

interface WorkspaceHubProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  onSignInRequest: () => void;
  hullIntegrity: number;
  resonance: number;
  computedStressZones: Array<{ id: string; name: string; stress: number; locked?: boolean }>;
  briefingNarrative: string;
  addLog: (level: 'INFO' | 'ALERT' | 'REPAIR' | 'SUCCESS' | 'WARN', message: string) => void;
  showBanner: (msg: string) => void;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
}

interface GmailMessage {
  id: string;
  threadId: string;
  snippet?: string;
  subject?: string;
  from?: string;
  date?: string;
}

export const WorkspaceHub: React.FC<WorkspaceHubProps> = ({
  isOpen,
  onClose,
  accessToken,
  onSignInRequest,
  hullIntegrity,
  resonance,
  computedStressZones,
  briefingNarrative,
  addLog,
  showBanner
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'drive' | 'sheets' | 'gmail' | 'docs'>('drive');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Drive state
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveSearch, setDriveSearch] = useState<string>('');

  // Gmail state
  const [gmailMessages, setGmailMessages] = useState<GmailMessage[]>([]);
  const [emailRecipient, setEmailRecipient] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('FPT-Ω Vessel Operational Alert & Bridge Report');
  const [emailBody, setEmailBody] = useState<string>('');

  // Confirmation modal states for mutating API calls
  const [pendingAction, setPendingAction] = useState<{
    type: 'drive_export' | 'sheet_create' | 'gmail_send' | 'doc_create';
    title: string;
    description: string;
    payload?: any;
  } | null>(null);

  // Auto-fill default email body
  useEffect(() => {
    const highStress = computedStressZones.filter(z => z.stress > 0.8).length;
    const bodyText = `SOVEREIGN MANIFOL - BRIDGE OPERATIONAL BRIEFING
------------------------------------------------
Timestamp: ${new Date().toLocaleString()}
Hull Integrity: ${hullIntegrity.toFixed(1)}%
Quantum Resonance: ${resonance.toFixed(2)}%
Critical Stress Nodes (>80%): ${highStress} / ${computedStressZones.length}

BRIEFING NARRATIVE:
${briefingNarrative}

This is an automated bridge telemetry report sent via integrated Workspace Gmail Service.`;
    setEmailBody(bodyText);
  }, [hullIntegrity, resonance, computedStressZones, briefingNarrative]);

  // Fetch Drive Files
  const fetchDriveFiles = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const query = driveSearch ? `name contains '${driveSearch.replace(/'/g, "\\'")}' and trashed = false` : 'trashed = false';
      const url = `https://www.googleapis.com/drive/v3/files?pageSize=15&fields=files(id,name,mimeType,modifiedTime,webViewLink)&q=${encodeURIComponent(query)}&orderBy=modifiedTime desc`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) {
        throw new Error(`Drive API returned ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setDriveFiles(data.files || []);
    } catch (err: any) {
      console.error('Fetch Drive Files Error:', err);
      setError(err.message || 'Failed to fetch files from Google Drive');
    } finally {
      setLoading(false);
    }
  }, [accessToken, driveSearch]);

  // Fetch Gmail Inbox Messages
  const fetchGmailMessages = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const listRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!listRes.ok) throw new Error(`Gmail API returned ${listRes.status}`);
      const listData = await listRes.json();
      
      if (!listData.messages || listData.messages.length === 0) {
        setGmailMessages([]);
        setLoading(false);
        return;
      }

      // Fetch details for each message
      const msgPromises = listData.messages.map(async (m: { id: string; threadId: string }) => {
        const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!msgRes.ok) return null;
        const msgData = await msgRes.json();
        
        const headers = msgData.payload?.headers || [];
        const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
        const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown';
        const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';

        return {
          id: msgData.id,
          threadId: msgData.threadId,
          snippet: msgData.snippet,
          subject,
          from,
          date
        };
      });

      const resolvedMsgs = (await Promise.all(msgPromises)).filter(Boolean) as GmailMessage[];
      setGmailMessages(resolvedMsgs);
    } catch (err: any) {
      console.error('Fetch Gmail Error:', err);
      setError(err.message || 'Failed to fetch messages from Gmail');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Trigger tab data fetch
  useEffect(() => {
    if (!isOpen || !accessToken) return;
    if (activeSubTab === 'drive') {
      fetchDriveFiles();
    } else if (activeSubTab === 'gmail') {
      fetchGmailMessages();
    }
  }, [isOpen, accessToken, activeSubTab, fetchDriveFiles, fetchGmailMessages]);

  // Execution functions after user confirmation
  const handleConfirmAction = async () => {
    if (!pendingAction || !accessToken) return;
    setLoading(true);
    const { type, payload } = pendingAction;
    setPendingAction(null);

    try {
      if (type === 'drive_export') {
        const fileContent = `================================================
  SOVEREIGN MANIFOL - BRIDGE TELEMETRY LOG
================================================
Export Date: ${new Date().toISOString()}
Hull Integrity: ${hullIntegrity}%
Quantum Resonance: ${resonance}%

[DIAGNOSTIC NODES]
${computedStressZones.map(z => `- ${z.name}: ${(z.stress * 100).toFixed(1)}% stress ${z.locked ? '[LOCKED]' : ''}`).join('\n')}

[NARRATIVE]
${briefingNarrative}
`;
        const metadata = {
          name: `Sovereign_Bridge_Telemetry_${Date.now()}.txt`,
          mimeType: 'text/plain'
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([fileContent], { type: 'text/plain' }));

        const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: form
        });

        if (!uploadRes.ok) throw new Error(`Drive Upload Error: ${uploadRes.status}`);
        const newFile = await uploadRes.json();

        addLog('SUCCESS', `Google Drive Export: Saved bridge telemetry log (File ID: ${newFile.id})`);
        showBanner(`📁 DRIVE EXPORT COMPLETE: Saved report to Google Drive!`);
        fetchDriveFiles();

      } else if (type === 'sheet_create') {
        const spreadsheetData = {
          properties: {
            title: `Sovereign_Manifol_Manifest_${new Date().toISOString().slice(0, 10)}`
          },
          sheets: [
            {
              properties: { title: 'Diagnostic Matrix' },
              data: [
                {
                  startRow: 0,
                  startColumn: 0,
                  rowData: [
                    {
                      values: [
                        { userEnteredValue: { stringValue: 'Node ID' } },
                        { userEnteredValue: { stringValue: 'Section Name' } },
                        { userEnteredValue: { stringValue: 'Stress Ratio' } },
                        { userEnteredValue: { stringValue: 'Locked Status' } }
                      ]
                    },
                    ...computedStressZones.map(z => ({
                      values: [
                        { userEnteredValue: { stringValue: z.id } },
                        { userEnteredValue: { stringValue: z.name } },
                        { userEnteredValue: { numberValue: Number((z.stress * 100).toFixed(1)) } },
                        { userEnteredValue: { stringValue: z.locked ? 'LOCKED' : 'ACTIVE' } }
                      ]
                    }))
                  ]
                }
              ]
            }
          ]
        };

        const sheetRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(spreadsheetData)
        });

        if (!sheetRes.ok) throw new Error(`Sheets API Error: ${sheetRes.status}`);
        const sheetData = await sheetRes.json();

        addLog('SUCCESS', `Google Sheets Export: Created spreadsheet "${sheetData.properties?.title}" (${sheetData.spreadsheetId})`);
        showBanner(`📊 GOOGLE SHEETS EXPORT: Created new spreadsheet in Drive!`);
        if (sheetData.spreadsheetUrl) {
          window.open(sheetData.spreadsheetUrl, '_blank');
        }

      } else if (type === 'gmail_send') {
        const emailTo = payload.emailRecipient || 'commander@sovereignmanifol.org';
        const rawEmail = [
          `To: ${emailTo}`,
          'Content-Type: text/plain; charset=utf-8',
          'MIME-Version: 1.0',
          `Subject: ${payload.emailSubject}`,
          '',
          payload.emailBody
        ].join('\r\n');

        // Base64Url encode
        const encodedEmail = btoa(unescape(encodeURIComponent(rawEmail)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ raw: encodedEmail })
        });

        if (!sendRes.ok) throw new Error(`Gmail API Error: ${sendRes.status}`);
        
        addLog('SUCCESS', `Gmail Integration: Sent bridge operational alert to ${emailTo}`);
        showBanner(`✉️ GMAIL SENT: Bridge status dispatch sent successfully!`);
        fetchGmailMessages();

      } else if (type === 'doc_create') {
        // Step 1: Create Document
        const createDocRes = await fetch('https://docs.googleapis.com/v1/documents', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: `Sovereign_Briefing_Report_${new Date().toISOString().slice(0, 10)}`
          })
        });

        if (!createDocRes.ok) throw new Error(`Docs API Error: ${createDocRes.status}`);
        const docData = await createDocRes.json();
        const docId = docData.documentId;

        // Step 2: Insert text content via batchUpdate
        const docText = `SOVEREIGN MANIFOL - OFFICIAL BRIEFING DOCUMENT\n` +
          `Date: ${new Date().toLocaleString()}\n` +
          `Hull Integrity: ${hullIntegrity.toFixed(1)}%\n` +
          `Quantum Resonance: ${resonance.toFixed(2)}%\n\n` +
          `OPERATIONAL NARRATIVE:\n${briefingNarrative}\n\n` +
          `CRITICAL DIAGNOSTICS:\n` +
          computedStressZones.map(z => `• ${z.name}: ${(z.stress * 100).toFixed(1)}% Strain [${z.locked ? 'LOCKED' : 'ACTIVE'}]`).join('\n');

        await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: [
              {
                insertText: {
                  location: { index: 1 },
                  text: docText
                }
              }
            ]
          })
        });

        addLog('SUCCESS', `Google Docs Export: Created document "${docData.title}" (Doc ID: ${docId})`);
        showBanner(`📄 GOOGLE DOCS CREATED: Created new briefing document!`);
        window.open(`https://docs.google.com/document/d/${docId}/edit`, '_blank');
      }

    } catch (err: any) {
      console.error('Workspace Action Error:', err);
      setError(err.message || 'Workspace operation failed');
      addLog('ALERT', `Workspace Action Failed: ${err.message}`);
      showBanner(`❌ WORKSPACE ACTION FAILED: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-sans text-slate-200">
      <div className="bg-[#0b0e14] border border-amber-500/30 rounded-md shadow-[0_0_30px_rgba(245,158,11,0.15)] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-black/60 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-sm">
              <Share2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-amber-400 flex items-center gap-2">
                Google Workspace Deck
                <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-mono">
                  ACTIVE SYNC
                </span>
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">
                Direct integration with Google Drive, Sheets, Gmail, & Google Docs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Check Banner */}
        {!accessToken ? (
          <div className="p-8 flex flex-col items-center justify-center text-center gap-4 bg-slate-950/60 my-auto">
            <Lock className="w-12 h-12 text-amber-500/80 animate-pulse" />
            <div className="max-w-md space-y-2">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-amber-300">
                Google Workspace Access Required
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                Connect your Google account with permission to access Google Drive, Google Sheets, Gmail, and Google Docs to export reports, save telemetry spreadsheets, and dispatch status alerts.
              </p>
            </div>
            <button
              onClick={onSignInRequest}
              className="mt-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold text-xs uppercase tracking-wider rounded transition-all cursor-pointer shadow-lg flex items-center gap-2"
            >
              <span>Connect Google Workspace</span>
            </button>
          </div>
        ) : (
          <>
            {/* Sub-navigation tabs */}
            <div className="flex border-b border-white/10 bg-black/40 px-4 pt-2 gap-1 font-mono text-xs">
              <button
                onClick={() => setActiveSubTab('drive')}
                className={`px-4 py-2 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                  activeSubTab === 'drive'
                    ? 'border-amber-500 text-amber-400 bg-amber-500/10 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span>Google Drive</span>
              </button>

              <button
                onClick={() => setActiveSubTab('sheets')}
                className={`px-4 py-2 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                  activeSubTab === 'sheets'
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Table className="w-3.5 h-3.5 text-emerald-400" />
                <span>Google Sheets</span>
              </button>

              <button
                onClick={() => setActiveSubTab('gmail')}
                className={`px-4 py-2 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                  activeSubTab === 'gmail'
                    ? 'border-red-500 text-red-400 bg-red-500/10 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-red-400" />
                <span>Gmail Services</span>
              </button>

              <button
                onClick={() => setActiveSubTab('docs')}
                className={`px-4 py-2 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                  activeSubTab === 'docs'
                    ? 'border-blue-500 text-blue-400 bg-blue-500/10 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Google Docs</span>
              </button>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-950/60 border border-red-500/40 rounded text-xs text-red-300 font-mono flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span>{error}</span>
                </div>
                <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Content Body */}
            <div className="p-6 overflow-y-auto flex-1 font-mono text-xs">
              
              {/* TAB 1: GOOGLE DRIVE */}
              {activeSubTab === 'drive' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-4 border border-white/5 rounded">
                    <div>
                      <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Drive File Exporter</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Save real-time vessel telemetry, hull integrity metrics, and diagnostic node statuses directly to Google Drive.</p>
                    </div>
                    <button
                      onClick={() => setPendingAction({
                        type: 'drive_export',
                        title: 'Export Telemetry Log to Google Drive',
                        description: 'This operation will create a new text report in your root Google Drive folder containing current hull integrity, quantum resonance, and diagnostic node strain levels.'
                      })}
                      className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Report to Drive</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Your Google Drive Files</h4>
                      <button 
                        onClick={fetchDriveFiles} 
                        className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[10px] cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh List</span>
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search Drive files by name..."
                        value={driveSearch}
                        onChange={(e) => setDriveSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchDriveFiles()}
                        className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/60 font-mono"
                      />
                    </div>

                    {loading ? (
                      <div className="py-8 text-center text-slate-500 animate-pulse">Loading files from Google Drive...</div>
                    ) : driveFiles.length === 0 ? (
                      <div className="py-8 text-center text-slate-500 bg-slate-950/40 border border-slate-800/50 rounded">
                        No Drive files found matching your query.
                      </div>
                    ) : (
                      <div className="border border-slate-800 rounded overflow-hidden divide-y divide-slate-800/80 bg-slate-950/40">
                        {driveFiles.map(file => (
                          <div key={file.id} className="p-3 flex items-center justify-between hover:bg-slate-900/50 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <HardDrive className="w-4 h-4 text-amber-400 shrink-0" />
                              <div className="truncate">
                                <p className="text-xs text-slate-200 font-bold truncate">{file.name}</p>
                                <p className="text-[9px] text-slate-500">
                                  Modified: {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'N/A'} | {file.mimeType}
                                </p>
                              </div>
                            </div>
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-slate-400 hover:text-amber-400 transition-colors"
                                title="Open in Google Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: GOOGLE SHEETS */}
              {activeSubTab === 'sheets' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-emerald-950/30 p-4 border border-emerald-500/30 rounded">
                    <div>
                      <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Materials & Diagnostic Spreadsheet Generator</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Generate a formatted Google Spreadsheet populated with all 8 diagnostic node stress ratios, strain thresholds, and locking states.</p>
                    </div>
                    <button
                      onClick={() => setPendingAction({
                        type: 'sheet_create',
                        title: 'Generate Google Sheet Manifest',
                        description: 'This will create a new Google Sheets file named "Sovereign_Manifol_Manifest" in your Drive account with full diagnostic stress tables.'
                      })}
                      className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Google Sheet</span>
                    </button>
                  </div>

                  <div className="bg-slate-950/60 p-4 border border-slate-800 rounded space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Live Preview Data Array (To Be Exported)</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-[10px] text-emerald-400 uppercase">
                            <th className="py-2 px-3">Node ID</th>
                            <th className="py-2 px-3">Section</th>
                            <th className="py-2 px-3 text-right">Stress Load</th>
                            <th className="py-2 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-[11px] text-slate-300">
                          {computedStressZones.map(zone => (
                            <tr key={zone.id}>
                              <td className="py-1.5 px-3 font-mono text-slate-400">{zone.id}</td>
                              <td className="py-1.5 px-3 font-bold">{zone.name}</td>
                              <td className="py-1.5 px-3 text-right font-mono text-amber-400">
                                {(zone.stress * 100).toFixed(1)}%
                              </td>
                              <td className="py-1.5 px-3 text-right font-bold">
                                {zone.locked ? (
                                  <span className="text-blue-400">🔒 LOCKED</span>
                                ) : (
                                  <span className="text-emerald-400">ACTIVE</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: GMAIL SERVICES */}
              {activeSubTab === 'gmail' && (
                <div className="space-y-6">
                  {/* Email Composer */}
                  <div className="bg-red-950/20 border border-red-500/30 p-4 rounded space-y-4">
                    <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                      <Send className="w-4 h-4 text-red-400" />
                      Dispatch Operational Alert via Gmail
                    </h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] uppercase text-slate-400 mb-1">Recipient Email Address</label>
                        <input
                          type="email"
                          placeholder="e.g. commander@sovereignmanifol.org"
                          value={emailRecipient}
                          onChange={(e) => setEmailRecipient(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/60"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase text-slate-400 mb-1">Subject</label>
                        <input
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/60"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase text-slate-400 mb-1">Briefing Message Body</label>
                        <textarea
                          rows={5}
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500/60 font-mono"
                        />
                      </div>

                      <button
                        onClick={() => {
                          if (!emailRecipient) {
                            setError('Please specify a recipient email address.');
                            return;
                          }
                          setPendingAction({
                            type: 'gmail_send',
                            title: 'Confirm Sending Gmail Dispatch',
                            description: `Are you sure you want to send this operational briefing email to "${emailRecipient}" via your authenticated Gmail account?`,
                            payload: { emailRecipient, emailSubject, emailBody }
                          });
                        }}
                        className="px-5 py-2 bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500/40 rounded font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Alert Dispatch</span>
                      </button>
                    </div>
                  </div>

                  {/* Gmail Inbox Log */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Inbox className="w-3.5 h-3.5 text-red-400" />
                        <span>Recent Inbox Operational Messages</span>
                      </h4>
                      <button 
                        onClick={fetchGmailMessages} 
                        className="text-red-400 hover:text-red-300 flex items-center gap-1 text-[10px] cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                        <span>Sync Mailbox</span>
                      </button>
                    </div>

                    {loading ? (
                      <div className="py-6 text-center text-slate-500 animate-pulse">Checking Gmail inbox messages...</div>
                    ) : gmailMessages.length === 0 ? (
                      <div className="py-6 text-center text-slate-500 bg-slate-950/40 border border-slate-800/50 rounded">
                        No recent operational messages found in Inbox.
                      </div>
                    ) : (
                      <div className="border border-slate-800 rounded overflow-hidden divide-y divide-slate-800/80 bg-slate-950/40">
                        {gmailMessages.map(msg => (
                          <div key={msg.id} className="p-3 hover:bg-slate-900/50 transition-colors">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-bold text-slate-200 truncate">{msg.subject}</p>
                              <span className="text-[9px] text-slate-500 shrink-0">{msg.date}</span>
                            </div>
                            <p className="text-[10px] text-red-400/80 mt-0.5 truncate">From: {msg.from}</p>
                            {msg.snippet && (
                              <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{msg.snippet}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: GOOGLE DOCS */}
              {activeSubTab === 'docs' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-blue-950/30 p-4 border border-blue-500/30 rounded">
                    <div>
                      <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Sovereign Briefing Document Publisher</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Publish a standalone Google Doc containing the complete vessel briefing narrative, quantum resonance figures, and diagnostic strain logs.</p>
                    </div>
                    <button
                      onClick={() => setPendingAction({
                        type: 'doc_create',
                        title: 'Publish Sovereign Briefing Document',
                        description: 'This will create a new Google Doc in your Google Account pre-populated with vessel telemetry, current briefing narrative, and node statuses.'
                      })}
                      className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Google Doc</span>
                    </button>
                  </div>

                  <div className="bg-slate-950/60 p-4 border border-slate-800 rounded space-y-3 font-mono">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Document Text Content Preview</h4>
                    <div className="p-3 bg-slate-900/80 border border-slate-800 rounded text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">
{`SOVEREIGN MANIFOL - OFFICIAL BRIEFING DOCUMENT
Date: ${new Date().toLocaleString()}
Hull Integrity: ${hullIntegrity.toFixed(1)}%
Quantum Resonance: ${resonance.toFixed(2)}%

OPERATIONAL NARRATIVE:
${briefingNarrative}

CRITICAL DIAGNOSTICS:
${computedStressZones.map(z => `• ${z.name}: ${(z.stress * 100).toFixed(1)}% Strain [${z.locked ? 'LOCKED' : 'ACTIVE'}]`).join('\n')}`}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </>
        )}

        {/* Footer */}
        <div className="px-6 py-3 bg-black/60 border-t border-amber-500/20 flex items-center justify-between font-mono text-[10px] text-slate-500">
          <span>Google Workspace Integration Engine</span>
          <button onClick={onClose} className="hover:text-white uppercase transition-colors cursor-pointer">
            Close Deck
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Mutating Workspace Actions */}
      <ConfirmationDialog
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirmAction}
        title={pendingAction?.title || 'Confirm Workspace Operation'}
        description={pendingAction?.description || 'Are you sure you want to proceed with this Google Workspace operation?'}
        confirmText="Confirm Operation"
        cancelText="Cancel"
        variant="info"
      />
    </div>
  );
};
