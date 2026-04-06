import { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { parseCompassTracker } from '../lib/spreadsheetImport.js';
import { saveAll, getAll } from '../lib/store.js';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader, CardBody } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { useToast } from '../components/ui/Toast.jsx';

export function UploadPage() {
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(null);
  const [parsed, setParsed]     = useState(null);
  const [importing, setImporting] = useState(false);
  const [done, setDone]         = useState(false);
  const inputRef                = useRef();
  const toast                   = useToast();

  const handleFile = async (f) => {
    if (!f) return;
    setFile(f);
    setDone(false);
    setPreview(null);
    setParsed(null);

    const buf = await f.arrayBuffer();
    try {
      const result = parseCompassTracker(buf);
      setParsed(result);
      setPreview(result.summary);
    } catch (err) {
      toast({ message: `Parse error: ${err.message}`, type: 'error' });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.xlsx')) handleFile(f);
  };

  const handleImport = async (mode) => {
    if (!parsed) return;
    setImporting(true);

    if (mode === 'replace') {
      saveAll('workers', parsed.workers);
      saveAll('injuries', parsed.injuries);
      saveAll('incidents', []);
      saveAll('corrective_actions', []);
    } else {
      // Merge — don't overwrite existing records by bold_id
      const existing = getAll('workers');
      const existingBoldIds = new Set(existing.map((w) => w.bold_id).filter(Boolean));
      const existingNames = new Set(
        existing.map((w) => `${w.first_name}:${w.last_name}`.toLowerCase())
      );
      const toAdd = parsed.workers.filter((w) => {
        if (w.bold_id && existingBoldIds.has(w.bold_id)) return false;
        if (!w.bold_id && existingNames.has(`${w.first_name}:${w.last_name}`.toLowerCase())) return false;
        return true;
      });
      saveAll('workers', [...existing, ...toAdd]);

      const existingInjuries = getAll('injuries');
      saveAll('injuries', [...existingInjuries, ...parsed.injuries]);
    }

    setImporting(false);
    setDone(true);
    toast({ message: `Import complete — ${parsed.workers.length} workers, ${parsed.injuries.length} injuries loaded.` });
  };

  const handleClearAll = () => {
    if (!confirm('Clear ALL worker and injury data? This cannot be undone.')) return;
    saveAll('workers', []);
    saveAll('injuries', []);
    saveAll('incidents', []);
    saveAll('corrective_actions', []);
    saveAll('notes', []);
    toast({ message: 'All data cleared.', type: 'warning' });
    setFile(null);
    setParsed(null);
    setPreview(null);
    setDone(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Upload Spreadsheet</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Import data from the Compass Tracker Excel file. Reads Haul, Fueler/HEO/Salt/Mag, Waitlist, Termed/DNA, Converted, and Injuries sheets.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current.click()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <FileSpreadsheet size={36} className="text-green-500" />
            <p className="font-medium text-gray-800">{file.name}</p>
            <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB — click to change</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <UploadCloud size={36} />
            <p className="font-medium text-gray-600">Drop Compass Tracker .xlsx here</p>
            <p className="text-xs">or click to browse</p>
          </div>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700">Preview</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Haul Data 25-26',      value: preview.haul },
                { label: 'Fueler / HEO / Salt / Mag', value: preview.fueler },
                { label: 'Waitlist / Furlough',  value: preview.waitlist },
                { label: 'Termed or DNA',         value: preview.termed },
                { label: 'Converted (T/H)',       value: preview.converted },
                { label: 'Injuries / Incidents',  value: preview.injuries },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center bg-gray-50 rounded-md px-3 py-2">
                  <span className="text-sm text-gray-600">{label}</span>
                  <Badge variant="blue">{value}</Badge>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {preview.total} unique workers · {preview.injuries} injury records
                </p>
                {preview.dupes > 0 && (
                  <p className="text-xs text-yellow-600 mt-0.5">
                    <AlertTriangle size={12} className="inline mr-1" />
                    {preview.dupes} duplicate records skipped (same Bold ID or name)
                  </p>
                )}
              </div>
            </div>

            {done ? (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-md px-4 py-3">
                <CheckCircle size={18} />
                <span className="text-sm font-medium">Import complete! Navigate to Workers to see the data.</span>
              </div>
            ) : (
              <div className="flex gap-3 pt-1">
                <Button onClick={() => handleImport('replace')} disabled={importing}>
                  {importing ? 'Importing…' : 'Replace All Data'}
                </Button>
                <Button variant="secondary" onClick={() => handleImport('merge')} disabled={importing}>
                  Merge (skip existing)
                </Button>
              </div>
            )}

            <p className="text-xs text-gray-400">
              <strong>Replace</strong> overwrites everything. <strong>Merge</strong> adds only workers not already in the system (matched by Bold ID or name).
            </p>
          </CardBody>
        </Card>
      )}

      {/* Danger zone */}
      <Card className="border-red-100">
        <CardHeader className="border-red-100">
          <h2 className="text-sm font-semibold text-red-700">Danger Zone</h2>
        </CardHeader>
        <CardBody className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700">Clear all data</p>
            <p className="text-xs text-gray-400 mt-0.5">Removes all workers, incidents, injuries, and notes from local storage.</p>
          </div>
          <Button variant="danger" size="sm" onClick={handleClearAll}>
            <Trash2 size={14} /> Clear All
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
